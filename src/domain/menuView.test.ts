import { describe, expect, it } from 'vitest';
import { menuDaySlots, menuSearch, resolveMenuView } from './menuView';

it('phase04-remove shows all four ordered positions even when that day has no recipes', () => {
  expect(menuDaySlots('2026-10-31', [])).toEqual([
    { slot: 'breakfast', row: null }, { slot: 'lunch', row: null },
    { slot: 'dinner', row: null }, { slot: 'snack', row: null },
  ]);
});

describe('EC-18/19/20/22/23/24 actual date presentation query', () => {
  it.each([
    [['2026-10-31'], '2026-11-01', '2026-10-31'],
    [['2026-10-31', '2026-11-01', '2026-11-02'], '2026-11-01', '2026-11-01'],
    [['2026-03-27', '2026-03-28', '2026-03-29', '2026-03-30', '2026-03-31', '2026-04-01', '2026-04-02'], '2026-03-29', '2026-03-29'],
  ])('defaults to today or first without DST/month arithmetic %j', (dates, today, day) => {
    expect(resolveMenuView('', dates, today as string)).toEqual({ mode: 'day', day });
  });
  it('preserves selected day distinct from today and mode for the same applied period', () => {
    const dates = ['2026-10-31', '2026-11-01', '2026-11-02'];
    const selected = resolveMenuView('?view=week&day=2026-10-31', dates, '2026-11-01');
    expect(selected).toEqual({ mode: 'week', day: '2026-10-31' });
    expect(resolveMenuView(menuSearch(selected), dates, '2026-11-01')).toEqual(selected);
    expect(resolveMenuView(menuSearch(selected), ['2026-11-05'], '2026-11-01')).toEqual({ mode: 'week', day: '2026-11-05' });
    expect(dates).toEqual(['2026-10-31', '2026-11-01', '2026-11-02']);
  });
  it.each(['?view=grid', '?view=week&view=day', '?day=2026-02-30', '?day=%QQ', '?return=https://evil.invalid', `?day=${'x'.repeat(1024)}`])('rejects malformed enum/date/duplicate/external query %s', search => {
    expect(resolveMenuView(search, ['2026-10-31'], '2026-11-01')).toEqual({ mode: 'day', day: '2026-10-31' });
  });
  it('clamps valid foreign date to today and never invents a seven-day empty period', () => {
    expect(resolveMenuView('?view=week&day=2025-01-01', ['2026-11-01'], '2026-11-01')).toEqual({ mode: 'week', day: '2026-11-01' });
    expect(resolveMenuView('', [], '2026-11-01')).toEqual({ mode: 'day', day: null });
    expect(menuSearch({ mode: 'day', day: null })).toBe('view=day');
  });
});
