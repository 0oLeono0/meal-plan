import { encodePlanEnvelope, validateActivePlanEnvelope } from '../domain/plan';
import type { ActivePlanEnvelope } from '../domain/plan';
import { projectPlan } from '../domain/planProjection';
import type { PlanProjection } from '../domain/planProjection';
import type { CatalogDiagnostic } from '../domain/catalog';
import { trustedCatalogs } from './trustedCatalogs';
import type { TrustedCatalogRegistry } from './trustedCatalogs';
import { createRecipeEligibility } from '../domain/recipeEligibility';

export const ACTIVE_PLAN_KEY = 'mealplan:guest:active-plan:v1';
export const ACTIVE_PLAN_MAX_BYTES = 4_000_000;
export interface ActiveBundle { readonly plan: ActivePlanEnvelope; readonly projections: readonly PlanProjection[] }
export type ActivePlanLoadResult = { readonly status: 'missing' } | { readonly status: 'loaded'; readonly bundle: ActiveBundle }
  | { readonly status: 'corrupt' | 'error'; readonly diagnostics?: readonly CatalogDiagnostic[] };
export type ActivePlanSaveResult = { readonly status: 'saved'; readonly bundle: ActiveBundle }
  | { readonly status: 'blocked' | 'error' | 'cancelled'; readonly diagnostics?: readonly CatalogDiagnostic[] };
/** Custom async ports must check isCurrent immediately before their final storage mutation. */
export interface ActivePlanPort {
  load(): Promise<ActivePlanLoadResult>;
  save(plan: ActivePlanEnvelope, guard: { readonly isCurrent: () => boolean }): Promise<ActivePlanSaveResult>;
}
type PlanStorage = Pick<Storage, 'getItem' | 'setItem'>;
function fitsActivePlanStorage(raw: string): boolean {
  return raw.length <= ACTIVE_PLAN_MAX_BYTES && new TextEncoder().encode(raw).byteLength <= ACTIVE_PLAN_MAX_BYTES;
}
/** Shared load/save trust boundary. Derived totals are always recomputed, never trusted JSON. */
export function validateActiveBundle(input: unknown, registry: TrustedCatalogRegistry = trustedCatalogs): { readonly status: 'valid'; readonly bundle: ActiveBundle }
  | { readonly status: 'invalid'; readonly diagnostics: readonly CatalogDiagnostic[] } {
  const validated = validateActivePlanEnvelope(input);
  if (validated.status === 'invalid') return validated;
  const plan = validated.plan, projections: PlanProjection[] = [];
  const trust = registry.validate(plan.inputs.catalog);
  if (trust.status === 'invalid') return trust;
  // The shared projection below checks nutrition and price for each serving and row.
  const evaluateEligibility = createRecipeEligibility(plan.inputs, [], { checkIngredientFacts: false });
  const invalid = (code: string, path: string) => ({ status: 'invalid' as const, diagnostics: [{ code, path, message: code }] });
  for (const variant of plan.variants) {
    for (const instance of variant.instances) {
      const eligibility = evaluateEligibility(instance.recipeSnapshot);
      if (eligibility.status !== 'eligible') {
        const code = eligibility.diagnostics[0]?.code;
        const boundaryCode = code === 'SAFETY_FACT_MISSING' || code === 'SAFETY_FACT_UNSUITABLE' ? 'SAFETY_FACT_MISSING_OR_UNSUITABLE' : code === 'UNKNOWN_PROFILE' ? 'SAFETY_UNKNOWN' : code;
        return invalid(boundaryCode ?? 'SAFETY_UNKNOWN', instance.id);
      }
    }
    const result = projectPlan(plan.inputs, variant);
    if (result.status === 'invalid') return result;
    if (!result.projection.budget.check.accepted) return invalid('PLAN_OVER_BUDGET', variant.id);
    projections.push(result.projection);
  }
  // Both values have already crossed their own bounded copy/validation gate.
  // Copying the entire derived ledger alongside all twelve variants again
  // would reject valid plans merely for duplicating validated data.
  return { status: 'valid', bundle: Object.freeze({ plan, projections: Object.freeze(projections) }) };
}
export function createActivePlanAdapter(getStorage: () => PlanStorage = () => window.localStorage, registry: TrustedCatalogRegistry = trustedCatalogs): ActivePlanPort {
  let writable = false, inspectedRaw: string | null = null;
  return {
    async load() {
      writable = false;
      let raw: string | null;
      try { raw = getStorage().getItem(ACTIVE_PLAN_KEY); } catch { return { status: 'error' }; }
      inspectedRaw = raw;
      if (raw === null) { writable = true; return { status: 'missing' }; }
      try {
        if (!fitsActivePlanStorage(raw)) return { status: 'corrupt' };
        const value: unknown = JSON.parse(raw);
        if (typeof value !== 'object' || value === null || Array.isArray(value)
          || Object.keys(value).sort().join(',') !== 'plan,schemaVersion'
          || !('schemaVersion' in value) || value.schemaVersion !== 1 || !('plan' in value)) return { status: 'corrupt' };
        const checked = validateActiveBundle(value.plan, registry);
        if (checked.status === 'invalid') return { status: 'corrupt', diagnostics: checked.diagnostics };
        writable = true;
        return { status: 'loaded', bundle: checked.bundle };
      } catch { return { status: 'corrupt' }; }
    },
    async save(plan, { isCurrent }) {
      if (!isCurrent()) return { status: 'cancelled' };
      if (!writable) return { status: 'blocked' };
      const checked = validateActiveBundle(plan, registry);
      if (checked.status === 'invalid') return { status: 'error', diagnostics: checked.diagnostics };
      try {
        const raw = JSON.stringify({ schemaVersion: 1, plan: encodePlanEnvelope(checked.bundle.plan) });
        if (!fitsActivePlanStorage(raw)) return { status: 'error' };
        const storage = getStorage();
        // Another tab/adapter may have changed storage since our successful inspection.
        if (storage.getItem(ACTIVE_PLAN_KEY) !== inspectedRaw) { writable = false; return { status: 'blocked' }; }
        if (!writable) return { status: 'blocked' };
        if (!isCurrent()) return { status: 'cancelled' };
        storage.setItem(ACTIVE_PLAN_KEY, raw);
        inspectedRaw = raw;
        return { status: 'saved', bundle: checked.bundle };
      } catch { return { status: 'error' }; }
    },
  };
}
/** Structurally compatible with App's presence port without importing React into persistence. */
export function createActivePlanPresencePort(port: ActivePlanPort) {
  return { async load(): Promise<{ status: 'absent' } | { status: 'valid'; planId: string } | { status: 'error' }> {
    const result = await port.load();
    return result.status === 'loaded' ? { status: 'valid', planId: result.bundle.plan.activeVariantId }
      : result.status === 'missing' ? { status: 'absent' } : { status: 'error' };
  } };
}
