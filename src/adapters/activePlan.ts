import { encodePlanEnvelope, validateActivePlanEnvelope } from '../domain/plan';
import type { ActivePlanEnvelope } from '../domain/plan';
import { projectPlan } from '../domain/planProjection';
import type { PlanProjection } from '../domain/planProjection';
import type { CatalogDiagnostic } from '../domain/catalog';
import { trustedCatalogs } from './trustedCatalogs';
import type { TrustedCatalogRegistry } from './trustedCatalogs';
import { createRecipeEligibility } from '../domain/recipeEligibility';
import { matchesPantryFood } from '../domain/pantry';
import { convertQuantity } from '../domain/quantities';
import { inventoryPantrySnapshot, validateInventoryRows } from './pantryInventory';
import type { PantryInventoryRow } from './pantryInventory';
import type { PlanInputs } from '../domain/plan';

export const ACTIVE_PLAN_KEY = 'mealplan:guest:active-plan:v1';
export const ACTIVE_PLAN_MAX_BYTES = 4_000_000;
export interface VariantPantryAdmission { readonly variantId: string; readonly rows: readonly PantryInventoryRow[] }
interface ActivePlanMetadata {
  readonly admissionPantries?: readonly VariantPantryAdmission[];
  readonly wizardPantryToken?: string | null;
}
export interface ActiveBundle extends ActivePlanMetadata {
  readonly plan: ActivePlanEnvelope;
  readonly projections: readonly PlanProjection[];
}
export type ActivePlanLoadResult = { readonly status: 'missing' } | { readonly status: 'loaded'; readonly bundle: ActiveBundle }
  | { readonly status: 'corrupt' | 'error'; readonly diagnostics?: readonly CatalogDiagnostic[] };
export type ActivePlanSaveResult = { readonly status: 'saved'; readonly bundle: ActiveBundle }
  | { readonly status: 'blocked' | 'error' | 'cancelled'; readonly diagnostics?: readonly CatalogDiagnostic[] };
/** Custom async ports must check isCurrent immediately before their final storage mutation. */
export interface ActivePlanPort {
  load(): Promise<ActivePlanLoadResult>;
  save(plan: ActivePlanEnvelope, guard: ActivePlanMetadata & { readonly isCurrent: () => boolean }): Promise<ActivePlanSaveResult>;
}
type PlanStorage = Pick<Storage, 'getItem' | 'setItem'>;
function fitsActivePlanStorage(raw: string): boolean {
  return raw.length <= ACTIVE_PLAN_MAX_BYTES && new TextEncoder().encode(raw).byteLength <= ACTIVE_PLAN_MAX_BYTES;
}
function parseAdmissionPantries(input: unknown, plan: ActivePlanEnvelope): readonly VariantPantryAdmission[] | null {
  if (!Array.isArray(input) || input.length === 0 || input.length > plan.variants.length) return null;
  const knownIds = new Set(plan.variants.map(variant => variant.id));
  const admissions: VariantPantryAdmission[] = [];
  for (const entry of input) {
    if (!entry || typeof entry !== 'object' || Object.getPrototypeOf(entry) !== Object.prototype
      || Object.keys(entry).sort().join(',') !== 'rows,variantId' || !knownIds.delete(entry.variantId)) return null;
    const rows = validateInventoryRows(entry.rows);
    if (!rows?.length) return null;
    admissions.push(Object.freeze({ variantId: entry.variantId, rows }));
  }
  return Object.freeze(admissions);
}

/** Keep only exact known stock that can cover a profile in this variant's ledger. */
export function applicableAdmissionRows(inputs: PlanInputs, projection: PlanProjection, rows: readonly PantryInventoryRow[]) {
  const snapshot = inventoryPantrySnapshot(rows);
  return rows.filter((_, index) => {
    const stock = snapshot[index];
    if (stock.quantity.status !== 'known') return false;
    const amount = stock.quantity.value;
    return projection.covered.some(requirement => {
      if (!matchesPantryFood(stock.productId, requirement)) return false;
      const food = inputs.catalog.foods.find(food => food.productId === requirement.productId && food.profileId === requirement.profileId);
      if (!food) return false;
      try { return convertQuantity(amount, requirement.required.unit, food, food.conversions).amount.numerator > 0n; }
      catch { return false; }
    });
  });
}
/** Shared load/save trust boundary. Derived totals are always recomputed, never trusted JSON. */
export function validateActiveBundle(input: unknown, registry: TrustedCatalogRegistry = trustedCatalogs, rawAdmissionPantries?: unknown, wizardPantryToken?: unknown): { readonly status: 'valid'; readonly bundle: ActiveBundle }
  | { readonly status: 'invalid'; readonly diagnostics: readonly CatalogDiagnostic[] } {
  const validated = validateActivePlanEnvelope(input);
  if (validated.status === 'invalid') return validated;
  const plan = validated.plan, projections: PlanProjection[] = [];
  const trust = registry.validate(plan.inputs.catalog);
  if (trust.status === 'invalid') return trust;
  // The shared projection below checks nutrition and price for each serving and row.
  const evaluateEligibility = createRecipeEligibility(plan.inputs, [], { checkIngredientFacts: false });
  const invalid = (code: string, path: string) => ({ status: 'invalid' as const, diagnostics: [{ code, path, message: code }] });
  const admissionPantries = rawAdmissionPantries === undefined ? undefined : parseAdmissionPantries(rawAdmissionPantries, plan);
  if (admissionPantries === null) return invalid('INVALID_PANTRY_ADMISSION', 'admissionPantries');
  if (wizardPantryToken !== undefined && wizardPantryToken !== null
    && (typeof wizardPantryToken !== 'string' || wizardPantryToken.length !== 32 || !/^[a-f0-9]{32}$/.test(wizardPantryToken))) {
    return invalid('INVALID_WIZARD_PANTRY_TOKEN', 'wizardPantryToken');
  }
  for (const variant of plan.variants) {
    for (const instance of variant.instances) {
      const eligibility = evaluateEligibility(instance.recipeSnapshot);
      if (eligibility.status !== 'eligible') {
        const code = eligibility.diagnostics[0]?.code;
        const boundaryCode = code === 'SAFETY_FACT_MISSING' || code === 'SAFETY_FACT_UNSUITABLE' ? 'SAFETY_FACT_MISSING_OR_UNSUITABLE' : code === 'UNKNOWN_PROFILE' ? 'SAFETY_UNKNOWN' : code;
        return invalid(boundaryCode ?? 'SAFETY_UNKNOWN', instance.id);
      }
    }
    const admission = admissionPantries?.find(entry => entry.variantId === variant.id);
    const inputs = admission ? { ...plan.inputs, pantrySnapshot: inventoryPantrySnapshot(admission.rows) } : plan.inputs;
    const result = projectPlan(inputs, variant);
    if (result.status === 'invalid') return result;
    if (admission && applicableAdmissionRows(inputs, result.projection, admission.rows).length !== admission.rows.length) {
      return invalid('INVALID_PANTRY_ADMISSION', variant.id);
    }
    if (!result.projection.budget.check.accepted) return invalid('PLAN_OVER_BUDGET', variant.id);
    projections.push(result.projection);
  }
  // Both values have already crossed their own bounded copy/validation gate.
  // Copying the entire derived ledger alongside all twelve variants again
  // would reject valid plans merely for duplicating validated data.
  return { status: 'valid', bundle: Object.freeze({ plan, projections: Object.freeze(projections),
    ...(admissionPantries ? { admissionPantries } : {}), ...(wizardPantryToken !== undefined ? { wizardPantryToken } : {}) }) };
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
          || !('schemaVersion' in value) || !('plan' in value)) return { status: 'corrupt' };
        const keys = Object.keys(value);
        const versionOne = value.schemaVersion === 1 && keys.length === 2;
        const versionTwo = value.schemaVersion === 2 && ('admissionPantries' in value || 'wizardPantryToken' in value)
          && keys.every(key => ['schemaVersion', 'plan', 'admissionPantries', 'wizardPantryToken'].includes(key));
        if (!versionOne && !versionTwo) return { status: 'corrupt' };
        const checked = validateActiveBundle(value.plan, registry,
          'admissionPantries' in value ? value.admissionPantries : undefined,
          'wizardPantryToken' in value ? value.wizardPantryToken : undefined);
        if (checked.status === 'invalid') return { status: 'corrupt', diagnostics: checked.diagnostics };
        writable = true;
        return { status: 'loaded', bundle: checked.bundle };
      } catch { return { status: 'corrupt' }; }
    },
    async save(plan, { isCurrent, admissionPantries, wizardPantryToken }) {
      if (!isCurrent()) return { status: 'cancelled' };
      if (!writable) return { status: 'blocked' };
      const checked = validateActiveBundle(plan, registry, admissionPantries, wizardPantryToken);
      if (checked.status === 'invalid') return { status: 'error', diagnostics: checked.diagnostics };
      try {
        const encoded = encodePlanEnvelope(checked.bundle.plan);
        const { admissionPantries: admission, wizardPantryToken: token } = checked.bundle;
        const schemaVersion = admission || token !== undefined ? 2 : 1;
        const raw = JSON.stringify({ schemaVersion, plan: encoded, admissionPantries: admission, wizardPantryToken: token });
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
