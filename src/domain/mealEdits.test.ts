import { expect, it } from 'vitest';
import { buildAppliedSettings } from './appliedSettings';
import type { Catalog, FoodProfile, Recipe } from './catalog';
import { listMealAlternatives, replaceMeal } from './mealEdits';
import type { MealEditTarget } from './mealEdits';
import { buildActivePlanEnvelope, createPlanInputs, createRecipeInstances, mealSlots } from './plan';
import { projectPlan } from './planProjection';
import { decimal } from './quantities';
import { createDraft } from './settings';

// Independent arithmetic oracle. Rice costs 1 RUB per gram and provides 1 kcal per gram.
const source = { sourceId: 'synthetic', recordId: 'meal-edits', release: 'test', license: 'Synthetic values', url: 'https://example.org/test' };
function food(id: string, perGram: string, per100g: string): FoodProfile {
  return { productId: id, profileId: `${id}-raw`, name: id, identity: id, state: 'raw', category: 'Тест', conversions: [],
    nutrition: { status: 'known', reference: { amount: '100', unit: 'g', basis: 'edible' }, values: { calories: per100g, protein: '0', fat: '0', carbohydrates: '0' }, source },
    price: { status: 'known', amount: perGram, currency: 'RUB', reference: { amount: '1', unit: 'g', basis: 'edible' }, source, region: 'Тест', observedAt: '2026-10-28', estimate: true },
    safety: { status: 'known', facts: [{ kind: 'restriction', key: 'gluten-free', suitable: true, evidence: [source] }] },
  };
}
const recipe = (id: string, grams: string, productId = 'rice', change: Partial<Recipe> = {}): Recipe => ({ id, name: id, baseServings: decimal('2'),
  ingredients: [{ productId, profileId: `${productId}-raw`, quantity: { amount: decimal(grams), unit: 'g' } }], slots: mealSlots, cookingMinutes: 15,
  steps: ['Тест'], source, ...change });
const exact = recipe('exact', '325');
const over = recipe('over', '325.001');
const swap = recipe('swap', '25', 'oats');
const defaultAlternatives = [exact, over, swap, recipe('late', '25', 'rice', { cookingMinutes: 35 }),
  recipe('snack-only', '25', 'rice', { slots: ['snack'] }), recipe('excluded', '25', 'milk'), recipe('unverified', '25', 'unknown')];

function fixture(alternatives: readonly Recipe[] = defaultAlternatives) {
  const catalog: Catalog = {
    version: 'synthetic-meal-edits',
    foods: [food('rice', '1', '100'), food('oats', '2', '200'), food('milk', '1', '80'), { ...food('unknown', '1', '100'), safety: { status: 'unknown', reason: 'Тест без сведений о безопасности' } }],
    recipes: [recipe('baseline', '125'), ...alternatives],
  };
  const settings = buildAppliedSettings({ ...createDraft(), days: '1', people: '2', budget: '500', cookingTime: '30', restrictions: ['gluten-free'], exclusionIds: ['milk'] });
  if (settings.status !== 'applied') throw new Error('Invalid synthetic settings');
  const inputs = createPlanInputs(settings.settings, catalog, { seed: 'meal-edits', now: () => new Date(2026, 10, 19), pantrySnapshot: [
    { productId: 'rice', expiresSoon: false, quantity: { status: 'known', value: { amount: decimal('200'), unit: 'g' } } },
  ] });
  const variant = { id: 'active', instances: createRecipeInstances(inputs, ['baseline', 'baseline', 'baseline', 'baseline'], (_date, slot) => slot) };
  const plan = buildActivePlanEnvelope(inputs, [variant], variant.id);
  const projected = projectPlan(inputs, variant);
  if (projected.status !== 'projected') throw new Error('Invalid synthetic projection');
  const baseline = projected.projection;
  const target: MealEditTarget = { variantId: variant.id, date: inputs.dates[0], slot: 'lunch', instanceId: 'lunch', recipeId: 'baseline' };
  return { plan, baseline, target };
}

it('uses the whole-period purchase delta and keeps the exact budget boundary', async () => {
  const { plan, baseline, target } = fixture();
  expect(baseline.costs.exact.purchase).toEqual(decimal('300'));
  expect(await listMealAlternatives(plan, baseline, target)).toEqual({ status: 'ready', overBudget: true, incomplete: true, options: [
    { recipeId: 'swap', name: 'swap', cookingMinutes: 15, purchaseDeltaKopecks: -7500n, familyCalorieDelta: decimal('-75') },
    { recipeId: 'exact', name: 'exact', cookingMinutes: 15, purchaseDeltaKopecks: 20000n, familyCalorieDelta: decimal('200') },
  ] });
  // Four original meals need 500g and the shared pantry covers 200g. The swap leaves 375g rice and adds 25g oats.
  // New purchase = (375 - 200) × 1 + 25 × 2 = 225 RUB. Old lunch was one of four draws from that shared stock.
  const edited = replaceMeal(plan, baseline, target, 'swap');
  if (edited.status !== 'ready') throw new Error('Expected allowed swap');
  expect(edited.plan.variants[0].instances.map(row => row.recipeId)).toEqual(['baseline', 'swap', 'baseline', 'baseline']);
  expect(replaceMeal(plan, baseline, target, 'exact').status).toBe('ready');
  expect(replaceMeal(plan, baseline, target, 'over')).toEqual({ status: 'over-budget' });
  for (const rejected of ['snack-only', 'late', 'excluded']) expect(replaceMeal(plan, baseline, target, rejected)).toEqual({ status: 'incompatible' });
  expect(replaceMeal(plan, baseline, target, 'unverified')).toEqual({ status: 'incomplete' });
  expect(replaceMeal(plan, baseline, { ...target, recipeId: 'changed-after-panel-open' }, 'swap')).toEqual({ status: 'stale' });
});

it.each([0, 1, 2, 7])('returns only the supported count for %i ties in deterministic order', async count => {
  const { plan, baseline, target } = fixture(Array.from({ length: count }, (_, index) => recipe(`alt-${count - index}`, '125')));
  const result = await listMealAlternatives(plan, baseline, target);
  expect(result).toEqual(await listMealAlternatives(plan, baseline, target));
  if (result.status !== 'ready') throw new Error('Expected ready lookup');
  expect(result.options.map(row => row.recipeId)).toEqual(Array.from({ length: Math.min(count, 5) }, (_, index) => `alt-${index + 1}`));
});

it('stops projecting when the caller closes or invalidates the lookup between batches', async () => {
  const { plan, baseline, target } = fixture(Array.from({ length: 8 }, (_, index) => recipe(`alt-${index}`, '125')));
  const abort = new AbortController();
  // The additional argument defines the new cancellation contract. Once implemented, call through the typed API.
  const run = (options: object) => Reflect.apply(listMealAlternatives, undefined, [plan, baseline, target, options]);
  let batches = 0;
  expect(await run({ signal: abort.signal, isCurrent: () => true, yieldControl: async () => { batches++; abort.abort(); } })).toEqual({ status: 'cancelled' });
  expect(batches).toBe(1);
  let current = true;
  expect(await run({ signal: new AbortController().signal, isCurrent: () => current, yieldControl: async () => { current = false; } })).toEqual({ status: 'stale' });
});
