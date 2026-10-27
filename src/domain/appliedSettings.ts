import { createDraft, isSettingsDraft, validateStep } from './settings';
import type { Goal, SettingsDraft, StepErrors, Step, TargetSource } from './settings';
import { nutritionKeys, parseManualTarget } from './nutritionTarget';
import type { Nutrition } from './catalog';
import { normalizeQuantity, parseDraftQuantity } from './quantities';
import type { Quantity, Rational } from './quantities';

export type DeepReadonly<T> = T extends readonly (infer Item)[] ? readonly DeepReadonly<Item>[]
  : T extends object ? { readonly [Key in keyof T]: DeepReadonly<T[Key]> } : T;
export interface PantrySnapshotRow {
  readonly productId: string;
  readonly quantity: { readonly status: 'unknown' } | { readonly status: 'known'; readonly value: Quantity };
  readonly expiresSoon: boolean;
}
export interface AppliedSettings {
  readonly schemaVersion: 1;
  readonly people: number;
  readonly days: number;
  readonly goal: Goal;
  readonly budget: { readonly limit: Rational; readonly basis: 'family-period-purchases'; readonly currency: 'RUB' };
  readonly cookingMinutes: number | null;
  readonly variety: SettingsDraft['variety'];
  readonly restrictions: readonly string[];
  readonly exclusionIds: readonly string[];
  readonly home: readonly PantrySnapshotRow[];
  readonly target: { readonly status: 'absent' } | {
    readonly status: 'known'; readonly basis: 'person-day'; readonly values: Nutrition; readonly source: DeepReadonly<TargetSource>;
  };
  /** Retain user-entered decimal strings and provenance; never reconstruct them from Number. */
  readonly raw: DeepReadonly<SettingsDraft>;
}
export type AppliedSettingsResult = { readonly status: 'applied'; readonly settings: AppliedSettings }
  | { readonly status: 'invalid'; readonly step: Step; readonly errors: StepErrors };

/** Bounded immutable copy for the applied/plan trust boundary, including exact values. */
export function immutableSnapshot<T>(input: T): DeepReadonly<T> {
  let nodes = 0;
  const copy = (value: unknown, depth: number): unknown => {
    if (++nodes > 100000 || depth > 24) throw new RangeError('SNAPSHOT_SIZE_LIMIT');
    if (typeof value === 'string' && value.length > 4096) throw new RangeError('SNAPSHOT_SIZE_LIMIT');
    if (Array.isArray(value)) {
      if (value.length > 5000) throw new RangeError('SNAPSHOT_SIZE_LIMIT');
      return Object.freeze(value.map(item => copy(item, depth + 1)));
    }
    if (value && typeof value === 'object') {
      const keys = Object.keys(value);
      if (keys.length > 100 || Object.getPrototypeOf(value) !== Object.prototype) throw new RangeError('INVALID_SNAPSHOT');
      return Object.freeze(Object.fromEntries(keys.map(key => [key, copy((value as Record<string, unknown>)[key], depth + 1)])));
    }
    if (value === null || ['string', 'boolean', 'bigint'].includes(typeof value) || (typeof value === 'number' && Number.isFinite(value))) return value;
    throw new RangeError('INVALID_SNAPSHOT');
  };
  return copy(input, 0) as DeepReadonly<T>;
}
/** Structural equality also checks exact bigint values and own keys, independent of JSON key order. */
export function sameSnapshot(left: unknown, right: unknown): boolean {
  if (left === right) return true;
  if (typeof left !== 'object' || left === null || typeof right !== 'object' || right === null || Array.isArray(left) !== Array.isArray(right)) return false;
  const a = Object.keys(left), b = Object.keys(right);
  return a.length === b.length && a.every(key => Object.prototype.hasOwnProperty.call(right, key)
    && sameSnapshot((left as Record<string, unknown>)[key], (right as Record<string, unknown>)[key]));
}
const invalid = (step: Step, errors: StepErrors): AppliedSettingsResult => ({ status: 'invalid', step, errors });

/** The sole apply gate for wizard completion and quick start. Skip is navigation, never deletion. */
export function buildAppliedSettings(input: unknown): AppliedSettingsResult {
  let raw: SettingsDraft;
  try {
    const detached = immutableSnapshot(input);
    if (!isSettingsDraft(detached)) return invalid(1, { people: 'Сохранённые настройки повреждены. Проверьте мастер' });
    raw = detached;
  } catch { return invalid(1, { people: 'Сохранённые настройки повреждены. Проверьте мастер' }); }
  for (const step of [1, 2, 3, 4] as const) {
    const errors = validateStep(raw, step);
    if (Object.keys(errors).length) return invalid(step, errors);
    // Existing parsers establish UI semantics; exact parsing consumes the original strings.
    try {
      if (step === 1 && parseManualTarget(raw.manualNutrition).status === 'valid') nutritionKeys.forEach(key => parseDraftQuantity(raw.manualNutrition[key]));
      if (step === 2) parseDraftQuantity(raw.budget);
      if (step === 4) raw.home.forEach(row => { if (row.quantity.trim()) normalizeQuantity({ amount: parseDraftQuantity(row.quantity), unit: row.unit! }); });
    } catch { return invalid(step, step === 1 ? { manualNutrition: 'Слишком длинное точное число' }
      : step === 2 ? { budget: 'Слишком длинное точное число' } : { home: 'Слишком длинное точное количество' }); }
  }
  const target = parseManualTarget(raw.manualNutrition).status === 'absent' ? { status: 'absent' as const } : {
    status: 'known' as const, basis: 'person-day' as const, source: raw.targetSource,
    values: {
      calories: parseDraftQuantity(raw.manualNutrition.calories), protein: parseDraftQuantity(raw.manualNutrition.protein),
      fat: parseDraftQuantity(raw.manualNutrition.fat), carbohydrates: parseDraftQuantity(raw.manualNutrition.carbohydrates),
    },
  };
  return { status: 'applied', settings: immutableSnapshot({
    schemaVersion: 1, people: Number(raw.people), days: Number(raw.days), goal: raw.goal,
    budget: { limit: parseDraftQuantity(raw.budget), basis: 'family-period-purchases', currency: 'RUB' },
    cookingMinutes: raw.cookingTime === 'any' ? null : Number(raw.cookingTime), variety: raw.variety,
    restrictions: raw.restrictions, exclusionIds: raw.exclusionIds,
    home: raw.home.map(row => ({ productId: row.productId, expiresSoon: row.expiresSoon,
      quantity: row.quantity.trim() ? { status: 'known' as const, value: normalizeQuantity({ amount: parseDraftQuantity(row.quantity), unit: row.unit! }) }
        : { status: 'unknown' as const } })), target, raw,
  } satisfies AppliedSettings) };
}
/** Applied settings are validated against their raw source, never accepted because truthy. */
export function validateAppliedSettings(input: unknown): AppliedSettingsResult {
  try {
    const snapshot = immutableSnapshot(input);
    if (!snapshot || typeof snapshot !== 'object' || !('raw' in snapshot)) return invalid(1, { people: 'Настройки повреждены' });
    const rebuilt = buildAppliedSettings(snapshot.raw);
    return rebuilt.status === 'applied' && sameSnapshot(rebuilt.settings, snapshot) ? rebuilt : invalid(1, { people: 'Настройки повреждены' });
  } catch { return invalid(1, { people: 'Настройки повреждены' }); }
}
export function selectQuickStartInput(draft?: unknown, lastApplied?: unknown): AppliedSettingsResult {
  const previous = validateAppliedSettings(lastApplied);
  return previous.status === 'applied' ? previous : buildAppliedSettings(draft === undefined ? createDraft() : draft);
}
