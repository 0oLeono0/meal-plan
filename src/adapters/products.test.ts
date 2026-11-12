import { describe, expect, it } from 'vitest';
import { popularProductIds, productNames, searchProducts } from './products';
import { buildAppliedSettings } from '../domain/appliedSettings';
import { createDraft, isSettingsDraft } from '../domain/settings';

describe('familiar food search and legacy input units', () => {
  it('adds weighed eggs and new food identities while preserving the six popular ids', () => {
    expect(popularProductIds).toEqual(['egg', 'chicken', 'tomato', 'cottage-cheese', 'rice', 'potato']);
    expect(searchProducts('ЯЙЦО')[0].allowedUnits).toEqual(['pcs', 'g', 'kg']);
    for (const [query, id] of [['молоко', 'milk'], ['овсяные', 'oats'], ['нут консервированный', 'chickpea-canned'],
      ['фасоль консервированная', 'bean-canned'], ['огурец', 'cucumber'], ['йогурт', 'yogurt'], ['яблоко', 'apple'], ['хлеб', 'bread']]) {
      expect(searchProducts(query).map(product => product.id)).toContain(id);
      expect(productNames.find(product => product.id === id)?.allowedUnits).toEqual(['g', 'kg']);
    }
    expect(new Set(productNames.map(product => product.id)).size).toBe(productNames.length);
    expect(productNames.find(product => product.id === 'chickpea-canned')?.id).not.toBe('chickpea');
    expect(productNames.find(product => product.id === 'bean-canned')?.id).not.toBe('bean');
  });
  it('keeps old pcs and ml draft values without assigning a mass', () => {
    const draft = { ...createDraft(), home: [{ productId: 'egg', quantity: '3', unit: 'pcs' as const, expiresSoon: true },
      { productId: 'milk', quantity: '200', unit: 'ml' as const, expiresSoon: false }] };
    expect(isSettingsDraft(draft)).toBe(true);
    const applied = buildAppliedSettings(draft);
    expect(applied.status).toBe('applied');
    if (applied.status !== 'applied') throw new Error('Valid old draft');
    expect(applied.settings.raw.home).toEqual(draft.home);
  });
});
