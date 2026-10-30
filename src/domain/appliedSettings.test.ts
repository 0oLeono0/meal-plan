import { describe, expect, it } from 'vitest';
import { createDraft, validateStep } from './settings';
import { buildAppliedSettings, immutableSnapshot, selectQuickStartInput, validateAppliedSettings } from './appliedSettings';

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
  it('canonicalizes a cleared optional unit without changing unknown quantity before or after persistence', () => {
    const draft = createDraft(); draft.step = 4;
    draft.home = [{ productId: 'rice', quantity: '', unit: undefined, expiresSoon: true }];
    for (const step of [1, 2, 3, 4] as const) expect(validateStep(draft, step)).toEqual({});
    const result = buildAppliedSettings(draft);
    expect(result.status).toBe('applied');
    if (result.status !== 'applied') return;
    expect(result.settings.home).toEqual([{ productId: 'rice', quantity: { status: 'unknown' }, expiresSoon: true }]);
    expect(result.settings.raw.home).toEqual([{ productId: 'rice', quantity: '', expiresSoon: true }]);
    expect(Object.prototype.hasOwnProperty.call(result.settings.raw.home[0], 'unit')).toBe(false);
    expect(Object.isFrozen(result.settings.raw.home[0])).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(draft.home[0], 'unit')).toBe(true);
    const restoredDraft = JSON.parse(JSON.stringify(draft));
    expect(buildAppliedSettings(restoredDraft)).toEqual(result);
    const legacyApplied = { ...result.settings, raw: draft };
    expect(validateAppliedSettings(legacyApplied)).toEqual(result);
    expect(validateAppliedSettings(result.settings)).toEqual(result);
    const changedDraft = { ...createDraft(), people: '5' };
    expect(selectQuickStartInput(changedDraft, legacyApplied)).toEqual(result);
    expect(selectQuickStartInput(changedDraft, result.settings)).toEqual(result);
    expect(selectQuickStartInput(draft)).toEqual(result);
    expect(selectQuickStartInput(restoredDraft)).toEqual(result);
  });
  it('reports a positive quantity with cleared unit at step four instead of corrupt people', () => {
    const draft = createDraft(); draft.step = 4;
    draft.home = [{ productId: 'rice', quantity: '100', unit: undefined, expiresSoon: false }];
    expect(buildAppliedSettings(draft)).toMatchObject({ status: 'invalid', step: 4, errors: { 'unit-rice': expect.any(String) } });
  });
  it.each(['oz', '', null, 0])('still rejects a specified invalid home unit: %j', unit => {
    const draft = { ...createDraft(), home: [{ productId: 'rice', quantity: '', unit, expiresSoon: false }] };
    expect(buildAppliedSettings(draft)).toMatchObject({ status: 'invalid' });
  });
  it('never sanitizes other undefined, nonfinite, cyclic, nonplain or oversized values', () => {
    const row = { productId: 'rice', quantity: '', unit: undefined, expiresSoon: false };
    const base = { ...createDraft(), home: [row] };
    const cyclic = { ...base, extra: {} }; cyclic.extra = cyclic;
    const tooManyRowKeys = { ...row, ...Object.fromEntries(Array.from({ length: 97 }, (_, i) => [`extra-${i}`, i])) };
    const invalidInputs = [
      { ...base, unexpected: undefined }, { ...base, home: [{ ...row, unexpected: undefined }] },
      { ...base, manualNutrition: { ...base.manualNutrition, unexpected: undefined } },
      { ...base, targetSource: { kind: 'manual', unexpected: undefined } },
      { ...base, unexpected: NaN }, cyclic, Object.assign(Object.create(null), base),
      { ...base, home: [Object.assign(Object.create(null), row)] },
      { ...base, home: [tooManyRowKeys] }, { ...base, people: '2'.repeat(4097) },
      { ...base, home: Array(5001).fill(row) },
    ];
    for (const input of invalidInputs) expect(buildAppliedSettings(input)).toMatchObject({ status: 'invalid' });
    expect(() => immutableSnapshot(base)).toThrow();
    const valid = buildAppliedSettings(createDraft());
    if (valid.status !== 'applied') throw new Error('Expected valid baseline');
    expect(validateAppliedSettings({ ...valid.settings, raw: base, unexpected: undefined })).toMatchObject({ status: 'invalid' });
    expect(validateAppliedSettings({ ...valid.settings, raw: { ...base, unexpected: undefined } })).toMatchObject({ status: 'invalid' });
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
