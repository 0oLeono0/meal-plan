import { describe, expect, it } from 'vitest';
import { buildAppliedSettings } from './appliedSettings';
import type { PantrySnapshotRow } from './appliedSettings';
import type { Catalog, FoodProfile, Recipe } from './catalog';
import { createPlanInputs } from './plan';
import type { PlanVariant, RecipeInstance } from './plan';
import { decimal, formatExact, rational } from './quantities';
import { createDraft } from './settings';
import * as projection from './planProjection';
import { bundledCatalog } from '../data/catalog';

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

it.each([
  ['chicken', 'pantry-chicken-fillet', 'familiar-chicken-rice-carrot', 'lunch'],
  ['egg', 'pantry-egg-mass', 'familiar-steamed-egg-pudding', 'snack'],
] as const)('preserves %s from the draft but credits only confirmed edible weight on a new plan', (productId, confirmedId, recipeId, slot) => {
  const original = { productId, quantity: '0,1', unit: 'kg' as const, expiresSoon: true };
  const apply = (home: { productId: string; quantity: string; unit: 'kg'; expiresSoon: boolean }[]) => {
    const result = buildAppliedSettings({ ...createDraft(), days: '1', home });
    if (result.status !== 'applied') throw new Error('Pantry settings did not apply');
    return result.settings;
  };
  const legacy = apply([original]);
  expect(legacy.raw.home).toEqual([original]);
  const settings = { seed: 'pantry-basis' };
  const current = createPlanInputs(legacy, bundledCatalog, settings);
  const historical = createPlanInputs(legacy, bundledCatalog, { ...settings, pantrySnapshot: legacy.home });
  const recipe = bundledCatalog.recipes.find(row => row.id === recipeId)!;
  const project = (inputs: typeof current) => projected({ inputs, variant: {
    id: 'pantry-basis', instances: [{ id: 'pantry-meal', date: inputs.dates[0], slot, recipeId, recipeSnapshot: recipe,
      catalogVersion: inputs.catalogVersion, selectedServings: decimal('2') }],
  } }).rows.find(row => row.productId === productId)!;
  expect(project(current).covered.amount).toEqual(decimal('0'));
  expect(project(historical).covered.amount).toEqual(decimal('100'));
  const confirmed = apply([{ ...original, productId: confirmedId }]);
  expect(project(createPlanInputs(confirmed, bundledCatalog, settings)).covered.amount).toEqual(decimal('100'));
});

it('current82 four-person repeated lunches retain exact family nutrition and spend200g stock once', () => {
  const applied = buildAppliedSettings({ ...createDraft(), people: '4', days: '2' });
  if (applied.status !== 'applied') throw new Error('Four-person settings');
  const inputs = createPlanInputs(applied.settings, bundledCatalog, { seed: 'four-portion-ledger', now: () => new Date(2026, 10, 17), pantrySnapshot: [
    { productId: 'chicken', quantity: { status: 'known', value: { amount: decimal('0.2'), unit: 'kg' } }, expiresSoon: false },
  ] });
  const chickenRecipe = bundledCatalog.recipes.find(row => row.id === 'familiar-chicken-rice-carrot')!;
  const variant: PlanVariant = { id: 'four-portions', instances: inputs.dates.map((date, index) => ({ id: `four-${index}`, date, slot: 'lunch', recipeId: chickenRecipe.id,
    catalogVersion: bundledCatalog.version, recipeSnapshot: chickenRecipe, selectedServings: decimal('4') })) };
  const result = projection.projectPlan(inputs, variant);
  if (result.status !== 'projected') throw new Error('Four-person projection');
  const projected = result.projection;
  expect(Object.values(projected.familyNutrition).map(formatExact)).toEqual(['4435.04', '320.888', '93.376', '554.248']);
  expect(Object.values(projected.instances[0].perPortionNutrition).map(formatExact)).toEqual(['554.38', '40.111', '11.672', '69.281']);
  expect(projected.instances.map(row => row.ingredients.find(ingredient => ingredient.productId === 'chicken')!.covered.amount).map(formatExact)).toEqual(['200', '0']);
  const row = projected.rows.find(row => row.productId === 'chicken')!;
  expect([row.required.amount, row.covered.amount, row.purchase.amount].map(formatExact)).toEqual(['1200', '200', '1000']);
  expect(Object.fromEntries(Object.entries(projected.costs.exact).map(([key, value]) => [key, formatExact(value)]))).toEqual({ ingredient: '844.2921343209876376', covered: '122', purchase: '722.2921343209876376' });
});

it.each(['unknown', 'incompatible'] as const)('current82 %s pantry retains full purchases through the real projection boundary', kind => {
  const applied = buildAppliedSettings({ ...createDraft(), people: '4', days: '1' });
  if (applied.status !== 'applied') throw new Error('Current settings');
  const quantity: PantrySnapshotRow['quantity'] = kind === 'unknown' ? { status: 'unknown' }
    : { status: 'known', value: { amount: decimal('200'), unit: 'ml' } };
  const inputs = createPlanInputs(applied.settings, bundledCatalog, { seed: `current-${kind}-stock`, pantrySnapshot: [{ productId: 'chicken', quantity, expiresSoon: false }] });
  const recipe = bundledCatalog.recipes.find(row => row.id === 'familiar-chicken-rice-carrot')!;
  const variant: PlanVariant = { id: kind, instances: [{ id: kind, date: inputs.dates[0], slot: 'lunch', recipeId: recipe.id, catalogVersion: bundledCatalog.version, recipeSnapshot: recipe, selectedServings: decimal('4') }] };
  const result = projection.projectPlan(inputs, variant);
  if (result.status !== 'projected') throw new Error('Current projection');
  const row = result.projection.rows.find(row => row.productId === 'chicken')!;
  expect([row.required.amount, row.covered.amount, row.purchase.amount].map(formatExact)).toEqual(['600', '0', '600']);
  expect(result.projection.pantryIssues[0].code).toBe(kind === 'unknown' ? 'UNKNOWN_PANTRY_QUANTITY' : 'INCOMPATIBLE_PANTRY_UNIT');
  expect(result.projection.costs.exact.covered).toEqual(decimal('0'));
  expect(result.projection.costs.exact.ingredient).toEqual(result.projection.costs.exact.purchase);
});

it('current82 repeated chicken lunches spend exactly200g once and retain all three source costs', () => {
  const applied = buildAppliedSettings({ ...createDraft(), days: '2' });
  if (applied.status !== 'applied') throw new Error('Current settings');
  const inputs = createPlanInputs(applied.settings, bundledCatalog, { seed: 'source-chicken-stock', now: () => new Date(2026, 10, 13), pantrySnapshot: [
    { productId: 'chicken', quantity: { status: 'known', value: { amount: decimal('200'), unit: 'g' } }, expiresSoon: true },
  ] });
  const recipe = bundledCatalog.recipes.find(row => row.id === 'familiar-chicken-rice-carrot')!;
  const variant: PlanVariant = { id: 'chicken-twice', instances: inputs.dates.map(date => ({ id: `chicken/${date}`, date, slot: 'lunch', recipeId: recipe.id,
    catalogVersion: bundledCatalog.version, recipeSnapshot: recipe, selectedServings: decimal('2') })) };
  for (const instances of [variant.instances, [...variant.instances].reverse()]) {
    const result = projection.projectPlan(inputs, { ...variant, instances });
    if (result.status !== 'projected') throw new Error('Current lunch projection');
    const projected = result.projection;
    const chicken = projected.rows.find(row => row.productId === 'chicken')!;
    expect([chicken.required.amount, chicken.covered.amount, chicken.purchase.amount].map(formatExact)).toEqual(['600', '200', '400']);
    expect(projected.instances.map(instance => instance.ingredients.find(row => row.productId === 'chicken')!.covered.amount).map(formatExact)).toEqual(['200', '0']);
    expect(Object.fromEntries(Object.entries(projected.costs.exact).map(([key, value]) => [key, formatExact(value)])))
      .toEqual({ ingredient: '422.1460671604938188', covered: '122', purchase: '300.1460671604938188' });
    expect(formatExact(projected.familyNutrition.calories)).toBe('2217.52');
  }
});
function projected(data = fixture(stock('200'))) {
  const result = projection.projectPlan(data.inputs, data.variant);
  expect(result.status).toBe('projected');
  if (result.status !== 'projected') throw new Error(JSON.stringify(result));
  return result.projection;
}
describe('whole-period exact projection', () => {
  it('allocates the product remainder in canonical date slot order independent of input order', () => {
    const data = fixture(stock('200'));
    const first = { ...data.variant.instances[1], id: 'early300', date: data.inputs.dates[0], slot: 'breakfast' as const };
    const next = { ...data.variant.instances[0], id: 'late200', date: data.inputs.dates[0], slot: 'lunch' as const };
    const result = projected({ ...data, variant: { id: 'ledger', instances: [next, first] } });
    expect(result.instances.map(row => row.instance.id)).toEqual(['early300', 'late200']);
    expect(result.instances[0]).toMatchObject({ ingredients: [{ index: 0, required: { amount: decimal('300'), unit: 'g' }, covered: { amount: decimal('200'), unit: 'g' }, purchase: { amount: decimal('100'), unit: 'g' }, issue: null }] });
    expect(result.instances[1]).toMatchObject({ ingredients: [{ covered: { amount: decimal('0') }, purchase: { amount: decimal('200') } }] });
    expect(result.rows[0].purchase.amount).toEqual(decimal('300'));
    expect(result.rows[0].covered.amount).toEqual(decimal('200'));
    expect(result.rows[0].sources.map(row => row.instanceId)).toEqual(['early300', 'late200']);
  });
  it('conserves required covered and purchase for every instance across stock sizes and permutations', () => {
    for (const amount of ['1', '199', '200', '201', '499', '500', '1000']) {
      const data = fixture(stock(amount));
      for (const instances of [data.variant.instances, [...data.variant.instances].reverse()]) {
        const result = projected({ ...data, variant: { ...data.variant, instances } });
        const allocations = result.instances.flatMap(row => row.ingredients);
        const values = allocations.map(row => [row.required.amount, row.covered.amount, row.purchase.amount].map(value => {
          expect(value.denominator).toBe(1n); return value.numerator;
        }));
        const expectedCovered = BigInt(amount) < 500n ? BigInt(amount) : 500n;
        expect(values.reduce((sum, row) => sum + row[1], 0n)).toBe(expectedCovered);
        expect(values.reduce((sum, row) => sum + row[2], 0n)).toBe(500n - expectedCovered);
        for (const [required, covered, purchase] of values) {
          expect(required).toBe(covered + purchase); expect(covered >= 0n && purchase >= 0n).toBe(true);
        }
        expect(result.rows[0].covered.amount).toEqual(rational(expectedCovered));
        expect(result.rows[0].purchase.amount).toEqual(rational(500n - expectedCovered));
      }
    }
  });
  it('keeps source ingredient priority across profiles regardless of foods array order', () => {
    const other = { ...food, profileId: 'second' };
    const data = fixture(stock('200'), [food, other]);
    const recipe = { ...data.inputs.catalog.recipes[0], ingredients: [
      { productId: 'rice', profileId: 'second', quantity: { amount: decimal('300'), unit: 'g' as const } },
      { productId: 'rice', profileId: 'raw', quantity: { amount: decimal('200'), unit: 'g' as const } },
    ] };
    for (const foods of [[food, other], [other, food]]) {
      const inputs = createPlanInputs(data.inputs.appliedSettings, { ...data.inputs.catalog, foods, recipes: [recipe] }, { seed: 'test', now: () => new Date(2026, 9, 27), pantrySnapshot: stock('0.2', 'kg') });
      const variant = { id: 'profiles', instances: [{ ...data.variant.instances[0], recipeSnapshot: recipe }] };
      const result = projected({ inputs, variant });
      expect(result.instances[0].ingredients.map(row => [row.index, row.profileId, formatExact(row.covered.amount), formatExact(row.purchase.amount)])).toEqual([[0, 'second', '200', '100'], [1, 'raw', '0', '200']]);
      expect(result.rows.map(row => [row.profileId, formatExact(row.covered.amount)])).toEqual([['second', '200'], ['raw', '0']]);
      expect(result.costs.exact).toEqual({ ingredient: decimal('100'), purchase: decimal('60'), covered: decimal('40') });
      // An alternative gets the original stock independently; no cross-variant depletion.
      expect(projected({ inputs, variant: { ...variant, id: 'alternative' } }).costs).toEqual(result.costs);
    }
  });
  it('records unknown or incompatible stock for each allocation without changing nutrition', () => {
    const baseline = projected(fixture());
    for (const [pantry, issue] of [
      [[{ productId: 'rice', quantity: { status: 'unknown' as const }, expiresSoon: false }], 'UNKNOWN_PANTRY_QUANTITY'],
      [stock('200', 'ml'), 'INCOMPATIBLE_PANTRY_UNIT'],
    ] as const) {
      const result = projected(fixture(pantry));
      expect(result.instances.flatMap(row => row.ingredients).map(row => [row.issue, formatExact(row.covered.amount), formatExact(row.purchase.amount)])).toEqual([[issue, '0', '200'], [issue, '0', '300']]);
      expect(result.familyNutrition).toEqual(baseline.familyNutrition);
      expect(result.pantryIssues).toHaveLength(1);
    }
  });
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
  it('spends the same product stock only once across distinct profiles', () => {
    const other = { ...food, profileId: 'second' };
    const data = fixture(stock('300'), [food, other]);
    const secondRecipe = { ...data.inputs.catalog.recipes[1], ingredients: [{ productId: 'rice', profileId: 'second', quantity: { amount: decimal('300'), unit: 'g' as const } }] };
    const inputs = createPlanInputs(data.inputs.appliedSettings, { ...data.inputs.catalog, recipes: [data.inputs.catalog.recipes[0], secondRecipe] }, { seed: 'test', now: () => new Date(2026, 9, 27), pantrySnapshot: stock('300') });
    const result = projected({ inputs, variant: { ...data.variant, instances: [data.variant.instances[0], { ...data.variant.instances[1], recipeSnapshot: secondRecipe }] } });
    expect(result.rows.map(row => formatExact(row.covered.amount))).toEqual(['200', '100']);
    expect(result.costs.exact.purchase).toEqual(decimal('40'));
  });
  it('uses evidenced product conversion to cover mass with volume stock', () => {
    const converted = { ...food, conversions: [{ productId: 'rice', profileId: 'raw', from: { amount: decimal('1'), unit: 'ml' as const }, to: { amount: decimal('2'), unit: 'g' as const }, evidence: source }] };
    const result = projected(fixture(stock('100', 'ml'), [converted]));
    expect(result.rows[0].covered.amount).toEqual(decimal('200'));
    expect(result.costs.exact.purchase).toEqual(decimal('60'));
    expect(result.pantryIssues).toEqual([]);
  });
  it('rejects forged snapshots, duplicate sources and nonpositive portions', () => {
    const data = fixture(); const first = data.variant.instances[0];
    for (const instance of [{ ...first, recipeSnapshot: { ...first.recipeSnapshot, baseServings: decimal('1') } }, { ...first, selectedServings: decimal('0') }, { ...first, date: '2027-01-01' }]) {
      expect(projection.projectPlan(data.inputs, { id: 'bad', instances: [instance] }).status).toBe('invalid');
    }
    expect(projection.projectPlan(data.inputs, { id: 'bad', instances: [first, first] }).status).toBe('invalid');
    expect(projection.projectPlan(data.inputs, { id: 99, instances: [first] } as unknown as PlanVariant).status).toBe('invalid');
    expect(projection.projectPlan(data.inputs, { id: 'bad', instances: [{ ...first, id: 99 }] } as unknown as PlanVariant).status).toBe('invalid');
  });
});
