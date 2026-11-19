import { expect, it } from 'vitest';
import { buildAppliedSettings } from './appliedSettings';
import type { Catalog, FoodProfile, Recipe } from './catalog';
import { addMeal, changeMealServings, freeMealId, listMealAlternatives, removeMeal, replaceMeal } from './mealEdits';
import type { EmptyMealTarget, MealEditTarget } from './mealEdits';
import { variantFingerprint } from './generatePlan';
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

function fixture(alternatives: readonly Recipe[] = defaultAlternatives, options: { stock?: string; splitRounding?: boolean; people?: string } = {}) {
  const twoRoundedRows = { ...recipe('baseline', '90.001'), ingredients: [
    recipe('baseline', '90.001').ingredients[0], recipe('baseline', '9.999', 'oats').ingredients[0],
  ] };
  const catalog: Catalog = {
    version: 'synthetic-meal-edits',
    foods: [food('rice', '1', '100'), food('oats', options.splitRounding ? '1' : '2', '200'), food('milk', '1', '80'), { ...food('unknown', '1', '100'), safety: { status: 'unknown', reason: 'Тест без сведений о безопасности' } }],
    recipes: [options.splitRounding ? twoRoundedRows : recipe('baseline', '125'), ...alternatives],
  };
  const settings = buildAppliedSettings({ ...createDraft(), days: '1', people: options.people ?? '2', budget: '500', cookingTime: '30', restrictions: ['gluten-free'], exclusionIds: ['milk'] });
  if (settings.status !== 'applied') throw new Error('Invalid synthetic settings');
  const inputs = createPlanInputs(settings.settings, catalog, { seed: 'meal-edits', now: () => new Date(2026, 10, 19), pantrySnapshot: options.splitRounding ? [] : [
    { productId: 'rice', expiresSoon: false, quantity: { status: 'known', value: { amount: decimal(options.stock ?? '200'), unit: 'g' } } },
  ] });
  const variant = { id: 'active', instances: createRecipeInstances(inputs, ['baseline', 'baseline', 'baseline', 'baseline'], (_date, slot) => slot) };
  const plan = buildActivePlanEnvelope(inputs, [variant], variant.id);
  const projected = projectPlan(inputs, variant);
  if (projected.status !== 'projected') throw new Error('Invalid synthetic projection');
  const baseline = projected.projection;
  const target: MealEditTarget = { variantId: variant.id, date: inputs.dates[0], slot: 'lunch', instanceId: 'lunch', recipeId: 'baseline' };
  return { plan, baseline, target };
}

it('tests exact and independently rounded whole-period budget limits for portion changes', () => {
  // Four 125g meals, one doubled = 625g. A pantry of 125g gives exactly 500 RUB.
  const same = fixture([], { stock: '125' });
  const changed = changeMealServings(same.plan, same.baseline, same.target, '2');
  if (changed.status !== 'ready') throw new Error('Expected exact budget equality');
  const check = projectPlan(changed.plan.inputs, changed.plan.variants[0]);
  expect(check).toMatchObject({ status: 'projected', projection: { costs: { exact: { purchase: decimal('500') }, kopecks: { purchase: 50000n } } } });
  const fraction = fixture([], { stock: '124.999' });
  expect(changeMealServings(fraction.plan, fraction.baseline, fraction.target, '2')).toEqual({ status: 'over-budget' });

  // Exact total 450.005 + 49.995 = 500. Half-up rows give 450.01 + 50 = 500.01.
  const rounded = fixture([], { splitRounding: true });
  expect(changeMealServings(rounded.plan, rounded.baseline, rounded.target, '2')).toEqual({ status: 'over-budget' });
  expect(changeMealServings(same.plan, same.baseline, { ...same.target, instanceId: 'stale' }, '2')).toEqual({ status: 'stale' });
  expect(changeMealServings(same.plan, same.baseline, same.target, '0' as '1')).toEqual({ status: 'incompatible' });
});

it('uses an absolute odd-family scale and reallocates the shared pantry only once', () => {
  const { plan, baseline, target } = fixture([], { people: '3', stock: '300' });
  // Four meals at 187.5g each; change breakfast alone to 93.75g and use 300g pantry.
  const breakfast = { ...target, slot: 'breakfast' as const, instanceId: 'breakfast' };
  const changed = changeMealServings(plan, baseline, breakfast, '0.5');
  if (changed.status !== 'ready') throw new Error('Expected half the original family size');
  expect(changed.plan.variants[0].instances[0].selectedServings).toEqual(decimal('1.5'));
  expect(changed.plan.variants[0].instances.slice(1)).toEqual(plan.variants[0].instances.slice(1));
  const check = projectPlan(changed.plan.inputs, changed.plan.variants[0]);
  if (check.status !== 'projected') throw new Error('Expected shared pantry projection');
  expect(check.projection.instances.map(row => row.ingredients[0].covered.amount))
    .toEqual(['93.75', '187.5', '18.75', '0'].map(decimal));
  expect(check.projection.costs.exact.purchase).toEqual(decimal('356.25'));
  const current = changeMealServings(changed.plan, check.projection, breakfast, '0.5');
  expect(current).toEqual({ status: 'unchanged' });
});

it('uses the whole-period purchase delta and keeps the exact budget boundary', async () => {
  const { plan, baseline, target } = fixture();
  expect(baseline.costs.exact.purchase).toEqual(decimal('300'));
  expect(await listMealAlternatives(plan, baseline, target)).toEqual({ status: 'ready', overBudget: true, incomplete: true, options: [
    { recipeId: 'swap', name: 'swap', cookingMinutes: 15, purchaseDelta: decimal('-75'), purchaseDeltaKopecks: -7500n, familyCalorieDelta: decimal('-75') },
    { recipeId: 'exact', name: 'exact', cookingMinutes: 15, purchaseDelta: decimal('200'), purchaseDeltaKopecks: 20000n, familyCalorieDelta: decimal('200') },
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

it('phase04-add starts with zero meal calories, preserves family portions, and rejects a stale empty target', async () => {
  const { plan, baseline, target } = fixture();
  const empty: EmptyMealTarget = { kind: 'empty', slot: target.slot, date: target.date, variantId: target.variantId };
  const removed = removeMeal(plan, baseline, target);
  if (removed.status !== 'ready') throw new Error('Expected removal');
  const variant = removed.plan.variants[0];
  const projected = projectPlan(plan.inputs, variant);
  if (projected.status !== 'projected') throw new Error('Expected partial projection');
  // Three meals need 375g rice, less 200g stock, so add 25g oats at 2 RUB/g and 2 kcal/g to 175 RUB.
  const before = projected.projection;
  const alternatives = await listMealAlternatives(removed.plan, before, empty);
  if (alternatives.status !== 'ready') throw new Error('Expected list for an empty position');
  expect(alternatives.options[0]).toMatchObject({ recipeId: 'swap', purchaseDelta: decimal('50'), purchaseDeltaKopecks: 5000n, familyCalorieDelta: decimal('50') });
  expect(alternatives.options.map(row => row.recipeId)).toEqual(['swap', 'baseline', 'exact']);
  expect(addMeal(removed.plan, before, empty, 'over', freeMealId(removed.plan, 'over'))).toEqual({ status: 'over-budget' });
  for (const wrong of ['late', 'excluded', 'snack-only']) expect(addMeal(removed.plan, before, empty, wrong, 'not-used')).toEqual({ status: 'incompatible' });
  expect(addMeal(removed.plan, before, empty, 'unverified', 'not-used')).toEqual({ status: 'incomplete' });
  const id = freeMealId(removed.plan, 'first');
  const added = addMeal(removed.plan, before, empty, 'baseline', id);
  if (added.status !== 'ready') throw new Error('Expected refill');
  expect(added.plan).toMatchObject({ schemaVersion: 2, variants: [{ emptySlots: [] }] });
  expect(added.plan.variants[0].instances[1]).toMatchObject({ id, slot: 'lunch', selectedServings: decimal('2'), recipeId: 'baseline' });
  expect(added.plan.variants[0].instances[1].id).not.toBe(target.instanceId);
  expect(variantFingerprint(added.plan.variants[0])).toBe(variantFingerprint(plan.variants[0]));
  expect(JSON.parse(variantFingerprint(variant))[1]).toEqual([target.date, 'lunch', null]);
  expect(freeMealId(added.plan, 'first')).not.toBe(id);
  expect(await listMealAlternatives(added.plan, before, empty)).toEqual({ status: 'stale' });
  expect(addMeal(added.plan, before, empty, 'baseline', 'unused')).toEqual({ status: 'stale' });
  const nextProjection = projectPlan(plan.inputs, added.plan.variants[0]);
  if (nextProjection.status !== 'projected') throw new Error('Expected refill projection');
  expect(removeMeal(added.plan, nextProjection.projection, target)).toEqual({ status: 'stale' });
  const removedAgain = removeMeal(added.plan, nextProjection.projection, { ...target, instanceId: id });
  if (removedAgain.status !== 'ready') throw new Error('Expected a second removal');
  const addedAgain = addMeal(removedAgain.plan, before, empty, 'baseline', freeMealId(removedAgain.plan, 'second'));
  if (addedAgain.status !== 'ready') throw new Error('Expected a second refill');
  expect(addedAgain.plan.variants[0].instances[1].id).not.toBe(id);
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
  const run = (options: Parameters<typeof listMealAlternatives>[3]) => listMealAlternatives(plan, baseline, target, options);
  let batches = 0;
  expect(await run({ signal: abort.signal, isCurrent: () => true, yieldControl: async () => { batches++; abort.abort(); } })).toEqual({ status: 'cancelled' });
  expect(batches).toBe(1);
  let current = true;
  expect(await run({ signal: new AbortController().signal, isCurrent: () => current, yieldControl: async () => { current = false; } })).toEqual({ status: 'stale' });
});
