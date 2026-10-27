import type { ManualNutrition } from './settings';

export interface ManualTarget {
  calories: number;
  protein: number;
  fat: number;
  carbohydrates: number;
  source: 'manual';
  basis: 'person-day';
}
export type NutritionErrors = Partial<Record<keyof ManualNutrition, string>>;
export type ManualTargetResult =
  | { status: 'absent' }
  | { status: 'invalid'; errors: NutritionErrors; message: string }
  | { status: 'valid'; target: ManualTarget };

export const nutritionKeys = ['calories', 'protein', 'fat', 'carbohydrates'] as const;
const decimal = /^\d+(?:[.,]\d+)?$/;

/** Parses user data only. No physiological formula, medical limits or inferred facts. */
export function parseManualTarget(raw: ManualNutrition): ManualTargetResult {
  if (nutritionKeys.every(key => raw[key].trim() === '')) return { status: 'absent' };
  const errors: NutritionErrors = {};
  const values = { calories: 0, protein: 0, fat: 0, carbohydrates: 0 };
  for (const key of nutritionKeys) {
    const text = raw[key].trim();
    const number = Number(text.replace(',', '.'));
    if (!text) errors[key] = 'Заполните это поле или очистите всю норму';
    else if (!decimal.test(text) || !Number.isFinite(number) || number < 0 || (key === 'calories' && number <= 0)) {
      errors[key] = key === 'calories' ? 'Введите конечное число калорий больше 0' : 'Введите конечное число не меньше 0';
    } else values[key] = number;
  }
  if (Object.keys(errors).length) return {
    status: 'invalid', errors,
    message: nutritionKeys.some(key => raw[key].trim() === '')
      ? 'Заполните все поля нормы или очистите их'
      : 'Калории должны быть больше 0, Б/Ж/У — не меньше 0. Введите конечные числа',
  };
  return { status: 'valid', target: { ...values, source: 'manual', basis: 'person-day' } };
}
