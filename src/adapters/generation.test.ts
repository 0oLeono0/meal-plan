import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildAppliedSettings } from '../domain/appliedSettings';
import type { Catalog, CatalogPort, Recipe } from '../domain/catalog';
import { createPlanSearch } from '../domain/generatePlan';
import { createPlanInputs, mealSlots } from '../domain/plan';
import type { GenerationRequest, GenerationResult } from '../domain/plan';
import { projectPlan } from '../domain/planProjection';
import { decimal } from '../domain/quantities';
import { createDraft } from '../domain/settings';
import { createLocalCatalog } from './catalog';
import { createLocalGeneration, createVersionedGeneration } from './generation';
import { bundledCatalog, sourceApprovedCatalogPorts } from '../data/catalog';

// Test-only synthetic 60-recipe catalog: no source/data acceptance claim.
const source = { sourceId: 'synthetic', recordId: 'benchmark', release: 'v1', license: 'CC0-1.0', url: 'https://example.org/test' };
function catalog(count = 1): Catalog {
  return { version: 'synthetic-benchmark-v1', foods: [{ productId: 'rice', profileId: 'rice-raw', name: 'Рис тестовый', identity: 'synthetic rice', state: 'raw', category: 'Тест',
    nutrition: { status: 'known', reference: { amount: '100', unit: 'g', basis: 'edible' }, values: { calories: '100', protein: '10', fat: '5', carbohydrates: '15' }, source },
    price: { status: 'known', amount: '10', currency: 'RUB', reference: { amount: '100', unit: 'g', basis: 'edible' }, source, region: 'Тест', observedAt: '2026-10-28', estimate: true },
    safety: { status: 'known', facts: [{ kind: 'restriction', key: 'vegetarian', suitable: true, evidence: [source] }] }, conversions: [] }],
    recipes: Array.from({ length: count }, (_, index): Recipe => ({ id: `recipe-${String(index).padStart(3, '0')}`, name: `Тест ${index}`, baseServings: decimal('2'),
      ingredients: [{ productId: 'rice', profileId: 'rice-raw', quantity: { amount: decimal(String(100 + index)), unit: 'g' } }], slots: mealSlots,
      cookingMinutes: 15, steps: ['Тест'], source })) };
}
function request(data = catalog(), days = '1'): GenerationRequest {
  const applied = buildAppliedSettings({ ...createDraft(), days, budget: '10000', restrictions: ['vegetarian'] });
  if (applied.status !== 'applied') throw new Error('Bad settings');
  return { requestId: 'request-1', inputs: createPlanInputs(applied.settings, data, { seed: 'test-seed', now: () => new Date(2026, 9, 28) }) };
}
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done; }); return { promise, resolve }; }
const tick = () => new Promise<void>(resolve => setTimeout(resolve, 0));
function expectError(result: GenerationResult, code: string) {
  expect(result.status).toBe('error'); if (result.status === 'error') expect(result.error.code).toBe(code);
}

describe('compiled version dispatch', () => {
  it('uses current source-approved release and rejects unknown or changed snapshots', async () => {
    const applied = buildAppliedSettings({ ...createDraft(), days: '1', budget: '2000' });
    if (applied.status !== 'applied') throw new Error('Invalid settings');
    const inputs = createPlanInputs(applied.settings, bundledCatalog, { seed: 'version-dispatch' });
    const producer = createVersionedGeneration(sourceApprovedCatalogPorts);
    const result = await producer.generate({ requestId: 'current', inputs }, new AbortController().signal);
    expect(result.status).toBe('success');
    if (result.status === 'success') expect(result.plan.inputs).toEqual(inputs);
    const unknown = await producer.generate({ requestId: 'unknown', inputs: { ...inputs, catalogVersion: 'unknown' } }, new AbortController().signal);
    expectError(unknown, 'GENERATION_DATA_INCOMPLETE');
    if (unknown.status === 'error') expect(unknown.error.diagnostics[0].code).toBe('UNSUPPORTED_CATALOG_VERSION');
    const changedCatalog = { ...bundledCatalog, recipes: bundledCatalog.recipes.slice(1) };
    const changed = createPlanInputs(applied.settings, changedCatalog, { seed: 'changed' });
    const refused = await producer.generate({ requestId: 'same-version-tamper', inputs: changed }, new AbortController().signal);
    expectError(refused, 'GENERATION_DATA_INCOMPLETE');
    if (refused.status === 'error') expect(refused.error.diagnostics[0].code).toBe('CATALOG_SNAPSHOT_MISMATCH');
  }, 30_000);
  it('retains cancellation and a shared deadline including deferred release loading', async () => {
    const data = catalog(2), gate = deferred<Awaited<ReturnType<CatalogPort['load']>>>();
    const port = { ...createLocalCatalog(data), load: () => gate.promise };
    const producer = createVersionedGeneration({ [data.version]: port }, { timeoutMs: 5 });
    const timed = await producer.generate(request(data), new AbortController().signal);
    expectError(timed, 'TIMEOUT');
    const abort = new AbortController();
    const cancelled = createVersionedGeneration({ [data.version]: port }).generate(request(data), abort.signal);
    abort.abort();
    expect((await cancelled).status).toBe('cancelled');
    gate.resolve({ status: 'loaded', catalog: data });
    await tick();
  });
});

describe('request options and one common deadline', () => {
  beforeEach(() => vi.useFakeTimers()); afterEach(() => vi.useRealTimers());
  it.each([0, 4, 1.5, NaN, null])('rejects malformed target %s before catalog load', async targetCount => {
    const load = vi.fn(async () => ({ status: 'loaded' as const, catalog: catalog() }));
    const adapter = createLocalGeneration({ ...createLocalCatalog(catalog()), load });
    const result = await adapter.generate({ ...request(), targetCount } as unknown as GenerationRequest, new AbortController().signal);
    expectError(result, 'GENERATION_DATA_INCOMPLETE'); expect(load).not.toHaveBeenCalled(); expect(vi.getTimerCount()).toBe(0);
  });
  it.each([Array(13).fill('x'), [''], ['x'.repeat(32769)], 'x', null])('rejects malformed exclusions before load: %s', async excludedFingerprints => {
    const load = vi.fn(async () => ({ status: 'loaded' as const, catalog: catalog() }));
    const result = await createLocalGeneration({ ...createLocalCatalog(catalog()), load }).generate({ ...request(), excludedFingerprints } as unknown as GenerationRequest, new AbortController().signal);
    expectError(result, 'GENERATION_DATA_INCOMPLETE'); expect(load).not.toHaveBeenCalled(); expect(vi.getTimerCount()).toBe(0);
  });
  it('detaches exclusions before catalog await and actually forwards target1/output exclusions', async () => {
    const data = catalog(), req = request(data), gate = deferred<Awaited<ReturnType<CatalogPort['load']>>>();
    const fingerprint = JSON.stringify(mealSlots.map(slot => [req.inputs.dates[0], slot, 'recipe-000', '2', '1']));
    const excludedFingerprints = [fingerprint];
    const running = createLocalGeneration({ ...createLocalCatalog(data), load: () => gate.promise }).generate({ ...req, targetCount: 1, excludedFingerprints }, new AbortController().signal);
    excludedFingerprints.length = 0; gate.resolve({ status: 'loaded', catalog: data });
    expectError(await running, 'SEARCH_EXHAUSTED'); expect(vi.getTimerCount()).toBe(0);
  });
  it.each([1, 3])('finishes target%s at29999ms and cleans its timer/listener', async targetCount => {
    const data = catalog(2), gate = deferred<Awaited<ReturnType<CatalogPort['load']>>>(), abort = new AbortController();
    const add = vi.spyOn(abort.signal, 'addEventListener'), remove = vi.spyOn(abort.signal, 'removeEventListener');
    const running = createLocalGeneration({ ...createLocalCatalog(data), load: () => gate.promise }).generate({ ...request(data), targetCount }, abort.signal);
    await vi.advanceTimersByTimeAsync(29999); gate.resolve({ status: 'loaded', catalog: data });
    const result = await running; expect(result.status).toBe('success');
    if (result.status === 'success') expect(result.plan.variants).toHaveLength(targetCount);
    expect(vi.getTimerCount()).toBe(0); expect(remove.mock.calls[0][1]).toBe(add.mock.calls[0][1]);
  });
  it.each([30000, 30001])('rejects a late catalog at%sms without a restarted deadline', async elapsed => {
    const data = catalog(2), gate = deferred<Awaited<ReturnType<CatalogPort['load']>>>();
    const running = createLocalGeneration({ ...createLocalCatalog(data), load: () => gate.promise }).generate({ ...request(data), targetCount: 1 }, new AbortController().signal);
    await vi.advanceTimersByTimeAsync(elapsed); expectError(await running, 'TIMEOUT');
    gate.resolve({ status: 'loaded', catalog: data }); await Promise.resolve(); expect(vi.getTimerCount()).toBe(0);
  });
  it.each([1, 3])('shares target%s catalog and stalled-yield time in one30s deadline', async targetCount => {
    const data = catalog(60), load = deferred<Awaited<ReturnType<CatalogPort['load']>>>(), yielded = deferred<void>();
    const yieldTask = vi.fn(() => yielded.promise);
    const running = createLocalGeneration({ ...createLocalCatalog(data), load: () => load.promise }, { yieldTask }).generate({ ...request(data), targetCount }, new AbortController().signal);
    await vi.advanceTimersByTimeAsync(25000); load.resolve({ status: 'loaded', catalog: data });
    await vi.advanceTimersByTimeAsync(0); expect(yieldTask).toHaveBeenCalledTimes(1);
    let settled = false; void running.then(() => { settled = true; });
    await vi.advanceTimersByTimeAsync(4999); expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1); expectError(await running, 'TIMEOUT');
    yielded.resolve(); await vi.advanceTimersByTimeAsync(1); expect(yieldTask).toHaveBeenCalledTimes(1); expect(vi.getTimerCount()).toBe(0);
  });
});

describe('local cooperative generation', () => {
  it('loads validated catalog and evaluates a real complete plan without artificial wait', async () => {
    const data = catalog(); let yields = 0;
    const result = await createLocalGeneration(createLocalCatalog(data), { yieldTask: async () => { yields++; } }).generate(request(data), new AbortController().signal);
    expect(result.status).toBe('success'); expect(yields).toBe(0);
    if (result.status === 'success') {
      const projected = projectPlan(result.plan.inputs, result.plan.variants[0]);
      expect(projected.status).toBe('projected');
      if (projected.status === 'projected') expect(projected.projection.costs.exact.purchase).toEqual(decimal('40'));
    }
  });
  it('uses actual default macrotask yields, allowing an abort timer to interrupt transitions', async () => {
    const data = catalog(60), controller = new AbortController();
    let pending = true, timerWhilePending = false;
    const timer = setTimeout(() => { timerWhilePending = pending; controller.abort(); }, 0);
    const result = await createLocalGeneration(createLocalCatalog(data)).generate(request(data, '7'), controller.signal);
    pending = false; clearTimeout(timer);
    expect(timerWhilePending).toBe(true); expect(result.status).toBe('cancelled');
  });
  it('stops after a cancelled injected scheduler without making further batches', async () => {
    const data = catalog(60), controller = new AbortController(), gate = deferred<void>();
    let yields = 0;
    const operation = createLocalGeneration(createLocalCatalog(data), { yieldTask: () => { yields++; return gate.promise; } }).generate(request(data), controller.signal);
    await tick(); expect(yields).toBe(1); controller.abort();
    expect((await operation).status).toBe('cancelled');
    gate.resolve(); await tick(); expect(yields).toBe(1);
  });
  it('does not turn late deferred catalog success into success after cancellation', async () => {
    const data = catalog(), controller = new AbortController(), gate = deferred<Awaited<ReturnType<CatalogPort['load']>>>();
    let loads = 0;
    const port = { ...createLocalCatalog(data), load: () => { loads++; return gate.promise; } };
    const operation = createLocalGeneration(port).generate(request(data), controller.signal);
    controller.abort(); expect((await operation).status).toBe('cancelled'); expect(loads).toBe(1);
    gate.resolve({ status: 'loaded', catalog: data }); await tick();
  });
  it('never begins catalog work for an already aborted request', async () => {
    const controller = new AbortController(); controller.abort(); let loads = 0;
    const port = { ...createLocalCatalog(catalog()), load: async () => { loads++; return { status: 'loaded' as const, catalog: catalog() }; } };
    expect((await createLocalGeneration(port).generate(request(), controller.signal)).status).toBe('cancelled'); expect(loads).toBe(0);
  });
  it('bounds a stalled catalog wait by timeout and ignores its late response', async () => {
    const data = catalog(), gate = deferred<Awaited<ReturnType<CatalogPort['load']>>>();
    const port = { ...createLocalCatalog(data), load: () => gate.promise };
    const result = await createLocalGeneration(port, { timeoutMs: 2 }).generate(request(data), new AbortController().signal);
    expectError(result, 'TIMEOUT'); gate.resolve({ status: 'loaded', catalog: data }); await tick();
  });
  it('bounds a stalled scheduler wait by timeout', async () => {
    const data = catalog(60), gate = deferred<void>();
    const result = await createLocalGeneration(createLocalCatalog(data), { timeoutMs: 30, yieldTask: () => gate.promise }).generate(request(data), new AbortController().signal);
    expectError(result, 'TIMEOUT'); gate.resolve();
  });
  it('validates the loaded shape and matching immutable catalog snapshot', async () => {
    const data = catalog();
    expectError(await createLocalGeneration(createLocalCatalog({})).generate(request(data), new AbortController().signal), 'GENERATION_DATA_INCOMPLETE');
    const changed = { ...data, version: 'different-version' };
    expectError(await createLocalGeneration(createLocalCatalog(changed)).generate(request(data), new AbortController().signal), 'GENERATION_DATA_INCOMPLETE');
    const dishonestPort = { ...createLocalCatalog(data), load: async () => ({ status: 'loaded' as const, catalog: { ...data, foods: [] } }) };
    expectError(await createLocalGeneration(dishonestPort).generate(request(data), new AbortController().signal), 'GENERATION_DATA_INCOMPLETE');
  });
  it('snapshots inputs before catalog await and handles thrown load/scheduler failures safely', async () => {
    const data = catalog(), gate = deferred<Awaited<ReturnType<CatalogPort['load']>>>();
    const input = { ...request(data), inputs: { ...request(data).inputs } };
    const operation = createLocalGeneration({ ...createLocalCatalog(data), load: () => gate.promise }).generate(input, new AbortController().signal);
    input.inputs.seed = 'mutated-later'; gate.resolve({ status: 'loaded', catalog: data });
    const result = await operation;
    expect(result.status).toBe('success'); if (result.status === 'success') expect(result.plan.inputs.seed).toBe('test-seed');
    expectError(await createLocalGeneration({ ...createLocalCatalog(data), load: async () => { throw new Error('private details'); } }).generate(request(data), new AbortController().signal), 'FAILED');
    const large = catalog(60);
    expectError(await createLocalGeneration(createLocalCatalog(large), { yieldTask: async () => { throw new Error('scheduler'); } }).generate(request(large), new AbortController().signal), 'FAILED');
  });
  it('preserves every domain failure distinction at the port boundary', async () => {
    const data = catalog(); const req = request(data);
    const noRecipes = { ...data, recipes: [] };
    expectError(await createLocalGeneration(createLocalCatalog(noRecipes)).generate(request(noRecipes), new AbortController().signal), 'NO_RECIPES');
    const incomplete = { ...data, foods: data.foods.map(food => ({ ...food, price: { status: 'unknown' as const, reason: 'missing' } })) };
    expectError(await createLocalGeneration(createLocalCatalog(incomplete)).generate(request(incomplete), new AbortController().signal), 'GENERATION_DATA_INCOMPLETE');
    const expensive = { ...data, foods: data.foods.map(food => ({ ...food, price: { ...food.price, status: 'known' as const, amount: '100000', currency: 'RUB' as const, reference: { amount: '100', unit: 'g' as const, basis: 'edible' as const }, source, region: 'test', observedAt: '2026-10-28', estimate: true as const } })) };
    expectError(await createLocalGeneration(createLocalCatalog(expensive)).generate(request(expensive), new AbortController().signal), 'BUDGET_TOO_LOW');
    expectError(await createLocalGeneration(createLocalCatalog(data), { search: { maxTransitions: 1 } }).generate(req, new AbortController().signal), 'SEARCH_EXHAUSTED');
  });
  it('measures the 60-recipe seven-day synthetic domain search with bounded work', () => {
    const data = catalog(60), req = request(data, '7');
    const search = createPlanSearch(req.inputs); let next = search.next(); let work = { transitions: 0, evaluatedCandidates: 0 };
    const start = performance.now();
    while (!next.done) { work = next.value; next = search.next(); }
    const domainMs = performance.now() - start;
    expect(next.value.status).toBe('success'); expect(work.evaluatedCandidates).toBeLessThanOrEqual(20000); expect(work.transitions).toBeLessThanOrEqual(200000);
    console.info('SYNTHETIC_DOMAIN_BENCHMARK', JSON.stringify({ recipes: 60, days: 7, ...work, domainMs }));
  });
  it('measures the 60-recipe seven-day synthetic cooperative adapter with real yields', async () => {
    const data = catalog(60), req = request(data, '7');
    let yields = 0; const adapterStart = performance.now();
    const result = await createLocalGeneration(createLocalCatalog(data), { yieldTask: async () => { yields++; await tick(); } }).generate(req, new AbortController().signal);
    expect(result.status).toBe('success'); expect(yields).toBeGreaterThan(0);
    console.info('SYNTHETIC_ADAPTER_BENCHMARK', JSON.stringify({ recipes: 60, days: 7, adapterMs: performance.now() - adapterStart, yields }));
  });
});
