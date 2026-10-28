import { expect, type Page } from '@playwright/test';
import type { Catalog, FoodProfile } from '../src/domain/catalog';

export interface PlanFixtureOptions {
  stock?: 'partial' | 'all' | 'over' | 'none' | 'unknown' | 'incompatible';
  target?: 'absent' | 'exact-ten' | 'above-ten' | 'zero-positive';
  many?: boolean;
  long?: boolean;
}
// Test-only synthetic inputs. Literal expectations in specs are independent of selectors.
// Four 125g family meals = 500g need; 200g stock => 300g purchase.
// 100 RUB/kg => ingredient50, covered20, purchase30; two people =>1000kcal/person/day.
export async function syntheticEnvelope(options: PlanFixtureOptions = {}) {
  const settingsPath = '/src/domain/settings.ts', appliedPath = '/src/domain/appliedSettings.ts', planPath = '/src/domain/plan.ts', quantitiesPath = '/src/domain/quantities.ts';
  const { createDraft } = await import(settingsPath);
  const { buildAppliedSettings } = await import(appliedPath);
  const { buildActivePlanEnvelope, createPlanInputs, createRecipeInstances, encodePlanEnvelope } = await import(planPath);
  const { decimal } = await import(quantitiesPath);
  const source = { sourceId: 'synthetic-browser-only', recordId: 'literal-oracle', release: 'test-v1', license: 'Synthetic test data', url: 'https://example.org/synthetic' };
  const categories = ['Овощи и фрукты', 'Мясо и рыба', 'Молочное', 'Бакалея', 'Хлеб', 'Прочее'];
  const foods: FoodProfile[] = Array.from({ length: options.many ? 6 : 1 }, (_, index) => ({
    productId: `synthetic-${index}`, profileId: `synthetic-profile-${index}`,
    name: options.long ? `СинтетическийПродукт${'ОченьДлинноеНазвание'.repeat(8)}${index}` : 'Синтетический продукт', identity: `synthetic food ${index}`, state: 'raw', category: categories[index],
    nutrition: { status: 'known', reference: { amount: '100', unit: 'g', basis: 'edible' }, values: { calories: options.target === 'exact-ten' ? '440' : options.target === 'above-ten' ? '440.004' : '400', protein: '20', fat: '0', carbohydrates: '60' }, source },
    price: { status: 'known', amount: '100', currency: 'RUB', reference: { amount: '1', unit: 'kg', basis: 'edible' }, source: { ...source, recordId: `price-${index}` }, region: index % 2 ? 'Синтетический второй регион' : 'Синтетическая веб-витрина, регион не указан', observedAt: index % 2 ? '2026-10-02' : '2026-10-01', estimate: true },
    safety: { status: 'known', facts: [{ kind: 'restriction', key: 'vegetarian', suitable: true, evidence: [source] }] }, conversions: [],
  }));
  const draft = createDraft(); draft.days = '1'; draft.people = '2';
  if (options.target && options.target !== 'absent') {
    draft.targetSource = { kind: 'manual' };
    draft.manualNutrition = { calories: '1000', protein: options.target === 'zero-positive' ? '0' : '50', fat: '0', carbohydrates: '150' };
  }
  const applied = buildAppliedSettings(draft);
  if (applied.status !== 'applied') throw new Error('Invalid synthetic settings');
  const catalog: Catalog = { version: 'synthetic-browser-v1', foods, recipes: [{ id: 'synthetic-repeated', name: 'Синтетическое повторяющееся блюдо', baseServings: decimal('2'), slots: ['breakfast', 'lunch', 'dinner', 'snack'], cookingMinutes: 10,
    ingredients: foods.map(food => ({ productId: food.productId, profileId: food.profileId, quantity: { amount: decimal('125'), unit: 'g' } })), steps: ['Синтетический тест'], source }] };
  const stock = options.stock ?? 'partial';
  const pantrySnapshot = stock === 'none' ? [] : foods.map(food => ({ productId: food.productId, expiresSoon: false, quantity: stock === 'unknown' ? { status: 'unknown' as const } : { status: 'known' as const, value: { amount: decimal(stock === 'all' ? '500' : stock === 'over' ? '900' : '200'), unit: stock === 'incompatible' ? 'ml' as const : 'g' as const } } }));
  const inputs = createPlanInputs(applied.settings, catalog, { seed: 'synthetic', now: () => new Date(2026, 9, 1), pantrySnapshot });
  const instances = createRecipeInstances(inputs, Array(4).fill('synthetic-repeated'), (date: string, slot: string) => `synthetic-${date}-${slot}`);
  return encodePlanEnvelope(buildActivePlanEnvelope(inputs, [{ id: 'synthetic-active', instances }], 'synthetic-active'));
}

export async function openSyntheticPlan(page: Page, options: PlanFixtureOptions = {}, route = '/menu') {
  await page.goto('/plan/new');
  await expect(page.getByLabel('Число людей', { exact: true })).toBeVisible();
  const plan = await page.evaluate(syntheticEnvelope, options);
  await page.evaluate(plan => {
    localStorage.setItem('mealplan:guest:active-plan:v1', JSON.stringify({ schemaVersion: 1, plan }));
  }, plan);
  await page.goto(route);
  await expect(page.locator('[data-plan-id]')).toHaveAttribute('data-plan-id', 'synthetic-active');
}

export async function generateRealPlan(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Меню за 1 клик', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Меню на неделю', exact: true })).toBeVisible();
}
