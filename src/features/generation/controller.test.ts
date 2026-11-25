import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createActivePlanAdapter, ACTIVE_PLAN_KEY } from '../../adapters/activePlan';
import type { ActivePlanLoadResult, ActivePlanPort } from '../../adapters/activePlan';
import { createPantryInventoryAdapter, PANTRY_INVENTORY_KEY } from '../../adapters/pantryInventory';
import { buildAppliedSettings } from '../../domain/appliedSettings';
import type { Catalog } from '../../domain/catalog';
import { buildActivePlanEnvelope, createPlanInputs, createRecipeInstances, mealSlots, planCoordinates } from '../../domain/plan';
import type { CompletePlanEnvelope, EditedPlanEnvelope, GenerationPort, GenerationResult } from '../../domain/plan';
import { createDraft } from '../../domain/settings';
import { decimal } from '../../domain/quantities';
import { createGenerationController as productionController, visiblePlanSnapshot } from './controller';
import type { GenerationControllerOptions } from './controller';
import { createTrustedCatalogRegistry } from '../../adapters/trustedCatalogs';
import legacyRaw from '../../test/fixtures/phase02-active-plan-v1.json?raw';
import release1Raw from '../../test/fixtures/phase031-release1-active-plan.json?raw';
import release2Raw from '../../test/fixtures/phase031-release2-active-plan.json?raw';
import release3Raw from '../../test/fixtures/phase031-release3-active-plan.json?raw';
import { createVersionedGeneration } from '../../adapters/generation';
import { bundledCatalog, sourceApprovedCatalogPorts } from '../../data/catalog';
import { variantFingerprint } from '../../domain/generatePlan';
import { encodePlanEnvelope } from '../../domain/plan';

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

it('pantry-leftovers rejects a launch whose submitted stock differs from the confirmed fridge', async () => {
  const { inputs } = fixture('leftovers-guard');
  const values = new Map<string, string>();
  const store = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
  const generate = vi.fn<GenerationPort['generate']>(async () => ({ status: 'cancelled' }));
  const controller = createGenerationController({ generation: { generate }, activePlan: createActivePlanAdapter(() => store, trustedCatalogs),
    pantryInventory: createPantryInventoryAdapter(() => store) });
  try {
    await Promise.all([controller.load(), controller.loadPantry()]);
    expect(await controller.savePantry([{ productId: 'rice', quantity: '200', unit: 'g', expiresSoon: true }])).toBe(true);
    const guard = { pantry: controller.getSnapshot().pantry, mode: 'leftovers' } as const;
    await controller.start(inputs, origin, guard);
    expect(generate).not.toHaveBeenCalled();
    expect(values.get(ACTIVE_PLAN_KEY)).toBeUndefined();
    await controller.start({ ...inputs, pantrySnapshot: [{ productId: 'rice', expiresSoon: true, quantity: {
      status: 'known', value: { unit: 'g', amount: decimal('200') },
    } }] }, origin, guard);
    expect(generate).toHaveBeenCalledTimes(1);
    expect(generate.mock.calls[0][0].mode).toBe('leftovers');
  } finally { controller.dispose(); }
});

it('pantry-recalculate stale confirmation cannot silently acquire the latest stock revision', async () => {
  const { plan } = fixture('recalculate');
  const original = JSON.stringify({ schemaVersion: 1, plan: encodePlanEnvelope(plan) });
  const values = new Map([[ACTIVE_PLAN_KEY, original]]);
  const store = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
  const generate = vi.fn<GenerationPort['generate']>(async () => ({ status: 'error', error: { code: 'FAILED', message: 'Test refusal', diagnostics: [] } }));
  const controller = createGenerationController({ generation: { generate }, activePlan: createActivePlanAdapter(() => store, trustedCatalogs),
    pantryInventory: createPantryInventoryAdapter(() => store) });
  try {
    await Promise.all([controller.load(), controller.loadPantry()]);
    const row = { productId: 'rice', quantity: '200', unit: 'g', expiresSoon: false } as const;
    expect(await controller.savePantry([row])).toBe(true);
    const captured = controller.getSnapshot();
    expect(await controller.savePantry([{ ...row, quantity: '300' }])).toBe(true);
    const pantryOrigin = { returnRoute: '/pantry', focusAnchor: 'pantry-recalculate' };
    await controller.recreateSet(pantryOrigin, captured);
    expect(generate).not.toHaveBeenCalled();
    expect(values.get(ACTIVE_PLAN_KEY)).toBe(original);
    expect(visiblePlanSnapshot(controller.getSnapshot()).active?.projections[0].costs.exact.purchase).toEqual(decimal('100'));

    await controller.recreateSet(pantryOrigin, controller.getSnapshot());
    expect(generate).toHaveBeenCalledTimes(1);
    expect(generate.mock.calls[0][0].inputs.pantrySnapshot).toEqual([{ productId: 'rice', expiresSoon: false,
      quantity: { status: 'known', value: { unit: 'g', amount: decimal('300') } } }]);
    expect(controller.getSnapshot()).toMatchObject({ status: 'error', active: { plan } });
    expect(values.get(ACTIVE_PLAN_KEY)).toBe(original);
  } finally { controller.dispose(); }
});

it('pantry-recalculate append validates the live request and preserves the old variant proofs', async () => {
  const base = fixture('append-stock');
  const applied = buildAppliedSettings({ ...base.inputs.appliedSettings.raw, budget: '500' });
  if (applied.status !== 'applied') throw new Error('fixture');
  const inputs = { ...base.inputs, appliedSettings: applied.settings };
  const servings = (id: string, count: string) => ({ id, instances: base.plan.variants[0].instances.map(row => ({ ...row, id: `${id}-${row.slot}`, selectedServings: decimal(count) })) });
  const originalVariants = [servings('base', '1'), servings('older', '2')];
  const plan = buildActivePlanEnvelope(inputs, originalVariants, 'base');
  const row = { productId: 'rice', quantity: '350', unit: 'g', expiresSoon: false } as const;
  const proof = { variantId: 'older', rows: [row] };
  const original = JSON.stringify({ schemaVersion: 2, plan: encodePlanEnvelope(plan), admissionPantries: [proof] });
  const values = new Map([[ACTIVE_PLAN_KEY, original]]);
  const store = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
  let response: 'stale' | 'incomplete' | 'valid' = 'stale';
  const generate = vi.fn<GenerationPort['generate']>(async request => {
    const candidate = servings('generated', '2.25');
    if (response === 'incomplete') candidate.instances.pop();
    const resultInputs = response === 'stale' ? { ...request.inputs, pantrySnapshot: [{ productId: 'rice', expiresSoon: false,
      quantity: { status: 'known' as const, value: { unit: 'g' as const, amount: decimal('999') } } }] } : request.inputs;
    return { status: 'success', plan: { schemaVersion: 1, inputs: resultInputs, activeVariantId: candidate.id, variants: [candidate] } };
  });
  const adapter = createActivePlanAdapter(() => store, trustedCatalogs);
  const controller = createGenerationController({ generation: { generate }, activePlan: adapter, pantryInventory: createPantryInventoryAdapter(() => store) });
  try {
    await Promise.all([controller.load(), controller.loadPantry()]);
    const current = { ...row, quantity: '450' };
    expect(await controller.savePantry([current])).toBe(true);
    const pantryBytes = values.get(PANTRY_INVENTORY_KEY);
    for (const failure of ['stale', 'incomplete'] as const) {
      response = failure;
      await controller.appendVariant(origin);
      expect(controller.getSnapshot()).toMatchObject({ status: 'error', error: { code: 'GENERATION_DATA_INCOMPLETE' } });
      expect(values.get(ACTIVE_PLAN_KEY)).toBe(original);
    }
    response = 'valid';
    await controller.appendVariant(origin);
    expect(controller.getSnapshot().status).toBe('succeeded');
    expect(generate.mock.calls.every(([request]) => request.targetCount === 1 && request.inputs.pantrySnapshot[0]?.quantity.status === 'known')).toBe(true);
    expect(generate.mock.calls[2][0].inputs.pantrySnapshot[0]?.quantity).toEqual({ status: 'known', value: { unit: 'g', amount: decimal('450') } });
    const stored = await adapter.load();
    if (stored.status !== 'loaded') throw new Error('Append did not persist');
    expect(stored.bundle.plan.inputs).toEqual(inputs);
    expect(stored.bundle.plan.variants.slice(0, 2)).toEqual(originalVariants);
    expect(stored.bundle.admissionPantries).toEqual([proof, { variantId: 'append-3', rows: [current] }]);
    expect(values.get(PANTRY_INVENTORY_KEY)).toBe(pantryBytes);
  } finally { controller.dispose(); }
});

it('pantry-inventory projects every variant independently and keeps the last confirmation when reading fails', async () => {
  const base = fixture('live-stock');
  const second = { id: 'second', instances: base.plan.variants[0].instances.map(row => ({ ...row, id: `${row.id}-second`, selectedServings: decimal('2') })) };
  const plan = buildActivePlanEnvelope(base.inputs, [...base.plan.variants, second], base.plan.activeVariantId);
  const original = JSON.stringify({ schemaVersion: 1, plan: encodePlanEnvelope(plan) });
  const values = new Map([[ACTIVE_PLAN_KEY, original]]);
  let failRead = false;
  const store = { getItem(key: string) {
    if (failRead && key === PANTRY_INVENTORY_KEY) throw new Error('Read denied');
    return values.get(key) ?? null;
  }, setItem(key: string, value: string) { values.set(key, value); } };
  const active = createActivePlanAdapter(() => store, trustedCatalogs);
  const pantry = createPantryInventoryAdapter(() => store);
  const controller = createGenerationController({ generation: { async generate() { throw new Error('Inventory must not generate a menu'); } }, activePlan: active, pantryInventory: pantry });
  const quantities = () => visiblePlanSnapshot(controller.getSnapshot()).active?.projections.map(projection =>
    projection.rows.map(row => [row.required.amount, row.covered.amount, row.purchase.amount]));
  const expected = [[[decimal('400'), decimal('200'), decimal('200')]], [[decimal('800'), decimal('200'), decimal('600')]]];
  try {
    await Promise.all([controller.load(), controller.loadPantry()]);
    const row = { productId: 'rice', quantity: '0,2', unit: 'kg', expiresSoon: false } as const;
    expect(await controller.savePantry([row])).toBe(true);
    expect(values.get(ACTIVE_PLAN_KEY)).toBe(original);
    expect(quantities()).toEqual(expected);

    await controller.selectVariant(second.id, origin);
    expect(controller.getSnapshot().active?.plan.activeVariantId).toBe(second.id);
    expect(quantities()).toEqual(expected);

    const external = createPantryInventoryAdapter(() => store);
    await external.load();
    expect(await external.save([], { isCurrent: () => true })).toMatchObject({ status: 'saved' });
    expect(await controller.savePantry([{ ...row, quantity: '0,3' }])).toBe(false);
    expect(controller.getSnapshot().pantry?.writeStatus).toBe('conflict');
    expect(quantities()).toEqual(expected);
    failRead = true;
    await controller.loadPantry();
    expect(controller.getSnapshot().pantry).toMatchObject({ status: 'error', confirmed: { rows: [row] } });
    expect(quantities()).toEqual(expected);
    expect(await controller.retryPantrySave()).toBe(false);
    failRead = false;
    await controller.loadPantry();
    expect(controller.getSnapshot().pantry).toMatchObject({ status: 'loaded', confirmed: { rows: [] } });
    expect(quantities()).toEqual([[[decimal('400'), decimal('0'), decimal('400')]], [[decimal('800'), decimal('0'), decimal('800')]]]);
  } finally { controller.dispose(); }
});

it('pantry-recovery revokes an in-flight save when a newer stock record is read', async () => {
  const values = new Map<string, string>();
  const store = { getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); } };
  const pantry = createPantryInventoryAdapter(() => store);
  const other = createPantryInventoryAdapter(() => store);
  const writeGate = deferred<void>();
  const write = vi.fn(async (...args: Parameters<typeof pantry.save>) => {
    await writeGate.promise;
    return pantry.save(...args);
  });
  const controller = createGenerationController({ generation: { async generate() { throw new Error('No generation expected'); } },
    activePlan: createActivePlanAdapter(() => store, trustedCatalogs), pantryInventory: { ...pantry, save: write } });
  const row = { productId: 'rice', quantity: '200', unit: 'g', expiresSoon: false } as const;
  const newer = { ...row, quantity: '300' };
  try {
    await other.load();
    await controller.loadPantry();
    const saving = controller.savePantry([row]);
    expect(write).toHaveBeenCalledTimes(1);
    await other.save([newer], { isCurrent: () => true });
    const newerRaw = values.get(PANTRY_INVENTORY_KEY);
    await controller.loadPantry();
    expect(controller.getSnapshot().pantry).toMatchObject({ status: 'loaded', confirmed: { rows: [newer] }, writeStatus: 'idle' });
    writeGate.resolve();
    expect(await saving).toBe(false);
    expect(values.get(PANTRY_INVENTORY_KEY)).toBe(newerRaw);

    const previousView = controller.getSnapshot().pantry;
    await other.save([], { isCurrent: () => true });
    const emptyRaw = values.get(PANTRY_INVENTORY_KEY);
    await controller.loadPantry();
    expect(controller.getSnapshot().pantry).toMatchObject({ status: 'loaded', confirmed: { rows: [] } });
    expect(await controller.savePantry([row], previousView)).toBe(false);
    expect(values.get(PANTRY_INVENTORY_KEY)).toBe(emptyRaw);

    values.delete(PANTRY_INVENTORY_KEY);
    await controller.loadPantry();
    expect(controller.getSnapshot().pantry).toMatchObject({ status: 'error', confirmed: { rows: [] } });
    expect(await controller.savePantry([row])).toBe(false);
    expect(values.has(PANTRY_INVENTORY_KEY)).toBe(false);
  } finally { writeGate.resolve(); controller.dispose(); }
});

it('pantry-recovery keeps the newer confirmation when an older read resolves out of order', async () => {
  const initial = deferred<{ status: 'corrupt' }>();
  const row = { productId: 'rice', quantity: '300', unit: 'g', expiresSoon: false } as const;
  const store = { getItem: () => null, setItem: vi.fn() };
  const inventory = { schemaVersion: 1, token: 'a'.repeat(32), rows: [row] } as const;
  const load = vi.fn<NonNullable<GenerationControllerOptions['pantryInventory']>['load']>()
    .mockImplementationOnce(() => initial.promise)
    .mockResolvedValueOnce({ status: 'loaded', inventory });
  const controller = createGenerationController({ generation: { async generate() { throw new Error('No generation expected'); } },
    activePlan: createActivePlanAdapter(() => store, trustedCatalogs),
    pantryInventory: { load, save: async () => ({ status: 'blocked' }) } });
  try {
    const olderRead = controller.loadPantry();
    await controller.loadPantry();
    initial.resolve({ status: 'corrupt' });
    await olderRead;
    expect(controller.getSnapshot().pantry).toMatchObject({ status: 'loaded', confirmed: inventory, writeStatus: 'idle' });
  } finally { controller.dispose(); }
});

it.each(['before-event', 'unreadable', 'already-committed'] as const)('pantry-edit-race honors the actual final write boundary for %s inventory', async timing => {
  const { plan } = fixture('stock-write-race');
  const initial = JSON.stringify({ schemaVersion: 1, plan: encodePlanEnvelope(plan) });
  const values = new Map([[ACTIVE_PLAN_KEY, initial]]);
  const store = { getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); } };
  const active = createActivePlanAdapter(() => store, trustedCatalogs);
  const inventory = createPantryInventoryAdapter(() => store);
  const other = createPantryInventoryAdapter(() => store);
  const entered = deferred<void>(), release = deferred<void>();
  const save = vi.fn<ActivePlanPort['save']>(async (...args) => {
    if (timing === 'already-committed') {
      const result = await active.save(...args);
      entered.resolve();
      await release.promise;
      return result;
    }
    entered.resolve();
    await release.promise;
    return active.save(...args);
  });
  const controller = createGenerationController({ generation: { generate: vi.fn() }, activePlan: { ...active, save }, pantryInventory: inventory });
  try {
    await Promise.all([controller.load(), controller.loadPantry(), other.load()]);
    const base = controller.getSnapshot().active!.plan;
    const instance = base.variants[0].instances[0];
    const target = { variantId: base.activeVariantId, instanceId: instance.id, recipeId: instance.recipeId, date: instance.date, slot: instance.slot };
    const saving = controller.changePortions(target, '2', base, origin);
    await entered.promise;
    if (timing === 'unreadable') values.set(PANTRY_INVENTORY_KEY, '{ bad');
    else expect((await other.save([{ productId: 'rice', quantity: '200', unit: 'g', expiresSoon: false }], { isCurrent: () => true })).status).toBe('saved');
    if (timing !== 'before-event') {
      await controller.loadPantry();
      expect(controller.getSnapshot().candidate).toBeNull();
    }
    release.resolve();
    await saving;
    await controller.retrySave();
    expect(save).toHaveBeenCalledTimes(1);
    const displayed = visiblePlanSnapshot(controller.getSnapshot());
    expect(displayed.candidate).toBeNull();
    expect(displayed.status).toBe(timing === 'already-committed' ? 'succeeded' : 'idle');
    expect(displayed.active?.plan.variants[0].instances[0].selectedServings).toEqual(decimal(timing === 'already-committed' ? '2' : '1'));
    if (timing === 'already-committed') {
      expect(values.get(ACTIVE_PLAN_KEY)).not.toBe(initial);
      expect(displayed.active?.projections[0].costs.exact.purchase).toEqual(decimal('300'));
    } else expect(values.get(ACTIVE_PLAN_KEY)).toBe(initial);
  } finally { release.resolve(); controller.dispose(); }
});

it('phase04-remove rejects a valid edited envelope as a generation response and retains stored bytes', async () => {
  const base = fixture('empty-response');
  const initial = JSON.stringify({ schemaVersion: 1, plan: encodePlanEnvelope(base.plan) });
  let raw = initial;
  const store = { getItem: () => raw, setItem: (_key: string, value: string) => { raw = value; } };
  const partial: EditedPlanEnvelope = { ...base.plan, schemaVersion: 2, variants: base.plan.variants.map(row =>
    ({ ...row, instances: [], emptySlots: planCoordinates(base.inputs.dates) })) };
  const generation: GenerationPort = { async generate() { return { status: 'success', plan: partial as unknown as CompletePlanEnvelope }; } };
  const controller = createGenerationController({ generation, activePlan: createActivePlanAdapter(() => store, trustedCatalogs) });
  try {
    await controller.load();
    await controller.recreateSet(origin);
    expect(controller.getSnapshot()).toMatchObject({ status: 'error', error: { code: 'GENERATION_DATA_INCOMPLETE' }, active: { plan: base.plan } });
    expect(raw).toBe(initial);
  } finally { controller.dispose(); }
});

it('phase04-add append deduplicates exclusions, rejects duplicates, and preserves all manual variants', async () => {
  const base = fixture('manual');
  const instances = (id: string, portions = '1') => base.plan.variants[0].instances.map(row => ({ ...row, id: `${id}/${row.slot}`, selectedServings: decimal(portions) }));
  const manual: EditedPlanEnvelope = { ...base.plan, schemaVersion: 2, activeVariantId: 'manual-a', variants: [
    ...['manual-a', 'manual-b'].map(id => ({ id, instances: instances(id).slice(1), emptySlots: planCoordinates(base.inputs.dates).slice(0, 1) })),
    { id: 'complete', instances: instances('complete'), emptySlots: [] },
  ] };
  const initial = JSON.stringify({ schemaVersion: 1, plan: encodePlanEnvelope(manual) });
  let raw = initial;
  const store = { getItem: () => raw, setItem: (_key: string, value: string) => { raw = value; } };
  let duplicate = true;
  const generate = vi.fn<GenerationPort['generate']>(async request => ({ status: 'success', plan: buildActivePlanEnvelope(request.inputs,
    [{ id: 'generated', instances: instances('generated', duplicate ? '1' : '1.5') }], 'generated') }));
  const controller = createGenerationController({ generation: { generate }, activePlan: createActivePlanAdapter(() => store, trustedCatalogs) });
  try {
    await controller.load();
    await controller.appendVariant(origin);
    expect(generate.mock.calls[0][0].excludedFingerprints).toEqual([variantFingerprint(manual.variants[0]), variantFingerprint(manual.variants[2])]);
    expect(controller.getSnapshot()).toMatchObject({ status: 'error', active: { plan: manual } });
    expect(raw).toBe(initial);
    duplicate = false;
    await controller.appendVariant(origin);
    const active = controller.getSnapshot().active?.plan;
    expect(controller.getSnapshot().status).toBe('succeeded');
    expect(active?.schemaVersion).toBe(2);
    expect(active?.variants.slice(0, -1)).toEqual(manual.variants);
    expect(active?.variants[manual.variants.length]).toMatchObject({ id: 'append-4', emptySlots: [] });
    expect(await createActivePlanAdapter(() => store, trustedCatalogs).load()).toMatchObject({ status: 'loaded', bundle: { plan: active } });
  } finally { controller.dispose(); }
});

it('phase04-add refuses an older empty-slot selector after the position is filled', async () => {
  const base = fixture('refill');
  const edited: EditedPlanEnvelope = { ...base.plan, schemaVersion: 2, variants: [{
    ...base.plan.variants[0], instances: base.plan.variants[0].instances.slice(1), emptySlots: planCoordinates(base.inputs.dates).slice(0, 1),
  }] };
  let raw = JSON.stringify({ schemaVersion: 1, plan: encodePlanEnvelope(edited) });
  const store = { getItem: () => raw, setItem: (_key: string, value: string) => { raw = value; } };
  const controller = createGenerationController({ generation: { async generate() { throw new Error('Manual edits do not generate'); } }, activePlan: createActivePlanAdapter(() => store, trustedCatalogs) });
  try {
    await controller.load();
    const target = { kind: 'empty' as const, ...edited.variants[0].emptySlots[0], variantId: edited.activeVariantId };
    const lookedUp = await controller.mealAlternatives(target, new AbortController().signal);
    if (lookedUp.status !== 'ready') throw new Error('Missing choices');
    await controller.addMeal(target, 'r', lookedUp.revision, origin);
    const confirmed = raw;
    expect(controller.getSnapshot().status).toBe('succeeded');
    await controller.addMeal(target, 'r', lookedUp.revision, origin);
    expect(controller.getSnapshot()).toMatchObject({ status: 'error', error: { message: 'Меню изменилось. Обновите его перед новой правкой' } });
    expect(raw).toBe(confirmed);
  } finally { controller.dispose(); }
});

it('phase04-edit previews one candidate, restores the confirmed ledger on refusal, and retries the same edit', async () => {
  const base = fixture('meal-edit');
  const currentRecipe = base.inputs.catalog.recipes[0], replacement = { ...currentRecipe, id: 'alternative', name: 'Второе блюдо' };
  const catalog = { ...base.inputs.catalog, recipes: [currentRecipe, replacement] };
  const inputs = createPlanInputs(base.inputs.appliedSettings, catalog, { seed: 'meal-edit', now: () => new Date(2026, 9, 28) });
  const plan = buildActivePlanEnvelope(inputs, base.plan.variants, base.plan.activeVariantId);
  const registry = createTrustedCatalogRegistry([catalog]);
  const initial = JSON.stringify({ schemaVersion: 1, plan: encodePlanEnvelope(plan) });
  let raw = initial, resolveSave = deferred<'error' | 'write'>();
  const store = { getItem: () => raw, setItem: (_key: string, value: string) => { raw = value; } };
  const adapter = createActivePlanAdapter(() => store, registry);
  const port: ActivePlanPort = { load: adapter.load, async save(candidate, guard) {
    return await resolveSave.promise === 'write' ? adapter.save(candidate, guard) : { status: 'error' };
  } };
  const controller = productionController({ generation: { async generate() { throw new Error('Edit must not generate a menu'); } }, activePlan: port, trustedCatalogs: registry });
  try {
    await controller.load();
    const instance = plan.variants[0].instances[1];
    const target = { variantId: plan.activeVariantId, date: instance.date, slot: instance.slot, recipeId: instance.recipeId, instanceId: instance.id };
    const options = await controller.mealAlternatives(target, new AbortController().signal);
    if (options.status !== 'ready') throw new Error('No replacement candidates');
    const pending = controller.editMeal(target, replacement.id, options.revision, origin);
    expect(controller.getSnapshot().status).toBe('saving');
    expect(controller.getSnapshot().active?.plan).toEqual(plan);
    const edited = visiblePlanSnapshot(controller.getSnapshot()).active?.plan;
    expect(edited?.variants[0].instances.map(row => row.recipeId)).toEqual(['r', 'alternative', 'r', 'r']);
    expect(raw).toBe(initial);
    resolveSave.resolve('error'); await pending;
    expect(controller.getSnapshot()).toMatchObject({ status: 'memory-only', intent: 'edit', saveError: 'error' });
    expect(visiblePlanSnapshot(controller.getSnapshot()).active?.plan).toEqual(plan);
    expect(raw).toBe(initial);

    resolveSave = deferred();
    const retry = controller.retrySave();
    resolveSave.resolve('write'); await retry;
    expect(controller.getSnapshot()).toMatchObject({ status: 'succeeded', intent: 'edit' });
    expect((await createActivePlanAdapter(() => store, registry).load())).toMatchObject({ status: 'loaded', bundle: { plan: edited } });
    const confirmed = raw;
    await controller.editMeal(target, replacement.id, options.revision, origin);
    expect(controller.getSnapshot()).toMatchObject({ status: 'error', intent: 'edit', error: { message: 'Меню изменилось. Обновите его перед новой правкой' } });
    expect(raw).toBe(confirmed);
  } finally { controller.dispose(); }
});

it('phase04-portions guards the saved snapshot and rolls back an unconfirmed scale together with its calculations', async () => {
  const { inputs, plan } = fixture('portion-edit');
  const registry = createTrustedCatalogRegistry([inputs.catalog]);
  const initial = JSON.stringify({ schemaVersion: 1, plan: encodePlanEnvelope(plan) });
  let raw = initial, writes = 0, attempt = deferred<'error' | 'write'>();
  const store = { getItem: () => raw, setItem: (_key: string, value: string) => { raw = value; writes++; } };
  const adapter = createActivePlanAdapter(() => store, registry);
  const port: ActivePlanPort = { load: adapter.load, async save(candidate, guard) {
    return await attempt.promise === 'write' ? adapter.save(candidate, guard) : { status: 'error' };
  } };
  const controller = productionController({ generation: { async generate() { throw new Error('Portion editing must not generate a menu'); } }, activePlan: port, trustedCatalogs: registry });
  const targetRow = plan.variants[0].instances[0];
  const target = { variantId: plan.activeVariantId, instanceId: targetRow.id, date: targetRow.date, slot: targetRow.slot, recipeId: targetRow.recipeId };
  try {
    await controller.load();
    const old = controller.getSnapshot().active!.plan;
    const pending = controller.changePortions(target, '2', old, origin);
    expect(visiblePlanSnapshot(controller.getSnapshot()).active?.projections[0].costs.exact.purchase).toEqual(decimal('500'));
    expect(controller.getSnapshot().active?.projections[0].costs.exact.purchase).toEqual(decimal('400'));
    expect(raw).toBe(initial);
    attempt.resolve('error'); await pending;
    expect(writes).toBe(0);
    expect(controller.getSnapshot().status).toBe('memory-only');
    expect(visiblePlanSnapshot(controller.getSnapshot()).active?.projections[0].costs.exact.purchase).toEqual(decimal('400'));
    attempt = deferred();
    const retry = controller.retrySave();
    attempt.resolve('write'); await retry;
    const saved = controller.getSnapshot().active!.plan;
    expect(saved.variants[0].instances[0].selectedServings).toEqual(decimal('2'));
    expect(writes).toBe(1);
    await controller.changePortions(target, '2', saved, origin);
    expect(writes).toBe(1);
    await controller.changePortions(target, '1', old, origin);
    expect(controller.getSnapshot()).toMatchObject({ status: 'error', error: { message: 'Меню изменилось. Обновите его перед новой правкой' } });
    expect(writes).toBe(1);
  } finally { controller.dispose(); }
});

function delayedEdit(seed: string, clock?: GenerationControllerOptions['clock']) {
  const { inputs, plan } = fixture(seed);
  const registry = createTrustedCatalogRegistry([inputs.catalog]);
  const initial = JSON.stringify({ schemaVersion: 1, plan: encodePlanEnvelope(plan) });
  let raw: string | null = initial, denyRead = false;
  const entered = deferred<void>(), finish = deferred<void>();
  const setItem = vi.fn((_key: string, value: string) => { raw = value; });
  const adapter = createActivePlanAdapter(() => ({ getItem() {
    if (denyRead) throw new Error('Blocked read');
    return raw;
  }, setItem }), registry);
  const save = vi.fn<ActivePlanPort['save']>(async (...args) => {
    entered.resolve(); await finish.promise;
    return adapter.save(...args);
  });
  const controller = productionController({ generation: { async generate() { throw new Error('Editing does not generate'); } },
    activePlan: { load: adapter.load, save }, trustedCatalogs: registry, clock });
  const instance = plan.variants[0].instances[0];
  const target = { variantId: plan.activeVariantId, instanceId: instance.id, recipeId: instance.recipeId, date: instance.date, slot: instance.slot };
  return { controller, target, plan, initial, entered, finish, save, setItem, read: () => raw,
    update(next: string | null, unreadable = false) { raw = next; denyRead = unreadable; } };
}

it.each(['loaded', 'missing', 'corrupt', 'error'] as const)('phase04-edit refresh to %s retires the pending write and retry', async status => {
  const test = delayedEdit('edit-refresh');
  const { controller } = test;
  const newPlan = fixture('another-base').plan;
  const outside = status === 'loaded' ? JSON.stringify({ schemaVersion: 1, plan: encodePlanEnvelope(newPlan) })
    : status === 'missing' ? null : status === 'corrupt' ? '{bad-data' : test.initial;
  try {
    await controller.load();
    const pending = controller.changePortions(test.target, '2', controller.getSnapshot().active!.plan, origin);
    await test.entered.promise;
    test.update(outside, status === 'error');
    await controller.retryLoad();
    const afterRead = controller.getSnapshot();
    test.finish.resolve(); await pending;
    await controller.retrySave();
    expect(afterRead).toMatchObject({ status: 'idle', loadStatus: status, candidate: null });
    expect(controller.getSnapshot()).toMatchObject({ status: 'idle', loadStatus: status, candidate: null });
    expect(controller.getSnapshot().active?.plan).toEqual(status === 'loaded' ? newPlan : test.plan);
    expect(test.save).toHaveBeenCalledTimes(1);
    expect(test.setItem).not.toHaveBeenCalled();
    expect(test.read()).toBe(outside);
  } finally { controller.dispose(); test.finish.resolve(); }
});

it('phase04-edit detects new raw bytes, refuses duplicate and blocked retries, and reloads without writing', async () => {
  const test = delayedEdit('edit-conflict'), { controller } = test;
  const outside = JSON.stringify({ schemaVersion: 1, plan: encodePlanEnvelope(fixture('new-tab-plan').plan) });
  try {
    await controller.load();
    const base = controller.getSnapshot().active!.plan;
    const pending = controller.changePortions(test.target, '2', base, origin);
    await test.entered.promise;
    await controller.changePortions(test.target, '0.5', base, origin);
    test.update(outside); test.finish.resolve(); await pending;
    expect(controller.getSnapshot()).toMatchObject({ status: 'memory-only', saveError: 'blocked', active: { plan: base } });
    await controller.retrySave();
    await controller.changePortions(test.target, '0.5', base, origin);
    expect(test.save).toHaveBeenCalledTimes(1);
    await controller.retryLoad();
    expect(controller.getSnapshot()).toMatchObject({ status: 'idle', candidate: null, active: { plan: { activeVariantId: 'new-tab-plan' } } });
    expect(test.read()).toBe(outside);
    expect(test.setItem).not.toHaveBeenCalled();
  } finally { controller.dispose(); test.finish.resolve(); }
});

it('phase04-edit a late completion after its deadline cannot write or leave preview totals', async () => {
  let time = 0;
  const test = delayedEdit('edit-timeout', { now: () => time }), { controller } = test;
  try {
    await controller.load();
    const pending = controller.changePortions(test.target, '2', controller.getSnapshot().active!.plan, origin);
    await test.entered.promise;
    time = 30_001;
    test.finish.resolve(); await pending;
    expect(controller.getSnapshot()).toMatchObject({ status: 'error', error: { code: 'TIMEOUT' }, candidate: null });
    expect(visiblePlanSnapshot(controller.getSnapshot()).active?.plan).toEqual(test.plan);
    expect(test.setItem).not.toHaveBeenCalled();
    expect(test.read()).toBe(test.initial);
  } finally { controller.dispose(); test.finish.resolve(); }
});

it('phase04-edit confirms a real write that crossed the deadline inside setItem', async () => {
  const { plan } = fixture('edit-committed-at-deadline');
  const initial = JSON.stringify({ schemaVersion: 1, plan: encodePlanEnvelope(plan) });
  let raw = initial, time = 0;
  const storage = {
    getItem: () => raw,
    setItem: vi.fn((_key: string, value: string) => {
      raw = value;
      time = 30_001;
    }),
  };
  const adapter = createActivePlanAdapter(() => storage, trustedCatalogs);
  const controller = createGenerationController({ generation: { generate: vi.fn() }, activePlan: adapter, clock: { now: () => time } });
  try {
    await controller.load();
    const instance = plan.variants[0].instances[0];
    const target = { variantId: plan.activeVariantId, instanceId: instance.id, recipeId: instance.recipeId, date: instance.date, slot: instance.slot };
    await controller.changePortions(target, '2', controller.getSnapshot().active!.plan, origin);
    expect(storage.setItem).toHaveBeenCalledTimes(1);
    expect(raw).not.toBe(initial);
    const snapshot = visiblePlanSnapshot(controller.getSnapshot());
    expect(snapshot).toMatchObject({ status: 'succeeded', error: null, candidate: null });
    expect(snapshot.active?.plan.variants[0].instances[0].selectedServings).toEqual(decimal('2'));
    await expect(createActivePlanAdapter(() => storage, trustedCatalogs).load()).resolves.toEqual({ status: 'loaded', bundle: snapshot.active });
  } finally { controller.dispose(); }
});

it.each([
  ['historical52', legacyRaw], ['issued56', release1Raw], ['issued68', release2Raw], ['issued75', release3Raw], ['current82', null],
])('all-release continuation %s keeps exact inputs through load select append recreate and reload', async (_, recordedRaw) => {
  const generation = createVersionedGeneration(sourceApprovedCatalogPorts);
  let raw = recordedRaw;
  if (raw === null) {
    const applied = buildAppliedSettings({ ...createDraft(), days: '1', budget: '2000' });
    if (applied.status !== 'applied') throw new Error('Current fixture settings');
    const result = await generation.generate({ requestId: 'current82-fixture', inputs: createPlanInputs(applied.settings, bundledCatalog, { seed: 'continuation-current82' }) }, new AbortController().signal);
    if (result.status !== 'success') throw new Error('Current fixture generation');
    raw = JSON.stringify({ schemaVersion: 1, plan: encodePlanEnvelope(result.plan) });
  }
  const originalRaw = raw;
  const store = { getItem: () => raw, setItem: (_key: string, value: string) => { raw = value; } };
  const controller = productionController({ generation, activePlan: createActivePlanAdapter(() => store) });
  try {
    await controller.load(); expect(raw).toBe(originalRaw);
    const original = controller.getSnapshot().active!.plan;
    const exactInputs = original.inputs;
    await controller.appendVariant(origin);
    const appended = controller.getSnapshot().active!.plan;
    expect(controller.getSnapshot().error).toBeNull();
    expect(appended.variants).toHaveLength(original.variants.length + 1);
    expect(appended.variants.slice(0, original.variants.length)).toEqual(original.variants);
    expect(appended.inputs).toEqual(exactInputs);
    expect(new Set(appended.variants.map(variantFingerprint)).size).toBe(appended.variants.length);
    await controller.selectVariant(original.variants[0].id, origin);
    expect(controller.getSnapshot().active!.plan.activeVariantId).toBe(original.variants[0].id);
    const reloaded = await createActivePlanAdapter(() => store).load();
    expect(reloaded.status).toBe('loaded');
    if (reloaded.status === 'loaded') expect(reloaded.bundle.plan).toEqual(controller.getSnapshot().active!.plan);
    await controller.recreateSet(origin);
    const recreated = controller.getSnapshot().active!.plan;
    expect(controller.getSnapshot().error).toBeNull(); expect(recreated.variants).toHaveLength(3);
    expect(recreated.inputs).toEqual(exactInputs);
    for (const variant of recreated.variants) for (const instance of variant.instances) {
      expect(instance.catalogVersion).toBe(original.inputs.catalogVersion);
      expect(instance.recipeSnapshot).toEqual(original.inputs.catalog.recipes.find(row => row.id === instance.recipeId));
    }
    const finalRaw = raw;
    const final = await createActivePlanAdapter(() => store).load();
    expect(final.status).toBe('loaded'); expect(raw).toBe(finalRaw);
    if (final.status === 'loaded') expect(final.bundle.plan).toEqual(recreated);
  } finally { controller.dispose(); }
}, 30_000);

it('real legacy load select append recreate preserves original identities settings pantry dates and source facts', async () => {
  const values = new Map([[ACTIVE_PLAN_KEY, legacyRaw]]);
  const store = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
  const adapter = createActivePlanAdapter(() => store);
  const generation = createVersionedGeneration(sourceApprovedCatalogPorts);
  const controller = productionController({ generation, activePlan: adapter });
  await controller.load();
  const original = controller.getSnapshot().active!.plan;
  expect(original.inputs.catalogVersion).toBe('mealplan-2026-10-28-1');
  await controller.selectVariant(original.activeVariantId, origin);
  await controller.appendVariant(origin);
  const afterAppend = controller.getSnapshot();
  expect(afterAppend.error).toBeNull();
  expect(afterAppend.active!.plan.variants).toHaveLength(2);
  expect(afterAppend.active!.plan.inputs).toEqual(original.inputs);
  expect(afterAppend.active!.plan.variants[0]).toEqual(original.variants[0]);
  expect(variantFingerprint(afterAppend.active!.plan.variants[1])).not.toBe(variantFingerprint(original.variants[0]));
  await controller.selectVariant(original.activeVariantId, origin);
  expect(controller.getSnapshot().active!.plan.activeVariantId).toBe(original.activeVariantId);
  const reloaded = await createActivePlanAdapter(() => store).load();
  expect(reloaded.status).toBe('loaded');
  if (reloaded.status === 'loaded') expect(reloaded.bundle.plan).toEqual(controller.getSnapshot().active!.plan);
  await controller.recreateSet(origin);
  const recreated = controller.getSnapshot();
  expect(recreated.error).toBeNull();
  expect(recreated.active!.plan.inputs).toEqual(original.inputs);
  expect(recreated.active!.plan.variants).toHaveLength(3);
  expect(recreated.active!.plan.variants.every(variant => variant.instances.every(row => row.catalogVersion === original.inputs.catalogVersion))).toBe(true);
  controller.dispose();
}, 30_000);

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
  it('selection supersedes a pending append without restoring the prior active ID', async () => {
    const real = setup(), first = fixture().plan;
    const plan = buildActivePlanEnvelope(first.inputs, [first.variants[0], candidate().variants[0]], first.activeVariantId);
    await real.port.load(); await real.port.save(plan, { isCurrent: () => true });
    const gate = deferred<GenerationResult>(), generate = vi.fn<GenerationPort['generate']>(() => gate.promise);
    const c = createGenerationController({ generation: { generate }, activePlan: real.port }); await c.load();
    const running = c.appendVariant(menuOrigin); await c.selectVariant('candidate', menuOrigin);
    const bytes = real.map.get(ACTIVE_PLAN_KEY);
    gate.resolve({ status: 'success', plan: buildActivePlanEnvelope(first.inputs, [{ id: 'late', instances: candidate().variants[0].instances.map(row => ({ ...row, id: `late/${row.id}`, selectedServings: decimal('1.75') })) }], 'late') });
    await running;
    expect(c.getSnapshot().active?.plan.activeVariantId).toBe('candidate'); expect(c.getSnapshot().active?.plan.variants).toHaveLength(2);
    expect(real.map.get(ACTIVE_PLAN_KEY)).toBe(bytes); c.dispose();
  });
  it('a read replacing the base cancels a deferred final append write', async () => {
    const real = setup(), first = fixture().plan;
    await real.port.load(); await real.port.save(first, { isCurrent: () => true });
    const write = deferred<void>();
    const save = vi.fn<ActivePlanPort['save']>(async (...args) => { await write.promise; return real.port.save(...args); });
    const c = createGenerationController({ generation: { generate: async request => ({ status: 'success', plan: candidate(request.inputs) }) }, activePlan: { load: () => real.port.load(), save } });
    await c.load(); const bytes = real.map.get(ACTIVE_PLAN_KEY), running = c.appendVariant(menuOrigin);
    await vi.advanceTimersByTimeAsync(0); expect(c.getSnapshot().status).toBe('saving');
    await c.load(); write.resolve(); await running; await vi.advanceTimersByTimeAsync(0);
    expect(c.getSnapshot().status).toBe('idle'); expect(c.getSnapshot().active?.plan).toEqual(first);
    expect(real.map.get(ACTIVE_PLAN_KEY)).toBe(bytes); expect(vi.getTimerCount()).toBe(0); c.dispose();
  });
  it('the final save guard rejects elapsed30000ms before a queued write can mutate bytes', async () => {
    let now = 0; const real = setup(); await real.port.load(); await real.port.save(fixture().plan, { isCurrent: () => true });
    const gate = deferred<void>(), save = vi.fn<ActivePlanPort['save']>(async (...args) => { await gate.promise; return real.port.save(...args); });
    const c = createGenerationController({ clock: { now: () => now }, generation: { generate: async request => ({ status: 'success', plan: candidate(request.inputs) }) }, activePlan: { load: () => real.port.load(), save } });
    await c.load(); const bytes = real.map.get(ACTIVE_PLAN_KEY), running = c.appendVariant(menuOrigin);
    await vi.advanceTimersByTimeAsync(0); expect(c.getSnapshot().status).toBe('saving'); now = 30000; gate.resolve(); await running;
    expect(real.map.get(ACTIVE_PLAN_KEY)).toBe(bytes); expect(c.getSnapshot().active?.plan.variants).toHaveLength(1);
    expect(c.getSnapshot().error?.code).toBe('TIMEOUT'); c.dispose();
  });
  it('does not start append with no active plan or a full twelve-variant bundle', async () => {
    const real = setup(); await real.controller.load(); await real.controller.appendVariant(menuOrigin);
    expect(real.generate).not.toHaveBeenCalled();
    const first = fixture().plan, variants = Array.from({ length: 12 }, (_, i) => ({ id: `cap-${i}`, instances: first.variants[0].instances.map(row => ({
      ...row, id: `cap-${i}/${row.id}`, selectedServings: decimal((1 + i / 20).toFixed(2)),
    })) }));
    await real.port.save(buildActivePlanEnvelope(first.inputs, variants, variants[0].id), { isCurrent: () => true });
    await real.controller.load(); const bytes = real.map.get(ACTIVE_PLAN_KEY); await real.controller.appendVariant(menuOrigin);
    expect(real.generate).not.toHaveBeenCalled(); expect(real.map.get(ACTIVE_PLAN_KEY)).toBe(bytes); real.controller.dispose();
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
  it.each(['generated', 'loaded'] as const)('retries a timed out selection against the same %s base without searching or replacing', async source => {
    const real = setup(), plan = alternatives(), gate = deferred<void>();
    const generate = vi.fn<GenerationPort['generate']>(async () => ({ status: 'success', plan }));
    let delaySelection = false;
    const save = vi.fn<ActivePlanPort['save']>(async (...args) => {
      if (delaySelection) await gate.promise;
      return real.port.save(...args);
    });
    if (source === 'loaded') { await real.port.load(); await real.port.save(plan, { isCurrent: () => true }); }
    const c = createGenerationController({ generation: { generate }, activePlan: { load: () => real.port.load(), save } });
    await c.load();
    if (source === 'generated') await c.start(plan.inputs, origin);
    const bytes = real.map.get(ACTIVE_PLAN_KEY), calls = generate.mock.calls.length;
    delaySelection = true;
    const selecting = c.selectVariant('v2', menuOrigin);
    await vi.advanceTimersByTimeAsync(30_000); await selecting;
    expect(c.getSnapshot()).toMatchObject({ status: 'error', intent: 'select', error: { code: 'TIMEOUT' } });
    expect(real.map.get(ACTIVE_PLAN_KEY)).toBe(bytes);
    gate.resolve(); await vi.advanceTimersByTimeAsync(0);
    await c.retryGeneration();
    expect(c.getSnapshot()).toMatchObject({ status: 'succeeded', intent: 'select' });
    expect(c.getSnapshot().active?.plan).toEqual({ ...plan, activeVariantId: 'v2' });
    expect(generate).toHaveBeenCalledTimes(calls);
    expect(JSON.parse(real.map.get(ACTIVE_PLAN_KEY)!).plan).toEqual({ ...JSON.parse(bytes!).plan, activeVariantId: 'v2' });
    expect(vi.getTimerCount()).toBe(0); c.dispose();
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
