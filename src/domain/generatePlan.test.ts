import { describe, expect, it } from 'vitest';
import { buildAppliedSettings } from './appliedSettings';
import type { PantrySnapshotRow } from './appliedSettings';
import type { Catalog, FoodProfile, Recipe, SafetyFact } from './catalog';
import { createPlanInputs, mealSlots } from './plan';
import type { GenerationResult, PlanInputs } from './plan';
import { projectPlan } from './planProjection';
import { decimal, formatExact } from './quantities';
import { createDraft, dietaryRestrictions } from './settings';
import type { SettingsDraft } from './settings';
import { createPlanSearch } from './generatePlan';
import type { SearchOptions } from './generatePlan';

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
  it('no-fish also requires explicit seafood safety, never a generic food name', () => {
    const shrimp = { ...food('shrimp'), name: 'Без рыбы', safety: { status: 'known' as const, facts: [fact('no-fish'), fact('seafood', false, 'allergen')] } };
    expect(error(run(fixture({ restrictions: ['no-fish'] }, { version: 'shrimp', foods: [shrimp], recipes: [recipe('shrimp', 'shrimp')] })).result).code).toBe('NO_RECIPES');
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
