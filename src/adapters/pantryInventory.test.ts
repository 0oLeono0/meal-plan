import { expect, it, vi } from 'vitest';
import { decimal } from '../domain/quantities';
import {
  createPantryInventoryAdapter, inventoryPantrySnapshot, PANTRY_INVENTORY_KEY, PANTRY_INVENTORY_MAX_BYTES, validateInventoryRows,
} from './pantryInventory';

const guard = { isCurrent: () => true };
const carrot = { productId: 'carrot', quantity: '0,2', unit: 'kg', expiresSoon: false } as const;

function storageFixture() {
  const values = new Map<string, string>();
  const store = { getItem: vi.fn((key: string) => values.get(key) ?? null), setItem: vi.fn((key: string, value: string) => { values.set(key, value); }) };
  return { adapter: createPantryInventoryAdapter(() => store), store, values };
}

it('pantry-inventory distinguishes absent inventory from saved empty inventory and blocks stale writes', async () => {
  const { adapter, store, values } = storageFixture();
  const otherTab = createPantryInventoryAdapter(() => store);
  expect(await adapter.load()).toEqual({ status: 'missing' });
  expect(await otherTab.load()).toEqual({ status: 'missing' });
  const empty = await adapter.save([], guard);
  expect(empty).toMatchObject({ status: 'saved', inventory: { rows: [] } });
  const raw = values.get(PANTRY_INVENTORY_KEY);
  expect(await otherTab.save([carrot], guard)).toEqual({ status: 'blocked' });
  expect(values.get(PANTRY_INVENTORY_KEY)).toBe(raw);
  expect(await otherTab.load()).toMatchObject({ status: 'loaded', inventory: { rows: [] } });
  expect(await otherTab.save([carrot], { isCurrent: () => false })).toEqual({ status: 'cancelled' });
  expect(values.get(PANTRY_INVENTORY_KEY)).toBe(raw);
});

it('pantry-inventory rejects unknown fields, invalid units, duplicate IDs and oversized UTF-8 before parsing', async () => {
  const { adapter, values, store } = storageFixture();
  const valid = { schemaVersion: 1, token: 'a'.repeat(32), rows: [carrot] };
  for (const corrupt of [
    { ...valid, versionHint: 1 },
    { ...valid, rows: [{ ...carrot, covered: '200' }] },
    { ...valid, rows: [{ ...carrot, productId: 'not-in-catalog' }] },
    { ...valid, rows: [{ ...carrot, unit: 'ml' }] },
    { ...valid, rows: [carrot, { ...carrot, quantity: '0.3' }] },
    { ...valid, token: 'wrong' },
  ]) {
    const raw = JSON.stringify(corrupt);
    values.set(PANTRY_INVENTORY_KEY, raw);
    expect(await adapter.load()).toEqual({ status: 'corrupt' });
    expect(await adapter.save([carrot], guard)).toEqual({ status: 'blocked' });
    expect(values.get(PANTRY_INVENTORY_KEY)).toBe(raw);
  }

  const raw = JSON.stringify({ ...valid, extra: 'я'.repeat(40_000) });
  expect(raw.length).toBeLessThan(PANTRY_INVENTORY_MAX_BYTES);
  expect(new TextEncoder().encode(raw).byteLength).toBeGreaterThan(PANTRY_INVENTORY_MAX_BYTES);
  values.set(PANTRY_INVENTORY_KEY, raw);
  const parse = vi.spyOn(JSON, 'parse');
  try {
    const result = await adapter.load();
    expect(parse).not.toHaveBeenCalled();
    expect(result).toEqual({ status: 'corrupt' });
  } finally { parse.mockRestore(); }
  expect(store.setItem).not.toHaveBeenCalled();
});

it('pantry-inventory keeps input strings and projects only exact confirmed quantities', () => {
  const quantity = { status: 'known', value: { amount: decimal('200'), unit: 'g' } };
  const unknown = { status: 'unknown' };
  for (const value of ['0,2', '0.2']) {
    const rows = validateInventoryRows([{ ...carrot, quantity: value }]);
    expect(rows?.[0].quantity).toBe(value);
    expect(rows && inventoryPantrySnapshot(rows)[0].quantity).toEqual(quantity);
  }
  for (const value of ['0', '-2', '1e3', '0,2.3']) {
    expect(validateInventoryRows([{ ...carrot, quantity: value }])).toBeNull();
  }
  const rows = validateInventoryRows([
    { productId: 'carrot', quantity: '', expiresSoon: false },
    { ...carrot, productId: 'chicken' },
    { ...carrot, productId: 'egg' },
    { ...carrot, productId: 'pantry-chicken-fillet' },
    { ...carrot, productId: 'pantry-egg-mass' },
  ]);
  expect(rows && inventoryPantrySnapshot(rows).map(item => item.quantity)).toEqual([unknown, unknown, unknown, quantity, quantity]);
  const countedEgg = validateInventoryRows([{ ...carrot, productId: 'egg', unit: 'pcs', quantity: '2' }]);
  expect(countedEgg && inventoryPantrySnapshot(countedEgg)[0].quantity).toEqual({ status: 'known', value: { amount: decimal('2'), unit: 'pcs' } });
});

it('pantry-inventory reports a write error and leaves the inspected bytes available for retry', async () => {
  const { adapter, store, values } = storageFixture();
  await adapter.load();
  await adapter.save([], guard);
  const raw = values.get(PANTRY_INVENTORY_KEY);
  store.setItem.mockImplementationOnce(() => { throw new Error('Write denied'); });
  expect(await adapter.save([carrot], guard)).toEqual({ status: 'error' });
  expect(values.get(PANTRY_INVENTORY_KEY)).toBe(raw);
  expect(await adapter.save([carrot], guard)).toMatchObject({ status: 'saved', inventory: { rows: [carrot] } });
});
