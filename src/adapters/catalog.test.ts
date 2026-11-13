import { expect, it, vi } from 'vitest';
import { bundledCatalog, bundledCatalogPort, validateBundledCatalog } from '../data/catalog';
import { validateCatalog } from './catalog';
import { decimal, formatExact } from '../domain/quantities';
import { productNames, searchProducts } from './products';

type MutableSource = { foods: { nutrition: { reference: { amount: string }; source: { recordId?: string }; values: Record<string, string> }; safety: unknown }[] };

it('evaluates raw pork and searches all32 identities without inventing piece or volume conversion', async () => {
  expect(productNames).toHaveLength(32);
  expect(searchProducts('свиная вырезка').map(row => row.id)).toContain('pork');
  expect(searchProducts('свиная вырезка')[0].allowedUnits).toEqual(['g', 'kg']);
  const result = await bundledCatalogPort.evaluate({ productId: 'pork', profileId: 'usda-168249-raw', quantity: { amount: decimal('300'), unit: 'g' } });
  expect(result.status).toBe('evaluated');
  if (result.status !== 'evaluated') throw new Error('Final source profile is unavailable');
  expect(Object.values(result.nutrition).map(formatExact)).toEqual(['327', '62.85', '6.51', '0']);
  expect(result.price.status).toBe('known');
  if (result.price.status === 'known') expect(formatExact(result.price.amount)).toBe('180');
  for (const unit of ['ml', 'pcs'] as const) expect((await bundledCatalogPort.evaluate({ productId: 'pork', profileId: 'usda-168249-raw', quantity: { amount: decimal('1'), unit } })).status).toBe('invalid');
});

it('admits the real82 corpus within unchanged ceilings and refuses oversized untrusted input', async () => {
  expect(validateCatalog(bundledCatalog).status).toBe('loaded');
  expect((await validateBundledCatalog(bundledCatalog)).status).toBe('loaded');
  expect(validateCatalog({ ...bundledCatalog, recipes: Array(5001).fill(bundledCatalog.recipes[0]) })).toMatchObject({ status: 'invalid', diagnostics: [{ code: 'CATALOG_SIZE_LIMIT' }] });
  expect(validateCatalog({ ...bundledCatalog, version: 'v'.repeat(4097) })).toMatchObject({ status: 'invalid', diagnostics: [{ code: 'CATALOG_SIZE_LIMIT' }] });
  const forged = { ...bundledCatalog, version: 'stale-unregistered82' };
  expect((await validateBundledCatalog(forged)).status).toBe('invalid');
});

async function modules() {
  const adapter = await vi.importActual<typeof import('./catalog')>('./catalog').catch(() => null);
  expect(adapter, 'the real offline catalog boundary must exist').not.toBeNull();
  const source = await import('../data/foodSources');
  const quantities = await import('../domain/quantities');
  return { ...adapter!, ...source, ...quantities };
}

it('calculates independently asserted USDA 171287 values through the local port', async () => {
  const { localCatalog, decimal, formatExact } = await modules();
  const loaded = await localCatalog.load();
  expect(loaded.status).toBe('loaded');
  for (const [grams, expected] of [
    ['100', ['143', '12.56', '9.51', '0.72']],
    ['150', ['214.5', '18.84', '14.265', '1.08']],
  ] as const) {
    const result = await localCatalog.evaluate({ productId: 'egg', profileId: 'usda-171287-raw', quantity: { amount: decimal(grams), unit: 'g' } });
    expect(result.status).toBe('evaluated');
    if (result.status !== 'evaluated') throw new Error('real ingredient was not evaluated');
    expect(Object.values(result.nutrition).map(formatExact)).toEqual(expected);
    expect(result.price.status).toBe('unknown');
    expect(result.safety.status).toBe('unknown');
    expect(result.completeness).toEqual({ status: 'incomplete', missing: ['price', 'safety'] });
    expect(result).not.toHaveProperty('generationReady');
  }
});

it('preserves archive identity, original decimals and edible reference without inventing a generic piece', async () => {
  const { foodSources } = await modules();
  const egg = foodSources.foods[0];
  expect(egg.nutrition.status).toBe('known');
  if (egg.nutrition.status !== 'known') throw new Error('missing nutrition');
  expect(egg.nutrition.reference).toEqual({ amount: '100', unit: 'g', basis: 'edible' });
  expect(egg.nutrition.values).toEqual({ calories: '143', protein: '12.56', fat: '9.51', carbohydrates: '0.72' });
  expect(egg.nutrition.source).toMatchObject({ recordId: '171287', release: 'SR Legacy April 2018', license: 'CC0-1.0', archiveSha256: 'b80817294b8850530aaedf2e515c02593b1824f763a0ff356e5c2081643e6fd0' });
  expect(egg.conversions).toEqual([]);
});

it('diagnoses unknown identities and unsupported g/ml/pieces instead of guessing', async () => {
  const { localCatalog, decimal } = await modules();
  expect(await localCatalog.lookup('missing')).toMatchObject({ status: 'not-found', diagnostics: [{ code: 'UNKNOWN_PRODUCT' }] });
  for (const unit of ['ml', 'pcs'] as const) {
    expect(await localCatalog.evaluate({ productId: 'egg', profileId: 'usda-171287-raw', quantity: { amount: decimal('1'), unit } })).toMatchObject({ status: 'invalid', diagnostics: [{ code: 'INCOMPATIBLE_DIMENSION' }] });
  }
  expect(await localCatalog.evaluate({ productId: 'egg', profileId: 'cooked', quantity: { amount: decimal('100'), unit: 'g' } })).toMatchObject({ status: 'invalid', diagnostics: [{ code: 'UNKNOWN_PROFILE' }] });
});

it.each([
  ['duplicate IDs', (raw: MutableSource) => { raw.foods = [raw.foods[0], raw.foods[0]]; }, 'DUPLICATE_ID'],
  ['zero reference', (raw: MutableSource) => { raw.foods[0].nutrition.reference.amount = '0'; }, 'INVALID_REFERENCE'],
  ['negative reference', (raw: MutableSource) => { raw.foods[0].nutrition.reference.amount = '-1'; }, 'INVALID_REFERENCE'],
  ['missing source', (raw: MutableSource) => { delete raw.foods[0].nutrition.source.recordId; }, 'INVALID_SOURCE'],
  ['bad nutrient', (raw: MutableSource) => { raw.foods[0].nutrition.values.fat = 'NaN'; }, 'INVALID_NUTRITION'],
  ['invented safety', (raw: MutableSource) => { raw.foods[0].safety = { status: 'known', facts: [] }; }, 'INVALID_SAFETY'],
] as const)('rejects %s at the untrusted boundary', async (_name, corrupt, code) => {
  const { createLocalCatalog, foodSources } = await modules();
  // JSON is deliberately treated as untrusted; mutation helpers are test-only.
  const raw = JSON.parse(JSON.stringify(foodSources));
  corrupt(raw);
  const port = createLocalCatalog(raw);
  expect(await port.load()).toMatchObject({ status: 'invalid', diagnostics: expect.arrayContaining([expect.objectContaining({ code })]) });
  expect(await port.lookup('egg')).toMatchObject({ status: 'invalid' });
});

it('takes a validated snapshot rather than trusting later caller mutations', async () => {
  const { createLocalCatalog, foodSources } = await modules();
  const raw = JSON.parse(JSON.stringify(foodSources));
  const port = createLocalCatalog(raw);
  raw.foods[0].nutrition.values.calories = '999';
  const first = await port.lookup('egg');
  expect(first.status).toBe('found');
  if (first.status === 'found' && first.food.nutrition.status === 'known') expect(first.food.nutrition.values.calories).toBe('143');
});
