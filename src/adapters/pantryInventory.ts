import { pantryProductNames } from './products';
import type { PantrySnapshotRow } from '../domain/appliedSettings';
import { needsPantryWeightConfirmation } from '../domain/pantry';
import { formatExact, MAX_EXACT_DIGITS, normalizeQuantity, parseDraftQuantity } from '../domain/quantities';
import type { HomeDraftRow, Unit } from '../domain/settings';

export const PANTRY_INVENTORY_KEY = 'mealplan:guest:pantry:v1';
export const PANTRY_INVENTORY_MAX_BYTES = 64_000;
export type PantryInventoryRow = Readonly<Omit<HomeDraftRow, 'unit'>> & { readonly unit?: Unit };
export interface PantryInventory {
  readonly schemaVersion: 1;
  readonly token: string;
  readonly rows: readonly PantryInventoryRow[];
}

type PantryInventoryLoadResult = { readonly status: 'loaded'; readonly inventory: PantryInventory }
  | { readonly status: 'missing' | 'error' | 'corrupt' };
type PantryInventorySaveResult = { readonly status: 'saved'; readonly inventory: PantryInventory }
  | { readonly status: 'error' | 'blocked' | 'cancelled' };
export interface PantryInventoryPort {
  load(): Promise<PantryInventoryLoadResult>;
  save(rows: readonly PantryInventoryRow[], guard: { readonly isCurrent: () => boolean }): Promise<PantryInventorySaveResult>;
}

type PantryStorage = Pick<Storage, 'getItem' | 'setItem'>;
const plainRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype;
const productById = new Map(pantryProductNames.map(product => [product.id, product]));

export function validateInventoryRows(rows: unknown): readonly PantryInventoryRow[] | null {
  if (!Array.isArray(rows) || rows.length > productById.size) return null;
  const supported: PantryInventoryRow[] = [], ids = new Set<string>();
  for (const row of rows) {
    if (!plainRecord(row)) return null;
    const { productId, quantity, unit, expiresSoon } = row;
    if (typeof productId !== 'string' || ids.has(productId) || typeof expiresSoon !== 'boolean'
      || typeof quantity !== 'string' || quantity.length > MAX_EXACT_DIGITS) return null;
    const hasUnit = Object.prototype.hasOwnProperty.call(row, 'unit');
    if (Object.keys(row).sort().join(',') !== (hasUnit ? 'expiresSoon,productId,quantity,unit' : 'expiresSoon,productId,quantity')) return null;
    const product = productById.get(productId);
    if (!product || (hasUnit && !product.allowedUnits.some(allowed => allowed === unit)) || (!hasUnit && quantity.trim())) return null;
    if (quantity.trim()) {
      try {
        if (normalizeQuantity({ amount: parseDraftQuantity(quantity), unit: unit as Unit }).amount.numerator <= 0n) return null;
      } catch { return null; }
    }
    ids.add(productId);
    supported.push(Object.freeze({ productId, quantity, expiresSoon, ...(hasUnit ? { unit: unit as Unit } : {}) }));
  }
  return Object.freeze(supported);
}

export function inventoryPantrySnapshot(rows: readonly PantryInventoryRow[]): readonly PantrySnapshotRow[] {
  return rows.map(({ productId, quantity, unit, expiresSoon }) => ({ productId, expiresSoon,
    quantity: quantity.trim() && unit && !needsPantryWeightConfirmation(productId, unit)
      ? { status: 'known', value: normalizeQuantity({ amount: parseDraftQuantity(quantity), unit }) }
      : { status: 'unknown' },
  }));
}

export function suggestedInventoryRows(rows: readonly PantrySnapshotRow[]): readonly PantryInventoryRow[] {
  return rows.flatMap(({ productId, quantity, expiresSoon }) => {
    const raw = { productId, expiresSoon, quantity: '' };
    if (!productById.has(productId)) return [];
    if (quantity.status === 'unknown') return [raw];
    const suggested = { ...raw, quantity: formatExact(quantity.value.amount).replace('.', ','), unit: quantity.value.unit };
    return validateInventoryRows([suggested]) ?? [raw];
  });
}

function fitsInventory(raw: string) {
  return raw.length <= PANTRY_INVENTORY_MAX_BYTES && new TextEncoder().encode(raw).byteLength <= PANTRY_INVENTORY_MAX_BYTES;
}

export function createPantryInventoryAdapter(getStorage: () => PantryStorage = () => window.localStorage): PantryInventoryPort {
  let inspected: string | null | undefined;
  return {
    async load() {
      inspected = undefined;
      let raw: string | null;
      try { raw = getStorage().getItem(PANTRY_INVENTORY_KEY); } catch { return { status: 'error' }; }
      if (raw === null) { inspected = null; return { status: 'missing' }; }
      if (!fitsInventory(raw)) return { status: 'corrupt' };
      try {
        const value: unknown = JSON.parse(raw);
        if (!plainRecord(value) || Object.keys(value).sort().join(',') !== 'rows,schemaVersion,token'
          || value.schemaVersion !== 1 || typeof value.token !== 'string' || !/^[a-f0-9]{32}$/.test(value.token)) return { status: 'corrupt' };
        const rows = validateInventoryRows(value.rows);
        if (!rows) return { status: 'corrupt' };
        inspected = raw;
        return { status: 'loaded', inventory: Object.freeze({ schemaVersion: 1, token: value.token, rows }) };
      } catch { return { status: 'corrupt' }; }
    },
    async save(input, { isCurrent }) {
      if (!isCurrent()) return { status: 'cancelled' };
      if (inspected === undefined) return { status: 'blocked' };
      const rows = validateInventoryRows(input);
      if (!rows) return { status: 'error' };
      try {
        const token = [...crypto.getRandomValues(new Uint8Array(16))].map(value => value.toString(16).padStart(2, '0')).join('');
        const inventory = Object.freeze({ schemaVersion: 1 as const, token, rows });
        const raw = JSON.stringify(inventory);
        if (!fitsInventory(raw)) return { status: 'error' };
        const storage = getStorage();
        if (storage.getItem(PANTRY_INVENTORY_KEY) !== inspected) { inspected = undefined; return { status: 'blocked' }; }
        if (!isCurrent()) return { status: 'cancelled' };
        storage.setItem(PANTRY_INVENTORY_KEY, raw);
        inspected = raw;
        return { status: 'saved', inventory };
      } catch { return { status: 'error' }; }
    },
  };
}
