import { expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { createDraft, draftReducer, isSettingsDraft, isStep, validateStep, type Step } from './settings';

it('accepts structurally valid unfinished strings without declaring them ready', () => {
  const draft = { ...createDraft(), people: '', budget: '1,', manualNutrition: { calories: '0,', protein: '', fat: '', carbohydrates: '' } };
  expect(isSettingsDraft(draft)).toBe(true);
  expect(validateStep(draft, 1).people).toBeDefined();
  expect(validateStep(draft, 1).manualNutrition).toBeDefined();
  expect(validateStep(draft, 2).budget).toBeDefined();
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
it('calculator gate accepts only a complete confirmed keep-p0 record and rejects missing contracts', () => {
  const run = (record: unknown) => spawnSync(process.execPath, ['scripts/verify-calculator-decision.mjs', '-'], { input: JSON.stringify(record), encoding: 'utf8' });
  expect(run(decisionFixture()).status).toBe(0);
  for (const field of Object.keys(decisionFixture())) {
    const invalid: Record<string, unknown> = { ...decisionFixture() };
    delete invalid[field];
    expect(run(invalid).status, field).not.toBe(0);
  }
  expect(run({ ...decisionFixture(), status: 'proposed' }).status).not.toBe(0);
  expect(run({ ...decisionFixture(), humanConfirmedAt: 'not a date' }).status).not.toBe(0);
  expect(run({ ...decisionFixture(), independentExamples: [decisionFixture().independentExamples[0], decisionFixture().independentExamples[0]] }).status).not.toBe(0);
  expect(run({ ...decisionFixture(), inputContract: {} }).status).not.toBe(0);
  const amendment = run({ ...decisionFixture(), decision: 'scope-amendment', amendmentReferences: ['scoped replan'] });
  expect(amendment.status).not.toBe(0);
  expect(amendment.stderr).toContain('REPLAN_REQUIRED');
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
