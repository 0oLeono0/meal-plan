import { test, expect, type Page } from '@playwright/test';
import oracle from './fixtures/catalog031-oracle.json' with { type: 'json' };
import legacy from '../src/test/fixtures/phase02-active-plan-v1.json' with { type: 'json' };

const activeKey = 'mealplan:guest:active-plan:v1';

async function saveTracer(page: Page, servings = '2') {
  await page.goto('/');
  return page.evaluate(async ({ recipeIds, servings }) => {
    const catalogPath = '/src/data/catalog.ts', planPath = '/src/domain/plan.ts';
    const settingsPath = '/src/domain/settings.ts', appliedPath = '/src/domain/appliedSettings.ts';
    const activePath = '/src/adapters/activePlan.ts', quantitiesPath = '/src/domain/quantities.ts';
    const { bundledCatalog, bundledCatalogPort } = await import(catalogPath);
    const loaded = await bundledCatalogPort.load();
    if (loaded.status !== 'loaded') throw new Error(JSON.stringify(loaded));
    const { createDraft } = await import(settingsPath);
    const { buildAppliedSettings } = await import(appliedPath);
    const { createPlanInputs, buildActivePlanEnvelope, mealSlots } = await import(planPath);
    const { decimal, formatExact } = await import(quantitiesPath);
    const { createActivePlanAdapter } = await import(activePath);
    const applied = buildAppliedSettings({ ...createDraft(), days: '1', budget: '2000' });
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
  }, { recipeIds: oracle.recipeIds, servings });
}

test('tracer source-backed B1 L1 D7 S1 save menu recipe shopping reload', async ({ page }) => {
  const saved = await saveTracer(page);
  expect(saved.version).toBe('mealplan-2026-11-11-1');
  expect(saved.presentIds).toEqual(oracle.recipeIds);
  expect(saved.nutrition).toEqual(oracle.personDayNutrition.map(value => String(Number(value))));
  expect(saved.family).toEqual(oracle.familyNutrition.map(value => String(Number(value))));
  expect(saved.costs).toEqual({ ...oracle.costs, covered: '122' });
  expect(saved.kopecks).toEqual(Object.fromEntries(Object.entries(oracle.kopecks).map(([key, value]) => [key, String(value)])));
  expect(saved.rows?.find(row => row.id === 'chicken')).toEqual({ id: 'chicken', required: '300', covered: '200', purchase: '100' });
  for (const [id, grams] of Object.entries(oracle.requiredGrams)) expect(saved.rows?.find(row => row.id === id)?.required).toBe(String(grams));
  await page.goto('/menu');
  await expect(page.getByRole('heading', { level: 1, name: 'Меню на 1 день' })).toBeVisible();
  const budget = page.getByRole('region', { name: 'Бюджет меню' });
  await expect(budget).toContainText('701,29');
  await expect(budget).toContainText('122,00');
  await expect(budget).toContainText('579,29');
  await expect(page.getByText('1 422 ккал', { exact: true })).toBeVisible();
  const chicken = page.locator('[data-instance-id="tracer-1"]');
  await chicken.getByRole('link').click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Куриное филе с рисом и морковью');
  await expect(page.getByRole('region', { name: 'На одну порцию' })).toContainText('554');
  await expect(page.getByText('Нужно 300 г · Из запасов 200 г · Докупить 100 г', { exact: true })).toBeVisible();
  await expect(page.getByRole('list', { name: 'Шаги приготовления' }).locator('li')).toHaveCount(4);
  await page.getByRole('link', { name: 'К меню', exact: true }).click();
  await page.getByRole('link', { name: /^Список покупок ·/ }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Список покупок');
  await expect(page.getByText('100 г', { exact: true }).first()).toBeVisible();
  expect(await page.evaluate(key => localStorage.getItem(key), activeKey)).toBe(saved.raw);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Список покупок');
  expect(await page.evaluate(key => localStorage.getItem(key), activeKey)).toBe(saved.raw);
});

test('tracer scales edible inputs once for half and double family servings', async ({ page }) => {
  const half = await saveTracer(page, '1');
  expect(half.version).toBe('mealplan-2026-11-11-1');
  expect(half.family).toEqual(['1421.72', '86.767', '40.709', '180.033']);
  expect(half.rows?.find(row => row.id === 'chicken')).toEqual({ id: 'chicken', required: '150', covered: '150', purchase: '0' });
  const double = await saveTracer(page, '4');
  expect(double.family).toEqual(['5686.88', '347.068', '162.836', '720.132']);
  expect(double.rows?.find(row => row.id === 'chicken')).toEqual({ id: 'chicken', required: '600', covered: '200', purchase: '400' });
});

test('ordinary-mixed wizard uses current compiled foods and persists append reload', async ({ page }) => {
  test.setTimeout(75_000);
  await page.goto('/plan/new');
  await page.getByLabel('Число дней', { exact: true }).fill('1');
  await page.getByLabel('Бюджет на неделю', { exact: true }).fill('2000');
  for (let step = 0; step < 3; step++) await page.getByRole('button', { name: 'Далее', exact: true }).click();
  await page.getByRole('button', { name: 'Составить меню', exact: true }).click();
  await expect(page).toHaveURL(/\/menu$/, { timeout: 32_000 });
  const first = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).plan, activeKey);
  expect(first.inputs.catalogVersion).toBe('mealplan-2026-11-11-1');
  expect(first.variants[0].instances.map((row: { recipeId: string }) => row.recipeId)).toEqual(oracle.recipeIds);
  expect(first.inputs.catalog.recipes).toHaveLength(56);
  await page.getByRole('button', { name: 'Пересобрать', exact: true }).click();
  await expect(page.getByText('Вариант 4 из 4', { exact: true })).toBeVisible({ timeout: 32_000 });
  const next = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).plan, activeKey);
  expect(next.inputs).toEqual(first.inputs);
  expect(next.variants.slice(0, 3)).toEqual(first.variants);
  expect(next.variants[3].instances).not.toEqual(first.variants[0].instances);
  await page.reload();
  await expect(page.getByText('Вариант 4 из 4', { exact: true })).toBeVisible();
});

test('legacy original saved bytes reload and append using their compiled version', async ({ page }) => {
  test.setTimeout(65_000);
  await page.goto('/');
  await page.evaluate(({ key, raw }) => localStorage.setItem(key, raw), { key: activeKey, raw: JSON.stringify(legacy) });
  await page.goto('/menu');
  await expect(page.getByText('Вариант 1 из 1', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Пересобрать', exact: true }).click();
  await expect(page.getByText('Вариант 2 из 2', { exact: true })).toBeVisible({ timeout: 32_000 });
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).plan, activeKey);
  expect(saved.inputs).toEqual(legacy.plan.inputs);
  expect(saved.variants[0]).toEqual(legacy.plan.variants[0]);
  expect(saved.variants[1].instances.every((row: { catalogVersion: string }) => row.catalogVersion === 'mealplan-2026-10-28-1')).toBe(true);
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

test('ordinary-week smoke defaults retain affordable real mixed meals', async ({ page }) => {
  test.setTimeout(45_000);
  await page.goto('/');
  await page.getByRole('button', { name: 'Меню за 1 клик', exact: true }).click();
  await expect(page).toHaveURL(/\/menu$/, { timeout: 32_000 });
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).plan, activeKey);
  expect(saved.inputs.appliedSettings.raw.budget).toBe('3000');
  expect(saved.variants[0].instances).toHaveLength(28);
  expect(new Set(saved.variants[0].instances.filter((row: { recipeId: string }) => row.recipeId.startsWith('familiar-')).map((row: { recipeId: string }) => row.recipeId)).size).toBeGreaterThanOrEqual(2);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'Меню на неделю' })).toBeVisible();
});
