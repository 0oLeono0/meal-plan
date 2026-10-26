import { parseManualTarget } from './nutritionTarget';
import { parseBudget } from './budget';
import { productNames } from '../adapters/products';

export type Step = 1 | 2 | 3 | 4;
export type Goal = 'maintain' | 'lose' | 'gain';
export type Unit = 'g' | 'kg' | 'ml' | 'l' | 'pcs';
export type TargetSource = { kind: 'manual' } | { kind: 'calculated'; formulaVersion: string; sourceRef: string };
export interface ManualNutrition {
  calories: string;
  protein: string;
  fat: string;
  carbohydrates: string;
}
export interface HomeDraftRow {
  productId: string;
  quantity: string;
  unit?: Unit;
  expiresSoon: boolean;
}
export interface SettingsDraft {
  step: Step;
  people: string;
  days: string;
  goal: Goal;
  budget: string;
  cookingTime: '15' | '30' | '60' | 'any';
  variety: 'same' | 'medium' | 'max';
  restrictions: string[];
  exclusionIds: string[];
  home: HomeDraftRow[];
  manualNutrition: ManualNutrition;
  targetSource: TargetSource;
}

export function createDraft(): SettingsDraft {
  return {
    step: 1, people: '2', days: '7', goal: 'maintain', budget: '3000',
    cookingTime: '30', variety: 'medium', restrictions: [], exclusionIds: [], home: [],
    manualNutrition: { calories: '', protein: '', fat: '', carbohydrates: '' },
    targetSource: { kind: 'manual' },
  };
}

const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const nonempty = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const ids = (value: unknown): value is string[] => Array.isArray(value) && value.every(nonempty) && new Set(value).size === value.length;
export const isStep = (value: unknown): value is Step => value === 1 || value === 2 || value === 3 || value === 4;
const isUnit = (value: unknown): value is Unit => typeof value === 'string' && ['g', 'kg', 'ml', 'l', 'pcs'].includes(value);
const isGoal = (value: unknown): value is Goal => typeof value === 'string' && ['maintain', 'lose', 'gain'].includes(value);

/** Structural validity deliberately permits unfinished/raw input. Readiness is separate. */
export function isSettingsDraft(value: unknown): value is SettingsDraft {
  if (!record(value) || !isStep(value.step)) return false;
  if (!['people', 'days', 'budget'].every(key => typeof value[key] === 'string')) return false;
  if (typeof value.goal !== 'string' || !['maintain', 'lose', 'gain'].includes(value.goal)) return false;
  if (typeof value.cookingTime !== 'string' || !['15', '30', '60', 'any'].includes(value.cookingTime)) return false;
  if (typeof value.variety !== 'string' || !['same', 'medium', 'max'].includes(value.variety)) return false;
  if (!ids(value.restrictions) || !ids(value.exclusionIds) || !Array.isArray(value.home)) return false;
  if (!value.home.every(row => record(row) && nonempty(row.productId) && typeof row.quantity === 'string' && (row.unit === undefined || isUnit(row.unit)) && typeof row.expiresSoon === 'boolean')) return false;
  if (new Set(value.home.map(row => row.productId)).size !== value.home.length) return false;
  const manualNutrition = value.manualNutrition;
  if (!record(manualNutrition) || !['calories', 'protein', 'fat', 'carbohydrates'].every(key => typeof manualNutrition[key] === 'string')) return false;
  if (!record(value.targetSource)) return false;
  return value.targetSource.kind === 'manual' || (value.targetSource.kind === 'calculated' && nonempty(value.targetSource.formulaVersion) && nonempty(value.targetSource.sourceRef));
}

export type DraftAction =
  | { type: 'set'; field: 'people' | 'days' | 'budget'; value: string }
  | { type: 'goal'; value: Goal }
  | { type: 'step'; value: Step }
  | { type: 'cookingTime'; value: SettingsDraft['cookingTime'] }
  | { type: 'variety'; value: SettingsDraft['variety'] }
  | { type: 'restrictions'; value: string[] }
  | { type: 'exclusions'; value: string[] }
  | { type: 'home'; value: HomeDraftRow[] }
  | { type: 'manualNutrition'; field: keyof ManualNutrition; value: string }
  | { type: 'clearManualNutrition' }
  | { type: 'calculatedNutrition'; value: ManualNutrition; formulaVersion: string; sourceRef: string };

export function draftReducer(draft: SettingsDraft, action: DraftAction): SettingsDraft {
  switch (action.type) {
    case 'set': return { ...draft, [action.field]: action.value };
    case 'step': return isStep(action.value) ? { ...draft, step: action.value } : draft;
    case 'goal': return isGoal(action.value) ? { ...draft, goal: action.value } : draft;
    case 'cookingTime': return { ...draft, cookingTime: action.value };
    case 'variety': return { ...draft, variety: action.value };
    case 'restrictions': return { ...draft, restrictions: [...action.value] };
    case 'exclusions': return { ...draft, exclusionIds: [...action.value] };
    case 'home': return { ...draft, home: action.value.map(row => ({ ...row })) };
    case 'manualNutrition': return { ...draft, manualNutrition: { ...draft.manualNutrition, [action.field]: action.value }, targetSource: { kind: 'manual' } };
    case 'clearManualNutrition': return { ...draft, manualNutrition: { calories: '', protein: '', fat: '', carbohydrates: '' }, targetSource: { kind: 'manual' } };
    case 'calculatedNutrition': return action.formulaVersion.trim() && action.sourceRef.trim()
      ? { ...draft, manualNutrition: { ...action.value }, targetSource: { kind: 'calculated', formulaVersion: action.formulaVersion, sourceRef: action.sourceRef } }
      : draft;
  }
}

export const dietaryRestrictions = [
  { id: 'no-fish', label: 'Без рыбы' }, { id: 'gluten-free', label: 'Без глютена' }, { id: 'lactose-free', label: 'Без лактозы' },
  { id: 'vegetarian', label: 'Вегетарианство' }, { id: 'halal', label: 'Халяль' },
] as const;
export type StepErrors = Partial<Record<'people' | 'days' | 'goal' | 'budget' | 'manualNutrition' | 'home' | 'restrictions' | 'exclusion-search' | `quantity-${string}` | `unit-${string}` | keyof ManualNutrition, string>>;
const integerBetween = (raw: string, min: number, max: number) => /^\d+$/.test(raw) && Number.isSafeInteger(Number(raw)) && Number(raw) >= min && Number(raw) <= max;
export function parseHomeQuantity(raw: string): { status: 'unknown' } | { status: 'invalid' } | { status: 'known'; value: number } {
  const text = raw.trim();
  if (!text) return { status: 'unknown' };
  const value = Number(text.replace(',', '.'));
  return /^\d+(?:[.,]\d+)?$/.test(text) && Number.isFinite(value) && value > 0 ? { status: 'known', value } : { status: 'invalid' };
}
export function validateHomeRow(row: HomeDraftRow): StepErrors {
  const product = productNames.find(product => product.id === row.productId);
  if (!product) return { [`quantity-${row.productId}`]: 'Продукт отсутствует в справочнике. Удалите строку и выберите продукт заново' };
  const quantity = parseHomeQuantity(row.quantity);
  if (quantity.status === 'invalid') return { [`quantity-${row.productId}`]: 'Введите количество больше 0 или оставьте поле пустым' };
  if (quantity.status === 'known' && (!row.unit || !product.allowedUnits.includes(row.unit))) return { [`unit-${row.productId}`]: 'Выберите подходящую единицу количества' };
  return {};
}

export function validateStep(draft: SettingsDraft, step: Step = draft.step): StepErrors {
  const errors: StepErrors = {};
  if (step === 1) {
    if (!integerBetween(draft.people, 1, 10)) errors.people = 'Укажите от 1 до 10 человек';
    if (!integerBetween(draft.days, 1, 7)) errors.days = 'Укажите от 1 до 7 дней';
    if (!isGoal(draft.goal)) errors.goal = 'Выберите цель питания';
    const nutrition = parseManualTarget(draft.manualNutrition);
    if (nutrition.status === 'invalid') {
      Object.assign(errors, nutrition.errors);
      errors.manualNutrition = nutrition.message;
    }
  }
  if (step === 2 && parseBudget(draft.budget) === null) errors.budget = 'Введите целое число рублей от 500';
  if (step === 3) {
    if (draft.restrictions.some(id => !dietaryRestrictions.some(option => option.id === id)) || new Set(draft.restrictions).size !== draft.restrictions.length) errors.restrictions = 'Сохранённое ограничение неизвестно. Выберите ограничения из списка заново';
    if (draft.exclusionIds.some(id => !productNames.some(product => product.id === id)) || new Set(draft.exclusionIds).size !== draft.exclusionIds.length) errors['exclusion-search'] = 'Проверьте исключения: удалите неизвестные продукты и выберите их из справочника';
  }
  if (step === 4) {
    draft.home.forEach(row => Object.assign(errors, validateHomeRow(row)));
    if (Object.keys(errors).length || new Set(draft.home.map(row => row.productId)).size !== draft.home.length) errors.home = 'Проверьте количество, единицы и повторяющиеся продукты';
  }
  return errors;
}
