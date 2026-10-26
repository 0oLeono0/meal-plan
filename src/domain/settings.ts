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
  | { type: 'calculatedNutrition'; value: ManualNutrition; formulaVersion: string; sourceRef: string };

export function draftReducer(draft: SettingsDraft, action: DraftAction): SettingsDraft {
  switch (action.type) {
    case 'set': return { ...draft, [action.field]: action.value };
    case 'step': return isStep(action.value) ? { ...draft, step: action.value } : draft;
    case 'goal': return { ...draft, goal: action.value };
    case 'cookingTime': return { ...draft, cookingTime: action.value };
    case 'variety': return { ...draft, variety: action.value };
    case 'restrictions': return { ...draft, restrictions: [...action.value] };
    case 'exclusions': return { ...draft, exclusionIds: [...action.value] };
    case 'home': return { ...draft, home: action.value.map(row => ({ ...row })) };
    case 'manualNutrition': return { ...draft, manualNutrition: { ...draft.manualNutrition, [action.field]: action.value }, targetSource: { kind: 'manual' } };
    case 'calculatedNutrition': return action.formulaVersion.trim() && action.sourceRef.trim()
      ? { ...draft, manualNutrition: { ...action.value }, targetSource: { kind: 'calculated', formulaVersion: action.formulaVersion, sourceRef: action.sourceRef } }
      : draft;
  }
}

export type StepErrors = Partial<Record<'people' | 'days' | 'budget' | 'manualNutrition' | 'home', string>>;
const integerBetween = (raw: string, min: number, max: number) => /^\d+$/.test(raw) && Number.isSafeInteger(Number(raw)) && Number(raw) >= min && Number(raw) <= max;
const finiteNumber = (raw: string) => /^\d+(?:[.,]\d+)?$/.test(raw.trim()) && Number.isFinite(Number(raw.replace(',', '.')));

export function validateStep(draft: SettingsDraft, step: Step = draft.step): StepErrors {
  const errors: StepErrors = {};
  if (step === 1) {
    if (!integerBetween(draft.people, 1, 10)) errors.people = 'Укажите от 1 до 10 человек';
    if (!integerBetween(draft.days, 1, 7)) errors.days = 'Укажите от 1 до 7 дней';
    const values = Object.values(draft.manualNutrition);
    if (values.some(value => value !== '')) {
      if (values.some(value => value === '')) errors.manualNutrition = 'Заполните все поля нормы или очистите их';
      else if (values.some(value => !finiteNumber(value)) || Number(draft.manualNutrition.calories.replace(',', '.')) <= 0) errors.manualNutrition = 'Калории должны быть больше 0, Б/Ж/У — не меньше 0. Введите конечные числа';
    }
  }
  if (step === 2 && !integerBetween(draft.budget, 500, Number.MAX_SAFE_INTEGER)) errors.budget = 'Введите целое число рублей от 500';
  if (step === 4 && draft.home.some(row => row.quantity !== '' && (!finiteNumber(row.quantity) || Number(row.quantity.replace(',', '.')) <= 0 || !row.unit))) errors.home = 'Укажите количество больше 0 и подходящую единицу или оставьте количество пустым';
  return errors;
}
