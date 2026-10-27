import { describe, expect, it } from 'vitest';
import { createDraft } from './settings';
import { buildAppliedSettings, selectQuickStartInput } from './appliedSettings';

describe('applied settings gate', () => {
  it('applies a valid guest draft with absent target and family purchase budget', () => {
    const result = buildAppliedSettings(createDraft());
    expect(result.status).toBe('applied');
    expect(result).toMatchObject({ status: 'applied', settings: {
      people: 2, days: 7, target: { status: 'absent' },
      budget: { limit: { numerator: 3000n, denominator: 1n }, basis: 'family-period-purchases', currency: 'RUB' },
    } });
  });
  it('validates every step in order regardless of the current step', () => {
    const draft = createDraft(); draft.step = 4; draft.people = '0'; draft.budget = '1';
    expect(buildAppliedSettings(draft)).toMatchObject({ status: 'invalid', step: 1, errors: { people: expect.any(String) } });
    draft.people = '2';
    expect(buildAppliedSettings(draft)).toMatchObject({ status: 'invalid', step: 2, errors: { budget: expect.any(String) } });
    draft.budget = '500'; draft.restrictions = ['unknown'];
    expect(buildAppliedSettings(draft)).toMatchObject({ status: 'invalid', step: 3 });
    draft.restrictions = []; draft.home = [{ productId: 'rice', quantity: '2', unit: 'ml', expiresSoon: false }];
    expect(buildAppliedSettings(draft)).toMatchObject({ status: 'invalid', step: 4 });
  });
  it('rejects a partial manual target at its first step', () => {
    const draft = createDraft(); draft.manualNutrition.calories = '2000';
    expect(buildAppliedSettings(draft)).toMatchObject({ status: 'invalid', step: 1, errors: { protein: expect.any(String) } });
  });
  it('reports duplicate restrictions and home rows at their own first failing step', () => {
    const draft = createDraft(); draft.restrictions = ['no-fish', 'no-fish'];
    expect(buildAppliedSettings(draft)).toMatchObject({ status: 'invalid', step: 3 });
    draft.restrictions = []; draft.home = [{ productId: 'rice', quantity: '', expiresSoon: false }, { productId: 'rice', quantity: '', expiresSoon: true }];
    expect(buildAppliedSettings(draft)).toMatchObject({ status: 'invalid', step: 4 });
  });
  it('preserves exact raw decimals, zero macros and target provenance', () => {
    const draft = createDraft();
    draft.manualNutrition = { calories: '2000,000000000000000001', protein: '0', fat: '0.1', carbohydrates: '250' };
    draft.targetSource = { kind: 'calculated', formulaVersion: 'verified-v1', sourceRef: 'saved-source' };
    draft.home = [{ productId: 'rice', quantity: '0,100000000000000001', unit: 'kg', expiresSoon: true }];
    expect(buildAppliedSettings(draft)).toMatchObject({ status: 'applied', settings: {
      target: { status: 'known', basis: 'person-day', values: { calories: { numerator: 2000000000000000000001n, denominator: 1000000000000000000n }, protein: { numerator: 0n, denominator: 1n } }, source: draft.targetSource },
      home: [{ quantity: { status: 'known', value: { amount: { numerator: 100000000000000001n, denominator: 1000000000000000n }, unit: 'g' } } }],
    } });
  });
  it('skip keeps restrictions and unknown home quantity without crediting zero stock', () => {
    const draft = createDraft(); draft.step = 4; draft.restrictions = ['no-fish']; draft.exclusionIds = ['egg'];
    draft.home = [{ productId: 'rice', quantity: '', expiresSoon: true }];
    expect(buildAppliedSettings(draft)).toMatchObject({ status: 'applied', settings: {
      restrictions: ['no-fish'], exclusionIds: ['egg'], home: [{ productId: 'rice', quantity: { status: 'unknown' }, expiresSoon: true }],
    } });
    expect(draft.home[0].quantity).toBe('');
  });
  it('returns detached recursively frozen nested values', () => {
    const draft = createDraft(); draft.restrictions = ['no-fish'];
    draft.home = [{ productId: 'rice', quantity: '1', unit: 'kg', expiresSoon: true }];
    const result = buildAppliedSettings(draft);
    expect(result.status).toBe('applied');
    if (result.status !== 'applied') return;
    draft.restrictions.push('halal'); draft.home[0].quantity = '9'; draft.manualNutrition.calories = '1';
    expect(result.settings.restrictions).toEqual(['no-fish']);
    expect(result.settings.home[0].quantity).toMatchObject({ status: 'known', value: { amount: { numerator: 1000n, denominator: 1n } } });
    expect(Object.isFrozen(result.settings.raw.manualNutrition)).toBe(true);
    expect(Object.isFrozen(result.settings.home[0])).toBe(true);
  });
  it('quick start prioritizes only valid last applied settings and falls back to draft or defaults', () => {
    const draft = createDraft(); draft.people = '3';
    const previous = buildAppliedSettings(draft);
    expect(previous.status).toBe('applied');
    if (previous.status !== 'applied') return;
    draft.people = '4';
    expect(selectQuickStartInput(draft, previous.settings)).toMatchObject({ status: 'applied', settings: { people: 3 } });
    expect(selectQuickStartInput(draft, { ...previous.settings, people: 99 })).toMatchObject({ status: 'applied', settings: { people: 4 } });
    draft.people = '';
    expect(selectQuickStartInput(draft)).toMatchObject({ status: 'invalid', step: 1 });
    expect(selectQuickStartInput()).toMatchObject({ status: 'applied', settings: { people: 2, days: 7 } });
  });
  it.each([null, {}, { ...createDraft(), home: null }, { ...createDraft(), cookingTime: '0' }])('rejects corrupt draft without throwing: %j', input => {
    expect(buildAppliedSettings(input)).toMatchObject({ status: 'invalid' });
  });
  it('fails closed on exact decimal size limits instead of rounding or throwing', () => {
    const draft = createDraft(); draft.manualNutrition = { calories: '1.' + '1'.repeat(256), protein: '1', fat: '1', carbohydrates: '1' };
    expect(buildAppliedSettings(draft)).toMatchObject({ status: 'invalid', step: 1 });
  });
});
