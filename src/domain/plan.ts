import { immutableSnapshot, sameSnapshot, validateAppliedSettings } from './appliedSettings';
import type { AppliedSettings, PantrySnapshotRow } from './appliedSettings';
import type { Catalog, CatalogDiagnostic, MealSlot, Recipe, SourceReference } from './catalog';
import { validateCatalog } from '../adapters/catalog';
import { needsPantryWeightConfirmation } from './pantry';
import { compare, decimal, decodeRational, dimension, encodeRational, rational } from './quantities';
import type { Rational } from './quantities';

export const PLAN_SCHEMA_VERSION = 1;
export const EDITED_PLAN_SCHEMA_VERSION = 2;
export const mealSlots = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
export interface PlanInputs {
  readonly schemaVersion: 1;
  readonly appliedSettings: AppliedSettings;
  readonly startDate: string;
  readonly dateBasis: 'local-calendar';
  readonly dates: readonly string[];
  readonly seed: string;
  readonly catalogVersion: string;
  /** Validated offline snapshot; full financial/safety projection is a separate load gate. */
  readonly catalog: Catalog;
  readonly sourceSnapshots: readonly SourceReference[];
  readonly pantrySnapshot: readonly PantrySnapshotRow[];
}
export interface MealCoordinate {
  readonly date: string;
  readonly slot: MealSlot;
}
export interface RecipeInstance extends MealCoordinate {
  readonly id: string;
  readonly recipeId: string;
  readonly catalogVersion: string;
  readonly recipeSnapshot: Recipe;
  /** Family servings. Projection applies selectedServings / baseServings exactly once. */
  readonly selectedServings: Rational;
}
export interface PlanVariant { readonly id: string; readonly instances: readonly RecipeInstance[] }
export interface EditedPlanVariant extends PlanVariant { readonly emptySlots: readonly MealCoordinate[] }
export interface CompletePlanEnvelope {
  readonly schemaVersion: 1;
  readonly inputs: PlanInputs;
  readonly variants: readonly PlanVariant[];
  readonly activeVariantId: string;
}
export interface EditedPlanEnvelope extends Omit<CompletePlanEnvelope, 'schemaVersion' | 'variants'> {
  readonly schemaVersion: 2;
  readonly variants: readonly EditedPlanVariant[];
}
export type ActivePlanEnvelope = CompletePlanEnvelope | EditedPlanEnvelope;
export interface GenerationSelectionOptions {
  /** Initial target3; append requests may ask for1. Runtime boundary accepts only1..3. */
  readonly targetCount?: number;
  /** Canonical assignments already retained by the caller, at most12. */
  readonly excludedFingerprints?: readonly string[];
}
export type GenerationMode = 'leftovers';
export interface GenerationRequest extends GenerationSelectionOptions {
  readonly requestId: string;
  readonly inputs: PlanInputs;
  readonly mode?: GenerationMode;
}
export type GenerationErrorCode = 'GENERATION_DATA_INCOMPLETE' | 'NO_RECIPES' | 'SEARCH_EXHAUSTED' | 'BUDGET_TOO_LOW' | 'TIMEOUT' | 'FAILED';
export interface BudgetEvidence {
  readonly kind: 'lower-bound' | 'exhaustive-minimum';
  readonly amount: Rational;
  readonly proof: {
    readonly method: string;
    readonly catalogVersion: string;
    readonly evaluatedCandidates: number;
    readonly complete: boolean;
  };
}
export interface GenerationError {
  readonly code: GenerationErrorCode;
  readonly message: string;
  readonly diagnostics: readonly CatalogDiagnostic[];
  readonly budgetEvidence?: BudgetEvidence;
}
/** Canonical contract: adapter/controller consumers import these types, without local copies. */
export type GenerationResult = { readonly status: 'success'; readonly plan: CompletePlanEnvelope }
  | { readonly status: 'error'; readonly error: GenerationError } | { readonly status: 'cancelled' };
export interface GenerationPort { generate(request: GenerationRequest, signal: AbortSignal): Promise<GenerationResult> }
export type PlanValidation = { readonly status: 'valid'; readonly plan: ActivePlanEnvelope }
  | { readonly status: 'invalid'; readonly diagnostics: readonly CatalogDiagnostic[] };

const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const text = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0 && value.length <= 256;
function fail(code: string): never { throw new RangeError(code); }
function keys(value: Record<string, unknown>, expected: string): void {
  if (Object.keys(value).sort().join(',') !== expected.split(',').sort().join(',')) fail('INVALID_PLAN_SHAPE');
}
const pad = (number: number, length = 2) => String(number).padStart(length, '0');
/** Reads local fields at launch. No UTC serialization, no elapsed-millisecond day increment. */
export function localDateOnly(date: Date): string {
  if (!(date instanceof Date) || !Number.isFinite(date.getTime()) || date.getFullYear() < 1900 || date.getFullYear() > 9999) return fail('INVALID_LOCAL_DATE');
  return `${pad(date.getFullYear(), 4)}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
function calendarDate(raw: unknown): Date {
  if (typeof raw !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return fail('INVALID_DATE');
  const [year, month, day] = raw.split('-').map(Number);
  if (year < 1900 || year > 9999) return fail('INVALID_DATE');
  const result = new Date(Date.UTC(year, month - 1, day));
  if (result.getUTCFullYear() !== year || result.getUTCMonth() !== month - 1 || result.getUTCDate() !== day) return fail('INVALID_DATE');
  return result;
}
/** UTC is used only as a timezone-neutral calendar calculator for already-local date-only data. */
export function calendarDates(startDate: string, days: number): readonly string[] {
  if (!Number.isSafeInteger(days) || days < 1 || days > 7) return fail('INVALID_DAYS');
  const date = calendarDate(startDate);
  return Object.freeze(Array.from({ length: days }, () => {
    if (date.getUTCFullYear() > 9999) return fail('INVALID_DATE');
    const result = `${pad(date.getUTCFullYear(), 4)}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
    date.setUTCDate(date.getUTCDate() + 1);
    return result;
  }));
}
function sources(catalog: Catalog): readonly SourceReference[] {
  const found = new Map<string, SourceReference>();
  const add = (source: SourceReference) => {
    const id = JSON.stringify([source.sourceId, source.recordId, source.release]);
    if (found.has(id) && !sameSnapshot(found.get(id), source)) fail('SOURCE_IDENTITY_CONFLICT');
    found.set(id, source);
  };
  for (const food of catalog.foods) {
    if (food.nutrition.status === 'known') add(food.nutrition.source);
    if (food.price.status === 'known') add(food.price.source);
    if (food.safety.status === 'known') food.safety.facts.forEach(fact => fact.evidence.forEach(add));
    if (food.safety.status === 'conflicting') food.safety.evidence.forEach(add);
  }
  catalog.recipes.forEach(recipe => add(recipe.source));
  return [...found.values()];
}
function assertExact(value: unknown, positive = true): asserts value is Rational {
  if (!record(value) || typeof value.numerator !== 'bigint' || typeof value.denominator !== 'bigint') fail('INVALID_RATIONAL');
  keys(value, 'numerator,denominator');
  const normalized = rational(value.numerator, value.denominator);
  if (!sameSnapshot(normalized, value) || (positive ? normalized.numerator <= 0n : normalized.numerator < 0n)) fail('INVALID_RATIONAL');
}
function assertPantry(input: unknown): asserts input is readonly PantrySnapshotRow[] {
  if (!Array.isArray(input) || input.length > 1000) fail('INVALID_PANTRY');
  const ids = new Set<string>();
  for (const row of input) {
    if (!record(row) || !text(row.productId) || ids.has(row.productId) || typeof row.expiresSoon !== 'boolean' || !record(row.quantity)) fail('INVALID_PANTRY');
    keys(row, 'productId,quantity,expiresSoon'); ids.add(row.productId);
    if (row.quantity.status === 'unknown') keys(row.quantity, 'status');
    else if (row.quantity.status === 'known' && record(row.quantity.value)) {
      keys(row.quantity, 'status,value'); keys(row.quantity.value, 'amount,unit');
      assertExact(row.quantity.value.amount);
      dimension(row.quantity.value.unit as Parameters<typeof dimension>[0]);
    } else fail('INVALID_PANTRY');
  }
}
function assertInputs(value: unknown): asserts value is PlanInputs {
  if (!record(value)) fail('INVALID_INPUTS');
  keys(value, 'schemaVersion,appliedSettings,startDate,dateBasis,dates,seed,catalogVersion,catalog,sourceSnapshots,pantrySnapshot');
  if (value.schemaVersion !== PLAN_SCHEMA_VERSION || value.dateBasis !== 'local-calendar' || !text(value.seed)) fail('INVALID_INPUTS');
  const applied = validateAppliedSettings(value.appliedSettings);
  if (applied.status !== 'applied') fail('INVALID_APPLIED_SETTINGS');
  if (!sameSnapshot(value.dates, calendarDates(value.startDate as string, applied.settings.days))) fail('INVALID_DATES');
  // Reuse the existing pure catalog boundary instead of a weaker second schema.
  const catalog = validateCatalog(value.catalog);
  if (catalog.status !== 'loaded' || value.catalogVersion !== catalog.catalog.version) fail('INVALID_CATALOG_SNAPSHOT');
  if (!sameSnapshot(value.sourceSnapshots, sources(catalog.catalog))) fail('INVALID_SOURCE_SNAPSHOT');
  assertPantry(value.pantrySnapshot);
}
export function createPlanInputs(appliedSettings: AppliedSettings, catalog: Catalog, options: {
  readonly seed: string;
  readonly now?: () => Date;
  readonly pantrySnapshot?: readonly PantrySnapshotRow[];
}): PlanInputs {
  const startDate = localDateOnly((options.now ?? (() => new Date()))());
  const value = immutableSnapshot({ schemaVersion: PLAN_SCHEMA_VERSION, appliedSettings, startDate, dateBasis: 'local-calendar',
    dates: calendarDates(startDate, appliedSettings.days), seed: options.seed, catalogVersion: catalog.version, catalog,
    sourceSnapshots: sources(catalog), pantrySnapshot: options.pantrySnapshot ?? appliedSettings.home.filter(
      row => row.quantity.status !== 'known' || !needsPantryWeightConfirmation(row.productId, row.quantity.value.unit),
    ) });
  assertInputs(value);
  return value;
}
function coordinateIndex(dates: readonly string[], coordinate: Record<string, unknown>): number {
  const day = dates.indexOf(coordinate.date as string), slot = mealSlots.indexOf(coordinate.slot as MealSlot);
  return day < 0 || slot < 0 ? -1 : day * mealSlots.length + slot;
}
export function planCoordinates(dates: readonly string[]): readonly MealCoordinate[] {
  return dates.flatMap(date => mealSlots.map(slot => ({ date, slot })));
}
function assertInstances(instances: unknown, inputs: PlanInputs, allIds: Set<string>, emptySlots?: readonly unknown[]): asserts instances is readonly RecipeInstance[] {
  const size = inputs.dates.length * mealSlots.length;
  if (!Array.isArray(instances) || instances.length + (emptySlots?.length ?? 0) !== size) fail('INVALID_INSTANCE_COUNT');
  const occupied = new Set<number>();
  const recipes = new Map(inputs.catalog.recipes.map(recipe => [recipe.id, recipe]));
  let previous = -1;
  for (let index = 0; index < instances.length; index++) {
    const instance: unknown = instances[index];
    if (!record(instance)) fail('INVALID_INSTANCE');
    keys(instance, 'id,date,slot,recipeId,catalogVersion,recipeSnapshot,selectedServings');
    const coordinate = coordinateIndex(inputs.dates, instance);
    if (!text(instance.id) || allIds.has(instance.id) || coordinate <= previous) fail('INVALID_INSTANCE_IDENTITY');
    previous = coordinate;
    occupied.add(coordinate);
    allIds.add(instance.id);
    const recipe = typeof instance.recipeId === 'string' ? recipes.get(instance.recipeId) : undefined;
    if (!recipe || !recipe.slots.includes(instance.slot as MealSlot) || instance.catalogVersion !== inputs.catalogVersion || !sameSnapshot(recipe, instance.recipeSnapshot)) fail('INVALID_RECIPE_REFERENCE');
    assertExact(instance.selectedServings);
    // Computational bound, not a new UI portion policy. Initial servings always equal the family size.
    if (compare(instance.selectedServings, decimal('1000')) > 0) fail('INVALID_SERVINGS');
  }
  previous = -1;
  for (const empty of emptySlots ?? []) {
    if (!record(empty)) fail('INVALID_EMPTY_SLOT');
    keys(empty, 'date,slot');
    const coordinate = coordinateIndex(inputs.dates, empty);
    if (coordinate <= previous || occupied.has(coordinate)) fail('INVALID_EMPTY_SLOT');
    previous = coordinate;
  }
}
export function createRecipeInstances(inputs: PlanInputs, recipeIds: readonly string[], idFactory: (date: string, slot: MealSlot) => string): readonly RecipeInstance[] {
  assertInputs(inputs);
  if (recipeIds.length !== inputs.dates.length * 4) return fail('INVALID_INSTANCE_COUNT');
  const instances = inputs.dates.flatMap((date, day) => mealSlots.map((slot, index) => {
    const recipe = inputs.catalog.recipes.find(recipe => recipe.id === recipeIds[day * 4 + index]);
    if (!recipe) return fail('UNKNOWN_RECIPE');
    return { id: idFactory(date, slot), date, slot, recipeId: recipe.id, catalogVersion: inputs.catalogVersion,
      recipeSnapshot: recipe, selectedServings: decimal(String(inputs.appliedSettings.people)) };
  }));
  assertInstances(instances, inputs, new Set());
  return immutableSnapshot(instances);
}
/** Encoded rationals are the only representation with string numerator/denominator. */
function decodeValues(input: unknown): unknown {
  if (Array.isArray(input)) return input.map(decodeValues);
  if (record(input)) {
    if ('numerator' in input || 'denominator' in input) {
      if (typeof input.numerator === 'bigint' && typeof input.denominator === 'bigint') { assertExact(input, false); return input; }
      return decodeRational(input);
    }
    return Object.fromEntries(Object.entries(input).map(([key, value]) => [key, decodeValues(value)]));
  }
  return input;
}
export function validatePlanInputs(input: unknown): { readonly status: 'valid'; readonly inputs: PlanInputs } | { readonly status: 'invalid'; readonly diagnostics: readonly CatalogDiagnostic[] } {
  try {
    const value = immutableSnapshot(decodeValues(immutableSnapshot(input)));
    assertInputs(value);
    return { status: 'valid', inputs: value };
  } catch (error) { return invalidPlan(error); }
}
function invalidPlan(error: unknown): { readonly status: 'invalid'; readonly diagnostics: readonly CatalogDiagnostic[] } {
  const code = error instanceof Error ? error.message : 'INVALID_PLAN';
  return { status: 'invalid', diagnostics: [{ code, path: 'plan', message: code }] };
}
/** Shape/integrity only. Call shared projection for full price/safety/budget validation on load. */
export function validateActivePlanEnvelope(input: unknown): PlanValidation {
  try {
    const value = immutableSnapshot(decodeValues(immutableSnapshot(input)));
    if (!record(value)) fail('INVALID_PLAN');
    keys(value, 'schemaVersion,inputs,variants,activeVariantId');
    if ((value.schemaVersion !== PLAN_SCHEMA_VERSION && value.schemaVersion !== EDITED_PLAN_SCHEMA_VERSION) || !text(value.activeVariantId) || !Array.isArray(value.variants) || value.variants.length < 1 || value.variants.length > 12) fail('INVALID_PLAN');
    assertInputs(value.inputs);
    const variants = new Set<string>(), instances = new Set<string>();
    for (const variant of value.variants) {
      if (!record(variant) || !text(variant.id) || variants.has(variant.id)) fail('INVALID_VARIANT');
      const edited = value.schemaVersion === EDITED_PLAN_SCHEMA_VERSION;
      keys(variant, edited ? 'id,instances,emptySlots' : 'id,instances');
      if (edited && !Array.isArray(variant.emptySlots)) fail('INVALID_EMPTY_SLOT');
      variants.add(variant.id);
      assertInstances(variant.instances, value.inputs, instances, edited ? variant.emptySlots as unknown[] : undefined);
    }
    if (!variants.has(value.activeVariantId)) fail('INVALID_ACTIVE_VARIANT');
    return { status: 'valid', plan: value as unknown as ActivePlanEnvelope };
  } catch (error) { return invalidPlan(error); }
}
export function buildActivePlanEnvelope(inputs: PlanInputs, variants: readonly PlanVariant[], activeVariantId: string): CompletePlanEnvelope {
  const result = validateActivePlanEnvelope({ schemaVersion: PLAN_SCHEMA_VERSION, inputs, variants, activeVariantId });
  if (result.status === 'invalid') return fail(result.diagnostics[0].code);
  if (result.plan.schemaVersion !== PLAN_SCHEMA_VERSION) return fail('INVALID_PLAN');
  return result.plan;
}
/** JSON-safe, detached boundary. Invalid envelopes never get a persistence payload. */
export function encodePlanEnvelope(input: ActivePlanEnvelope): unknown {
  const validated = validateActivePlanEnvelope(input);
  if (validated.status !== 'valid') return fail(validated.diagnostics[0].code);
  const encode = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(encode);
    if (record(value)) {
      if (typeof value.numerator === 'bigint' && typeof value.denominator === 'bigint') return encodeRational(value as unknown as Rational);
      return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, encode(item)]));
    }
    return value;
  };
  return encode(validated.plan);
}
