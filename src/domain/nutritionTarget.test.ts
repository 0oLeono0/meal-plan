import { expect, it } from 'vitest';
import { createDraft, validateStep } from './settings';
import { nutritionKeys, parseManualTarget } from './nutritionTarget';

it('WIZ-09 empty: whitespace-only manual values are absent', () => {
  const manualNutrition = { calories: ' ', protein: '\t', fat: '  ', carbohydrates: '\n' };
  expect(Object.keys(validateStep({ ...createDraft(), manualNutrition }, 1)).length).toBe(0);
});
it('WIZ-09 precision: trims complete decimal comma/dot values before validation', () => {
  const manualNutrition = { calories: ' 1234,5 ', protein: ' 12.5 ', fat: ' 0 ', carbohydrates: ' 100 ' };
  expect(validateStep({ ...createDraft(), manualNutrition }, 1)).toEqual({});
});

const complete = { calories: '1234.5', protein: '12,5', fat: '0', carbohydrates: '100' };
it('manual parser returns explicit source and person-day basis without mutating raw', () => {
  const raw = { ...complete, calories: ' 1234.5 ' };
  expect(parseManualTarget(raw)).toEqual({ status: 'valid', target: { calories: 1234.5, protein: 12.5, fat: 0, carbohydrates: 100, source: 'manual', basis: 'person-day' } });
  expect(raw.calories).toBe(' 1234.5 ');
  expect(parseManualTarget(createDraft().manualNutrition)).toEqual({ status: 'absent' });
});
it.each(nutritionKeys)('partial has no valid target when %s is blank', key => {
  const result = parseManualTarget({ ...complete, [key]: ' ' });
  expect(result.status).toBe('invalid');
  expect(result).not.toHaveProperty('target');
  if (result.status === 'invalid') expect(result.errors[key]).toBeDefined();
});
it.each(['0', '-1', 'Infinity', 'NaN', '1e3', '1,2.3', '1,', '.5', '0x10', '9'.repeat(310), '+12'])('calories reject complete malformed/zero/nonfinite raw %s', calories => {
  const result = parseManualTarget({ ...complete, calories });
  expect(result.status).toBe('invalid');
  if (result.status === 'invalid') expect(result.errors.calories).toBeDefined();
});
it.each(['protein', 'fat', 'carbohydrates'] as const)('macros %s allow zero, reject negative and nonfinite', key => {
  expect(parseManualTarget({ ...complete, [key]: '0' }).status).toBe('valid');
  for (const value of ['-0.1', 'NaN', 'Infinity']) expect(parseManualTarget({ ...complete, [key]: value }).status).toBe('invalid');
});
it('no guessed medical threshold is imposed on finite positive manual data', () => {
  expect(parseManualTarget({ calories: '0.01', protein: '999999', fat: '0', carbohydrates: '0' }).status).toBe('valid');
});
