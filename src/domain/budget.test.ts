import { expect, it } from 'vitest';
import { createDraft, validateStep } from './settings';

it('WIZ-04 precision: trimmed whole rubles are accepted without changing raw input', () => {
  const draft = { ...createDraft(), budget: ' 1050 ' };
  expect(validateStep(draft, 2)).toEqual({});
  expect(draft.budget).toBe(' 1050 ');
});

it.each(['500', '1000', '1050', '15000', '20000', String(Number.MAX_SAFE_INTEGER)])('WIZ-04 boundary: exact amount %s has no slider maximum', budget => {
  expect(validateStep({ ...createDraft(), budget }, 2)).toEqual({});
});

it.each(['', ' ', '499', '0', '-500', '+500', '500.0', '500,0', '5e3', '0x200', 'Infinity', 'NaN', '1000x', '1 000', '１０００', '9007199254740992', '9'.repeat(310)])('WIZ-04 hostile input: rejects %s', budget => {
  expect(validateStep({ ...createDraft(), budget }, 2)).toEqual({ budget: 'Введите целое число рублей от 500' });
});
