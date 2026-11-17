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
import { bundledCatalog } from '../data/catalog';
import { formatExact } from './quantities';

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
  it('current82 contextual four portions preserve independent source facts and exact pantry allocation', () => {
    const applied = buildAppliedSettings({ ...createDraft(), people: '4', days: '1' });
    if (applied.status !== 'applied') throw new Error('Four-person settings');
    const inputs = createPlanInputs(applied.settings, bundledCatalog, { seed: 'four-portion-view', now: () => new Date(2026, 10, 17), pantrySnapshot: [
      { productId: 'chicken', quantity: { status: 'known', value: { amount: decimal('200'), unit: 'g' } }, expiresSoon: false },
    ] });
    const recipe = bundledCatalog.recipes.find(row => row.id === 'familiar-chicken-rice-carrot')!;
    const instance = { id: 'four-chicken', date: inputs.dates[0], slot: 'lunch' as const, recipeId: recipe.id, catalogVersion: bundledCatalog.version, recipeSnapshot: recipe, selectedServings: decimal('4') };
    const variant = { id: 'four', instances: [instance] };
    const projection = projectPlan(inputs, variant);
    if (projection.status !== 'projected') throw new Error('Four-person projection');
    const active: ActiveBundle = { plan: { schemaVersion: 1, inputs, variants: [variant], activeVariantId: variant.id }, projections: [projection.projection] };
    const request: RecipeRequest = { pathname: `/recipe/${recipe.id}`, search: '?variant=four&instance=four-chicken', active, loadStatus: 'loaded', catalog: null };
    const view = viewed(request);
    expect(view.catalogVersion).toBe('mealplan-2026-11-11-4');
    expect(view.servingsLabel).toBe('4 порции');
    expect(view.perPortionNutrition.status).toBe('known');
    if (view.perPortionNutrition.status !== 'known') throw new Error('Missing nutrition');
    expect(Object.values(view.perPortionNutrition.value).map(formatExact)).toEqual(['554.38', '40.111', '11.672', '69.281']);
    const chicken = view.ingredients.find(row => row.food.productId === 'chicken')!;
    expect([chicken.required.amount, chicken.stock!.covered.amount, chicken.stock!.purchase.amount].map(formatExact)).toEqual(['600', '200', '400']);
    const rice = view.ingredients.find(row => row.food.productId === 'rice')!;
    expect(formatExact(rice.required.amount)).toBe('280');
    expect(projectRecipeView({ ...request, search: '?variant=four&instance=other' }).status).toBe('stale');
  });
  it('accepts exact 256 character unicode identity values without an accidental encoded length limit', () => {
    const { request, active } = fixture();
    const variantId = '米'.repeat(256), instanceId = '菜'.repeat(256);
    const instance = { ...active.plan.variants[0].instances[0], id: instanceId };
    const scoped = { ...active, plan: { ...active.plan, variants: [{ id: variantId, instances: [instance] }], activeVariantId: variantId } };
    const search = `?${new URLSearchParams({ variant: variantId, instance: instanceId })}`;
    expect(resolveRecipeContext({ ...request, search, active: scoped }).status).toBe('context');
    expect(resolveRecipeContext({ ...request, search: `${search}x`, active: scoped }).status).toBe('stale');
  });
  it('rejects a contextual return day outside the actual saved period', () => {
    const { request } = fixture();
    expect(resolveRecipeContext({ ...request, search: '?variant=v1&instance=i0&view=day&day=2026-10-28' }).status).toBe('stale');
  });
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
    expect(view.servingsLabel).toBe('3 порции'); expect(view.ingredientBasis).toBe('Ингредиенты на 3 порции');
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
  it.each([
    ['/recipe', '', 'notfound'], ['/recipe/absent', '', 'notfound'], ['/recipe/R200', '', 'notfound'],
    ['/recipe/%QQ', '', 'stale'], ['/recipe/r200', '?variant=%E0%A4&instance=i0', 'stale'],
    ['/recipe/r200', '?variant=v1&instance=i0&instance=i0', 'stale'],
    ['/recipe/r200', '?variant=v1&instance=i0&view=day&view=day', 'stale'],
    ['/recipe/r200', '?variant=v1&instance=i0&return=//evil.invalid', 'stale'],
    ['/recipe/r200', '?variant=v1&instance=i0&day=2026-02-29', 'stale'],
    ['/recipe/r200', '?variant=v1&instance=i0&view=DAY', 'stale'],
    [`/recipe/${'x'.repeat(257)}`, '', 'stale'],
    ['/recipe/r200', `?variant=${'x'.repeat(257)}&instance=i0`, 'stale'],
    ['/recipe/r200', '?variant=&instance=', 'stale'],
    ['/recipe/%2572', '', 'notfound'], // Decode once; never reinterpret an encoded percent.
  ])('keeps URL branch %s%s as %s', (pathname, search, status) => {
    expect(projectRecipeView({ ...fixture().request, pathname, search }).status).toBe(status);
  });
  it('distinguishes adapter pending error and corrupted context from absence without using another snapshot', () => {
    const { request } = fixture();
    expect(projectRecipeView({ ...request, search: '', catalog: null }).status).toBe('pending');
    expect(projectRecipeView({ ...request, search: '', catalog: { status: 'invalid', diagnostics: [] } }).status).toBe('error');
    expect(projectRecipeView({ ...request, loadStatus: 'pending' }).status).toBe('pending');
    expect(projectRecipeView({ ...request, active: null, loadStatus: 'error' }).status).toBe('error');
    expect(projectRecipeView({ ...request, active: null, loadStatus: 'corrupt' }).status).toBe('incomplete');
    expect(projectRecipeView({ ...request, active: null, loadStatus: 'missing' }).status).toBe('stale');
    // Context belongs to the saved catalog and is independent of a late direct-catalog read.
    expect(viewed({ ...request, catalog: { status: 'invalid', diagnostics: [] } }).recipe.id).toBe('r200');
  });
  it('keeps incomplete recipes distinct from a complete one-ingredient one-step direct recipe', () => {
    const { request, catalog } = fixture();
    for (const recipe of [{ ...catalog.recipes[0], ingredients: [] }, { ...catalog.recipes[0], steps: [] }, { ...catalog.recipes[0], steps: [' '] }]) {
      expect(projectRecipeView({ ...request, search: '', catalog: { status: 'loaded', catalog: { ...catalog, recipes: [recipe] } } }).status).toBe('incomplete');
    }
    const view = viewed({ ...request, search: '' });
    expect(view.ingredients).toHaveLength(1); expect(view.recipe.steps).toEqual(['Полный единственный шаг']);
  });
  it('shows unknown direct facts explicitly and rejects missing mandatory contextual facts', () => {
    const { request, active, catalog } = fixture();
    const unknownFood = { ...rice, nutrition: { status: 'unknown' as const, reason: 'Test unknown' }, price: { status: 'unknown' as const, reason: 'Test price unknown' } };
    const alteredCatalog = { ...catalog, foods: [unknownFood] };
    const direct = viewed({ ...request, search: '', catalog: { status: 'loaded', catalog: alteredCatalog } });
    expect(direct.perPortionNutrition.status).toBe('unknown');
    expect(direct.ingredients[0].perPortionNutrition.status).toBe('unknown');
    expect(direct.perPortionCost).toBeNull(); expect(direct.ingredients[0].familyCost).toBeNull();
    expect(projectRecipeView({ ...request, active: { ...active, plan: { ...active.plan, inputs: { ...active.plan.inputs, catalog: alteredCatalog } } } }).status).toBe('incomplete');
  });
  it('does not rebind repeated recipe occurrences or reuse a previous active variant', () => {
    const { request, active } = fixture();
    const first = active.plan.variants[0].instances[0];
    const later = { ...first, id: 'repeat', slot: 'lunch' as const, selectedServings: decimal('1') };
    const variant = { id: 'v1', instances: [first, later] };
    const projection = projectPlan(active.plan.inputs, variant);
    if (projection.status !== 'projected') throw new Error('Repeated fixture');
    const repeated: ActiveBundle = { plan: { ...active.plan, variants: [variant] }, projections: [projection.projection] };
    const last = viewed({ ...request, active: repeated, search: '?variant=v1&instance=repeat' });
    expect(last.instance?.id).toBe('repeat'); expect(last.servings).toEqual(decimal('1'));
    expect(last.servingsLabel).toBe('1 порция'); expect(last.ingredientBasis).toBe('Ингредиенты на 1 порцию');
    expect(last.ingredients[0].required.amount).toEqual(decimal('100'));
    expect(last.ingredients[0].stock?.covered.amount).toEqual(decimal('0'));
    const changed = { ...repeated, plan: { ...repeated.plan, activeVariantId: 'another' } };
    expect(projectRecipeView({ ...request, active: changed }).status).toBe('stale');
    expect(viewed(request).instance?.id).toBe('i0');
  });
  it('accepts selected1000 and positive fractions, rejecting zero and amounts beyond1000', () => {
    const { request, active } = fixture();
    for (const selectedServings of [decimal('1000'), rational(1n, 3n), decimal('0'), decimal('1000.001')]) {
      const instance = { ...active.plan.variants[0].instances[0], selectedServings };
      const variant = { id: 'v1', instances: [instance] };
      const projection = projectPlan(active.plan.inputs, variant);
      const scoped = { plan: { ...active.plan, variants: [variant] }, projections: projection.status === 'projected' ? [projection.projection] : [] };
      const status = projectRecipeView({ ...request, active: scoped }).status;
      expect(status).toBe(selectedServings.numerator > 0n && selectedServings.numerator <= selectedServings.denominator * 1000n ? 'context' : 'incomplete');
    }
  });
});
