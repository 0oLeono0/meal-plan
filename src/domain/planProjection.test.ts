import { describe, expect, it } from 'vitest';
import { buildAppliedSettings } from './appliedSettings';
import type { PantrySnapshotRow } from './appliedSettings';
import type { Catalog, FoodProfile, Recipe } from './catalog';
import { createPlanInputs } from './plan';
import type { PlanVariant, RecipeInstance } from './plan';
import { decimal, formatExact, rational } from './quantities';
import { createDraft } from './settings';
import * as projection from './planProjection';

// All numbers and provenance in this file are synthetic test oracles, never production data.
const source = { sourceId: 'synthetic', recordId: 'test', release: 'v1', license: 'CC0-1.0', url: 'https://example.org/test' };
const food: FoodProfile = { productId: 'rice', profileId: 'raw', name: 'Тестовый рис', identity: 'test rice', state: 'raw', category: 'Крупы',
  nutrition: { status: 'known', reference: { amount: '100', unit: 'g', basis: 'edible' }, values: { calories: '120', protein: '10', fat: '4', carbohydrates: '11' }, source },
  price: { status: 'known', amount: '200', currency: 'RUB', reference: { amount: '1', unit: 'kg', basis: 'edible' }, source, region: 'Тестовый регион', observedAt: '2026-10-01', estimate: true },
  safety: { status: 'unknown', reason: 'Synthetic fixture has no safety claim' }, conversions: [] };
const recipe = (id: string, grams: string): Recipe => ({ id, name: id, baseServings: decimal('2'), ingredients: [{ productId: 'rice', profileId: 'raw', quantity: { amount: decimal(grams), unit: 'g' } }], slots: ['breakfast', 'lunch', 'dinner', 'snack'], cookingMinutes: 10, steps: ['Тест'], source });
function fixture(pantry: readonly PantrySnapshotRow[] = [], foods: readonly FoodProfile[] = [food]) {
  const draft = createDraft(); draft.days = '2'; draft.people = '2';
  const applied = buildAppliedSettings(draft);
  if (applied.status !== 'applied') throw new Error('Bad test settings');
  const catalog: Catalog = { version: 'synthetic-v1', foods, recipes: [recipe('r200', '200'), recipe('r300', '300')] };
  const inputs = createPlanInputs(applied.settings, catalog, { seed: 'test', now: () => new Date(2026, 9, 27), pantrySnapshot: pantry });
  const instances: RecipeInstance[] = catalog.recipes.map((entry, index) => ({ id: `instance-${index}`, date: inputs.dates[index], slot: 'breakfast', recipeId: entry.id, catalogVersion: inputs.catalogVersion, recipeSnapshot: entry, selectedServings: decimal('2') }));
  return { inputs, variant: { id: 'test', instances } satisfies PlanVariant };
}
const stock = (amount: string, unit: 'g' | 'kg' | 'ml' = 'g'): readonly PantrySnapshotRow[] => [{ productId: 'rice', quantity: { status: 'known', value: { amount: decimal(amount), unit } }, expiresSoon: true }];
function projected(data = fixture(stock('200'))) {
  const result = projection.projectPlan(data.inputs, data.variant);
  expect(result.status).toBe('projected');
  if (result.status !== 'projected') throw new Error(JSON.stringify(result));
  return result.projection;
}
describe('whole-period exact projection', () => {
  it('aggregates 200+300g before spending pantry 200g once and reconciles all costs', () => {
    const result = projected(); const row = result.rows[0];
    expect(formatExact(row.required.amount)).toBe('500');
    expect(formatExact(row.covered.amount)).toBe('200');
    expect(formatExact(row.purchase.amount)).toBe('300');
    expect(result.costs.exact).toEqual({ ingredient: decimal('100'), purchase: decimal('60'), covered: decimal('40') });
    expect(result.costs.kopecks).toEqual({ ingredient: 10000n, purchase: 6000n, covered: 4000n });
    expect(row.sources.map(entry => [entry.instanceId, entry.date, entry.slot, formatExact(entry.quantity.amount)])).toEqual([
      ['instance-0', '2026-10-27', 'breakfast', '200'], ['instance-1', '2026-10-28', 'breakfast', '300'],
    ]);
    expect(result.purchases).toHaveLength(1); expect(result.covered).toHaveLength(1);
    expect(row.category).toBe('Крупы');
  });
  it.each([{ pantry: [] }, { pantry: [{ productId: 'rice', quantity: { status: 'unknown' as const }, expiresSoon: false }] }, { pantry: stock('200', 'ml') }])('does not cover absent, unknown or incompatible stock $pantry', ({ pantry }) => {
    const result = projected(fixture(pantry));
    expect(result.costs.exact.purchase).toEqual(decimal('100'));
    expect(result.covered).toHaveLength(0);
    if (pantry.length) expect(result.pantryIssues[0].code).toBe(pantry[0].quantity.status === 'unknown' ? 'UNKNOWN_PANTRY_QUANTITY' : 'INCOMPATIBLE_PANTRY_UNIT');
  });
  it('normalizes kg stock, caps excess coverage and never mutates input', () => {
    const data = fixture(stock('1', 'kg')); const result = projected(data);
    expect(result.purchases).toHaveLength(0); expect(result.rows[0].purchase.amount).toEqual(decimal('0'));
    expect(result.costs.exact).toEqual({ ingredient: decimal('100'), purchase: decimal('0'), covered: decimal('100') });
    expect(data.inputs.pantrySnapshot).toEqual(stock('1', 'kg'));
  });
  it('scales base2 to selected3 once and keeps family, portion, day and average nutrients exact', () => {
    const data = fixture();
    const instance = { ...data.variant.instances[0], selectedServings: decimal('3') };
    const result = projected({ ...data, variant: { id: 'scaled', instances: [instance] } });
    expect(result.rows[0].required.amount).toEqual(decimal('300'));
    expect(result.instances[0].familyNutrition).toEqual({ calories: decimal('360'), protein: decimal('30'), fat: decimal('12'), carbohydrates: decimal('33') });
    expect(result.instances[0].perPortionNutrition).toEqual({ calories: decimal('120'), protein: decimal('10'), fat: decimal('4'), carbohydrates: decimal('11') });
    expect(result.days[0].personNutrition.calories).toEqual(decimal('180'));
    expect(result.days[0].ingredientCost).toEqual(decimal('60'));
    expect(result.days[1].familyNutrition.calories).toEqual(decimal('0'));
    expect(result.averagePersonDayNutrition.calories).toEqual(decimal('90'));
  });
  it('pantry coverage cannot change nutrition and repeated recipes retain both instances', () => {
    expect(projected().familyNutrition).toEqual(projected(fixture()).familyNutrition);
    const data = fixture(); const first = data.variant.instances[0];
    const result = projected({ ...data, variant: { id: 'repeated', instances: [first, { ...first, id: 'again', date: data.inputs.dates[1] }] } });
    expect(result.rows[0].sources.map(entry => entry.instanceId)).toEqual(['instance-0', 'again']);
    expect(result.familyNutrition.calories).toEqual(decimal('480'));
  });
  it('reports missing price and nutrient facts instead of inventing zero', () => {
    for (const altered of [{ ...food, price: { status: 'unknown' as const, reason: 'test' } }, { ...food, nutrition: { status: 'unknown' as const, reason: 'test' } }]) {
      const data = fixture([], [altered]);
      expect(projection.projectPlan(data.inputs, data.variant).status).toBe('invalid');
    }
  });
  it('retains fractional selected servings without intermediate rounding', () => {
    const data = fixture();
    const result = projected({ ...data, variant: { id: 'third', instances: [{ ...data.variant.instances[0], selectedServings: rational(1n, 3n) }] } });
    expect(result.rows[0].required.amount).toEqual(rational(100n, 3n));
    expect(result.familyNutrition.calories).toEqual(decimal('40'));
  });
});
