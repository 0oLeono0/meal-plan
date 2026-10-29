import { describe, expect, it } from 'vitest';
import { buildAppliedSettings } from '../domain/appliedSettings';
import { buildActivePlanEnvelope, createPlanInputs, createRecipeInstances, encodePlanEnvelope, mealSlots } from '../domain/plan';
import type { Catalog } from '../domain/catalog';
import type { ActivePlanEnvelope } from '../domain/plan';
import { decimal } from '../domain/quantities';
import { createDraft } from '../domain/settings';
import { ACTIVE_PLAN_KEY, ACTIVE_PLAN_MAX_BYTES, createActivePlanAdapter, createActivePlanPresencePort, validateActiveBundle } from './activePlan';
import { bundledCatalog } from '../data/catalog';
import { createTrustedCatalogRegistry } from './trustedCatalogs';

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

function sourcePlan(catalog: Catalog = bundledCatalog) {
  const applied = buildAppliedSettings({ ...createDraft(), days: '1', people: '1', budget: '1000' });
  if (applied.status !== 'applied') throw new Error('settings');
  const inputs = createPlanInputs(applied.settings, catalog, { seed: 'source-trust', now: () => new Date(2026, 9, 28) });
  const ids = mealSlots.map(slot => catalog.recipes.find(recipe => recipe.slots.includes(slot))!.id);
  return buildActivePlanEnvelope(inputs, [{ id: 'source', instances: createRecipeInstances(inputs, ids, (date, slot) => `${date}-${slot}`) }], 'source');
}

describe('source-backed persistence trust', () => {
  it('rejects an unregistered synthetic version by default', () => {
    expect(validateActiveBundle(fixture()).status).toBe('invalid');
  });

  it('keeps explicitly trusted historical versions reproducible, including legitimate zero nutrients', async () => {
    const original = fixture().inputs.catalog, food = original.foods[0];
    if (food.nutrition.status !== 'known' || food.price.status !== 'known') throw new Error('fixture');
    const historical = { ...original, version: 'trusted-historical', foods: [{ ...food,
      nutrition: { ...food.nutrition, values: { ...food.nutrition.values, calories: '0' } }, price: { ...food.price, amount: '2' } }] };
    const registry = createTrustedCatalogRegistry([bundledCatalog, historical]);
    const plan = sourcePlan(historical), store = storage(), port = createActivePlanAdapter(() => store, registry);
    await port.load(); expect((await port.save(plan, current)).status).toBe('saved');
    const loaded = await createActivePlanAdapter(() => store, registry).load();
    expect(loaded.status).toBe('loaded');
    if (loaded.status !== 'loaded') throw new Error('not loaded');
    expect(loaded.bundle.projections[0].costs.exact.purchase).toEqual(decimal('800'));
    expect(loaded.bundle.projections[0].familyNutrition.calories).toEqual(decimal('0'));
    expect((await createActivePlanAdapter(() => store).load()).status).toBe('corrupt');
  });

  it('detaches trusted facts so later caller mutations cannot authorize altered food', () => {
    const original = fixture().inputs.catalog, food = original.foods[0];
    if (food.nutrition.status !== 'known') throw new Error('fixture');
    const values = { ...food.nutrition.values }, catalog = { ...original, foods: [{ ...food, nutrition: { ...food.nutrition, values } }] };
    const registry = createTrustedCatalogRegistry([catalog]);
    values.calories = '0';
    expect(validateActiveBundle(sourcePlan(catalog), registry).status).toBe('invalid');
    expect(validateActiveBundle(fixture(), registry).status).toBe('valid');
    expect(() => createTrustedCatalogRegistry([original, original])).toThrow('DUPLICATE_TRUSTED_CATALOG_VERSION');
  });
  it('saves and reloads the bundled source-backed catalog without changing exact totals', async () => {
    const store = storage(), port = createActivePlanAdapter(() => store);
    await port.load();
    expect((await port.save(sourcePlan(), current)).status).toBe('saved');
    const result = await createActivePlanAdapter(() => store).load();
    expect(result.status).toBe('loaded');
    if (result.status !== 'loaded') throw new Error('not loaded');
    expect(result.bundle.projections[0].costs.exact.purchase).toEqual(decimal('46.7527011203703637'));
  });

  it.each(['nutrition', 'price', 'safety', 'source', 'recipe', 'conversion', 'unknown-version', 'unused-food'] as const)(
    'rejects self-consistent altered %s before projection/presence/save and preserves corrupt bytes', async kind => {
      const baseline = sourcePlan(), used = baseline.variants[0].instances[0].recipeSnapshot.ingredients[0].profileId;
      const target = kind === 'unused-food' ? bundledCatalog.foods.find(food => !baseline.variants[0].instances.some(instance => instance.recipeSnapshot.ingredients.some(ingredient => ingredient.profileId === food.profileId)))!.profileId : used;
      const foods = bundledCatalog.foods.map(food => {
        if (food.profileId !== target) return food;
        if ((kind === 'nutrition' || kind === 'unused-food') && food.nutrition.status === 'known') return { ...food, nutrition: { ...food.nutrition, values: { ...food.nutrition.values, calories: '0' } } };
        if (kind === 'price' && food.price.status === 'known') return { ...food, price: { ...food.price, amount: '0.0000001' } };
        if (kind === 'safety' && food.safety.status === 'known') return { ...food, safety: { ...food.safety, facts: food.safety.facts.map((fact, index) => index ? fact : { ...fact, suitable: !fact.suitable }) } };
        if (kind === 'source' && food.nutrition.status === 'known') return { ...food, nutrition: { ...food.nutrition, source: { ...food.nutrition.source, recordId: 'forged' } } };
        if (kind === 'conversion') return { ...food, conversions: [{ productId: food.productId, profileId: food.profileId, from: { amount: decimal('1'), unit: 'ml' as const }, to: { amount: decimal('10'), unit: 'g' as const }, evidence: { sourceId: 'forged', recordId: 'forged', url: 'https://example.org/forged' } }] };
        return food;
      });
      const catalog = { ...bundledCatalog, version: kind === 'unknown-version' ? 'unknown-self-consistent' : bundledCatalog.version, foods,
        recipes: bundledCatalog.recipes.map((recipe, index) => kind === 'recipe' && index === 0 ? { ...recipe, steps: ['forged'] } : recipe) };
      const forged = sourcePlan(catalog), raw = rawPlan(forged), store = storage(); store.map.set(ACTIVE_PLAN_KEY, raw);
      expect(validateActiveBundle(forged).status).toBe('invalid');
      const port = createActivePlanAdapter(() => store);
      expect((await port.load()).status).toBe('corrupt');
      expect(await createActivePlanPresencePort(port).load()).toEqual({ status: 'error' });
      expect((await port.save(baseline, current)).status).toBe('blocked');
      expect(store.map.get(ACTIVE_PLAN_KEY)).toBe(raw);
      const clean = createActivePlanAdapter(() => storage()); await clean.load();
      expect((await clean.save(forged, current)).status).toBe('error');
    });
});
describe('validated active persistence', () => {
  // This suite exercises persistence mechanics with explicit synthetic trust.
  const registry = createTrustedCatalogRegistry([fixture().inputs.catalog]);
  const createSyntheticAdapter = (getStorage: Parameters<typeof createActivePlanAdapter>[0]) => createActivePlanAdapter(getStorage, registry);
  it('round-trips a complete exact bundle with recomputed projection and valid presence', async () => {
    const store = storage(), port = createSyntheticAdapter(() => store);
    expect((await port.load()).status).toBe('missing');
    expect((await port.save(fixture(), current)).status).toBe('saved');
    const result = await createSyntheticAdapter(() => store).load();
    expect(result.status).toBe('loaded');
    if (result.status !== 'loaded') throw new Error('not loaded');
    expect(result.bundle.plan).toEqual(fixture());
    expect(result.bundle.projections[0].costs.exact.purchase).toEqual(decimal('400'));
    expect(result.bundle.projections[0].familyNutrition.calories).toEqual(decimal('480'));
    expect([...store.map].filter(([key]) => key !== ACTIVE_PLAN_KEY)).toEqual([['sentinel', 'safe'], ['mealplan:guest:draft:v1', 'draft'], ['pantry', 'stock']]);
  });
  it.each(['{', '{}', '{"schemaVersion":2}', 'x'.repeat(ACTIVE_PLAN_MAX_BYTES + 1)])('preserves corrupt bytes and blocks writes', async raw => {
    const store = storage(); store.map.set(ACTIVE_PLAN_KEY, raw); const port = createSyntheticAdapter(() => store);
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
    const port = createSyntheticAdapter(() => store);
    expect((await port.load()).status).toBe('corrupt');
    expect((await port.save(fixture(), current)).status).toBe('blocked');
    expect(store.map.get(ACTIVE_PLAN_KEY)).toBe(raw);
  });
  it('blocks uninspected storage and makes access/read/write failures explicit', async () => {
    const store = storage(), port = createSyntheticAdapter(() => store);
    expect((await port.save(fixture(), current)).status).toBe('blocked');
    expect((await createSyntheticAdapter(() => { throw new Error('access'); }).load()).status).toBe('error');
    expect((await createSyntheticAdapter(() => ({ ...store, getItem() { throw new Error('read'); } })).load()).status).toBe('error');
    const broken = createSyntheticAdapter(() => ({ ...store, setItem() { throw new Error('quota'); } }));
    await broken.load(); expect((await broken.save(fixture(), current)).status).toBe('error');
  });
  it('checks ownership at the final synchronous write after storage access', async () => {
    const store = storage(); let owned = true;
    const port = createSyntheticAdapter(() => { owned = false; return store; });
    await port.load(); owned = true;
    expect((await port.save(fixture(), { isCurrent: () => owned })).status).toBe('cancelled');
    expect(store.map.has(ACTIVE_PLAN_KEY)).toBe(false);
  });
  it('produces presence only after full validation, not from a truthy object', async () => {
    const store = storage(); const port = createSyntheticAdapter(() => store), presence = createActivePlanPresencePort(port);
    expect(await presence.load()).toEqual({ status: 'absent' });
    store.map.set(ACTIVE_PLAN_KEY, '{}'); expect(await presence.load()).toEqual({ status: 'error' });
    store.map.set(ACTIVE_PLAN_KEY, rawPlan()); expect(await presence.load()).toEqual({ status: 'valid', planId: 'v' });
  });
  it('does not overwrite concurrent changed bytes and needs a successful inspection to recover', async () => {
    const store = storage(), port = createSyntheticAdapter(() => store); await port.load();
    store.map.set(ACTIVE_PLAN_KEY, 'foreign');
    expect((await port.save(fixture(), current)).status).toBe('blocked');
    expect(store.map.get(ACTIVE_PLAN_KEY)).toBe('foreign');
    store.map.set(ACTIVE_PLAN_KEY, rawPlan());
    expect((await port.save(fixture(), current)).status).toBe('blocked');
    expect((await port.load()).status).toBe('loaded');
    expect((await port.save(fixture(), current)).status).toBe('saved');
  });
  it('rejects unsafe and overbudget candidates before any write, preserving the loaded plan', async () => {
    const store = storage(); store.map.set(ACTIVE_PLAN_KEY, rawPlan()); const port = createSyntheticAdapter(() => store); await port.load();
    const old = store.map.get(ACTIVE_PLAN_KEY), plan = fixture();
    const over = buildActivePlanEnvelope(plan.inputs, [{ id: 'over', instances: plan.variants[0].instances.map(item => ({ ...item, selectedServings: decimal('10') })) }], 'over');
    expect((await port.save(over, current)).status).toBe('error');
    expect((await port.save(fixture({ restrictions: ['no-fish'] }), current)).status).toBe('error');
    expect(store.map.get(ACTIVE_PLAN_KEY)).toBe(old);
  });
});
