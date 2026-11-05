import { describe, expect, it } from 'vitest';
import { buildAppliedSettings } from './appliedSettings';
import type { ActiveBundle } from '../adapters/activePlan';
import { validateActiveBundle } from '../adapters/activePlan';
import legacyRaw from '../test/fixtures/phase02-active-plan-v1.json?raw';
import type { Catalog, FoodProfile, Recipe } from './catalog';
import { createPlanInputs } from './plan';
import { projectPlan } from './planProjection';
import { decimal, rational, roundHalfUp } from './quantities';
import { formatNutrition } from './presentation';
import { createDraft } from './settings';
import { projectRecipeView, resolveRecipeContext } from './recipeView';
import type { RecipeRequest } from './recipeView';

// Synthetic independent fixtures only: never production facts or a trusted-registry bypass.
const source = { sourceId: 'synthetic', recordId: 'oracle', release: 'v1', license: 'test-only', url: 'https://example.org/oracle' };
const rice: FoodProfile = { productId: 'rice', profileId: 'raw', name: 'Рис', identity: 'test rice', state: 'raw', category: 'Крупы', conversions: [],
  nutrition: { status: 'known', reference: { amount: '100', unit: 'g', basis: 'edible' }, values: { calories: '123.5', protein: '7.25', fat: '0', carbohydrates: '11.5' }, source },
  price: { status: 'known', amount: '200', currency: 'RUB', reference: { amount: '1', unit: 'kg', basis: 'edible' }, source, region: 'Тест', observedAt: '2026-10-01', estimate: true }, safety: { status: 'unknown', reason: 'Test only' } };
const makeRecipe = (id: string, amount: string): Recipe => ({ id, name: id, baseServings: decimal('2'), ingredients: [{ productId: 'rice', profileId: 'raw', quantity: { amount: decimal(amount), unit: 'g' } }], slots: ['breakfast', 'lunch'], cookingMinutes: 10, steps: ['Полный единственный шаг'], source });
function fixture() {
  const draft = createDraft(); draft.days = '1'; draft.people = '3';
  const applied = buildAppliedSettings(draft);
  if (applied.status !== 'applied') throw new Error('Settings fixture');
  const catalog: Catalog = { version: 'synthetic-v1', foods: [rice], recipes: [makeRecipe('r200', '200'), makeRecipe('r300', '300')] };
  const inputs = createPlanInputs(applied.settings, catalog, { seed: 'oracle', now: () => new Date(2026, 9, 27), pantrySnapshot: [{ productId: 'rice', quantity: { status: 'known', value: { amount: decimal('200'), unit: 'g' } }, expiresSoon: false }] });
  const instances = catalog.recipes.map((recipe, index) => ({ id: `i${index}`, date: inputs.dates[0], slot: index === 0 ? 'breakfast' as const : 'lunch' as const, recipeId: recipe.id, recipeSnapshot: recipe, catalogVersion: catalog.version, selectedServings: decimal('3') }));
  const variant = { id: 'v1', instances };
  const projected = projectPlan(inputs, variant);
  if (projected.status !== 'projected') throw new Error('Projection fixture');
  const active: ActiveBundle = { plan: { schemaVersion: 1, inputs, variants: [variant], activeVariantId: variant.id }, projections: [projected.projection] };
  const request: RecipeRequest = { pathname: '/recipe/r200', search: '?variant=v1&instance=i0', active, loadStatus: 'loaded', catalog: { status: 'loaded', catalog } };
  return { request, active, catalog };
}
function viewed(request = fixture().request) {
  const result = projectRecipeView(request);
  expect(['context', 'direct']).toContain(result.status);
  if (!('recipe' in result)) throw new Error(`Not a recipe: ${result.status}`);
  return result;
}

describe('recipe basis and shared ledger', () => {
  it('keeps validated bundle detached from caller mutations and rejects mutation of derived allocations', () => {
    const caller = JSON.parse(legacyRaw).plan;
    const step = caller.variants[0].instances[0].recipeSnapshot.steps[0];
    const checked = validateActiveBundle(caller);
    expect(checked.status).toBe('valid');
    if (checked.status !== 'valid') throw new Error('Legacy validation');
    caller.variants[0].instances[0].recipeSnapshot.steps[0] = 'forged after validation';
    caller.inputs.catalog.foods[0].name = 'forged external alias';
    expect(checked.bundle.plan.variants[0].instances[0].recipeSnapshot.steps[0]).toBe(step);
    expect(checked.bundle.plan.inputs.catalog.foods[0].name).not.toBe('forged external alias');
    const allocation = checked.bundle.projections[0].instances[0].ingredients[0];
    const before = allocation.covered.amount;
    expect(Reflect.set(allocation.covered, 'amount', decimal('999999'))).toBe(false);
    expect(allocation.covered.amount).toEqual(before);
    expect(Reflect.set(checked.bundle.projections, '0', null)).toBe(false);
  });
  it('adds exact ingredient composition before half-up display rounding in source order', () => {
    const { request, catalog } = fixture();
    const recipe = { ...catalog.recipes[0], ingredients: [
      { productId: 'rice', profileId: 'raw', quantity: { amount: rational(1n, 3n), unit: 'g' as const } },
      { productId: 'rice', profileId: 'raw', quantity: { amount: rational(2n, 3n), unit: 'g' as const } },
    ] };
    const view = viewed({ ...request, search: '', catalog: { status: 'loaded', catalog: { ...catalog, recipes: [recipe] } } });
    expect(view.ingredients.map(row => row.required.amount)).toEqual([rational(1n, 3n), rational(2n, 3n)]);
    expect(view.perPortionNutrition).toEqual({ status: 'known', value: { calories: rational(247n, 400n), protein: rational(29n, 800n), fat: decimal('0'), carbohydrates: rational(23n, 400n) } });
    expect(view.ingredients.map(row => row.perPortionNutrition)).toEqual([
      { status: 'known', value: { calories: rational(247n, 1200n), protein: rational(29n, 2400n), fat: decimal('0'), carbohydrates: rational(23n, 1200n) } },
      { status: 'known', value: { calories: rational(247n, 600n), protein: rational(29n, 1200n), fat: decimal('0'), carbohydrates: rational(23n, 600n) } },
    ]);
    expect(view.perPortionCost).toEqual(rational(1n, 10n));
    expect(roundHalfUp(rational(247n, 2n))).toBe(124n);
    expect(formatNutrition({ calories: rational(247n, 2n), protein: rational(29n, 4n), fat: decimal('0'), carbohydrates: rational(23n, 2n) })).toEqual({ calories: '124', protein: '7,3', fat: '0,0', carbohydrates: '11,5' });
  });
  it('uses the saved instance allocation, never subtracting the same rice stock again', () => {
    const { request } = fixture();
    const first = viewed(request), next = viewed({ ...request, pathname: '/recipe/r300', search: '?variant=v1&instance=i1' });
    expect(first.ingredients[0]).toMatchObject({ required: { amount: decimal('300') }, stock: { covered: { amount: decimal('200') }, purchase: { amount: decimal('100') } } });
    expect(next.ingredients[0]).toMatchObject({ required: { amount: decimal('450') }, stock: { covered: { amount: decimal('0') }, purchase: { amount: decimal('450') } } });
    expect(viewed(request)).toEqual(first);
    expect(viewed({ ...request, search: '' }).ingredients[0]).not.toHaveProperty('stock');
  });
  it('scales base2 to family3 exactly once with four per portion facts including known zero', () => {
    const view = viewed();
    expect(view.servings).toEqual(decimal('3'));
    expect(view.ingredients[0].required.amount).toEqual(decimal('300'));
    expect(view.ingredients[0].familyCost).toEqual(decimal('60'));
    expect(view.perPortionCost).toEqual(decimal('20'));
    const expected = { status: 'known', value: { calories: rational(247n, 2n), protein: rational(29n, 4n), fat: decimal('0'), carbohydrates: rational(23n, 2n) } };
    expect(view.perPortionNutrition).toEqual(expected);
    expect(view.ingredients[0].perPortionNutrition).toEqual(expected);
    const direct = viewed({ ...fixture().request, search: '' });
    expect(direct.servings).toEqual(decimal('2'));
    expect(direct.ingredients[0].required.amount).toEqual(decimal('200'));
    expect(direct.perPortionNutrition).toEqual(expected);
  });
  it('resolves exact active triple and returns only validated menu state', () => {
    const { request } = fixture();
    expect(resolveRecipeContext({ ...request, search: '?variant=v1&instance=i0&view=day&day=2026-10-27' })).toMatchObject({ status: 'context', returnTo: '/menu?view=day&day=2026-10-27' });
    for (const search of ['?variant=v2&instance=i0', '?variant=v1&instance=i1', '?instance=i0', '?variant=v1&instance=i0&variant=v1', '?return=https://example.org', '?view=bad', '?day=2026-02-30', '?instance=%QQ']) {
      expect(resolveRecipeContext({ ...request, search }).status, search).toBe('stale');
    }
  });
});
