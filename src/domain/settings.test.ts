import { expect, it } from 'vitest';
import { createDraft, draftReducer, isSettingsDraft, isStep, validateStep, type Step } from './settings';

it('accepts structurally valid unfinished strings without declaring them ready', () => {
  const draft = { ...createDraft(), people: '', budget: '1,', manualNutrition: { calories: '0,', protein: '', fat: '', carbohydrates: '' } };
  expect(isSettingsDraft(draft)).toBe(true);
  expect(validateStep(draft, 1).people).toBeDefined();
  expect(validateStep(draft, 1).manualNutrition).toBeDefined();
  expect(validateStep(draft, 2).budget).toBeDefined();
});
it.each([0, 5, 1.5, '2', null, Infinity])('rejects step outside exact 1–4: %s', value => {
  expect(isStep(value)).toBe(false);
  expect(isSettingsDraft({ ...createDraft(), step: value })).toBe(false);
  const draft = createDraft();
  expect(draftReducer(draft, { type: 'step', value: value as Step })).toBe(draft);
});
it.each([{ goal: 'other' }, { cookingTime: [] }, { variety: null }, { restrictions: ['a', 'a'] }, { exclusionIds: [''] }, { home: [{ productId: 'rice', quantity: '1', unit: 'cup', expiresSoon: false }] }, { targetSource: { kind: 'calculated', formulaVersion: '', sourceRef: 'ref' } }, { manualNutrition: {} }])('rejects invalid structural field %j', patch => {
  expect(isSettingsDraft({ ...createDraft(), ...patch })).toBe(false);
});
it('reducers keep original data and reset calculated provenance only after manual edit', () => {
  const original = createDraft();
  const calculated = draftReducer(original, { type: 'calculatedNutrition', value: { calories: '2100', protein: '90', fat: '70', carbohydrates: '240' }, formulaVersion: 'approved-v1', sourceRef: 'approved-source' });
  expect(original.targetSource).toEqual({ kind: 'manual' });
  expect(calculated.targetSource).toEqual({ kind: 'calculated', formulaVersion: 'approved-v1', sourceRef: 'approved-source' });
  expect(draftReducer(calculated, { type: 'manualNutrition', field: 'protein', value: '91' }).targetSource).toEqual({ kind: 'manual' });
  const rows = [{ productId: 'rice', quantity: '', expiresSoon: false }];
  const home = draftReducer(original, { type: 'home', value: rows });
  rows[0].quantity = '5';
  expect(home.home[0].quantity).toBe('');
});
