import { applicableAdmissionRows, validateActiveBundle } from '../../adapters/activePlan';
import type { ActiveBundle, ActivePlanPort, ActivePlanSaveResult } from '../../adapters/activePlan';
import type { ActivePlanEnvelope, GenerationError, GenerationPort, PlanInputs } from '../../domain/plan';
import { EDITED_PLAN_SCHEMA_VERSION, PLAN_SCHEMA_VERSION, validatePlanInputs } from '../../domain/plan';
import { variantFingerprint } from '../../domain/generatePlan';
import { immutableSnapshot, sameSnapshot } from '../../domain/appliedSettings';
import { trustedCatalogs as defaultTrustedCatalogs } from '../../adapters/trustedCatalogs';
import type { TrustedCatalogRegistry } from '../../adapters/trustedCatalogs';
import { addMeal as addToPlan, changeMealServings, freeMealId, listMealAlternatives, removeMeal as removeFromPlan, replaceMeal } from '../../domain/mealEdits';
import type { EmptyMealTarget, MealAlternativesResult, MealEditTarget, MealPortionMultiplier, MealSelectionTarget } from '../../domain/mealEdits';
import type { PlanProjection } from '../../domain/planProjection';
import { projectPlan } from '../../domain/planProjection';
import { inventoryPantrySnapshot, validateInventoryRows } from '../../adapters/pantryInventory';
import type { PantryInventory, PantryInventoryPort, PantryInventoryRow } from '../../adapters/pantryInventory';

export interface GenerationOrigin {
  readonly returnRoute: string;
  readonly focusAnchor: string;
  readonly firstErroneousStep?: number;
  readonly recipeReplacement?: { readonly locationKey: string; readonly target: MealEditTarget; readonly recipeId: string };
}
export interface GenerationSnapshot {
  readonly status: 'idle' | 'pending' | 'error' | 'saving' | 'memory-only' | 'succeeded' | 'no-new-result';
  readonly intent?: 'append' | 'replace' | 'select' | 'edit';
  readonly loadStatus: 'unloaded' | 'pending' | 'missing' | 'loaded' | 'corrupt' | 'error';
  readonly active: ActiveBundle | null;
  readonly candidate: ActiveBundle | null;
  readonly lastApplied: PlanInputs['appliedSettings'] | null;
  readonly presence: { readonly status: 'absent' | 'pending' | 'error' } | { readonly status: 'valid'; readonly planId: string };
  readonly error: GenerationError | null;
  readonly saveError: 'blocked' | 'error' | null;
  readonly requestId: string | null;
  readonly pendingTextIndex: number;
  readonly startedAt: number | null;
  readonly origin: GenerationOrigin | null;
  readonly initialSearchCount: number | null;
  readonly pantry?: PantryInventoryState;
  readonly editRevision?: number;
}

export interface PantryInventoryState {
  readonly status: 'pending' | 'missing' | 'loaded' | 'corrupt' | 'error';
  readonly confirmed: PantryInventory | null;
  readonly writeStatus: 'idle' | 'saving' | 'saved' | 'error' | 'conflict';
}
export type MealAlternativesRequest = Extract<MealAlternativesResult, { status: 'ready' }> & { revision: number }
  | Exclude<MealAlternativesResult, { status: 'ready' }>;

function inputsWithInventory(inputs: PlanInputs, rows: readonly PantryInventoryRow[]): PlanInputs {
  return { ...inputs, pantrySnapshot: inventoryPantrySnapshot(rows) };
}

function projectInventory(bundle: ActiveBundle, rows: readonly PantryInventoryRow[]): ActiveBundle | null {
  const inputs = inputsWithInventory(bundle.plan.inputs, rows);
  if (!bundle.admissionPantries && sameSnapshot(inputs.pantrySnapshot, bundle.plan.inputs.pantrySnapshot)) return bundle;
  const projections = [];
  for (const variant of bundle.plan.variants) {
    const result = projectPlan(inputs, variant);
    if (result.status === 'invalid') return null;
    projections.push(result.projection);
  }
  return Object.freeze({ ...bundle, projections: Object.freeze(projections) });
}

function validateChangedVariant(plan: ActivePlanEnvelope, base: ActiveBundle, variantId: string, registry: TrustedCatalogRegistry, currentRows?: readonly PantryInventoryRow[]) {
  const variant = plan.variants.find(variant => variant.id === variantId);
  if (!variant) return validateActiveBundle(plan, registry, base.admissionPantries);
  const retained = base.admissionPantries?.filter(entry => entry.variantId !== variantId) ?? [];
  const previous = base.admissionPantries?.find(entry => entry.variantId === variantId);
  const previousInputs = previous ? inputsWithInventory(plan.inputs, previous.rows) : plan.inputs;
  const historical = projectPlan(previousInputs, variant);
  if (historical.status === 'projected' && historical.projection.budget.check.accepted) {
    const rows = previous ? applicableAdmissionRows(previousInputs, historical.projection, previous.rows) : [];
    if (rows.length) retained.push({ variantId, rows });
  } else if (currentRows) {
    const liveInputs = inputsWithInventory(plan.inputs, currentRows);
    const live = projectPlan(liveInputs, variant);
    if (live.status === 'projected' && live.projection.budget.check.accepted) {
      const rows = applicableAdmissionRows(liveInputs, live.projection, currentRows);
      if (rows.length) retained.push({ variantId, rows });
    }
  }
  return validateActiveBundle(plan, registry, retained.length ? retained : undefined);
}

const liveProjections = new WeakMap<ActiveBundle, { inventory: PantryInventory; bundle: ActiveBundle | null }>();
function projectedInventory(bundle: ActiveBundle, inventory: PantryInventory): ActiveBundle | null {
  const cached = liveProjections.get(bundle);
  if (cached?.inventory === inventory) return cached.bundle;
  const projected = projectInventory(bundle, inventory.rows);
  liveProjections.set(bundle, { inventory, bundle: projected });
  return projected;
}

export function visiblePlanSnapshot(snapshot: GenerationSnapshot): GenerationSnapshot {
  const bundle = snapshot.intent === 'edit' && snapshot.status === 'saving' && snapshot.candidate ? snapshot.candidate : snapshot.active;
  const inventory = snapshot.pantry?.confirmed;
  const active = inventory && bundle ? projectedInventory(bundle, inventory) : bundle;
  if (active === null && bundle && snapshot.pantry) {
    return { ...snapshot, active: bundle, pantry: { ...snapshot.pantry, status: 'error' } };
  }
  return active === snapshot.active ? snapshot : { ...snapshot, active };
}
export function mealEditingUnavailable(snapshot: GenerationSnapshot): boolean {
  return snapshot.loadStatus !== 'loaded' || snapshot.status === 'saving' || snapshot.status === 'pending'
    || (snapshot.intent === 'edit' && snapshot.saveError === 'blocked') || pantryBlocksMealEdit(snapshot);
}
function pantryBlocksMealEdit(snapshot: GenerationSnapshot): boolean {
  const pantry = snapshot.pantry;
  if (!pantry) return false;
  return (pantry.status !== 'loaded' && pantry.status !== 'missing') || pantry.writeStatus === 'saving' || pantry.writeStatus === 'conflict';
}
export interface GenerationScheduler { setTimeout(callback: () => void, milliseconds: number): unknown; clearTimeout(handle: unknown): void }
export interface GenerationControllerOptions {
  readonly generation: GenerationPort; readonly activePlan: ActivePlanPort;
  readonly pantryInventory?: PantryInventoryPort;
  readonly trustedCatalogs?: TrustedCatalogRegistry;
  readonly clock?: { now(): number }; readonly scheduler?: GenerationScheduler;
}
export function createGenerationController({ generation, activePlan, pantryInventory, trustedCatalogs = defaultTrustedCatalogs, clock = { now: () => Date.now() }, scheduler = {
  setTimeout: (callback, milliseconds) => globalThis.setTimeout(callback, milliseconds),
  clearTimeout: handle => globalThis.clearTimeout(handle as ReturnType<typeof setTimeout>),
} }: GenerationControllerOptions) {
  let snapshot: GenerationSnapshot = immutableSnapshot({ status: 'idle', loadStatus: 'unloaded', active: null, candidate: null, lastApplied: null,
    presence: { status: 'absent' }, error: null, saveError: null, requestId: null, pendingTextIndex: 0, startedAt: null, origin: null, initialSearchCount: null, editRevision: 0,
    ...(pantryInventory ? { pantry: { status: 'pending' as const, confirmed: null, writeStatus: 'idle' as const } } : {}) });
  interface Operation { readonly id: string; readonly abort: AbortController; readonly inputs: PlanInputs; readonly origin: GenerationOrigin; readonly deadline: number; readonly baseRevision?: number; readonly stockAttempt?: number; readonly intent?: GenerationSnapshot['intent']; readonly base?: ActiveBundle; initialSearchCount?: number; timeout?: unknown; rotation?: unknown }
  let operation: Operation | null = null, sequence = 0, disposed = false, revision = 0, loadSequence = 0, writeAllowed = false;
  let lastRequest: { inputs: PlanInputs; origin: GenerationOrigin; intent: 'append' | 'replace'; base?: ActiveBundle; baseRevision?: number; stockAttempt?: number }
    | { intent: 'select'; variantId: string; origin: GenerationOrigin; baseRevision: number } | null = null;
  let writes: Promise<unknown> = Promise.resolve();
  let pantrySequence = 0;
  let pantryRetryRows: readonly PantryInventoryRow[] | null = null;
  const listeners = new Set<() => void>();
  const cancelled = Symbol('cancelled');
  const editRevision = () => revision + pantrySequence;
  const stockCurrent = (attempt?: number) => attempt === undefined
    || (attempt === pantrySequence && !pantryBlocksMealEdit(snapshot) && (pantryInventory?.isCurrent?.() ?? true));
  const publish = (patch: Partial<GenerationSnapshot>) => {
    if (disposed) return;
    // Bundles are already detached/frozen by validateActiveBundle. Copying both old
    // and candidate together would exceed the trust-boundary node budget at cap12.
    const { active, candidate, pantry, ...metadata } = patch;
    snapshot = Object.freeze({ ...snapshot, ...immutableSnapshot(metadata), editRevision: editRevision(),
      ...(active !== undefined ? { active } : {}), ...(candidate !== undefined ? { candidate } : {}),
      ...(pantry ? { pantry: Object.freeze(pantry) } : {}) });
    for (const listener of [...listeners]) listener();
  };
  const owned = (op: Operation) => !disposed && operation === op && !op.abort.signal.aborted && (op.baseRevision === undefined || op.baseRevision === revision);
  const stopTimers = (op: Operation) => {
    if (op.timeout !== undefined) scheduler.clearTimeout(op.timeout);
    if (op.rotation !== undefined) scheduler.clearTimeout(op.rotation);
    op.timeout = undefined; op.rotation = undefined;
  };
  const invalidate = () => {
    const previous = operation; operation = null;
    if (previous) { stopTimers(previous); previous.abort.abort(); }
  };
  const revokeStockWork = (): Partial<GenerationSnapshot> => {
    if (operation?.stockAttempt === undefined || snapshot.status === 'succeeded') return {};
    // A durable write can be awaiting its async acknowledgement. Hide the stale
    // candidate immediately but keep the write serialized until its true result.
    if (snapshot.status === 'saving') return { candidate: null };
    invalidate();
    return { status: 'idle', candidate: null, error: null, saveError: null, requestId: null, origin: null };
  };
  /** Abort also settles a caller whose injected port ignores AbortSignal forever. */
  const wait = <T>(promise: Promise<T>, op: Operation): Promise<T | typeof cancelled> => new Promise((resolve, reject) => {
    const abort = () => { cleanup(); resolve(cancelled); };
    const cleanup = () => op.abort.signal.removeEventListener('abort', abort);
    if (!owned(op)) { resolve(cancelled); return; }
    op.abort.signal.addEventListener('abort', abort, { once: true });
    promise.then(value => { cleanup(); resolve(value); }, error => { cleanup(); reject(error); });
  });
  const failure = (code: GenerationError['code'], message: string): GenerationError => ({ code, message, diagnostics: [] });
  const timeOut = (op: Operation) => {
    if (!owned(op)) return;
    invalidate();
    const message = op.intent === 'append' ? 'Не удалось найти новый вариант за 30 секунд. Прежнее меню не изменено'
      : op.intent === 'edit' ? 'Время сохранения изменений истекло. Восстановлено прежнее меню' : 'Подбор прерван: время ожидания 30 секунд истекло';
    publish({ status: 'error', error: failure('TIMEOUT', message), candidate: null, saveError: null });
  };
  const rejectExpired = (op: Operation) => {
    if (clock.now() < op.deadline) return false;
    timeOut(op); return true;
  };
  const armTimeout = (op: Operation) => {
    op.timeout = scheduler.setTimeout(() => timeOut(op), Math.max(0, op.deadline - clock.now()));
  };
  const rotate = (op: Operation) => {
    op.rotation = scheduler.setTimeout(() => {
      if (!owned(op) || snapshot.status !== 'pending') return;
      publish({ pendingTextIndex: (snapshot.pendingTextIndex + 1) % 4 });
      if (owned(op) && snapshot.status === 'pending') rotate(op);
    }, 2_000);
  };

  async function loadPantry() {
    if (!pantryInventory || !snapshot.pantry || disposed) return;
    // A new read owns the storage inspection. A queued write must not acquire
    // the inspection for newer bytes as permission to save its old draft.
    const attempt = ++pantrySequence;
    pantryRetryRows = null;
    publish({ ...revokeStockWork(), pantry: { ...snapshot.pantry, status: 'pending', writeStatus: 'idle' } });
    let result: Awaited<ReturnType<PantryInventoryPort['load']>>;
    try { result = await pantryInventory.load(); } catch { result = { status: 'error' }; }
    if (disposed || attempt !== pantrySequence || !snapshot.pantry) return;
    const previous = snapshot.pantry.confirmed;
    const changed = result.status === 'loaded' && !sameSnapshot(previous, result.inventory);
    const confirmed = changed && result.status === 'loaded' ? result.inventory : previous;
    const status = result.status === 'missing' && previous ? 'error' : result.status;
    publish({ pantry: { status, confirmed, writeStatus: 'idle' } });
  }

  async function savePantry(input: readonly PantryInventoryRow[], expected?: PantryInventoryState): Promise<boolean> {
    const pantry = snapshot.pantry;
    if (!pantryInventory || !pantry || disposed || (expected && expected !== pantry) || pantryBlocksMealEdit(snapshot)
      || snapshot.status === 'saving' || snapshot.status === 'pending') return false;
    const rows = validateInventoryRows(input);
    if (!rows || (snapshot.active && !projectInventory(snapshot.active, rows))) {
      pantryRetryRows = null;
      publish({ pantry: { ...pantry, writeStatus: 'error' } });
      return false;
    }
    const attempt = ++pantrySequence;
    const isCurrent = () => !disposed && attempt === pantrySequence;
    pantryRetryRows = rows;
    publish({ ...revokeStockWork(), pantry: { ...pantry, writeStatus: 'saving' } });
    const result = await pantryInventory.save(rows, { isCurrent }).catch(() => ({ status: 'error' as const }));
    if (!isCurrent()) return false;
    if (result.status === 'saved') {
      pantryRetryRows = null;
      publish({ pantry: { status: 'loaded', confirmed: result.inventory, writeStatus: 'saved' } });
      return true;
    }
    if (result.status === 'blocked') pantryRetryRows = null;
    publish({ pantry: { ...pantry, writeStatus: result.status === 'blocked' ? 'conflict' : result.status === 'error' ? 'error' : 'idle' } });
    return false;
  }
  function discardPantrySave() {
    const pantry = snapshot.pantry;
    if (pantry?.writeStatus !== 'error') return;
    pantryRetryRows = null;
    publish({ pantry: { ...pantry, writeStatus: 'idle' } });
  }
  async function load() {
    if (disposed) return;
    const refreshingEdit = snapshot.intent === 'edit';
    if (refreshingEdit) {
      // A new storage inspection must not give an old edit a fresh write lease,
      // even if it returns missing or cannot read the new bytes.
      invalidate(); writeAllowed = false; revision++;
    }
    const token = ++loadSequence, atRevision = revision;
    publish({ loadStatus: 'pending', ...(snapshot.active ? {} : { presence: { status: 'pending' } }),
      ...(refreshingEdit ? { status: 'idle' as const, origin: null, candidate: null, requestId: null, error: null, saveError: null } : {}) });
    try {
      const result = await activePlan.load();
      if (disposed || token !== loadSequence || atRevision !== revision) return;
      if (result.status === 'loaded') {
        const checked = validateActiveBundle(result.bundle.plan, trustedCatalogs, result.bundle.admissionPantries);
        if (checked.status !== 'valid') { writeAllowed = false; publish({ loadStatus: 'corrupt', presence: snapshot.active ? snapshot.presence : { status: 'error' } }); return; }
        // A selection belongs to the revision it inspected. Reload replaces that base;
        // release its pending UI and timers as well as rejecting its final write.
        const cancelledSelection = operation?.baseRevision !== undefined;
        if (cancelledSelection) invalidate();
        writeAllowed = true; revision++;
        publish({ ...(cancelledSelection ? { status: 'idle' as const, candidate: null, requestId: null, error: null, saveError: null } : {}),
          loadStatus: 'loaded', active: checked.bundle, initialSearchCount: null, lastApplied: checked.bundle.plan.inputs.appliedSettings,
          presence: { status: 'valid', planId: checked.bundle.plan.activeVariantId } });
      } else {
        writeAllowed = result.status === 'missing';
        publish({ loadStatus: result.status, ...(snapshot.active ? {} : { presence: { status: result.status === 'missing' ? 'absent' : 'error' } }) });
      }
    } catch {
      if (disposed || token !== loadSequence || atRevision !== revision) return;
      writeAllowed = false;
      publish({ loadStatus: 'error', ...(snapshot.active ? {} : { presence: { status: 'error' } }) });
    }
  }
  async function save(op: Operation, candidate: ActiveBundle) {
    if (!owned(op) || rejectExpired(op)) return;
    if (op.rotation !== undefined) scheduler.clearTimeout(op.rotation);
    op.rotation = undefined;
    publish({ status: 'saving', candidate, error: null, saveError: null });
    // Keep one final write in flight. A superseded queued task never calls the port.
    const queued = writes.then(async (): Promise<ActivePlanSaveResult> => {
      if (!owned(op) || rejectExpired(op) || !stockCurrent(op.stockAttempt)) return { status: 'cancelled' };
      if (!writeAllowed) return { status: 'blocked' };
      return activePlan.save(candidate.plan, { isCurrent: () => owned(op) && writeAllowed && clock.now() < op.deadline && stockCurrent(op.stockAttempt),
        ...(candidate.admissionPantries ? { admissionPantries: candidate.admissionPantries } : {}) });
    });
    writes = queued.catch(() => undefined);
    let result: ActivePlanSaveResult | typeof cancelled;
    try { result = await wait(queued, op); } catch { result = { status: 'error' }; }
    if (!owned(op) || result === cancelled) return;
    // A guarded write can cross the deadline inside setItem and still be durable.
    if (result.status !== 'saved' && rejectExpired(op)) return;
    stopTimers(op);
    if (result.status === 'saved') {
      revision++; writeAllowed = true;
      publish({ status: 'succeeded', active: candidate, candidate: null, lastApplied: candidate.plan.inputs.appliedSettings,
        loadStatus: 'loaded', presence: { status: 'valid', planId: candidate.plan.activeVariantId }, saveError: null,
        ...(op.initialSearchCount !== undefined ? { initialSearchCount: op.initialSearchCount } : {}) });
    } else if (result.status === 'cancelled' || !stockCurrent(op.stockAttempt)) {
      invalidate(); publish({ status: 'idle', candidate: null, requestId: null });
      if (op.stockAttempt !== undefined && op.stockAttempt === pantrySequence && !stockCurrent(op.stockAttempt)) void loadPantry();
    } else {
      publish({ status: 'memory-only', candidate, saveError: result.status });
    }
  }
  async function run(rawInputs: PlanInputs, origin: GenerationOrigin, intent: 'append' | 'replace', base?: ActiveBundle, baseRevision?: number, stockAttempt?: number) {
    if (disposed || (snapshot.status === 'saving' && snapshot.intent === 'edit')) return;
    if (operation && (snapshot.status === 'pending' || snapshot.status === 'saving') && operation.intent === intent && sameSnapshot(operation.inputs, rawInputs)) return;
    // Only installation of active memory advances revision. Starting a request must
    // not abandon an outstanding read's status and write-permission bookkeeping.
    invalidate();
    const checked = validatePlanInputs(rawInputs);
    if (checked.status !== 'valid') {
      publish({ status: 'error', candidate: null, origin, error: { code: 'GENERATION_DATA_INCOMPLETE', message: 'Проверьте настройки и исходные данные', diagnostics: checked.diagnostics } }); return;
    }
    const op: Operation = { id: String(++sequence), abort: new AbortController(), inputs: checked.inputs, origin: immutableSnapshot(origin), deadline: clock.now() + 30_000, intent, base, baseRevision, stockAttempt };
    operation = op; lastRequest = { inputs: op.inputs, origin: op.origin, intent, base, baseRevision, stockAttempt };
    publish({ status: 'pending', intent, candidate: null, error: null, saveError: null, requestId: op.id, pendingTextIndex: 0, startedAt: clock.now(), origin: op.origin });
    if (!owned(op)) return;
    armTimeout(op); rotate(op);
    try {
      const excludedFingerprints = [...new Set(base?.plan.variants.map(variantFingerprint) ?? [])];
      const result = await wait(generation.generate({ requestId: op.id, inputs: op.inputs, targetCount: intent === 'append' ? 1 : 3,
        ...(intent === 'append' ? { excludedFingerprints } : {}) }, op.abort.signal), op);
      if (!owned(op) || result === cancelled || rejectExpired(op)) return;
      if (result.status === 'cancelled') { cancel(); return; }
      if (result.status === 'error') { stopTimers(op); publish({ status: intent === 'append' && result.error.code === 'SEARCH_EXHAUSTED' ? 'no-new-result' : 'error', error: result.error }); return; }
      const candidate = validateActiveBundle(result.plan, trustedCatalogs);
      if (candidate.status !== 'valid' || candidate.bundle.plan.schemaVersion !== PLAN_SCHEMA_VERSION || !sameSnapshot(result.plan.inputs, op.inputs)) {
        stopTimers(op); publish({ status: 'error', error: { code: 'GENERATION_DATA_INCOMPLETE', message: 'Получено несогласованное меню', diagnostics: candidate.status === 'invalid' ? candidate.diagnostics : [] } }); return;
      }
      if (intent === 'append') {
        const variant = candidate.bundle.plan.variants[0];
        if (!base || candidate.bundle.plan.variants.length !== 1 || excludedFingerprints.includes(variantFingerprint(variant)) || !sameSnapshot(snapshot.active, base)) {
          stopTimers(op); publish({ status: 'error', error: failure('GENERATION_DATA_INCOMPLETE', 'Получено несогласованное меню') }); return;
        }
        // Search IDs are local to its result. Give only the new alternative a free namespace.
        const ids = new Set(base.plan.variants.map(row => row.id));
        const instanceIds = new Set(base.plan.variants.flatMap(row => row.instances.map(instance => instance.id)));
        let id = `append-${base.plan.variants.length + 1}`;
        while (ids.has(id) || variant.instances.some(row => instanceIds.has(`${id}/${row.date}/${row.slot}`))) id += '-new';
        const added = { ...variant, id, instances: variant.instances.map(row => ({ ...row, id: `${id}/${row.date}/${row.slot}` })) };
        const nextPlan = base.plan.schemaVersion === EDITED_PLAN_SCHEMA_VERSION
          ? { ...base.plan, variants: [...base.plan.variants, { ...added, emptySlots: [] }], activeVariantId: id }
          : { ...base.plan, variants: [...base.plan.variants, added], activeVariantId: id };
        const merged = validateChangedVariant(nextPlan, base, id, trustedCatalogs, snapshot.pantry?.confirmed?.rows);
        if (merged.status !== 'valid') { stopTimers(op); publish({ status: 'error', error: failure('GENERATION_DATA_INCOMPLETE', 'Не удалось проверить новый вариант') }); return; }
        await save(op, merged.bundle);
      } else {
        op.initialSearchCount = candidate.bundle.plan.variants.length;
        await save(op, candidate.bundle);
      }
    } catch {
      if (!owned(op)) return;
      stopTimers(op); publish({ status: 'error', error: failure('FAILED', 'Не получилось составить меню') });
    }
  }
  async function start(rawInputs: PlanInputs, origin: GenerationOrigin) { await run(rawInputs, origin, 'replace', snapshot.active ?? undefined, snapshot.active ? revision : undefined); }
  async function appendVariant(origin: GenerationOrigin) {
    const base = snapshot.active;
    if (disposed || !base || base.plan.variants.length >= 12 || snapshot.status === 'pending' || snapshot.status === 'saving' || snapshot.status === 'memory-only'
      || mealEditingUnavailable(snapshot)) return;
    const inventory = snapshot.pantry?.confirmed;
    await run(inventory ? inputsWithInventory(base.plan.inputs, inventory.rows) : base.plan.inputs, origin, 'append', base, revision, pantryInventory ? pantrySequence : undefined);
  }
  async function recreateSet(origin: GenerationOrigin) {
    const base = snapshot.active;
    if (disposed || !base || snapshot.loadStatus !== 'loaded' || pantryBlocksMealEdit(snapshot)
      || snapshot.status === 'saving' || (snapshot.intent === 'edit' && mealEditingUnavailable(snapshot))) return;
    const inventory = snapshot.pantry?.confirmed;
    await run(inventory ? inputsWithInventory(base.plan.inputs, inventory.rows) : base.plan.inputs, origin, 'replace', base, revision, pantryInventory ? pantrySequence : undefined);
  }
  function cancel() {
    if (disposed) return;
    invalidate(); publish({ status: 'idle', candidate: null, error: null, saveError: null, requestId: null });
  }
  async function retrySave() {
    const candidate = snapshot.candidate, previous = operation;
    if (disposed || snapshot.status !== 'memory-only' || !candidate || !previous || snapshot.pantry?.writeStatus === 'saving') return;
    if (previous.intent === 'edit' && (snapshot.saveError !== 'error' || snapshot.loadStatus !== 'loaded')) return;
    if (!stockCurrent(previous.stockAttempt)) { void loadPantry(); return; }
    invalidate();
    if (previous.baseRevision !== undefined && previous.baseRevision !== revision) return;
    const op: Operation = { id: String(++sequence), abort: new AbortController(), inputs: previous.inputs, origin: previous.origin, deadline: clock.now() + 30_000, baseRevision: previous.baseRevision, stockAttempt: previous.stockAttempt, initialSearchCount: previous.initialSearchCount, intent: previous.intent, base: previous.base };
    operation = op; armTimeout(op);
    publish({ requestId: op.id, startedAt: clock.now() });
    await save(op, candidate);
  }
  async function selectVariant(variantId: string, origin: GenerationOrigin) {
    const active = snapshot.active;
    if (disposed || !active || snapshot.pantry?.writeStatus === 'saving' || (snapshot.intent === 'edit' && mealEditingUnavailable(snapshot))
      || variantId === active.plan.activeVariantId || !active.plan.variants.some(variant => variant.id === variantId)) return;
    invalidate();
    const candidate = validateActiveBundle({ ...active.plan, activeVariantId: variantId }, trustedCatalogs, active.admissionPantries);
    if (candidate.status !== 'valid') {
      publish({ status: 'error', error: failure('GENERATION_DATA_INCOMPLETE', 'Не удалось проверить выбранный вариант') }); return;
    }
    const op: Operation = { id: String(++sequence), abort: new AbortController(), inputs: active.plan.inputs, origin: immutableSnapshot(origin), deadline: clock.now() + 30_000, baseRevision: revision, intent: 'select' };
    operation = op; lastRequest = { intent: 'select', variantId, origin: op.origin, baseRevision: revision }; armTimeout(op);
    publish({ requestId: op.id, startedAt: clock.now(), origin: op.origin, intent: 'select' });
    await save(op, candidate.bundle);
  }
  async function mealAlternatives(target: MealSelectionTarget, signal: AbortSignal): Promise<MealAlternativesRequest> {
    const stored = snapshot.active, base = visiblePlanSnapshot(snapshot).active, atRevision = editRevision(), atLoad = loadSequence;
    const current = () => !disposed && !mealEditingUnavailable(snapshot) && snapshot.active === stored && editRevision() === atRevision
      && loadSequence === atLoad && stockCurrent(pantryInventory ? pantrySequence : undefined);
    const projection = base?.projections.find(row => row.variantId === target.variantId);
    if (!base || !projection || !current()) return { status: 'stale' };
    const plan = snapshot.pantry?.confirmed ? { ...base.plan, inputs: inputsWithInventory(base.plan.inputs, snapshot.pantry.confirmed.rows) } : base.plan;
    // Let the panel render its loading state before the first projection.
    await new Promise<void>(resolve => globalThis.setTimeout(resolve, 0));
    if (signal.aborted) return { status: 'cancelled' };
    if (!current()) return { status: 'stale' };
    const result = await listMealAlternatives(plan, projection, target, { signal, isCurrent: current });
    if (signal.aborted) return { status: 'cancelled' };
    if (!current()) return { status: 'stale' };
    return result.status === 'ready' ? { ...result, revision: atRevision } : result;
  }
  async function applyMealEdit<T extends MealSelectionTarget>(target: T, origin: GenerationOrigin, isExpected: (base: ActiveBundle) => boolean,
    edit: (plan: ActivePlanEnvelope, projection: PlanProjection, target: T) => ReturnType<typeof replaceMeal>,
    budgetMessage = 'Изменение превышает бюджет покупок') {
    const base = snapshot.active;
    if (!base || disposed || mealEditingUnavailable(snapshot)) return;
    const visible = visiblePlanSnapshot(snapshot);
    if (mealEditingUnavailable(visible)) return;
    const projection = visible.active?.projections.find(row => row.variantId === target.variantId);
    const plan = snapshot.pantry?.confirmed ? { ...base.plan, inputs: inputsWithInventory(base.plan.inputs, snapshot.pantry.confirmed.rows) } : base.plan;
    const next = isExpected(base) && projection
      ? edit(plan, projection, target) : { status: 'stale' as const };
    if (next.status === 'unchanged') return;
    if (next.status !== 'ready') {
      const message = next.status === 'stale' ? 'Меню изменилось. Обновите его перед новой правкой'
        : next.status === 'over-budget' ? budgetMessage : 'Не удалось изменить блюдо';
      invalidate(); publish({ intent: 'edit', origin, status: 'error', error: failure('FAILED', message), candidate: null, saveError: null, requestId: null }); return;
    }
    const candidate = validateChangedVariant({ ...next.plan, inputs: base.plan.inputs }, base, target.variantId, trustedCatalogs, snapshot.pantry?.confirmed?.rows);
    if (candidate.status !== 'valid') {
      invalidate(); publish({ intent: 'edit', origin, status: 'error', error: failure('FAILED', 'Не удалось проверить изменения меню'), candidate: null, saveError: null, requestId: null }); return;
    }
    invalidate();
    const op: Operation = { id: String(++sequence), abort: new AbortController(), inputs: base.plan.inputs, origin: immutableSnapshot(origin), deadline: clock.now() + 30_000, baseRevision: revision, stockAttempt: pantryInventory ? pantrySequence : undefined, intent: 'edit' };
    operation = op; lastRequest = null; armTimeout(op);
    publish({ requestId: op.id, startedAt: clock.now(), origin: op.origin, intent: 'edit' });
    await save(op, candidate.bundle);
  }
  async function editMeal(target: MealEditTarget, recipeId: string, expectedRevision: number, origin: GenerationOrigin) {
    await applyMealEdit(target, origin, () => expectedRevision === editRevision(),
      (plan, projection, target) => replaceMeal(plan, projection, target, recipeId));
  }
  async function removeMeal(target: MealEditTarget, expectedPlan: ActivePlanEnvelope, origin: GenerationOrigin, expectedRevision?: number) {
    await applyMealEdit(target, origin, base => base.plan === expectedPlan && (expectedRevision === undefined || expectedRevision === editRevision()), removeFromPlan);
  }
  async function changePortions(target: MealEditTarget, multiplier: MealPortionMultiplier, expectedPlan: ActivePlanEnvelope, origin: GenerationOrigin, expectedRevision?: number) {
    await applyMealEdit(target, origin, base => base.plan === expectedPlan && (expectedRevision === undefined || expectedRevision === editRevision()),
      (plan, projection, target) => changeMealServings(plan, projection, target, multiplier),
      'Эти порции превышают бюджет покупок. Выберите меньше порций');
  }
  async function addMeal(target: EmptyMealTarget, recipeId: string, expectedRevision: number, origin: GenerationOrigin) {
    await applyMealEdit(target, origin, () => expectedRevision === editRevision(), (plan, projection, target) => {
      let seed: string;
      try {
        const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
        seed = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
      } catch { return { status: 'incomplete' }; }
      return addToPlan(plan, projection, target, recipeId, freeMealId(plan, seed));
    });
  }
  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) { if (!disposed) listeners.add(listener); return () => { listeners.delete(listener); }; },
    load, retryLoad: load, start, cancel, retrySave, selectVariant, appendVariant, recreateSet, mealAlternatives, editMeal, removeMeal, addMeal, changePortions,
    loadPantry, savePantry, discardPantrySave,
    retryPantrySave: () => pantryRetryRows && snapshot.pantry?.writeStatus === 'error' ? savePantry(pantryRetryRows) : Promise.resolve(false),
    async retryGeneration() {
      if (!lastRequest || (snapshot.status !== 'error' && snapshot.status !== 'no-new-result')
        || (lastRequest.baseRevision !== undefined && lastRequest.baseRevision !== revision)) return;
      if (lastRequest.intent === 'select') await selectVariant(lastRequest.variantId, lastRequest.origin);
      else if (stockCurrent(lastRequest.stockAttempt)) await run(lastRequest.inputs, lastRequest.origin, lastRequest.intent, lastRequest.base, lastRequest.baseRevision, lastRequest.stockAttempt);
      else void loadPantry();
    },
    dispose() { if (disposed) return; cancel(); disposed = true; ++loadSequence; ++pantrySequence; listeners.clear(); },
  };
}
