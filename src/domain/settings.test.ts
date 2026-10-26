import { expect, it } from 'vitest';
import { createDraft, draftReducer, isSettingsDraft, isStep, validateStep, type Goal, type Step } from './settings';

it('accepts structurally valid unfinished strings without declaring them ready', () => {
  const draft = { ...createDraft(), people: '', budget: '1,', manualNutrition: { calories: '0,', protein: '', fat: '', carbohydrates: '' } };
  expect(isSettingsDraft(draft)).toBe(true);
  expect(validateStep(draft, 1).people).toBeDefined();
  expect(validateStep(draft, 1).manualNutrition).toBeDefined();
  expect(validateStep(draft, 2).budget).toBeDefined();
});

it('WIZ-03 precision: runtime goal validation cannot be bypassed by a typed cast', () => {
  expect(validateStep({ ...createDraft(), goal: 'other' as Goal }, 1)).toHaveProperty('goal');
  const draft = createDraft();
  expect(draftReducer(draft, { type: 'goal', value: 'other' as Goal })).toBe(draft);
});
it.each(['0', '11', '1.5', 'Infinity', 'NaN', '1e0', '1,', '', ' 2 '])('WIZ-03 boundary/precision rejects people raw %s', people => {
  expect(validateStep({ ...createDraft(), people }, 1).people).toBeDefined();
});
it.each(['0', '8', '1.5', 'Infinity', 'NaN', '1e0', '1,', ''])('WIZ-03 boundary/precision rejects days raw %s', days => {
  expect(validateStep({ ...createDraft(), days }, 1).days).toBeDefined();
});
it.each([{ people: '1', days: '1' }, { people: '10', days: '7' }])('WIZ-03 accepts exact count limits %j', patch => {
  expect(validateStep({ ...createDraft(), ...patch }, 1)).toEqual({});
});
it('D-06 defaults are applied once and reducer preserves raw strings across steps', () => {
  const draft = createDraft();
  expect(draft).toMatchObject({ people: '2', days: '7', goal: 'maintain', budget: '3000', cookingTime: '30', variety: 'medium', restrictions: [] });
  const raw = draftReducer(draft, { type: 'set', field: 'people', value: '1,' });
  expect(draftReducer(draftReducer(raw, { type: 'step', value: 2 }), { type: 'step', value: 1 }).people).toBe('1,');
});

// Synthetic contract checks schema only; these numbers are not nutrition recommendations.
function decisionFixture() {
  return {
    decision: 'keep-p0', status: 'human-confirmed', humanConfirmedAt: '2026-10-26T12:00:00Z',
    humanResponse: { text: 'Synthetic test confirmation', source: 'test conversation reference' },
    scopeReferences: ['C-04', 'Q-03'], sourceReferences: ['https://example.test/source'], formulaVersion: 'synthetic-test-v1',
    inputContract: Object.fromEntries(['sex', 'age', 'height', 'weight', 'activity'].map(field => [field, { unit: 'test-unit', admissibility: 'test-only values', default: null, absence: 'reject' }])),
    coefficients: { synthetic: 1 }, rounding: { mode: 'test-only', precision: 0 }, resultContract: { value: { unit: 'test-unit', basis: 'test-only' } },
    errors: { invalid: 'test-only rejection' }, useSemantics: 'Explicit use only', absencePolicy: 'No result',
    uiStates: { empty: 'test', loading: 'synchronous; no artificial loading', error: 'test', partial: 'test' },
    independentExamples: [{ input: { value: 1 }, expected: { value: 10 }, provenance: 'independent fixture A' }, { input: { value: 2 }, expected: { value: 20 }, provenance: 'independent fixture B' }],
  };
}
it('calculator gate accepts only a complete confirmed keep-p0 record and rejects missing contracts', async () => {
  const modulePath = '../../scripts/verify-calculator-decision.mjs';
  const { verifyCalculatorDecision: run } = await import(modulePath) as { verifyCalculatorDecision(record: unknown): { ok: boolean; reason: string } };
  expect(run(decisionFixture()).ok).toBe(true);
  for (const field of Object.keys(decisionFixture())) {
    const invalid: Record<string, unknown> = { ...decisionFixture() };
    delete invalid[field];
    expect(run(invalid).ok, field).toBe(false);
  }
  expect(run({ ...decisionFixture(), status: 'proposed' }).ok).toBe(false);
  expect(run({ ...decisionFixture(), humanConfirmedAt: 'not a date' }).ok).toBe(false);
  expect(run({ ...decisionFixture(), independentExamples: [decisionFixture().independentExamples[0], decisionFixture().independentExamples[0]] }).ok).toBe(false);
  expect(run({ ...decisionFixture(), inputContract: {} }).ok).toBe(false);
  const amendment = run({ ...decisionFixture(), decision: 'scope-amendment', amendmentReferences: ['scoped replan'] });
  expect(amendment.ok).toBe(false);
  expect(amendment.reason).toContain('REPLAN_REQUIRED');
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

it('WIZ-07 precision: product-specific units reject incompatible dimensions', () => {
  expect(Boolean(validateStep({ ...createDraft(), home: [{ productId: 'rice', quantity: '10', unit: 'ml', expiresSoon: false }] }, 4).home)).toBe(true);
});

it.each(['0', '-1', 'NaN', 'Infinity', '1e2', '1,', '1.2.3', '1 000', '0.000' ])('WIZ-07 boundary: rejects supplied quantity %s without changing raw text', quantity => {
  const draft = { ...createDraft(), home: [{ productId: 'rice', quantity, unit: 'g' as const, expiresSoon: false }] };
  expect(Boolean(validateStep(draft, 4).home)).toBe(true);
  expect(draft.home[0].quantity).toBe(quantity);
});
it.each(['0.00000000000000000001', '0,00000000000000000001', '1.25', ' 1,25 '])('WIZ-07 precision: positive full decimal %s stays valid', quantity => {
  expect(validateStep({ ...createDraft(), home: [{ productId: 'rice', quantity, unit: 'kg', expiresSoon: true }] }, 4)).toEqual({});
});
it('WIZ-07 empty: blank is unknown and needs no unit; known quantity needs one', () => {
  expect(validateStep({ ...createDraft(), home: [{ productId: 'rice', quantity: '   ', expiresSoon: false }] }, 4)).toEqual({});
  expect(Boolean(validateStep({ ...createDraft(), home: [{ productId: 'rice', quantity: '1', expiresSoon: false }] }, 4).home)).toBe(true);
});
it('WIZ-06/07 readiness rejects unknown IDs, duplicate products and unknown restrictions', () => {
  expect(Object.keys(validateStep({ ...createDraft(), restrictions: ['invented'] }, 3)).length > 0).toBe(true);
  expect(Object.keys(validateStep({ ...createDraft(), exclusionIds: ['invented'] }, 3)).length > 0).toBe(true);
  const row = { productId: 'rice', quantity: '', expiresSoon: false };
  expect(Object.keys(validateStep({ ...createDraft(), home: [row, row] }, 4)).length > 0).toBe(true);
  expect(Object.keys(validateStep({ ...createDraft(), home: [{ ...row, productId: 'invented' }] }, 4)).length > 0).toBe(true);
});
