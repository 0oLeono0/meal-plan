import type { CatalogPort } from '../domain/catalog';
import { sameSnapshot } from '../domain/appliedSettings';
import { validatePlanInputs } from '../domain/plan';
import type { GenerationErrorCode, GenerationPort, GenerationResult } from '../domain/plan';
import { createPlanSearch, SEARCH_LIMITS } from '../domain/generatePlan';
import type { SearchOptions } from '../domain/generatePlan';
import { validateCatalog } from './catalog';
export interface GenerationOptions {
  readonly search?: SearchOptions;
  readonly yieldTask?: () => Promise<void>;
  readonly timeoutMs?: number;
}
const failure = (code: GenerationErrorCode): GenerationResult => ({ status: 'error', error: { code,
  message: code === 'TIMEOUT' ? 'Не удалось подобрать меню за 30 секунд. Попробуйте ещё раз' : code === 'GENERATION_DATA_INCOMPLETE' ? 'Каталог или настройки не прошли проверку' : 'Не удалось выполнить подбор. Попробуйте ещё раз', diagnostics: [] } });
const macrotask = () => new Promise<void>(resolve => setTimeout(resolve, 0));

/** No default production catalog: a source-approved offline CatalogPort must be injected.
 * Each request owns its timer/listener/state; the adapter never writes a plan or applies
 * late responses. Fast results have no minimum delay. Pending work yields every128 steps.
 */
export function createLocalGeneration(catalog: CatalogPort, options: GenerationOptions = {}): GenerationPort {
  const timeoutMs = options.timeoutMs ?? 30000;
  const yieldTask = options.yieldTask ?? macrotask;
  const searchOptions = { ...options.search, ...(options.search?.allergenKeys ? { allergenKeys: [...options.search.allergenKeys] } : {}) };
  return { async generate(request, signal) {
    if (signal.aborted) return { status: 'cancelled' };
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0 || timeoutMs > 30000) return failure('FAILED');
    // Detach before the first await: caller mutations during catalog loading cannot alter work.
    const validated = validatePlanInputs(request.inputs);
    const targetCount = request.targetCount === undefined ? (searchOptions.targetCount === undefined ? 3 : searchOptions.targetCount) : request.targetCount;
    const exclusions = request.excludedFingerprints === undefined ? (searchOptions.excludedFingerprints === undefined ? [] : searchOptions.excludedFingerprints) : request.excludedFingerprints;
    if (!Number.isSafeInteger(targetCount) || targetCount < 1 || targetCount > 3 || !Array.isArray(exclusions)
      || exclusions.length > 12 || exclusions.some(key => typeof key !== 'string' || !key.trim() || key.length > 32768)) return failure('GENERATION_DATA_INCOMPLETE');
    const selection = { targetCount, excludedFingerprints: [...exclusions] };
    if (validated.status === 'invalid' || typeof request.requestId !== 'string' || !request.requestId.trim() || request.requestId.length > 256) {
      return validated.status === 'invalid' ? { status: 'error', error: { code: 'GENERATION_DATA_INCOMPLETE', message: 'Настройки не прошли проверку', diagnostics: validated.diagnostics } } : failure('FAILED');
    }
    const started = performance.now();
    let stopped = false, expired = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let onAbort = () => {};
    const interrupted = (): GenerationResult | undefined => signal.aborted ? { status: 'cancelled' }
      : expired || performance.now() - started >= timeoutMs ? failure('TIMEOUT') : stopped ? { status: 'cancelled' } : undefined;
    const interruption = new Promise<GenerationResult>(resolve => {
      onAbort = () => { stopped = true; resolve({ status: 'cancelled' }); };
      signal.addEventListener('abort', onAbort, { once: true });
      timer = setTimeout(() => { expired = true; stopped = true; resolve(failure('TIMEOUT')); }, timeoutMs);
      if (signal.aborted) onAbort();
    });
    const work = async (): Promise<GenerationResult> => {
      try {
        const loaded = await catalog.load();
        const stoppedAfterLoad = interrupted(); if (stoppedAfterLoad) return stoppedAfterLoad;
        if (loaded.status !== 'loaded') return { status: 'error', error: { code: 'GENERATION_DATA_INCOMPLETE', message: 'Каталог не прошёл проверку', diagnostics: loaded.diagnostics } };
        // Custom ports are untrusted too; version equality alone does not prove snapshot identity.
        const checked = validateCatalog(loaded.catalog);
        if (checked.status !== 'loaded') return { status: 'error', error: { code: 'GENERATION_DATA_INCOMPLETE', message: 'Каталог не прошёл проверку', diagnostics: checked.diagnostics } };
        if (!sameSnapshot(checked.catalog, validated.inputs.catalog)) return { status: 'error', error: { code: 'GENERATION_DATA_INCOMPLETE', message: 'Каталог изменился. Запустите подбор снова',
          diagnostics: [{ code: 'CATALOG_SNAPSHOT_MISMATCH', path: 'catalog', message: 'CATALOG_SNAPSHOT_MISMATCH' }] } };
        const search = createPlanSearch(validated.inputs, { ...searchOptions, ...selection });
        while (true) {
          for (let step = 0; step < SEARCH_LIMITS.batchSize; step++) {
            const stop = interrupted(); if (stop) return stop;
            const next = search.next();
            // A single expensive bounded step may cross the deadline. Never resolve late success.
            const afterStep = interrupted(); if (afterStep) return afterStep;
            if (next.done) return next.value;
          }
          await yieldTask();
          const afterYield = interrupted(); if (afterYield) return afterYield;
        }
      } catch { return interrupted() ?? failure('FAILED'); }
    };
    try {
      const result = await Promise.race([work(), interruption]);
      return signal.aborted ? { status: 'cancelled' } : expired ? failure('TIMEOUT') : result;
    } finally {
      stopped = true;
      if (timer !== undefined) clearTimeout(timer);
      signal.removeEventListener('abort', onAbort);
    }
  } };
}
