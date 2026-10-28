import { describe, expect, it } from 'vitest';
import { buildAppliedSettings } from '../domain/appliedSettings';
import { buildActivePlanEnvelope, createPlanInputs, createRecipeInstances, encodePlanEnvelope, mealSlots } from '../domain/plan';
import type { Catalog } from '../domain/catalog';
import type { ActivePlanEnvelope } from '../domain/plan';
import { decimal } from '../domain/quantities';
import { createDraft } from '../domain/settings';
import { ACTIVE_PLAN_KEY, ACTIVE_PLAN_MAX_BYTES, createActivePlanAdapter } from './activePlan';

// Synthetic test data, never a production catalog or factual food claim.
function fixture(change = {}): ActivePlanEnvelope {
  const source = { sourceId: 'synthetic', recordId: 'test', release: 'v1', license: 'CC0-1.0', url: 'https://example.org/test' };
  const catalog: Catalog = { version: 'test-v1', foods: [{ productId: 'rice', profileId: 'raw', name: 'test', identity: 'test', state: 'raw', category: 'test',
    nutrition: { status: 'known', reference: { amount: '100', unit: 'g', basis: 'edible' }, values: { calories: '120', protein: '10', fat: '4', carbohydrates: '11' }, source },
    price: { status: 'known', amount: '1', currency: 'RUB', reference: { amount: '1', unit: 'g', basis: 'edible' }, source, region: 'test', observedAt: '2026-10-28', estimate: true },
    safety: { status: 'known', facts: [{ kind: 'restriction', key: 'no-gluten', suitable: true, evidence: [source] }] }, conversions: [] }], recipes: [{ id: 'r', name: 'test', baseServings: decimal('1'), ingredients: [{ productId: 'rice', profileId: 'raw', quantity: { amount: decimal('100'), unit: 'g' } }], slots: mealSlots, cookingMinutes: 15, steps: ['test'], source }] };
  const applied = buildAppliedSettings({ ...createDraft(), days: '1', people: '1', budget: '1000', ...change });
  if (applied.status !== 'applied') throw new Error('fixture');
  const inputs = createPlanInputs(applied.settings, catalog, { seed: 'test', now: () => new Date(2026, 9, 28) });
  return buildActivePlanEnvelope(inputs, [{ id: 'v', instances: createRecipeInstances(inputs, ['r', 'r', 'r', 'r'], (date, slot) => `${date}-${slot}`) }], 'v');
}
function storage() {
  const map = new Map<string, string>([['sentinel', 'safe'], ['mealplan:guest:draft:v1', 'draft'], ['pantry', 'stock']]);
  return { map, getItem: (key: string) => map.get(key) ?? null, setItem: (key: string, value: string) => { map.set(key, value); } };
}
const current = { isCurrent: () => true };
const rawPlan = (plan = fixture()) => JSON.stringify({ schemaVersion: 1, plan: encodePlanEnvelope(plan) });
describe('validated active persistence', () => {
  it('round-trips a complete exact bundle with recomputed projection and valid presence', async () => {
    const store = storage(), port = createActivePlanAdapter(() => store);
    expect((await port.load()).status).toBe('missing');
    expect((await port.save(fixture(), current)).status).toBe('saved');
    const result = await createActivePlanAdapter(() => store).load();
    expect(result.status).toBe('loaded');
    if (result.status !== 'loaded') throw new Error('not loaded');
    expect(result.bundle.plan).toEqual(fixture());
    expect(result.bundle.projections[0].costs.exact.purchase).toEqual(decimal('400'));
    expect(result.bundle.projections[0].familyNutrition.calories).toEqual(decimal('480'));
    expect([...store.map].filter(([key]) => key !== ACTIVE_PLAN_KEY)).toEqual([['sentinel', 'safe'], ['mealplan:guest:draft:v1', 'draft'], ['pantry', 'stock']]);
  });
  it.each(['{', '{}', '{"schemaVersion":2}', 'x'.repeat(ACTIVE_PLAN_MAX_BYTES + 1)])('preserves corrupt bytes and blocks writes', async raw => {
    const store = storage(); store.map.set(ACTIVE_PLAN_KEY, raw); const port = createActivePlanAdapter(() => store);
    expect((await port.load()).status).toBe('corrupt');
    expect((await port.save(fixture(), current)).status).toBe('blocked');
    expect(store.map.get(ACTIVE_PLAN_KEY)).toBe(raw);
  });
  it.each(['source', 'slot', 'version', 'budget', 'price', 'restriction', 'excluded', 'time'])('rejects invalid %s and keeps previous bytes', async kind => {
    const store = storage(); const encoded = JSON.parse(rawPlan(fixture(kind === 'restriction' ? { restrictions: ['no-fish'] } : kind === 'excluded' ? { exclusionIds: ['rice'] } : kind === 'time' ? { cookingTime: '15' } : {})));
    if (kind === 'source') encoded.plan.inputs.sourceSnapshots = [];
    if (kind === 'slot') encoded.plan.variants[0].instances.pop();
    if (kind === 'version') encoded.plan.inputs.catalogVersion = 'other';
    if (kind === 'budget') { encoded.plan.variants[0].instances.forEach((item: { selectedServings: unknown }) => { item.selectedServings = { numerator: '10', denominator: '1' }; }); }
    if (kind === 'price') encoded.plan.inputs.catalog.foods[0].price = { status: 'unknown', reason: 'test' };
    if (kind === 'time') { encoded.plan.inputs.catalog.recipes[0].cookingMinutes = 60; encoded.plan.variants[0].instances.forEach((item: { recipeSnapshot: { cookingMinutes: number } }) => { item.recipeSnapshot.cookingMinutes = 60; }); }
    const raw = JSON.stringify(encoded); store.map.set(ACTIVE_PLAN_KEY, raw);
    const port = createActivePlanAdapter(() => store);
    expect((await port.load()).status).toBe('corrupt');
    expect((await port.save(fixture(), current)).status).toBe('blocked');
    expect(store.map.get(ACTIVE_PLAN_KEY)).toBe(raw);
  });
  it('blocks uninspected storage and makes access/read/write failures explicit', async () => {
    const store = storage(), port = createActivePlanAdapter(() => store);
    expect((await port.save(fixture(), current)).status).toBe('blocked');
    expect((await createActivePlanAdapter(() => { throw new Error('access'); }).load()).status).toBe('error');
    expect((await createActivePlanAdapter(() => ({ ...store, getItem() { throw new Error('read'); } })).load()).status).toBe('error');
    const broken = createActivePlanAdapter(() => ({ ...store, setItem() { throw new Error('quota'); } }));
    await broken.load(); expect((await broken.save(fixture(), current)).status).toBe('error');
  });
  it('checks ownership at the final synchronous write after storage access', async () => {
    const store = storage(); let owned = true;
    const port = createActivePlanAdapter(() => { owned = false; return store; });
    await port.load(); owned = true;
    expect((await port.save(fixture(), { isCurrent: () => owned })).status).toBe('cancelled');
    expect(store.map.has(ACTIVE_PLAN_KEY)).toBe(false);
  });
});
