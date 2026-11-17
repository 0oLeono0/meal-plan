import { test, expect, type Page } from '@playwright/test';
import oracle from './fixtures/catalog031-oracle.json' with { type: 'json' };
import legacy from '../src/test/fixtures/phase02-active-plan-v1.json' with { type: 'json' };
import release1 from '../src/test/fixtures/phase031-release1-active-plan.json' with { type: 'json' };
import release2 from '../src/test/fixtures/phase031-release2-active-plan.json' with { type: 'json' };
import release3 from '../src/test/fixtures/phase031-release3-active-plan.json' with { type: 'json' };
import lunchOracle from './fixtures/catalog031-lunches-oracle.json' with { type: 'json' };
import dinnerOracle from './fixtures/catalog031-dinners-oracle.json' with { type: 'json' };

const activeKey = 'mealplan:guest:active-plan:v1';
interface TracerRow { id: string; required: string; covered: string; purchase: string }

async function saveTracer(page: Page, servings = '2', version = 'mealplan-2026-11-11-1') {
  await page.goto('/');
  return page.evaluate(async ({ recipeIds, servings, version }) => {
    const catalogPath = '/src/data/catalog.ts', planPath = '/src/domain/plan.ts';
    const settingsPath = '/src/domain/settings.ts', appliedPath = '/src/domain/appliedSettings.ts';
    const activePath = '/src/adapters/activePlan.ts', quantitiesPath = '/src/domain/quantities.ts';
    const { sourceApprovedCatalogs, sourceApprovedCatalogPorts } = await import(catalogPath);
    const bundledCatalog = sourceApprovedCatalogs.find((catalog: { version: string }) => catalog.version === version);
    const bundledCatalogPort = sourceApprovedCatalogPorts[bundledCatalog.version];
    const loaded = await bundledCatalogPort.load();
    if (loaded.status !== 'loaded') throw new Error(JSON.stringify(loaded));
    const { createDraft } = await import(settingsPath);
    const { buildAppliedSettings } = await import(appliedPath);
    const { createPlanInputs, buildActivePlanEnvelope, mealSlots } = await import(planPath);
    const { decimal, formatExact } = await import(quantitiesPath);
    const { createActivePlanAdapter } = await import(activePath);
    const applied = buildAppliedSettings({ ...createDraft(), people: version === 'mealplan-2026-11-11-4' ? servings : '2', days: '1', budget: '2000' });
    if (applied.status !== 'applied') throw new Error('Invalid test settings');
    const inputs = createPlanInputs(applied.settings, bundledCatalog, { seed: 'fixed-source-tracer', now: () => new Date(2026, 10, 12), pantrySnapshot: [
      { productId: 'chicken', quantity: { status: 'known', value: { amount: decimal('200'), unit: 'g' } }, expiresSoon: false },
    ] });
    // Missing recipes are asserted before constructing the selection in the RED run.
    const presentIds = bundledCatalog.recipes.filter((recipe: { id: string }) => recipeIds.includes(recipe.id)).map((recipe: { id: string }) => recipe.id);
    if (presentIds.length !== 4) return { version: bundledCatalog.version, presentIds };
    const variant = { id: 'source-tracer', instances: recipeIds.map((id, index) => ({ id: `tracer-${index}`, date: inputs.dates[0], slot: mealSlots[index], recipeId: id,
      catalogVersion: bundledCatalog.version, recipeSnapshot: bundledCatalog.recipes.find((recipe: { id: string }) => recipe.id === id), selectedServings: decimal(servings) })) };
    const adapter = createActivePlanAdapter();
    await adapter.load();
    const result = await adapter.save(buildActivePlanEnvelope(inputs, [variant], variant.id), { isCurrent: () => true });
    if (result.status !== 'saved') throw new Error(JSON.stringify(result));
    const projection = result.bundle.projections[0];
    return { version: bundledCatalog.version, presentIds, raw: localStorage.getItem('mealplan:guest:active-plan:v1'),
      nutrition: Object.values(projection.averagePersonDayNutrition).map(value => formatExact(value)),
      family: Object.values(projection.familyNutrition).map(value => formatExact(value)),
      costs: Object.fromEntries(Object.entries(projection.costs.exact).map(([key, value]) => [key, formatExact(value)])),
      kopecks: Object.fromEntries(Object.entries(projection.costs.kopecks).map(([key, value]) => [key, String(value)])),
      rows: projection.rows.map((row: { productId: string; required: { amount: Parameters<typeof formatExact>[0] }; covered: { amount: Parameters<typeof formatExact>[0] }; purchase: { amount: Parameters<typeof formatExact>[0] } }) => ({ id: row.productId, required: formatExact(row.required.amount), covered: formatExact(row.covered.amount), purchase: formatExact(row.purchase.amount) })),
    };
  }, { recipeIds: oracle.recipeIds, servings, version });
}

const currentVersion = 'mealplan-2026-11-11-4';
const rub = (kopecks: number) => `${Math.floor(kopecks / 100).toLocaleString('ru-RU')},${String(kopecks % 100).padStart(2, '0')}`;

test('scaled-instructions current recipe explains four and half portions while base has no notice', async ({ page }) => {
  for (const [servings, factor] of [['4', '2'], ['1', '0,5']]) {
    await saveTracer(page, servings, currentVersion);
    await page.goto('/recipe/familiar-chicken-rice-carrot?variant=source-tracer&instance=tracer-1');
    const note = page.getByRole('note', { name: 'Пересчёт шагов', exact: true });
    await expect(note).toContainText('Исходные шаги рассчитаны на 2 порции');
    await expect(note).toContainText(`Выбрано порций: ${servings}`);
    await expect(note).toContainText(`Количества продуктов и воды в шагах умножьте на ${factor}`);
    await expect(note).toContainText('Время приготовления зависит от готовности блюда');
    await expect(page.getByRole('list', { name: 'Шаги приготовления' })).toContainText('280 мл воды');
    await page.screenshot({ path: `.tmp/phase031-08-scaled-${servings}.png`, fullPage: true });
  }
  await page.goto('/recipe/familiar-chicken-rice-carrot');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Куриное филе с рисом и морковью');
  await expect(page.getByRole('note', { name: 'Пересчёт шагов', exact: true })).toHaveCount(0);
});

async function checkCalculationNote(page: Page) {
  const note = page.getByRole('region', { name: 'О расчётах', exact: true });
  await expect(note).toContainText('Цены и КБЖУ примерные');
  const summary = note.locator('summary');
  await summary.press('Enter');
  await expect(note).toContainText('КБЖУ считаем по количеству продуктов и порциям');
  await expect(note.locator('details')).toHaveAttribute('open', '');
  await summary.press('Space');
  await expect(note.locator('details')).not.toHaveAttribute('open');
}

test('current82 actual budget refusal keeps raw settings and corrupt active bytes survive retry', async ({ page }) => {
  test.setTimeout(45_000);
  await page.goto('/plan/new');
  await page.getByLabel('Число людей', { exact: true }).fill('10');
  await page.getByRole('button', { name: 'Далее', exact: true }).click();
  await page.getByLabel('Бюджет на неделю', { exact: true }).fill('500');
  await page.waitForTimeout(270);
  for (const step of [3, 4]) {
    await page.getByRole('button', { name: 'Далее', exact: true }).click();
    await expect(page.getByText(`Шаг ${step} из 4`)).toBeVisible();
    await page.waitForTimeout(270);
  }
  await page.getByRole('button', { name: 'Составить меню', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('бюджета недостаточно', { timeout: 32_000 });
  await expect(page.getByRole('alert')).toContainText('Настройки сохранены в черновике');
  expect(await page.evaluate(key => localStorage.getItem(key), activeKey)).toBeNull();
  const draft = await page.evaluate(() => JSON.parse(localStorage.getItem('mealplan:guest:draft:v1')!).draft);
  expect(draft.people).toBe('10');
  expect(draft.budget).toBe('500');
  const raw = '{corrupt-current82';
  await page.evaluate(({ key, raw }) => localStorage.setItem(key, raw), { key: activeKey, raw });
  await page.goto('/shopping');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('повреждено');
  await page.getByRole('button', { name: 'Повторить загрузку', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('повреждено');
  expect(await page.evaluate(key => localStorage.getItem(key), activeKey)).toBe(raw);
});

test('current82 cap12 exact real storage reload retains bounded bytes and disables append', async ({ page }, testInfo) => {
  test.setTimeout(45_000);
  await saveTracer(page, '4', currentVersion);
  const evidence = await page.evaluate(async () => {
    const activePath = '/src/adapters/activePlan.ts', planPath = '/src/domain/plan.ts', quantitiesPath = '/src/domain/quantities.ts';
    const { createActivePlanAdapter, ACTIVE_PLAN_MAX_BYTES } = await import(activePath);
    const { buildActivePlanEnvelope, createRecipeInstances } = await import(planPath);
    const { decimal } = await import(quantitiesPath);
    const adapter = createActivePlanAdapter();
    const loaded = await adapter.load();
    if (loaded.status !== 'loaded') throw new Error('Cap12 base');
    const { inputs } = loaded.bundle.plan;
    const variants = Array.from({ length: 12 }, (_, index) => ({ id: `cap-${index}`, instances: createRecipeInstances(inputs, ['familiar-omelet-tomato-bread', 'familiar-chicken-rice-carrot', 'familiar-lentil-cabbage-tomato', 'familiar-yogurt-apple'], (date: string, slot: string) => `cap-${index}/${date}/${slot}`).map((row: object) => ({ ...row, selectedServings: decimal(((index + 5) / 10).toFixed(1)) })) }));
    const saved = await adapter.save(buildActivePlanEnvelope(inputs, variants, variants[11].id), { isCurrent: () => true });
    if (saved.status !== 'saved') throw new Error(JSON.stringify(saved));
    const raw = localStorage.getItem('mealplan:guest:active-plan:v1')!;
    return { raw, bytes: new TextEncoder().encode(raw).length, maxBytes: ACTIVE_PLAN_MAX_BYTES };
  });
  expect(evidence.bytes).toBeLessThan(evidence.maxBytes);
  await page.goto('/menu');
  await expect(page.getByText('Вариант 12 из 12', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Пересобрать', exact: true })).toBeDisabled();
  await page.reload();
  await expect(page.getByText('Вариант 12 из 12', { exact: true })).toBeVisible();
  expect(await page.evaluate(key => localStorage.getItem(key), activeKey)).toBe(evidence.raw);
  console.info('CAT031_CAP12', JSON.stringify({ bytes: evidence.bytes, maxBytes: evidence.maxBytes }));
  await testInfo.attach('current82-cap12-storage', { body: JSON.stringify({ bytes: evidence.bytes, maxBytes: evidence.maxBytes }), contentType: 'application/json' });
});

for (const width of [360, 390, 430, 768, 1280]) test(`acceptance smoke current82 four portions independent ledger at ${width}px`, async ({ page }) => {
  const saved = await saveTracer(page, '4', currentVersion);
  const expected = oracle.fourPortionCase;
  expect(saved.version).toBe(currentVersion);
  expect(saved.family?.map(Number)).toEqual(expected.familyNutrition.map(Number));
  expect(saved.costs).toEqual({ ...expected.costs, covered: '122' });
  expect(saved.kopecks).toEqual(Object.fromEntries(Object.entries(expected.kopecks).map(([key, value]) => [key, String(value)])));
  expect(saved.rows).toEqual(expect.arrayContaining(expected.rows));
  await page.setViewportSize({ width, height: 900 });
  await page.goto('/menu');
  for (const amount of Object.values(expected.kopecks)) await expect(page.getByRole('region', { name: 'Бюджет меню' })).toContainText(rub(amount));
  await expect(page.locator('.menu-day-totals').getByText('1 422 ккал', { exact: true })).toBeVisible();
  await checkCalculationNote(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
  await page.screenshot({ path: `.tmp/phase031-08-fixed-menu-${width}.png`, fullPage: true });
  await page.locator('[data-instance-id="tracer-1"]').getByRole('link').click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Куриное филе с рисом и морковью');
  await expect(page.getByText('Порций для семьи: 4', { exact: true })).toBeVisible();
  await expect(page.getByText('Нужно 600 г · Из запасов 200 г · Докупить 400 г', { exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'На одну порцию' })).toContainText('554 ккал');
  const hero = page.locator('img[src="/recipes/familiar-chicken-rice-carrot.png"]');
  await expect(hero).toHaveAttribute('alt', /Куриное филе/);
  await hero.evaluate(async (node: HTMLImageElement) => node.decode());
  await checkCalculationNote(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
  await page.screenshot({ path: `.tmp/phase031-08-fixed-recipe-${width}.png`, fullPage: true });
  await page.getByRole('link', { name: 'К меню', exact: true }).click();
  await page.getByRole('link', { name: /^Список покупок ·/ }).click();
  await expect(page.getByRole('region', { name: 'Мясо и рыба' }).locator('[data-product-id="chicken"]')).toContainText('Купить 400 г');
  for (const row of expected.rows) await expect(page.locator(`[data-product-id="${row.id}"]`).first()).toContainText(`Купить ${row.purchase} г`);
  for (const amount of Object.values(expected.kopecks)) await expect(page.getByRole('region', { name: 'Бюджет меню' })).toContainText(rub(amount));
  await checkCalculationNote(page);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Список покупок');
  expect(await page.evaluate(key => localStorage.getItem(key), activeKey)).toBe(saved.raw);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
  await page.screenshot({ path: `.tmp/phase031-08-fixed-shopping-${width}.png`, fullPage: true });
});

for (const width of [360, 768, 1280]) test(`acceptance smoke real wizard mixed week four people select recipe shopping reload at ${width}px`, async ({ page }, testInfo) => {
  test.setTimeout(65_000);
  await page.setViewportSize({ width, height: 900 });
  await page.goto('/plan/new');
  await page.getByLabel('Число людей', { exact: true }).fill('4');
  await page.getByRole('button', { name: 'Далее', exact: true }).click();
  await page.getByLabel('Бюджет на неделю', { exact: true }).fill('12000');
  await page.waitForTimeout(270);
  await page.getByRole('button', { name: 'Далее', exact: true }).click();
  await expect(page.getByText('Шаг 3 из 4')).toBeVisible();
  await page.getByRole('combobox').fill('свин');
  await page.getByRole('option', { name: 'Свиная вырезка сырая, мякоть без видимого жира', exact: true }).click();
  await page.waitForTimeout(270);
  await page.getByRole('button', { name: 'Далее', exact: true }).click();
  await page.getByRole('combobox').fill('курица');
  await page.getByRole('option', { name: 'Курица', exact: true }).click();
  await page.getByLabel('Количество Курица', { exact: true }).fill('200');
  await page.getByLabel('Единица Курица', { exact: true }).selectOption('g');
  const started = Date.now();
  await page.getByRole('button', { name: 'Составить меню', exact: true }).click();
  await expect(page).toHaveURL(/\/menu$/, { timeout: 32_000 });
  const generationMs = Date.now() - started;
  await page.getByRole('button', { name: 'Следующий вариант', exact: true }).click();
  await expect(page.getByText('Вариант 2 из 3', { exact: true })).toBeVisible();
  const evidence = await page.evaluate(async key => {
    const activePath = '/src/adapters/activePlan.ts', quantityPath = '/src/domain/quantities.ts';
    const { createActivePlanAdapter } = await import(activePath);
    const { formatExact } = await import(quantityPath);
    const result = await createActivePlanAdapter().load();
    if (result.status !== 'loaded') throw new Error(JSON.stringify(result));
    const { plan, projections } = result.bundle;
    const projection = projections.find((row: { variantId: string }) => row.variantId === plan.activeVariantId);
    return { raw: localStorage.getItem(key)!, plan: JSON.parse(localStorage.getItem(key)!).plan,
      costs: Object.fromEntries(Object.entries(projection.costs.kopecks).map(([key, value]) => [key, Number(value)])),
      family: Object.values(projection.familyNutrition).map(value => Number(formatExact(value))),
      rows: projection.rows.map((row: { productId: string; required: { amount: Parameters<typeof formatExact>[0] }; covered: { amount: Parameters<typeof formatExact>[0] }; purchase: { amount: Parameters<typeof formatExact>[0] } }) => ({ id: row.productId, required: Number(formatExact(row.required.amount)), covered: Number(formatExact(row.covered.amount)), purchase: Number(formatExact(row.purchase.amount)) })),
    };
  }, activeKey);
  const { plan } = evidence;
  expect(plan.inputs.catalog.recipes).toHaveLength(82);
  expect(plan.inputs.catalog.foods).toHaveLength(32);
  expect(plan.inputs.catalogVersion).toBe(currentVersion);
  expect(plan.inputs.appliedSettings.exclusionIds).toEqual(['pork']);
  const variant = plan.variants.find((row: { id: string }) => row.id === plan.activeVariantId);
  // Independent arithmetic reads persisted source inputs, never a production calculator.
  const grams = new Map<string, number>();
  const nutrition = [0, 0, 0, 0];
  const number = (r: { numerator: string; denominator: string }) => Number(r.numerator) / Number(r.denominator);
  for (const instance of variant.instances) {
    expect(instance.recipeSnapshot.cookingMinutes).toBeLessThanOrEqual(30);
    expect(number(instance.selectedServings)).toBe(4);
    for (const ingredient of instance.recipeSnapshot.ingredients) {
      expect(ingredient.productId).not.toBe('pork');
      expect(ingredient.quantity.unit).toBe('g');
      const amount = number(ingredient.quantity.amount) * 4 / number(instance.recipeSnapshot.baseServings);
      grams.set(ingredient.productId, (grams.get(ingredient.productId) ?? 0) + amount);
      const food = plan.inputs.catalog.foods.find((row: { productId: string; profileId: string }) => row.productId === ingredient.productId && row.profileId === ingredient.profileId);
      Object.values(food.nutrition.values).forEach((value, index) => nutrition[index] += amount * Number(value) / 100);
    }
  }
  expect(new Set(variant.instances.map((row: { recipeId: string }) => row.recipeId).filter((id: string) => id.startsWith('familiar-'))).size).toBeGreaterThanOrEqual(5);
  for (const group of [['chicken', 'turkey'], ['pollock', 'cod'], ['beef-mince'], ['lentil', 'chickpea-canned', 'bean-canned'], ['egg', 'yogurt', 'milk', 'cottage-cheese']]) expect(group.some(id => grams.has(id))).toBe(true);
  nutrition.forEach((value, index) => expect(evidence.family[index]).toBeCloseTo(value, 6));
  const independentCosts = { ingredient: 0, covered: 0, purchase: 0 };
  for (const row of evidence.rows) {
    expect(row.required).toBeCloseTo(grams.get(row.id)!, 8);
    const covered = row.id === 'chicken' ? Math.min(200, row.required) : 0;
    expect(row.covered).toBe(covered);
    expect(row.purchase).toBeCloseTo(row.required - covered, 8);
    const price = Number(plan.inputs.catalog.foods.find((food: { productId: string }) => food.productId === row.id).price.amount) / 1000;
    independentCosts.ingredient += Math.round(row.required * price * 100);
    independentCosts.covered += Math.round(covered * price * 100);
    independentCosts.purchase += Math.round((row.required - covered) * price * 100);
  }
  expect(evidence.costs).toEqual(independentCosts);
  expect(evidence.costs.purchase).toBeLessThanOrEqual(1200000);
  for (const amount of Object.values(independentCosts)) await expect(page.getByRole('region', { name: 'Бюджет меню' })).toContainText(rub(amount));
  await checkCalculationNote(page);
  if (width < 1280) await page.getByRole('button', { name: 'Вся неделя', exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
  await page.screenshot({ path: `.tmp/phase031-08-wizard-menu-${width}.png`, fullPage: true });
  const card = page.locator('[data-instance-id]').first();
  const instanceId = await card.getAttribute('data-instance-id');
  const instance = variant.instances.find((row: { id: string }) => row.id === instanceId);
  await card.getByRole('link').click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(instance.recipeSnapshot.name);
  await expect(page.getByText('Порций для семьи: 4', { exact: true })).toBeVisible();
  expect(new URL(page.url()).searchParams.get('variant')).toBe(plan.activeVariantId);
  expect(new URL(page.url()).searchParams.get('instance')).toBe(instanceId);
  await checkCalculationNote(page);
  await page.getByRole('link', { name: 'К меню', exact: true }).click();
  await page.getByRole('link', { name: /^Список покупок ·/ }).click();
  for (const row of evidence.rows.filter((row: { purchase: number }) => row.purchase > 0)) await expect(page.locator(`[data-product-id="${row.id}"]`).first()).toContainText(`Купить ${String(row.purchase).replace('.', ',')} г`);
  for (const amount of Object.values(independentCosts)) await expect(page.getByRole('region', { name: 'Бюджет меню' })).toContainText(rub(amount));
  await checkCalculationNote(page);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Список покупок');
  expect(await page.evaluate(key => localStorage.getItem(key), activeKey)).toBe(evidence.raw);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
  await page.screenshot({ path: `.tmp/phase031-08-wizard-shopping-${width}.png`, fullPage: true });
  const measured = { width, generationMs, seed: plan.inputs.seed, recipeIds: variant.instances.map((row: { recipeId: string }) => row.recipeId), products: [...grams.keys()], costs: independentCosts, serializedBytes: new TextEncoder().encode(evidence.raw).length };
  console.info('CAT031_WEEK', JSON.stringify(measured));
  await testInfo.attach('current82-week-evidence', { body: JSON.stringify(measured), contentType: 'application/json' });
});

for (const width of [360, 768, 1280]) test(`tracer source-backed B1 L1 D7 S1 save menu recipe shopping reload at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  const saved = await saveTracer(page);
  expect(saved.version).toBe('mealplan-2026-11-11-1');
  expect(saved.presentIds).toEqual(oracle.recipeIds);
  expect(saved.nutrition).toEqual(oracle.personDayNutrition.map(value => String(Number(value))));
  expect(saved.family).toEqual(oracle.familyNutrition.map(value => String(Number(value))));
  expect(saved.costs).toEqual({ ...oracle.costs, covered: '122' });
  expect(saved.kopecks).toEqual(Object.fromEntries(Object.entries(oracle.kopecks).map(([key, value]) => [key, String(value)])));
  expect(saved.rows?.find((row: TracerRow) => row.id === 'chicken')).toEqual({ id: 'chicken', required: '300', covered: '200', purchase: '100' });
  for (const [id, grams] of Object.entries(oracle.requiredGrams)) expect(saved.rows?.find((row: TracerRow) => row.id === id)?.required).toBe(String(grams));
  await page.goto('/menu');
  await expect(page.getByRole('heading', { level: 1, name: 'Меню на 1 день' })).toBeVisible();
  await expect(page.getByRole('main')).not.toContainText('Текущий каталог ограничен растительными рецептами');
  const budget = page.getByRole('region', { name: 'Бюджет меню' });
  await expect(budget).toContainText('701,28');
  await expect(budget).toContainText('122,00');
  await expect(budget).toContainText('579,28');
  await expect(page.locator('.menu-day-totals').getByText('1 422 ккал', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
  await page.screenshot({ path: `.tmp/phase031-01-menu-${width}.png`, fullPage: true });
  const chicken = page.locator('[data-instance-id="tracer-1"]');
  await chicken.getByRole('link').click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Куриное филе с рисом и морковью');
  await expect(page.getByRole('main')).not.toContainText('Текущий каталог ограничен растительными рецептами');
  await expect(page.getByRole('region', { name: 'На одну порцию' })).toContainText('554');
  await expect(page.getByText('Нужно 300 г · Из запасов 200 г · Докупить 100 г', { exact: true })).toBeVisible();
  await expect(page.getByRole('list', { name: 'Шаги приготовления' }).locator('li')).toHaveCount(4);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
  await page.screenshot({ path: `.tmp/phase031-01-recipe-${width}.png`, fullPage: true });
  await page.getByRole('link', { name: 'К меню', exact: true }).click();
  await page.getByRole('link', { name: /^Список покупок ·/ }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Список покупок');
  await expect(page.getByRole('main')).toContainText('100 г');
  expect(await page.evaluate(key => localStorage.getItem(key), activeKey)).toBe(saved.raw);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Список покупок');
  expect(await page.evaluate(key => localStorage.getItem(key), activeKey)).toBe(saved.raw);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
  await page.screenshot({ path: `.tmp/phase031-01-shopping-${width}.png`, fullPage: true });
});

test('tracer scales edible inputs once for half and double family servings', async ({ page }) => {
  const half = await saveTracer(page, '1');
  expect(half.version).toBe('mealplan-2026-11-11-1');
  expect(half.family).toEqual(['1421.72', '86.767', '40.709', '180.033']);
  expect(half.rows?.find((row: TracerRow) => row.id === 'chicken')).toEqual({ id: 'chicken', required: '150', covered: '150', purchase: '0' });
  const double = await saveTracer(page, '4');
  expect(double.family).toEqual(['5686.88', '347.068', '162.836', '720.132']);
  expect(double.rows?.find((row: TracerRow) => row.id === 'chicken')).toEqual({ id: 'chicken', required: '600', covered: '200', purchase: '400' });
});

test('ordinary-mixed wizard uses current compiled foods and persists append reload', async ({ page }) => {
  test.setTimeout(75_000);
  await page.goto('/plan/new');
  await page.getByLabel('Число дней', { exact: true }).fill('1');
  await page.getByRole('button', { name: 'Далее', exact: true }).click();
  await page.getByLabel('Бюджет на 1 день', { exact: true }).fill('2000');
  await expect(page.getByRole('status')).toHaveText('Сохранено на этом устройстве');
  await page.waitForTimeout(270);
  for (let step = 3; step <= 4; step++) {
    await page.getByRole('button', { name: 'Далее', exact: true }).click();
    await expect(page.getByText(`Шаг ${step} из 4`)).toBeVisible();
    // Wizard intentionally debounces repeated navigation for 250ms.
    if (step === 3) await page.waitForTimeout(270);
  }
  await page.getByRole('button', { name: 'Составить меню', exact: true }).click();
  await expect(page).toHaveURL(/\/menu$/, { timeout: 32_000 });
  const first = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).plan, activeKey);
  expect(first.inputs.catalogVersion).toBe('mealplan-2026-11-11-4');
  expect(first.variants[0].instances.some((row: { recipeId: string }) => futureGroups['breakfast-snack'].includes(row.recipeId))).toBe(true);
  expect(first.inputs.catalog.recipes).toHaveLength(82);
  expect(first.variants.some((variant: { instances: { recipeId: string }[] }) => variant.instances.some(row => futureGroups.dinners.includes(row.recipeId)))).toBe(true);
  await page.getByRole('button', { name: 'Пересобрать', exact: true }).click();
  await expect(page.getByText('Вариант 4 из 4', { exact: true })).toBeVisible({ timeout: 32_000 });
  const next = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).plan, activeKey);
  expect(next.inputs).toEqual(first.inputs);
  expect(next.variants.slice(0, 3)).toEqual(first.variants);
  expect(next.variants[3].instances).not.toEqual(first.variants[0].instances);
  await page.reload();
  await expect(page.getByText('Вариант 4 из 4', { exact: true })).toBeVisible();
});

interface SavedPlan {
  inputs: { catalogVersion: string };
  activeVariantId: string;
  variants: { id: string; instances: { id: string; recipeId: string; catalogVersion: string; recipeSnapshot: { name: string } }[] }[];
}
async function continueSavedSet(page: Page, original: SavedPlan) {
  const count = original.variants.length;
  await page.getByRole('button', { name: 'Пересобрать', exact: true }).click();
  await expect(page.getByText(`Вариант ${count + 1} из ${count + 1}`, { exact: true })).toBeVisible({ timeout: 32_000 });
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).plan, activeKey);
  expect(saved.inputs).toEqual(original.inputs);
  expect(saved.variants.slice(0, count)).toEqual(original.variants);
  expect(saved.variants[count].instances.every((row: { catalogVersion: string }) => row.catalogVersion === original.inputs.catalogVersion)).toBe(true);
  await page.getByRole('button', { name: 'Предыдущий вариант', exact: true }).click();
  await expect(page.getByText(`Вариант ${count} из ${count + 1}`, { exact: true })).toBeVisible();
  const selectedRaw = await page.evaluate(key => localStorage.getItem(key)!, activeKey);
  const selected = JSON.parse(selectedRaw).plan as SavedPlan;
  expect(selected.activeVariantId).toBe(original.variants[count - 1].id);
  const card = page.locator('[data-instance-id]:visible').first();
  const instanceId = await card.getAttribute('data-instance-id');
  const instance = selected.variants[count - 1].instances.find(row => row.id === instanceId)!;
  expect(instance).toBeDefined();
  // Use the visible contextual instance, including its actual day and slot.
  const href = await card.getByRole('link').getAttribute('href');
  expect(href).toContain(`variant=${encodeURIComponent(selected.activeVariantId)}`);
  expect(href).toContain(`instance=${encodeURIComponent(instance.id)}`);
  await card.getByRole('link').click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(instance.recipeSnapshot.name);
  await expect(page.getByRole('list', { name: 'Шаги приготовления' })).toBeVisible();
  await page.getByRole('link', { name: 'К меню', exact: true }).click();
  expect(await page.evaluate(key => localStorage.getItem(key), activeKey)).toBe(selectedRaw);
  await page.reload();
  await expect(page.getByText(`Вариант ${count} из ${count + 1}`, { exact: true })).toBeVisible();
  expect(await page.evaluate(key => localStorage.getItem(key), activeKey)).toBe(selectedRaw);
  await page.getByText('Действия с меню', { exact: true }).click();
  await page.getByRole('button', { name: 'Составить заново', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Создать новый набор', exact: true }).click();
  await expect(page.getByText('Вариант 1 из 3', { exact: true })).toBeVisible({ timeout: 32_000 });
  const recreatedRaw = await page.evaluate(key => localStorage.getItem(key)!, activeKey);
  const recreated = JSON.parse(recreatedRaw).plan as SavedPlan;
  expect(recreated.inputs).toEqual(original.inputs);
  expect(recreated.variants).toHaveLength(3);
  expect(recreated.variants.every(variant => variant.instances.every(row => row.catalogVersion === original.inputs.catalogVersion))).toBe(true);
  await page.reload();
  await expect(page.getByText('Вариант 1 из 3', { exact: true })).toBeVisible();
  expect(await page.evaluate(key => localStorage.getItem(key), activeKey)).toBe(recreatedRaw);
}

for (const [index, fixture] of [legacy, release1, release2, release3].entries()) test(`legacy ${fixture.plan.inputs.catalogVersion} saved bytes load select append recreate recipe reload`, async ({ page }) => {
  test.setTimeout(95_000);
  const width = [360, 768, 1280, 360][index];
  await page.setViewportSize({ width, height: 900 });
  await page.goto('/');
  const raw = JSON.stringify(fixture);
  await page.evaluate(({ key, raw }) => localStorage.setItem(key, raw), { key: activeKey, raw });
  await page.goto('/menu');
  const count = fixture.plan.variants.length;
  await expect(page.getByText(`Вариант 1 из ${count}`, { exact: true })).toBeVisible();
  expect(await page.evaluate(key => localStorage.getItem(key), activeKey)).toBe(raw);
  await page.reload();
  await expect(page.getByText(`Вариант 1 из ${count}`, { exact: true })).toBeVisible();
  expect(await page.evaluate(key => localStorage.getItem(key), activeKey)).toBe(raw);
  await continueSavedSet(page, fixture.plan);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
});

// Future release acceptance is authored now and executed by its owning plan.
const futureGroups = {
  'breakfast-snack': ['familiar-milk-oats-apple', 'familiar-syrniki', 'familiar-cottage-apple-bake', 'familiar-buckwheat-egg-carrot', 'familiar-oat-pancake-yogurt', 'familiar-chickpea-pancakes', 'familiar-water-oats-apple', 'familiar-cottage-cucumber-bread', 'familiar-chickpea-cucumber-toast', 'familiar-steamed-egg-pudding', 'familiar-baked-apple-oats', 'familiar-bean-tomato-cabbage-salad'],
  lunches: ['familiar-chicken-pasta-soup', 'familiar-turkey-balls-buckwheat', 'familiar-turkey-potato-cabbage', 'familiar-pollock-potato-carrot', 'familiar-cod-rice-soup', 'familiar-beef-pasta-tomato', 'familiar-lentil-vegetable-soup'],
  dinners: ['familiar-pollock-yogurt-buckwheat', 'familiar-pork-potato-cabbage', 'familiar-lazy-cabbage-rolls', 'familiar-turkey-pasta-tomato', 'familiar-chickpea-tomato-rice', 'familiar-bean-potato-stew', 'familiar-potato-tomato-frittata'],
};
for (const [group, ids] of Object.entries(futureGroups)) test(`${group} compiled original recipe routes have ingredients and steps`, async ({ page }) => {
  for (const id of ids) {
    await page.goto(`/recipe/${id}`);
    await expect(page.getByRole('heading', { level: 1 })).not.toHaveText('Такого рецепта нет');
    await expect(page.getByRole('list', { name: 'Шаги приготовления' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'На одну порцию' })).toContainText('ккал');
  }
});

for (const width of [360, 768, 1280]) test(`ordinary-week smoke defaults current82 select append recreate recipe reload at ${width}px`, async ({ page }) => {
  test.setTimeout(95_000);
  await page.setViewportSize({ width, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Меню за 1 клик', exact: true }).click();
  await expect(page).toHaveURL(/\/menu$/, { timeout: 32_000 });
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).plan, activeKey);
  expect(saved.inputs.appliedSettings.raw.budget).toBe('3000');
  expect(saved.variants[0].instances).toHaveLength(28);
  expect(new Set(saved.variants[0].instances.filter((row: { recipeId: string }) => row.recipeId.startsWith('familiar-')).map((row: { recipeId: string }) => row.recipeId)).size).toBeGreaterThanOrEqual(2);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'Меню на неделю' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
  await continueSavedSet(page, saved);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
  await page.screenshot({ path: `.tmp/phase031-05-current82-${width}.png`, fullPage: true });
});

for (const width of [360, 768, 1280]) test(`lunches current release family portions menu recipe shopping reload at ${width}px`, async ({ page }) => {
  test.setTimeout(45_000);
  await page.setViewportSize({ width, height: 900 });
  await page.goto('/');
  const saved = await page.evaluate(async ids => {
    const catalogPath = '/src/data/catalog.ts', settingsPath = '/src/domain/settings.ts';
    const appliedPath = '/src/domain/appliedSettings.ts', planPath = '/src/domain/plan.ts';
    const activePath = '/src/adapters/activePlan.ts', quantitiesPath = '/src/domain/quantities.ts';
    const { bundledCatalog, bundledCatalogPort } = await import(catalogPath);
    const loaded = await bundledCatalogPort.load();
    if (loaded.status !== 'loaded') throw new Error(JSON.stringify(loaded));
    const { createDraft } = await import(settingsPath);
    const { buildAppliedSettings } = await import(appliedPath);
    const { createPlanInputs, buildActivePlanEnvelope, mealSlots } = await import(planPath);
    const { decimal, formatExact } = await import(quantitiesPath);
    const { createActivePlanAdapter } = await import(activePath);
    const applied = buildAppliedSettings({ ...createDraft(), days: '7', budget: '20000', cookingTime: 'any' });
    if (applied.status !== 'applied') throw new Error('Invalid lunch settings');
    const inputs = createPlanInputs(applied.settings, bundledCatalog, { seed: 'seven-lunches', now: () => new Date(2026, 10, 12), pantrySnapshot: [
      { productId: 'chicken', quantity: { status: 'known', value: { amount: decimal('200'), unit: 'g' } }, expiresSoon: false },
    ] });
    const variant = { id: 'lunches', instances: ids.flatMap((lunchId, day) =>
      ['familiar-omelet-tomato-bread', lunchId, 'familiar-lentil-cabbage-tomato', 'familiar-yogurt-apple'].map((id, slot) => ({
        id: slot === 1 ? `lunch-${day}` : `other-${day}-${slot}`, date: inputs.dates[day], slot: mealSlots[slot], recipeId: id,
        catalogVersion: bundledCatalog.version, recipeSnapshot: bundledCatalog.recipes.find((recipe: { id: string }) => recipe.id === id), selectedServings: decimal('4'),
      }))) };
    const adapter = createActivePlanAdapter();
    await adapter.load();
    const result = await adapter.save(buildActivePlanEnvelope(inputs, [variant], variant.id), { isCurrent: () => true });
    if (result.status !== 'saved') throw new Error(JSON.stringify(result));
    return { version: bundledCatalog.version, raw: localStorage.getItem('mealplan:guest:active-plan:v1'),
      instances: result.bundle.projections[0].instances.filter((row: { instance: { slot: string } }) => row.instance.slot === 'lunch').map((row: { instance: { recipeId: string }; familyNutrition: Record<string, Parameters<typeof formatExact>[0]> }) => ({
        id: row.instance.recipeId, nutrition: Object.values(row.familyNutrition).map(value => formatExact(value)),
      })),
    };
  }, lunchOracle.map(row => row.id));
  expect(saved.version).toBe('mealplan-2026-11-11-4');
  expect(saved.instances.map((row: { id: string }) => row.id)).toEqual(lunchOracle.map(row => row.id));
  await page.goto('/menu?view=week');
  await expect(page.getByRole('heading', { level: 1, name: 'Меню на неделю' })).toBeVisible();
  await expect(page.getByText('Цены и КБЖУ примерные', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
  await page.screenshot({ path: `.tmp/phase031-03-menu-${width}.png`, fullPage: true });
  for (const [index, row] of lunchOracle.entries()) {
    expect(saved.instances[index].nutrition.map(Number)).toEqual(row.nutrition.map(value => Number(value) * 2));
    const card = page.locator(`[data-instance-id="lunch-${index}"]`);
    await card.getByRole('link').click();
    const portion = page.getByRole('region', { name: 'На одну порцию' });
    await expect(portion).toBeVisible();
    await expect(page.getByText('Порций для семьи: 4', { exact: true })).toBeVisible();
    await expect(portion).toContainText(`${Math.round(Number(row.nutrition[0]) / 2)} ккал`);
    await expect(portion).toContainText((Number(row.cost) / 2).toFixed(2).replace('.', ','));
    await expect(page.getByRole('list', { name: 'Шаги приготовления' }).locator('li')).toHaveCount(4);
    await expect(page.getByText('Цены и КБЖУ примерные', { exact: true })).toBeVisible();
    if (index === 0) await expect(page.getByText('Нужно 520 г · Из запасов 200 г · Докупить 320 г', { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    await page.screenshot({ path: `.tmp/phase031-03-${row.id}-${width}.png`, fullPage: true });
    await page.getByRole('link', { name: 'К меню', exact: true }).click();
  }
  await page.getByRole('link', { name: /^Список покупок ·/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Список покупок' })).toBeVisible();
  await expect(page.locator('[data-product-id="chicken"]')).toContainText('Купить 320 г');
  await expect(page.locator('[data-product-id="pasta"]')).toContainText('Купить 520 г');
  await expect(page.locator('[data-product-id="oil"]')).toContainText('Купить 456 г');
  await expect(page.getByRole('region', { name: 'Мясо и рыба' }).locator('[data-product-id="turkey"]')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Мясо и рыба' }).locator('[data-product-id="beef-mince"]')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Бакалея' }).locator('[data-product-id="pasta"]')).toBeVisible();
  await expect(page.getByText('Цены и КБЖУ примерные', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
  await page.screenshot({ path: `.tmp/phase031-03-shopping-${width}.png`, fullPage: true });
  await page.reload();
  await expect(page.locator('[data-product-id="chicken"]')).toContainText('Купить 320 г');
  expect(await page.evaluate(key => localStorage.getItem(key), activeKey)).toBe(saved.raw);
});

for (const width of [360, 768, 1280]) test(`dinners current release family portions menu recipe shopping reload at ${width}px`, async ({ page }) => {
  test.setTimeout(45_000);
  await page.setViewportSize({ width, height: 900 });
  await page.goto('/');
  const saved = await page.evaluate(async ids => {
    const catalogPath = '/src/data/catalog.ts', settingsPath = '/src/domain/settings.ts';
    const appliedPath = '/src/domain/appliedSettings.ts', planPath = '/src/domain/plan.ts';
    const activePath = '/src/adapters/activePlan.ts', quantitiesPath = '/src/domain/quantities.ts';
    const { bundledCatalog, bundledCatalogPort } = await import(catalogPath);
    const loaded = await bundledCatalogPort.load();
    if (loaded.status !== 'loaded') throw new Error(JSON.stringify(loaded));
    const { createDraft } = await import(settingsPath);
    const { buildAppliedSettings } = await import(appliedPath);
    const { createPlanInputs, buildActivePlanEnvelope, mealSlots } = await import(planPath);
    const { decimal, formatExact } = await import(quantitiesPath);
    const { createActivePlanAdapter } = await import(activePath);
    const applied = buildAppliedSettings({ ...createDraft(), days: '7', budget: '20000', cookingTime: 'any' });
    if (applied.status !== 'applied') throw new Error('Invalid lunch settings');
    const inputs = createPlanInputs(applied.settings, bundledCatalog, { seed: 'seven-dinners', now: () => new Date(2026, 10, 13), pantrySnapshot: [
      { productId: 'pork', quantity: { status: 'known', value: { amount: decimal('200'), unit: 'g' } }, expiresSoon: false },
    ] });
    const variant = { id: 'dinners', instances: ids.flatMap((dinnerId, day) =>
      ['familiar-omelet-tomato-bread', 'familiar-chicken-rice-carrot', dinnerId, 'familiar-yogurt-apple'].map((id, slot) => ({
        id: slot === 2 ? `dinner-${day}` : `other-${day}-${slot}`, date: inputs.dates[day], slot: mealSlots[slot], recipeId: id,
        catalogVersion: bundledCatalog.version, recipeSnapshot: bundledCatalog.recipes.find((recipe: { id: string }) => recipe.id === id), selectedServings: decimal('4'),
      }))) };
    const adapter = createActivePlanAdapter();
    await adapter.load();
    const result = await adapter.save(buildActivePlanEnvelope(inputs, [variant], variant.id), { isCurrent: () => true });
    if (result.status !== 'saved') throw new Error(JSON.stringify(result));
    return { version: bundledCatalog.version, raw: localStorage.getItem('mealplan:guest:active-plan:v1'),
      instances: result.bundle.projections[0].instances.filter((row: { instance: { slot: string } }) => row.instance.slot === 'dinner').map((row: { instance: { recipeId: string }; familyNutrition: Record<string, Parameters<typeof formatExact>[0]> }) => ({
        id: row.instance.recipeId, nutrition: Object.values(row.familyNutrition).map(value => formatExact(value)),
      })),
    };
  }, dinnerOracle.map(row => row.id));
  expect(saved.version).toBe('mealplan-2026-11-11-4');
  expect(saved.instances.map((row: { id: string }) => row.id)).toEqual(dinnerOracle.map(row => row.id));
  await page.goto('/menu?view=week');
  await expect(page.getByRole('heading', { level: 1, name: 'Меню на неделю' })).toBeVisible();
  await expect(page.getByText('Цены и КБЖУ примерные', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
  await page.screenshot({ path: `.tmp/phase031-04-menu-${width}.png`, fullPage: true });
  for (const [index, row] of dinnerOracle.entries()) {
    expect(saved.instances[index].nutrition.map(Number)).toEqual(row.nutrition.map(value => Number(value) * 2));
    const card = page.locator(`[data-instance-id="dinner-${index}"]`);
    await card.getByRole('link').click();
    const portion = page.getByRole('region', { name: 'На одну порцию' });
    await expect(portion).toBeVisible();
    await expect(page.getByText('Порций для семьи: 4', { exact: true })).toBeVisible();
    await expect(portion).toContainText(`${Math.round(Number(row.nutrition[0]) / 2)} ккал`);
    await expect(portion).toContainText((Number(row.cost) / 2).toFixed(2).replace('.', ','));
    await expect(page.getByRole('list', { name: 'Шаги приготовления' }).locator('li')).toHaveCount(4);
    await expect(page.getByText('Цены и КБЖУ примерные', { exact: true })).toBeVisible();
    if (index === 1) await expect(page.getByText('Нужно 600 г · Из запасов 200 г · Докупить 400 г', { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    await page.screenshot({ path: `.tmp/phase031-04-${row.id}-${width}.png`, fullPage: true });
    await page.getByRole('link', { name: 'К меню', exact: true }).click();
  }
  await page.getByRole('link', { name: /^Список покупок ·/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Список покупок' })).toBeVisible();
  await expect(page.locator('[data-product-id="pork"]')).toContainText('Купить 400 г');
  await expect(page.locator('[data-product-id="pasta"]')).toContainText('Купить 320 г');
  // Two base batches: seven breakfasts10g + seven lunches14g + dinners82g.
  await expect(page.locator('[data-product-id="oil"]')).toContainText('Купить 500 г');
  await expect(page.getByRole('region', { name: 'Мясо и рыба' }).locator('[data-product-id="pork"]')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Мясо и рыба' }).locator('[data-product-id="pollock"]')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Бакалея' }).locator('[data-product-id="pasta"]')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Бакалея' }).locator('[data-product-id="chickpea-canned"]')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Бакалея' }).locator('[data-product-id="bean-canned"]')).toBeVisible();
  await expect(page.getByText('Цены и КБЖУ примерные', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
  await page.screenshot({ path: `.tmp/phase031-04-shopping-${width}.png`, fullPage: true });
  await page.reload();
  await expect(page.locator('[data-product-id="pork"]')).toContainText('Купить 400 г');
  expect(await page.evaluate(key => localStorage.getItem(key), activeKey)).toBe(saved.raw);
});
