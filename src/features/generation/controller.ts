import { validateActiveBundle } from '../../adapters/activePlan';
import type { ActiveBundle, ActivePlanPort, ActivePlanSaveResult } from '../../adapters/activePlan';
import type { GenerationError, GenerationPort, PlanInputs } from '../../domain/plan';
import { validatePlanInputs } from '../../domain/plan';
import { variantFingerprint } from '../../domain/generatePlan';
import { immutableSnapshot, sameSnapshot } from '../../domain/appliedSettings';
import { trustedCatalogs as defaultTrustedCatalogs } from '../../adapters/trustedCatalogs';
import type { TrustedCatalogRegistry } from '../../adapters/trustedCatalogs';

export interface GenerationOrigin { readonly returnRoute: string; readonly focusAnchor: string; readonly firstErroneousStep?: number }
export interface GenerationSnapshot {
  readonly status: 'idle' | 'pending' | 'error' | 'saving' | 'memory-only' | 'succeeded' | 'no-new-result';
  readonly intent?: 'append' | 'replace' | 'select';
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
}
export interface GenerationScheduler { setTimeout(callback: () => void, milliseconds: number): unknown; clearTimeout(handle: unknown): void }
export interface GenerationControllerOptions {
  readonly generation: GenerationPort; readonly activePlan: ActivePlanPort;
  readonly trustedCatalogs?: TrustedCatalogRegistry;
  readonly clock?: { now(): number }; readonly scheduler?: GenerationScheduler;
}
export function createGenerationController({ generation, activePlan, trustedCatalogs = defaultTrustedCatalogs, clock = { now: () => Date.now() }, scheduler = {
  setTimeout: (callback, milliseconds) => globalThis.setTimeout(callback, milliseconds),
  clearTimeout: handle => globalThis.clearTimeout(handle as ReturnType<typeof setTimeout>),
} }: GenerationControllerOptions) {
  let snapshot: GenerationSnapshot = immutableSnapshot({ status: 'idle', loadStatus: 'unloaded', active: null, candidate: null, lastApplied: null,
    presence: { status: 'absent' }, error: null, saveError: null, requestId: null, pendingTextIndex: 0, startedAt: null, origin: null, initialSearchCount: null });
  interface Operation { readonly id: string; readonly abort: AbortController; readonly inputs: PlanInputs; readonly origin: GenerationOrigin; readonly deadline: number; readonly baseRevision?: number; readonly intent?: 'append' | 'replace' | 'select'; readonly base?: ActiveBundle; initialSearchCount?: number; timeout?: unknown; rotation?: unknown }
  let operation: Operation | null = null, sequence = 0, disposed = false, revision = 0, loadSequence = 0, writeAllowed = false;
  let lastRequest: { inputs: PlanInputs; origin: GenerationOrigin; intent: 'append' | 'replace'; base?: ActiveBundle; baseRevision?: number } | null = null;
  let writes: Promise<unknown> = Promise.resolve();
  const listeners = new Set<() => void>();
  const cancelled = Symbol('cancelled');
  const publish = (patch: Partial<GenerationSnapshot>) => {
    if (disposed) return;
    // Bundles are already detached/frozen by validateActiveBundle. Copying both old
    // and candidate together would exceed the trust-boundary node budget at cap12.
    const { active, candidate, ...metadata } = patch;
    snapshot = Object.freeze({ ...snapshot, ...immutableSnapshot(metadata),
      ...(active !== undefined ? { active } : {}), ...(candidate !== undefined ? { candidate } : {}) });
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
    publish({ status: 'error', error: failure('TIMEOUT', op.intent === 'append' ? 'Не удалось найти новый вариант за 30 секунд. Прежнее меню не изменено' : 'Подбор прерван: время ожидания 30 секунд истекло'), candidate: null, saveError: null });
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
  async function load() {
    if (disposed) return;
    const token = ++loadSequence, atRevision = revision;
    publish({ loadStatus: 'pending', ...(snapshot.active ? {} : { presence: { status: 'pending' } }) });
    try {
      const result = await activePlan.load();
      if (disposed || token !== loadSequence || atRevision !== revision) return;
      if (result.status === 'loaded') {
        const checked = validateActiveBundle(result.bundle.plan, trustedCatalogs);
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
      if (!owned(op) || rejectExpired(op)) return { status: 'cancelled' };
      if (!writeAllowed) return { status: 'blocked' };
      return activePlan.save(candidate.plan, { isCurrent: () => owned(op) && writeAllowed && clock.now() < op.deadline });
    });
    writes = queued.catch(() => undefined);
    let result: ActivePlanSaveResult | typeof cancelled;
    try { result = await wait(queued, op); } catch { result = { status: 'error' }; }
    if (!owned(op) || result === cancelled || rejectExpired(op)) return;
    stopTimers(op);
    if (result.status === 'saved') {
      revision++; writeAllowed = true;
      publish({ status: 'succeeded', active: candidate, candidate: null, lastApplied: candidate.plan.inputs.appliedSettings,
        loadStatus: 'loaded', presence: { status: 'valid', planId: candidate.plan.activeVariantId }, saveError: null,
        ...(op.initialSearchCount !== undefined ? { initialSearchCount: op.initialSearchCount } : {}) });
    } else if (result.status === 'cancelled') {
      invalidate(); publish({ status: 'idle', candidate: null, requestId: null });
    } else {
      publish({ status: 'memory-only', candidate, saveError: result.status });
    }
  }
  async function run(rawInputs: PlanInputs, origin: GenerationOrigin, intent: 'append' | 'replace', base?: ActiveBundle, baseRevision?: number) {
    if (disposed) return;
    if (operation && (snapshot.status === 'pending' || snapshot.status === 'saving') && operation.intent === intent && sameSnapshot(operation.inputs, rawInputs)) return;
    // Only installation of active memory advances revision. Starting a request must
    // not abandon an outstanding read's status and write-permission bookkeeping.
    invalidate();
    const checked = validatePlanInputs(rawInputs);
    if (checked.status !== 'valid') {
      publish({ status: 'error', candidate: null, origin, error: { code: 'GENERATION_DATA_INCOMPLETE', message: 'Проверьте настройки и исходные данные', diagnostics: checked.diagnostics } }); return;
    }
    const op: Operation = { id: String(++sequence), abort: new AbortController(), inputs: checked.inputs, origin: immutableSnapshot(origin), deadline: clock.now() + 30_000, intent, base, baseRevision };
    operation = op; lastRequest = { inputs: op.inputs, origin: op.origin, intent, base, baseRevision };
    publish({ status: 'pending', intent, candidate: null, error: null, saveError: null, requestId: op.id, pendingTextIndex: 0, startedAt: clock.now(), origin: op.origin });
    if (!owned(op)) return;
    armTimeout(op); rotate(op);
    try {
      const excludedFingerprints = base?.plan.variants.map(variantFingerprint) ?? [];
      const result = await wait(generation.generate({ requestId: op.id, inputs: op.inputs, targetCount: intent === 'append' ? 1 : 3,
        ...(intent === 'append' ? { excludedFingerprints } : {}) }, op.abort.signal), op);
      if (!owned(op) || result === cancelled || rejectExpired(op)) return;
      if (result.status === 'cancelled') { cancel(); return; }
      if (result.status === 'error') { stopTimers(op); publish({ status: intent === 'append' && result.error.code === 'SEARCH_EXHAUSTED' ? 'no-new-result' : 'error', error: result.error }); return; }
      const candidate = validateActiveBundle(result.plan, trustedCatalogs);
      if (candidate.status !== 'valid' || !sameSnapshot(result.plan.inputs, op.inputs)) {
        stopTimers(op); publish({ status: 'error', error: { code: 'GENERATION_DATA_INCOMPLETE', message: 'Получено несогласованное меню', diagnostics: candidate.status === 'invalid' ? candidate.diagnostics : [] } }); return;
      }
      if (intent === 'append') {
        const variant = candidate.bundle.plan.variants[0];
        if (!base || candidate.bundle.plan.variants.length !== 1 || excludedFingerprints.includes(variantFingerprint(variant)) || !sameSnapshot(snapshot.active, base)) {
          stopTimers(op); publish({ status: 'error', error: failure('GENERATION_DATA_INCOMPLETE', 'Получено несогласованное меню') }); return;
        }
        // Search IDs are local to its result. Give only the new alternative a free namespace.
        const ids = new Set(base.plan.variants.map(row => row.id));
        let id = `append-${base.plan.variants.length + 1}`;
        while (ids.has(id)) id += '-new';
        const added = { ...variant, id, instances: variant.instances.map(row => ({ ...row, id: `${id}/${row.date}/${row.slot}` })) };
        const merged = validateActiveBundle({ ...base.plan, variants: [...base.plan.variants, added], activeVariantId: id }, trustedCatalogs);
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
    if (disposed || !base || base.plan.variants.length >= 12 || snapshot.status === 'pending' || snapshot.status === 'saving' || snapshot.status === 'memory-only') return;
    await run(base.plan.inputs, origin, 'append', base, revision);
  }
  async function recreateSet(origin: GenerationOrigin) {
    const base = snapshot.active;
    if (disposed || !base) return;
    await run(base.plan.inputs, origin, 'replace', base, revision);
  }
  function cancel() {
    if (disposed) return;
    invalidate(); publish({ status: 'idle', candidate: null, error: null, saveError: null, requestId: null });
  }
  async function retrySave() {
    const candidate = snapshot.candidate, previous = operation;
    if (disposed || snapshot.status !== 'memory-only' || !candidate || !previous) return;
    invalidate();
    if (previous.baseRevision !== undefined && previous.baseRevision !== revision) return;
    const op: Operation = { id: String(++sequence), abort: new AbortController(), inputs: previous.inputs, origin: previous.origin, deadline: clock.now() + 30_000, baseRevision: previous.baseRevision, initialSearchCount: previous.initialSearchCount, intent: previous.intent, base: previous.base };
    operation = op; armTimeout(op);
    publish({ requestId: op.id, startedAt: clock.now() });
    await save(op, candidate);
  }
  async function selectVariant(variantId: string, origin: GenerationOrigin) {
    const active = snapshot.active;
    if (disposed || !active || variantId === active.plan.activeVariantId || !active.plan.variants.some(variant => variant.id === variantId)) return;
    invalidate();
    const candidate = validateActiveBundle({ ...active.plan, activeVariantId: variantId }, trustedCatalogs);
    if (candidate.status !== 'valid') {
      publish({ status: 'error', error: failure('GENERATION_DATA_INCOMPLETE', 'Не удалось проверить выбранный вариант') }); return;
    }
    const op: Operation = { id: String(++sequence), abort: new AbortController(), inputs: active.plan.inputs, origin: immutableSnapshot(origin), deadline: clock.now() + 30_000, baseRevision: revision, intent: 'select' };
    operation = op; armTimeout(op);
    publish({ requestId: op.id, startedAt: clock.now(), origin: op.origin, intent: 'select' });
    await save(op, candidate.bundle);
  }
  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) { if (!disposed) listeners.add(listener); return () => { listeners.delete(listener); }; },
    load, retryLoad: load, start, cancel, retrySave, selectVariant, appendVariant, recreateSet,
    async retryGeneration() { if (lastRequest && (snapshot.status === 'error' || snapshot.status === 'no-new-result')
      && (lastRequest.baseRevision === undefined || lastRequest.baseRevision === revision)) await run(lastRequest.inputs, lastRequest.origin, lastRequest.intent, lastRequest.base, lastRequest.baseRevision); },
    dispose() { if (disposed) return; cancel(); disposed = true; ++loadSequence; listeners.clear(); },
  };
}
