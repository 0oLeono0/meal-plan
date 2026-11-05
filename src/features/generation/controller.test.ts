import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createActivePlanAdapter, ACTIVE_PLAN_KEY } from '../../adapters/activePlan';
import type { ActivePlanLoadResult, ActivePlanPort } from '../../adapters/activePlan';
import { buildAppliedSettings } from '../../domain/appliedSettings';
import type { Catalog } from '../../domain/catalog';
import { buildActivePlanEnvelope, createPlanInputs, createRecipeInstances, mealSlots } from '../../domain/plan';
import type { GenerationPort, GenerationResult } from '../../domain/plan';
import { createDraft } from '../../domain/settings';
import { decimal } from '../../domain/quantities';
import { createGenerationController as productionController } from './controller';
import type { GenerationControllerOptions } from './controller';
import { createTrustedCatalogRegistry } from '../../adapters/trustedCatalogs';
import legacyRaw from '../../test/fixtures/phase02-active-plan-v1.json?raw';

const origin = { returnRoute: '/plan/new', focusAnchor: 'generate' };
// Synthetic test catalog only. No production data or adapter depends on these values.
function fixture(seed = 'one') {
  const source = { sourceId: 'synthetic', recordId: 'test', release: 'v1', license: 'CC0-1.0', url: 'https://example.org/test' };
  const catalog: Catalog = { version: 'test-v1', foods: [{ productId: 'rice', profileId: 'raw', name: 'test', identity: 'test', state: 'raw', category: 'test',
    nutrition: { status: 'known', reference: { amount: '100', unit: 'g', basis: 'edible' }, values: { calories: '120', protein: '10', fat: '4', carbohydrates: '11' }, source },
    price: { status: 'known', amount: '1', currency: 'RUB', reference: { amount: '1', unit: 'g', basis: 'edible' }, source, region: 'test', observedAt: '2026-10-28', estimate: true },
    safety: { status: 'known', facts: [{ kind: 'restriction', key: 'no-gluten', suitable: true, evidence: [source] }] }, conversions: [] }], recipes: [{ id: 'r', name: 'test', baseServings: decimal('1'), ingredients: [{ productId: 'rice', profileId: 'raw', quantity: { amount: decimal('100'), unit: 'g' } }], slots: mealSlots, cookingMinutes: 15, steps: ['test'], source }] };
  const applied = buildAppliedSettings({ ...createDraft(), days: '1', people: '1', budget: '1000' });
  if (applied.status !== 'applied') throw new Error('fixture');
  const inputs = createPlanInputs(applied.settings, catalog, { seed, now: () => new Date(2026, 9, 28) });
  const plan = buildActivePlanEnvelope(inputs, [{ id: seed, instances: createRecipeInstances(inputs, ['r','r','r','r'], (date, slot) => `${seed}-${date}-${slot}`) }], seed);
  return { inputs, plan };
}
function deferred<T>() { let resolve!: (value: T) => void; let reject!: (reason: unknown) => void; const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
const trustedCatalogs = createTrustedCatalogRegistry([fixture().inputs.catalog]);
const createGenerationController = (options: GenerationControllerOptions) => productionController({ trustedCatalogs, ...options });

it('retains a real twelve-variant bundle and three-result candidate through quota and cancellation', async () => {
  const map = new Map([[ACTIVE_PLAN_KEY, legacyRaw]]); let quota = false;
  const port = createActivePlanAdapter(() => ({ getItem: key => map.get(key) ?? null,
    setItem(key, value) { if (quota) throw new Error('quota'); map.set(key, value); } }));
  const loaded = await port.load(); if (loaded.status !== 'loaded') throw new Error('legacy');
  const original = loaded.bundle.plan;
  const variants = Array.from({ length: 12 }, (_, i) => ({ id: `large-${i}`, instances: original.variants[0].instances.map(row => ({
    ...row, id: `large-${i}/${row.date}/${row.slot}`, selectedServings: decimal(((i + 5) / 10).toFixed(1)),
  })) }));
  const plan = buildActivePlanEnvelope(original.inputs, variants, variants[0].id);
  expect((await port.save(plan, { isCurrent: () => true })).status).toBe('saved');
  const bytes = map.get(ACTIVE_PLAN_KEY);
  const generate = vi.fn<GenerationPort['generate']>(async request => ({ status: 'success', plan: buildActivePlanEnvelope(request.inputs, variants.slice(0, 3), variants[0].id) }));
  const c = productionController({ generation: { generate }, activePlan: port }); await c.load(); quota = true;
  await c.recreateSet({ returnRoute: '/menu', focusAnchor: 'create-new-set' });
  expect(c.getSnapshot().status).toBe('memory-only');
  expect(c.getSnapshot().active?.plan).toEqual(plan);
  expect(c.getSnapshot().candidate?.plan.variants).toHaveLength(3);
  expect(map.get(ACTIVE_PLAN_KEY)).toBe(bytes);
  c.cancel();
  expect(c.getSnapshot().candidate).toBeNull(); expect(c.getSnapshot().active?.plan).toEqual(plan);
  expect(map.get(ACTIVE_PLAN_KEY)).toBe(bytes); expect(generate).toHaveBeenCalledTimes(1); c.dispose();
});
function setup(generation?: GenerationPort) {
  const map = new Map<string, string>(); let failWrite = false;
  const port = createActivePlanAdapter(() => ({ getItem: key => map.get(key) ?? null, setItem(key, value) { if (failWrite) throw new Error('quota'); map.set(key, value); } }), trustedCatalogs);
  const generate = vi.fn<GenerationPort['generate']>(generation?.generate ?? (async request => ({ status: 'success', plan: fixture(request.inputs.seed).plan })));
  const controller = createGenerationController({ generation: { generate }, activePlan: port, clock: { now: () => Date.now() } });
  return { controller, map, port, generate, failWrite: (value: boolean) => { failWrite = value; } };
}

describe('append operation ownership and deadlines', () => {
  beforeEach(() => vi.useFakeTimers()); afterEach(() => vi.useRealTimers());
  const menuOrigin = { returnRoute: '/menu', focusAnchor: 'append-variant' };
  function candidate(inputs = fixture().inputs) {
    return buildActivePlanEnvelope(inputs, [{ id: 'candidate', instances: fixture().plan.variants[0].instances.map(row => ({
      ...row, id: `candidate/${row.id}`, selectedServings: decimal('1.5'),
    })) }], 'candidate');
  }
  async function prepared(gate?: ReturnType<typeof deferred<GenerationResult>>, clock?: { now(): number }) {
    const real = setup(); await real.port.load(); await real.port.save(fixture().plan, { isCurrent: () => true });
    const generate = vi.fn<GenerationPort['generate']>(async request => gate ? gate.promise : ({ status: 'success', plan: candidate(request.inputs) }));
    const save = vi.fn<ActivePlanPort['save']>((...args) => real.port.save(...args));
    const c = createGenerationController({ generation: { generate }, activePlan: { load: () => real.port.load(), save }, clock }); await c.load();
    return { ...real, c, generate, save };
  }
  it('deduplicates identical direct starts before disabled UI can intervene', async () => {
    const gate = deferred<GenerationResult>(), { c, generate } = await prepared(gate);
    const one = c.start(fixture().inputs, menuOrigin), two = c.start(fixture().inputs, menuOrigin);
    expect(generate).toHaveBeenCalledTimes(1);
    c.cancel(); await Promise.all([one, two]); c.dispose();
  });
  it('deduplicates append and rejects late ignored-abort success after cancellation', async () => {
    const gate = deferred<GenerationResult>(), { c, map, generate, save } = await prepared(gate), bytes = map.get(ACTIVE_PLAN_KEY);
    const one = c.appendVariant(menuOrigin), two = c.appendVariant(menuOrigin);
    expect(generate).toHaveBeenCalledTimes(1); c.cancel(); await Promise.all([one, two]);
    gate.resolve({ status: 'success', plan: candidate() }); await vi.advanceTimersByTimeAsync(0);
    expect(map.get(ACTIVE_PLAN_KEY)).toBe(bytes); expect(save).not.toHaveBeenCalled(); expect(vi.getTimerCount()).toBe(0); c.dispose();
  });
  it.each([30000, 30001])('checks elapsed%sms even before a delayed timer callback can run', async elapsed => {
    let now = 0; const gate = deferred<GenerationResult>(), { c, map, save } = await prepared(gate, { now: () => now });
    const bytes = map.get(ACTIVE_PLAN_KEY), running = c.appendVariant(menuOrigin);
    now = elapsed; gate.resolve({ status: 'success', plan: candidate() }); await running;
    expect(save).not.toHaveBeenCalled(); expect(map.get(ACTIVE_PLAN_KEY)).toBe(bytes); expect(c.getSnapshot().error?.code).toBe('TIMEOUT'); c.dispose();
  });
  it('accepts29999ms success and rejects repeated retrySave after saved', async () => {
    let now = 0; const gate = deferred<GenerationResult>(), { c, generate, save } = await prepared(gate, { now: () => now });
    const running = c.appendVariant(menuOrigin); now = 29999; gate.resolve({ status: 'success', plan: candidate() }); await running;
    expect(c.getSnapshot().active?.plan.variants).toHaveLength(2); await c.retrySave();
    expect(generate).toHaveBeenCalledTimes(1); expect(save).toHaveBeenCalledTimes(1); c.dispose();
  });
  it.each(['cancel', 'dispose', 'reload', 'recreate'] as const)('does not apply late append after%s', async action => {
    const gate = deferred<GenerationResult>(), { c, map, generate } = await prepared(gate), bytes = map.get(ACTIVE_PLAN_KEY);
    const running = c.appendVariant(menuOrigin);
    if (action === 'cancel') c.cancel();
    else if (action === 'dispose') c.dispose();
    else if (action === 'reload') await c.load();
    else { generate.mockImplementation(async request => ({ status: 'success', plan: candidate(request.inputs) })); await c.recreateSet(menuOrigin); }
    const after = c.getSnapshot().active, afterBytes = map.get(ACTIVE_PLAN_KEY);
    gate.resolve({ status: 'success', plan: candidate() }); await running; await vi.advanceTimersByTimeAsync(0);
    expect(c.getSnapshot().active).toEqual(after); expect(map.get(ACTIVE_PLAN_KEY)).toBe(afterBytes);
    if (action !== 'recreate') expect(afterBytes).toBe(bytes); c.dispose();
  });
  it('blocks external byte conflict and retries the same memory candidate without search', async () => {
    const gate = deferred<GenerationResult>(), { c, map, generate, save } = await prepared(gate);
    const running = c.appendVariant(menuOrigin); map.set(ACTIVE_PLAN_KEY, 'external exact bytes');
    gate.resolve({ status: 'success', plan: candidate() }); await running;
    expect(c.getSnapshot().status).toBe('memory-only'); const held = c.getSnapshot().candidate;
    await c.retrySave(); expect(c.getSnapshot().candidate).toEqual(held); expect(generate).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledTimes(2); expect(map.get(ACTIVE_PLAN_KEY)).toBe('external exact bytes'); c.dispose();
  });
  it('never saves a duplicate semantic result or a mismatched input snapshot', async () => {
    for (const invalid of [fixture().plan, fixture('different-inputs').plan]) {
      const gate = deferred<GenerationResult>(), { c, map, save } = await prepared(gate), bytes = map.get(ACTIVE_PLAN_KEY);
      const running = c.appendVariant(menuOrigin); gate.resolve({ status: 'success', plan: invalid }); await running;
      expect(save).not.toHaveBeenCalled(); expect(map.get(ACTIVE_PLAN_KEY)).toBe(bytes); expect(c.getSnapshot().status).toBe('error'); c.dispose();
    }
  });
});

describe('guarded alternative selection', () => {
  beforeEach(() => vi.useFakeTimers()); afterEach(() => vi.useRealTimers());
  const menuOrigin = { returnRoute: '/menu', focusAnchor: 'variants' };
  function alternatives() {
    const first = fixture();
    return buildActivePlanEnvelope(first.inputs, ['1', '1.5', '2'].map((servings, index) => ({ id: `v${index}`,
      instances: first.plan.variants[0].instances.map(row => ({ ...row, id: `v${index}/${row.id}`, selectedServings: decimal(servings) })) })), 'v0');
  }
  async function selectionSetup(delay?: ReturnType<typeof deferred<void>>) {
    const real = setup(), plan = alternatives();
    await real.port.load(); await real.port.save(plan, { isCurrent: () => true });
    const save = vi.fn<ActivePlanPort['save']>(async (...args) => { if (delay) await delay.promise; return real.port.save(...args); });
    const c = createGenerationController({ generation: { generate: real.generate }, activePlan: { load: () => real.port.load(), save } });
    await c.load();
    return { ...real, c, save, plan };
  }
  it('appends one detached candidate with exact saved inputs and retries only its write', async () => {
    const real = setup(), plan = alternatives();
    await real.port.load(); await real.port.save(plan, { isCurrent: () => true });
    const generate = vi.fn<GenerationPort['generate']>(async request => ({ status: 'success', plan: buildActivePlanEnvelope(request.inputs,
      [{ id: 'new', instances: plan.variants[0].instances.map(row => ({ ...row, id: `new/${row.id}`, selectedServings: decimal('1.75') })) }], 'new') }));
    const c = createGenerationController({ generation: { generate }, activePlan: real.port }); await c.load();
    const bytes = real.map.get(ACTIVE_PLAN_KEY); real.failWrite(true);
    await c.appendVariant(menuOrigin);
    expect(generate).toHaveBeenCalledTimes(1);
    expect(generate.mock.calls[0][0].inputs).toEqual(plan.inputs);
    expect(generate.mock.calls[0][0].targetCount).toBe(1);
    expect(generate.mock.calls[0][0].excludedFingerprints).toHaveLength(3);
    expect(c.getSnapshot().active?.plan).toEqual(plan); expect(real.map.get(ACTIVE_PLAN_KEY)).toBe(bytes);
    const candidate = c.getSnapshot().candidate;
    expect(candidate?.plan.variants).toHaveLength(4);
    expect(candidate?.plan.variants.slice(0, 3)).toEqual(plan.variants);
    real.failWrite(false); await c.retrySave();
    expect(c.getSnapshot().active).toEqual(candidate); expect(generate).toHaveBeenCalledTimes(1);
    await c.retrySave(); expect(generate).toHaveBeenCalledTimes(1); c.dispose();
  });
  it('installs only saved selection and keeps every consumer and byte unchanged before acknowledgement', async () => {
    const gate = deferred<void>(), { c, save, map, generate, plan } = await selectionSetup(gate), bytes = map.get(ACTIVE_PLAN_KEY);
    const running = c.selectVariant('v1', menuOrigin); await vi.advanceTimersByTimeAsync(0);
    expect(c.getSnapshot().status).toBe('saving'); expect(c.getSnapshot().active?.plan.activeVariantId).toBe('v0');
    expect(c.getSnapshot().candidate?.plan.activeVariantId).toBe('v1'); expect(map.get(ACTIVE_PLAN_KEY)).toBe(bytes);
    gate.resolve(); await running;
    expect(c.getSnapshot().active?.plan).toEqual({ ...plan, activeVariantId: 'v1' });
    expect(c.getSnapshot().active?.projections.map(row => row.costs.exact.purchase)).toEqual([decimal('400'), decimal('600'), decimal('800')]);
    expect(save).toHaveBeenCalledTimes(1); expect(generate).not.toHaveBeenCalled();
    await c.selectVariant('v1', menuOrigin); await c.selectVariant('absent', menuOrigin);
    expect(save).toHaveBeenCalledTimes(1);
    for (const id of ['v2', 'v0']) { await c.selectVariant(id, menuOrigin); expect(c.getSnapshot().active?.plan.activeVariantId).toBe(id); }
    const loaded = await createActivePlanAdapter(() => ({ getItem: key => map.get(key) ?? null, setItem: vi.fn() }), trustedCatalogs).load();
    expect(loaded.status).toBe('loaded'); if (loaded.status === 'loaded') expect(loaded.bundle.plan).toEqual(plan);
    c.dispose();
  });
  it('retries a quota-failed selection without another generation or losing old bytes', async () => {
    const { c, map, failWrite, generate, save } = await selectionSetup(), bytes = map.get(ACTIVE_PLAN_KEY);
    failWrite(true); await c.selectVariant('v2', menuOrigin);
    expect(c.getSnapshot().status).toBe('memory-only'); expect(c.getSnapshot().saveError).toBe('error');
    expect(c.getSnapshot().active?.plan.activeVariantId).toBe('v0'); expect(map.get(ACTIVE_PLAN_KEY)).toBe(bytes);
    failWrite(false); await c.retrySave();
    expect(c.getSnapshot().active?.plan.activeVariantId).toBe('v2'); expect(save).toHaveBeenCalledTimes(2); expect(generate).not.toHaveBeenCalled(); c.dispose();
  });
  it.each(['cancel', 'dispose'] as const)('%s rejects a late selection before the real final write', async action => {
    const gate = deferred<void>(), { c, map } = await selectionSetup(gate), bytes = map.get(ACTIVE_PLAN_KEY);
    const running = c.selectVariant('v1', menuOrigin); await vi.advanceTimersByTimeAsync(0);
    c[action](); await running; gate.resolve(); await vi.advanceTimersByTimeAsync(0);
    expect(c.getSnapshot().active?.plan.activeVariantId).toBe('v0'); expect(map.get(ACTIVE_PLAN_KEY)).toBe(bytes); expect(vi.getTimerCount()).toBe(0);
  });
  it('a reloaded base revision cancels pending selection and leaves a usable idle state', async () => {
    const gate = deferred<void>(), { c, map } = await selectionSetup(gate), bytes = map.get(ACTIVE_PLAN_KEY);
    const running = c.selectVariant('v1', menuOrigin); await vi.advanceTimersByTimeAsync(0);
    await c.retryLoad(); gate.resolve(); await running;
    expect(c.getSnapshot().status).toBe('idle'); expect(c.getSnapshot().candidate).toBeNull();
    expect(c.getSnapshot().active?.plan.activeVariantId).toBe('v0'); expect(map.get(ACTIVE_PLAN_KEY)).toBe(bytes); expect(vi.getTimerCount()).toBe(0); c.dispose();
  });
  it('external storage bytes block selection and preserve the visible old active bundle', async () => {
    const { c, map, generate } = await selectionSetup(); map.set(ACTIVE_PLAN_KEY, 'external');
    await c.selectVariant('v1', menuOrigin);
    expect(c.getSnapshot().status).toBe('memory-only'); expect(c.getSnapshot().saveError).toBe('blocked');
    expect(map.get(ACTIVE_PLAN_KEY)).toBe('external'); expect(c.getSnapshot().active?.plan.activeVariantId).toBe('v0'); expect(generate).not.toHaveBeenCalled(); c.dispose();
  });
  it('does not publish a new shortage count before the new generation is saved', async () => {
    const plan = alternatives(); let calls = 0;
    const real = setup({ generate: async () => ({ status: 'success', plan: ++calls === 1 ? fixture().plan : plan }) });
    await real.controller.load(); await real.controller.start(fixture().inputs, origin);
    expect(real.controller.getSnapshot().initialSearchCount).toBe(1);
    real.failWrite(true); await real.controller.start(fixture().inputs, origin);
    expect(real.controller.getSnapshot().status).toBe('memory-only');
    expect(real.controller.getSnapshot().initialSearchCount).toBe(1);
    real.failWrite(false); await real.controller.retrySave();
    expect(real.controller.getSnapshot().initialSearchCount).toBe(3); real.controller.dispose();
  });
});
describe('generation lifecycle', () => {
  beforeEach(() => vi.useFakeTimers()); afterEach(() => vi.useRealTimers());
  it.each(['unknown-version', 'altered-facts'] as const)('does not promote a custom port loaded %s plan or permit writes', async kind => {
    const original = fixture().inputs.catalog, food = original.foods[0];
    if (food.price.status !== 'known') throw new Error('fixture');
    const catalog = kind === 'unknown-version' ? { ...original, version: 'unregistered' }
      : { ...original, foods: [{ ...food, price: { ...food.price, amount: '0.0000001' } }] };
    const inputs = createPlanInputs(fixture().inputs.appliedSettings, catalog, { seed: 'forged', now: () => new Date(2026, 9, 28) });
    const plan = buildActivePlanEnvelope(inputs, [{ id: 'forged', instances: createRecipeInstances(inputs, ['r', 'r', 'r', 'r'], (date, slot) => `${date}-${slot}`) }], 'forged');
    const save = vi.fn<ActivePlanPort['save']>();
    const c = createGenerationController({ generation: { generate: async () => ({ status: 'success', plan: fixture().plan }) },
      activePlan: { load: async () => ({ status: 'loaded', bundle: { plan, projections: [] } }), save } });
    await c.load();
    expect(c.getSnapshot().loadStatus).toBe('corrupt'); expect(c.getSnapshot().presence.status).toBe('error');
    expect(c.getSnapshot().active).toBeNull();
    await c.start(fixture().inputs, origin); await c.retrySave();
    expect(c.getSnapshot().saveError).toBe('blocked'); expect(save).not.toHaveBeenCalled(); c.dispose();
  });
  it('rejects untrusted generated facts before save even with an internally matching request', async () => {
    const original = fixture().inputs.catalog, food = original.foods[0];
    if (food.nutrition.status !== 'known') throw new Error('fixture');
    const catalog = { ...original, foods: [{ ...food, nutrition: { ...food.nutrition, values: { ...food.nutrition.values, calories: '0' } } }] };
    const inputs = createPlanInputs(fixture().inputs.appliedSettings, catalog, { seed: 'forged', now: () => new Date(2026, 9, 28) });
    const plan = buildActivePlanEnvelope(inputs, [{ id: 'forged', instances: createRecipeInstances(inputs, ['r', 'r', 'r', 'r'], (date, slot) => `${date}-${slot}`) }], 'forged');
    const save = vi.fn<ActivePlanPort['save']>();
    const c = createGenerationController({ generation: { generate: async () => ({ status: 'success', plan }) }, activePlan: { load: async () => ({ status: 'missing' }), save } });
    await c.load(); await c.start(inputs, origin);
    expect(c.getSnapshot().error?.code).toBe('GENERATION_DATA_INCOMPLETE');
    expect(c.getSnapshot().active).toBeNull(); expect(c.getSnapshot().candidate).toBeNull(); expect(save).not.toHaveBeenCalled(); c.dispose();
  });
  it('uses compiled catalog trust by default even when a custom port claims a synthetic plan loaded', async () => {
    const c = productionController({ generation: { generate: vi.fn() }, activePlan: { load: async () => ({ status: 'loaded', bundle: { plan: fixture().plan, projections: [] } }), save: vi.fn() } });
    await c.load(); expect(c.getSnapshot().loadStatus).toBe('corrupt'); expect(c.getSnapshot().presence.status).toBe('error'); c.dispose();
  });
  it('saves before promotion and reloads the exact active plan', async () => {
    const { controller: c, map, port } = setup(); await c.load();
    await c.start(fixture().inputs, origin);
    expect(c.getSnapshot().status).toBe('succeeded');
    expect(c.getSnapshot().active?.plan).toEqual(fixture().plan);
    expect(c.getSnapshot().lastApplied).toEqual(fixture().inputs.appliedSettings);
    expect(c.getSnapshot().presence).toEqual({ status: 'valid', planId: 'one' });
    expect((await port.load()).status).toBe('loaded'); expect(map.has(ACTIVE_PLAN_KEY)).toBe(true);
    expect(vi.getTimerCount()).toBe(0); c.dispose();
  });
  it('rotates at 2000ms and times out exactly at 30000ms even if generation ignores abort', async () => {
    const delayed = deferred<GenerationResult>(); const { controller: c, map, generate } = setup({ generate: () => delayed.promise });
    await c.load(); const running = c.start(fixture().inputs, origin);
    await vi.advanceTimersByTimeAsync(1999); expect(c.getSnapshot().pendingTextIndex).toBe(0);
    await vi.advanceTimersByTimeAsync(1); expect(c.getSnapshot().pendingTextIndex).toBe(1);
    await vi.advanceTimersByTimeAsync(27999); expect(c.getSnapshot().status).toBe('pending');
    await vi.advanceTimersByTimeAsync(1); await running;
    expect(c.getSnapshot().error?.code).toBe('TIMEOUT'); expect(generate.mock.calls[0][1].aborted).toBe(true);
    delayed.resolve({ status: 'success', plan: fixture().plan }); await vi.advanceTimersByTimeAsync(0);
    expect(map.size).toBe(0); expect(c.getSnapshot().active).toBeNull(); expect(vi.getTimerCount()).toBe(0);
  });
  it.each(['cancel', 'dispose'] as const)('%s prevents late generation from writing or applying', async action => {
    const delayed = deferred<GenerationResult>(); const { controller: c, map } = setup({ generate: () => delayed.promise });
    await c.load(); const running = c.start(fixture().inputs, origin); c[action](); await running;
    delayed.resolve({ status: 'success', plan: fixture().plan }); await vi.advanceTimersByTimeAsync(0);
    expect(c.getSnapshot().active).toBeNull(); expect(map.size).toBe(0); expect(vi.getTimerCount()).toBe(0);
    expect(c.getSnapshot().origin).toEqual(origin);
  });
  it('supersedes an old deferred response and uses increasing canonical request IDs', async () => {
    const first = deferred<GenerationResult>(); let calls = 0;
    const { controller: c, generate } = setup({ generate: async request => ++calls === 1 ? first.promise : { status: 'success', plan: fixture(request.inputs.seed).plan } });
    await c.load(); const one = c.start(fixture().inputs, origin); await c.start(fixture('two').inputs, origin); await one;
    first.resolve({ status: 'success', plan: fixture().plan }); await vi.advanceTimersByTimeAsync(0);
    expect(c.getSnapshot().active?.plan.activeVariantId).toBe('two');
    expect(generate.mock.calls.map(call => call[0].requestId)).toEqual(['1', '2']);
  });
  it('retains old active and distinct memory candidate; retry-save never searches again', async () => {
    const { controller: c, map, generate, failWrite } = setup(); await c.load(); await c.start(fixture().inputs, origin);
    const bytes = map.get(ACTIVE_PLAN_KEY); failWrite(true); await c.start(fixture('two').inputs, origin);
    expect(c.getSnapshot().status).toBe('memory-only'); expect(c.getSnapshot().saveError).toBe('error');
    expect(c.getSnapshot().active?.plan.activeVariantId).toBe('one'); expect(c.getSnapshot().candidate?.plan.activeVariantId).toBe('two');
    expect(map.get(ACTIVE_PLAN_KEY)).toBe(bytes); failWrite(false); await c.retrySave();
    expect(c.getSnapshot().status).toBe('succeeded'); expect(c.getSnapshot().active?.plan.activeVariantId).toBe('two'); expect(generate).toHaveBeenCalledTimes(2);
  });
  it('cannot bypass corrupt load prohibition by retrying save', async () => {
    const { controller: c, map, generate } = setup(); map.set(ACTIVE_PLAN_KEY, 'corrupt'); await c.load(); await c.start(fixture().inputs, origin); await c.retrySave();
    expect(c.getSnapshot().status).toBe('memory-only'); expect(c.getSnapshot().saveError).toBe('blocked');
    expect(map.get(ACTIVE_PLAN_KEY)).toBe('corrupt'); expect(generate).toHaveBeenCalledTimes(1);
    expect(c.getSnapshot().presence.status).toBe('error');
  });
  it('preserves typed error proof, diagnostics and original return/focus context on retry', async () => {
    const error = { code: 'BUDGET_TOO_LOW' as const, message: 'test', diagnostics: [{ code: 'SOURCE_UNKNOWN', path: 'source', message: 'test' }],
      budgetEvidence: { kind: 'lower-bound' as const, amount: decimal('1200'), proof: { method: 'test', catalogVersion: 'test-v1', evaluatedCandidates: 1, complete: false } } };
    const { controller: c, generate } = setup({ generate: async () => ({ status: 'error', error }) }); await c.load();
    const context = { ...origin, firstErroneousStep: 2 }; await c.start(fixture().inputs, context); await c.retryGeneration();
    expect(c.getSnapshot().error).toEqual(error); expect(c.getSnapshot().origin).toEqual(context); expect(generate).toHaveBeenCalledTimes(2); expect(vi.getTimerCount()).toBe(0);
  });
  it('serializes delayed saves and rejects cancelled final writes, including queued requests', async () => {
    const real = setup(), gate = deferred<void>(); let count = 0, writes = 0, inFlight = 0, max = 0;
    const port: ActivePlanPort = { load: () => real.port.load(), async save(plan, guard) {
      inFlight++; max = Math.max(max, inFlight); if (++count === 1) await gate.promise;
      const result = await real.port.save(plan, guard); if (result.status === 'saved') writes++; inFlight--; return result;
    } };
    const c = createGenerationController({ generation: { generate: async request => ({ status: 'success', plan: fixture(request.inputs.seed).plan }) }, activePlan: port });
    await c.load(); const first = c.start(fixture().inputs, origin); await vi.advanceTimersByTimeAsync(0); expect(c.getSnapshot().status).toBe('saving');
    const second = c.start(fixture('two').inputs, origin); await vi.advanceTimersByTimeAsync(0); c.cancel(); await Promise.all([first, second]);
    gate.resolve(); await vi.advanceTimersByTimeAsync(0);
    expect(writes).toBe(0); expect(max).toBe(1); expect(real.map.size).toBe(0); expect(c.getSnapshot().active).toBeNull();
  });
  it('late load retry cannot replace a newer successfully saved active plan', async () => {
    const real = setup(); await real.port.load(); await real.port.save(fixture().plan, { isCurrent: () => true });
    const old = await real.port.load(), read = deferred<ActivePlanLoadResult>(); let reads = 0;
    const c = createGenerationController({ generation: { generate: async () => ({ status: 'success', plan: fixture('two').plan }) }, activePlan: { load: async () => ++reads === 1 ? old : read.promise, save: (...args) => real.port.save(...args) } });
    await c.load(); const loading = c.retryLoad(); await c.start(fixture('two').inputs, origin); read.resolve(old); await loading;
    expect(c.getSnapshot().active?.plan.activeVariantId).toBe('two'); expect(c.getSnapshot().loadStatus).toBe('loaded');
  });
  it('notifies subscribers with stable immutable snapshots and stops after dispose', async () => {
    const { controller: c } = setup(); const listener = vi.fn(); const off = c.subscribe(listener); const snapshot = c.getSnapshot();
    expect(c.getSnapshot()).toBe(snapshot); await c.load(); expect(listener).toHaveBeenCalled(); expect(Object.isFrozen(c.getSnapshot())).toBe(true);
    off(); const count = listener.mock.calls.length; await c.start(fixture().inputs, origin); expect(listener).toHaveBeenCalledTimes(count); c.dispose();
  });
  it('a timeout during a delayed save preserves the old durable and active plan', async () => {
    const real = setup(); await real.port.load(); await real.port.save(fixture().plan, { isCurrent: () => true });
    const bytes = real.map.get(ACTIVE_PLAN_KEY), gate = deferred<void>();
    const c = createGenerationController({ generation: { generate: async () => ({ status: 'success', plan: fixture('two').plan }) },
      activePlan: { load: () => real.port.load(), async save(plan, guard) { await gate.promise; return real.port.save(plan, guard); } } });
    await c.load(); const running = c.start(fixture('two').inputs, origin); await vi.advanceTimersByTimeAsync(0);
    expect(c.getSnapshot().status).toBe('saving'); expect(c.getSnapshot().active?.plan.activeVariantId).toBe('one');
    await vi.advanceTimersByTimeAsync(30_000); await running; gate.resolve(); await vi.advanceTimersByTimeAsync(0);
    expect(c.getSnapshot().error?.code).toBe('TIMEOUT'); expect(c.getSnapshot().active?.plan.activeVariantId).toBe('one');
    expect(real.map.get(ACTIVE_PLAN_KEY)).toBe(bytes); expect(vi.getTimerCount()).toBe(0);
  });
  it('a current request waits for an obsolete save and then alone commits', async () => {
    const real = setup(), gate = deferred<void>(); let count = 0;
    const c = createGenerationController({ generation: { generate: async request => ({ status: 'success', plan: fixture(request.inputs.seed).plan }) },
      activePlan: { load: () => real.port.load(), async save(plan, guard) { if (++count === 1) await gate.promise; return real.port.save(plan, guard); } } });
    await c.load(); const first = c.start(fixture().inputs, origin); await vi.advanceTimersByTimeAsync(0);
    const second = c.start(fixture('two').inputs, origin); await vi.advanceTimersByTimeAsync(0);
    expect(count).toBe(1); gate.resolve(); await Promise.all([first, second]);
    expect(c.getSnapshot().status).toBe('succeeded'); expect(c.getSnapshot().active?.plan.activeVariantId).toBe('two');
    const reloaded = await real.port.load(); expect(reloaded.status).toBe('loaded');
    if (reloaded.status === 'loaded') expect(reloaded.bundle.plan.activeVariantId).toBe('two');
  });
  it('disposal invalidates a pending load and all later commands', async () => {
    const read = deferred<ActivePlanLoadResult>(), save = vi.fn<ActivePlanPort['save']>();
    const c = createGenerationController({ generation: { generate: vi.fn() }, activePlan: { load: () => read.promise, save } });
    const loading = c.load(); c.dispose(); const snapshot = c.getSnapshot(); read.resolve({ status: 'missing' }); await loading;
    await c.start(fixture().inputs, origin); await c.retrySave(); await c.load();
    expect(c.getSnapshot()).toBe(snapshot); expect(save).not.toHaveBeenCalled(); expect(vi.getTimerCount()).toBe(0);
  });
  it('treats rejected search and save promises as explicit recoverable failures', async () => {
    const real = setup(); const generation = { generate: vi.fn<GenerationPort['generate']>().mockRejectedValueOnce(new Error('search')).mockImplementation(async () => ({ status: 'success', plan: fixture().plan })) };
    const save = vi.fn<ActivePlanPort['save']>().mockRejectedValueOnce(new Error('storage')).mockImplementation((...args) => real.port.save(...args));
    const c = createGenerationController({ generation, activePlan: { load: () => real.port.load(), save } });
    await c.load(); await c.start(fixture().inputs, origin); expect(c.getSnapshot().error?.code).toBe('FAILED');
    await c.retryGeneration(); expect(c.getSnapshot().status).toBe('memory-only'); await c.retrySave();
    expect(c.getSnapshot().status).toBe('succeeded'); expect(generation.generate).toHaveBeenCalledTimes(2); expect(vi.getTimerCount()).toBe(0);
  });
  it('rejects a valid result for the wrong immutable request instead of saving it', async () => {
    const { controller: c, map } = setup({ generate: async () => ({ status: 'success', plan: fixture('other').plan }) });
    await c.load(); await c.start(fixture().inputs, origin);
    expect(c.getSnapshot().error?.code).toBe('GENERATION_DATA_INCOMPLETE'); expect(map.size).toBe(0); expect(vi.getTimerCount()).toBe(0);
  });
  it('finishes an overlapping initial read and unlocks save retry without repeating search', async () => {
    const real = setup(), read = deferred<ActivePlanLoadResult>();
    const inspected = await real.port.load();
    const generate = vi.fn<GenerationPort['generate']>(async () => ({ status: 'success', plan: fixture().plan }));
    const c = createGenerationController({ generation: { generate }, activePlan: { load: () => read.promise, save: (...args) => real.port.save(...args) } });
    const loading = c.load(); await c.start(fixture().inputs, origin);
    expect(c.getSnapshot().status).toBe('memory-only'); read.resolve(inspected); await loading;
    expect(c.getSnapshot().loadStatus).toBe('missing'); expect(c.getSnapshot().presence.status).toBe('absent');
    await c.retrySave(); expect(c.getSnapshot().status).toBe('succeeded'); expect(generate).toHaveBeenCalledTimes(1);
  });
  it('finishes a read after an invalid start without falsely leaving pending presence', async () => {
    const read = deferred<ActivePlanLoadResult>(), real = setup();
    const c = createGenerationController({ generation: { generate: vi.fn() }, activePlan: { load: () => read.promise, save: (...args) => real.port.save(...args) } });
    const loading = c.load(); await c.start({ ...fixture().inputs, seed: '' }, origin);
    read.resolve({ status: 'missing' }); await loading;
    expect(c.getSnapshot().status).toBe('error'); expect(c.getSnapshot().loadStatus).toBe('missing'); expect(c.getSnapshot().presence.status).toBe('absent');
  });
});
