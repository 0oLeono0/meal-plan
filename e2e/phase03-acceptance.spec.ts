import { test, expect, type Page } from '@playwright/test';
import foodSource from '../data/sources/food.snapshot.json' with { type: 'json' };
import priceSource from '../data/sources/prices.snapshot.json' with { type: 'json' };
import legacy from '../src/test/fixtures/phase02-active-plan-v1.json' with { type: 'json' };
import { openSyntheticPlan } from './plan-fixtures';

const activeKey = 'mealplan:guest:active-plan:v1';
type Plan = typeof legacy.plan;
type Instance = Plan['variants'][number]['instances'][number];
const value = (r: { numerator: string; denominator: string }) => Number(r.numerator) / Number(r.denominator);
const rub = (kopecks: number) => `${new Intl.NumberFormat('ru-RU').format(Math.floor(kopecks / 100))},${String(kopecks % 100).padStart(2, '0')} ₽`;
const rounded = (n: number, places: number) => (Math.round((n + Number.EPSILON) * 10 ** places) / 10 ** places).toLocaleString('ru-RU', { minimumFractionDigits: places, maximumFractionDigits: places });
const nutrientIds = ['1008', '1003', '1004', '1005'];
const units = ['ккал', 'г', 'г', 'г'];
async function saved(page: Page): Promise<Plan> {
  return page.evaluate(key => JSON.parse(localStorage.getItem(key)!).plan, activeKey);
}
// Independent arithmetic over the literal USDA/price records, without production
// projection, nutrition, quantity, formatter or fingerprint imports. Current source
// scope is raw grams and RUB/kg; fail rather than silently invent another conversion.
function instanceOracle(instance: Instance) {
  const servings = value(instance.selectedServings), scale = servings / value(instance.recipeSnapshot.baseServings);
  const nutrition = [0, 0, 0, 0]; let cost = 0;
  const ingredients = instance.recipeSnapshot.ingredients.map(row => {
    expect(row.quantity.unit).toBe('g');
    const food = foodSource.records.find(f => f.profileId === row.profileId)!;
    const price = priceSource.records.find(f => f.profileId === row.profileId)!;
    expect(food.reference).toEqual({ amount: '100', unit: 'g', basis: 'edible' });
    expect(price.reference).toEqual({ amount: '1', unit: 'kg', basis: 'edible' });
    const grams = value(row.quantity.amount) * scale;
    const perPortion = nutrientIds.map(id => grams / 100 * Number(food.nutrients.find(n => n.nutrient_id === id)!.amount) / servings);
    perPortion.forEach((n, i) => { nutrition[i] += n; });
    cost += grams / 1000 * Number(price.amount);
    return { productId: row.productId, grams, perPortion, price: Number(price.amount) };
  });
  return { ingredients, nutrition, cost, servings };
}
function periodOracle(plan: Plan, variant = plan.variants.find(v => v.id === plan.activeVariantId)!) {
  const amounts = new Map<string, { grams: number; price: number }>(), nutrition = [0, 0, 0, 0];
  for (const instance of variant.instances) {
    const result = instanceOracle(instance);
    result.nutrition.forEach((n, i) => { nutrition[i] += n * result.servings; });
    for (const row of result.ingredients) {
      const prior = amounts.get(row.productId);
      amounts.set(row.productId, { grams: (prior?.grams ?? 0) + row.grams, price: row.price });
    }
  }
  let ingredient = 0, purchase = 0;
  for (const [productId, row] of amounts) {
    // The real wizard below has exactly one known 200g rice row.
    const stock = productId === 'rice' ? 200 : 0;
    ingredient += Math.round(row.grams / 1000 * row.price * 100);
    purchase += Math.round(Math.max(0, row.grams - stock) / 1000 * row.price * 100);
  }
  return { costs: [rub(ingredient), rub(ingredient - purchase), rub(purchase)], amounts,
    average: nutrition.map(n => n / (plan.inputs.dates.length * plan.inputs.appliedSettings.people)) };
}
async function assertSummary(page: Page, plan: Plan) {
  const oracle = periodOracle(plan);
  await expect(page.locator('[data-plan-id]')).toHaveAttribute('data-plan-id', plan.activeVariantId);
  await expect(page.getByRole('region', { name: 'Бюджет меню' }).locator('dd')).toHaveText(oracle.costs);
  return oracle;
}

test('real wizard → distinct variants → select → append ignores edited draft → exact recipe → shopping → reload, independent source totals', async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/plan/new');
  for (let step = 2; step <= 4; step++) {
    await page.getByRole('button', { name: 'Далее', exact: true }).click();
    await expect(page.getByText(`Шаг ${step} из 4`)).toBeVisible();
    if (step < 4) await page.waitForTimeout(270);
  }
  await page.getByRole('combobox', { name: 'Найти продукт', exact: true }).fill('Рис');
  await page.getByRole('option', { name: 'Рис', exact: true }).click();
  await page.getByLabel('Количество Рис', { exact: true }).fill('200');
  await page.getByLabel('Единица Рис', { exact: true }).selectOption('g');
  const started = Date.now();
  await page.getByRole('button', { name: 'Составить меню', exact: true }).click();
  await expect(page).toHaveURL(/\/menu$/, { timeout: 32_000 });
  await expect(page.getByRole('status').filter({ hasText: 'Выбран вариант 1 из 3. Меню и список покупок обновлены' })).toBeVisible();
  await expect(page.getByText('Подбор отменён. Прежнее меню не изменено', { exact: true })).toHaveCount(0);
  const initial = await saved(page), elapsed = Date.now() - started;
  expect(initial.inputs.catalog.foods).toHaveLength(12);
  expect(initial.inputs.catalog.recipes).toHaveLength(52);
  expect(initial.variants).toHaveLength(3);
  expect(elapsed).toBeLessThan(30_000);
  const fingerprint = (variant: Plan['variants'][number]) => JSON.stringify(variant.instances.map(i => [i.date, i.slot, i.recipeId, value(i.selectedServings)]));
  expect(new Set(initial.variants.map(fingerprint)).size).toBe(3);
  for (const variant of initial.variants) {
    expect(variant.instances).toHaveLength(28);
    const oracle = periodOracle(initial, variant);
    const index = initial.variants.indexOf(variant) + 1;
    await expect(page.getByRole('region', { name: 'Варианты меню' }).getByRole('listitem').nth(index - 1)).toContainText(`Купить: ≈ ${oracle.costs[2]}`);
  }
  await assertSummary(page, initial);
  await page.getByRole('button', { name: 'Следующий вариант', exact: true }).click();
  await expect(page.getByText('Вариант 2 из 3', { exact: true })).toBeVisible();
  const selected = await saved(page);
  expect(selected.activeVariantId).toBe(initial.variants[1].id);
  expect(selected.variants).toEqual(initial.variants);
  expect(selected.inputs).toEqual(initial.inputs);
  const selectedOracle = await assertSummary(page, selected);
  const average = page.getByRole('heading', { name: 'Среднее на человека в день', exact: true }).locator('..');
  for (const [i, n] of selectedOracle.average.entries()) await expect(average).toContainText(`${rounded(n, i === 0 ? 0 : 1)} ${units[i]}`);
  await page.getByText('Действия с меню', { exact: true }).click();
  await page.getByRole('link', { name: 'Изменить настройки', exact: true }).click();
  await expect(page.getByText('Шаг 4 из 4')).toBeVisible();
  await page.getByRole('button', { name: 'Назад', exact: true }).click();
  await page.getByRole('button', { name: 'Назад', exact: true }).click();
  await page.locator('#budget').fill('777.25');
  await page.goto('/menu');
  await expect(page.getByText('Вариант 2 из 3', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Пересобрать', exact: true }).click();
  await expect(page.getByText('Вариант 4 из 4', { exact: true })).toBeVisible({ timeout: 32_000 });
  const appended = await saved(page);
  expect(appended.inputs).toEqual(initial.inputs);
  expect(appended.variants.slice(0, 3)).toEqual(initial.variants);
  expect(new Set(appended.variants.map(fingerprint)).size).toBe(4);
  expect(appended.activeVariantId).toBe(appended.variants[3].id);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('mealplan:guest:draft:v1')!).draft.budget)).toBe('777.25');
  const oracle = await assertSummary(page, appended);
  const instance = appended.variants[3].instances[0], facts = instanceOracle(instance);
  await page.getByRole('button', { name: 'Вся неделя', exact: true }).click();
  await page.locator(`[data-instance-id="${instance.id}"]`).getByRole('link').click();
  const url = new URL(page.url());
  expect(url.pathname).toBe(`/recipe/${instance.recipeId}`);
  expect(url.searchParams.get('variant')).toBe(appended.activeVariantId);
  expect(url.searchParams.get('instance')).toBe(instance.id);
  // Router can commit history before React replaces the 28 menu articles.
  await expect(page.getByRole('heading', { level: 1, name: instance.recipeSnapshot.name, exact: true })).toBeVisible();
  await expect(page.locator('[data-instance-id]')).toHaveAttribute('data-instance-id', instance.id);
  await expect(page.getByRole('region', { name: 'На одну порцию' }).locator('dd')).toHaveText([
    ...facts.nutrition.map((n, i) => `${rounded(n, i === 0 ? 0 : 1)} ${units[i]}`), `≈ ${rub(Math.round(facts.cost / facts.servings * 100))}`,
  ]);
  await expect(page.getByRole('list', { name: 'Шаги приготовления' }).getByRole('listitem')).toHaveText(instance.recipeSnapshot.steps);
  await page.getByText('Состав — КБЖУ каждого ингредиента на одну порцию', { exact: true }).click();
  await expect(page.locator('details[open] dd')).toHaveText(facts.ingredients.flatMap(row => row.perPortion.map((n, i) => `${rounded(n, i === 0 ? 0 : 1)} ${units[i]}`)));
  await expect(page.getByRole('heading', { name: 'Ингредиенты на 2 порции', exact: true })).toBeVisible();
  for (const row of facts.ingredients) await expect(page.getByText(new RegExp(`^${row.grams} г ·`))).toBeVisible();
  const bytes = await page.evaluate(key => localStorage.getItem(key), activeKey);
  await page.reload();
  await expect(page.locator('[data-instance-id]')).toHaveAttribute('data-instance-id', instance.id);
  await page.getByRole('link', { name: 'К меню', exact: true }).click();
  await expect(page).toHaveURL(/\/menu\?view=week&day=/);
  await assertSummary(page, appended);
  await page.getByRole('link', { name: /^Список покупок ·/ }).click();
  await assertSummary(page, appended);
  for (const [id, row] of oracle.amounts) {
    const purchase = Math.max(0, row.grams - (id === 'rice' ? 200 : 0));
    if (purchase) await expect(page.getByText(`Купить ${purchase} г · ≈ ${rub(Math.round(purchase / 1000 * row.price * 100))}`, { exact: true })).toBeVisible();
  }
  await page.reload();
  await assertSummary(page, appended);
  expect(await page.evaluate(key => localStorage.getItem(key), activeKey)).toBe(bytes);
  await testInfo.attach('real-source-generation', { body: JSON.stringify({ engine: testInfo.project.name, elapsedMs: elapsed, variants: initial.variants.length, dates: initial.inputs.dates, costs: oracle.costs }), contentType: 'application/json' });
});

test('literal numeric stock oracle conserves 500g need, 200g stock and 300g purchases across repeated instances', async ({ page }) => {
  await openSyntheticPlan(page, { stock: 'partial' });
  await expect(page.getByRole('region', { name: 'Бюджет меню' }).locator('dd')).toHaveText(['50,00 ₽', '20,00 ₽', '30,00 ₽']);
  const amounts = [[125, 0], [75, 50], [0, 125], [0, 125]];
  let covered = 0, purchase = 0;
  for (const [index, slot] of ['breakfast', 'lunch', 'dinner', 'snack'].entries()) {
    await page.locator(`[data-instance-id="synthetic-2026-10-01-${slot}"]`).getByRole('link').click();
    const [stock, buy] = amounts[index]; covered += stock; purchase += buy;
    await expect(page.getByText(`Нужно 125 г · Из запасов ${stock} г · Докупить ${buy} г`, { exact: true })).toBeVisible();
    await expect(page.getByRole('region', { name: 'На одну порцию' }).locator('dd')).toHaveText(['250 ккал', '12,5 г', '0,0 г', '37,5 г', '≈ 6,25 ₽']);
    await page.getByRole('link', { name: 'К меню', exact: true }).click();
  }
  expect(covered).toBe(200); expect(purchase).toBe(300); expect(covered + purchase).toBe(500);
  await page.getByRole('link', { name: /^Список покупок ·/ }).click();
  await expect(page.getByText('Купить 300 г · ≈ 30,00 ₽', { exact: true })).toBeVisible();
});

test('default 52-recipe source benchmark measures one bounded top-three search and real saved quick start separately', async ({ page }, testInfo) => {
  test.setTimeout(75_000);
  await page.goto('/');
  const started = Date.now();
  await page.getByRole('button', { name: 'Меню за 1 клик', exact: true }).click();
  await expect(page).toHaveURL(/\/menu$/, { timeout: 32_000 });
  const adapterAndSaveMs = Date.now() - started;
  const result = await page.evaluate(async () => {
    const adapterPath = '/src/adapters/activePlan.ts', searchPath = '/src/domain/generatePlan.ts';
    const { createActivePlanAdapter } = await import(adapterPath), { createPlanSearch } = await import(searchPath);
    // This is a separately labelled domain work benchmark, not a second production
    // request or a second deadline for one request. Production quick start ran above.
    const start = performance.now();
    const loaded = await createActivePlanAdapter().load();
    if (loaded.status !== 'loaded') throw new Error('No real default saved plan');
    const search = createPlanSearch(loaded.bundle.plan.inputs);
    let steps = 0, work = { transitions: 0, evaluatedCandidates: 0 };
    while (true) {
      if (performance.now() - start >= 30_000) throw new Error('One benchmark deadline exceeded');
      const next = search.next();
      if (performance.now() - start >= 30_000) throw new Error('Late benchmark result rejected');
      if (next.done) return { ...work, status: next.value.status, variants: next.value.status === 'success' ? next.value.plan.variants.length : 0, domainMs: performance.now() - start };
      work = next.value;
      if (++steps % 128 === 0) await new Promise(resolve => setTimeout(resolve, 0));
    }
  });
  expect(adapterAndSaveMs).toBeLessThan(30_000);
  expect(result.status).toBe('success'); expect(result.variants).toBe(3);
  expect(result.evaluatedCandidates).toBeGreaterThan(0); expect(result.evaluatedCandidates).toBeLessThanOrEqual(512);
  expect(result.transitions).toBeLessThanOrEqual(200_000);
  console.info('REAL_DEFAULT_BENCHMARK', JSON.stringify({ engine: testInfo.project.name, adapterAndSaveMs, ...result }));
  await testInfo.attach('real-default-benchmark', { body: JSON.stringify({ adapterAndSaveMs, ...result }), contentType: 'application/json' });
});
