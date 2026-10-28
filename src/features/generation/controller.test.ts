import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createActivePlanAdapter, ACTIVE_PLAN_KEY } from '../../adapters/activePlan';
import type { ActivePlanLoadResult, ActivePlanPort, ActivePlanSaveResult } from '../../adapters/activePlan';
import { buildAppliedSettings } from '../../domain/appliedSettings';
import type { Catalog } from '../../domain/catalog';
import { buildActivePlanEnvelope, createPlanInputs, createRecipeInstances, mealSlots } from '../../domain/plan';
import type { GenerationPort, GenerationResult } from '../../domain/plan';
import { createDraft } from '../../domain/settings';
import { decimal } from '../../domain/quantities';
import { createGenerationController } from './controller';

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
function setup(generation?: GenerationPort) {
  const map = new Map<string, string>(); let failWrite = false;
  const port = createActivePlanAdapter(() => ({ getItem: key => map.get(key) ?? null, setItem(key, value) { if (failWrite) throw new Error('quota'); map.set(key, value); } }));
  const generate = vi.fn<GenerationPort['generate']>(generation?.generate ?? (async request => ({ status: 'success', plan: fixture(request.inputs.seed).plan })));
  const controller = createGenerationController({ generation: { generate }, activePlan: port, clock: { now: () => Date.now() } });
  return { controller, map, port, generate, failWrite: (value: boolean) => { failWrite = value; } };
}
describe('generation lifecycle', () => {
  beforeEach(() => vi.useFakeTimers()); afterEach(() => vi.useRealTimers());
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
});
