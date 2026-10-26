import { describe, expect, it } from 'vitest';
import { createDraft } from '../domain/settings';
import { createGuestDraftAdapter, DRAFT_KEY } from './guestDraft';

function storage(raw: string | null = null) {
  const data = new Map<string, string>([['sentinel', 'keep'], ['mealplan:confirmed', 'confirmed'], ['mealplan:pantry', 'pantry']]);
  if (raw !== null) data.set(DRAFT_KEY, raw);
  return { data, getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value); },
    removeItem: (key: string) => { data.delete(key); } };
}

describe('guest draft storage', () => {
  it('does not write defaults before hydration', async () => {
    const backing = storage();
    expect(await createGuestDraftAdapter(() => backing).save(createDraft())).toEqual({ status: 'blocked' });
    expect(backing.data.has(DRAFT_KEY)).toBe(false);
  });
  it('missing snapshot starts a draft and repeated saves round-trip raw partial values', async () => {
    const backing = storage();
    const port = createGuestDraftAdapter(() => backing);
    expect(await port.load()).toEqual({ status: 'missing', draft: createDraft() });
    const draft = { ...createDraft(), step: 4 as const, people: '', budget: '1,', home: [{ productId: 'rice', quantity: '0,', unit: 'g' as const, expiresSoon: true }] };
    expect(await port.save(draft)).toEqual({ status: 'saved' });
    const first = backing.data.get(DRAFT_KEY);
    await port.save(draft);
    expect(backing.data.get(DRAFT_KEY)).toBe(first);
    expect(await port.load()).toEqual({ status: 'loaded', draft });
    expect([...backing.data].filter(([key]) => key !== DRAFT_KEY)).toEqual([['sentinel', 'keep'], ['mealplan:confirmed', 'confirmed'], ['mealplan:pantry', 'pantry']]);
  });
  it.each(['{broken', 'null', '[]', '{}', JSON.stringify({ schemaVersion: 99, draft: createDraft() }), JSON.stringify({ schemaVersion: 1, draft: { ...createDraft(), step: 1.5 } })])('retains corrupt bytes %s until exact-key reset', async raw => {
    const backing = storage(raw);
    const port = createGuestDraftAdapter(() => backing);
    expect(await port.load()).toEqual({ status: 'corrupt' });
    expect(await port.save(createDraft())).toEqual({ status: 'blocked' });
    expect(backing.data.get(DRAFT_KEY)).toBe(raw);
    expect(await port.reset()).toEqual({ status: 'saved' });
    expect(backing.data.has(DRAFT_KEY)).toBe(false);
    expect(backing.data.get('sentinel')).toBe('keep');
    expect(backing.data.get('mealplan:confirmed')).toBe('confirmed');
    expect(backing.data.get('mealplan:pantry')).toBe('pantry');
    expect(await port.save(createDraft())).toEqual({ status: 'saved' });
  });
  it('guards storage access and read/write/remove exceptions', async () => {
    const unavailable = createGuestDraftAdapter(() => { throw new Error('denied'); });
    expect(await unavailable.load()).toEqual({ status: 'error' });
    expect(await unavailable.save(createDraft())).toEqual({ status: 'blocked' });
    expect(await unavailable.reset()).toEqual({ status: 'error' });
    const backing = storage();
    const port = createGuestDraftAdapter(() => backing);
    backing.getItem = () => { throw new Error('read'); };
    expect(await port.load()).toEqual({ status: 'error' });
    backing.getItem = key => backing.data.get(key) ?? null;
    await port.load();
    backing.setItem = () => { throw new Error('quota'); };
    expect(await port.save(createDraft())).toEqual({ status: 'error' });
    backing.removeItem = () => { throw new Error('remove'); };
    expect(await port.reset()).toEqual({ status: 'error' });
  });
  it('failed reset blocks subsequent writes until a successful read or reset', async () => {
    const backing = storage();
    const port = createGuestDraftAdapter(() => backing);
    await port.load();
    backing.removeItem = () => { throw new Error('remove'); };
    expect(await port.reset()).toEqual({ status: 'error' });
    expect(await port.save(createDraft())).toEqual({ status: 'blocked' });
    expect(backing.data.has(DRAFT_KEY)).toBe(false);
  });
  it('retry saves the supplied newest raw value after a failed write', async () => {
    const backing = storage();
    const port = createGuestDraftAdapter(() => backing);
    await port.load();
    const set = backing.setItem;
    backing.setItem = () => { throw new Error('quota'); };
    expect(await port.save({ ...createDraft(), people: '3' })).toEqual({ status: 'error' });
    backing.setItem = set;
    const newest = { ...createDraft(), people: '4' };
    expect(await port.save(newest)).toEqual({ status: 'saved' });
    expect(await port.load()).toEqual({ status: 'loaded', draft: newest });
  });
});
