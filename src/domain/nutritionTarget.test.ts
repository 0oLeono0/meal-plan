import { expect, it } from 'vitest';
import { createDraft, validateStep } from './settings';

it('WIZ-09 empty: whitespace-only manual values are absent', () => {
  const manualNutrition = { calories: ' ', protein: '\t', fat: '  ', carbohydrates: '\n' };
  expect(validateStep({ ...createDraft(), manualNutrition }, 1)).toEqual({});
});
it('WIZ-09 precision: trims complete decimal comma/dot values before validation', () => {
  const manualNutrition = { calories: ' 1234,5 ', protein: ' 12.5 ', fat: ' 0 ', carbohydrates: ' 100 ' };
  expect(validateStep({ ...createDraft(), manualNutrition }, 1)).toEqual({});
});
