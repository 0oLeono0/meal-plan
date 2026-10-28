import { describe, expect, it } from 'vitest';
import { buildAppliedSettings } from '../domain/appliedSettings';
import type { Catalog, CatalogPort, Recipe } from '../domain/catalog';
import { createPlanSearch } from '../domain/generatePlan';
import { createPlanInputs, mealSlots } from '../domain/plan';
import type { GenerationRequest, GenerationResult } from '../domain/plan';
import { projectPlan } from '../domain/planProjection';
import { decimal } from '../domain/quantities';
import { createDraft } from '../domain/settings';
import { createLocalCatalog } from './catalog';
import { createLocalGeneration } from './generation';

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
