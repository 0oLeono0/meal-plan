import { describe, expect, it } from 'vitest';
import { buildAppliedSettings } from './appliedSettings';
import type { PantrySnapshotRow } from './appliedSettings';
import type { Catalog, FoodProfile, Recipe, SafetyFact } from './catalog';
import { createPlanInputs, mealSlots } from './plan';
import type { GenerationResult, PlanInputs } from './plan';
import { projectPlan } from './planProjection';
import { add, compare, decimal, formatExact } from './quantities';
import { createDraft, dietaryRestrictions } from './settings';
import type { SettingsDraft } from './settings';
import { createPlanSearch, variantFingerprint } from './generatePlan';
import type { SearchOptions } from './generatePlan';
import { bundledCatalog, historicalCatalog, sourceApprovedCatalogs } from '../data/catalog';
import { recipeDiversityFor } from '../data/recipeDiversity';
import sourceOracle from '../../e2e/fixtures/catalog031-oracle.json';

// Synthetic arithmetic/safety oracles only. These are not production food claims.
const source = { sourceId: 'synthetic', recordId: 'fixture', release: 'v1', license: 'CC0-1.0', url: 'https://example.org/synthetic' };
const fact = (key: string, suitable = true, kind: SafetyFact['kind'] = 'restriction'): SafetyFact => ({ kind, key, suitable, evidence: [source] });
const safeFacts = [...dietaryRestrictions.map(({ id }) => fact(id)), fact('seafood', true, 'allergen'), fact('milk', true, 'allergen')];
function food(id: string, price = '1'): FoodProfile {
  return { productId: id, profileId: `${id}-raw`, name: id, identity: id, state: 'raw', category: 'Тест',
    nutrition: { status: 'known', reference: { amount: '100', unit: 'g', basis: 'edible' }, values: { calories: '100', protein: '10', fat: '5', carbohydrates: '15' }, source },
    price: { status: 'known', amount: price, currency: 'RUB', reference: { amount: '1', unit: 'g', basis: 'edible' }, source, region: 'Тест', observedAt: '2026-10-28', estimate: true },
    safety: { status: 'known', facts: safeFacts }, conversions: [] };
}
function recipe(id: string, productId = 'rice', grams = '100', slots: Recipe['slots'] = mealSlots): Recipe {
  return { id, name: id, baseServings: decimal('1'), ingredients: [{ productId, profileId: `${productId}-raw`, quantity: { amount: decimal(grams), unit: 'g' } }], slots, cookingMinutes: 15, steps: ['Тест'], source };
}
function fixture(change: Partial<SettingsDraft> = {}, catalog: Catalog = { version: 'test-v1', foods: [food('rice')], recipes: [recipe('r')] }, pantrySnapshot?: readonly PantrySnapshotRow[]): PlanInputs {
  const applied = buildAppliedSettings({ ...createDraft(), days: '1', people: '1', budget: '1000', ...change });
  if (applied.status !== 'applied') throw new Error('Bad fixture');
  return createPlanInputs(applied.settings, catalog, { seed: 'fixed-seed', now: () => new Date(2026, 9, 28), pantrySnapshot });
}
function run(inputs = fixture(), options: SearchOptions = {}) {
  const search = createPlanSearch(inputs, options); let next = search.next();
  let progress = { transitions: 0, evaluatedCandidates: 0 };
  while (!next.done) { progress = next.value; next = search.next(); }
  return { result: next.value, progress };
}
function success(result: GenerationResult) {
  expect(result.status).toBe('success');
  if (result.status !== 'success') throw new Error('Expected success');
  const projection = projectPlan(result.plan.inputs, result.plan.variants[0]);
  if (projection.status !== 'projected') throw new Error('Invalid result projection');
  expect(projection.projection.budget.check.accepted).toBe(true);
  return { plan: result.plan, projection: projection.projection, ids: result.plan.variants[0].instances.map(row => row.recipeId) };
}
function error(result: GenerationResult) { expect(result.status).toBe('error'); if (result.status !== 'error') throw new Error('Expected error'); return result.error; }
const stock = (amount: string, unit: 'g' | 'ml' = 'g'): readonly PantrySnapshotRow[] => [{ productId: 'rice', expiresSoon: true, quantity: { status: 'known', value: { amount: decimal(amount), unit } } }];

describe('pantry-leftovers', () => {
  const base = (id: string) => recipe(id, 'barley');
  const usingRice = recipe('rice-lunch', 'rice', '100', ['lunch']);
  const catalog: Catalog = { version: 'leftovers-priority', foods: [food('barley'), food('rice', '2')],
    recipes: [base('barley-a'), base('barley-b'), base('barley-c'), usingRice] };
  const mode = { mode: 'leftovers' } as const;
  const input = (data = catalog, changes: Partial<SettingsDraft> = {}, pantry = stock('200')) =>
    fixture({ days: '3', budget: '1200', ...changes }, data, pantry);

  it('uses an attainable early menu within two full evaluations, preserving the standard seeded path', () => {
    const inputs = input();
    const ordinary = run(inputs, { maxEvaluations: 2 });
    expect(run(inputs, { maxEvaluations: 2 })).toEqual(ordinary);
    expect(success(ordinary.result).ids.every(id => id.startsWith('barley-'))).toBe(true);

    const result = run(inputs, { ...mode, maxEvaluations: 2 });
    const { plan, projection } = success(result.result);
    // Each of the two 100 g rice lunches replaces a 100 ₽ barley meal and
    // needs no purchases from the 200 g stock. Days 1+2 and 2+3 both cost 1000 ₽.
    const variant = plan.variants[0];
    const oracle = (days: readonly string[]) => days.filter(day => inputs.dates.slice(0, 2).includes(day)).length * 100 / 200;
    const actual = variant.instances.filter(meal => meal.recipeId === usingRice.id).map(meal => meal.date);
    expect(actual).toHaveLength(2);
    expect(oracle(actual)).toBe(1);
    expect(oracle(inputs.dates.slice(1))).toBe(0.5);
    expect(projection.costs.exact).toMatchObject({ purchase: decimal('1000'), covered: decimal('400') });
    expect(result.progress.evaluatedCandidates).toBe(2);
  });

  it('keeps the cheap baseline with the minimum work budget', () => {
    const inputs = input({ ...catalog, foods: [food('barley', '0.8'), food('rice', '2')] });
    const result = run(inputs, { ...mode, maxEvaluations: 1, maxTransitions: catalog.recipes.length + 1 });
    expect(success(result.result).ids).toEqual(Array(12).fill('barley-a'));
    expect(result.progress).toEqual({ transitions: catalog.recipes.length + 1, evaluatedCandidates: 1 });
  });

  it('admits only eligible choices and exact affordable purchases even when the pantry favors them', () => {
    const rice = { ...catalog.foods[1], safety: { status: 'known' as const, facts: [fact('milk', false, 'allergen')] } };
    const incomplete = { ...catalog.foods[1], price: { status: 'unknown' as const, reason: 'Нет проверенной цены' } };
    const guard = { ...mode, maxEvaluations: 8 };
    function expectBarley(inputs: PlanInputs, options: SearchOptions = guard) {
      const { plan } = success(run(inputs, options).result);
      expect(plan.variants.every(variant => variant.instances.every(meal => meal.recipeId.startsWith('barley-')))).toBe(true);
    }
    const baseFoods = [food('barley', '0.8'), catalog.foods[1]];
    expectBarley(input({ ...catalog, foods: [baseFoods[0], rice] }), { ...guard, allergenKeys: ['milk'] });
    expectBarley(input({ ...catalog, foods: [baseFoods[0], incomplete] }));
    expectBarley(input({ ...catalog, foods: baseFoods }, { exclusionIds: ['rice'] }));
    expectBarley(input({ ...catalog, foods: baseFoods, recipes: [...catalog.recipes.slice(0, -1), { ...usingRice, cookingMinutes: 31 }] }, { cookingTime: '30' }));
    expectBarley(input({ ...catalog, foods: [baseFoods[0], food('rice', '100')] }, { budget: '1000' }, stock('98.7999')));
    expectBarley(input({ ...catalog, foods: [baseFoods[0], food('rice', '100')] }, {}, stock('200', 'ml')));
  });
});

it('uses confirmed edible stock consistently for budget bounds, expiry preference and exclusions', () => {
  const profileId = 'usda-171077-raw';
  const chicken = { ...food('chicken', '2'), profileId };
  const recipes = (grams: string) => {
    const entry = recipe('chicken', 'chicken', grams);
    return { ...entry, ingredients: entry.ingredients.map(ingredient => ({ ...ingredient, profileId })) };
  };
  const home = (productId: string, quantity: string): SettingsDraft['home'] => [{ productId, quantity, unit: 'g', expiresSoon: true }];
  const required = { version: 'confirmed-budget', foods: [chicken], recipes: [recipes('100')] };
  const refused = error(run(fixture({ budget: '500', home: home('chicken', '200') }, required)).result);
  expect(refused.code).toBe('BUDGET_TOO_LOW');
  expect(refused.budgetEvidence).toMatchObject({ kind: 'lower-bound', amount: decimal('800') });
  const funded = success(run(fixture({ budget: '500', home: home('pantry-chicken-fillet', '200') }, required)).result);
  expect(funded.projection.costs.exact).toEqual({ ingredient: decimal('800'), covered: decimal('400'), purchase: decimal('400') });

  const alternatives = { version: 'confirmed-expiry', foods: [chicken, food('rice')], recipes: [recipes('10'), recipe('rice', 'rice', '1')] };
  for (const input of [{ home: home('chicken', '10') }, { home: home('pantry-chicken-fillet', '10'), exclusionIds: ['chicken'] }]) {
    expect(success(run(fixture(input, alternatives)).result).ids).toEqual(Array(4).fill('rice'));
  }
  const prioritized = success(run(fixture({ home: home('pantry-chicken-fillet', '10') }, alternatives)).result);
  expect(prioritized.ids.filter(id => id === 'chicken')).toHaveLength(1);
});

describe('current82 independent weekly acceptance', () => {
  const seeds = ['11', '23', '37', '53', '71', '89', '107'];
  const groups = {
    poultry: ['chicken', 'turkey'], fish: ['pollock', 'cod'], meat: ['beef-mince', 'pork'],
    legume: ['lentil', 'chickpea-canned', 'bean-canned'], eggOrDairy: ['egg', 'milk', 'yogurt', 'cottage-cheese'],
  };
  function inputs(seed: string, variety: SettingsDraft['variety'], change: Partial<SettingsDraft> = {}) {
    return { ...fixture({ people: '2', days: '7', cookingTime: '30', budget: '6000', variety, ...change }, bundledCatalog), seed };
  }
  function metrics(variant: ReturnType<typeof success>['plan']['variants'][number]) {
    const ids = variant.instances.map(row => row.recipeId);
    return { ids: new Set(ids).size, families: new Set(ids.map(id => recipeDiversityFor(bundledCatalog.version)?.[id]?.family ?? id)).size,
      repeats: ids.filter((id, index) => index >= 4 && ids[index - 4] === id).length };
  }
  it('proves a full mixed 28-meal witness affordable by independent edible gram price arithmetic', () => {
    const ids = Array.from({ length: 7 }, () => ['familiar-omelet-tomato-bread', 'familiar-chicken-rice-carrot', 'familiar-lentil-cabbage-tomato', 'familiar-yogurt-apple']).flat();
    ids[5] = 'familiar-pollock-potato-carrot'; ids[9] = 'familiar-beef-pasta-tomato';
    let rubles = 0;
    const products = new Set<string>();
    for (const id of ids) {
      const recipe = bundledCatalog.recipes.find(row => row.id === id)!;
      expect(recipe.cookingMinutes).toBeLessThanOrEqual(30);
      for (const ingredient of recipe.ingredients) {
        products.add(ingredient.productId);
        const price = bundledCatalog.foods.find(row => row.profileId === ingredient.profileId)!.price;
        if (price.status !== 'known') throw new Error('Witness needs an explicit price');
        expect(ingredient.quantity.unit).toBe('g'); expect(['g', 'kg']).toContain(price.reference.unit);
        rubles += Number(ingredient.quantity.amount.numerator) / Number(ingredient.quantity.amount.denominator)
          * 2 / (Number(recipe.baseServings.numerator) / Number(recipe.baseServings.denominator)) * Number(price.amount)
          / (Number(price.reference.amount) * (price.reference.unit === 'kg' ? 1000 : 1));
      }
    }
    for (const members of Object.values(groups)) expect(members.some(id => products.has(id))).toBe(true);
    expect(rubles).toBeCloseTo(Number(sourceOracle.weeklyWitness.ingredientRub), 8);
    expect(rubles).toBeLessThan(6000);
    console.info('current82 independent witness RUB', rubles);
  });
  it.each(seeds)('returns reproducible medium/max full mixed weeks for independent seed %s', seed => {
    const byVariety = (['medium', 'max'] as const).map(variety => {
      const input = { ...inputs(seed, variety), seed };
      const started = performance.now(); const output = run(input); const selected = success(output.result);
      if (seed === '11') expect(run(input).result).toEqual(output.result);
      expect(output.progress.evaluatedCandidates).toBeLessThanOrEqual(512);
      expect(output.progress.transitions).toBeLessThanOrEqual(200000);
      for (const variant of selected.plan.variants) {
        const products = new Set(variant.instances.flatMap(row => row.recipeSnapshot.ingredients.map(ingredient => ingredient.productId)));
        for (const [group, members] of Object.entries(groups)) expect(members.some(id => products.has(id)), `${seed}/${variety}/${variant.id}/${group}`).toBe(true);
        expect(new Set(variant.instances.map(row => row.recipeId).filter(id => id.startsWith('familiar-'))).size).toBeGreaterThanOrEqual(5);
        for (const instance of variant.instances) {
          expect(instance.recipeSnapshot).toEqual(bundledCatalog.recipes.find(row => row.id === instance.recipeId));
          expect(instance.recipeSnapshot.cookingMinutes).toBeLessThanOrEqual(30);
        }
        const projected = projectPlan(input, variant);
        if (projected.status !== 'projected') throw new Error('Invalid weekly projection');
        expect(compare(projected.projection.costs.exact.purchase, decimal('6000'))).toBeLessThanOrEqual(0);
        expect(add(projected.projection.costs.exact.purchase, projected.projection.costs.exact.covered)).toEqual(projected.projection.costs.exact.ingredient);
      }
      console.info('current82 weekly', seed, variety, Math.round(performance.now() - started), output.progress, metrics(selected.plan.variants[0]));
      return metrics(selected.plan.variants[0]);
    });
    expect(byVariety[1].families).toBeGreaterThanOrEqual(byVariety[0].families);
    expect(byVariety[1].ids).toBeGreaterThanOrEqual(byVariety[0].ids);
  }, 60_000);
  it.each([
    { name: 'vegetarian30', change: { restrictions: ['vegetarian'] }, absent: ['chicken', 'turkey', 'pollock', 'cod', 'beef-mince', 'pork'] },
    { name: 'plant-only30', change: { exclusionIds: ['chicken', 'turkey', 'pollock', 'cod', 'beef-mince', 'pork', 'egg', 'milk', 'yogurt', 'cottage-cheese'] }, absent: ['chicken', 'turkey', 'pollock', 'cod', 'beef-mince', 'pork', 'egg', 'milk', 'yogurt', 'cottage-cheese'] },
    { name: 'no-fish30', change: { restrictions: ['no-fish'] }, absent: ['pollock', 'cod'] },
    { name: 'excluded-poultry30', change: { exclusionIds: ['chicken', 'turkey'] }, absent: ['chicken', 'turkey'] },
  ])('keeps every current variant hard-admitted for $name', ({ change, absent }) => {
    const input = inputs('constraints-23', 'max', change);
    const { plan } = success(run(input, { maxEvaluations: 32 }).result);
    expect(plan.variants).toHaveLength(3);
    const fishRecipes = new Set(bundledCatalog.recipes.filter(recipe => recipe.ingredients.some(row => ['pollock', 'cod'].includes(row.productId))).map(row => row.id));
    expect(fishRecipes).toEqual(new Set(['familiar-pollock-potato-carrot', 'familiar-cod-rice-soup', 'familiar-pollock-yogurt-buckwheat']));
    for (const variant of plan.variants) {
      for (const instance of variant.instances) {
        expect(instance.recipeSnapshot.cookingMinutes).toBeLessThanOrEqual(input.appliedSettings.cookingMinutes!);
        expect(instance.recipeSnapshot.ingredients.some(row => absent.includes(row.productId))).toBe(false);
        if (input.appliedSettings.restrictions.includes('no-fish')) expect(fishRecipes.has(instance.recipeId)).toBe(false);
      }
      const result = projectPlan(input, variant);
      if (result.status !== 'projected') throw new Error('Invalid constrained projection');
      expect(compare(result.projection.costs.exact.purchase, decimal('6000'))).toBeLessThanOrEqual(0);
    }
  });
  it('explains an independently empty 15-minute slot without silently raising the time cap', () => {
    const input = inputs('fast-15', 'max', { cookingTime: '15' });
    expect(mealSlots.some(slot => !bundledCatalog.recipes.some(recipe => recipe.cookingMinutes <= 15 && recipe.slots.includes(slot)))).toBe(true);
    expect(error(run(input).result).code).toBe('NO_RECIPES');
  });
  it('keeps unknown package allergen facts separate from no-fish identity evidence', () => {
    const input = inputs('allergy-37', 'max', { restrictions: ['no-fish'] });
    expect(error(run(input, { allergenKeys: ['seafood'] }).result).code).toBe('GENERATION_DATA_INCOMPLETE');
  });
  it('resists many cheap same-ingredient decoys without losing admitted main groups', () => {
    const groupIds = ['familiar-omelet-tomato-bread', 'familiar-chicken-rice-carrot', 'familiar-lentil-cabbage-tomato', 'familiar-yogurt-apple', 'familiar-pollock-potato-carrot', 'familiar-beef-pasta-tomato'];
    const corpus: Catalog = { version: bundledCatalog.version, foods: [food('rice')], recipes: [
      ...Array.from({ length: 80 }, (_, i) => recipe(`cheap-rice-decoy-${i}`, 'rice', '1')),
      ...groupIds.map(id => recipe(id, 'rice', '2')),
    ] };
    const { plan } = success(run(fixture({ days: '7', variety: 'max', budget: '1000' }, corpus), { maxEvaluations: 32 }).result);
    for (const variant of plan.variants) for (const id of groupIds.filter(id => id !== 'familiar-yogurt-apple')) {
      expect(variant.instances.some(row => row.recipeId === id)).toBe(true);
    }
  });
});

describe('source-backed mixed starts', () => {
  function currentInputs(change: Partial<SettingsDraft> = {}, seed = 'mixed-source-11', catalog: Catalog = bundledCatalog) {
    const applied = buildAppliedSettings({ ...createDraft(), days: '1', budget: '2000', ...change });
    if (applied.status !== 'applied') throw new Error('Invalid current settings');
    return createPlanInputs(applied.settings, catalog, { seed, now: () => new Date(2026, 10, 12) });
  }
  it('retains the issued56 exact egg poultry legume dairy one-day output', () => {
    const release1 = sourceApprovedCatalogs.find(catalog => catalog.version === 'mealplan-2026-11-11-1')!;
    const inputs = currentInputs({}, 'mixed-source-11', release1);
    const { plan, projection, ids } = success(run(inputs).result);
    expect(ids).toEqual(sourceOracle.recipeIds);
    expect(Object.values(projection.averagePersonDayNutrition).map(formatExact)).toEqual(['1421.72', '86.767', '40.709', '180.033']);
    expect(formatExact(projection.costs.exact.purchase)).toBe('701.2863724691357984');
    expect(run(inputs).result).toEqual({ status: 'success', plan });
  }, 30_000);
  it.each(['same', 'medium', 'max'] as const)('keeps affordable mixed defaults and deterministic bounded starts at variety %s', variety => {
    const inputs = currentInputs({ days: '7', budget: '3000', variety });
    const first = run(inputs), selected = success(first.result);
    const familiar = new Set(selected.ids.filter(id => id.startsWith('familiar-')));
    expect(familiar.size).toBeGreaterThanOrEqual(2);
    const diversity = recipeDiversityFor(inputs.catalogVersion)!;
    expect(new Set([...familiar].flatMap(id => diversity[id]?.groups ?? [])).size).toBeGreaterThanOrEqual(2);
    expect(first.progress.evaluatedCandidates).toBeLessThanOrEqual(512);
    expect(first.progress.transitions).toBeLessThanOrEqual(200000);
    expect(run(inputs).result).toEqual(first.result);
  }, 30_000);
  it('retains hard exclusions and final budget while using only available groups', () => {
    const inputs = currentInputs({ restrictions: ['vegetarian'], exclusionIds: ['egg'], budget: '500' });
    const selected = success(run(inputs).result);
    for (const variant of selected.plan.variants) {
      expect(variant.instances.every(instance => instance.recipeSnapshot.ingredients.every(row => !['egg', 'chicken'].includes(row.productId)))).toBe(true);
      const projection = projectPlan(inputs, variant);
      if (projection.status !== 'projected') throw new Error('Invalid projection');
      expect(projection.projection.budget.check.accepted).toBe(true);
    }
  });
  it.each(['gluten-free', 'lactose-free', 'halal'])('keeps unknown %s unsuitable for all new starts', restriction => {
    expect(error(run(currentInputs({ restrictions: [restriction] })).result).code).toBe('GENERATION_DATA_INCOMPLETE');
  });
  it('keeps the historical seven-day exact deterministic output', () => {
    const applied = buildAppliedSettings(createDraft());
    if (applied.status !== 'applied') throw new Error('Invalid historical settings');
    const inputs = createPlanInputs(applied.settings, historicalCatalog, { seed: 'real-default-proof', now: () => new Date(2026, 9, 28) });
    const result = success(run(inputs).result);
    expect(formatExact(result.projection.costs.exact.purchase)).toBe('461.9293627901234552');
    expect(formatExact(result.projection.averagePersonDayNutrition.calories)).toBe('706773/700');
    expect(result.plan.variants.map(variantFingerprint)).toEqual(sourceOracle.historicalSearchBaseline.fingerprints);
  }, 30_000);
});

describe('semantic alternative search', () => {
  const catalog = (count: number): Catalog => ({ version: 'finite', foods: [food('rice')], recipes: [
    ...Array.from({ length: count }, (_, index) => recipe(`choice-${index}`, 'rice', '100', ['breakfast'])),
    recipe('fixed', 'rice', '100', ['lunch', 'dinner', 'snack']),
  ] });
  const assignments = (plan: ReturnType<typeof success>['plan']) => plan.variants.map(variant => variant.instances.map(row => row.recipeId).join('/')).sort();
  // Intersection keeps the RED test executable before the optional public fields exist.
  const options = (targetCount: number, excludedFingerprints: readonly string[] = []): SearchOptions & { targetCount: number; excludedFingerprints: readonly string[] } => ({ targetCount, excludedFingerprints });
  it.each([1, 2, 3])('returns the exact independent finite set of %i feasible assignments', count => {
    const { plan } = success(run(fixture({}, catalog(count))).result);
    expect(assignments(plan)).toEqual(Array.from({ length: count }, (_, i) => `choice-${i}/fixed/fixed/fixed`));
    for (const variant of plan.variants) {
      const result = projectPlan(plan.inputs, variant);
      expect(result.status).toBe('projected');
      if (result.status === 'projected') expect(result.projection.costs.exact.purchase).toEqual({ numerator: 400n, denominator: 1n });
    }
    expect(new Set(plan.variants.flatMap(row => row.instances.map(instance => instance.id))).size).toBe(count * 4);
  });
  it('has no fake alternative for an empty admissible slot', () => {
    expect(error(run(fixture({}, catalog(0))).result).code).toBe('NO_RECIPES');
  });
  it('honors targetCount and excludes outputs without skipping their search evaluation', () => {
    const inputs = fixture({}, catalog(3)), all = success(run(inputs).result).plan;
    const first = success(run(inputs, options(1)).result).plan;
    expect(first.variants).toHaveLength(1);
    expect(first.variants[0]).toEqual(all.variants[0]);
    const excluded = [variantFingerprint(all.variants[0])];
    const next = run(inputs, options(3, excluded));
    const selected = success(next.result).plan;
    expect(assignments(selected)).toEqual(assignments({ ...all, variants: all.variants.slice(1) }));
    expect(next.progress.evaluatedCandidates).toBe(3);
    expect(run(inputs, options(3, excluded))).toEqual(next);
    expect(error(run(inputs, options(3, all.variants.map(variantFingerprint))).result).code).toBe('SEARCH_EXHAUSTED');
    expect(inputs.catalog.recipes).toHaveLength(4);
  });
  it.each([0, 4, 1.5, NaN])('rejects invalid target count %s', target => {
    const refusal = error(run(fixture({}, catalog(3)), options(target)).result);
    expect(refusal.code).toBe('GENERATION_DATA_INCOMPLETE');
    expect(refusal.diagnostics.some(row => row.code === 'INVALID_SEARCH_OPTIONS')).toBe(true);
  });
  it.each([
    { name: 'thirteen fingerprints', values: Array.from({ length: 13 }, (_, i) => String(i)) },
    { name: 'empty fingerprint', values: [''] },
    { name: 'oversized fingerprint', values: ['x'.repeat(32769)] },
  ])('bounds exclusions: $name', ({ values: excluded }) => {
    expect(error(run(fixture({}, catalog(3)), options(3, excluded)).result).code).toBe('GENERATION_DATA_INCOMPLETE');
  });
  it('uses normalized servings and canonical date-slot assignments, never opaque IDs or order', () => {
    const { plan } = success(run(fixture({}, catalog(1))).result), variant = plan.variants[0];
    const equivalent = { id: 'renamed', instances: [...variant.instances].reverse().map(row => ({ ...row, id: `new/${row.id}`, selectedServings: { numerator: 2n, denominator: 2n } })) };
    expect(variantFingerprint(equivalent)).toBe(variantFingerprint(variant));
    expect(JSON.parse(variantFingerprint(variant))).toEqual([
      ['2026-10-28', 'breakfast', 'choice-0', '1', '1'], ['2026-10-28', 'lunch', 'fixed', '1', '1'],
      ['2026-10-28', 'dinner', 'fixed', '1', '1'], ['2026-10-28', 'snack', 'fixed', '1', '1'],
    ]);
    for (const changed of [{ ...variant.instances[0], recipeId: 'different' }, { ...variant.instances[0], selectedServings: decimal('1.5') }]) {
      expect(variantFingerprint({ ...variant, instances: [changed, ...variant.instances.slice(1)] })).not.toBe(variantFingerprint(variant));
    }
  });
  it('accepts exact budget equality and rejects the next fractional alternative independently', () => {
    const finite = { ...catalog(0), recipes: [recipe('equal', 'rice', '200', ['breakfast']), recipe('above', 'rice', '200.0001', ['breakfast']), recipe('fixed', 'rice', '100', ['lunch', 'dinner', 'snack'])] };
    const { plan, projection } = success(run(fixture({ budget: '500' }, finite)).result);
    expect(assignments(plan)).toEqual(['equal/fixed/fixed/fixed']);
    expect(projection.costs.exact.purchase).toEqual({ numerator: 500n, denominator: 1n });
    const aboveOnly = { ...finite, recipes: finite.recipes.filter(row => row.id !== 'equal') };
    const refusal = error(run(fixture({ budget: '500' }, aboveOnly)).result);
    expect(refusal.code).toBe('BUDGET_TOO_LOW');
    expect(refusal.budgetEvidence?.amount).toEqual({ numerator: 5000001n, denominator: 10000n });
  });
  it('returns tied alternatives deterministically independent of recipe and food input order', () => {
    const finite = catalog(3), inputs = fixture({}, finite);
    expect(success(run(inputs).result).plan.variants).toEqual(success(run(fixture({}, { ...finite, recipes: [...finite.recipes].reverse() })).result).plan.variants);
  });
});

describe('bounded deterministic generation', () => {
  it('evaluates a complete period with independently expected amounts and totals', () => {
    const { plan, projection } = success(run().result);
    expect(plan.variants[0].instances).toHaveLength(4);
    expect(projection.rows[0].required.amount).toEqual(decimal('400'));
    expect(projection.costs.exact.purchase).toEqual(decimal('400'));
    expect(projection.familyNutrition.calories).toEqual(decimal('400'));
    expect(Object.isFrozen(plan)).toBe(true);
  });
  it.each([1, 2, 3, 4, 5, 6, 7])('keeps four independent slots for %i days and scales base1 to people2 once', days => {
    const inputs = fixture({ days: String(days), people: '2', budget: '10000' });
    const a = success(run(inputs).result), b = success(run(inputs).result);
    expect(a.plan).toEqual(b.plan);
    expect(a.plan.variants[0].instances).toHaveLength(days * 4);
    expect(new Set(a.plan.variants[0].instances.map(row => row.id)).size).toBe(days * 4);
    expect(a.projection.rows[0].required.amount).toEqual(decimal(String(days * 800)));
  });
  it.each(dietaryRestrictions.map(row => row.id))('admits only evidenced %s, with unknown separated from incompatibility', restriction => {
    for (const suitable of [false, undefined]) {
      const unsafe = { ...food('bad'), safety: suitable === undefined ? { status: 'unknown' as const, reason: 'not checked' } : { status: 'known' as const, facts: [fact(restriction, false)] } };
      const catalog = { version: 'safety', foods: [food('rice'), unsafe], recipes: [recipe('safe'), recipe('unsafe', 'bad')] };
      expect(success(run(fixture({ restrictions: [restriction] }, catalog)).result).ids).toEqual(Array(4).fill('safe'));
      const onlyBad = { ...catalog, recipes: [recipe('unsafe', 'bad')] };
      const refusal = error(run(fixture({ restrictions: [restriction] }, onlyBad)).result);
      expect(refusal.code).toBe(suitable === false ? 'NO_RECIPES' : 'GENERATION_DATA_INCOMPLETE');
      expect(refusal.diagnostics.some(row => row.code === 'SLOT_CANDIDATES')).toBe(true);
    }
  });
  it.each(['fish', 'shrimp', 'squid', 'mussels'])('no-fish rejects evidenced %s ingredients regardless of a misleading name', productId => {
    // This reviewed restriction covers fish and all seafood, separately from allergies.
    const unsafe = { ...food(productId), name: 'Без рыбы', safety: { status: 'known' as const, facts: [fact('no-fish', false)] } };
    expect(error(run(fixture({ restrictions: ['no-fish'] }, { version: productId, foods: [unsafe], recipes: [recipe(productId, productId)] })).result).code).toBe('NO_RECIPES');
  });
  it.each([false, undefined])('keeps explicit seafood allergy hard when suitability is %s', suitable => {
    const facts = [fact('no-fish'), ...(suitable === undefined ? [] : [fact('seafood', suitable, 'allergen')])];
    const rice = { ...food('rice'), safety: { status: 'known' as const, facts } };
    const inputs = fixture({ restrictions: ['no-fish'] }, { version: 'explicit-allergy', foods: [rice], recipes: [recipe('r')] });
    expect(success(run(inputs).result).ids).toEqual(Array(4).fill('r'));
    expect(error(run(inputs, { allergenKeys: ['seafood'] }).result).code).toBe(suitable === false ? 'NO_RECIPES' : 'GENERATION_DATA_INCOMPLETE');
  });
  it('accepts an explicitly evidenced seafood allergy when requested', () => {
    expect(success(run(fixture({ restrictions: ['no-fish'] }), { allergenKeys: ['seafood'] }).result).ids).toEqual(Array(4).fill('r'));
  });
  it('enforces explicit product exclusions before unknown metadata and allergens', () => {
    expect(error(run(fixture({ exclusionIds: ['rice'] })).result).code).toBe('NO_RECIPES');
    const bad = { ...food('rice'), safety: { status: 'known' as const, facts: [fact('milk', false, 'allergen')] } };
    expect(error(run(fixture({}, { version: 'allergy', foods: [bad], recipes: [recipe('r')] }), { allergenKeys: ['milk'] }).result).code).toBe('NO_RECIPES');
    expect(error(run(fixture(), { allergenKeys: ['unknown-allergen'] }).result).code).toBe('GENERATION_DATA_INCOMPLETE');
  });
  it.each(['15', '30', '60'] as const)('treats %s minutes as a hard per-recipe cap including boundary', cookingTime => {
    const catalog = { version: 'time', foods: [food('rice')], recipes: [{ ...recipe('boundary'), cookingMinutes: Number(cookingTime) }, { ...recipe('slow'), cookingMinutes: Number(cookingTime) + 1 }] };
    expect(success(run(fixture({ cookingTime }, catalog)).result).ids).toEqual(Array(4).fill('boundary'));
    expect(error(run(fixture({ cookingTime }, { ...catalog, recipes: [catalog.recipes[1]] })).result).code).toBe('NO_RECIPES');
    expect(success(run(fixture({ cookingTime: 'any' }, { ...catalog, recipes: [catalog.recipes[1]] })).result).ids).toEqual(Array(4).fill('slow'));
  });
  it('spends stock once over the period and cannot discount unknown/incompatible quantities', () => {
    const catalog = { version: 'cost', foods: [food('rice', '2')], recipes: [recipe('r')] };
    const result = success(run(fixture({ budget: '500' }, catalog, stock('200'))).result);
    expect(result.projection.costs.exact).toEqual({ ingredient: decimal('800'), covered: decimal('400'), purchase: decimal('400') });
    for (const pantry of [stock('200', 'ml'), [{ productId: 'rice', expiresSoon: true, quantity: { status: 'unknown' as const } }]]) {
      expect(error(run(fixture({ budget: '500' }, catalog, pantry)).result).code).toBe('BUDGET_TOO_LOW');
    }
  });
  it('uses no target score when absent, a zero-safe relative deviation when present, before variety/cost', () => {
    const catalog = { version: 'target', foods: [food('rice')], recipes: [recipe('small', 'rice', '10'), recipe('large', 'rice', '100')] };
    expect(success(run(fixture({}, catalog)).result).ids).toEqual(Array(4).fill('small'));
    expect(success(run(fixture({ manualNutrition: { calories: '400', protein: '40', fat: '20', carbohydrates: '60' } }, catalog)).result).ids).toEqual(Array(4).fill('large'));
    expect(success(run(fixture({ manualNutrition: { calories: '1', protein: '0', fat: '0', carbohydrates: '0' } }, catalog)).result).ids).toEqual(Array(4).fill('small'));
  });
  it('prioritizes real first-two-day expiring usage, caps known stock preference, ignores incompatible stock', () => {
    const catalog = { version: 'expires', foods: [food('rice'), food('apple')], recipes: [recipe('rice', 'rice', '10'), recipe('apple', 'apple', '1')] };
    const result = success(run(fixture({}, catalog, stock('10'))).result);
    expect(result.ids.filter(id => id === 'rice')).toHaveLength(1);
    expect(result.projection.rows.find(row => row.productId === 'rice')?.covered.amount).toEqual(decimal('10'));
    expect(success(run(fixture({}, catalog, stock('10', 'ml'))).result).ids).toEqual(Array(4).fill('apple'));
  });
  it('same prefers fewer IDs, medium avoids same-slot adjacent repeats, max prefers distinct IDs', () => {
    const catalog = { version: 'variety', foods: [food('rice')], recipes: [recipe('a'), recipe('b')] };
    const same = success(run(fixture({ variety: 'same', days: '2' }, catalog)).result).ids;
    expect(new Set(same).size).toBe(1);
    const medium = success(run(fixture({ variety: 'medium', days: '2' }, catalog)).result).ids;
    expect(medium.slice(0, 4).every((id, index) => medium[index + 4] !== id)).toBe(true);
    expect(new Set(success(run(fixture({ variety: 'max' }, catalog)).result).ids).size).toBe(2);
  });
  it('does not label bounded exhaustion as impossibility or invent a minimum', () => {
    const catalog = { version: 'bounded', foods: [food('rice', '6'), food('apple', '3')], recipes: [recipe('a'), recipe('b', 'apple', '120')] };
    const { result, progress } = run(fixture({ budget: '500' }, catalog, stock('200')), { maxEvaluations: 1, maxTransitions: 50 });
    expect(error(result).code).toBe('SEARCH_EXHAUSTED');
    expect(error(result).budgetEvidence?.kind).not.toBe('exhaustive-minimum');
    expect(progress.evaluatedCandidates).toBeLessThanOrEqual(1);
    expect(progress.transitions).toBeLessThanOrEqual(50);
  });
  it('reports a labelled lower bound only when it proves insufficient budget', () => {
    const catalog = { version: 'bound', foods: [food('rice', '2')], recipes: [recipe('a'), recipe('b', 'rice', '101')] };
    const refusal = error(run(fixture({ budget: '500' }, catalog), { maxEvaluations: 1 }).result);
    expect(refusal.code).toBe('BUDGET_TOO_LOW');
    expect(refusal.budgetEvidence?.kind).toBe('lower-bound');
    expect(refusal.budgetEvidence?.amount).toEqual(decimal('800'));
    expect(refusal.budgetEvidence?.proof.complete).toBe(false);
  });
  it('matches an independent tiny exhaustive quantity/pantry/budget oracle, including attained minimum', () => {
    // Independent integer oracle: four slots choose A(100g rice, RUB200) or B(120g apple, RUB120).
    // Stock rice200g (RUB400) means minimum purchase240 via two A and two B.
    const catalog = { version: 'oracle', foods: [food('rice', '2'), food('apple', '1')], recipes: [recipe('a'), recipe('b', 'apple', '120')] };
    const combinations = Array.from({ length: 16 }, (_, mask) => {
      const ids = Array.from({ length: 4 }, (_, slot) => mask & (1 << slot) ? 'b' : 'a');
      const a = ids.filter(id => id === 'a').length;
      return { ids, purchase: Math.max(0, a * 100 - 200) * 2 + (4 - a) * 120 };
    });
    expect(Math.min(...combinations.map(row => row.purchase))).toBe(240);
    const inputs = fixture({ budget: '500', variety: 'max' }, catalog, stock('200'));
    const selected = success(run(inputs).result);
    const independentlyFeasible = combinations.filter(row => row.purchase <= 500);
    expect(independentlyFeasible.map(row => row.ids.join('/'))).toContain(selected.ids.join('/'));
    expect(formatExact(selected.projection.costs.exact.purchase)).toBe(String(combinations.find(row => row.ids.join('/') === selected.ids.join('/'))!.purchase));
    // Budget cannot be below500 in applied settings; scale prices3x: min720, loose bound240.
    const expensive = { ...catalog, foods: [food('rice', '6'), food('apple', '3')] };
    const refusal = error(run(fixture({ budget: '500' }, expensive, stock('200'))).result);
    expect(refusal.code).toBe('BUDGET_TOO_LOW');
    expect(refusal.budgetEvidence?.kind).toBe('exhaustive-minimum');
    expect(refusal.budgetEvidence?.amount).toEqual(decimal('720'));
    expect(refusal.budgetEvidence?.proof.evaluatedCandidates).toBe(16);
    expect(refusal.budgetEvidence?.proof.complete).toBe(true);
  });
  it('preserves incomplete alternatives as data failure rather than a budget proof', () => {
    const catalog = { version: 'missing', foods: [food('rice', '2'), { ...food('apple'), price: { status: 'unknown' as const, reason: 'no estimate' } }], recipes: [recipe('a'), recipe('b', 'apple')] };
    expect(error(run(fixture({ budget: '500' }, catalog)).result).code).toBe('GENERATION_DATA_INCOMPLETE');
  });
  it('accepts exactly the shared ledger budget gate, not just unrounded price', () => {
    const catalog = { version: 'rounding', foods: [food('rice', '1.250025')], recipes: [recipe('r')] };
    expect(error(run(fixture({ budget: '500' }, catalog)).result).code).toBe('BUDGET_TOO_LOW');
  });
  it('values stock through the canonical nutrition basis when two separate conversions are evidenced', () => {
    const base = food('rice');
    const converted = { ...base, price: { ...base.price, status: 'known' as const, amount: '1000', currency: 'RUB' as const,
      reference: { amount: '1', unit: 'pcs' as const, basis: 'edible' as const }, source, region: 'Test', observedAt: '2026-10-28', estimate: true as const },
      conversions: [
        { productId: 'rice', profileId: 'rice-raw', from: { amount: decimal('100'), unit: 'ml' as const }, to: { amount: decimal('100'), unit: 'g' as const }, evidence: source },
        { productId: 'rice', profileId: 'rice-raw', from: { amount: decimal('100'), unit: 'g' as const }, to: { amount: decimal('1'), unit: 'pcs' as const }, evidence: source },
      ] };
    const inputs = fixture({ budget: '500' }, { version: 'cross-basis', foods: [converted], recipes: [recipe('r')] }, stock('400', 'ml'));
    const result = success(run(inputs).result);
    expect(result.projection.costs.exact.purchase).toEqual(decimal('0'));
    expect(result.projection.costs.exact.covered).toEqual(decimal('4000'));
  });
  it('is independent of catalog array ordering for instances and projected amounts', () => {
    const catalog = { version: 'ordering', foods: [food('rice'), food('apple')], recipes: [recipe('a'), recipe('b', 'apple')] };
    const a = success(run(fixture({}, catalog)).result), b = success(run(fixture({}, { ...catalog, recipes: [...catalog.recipes].reverse(), foods: [...catalog.foods].reverse() })).result);
    expect(a.plan.variants).toEqual(b.plan.variants);
    expect(a.projection.costs).toEqual(b.projection.costs);
  });
  it('returns typed incomplete data for corrupt input, never a thrown solver crash', () => {
    expect(error(run({ ...fixture(), catalogVersion: 'wrong' }).result).code).toBe('GENERATION_DATA_INCOMPLETE');
  });
});
