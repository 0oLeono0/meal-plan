import { expect, it } from 'vitest';
import { createDraft, validateStep } from './settings';
import { budgetPeriodLabel, parseBudget, projectSlider, selectBudgetHint } from './budget';

it('WIZ-04 precision: trimmed whole rubles are accepted without changing raw input', () => {
  const draft = { ...createDraft(), budget: ' 1050 ' };
  expect(Object.keys(validateStep(draft, 2)).length === 0).toBe(true);
  expect(draft.budget).toBe(' 1050 ');
});

it.each(['500', '1000', '1050', '15000', '20000', String(Number.MAX_SAFE_INTEGER)])('WIZ-04 boundary: exact amount %s has no slider maximum', budget => {
  expect(validateStep({ ...createDraft(), budget }, 2)).toEqual({});
});

it.each(['', ' ', '499', '0', '-500', '+500', '500.0', '500,0', '5e3', '0x200', 'Infinity', 'NaN', '1000x', '1 000', '１０００', '9007199254740992', '9'.repeat(310)])('WIZ-04 hostile input: rejects %s', budget => {
  expect(validateStep({ ...createDraft(), budget }, 2)).toEqual({ budget: 'Введите целое число рублей от 500' });
  expect(parseBudget(budget)).toBeNull();
});

it.each([[500, 1000], [1000, 1000], [1049, 1000], [1050, 1100], [1051, 1100], [15000, 15000], [20000, 15000], [Number.MAX_SAFE_INTEGER, 15000]])('projection of %s rounds half up then clamps to %s', (exact, projected) => {
  expect(projectSlider(exact)).toBe(projected);
  expect(parseBudget(String(exact))).toBe(exact);
});

it('budget hint preserves unrounded per-person-day allocation', () => {
  expect(selectBudgetHint('3000', '2', '7')).toBe(3000 / 2 / 7);
  expect(Math.round(selectBudgetHint('3000', '2', '7')!)).toBe(214);
  expect(selectBudgetHint('3000', '2', '3')).toBe(500);
  expect(selectBudgetHint('3000', '4', '3')).toBe(250);
});
it.each([['', '2', '7'], ['499', '2', '7'], ['3000', '', '7'], ['3000', '0', '7'], ['3000', '11', '7'], ['3000', '2', '8'], ['3000', '2', '1.5']])('invalid budget/people/days %s/%s/%s have no hint', (budget, people, days) => {
  expect(selectBudgetHint(budget, people, days)).toBeNull();
});
it.each([['1', '1 день'], ['2', '2 дня'], ['3', '3 дня'], ['4', '4 дня'], ['5', '5 дней'], ['6', '6 дней'], ['7', 'неделю']])('period %s labels correctly', (days, label) => {
  expect(budgetPeriodLabel(days)).toBe(`Бюджет на ${label}`);
});
