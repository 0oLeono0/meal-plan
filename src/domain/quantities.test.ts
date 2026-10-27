import { expect, it, vi } from 'vitest';
import { convertQuantity, decimal, divide, formatExact, multiply, normalizeQuantity, rational } from './quantities';
import type { ProductConversion } from './quantities';

async function arithmetic() {
  const module = await vi.importActual<typeof import('./quantities')>('./quantities');
  expect(module.add, 'exact addition must be implemented').toBeTypeOf('function');
  return module;
}
it('keeps thirds exact through arithmetic and JSON, independent of binary float limits', async () => {
  const { encodeRational, decodeRational, add } = await arithmetic();
  const third = divide(decimal('1'), decimal('3'));
  expect(multiply(third, decimal('3'))).toEqual(rational(1n));
  expect(formatExact(third)).toBe('1/3');
  expect(JSON.parse(JSON.stringify(encodeRational(third)))).toEqual({ numerator: '1', denominator: '3' });
  expect(decodeRational(JSON.parse(JSON.stringify(encodeRational(third))))).toEqual(third);
  expect(formatExact(add(decimal('9007199254740993.000000000000000001'), decimal('0.000000000000000001')))).toBe('9007199254740993.000000000000000002');
});
it.each([
  ['1', 'kg', '500', 'g', '1500'], ['1', 'l', '250', 'ml', '1250'], ['0.1', 'g', '0.2', 'g', '0.3'],
] as const)('adds %s %s and %s %s in their common base', async (left, leftUnit, right, rightUnit, expected) => {
  const { addQuantities } = await arithmetic();
  const result = addQuantities({ amount: decimal(left), unit: leftUnit }, { amount: decimal(right), unit: rightUnit });
  expect(formatExact(result.amount)).toBe(expected);
  expect(result.unit).toBe(leftUnit === 'l' ? 'ml' : 'g');
});
it('subtracts, compares and clamps exact fractions without intermediate rounding', async () => {
  const { add, subtract, compare, clamp } = await arithmetic();
  expect(formatExact(subtract(decimal('0.3'), decimal('0.2')))).toBe('0.1');
  expect(formatExact(add(decimal('-2.5'), decimal('1.25')))).toBe('-1.25');
  expect(compare(divide(decimal('1'), decimal('3')), decimal('0.333333333333333333'))).toBe(1);
  expect(compare(decimal('0.10'), decimal('0.1'))).toBe(0);
  expect(compare(decimal('-1'), decimal('0'))).toBe(-1);
  expect(clamp(decimal('-2'), decimal('0'), decimal('5'))).toEqual(decimal('0'));
  expect(clamp(decimal('10'), decimal('0'), decimal('5'))).toEqual(decimal('5'));
  expect(clamp(decimal('1.25'), decimal('0'), decimal('5'))).toEqual(decimal('1.25'));
  expect(() => clamp(decimal('1'), decimal('5'), decimal('0'))).toThrow();
});
it.each([['1.005', 101n], ['1.004', 100n], ['0.005', 1n], ['0', 0n], ['-1.005', -101n], ['9999999999999999.995', 1000000000000000000n]] as const)('rounds %s RUB half up to %s kopecks', async (rubles, kopecks) => {
  const { roundHalfUp } = await arithmetic();
  expect(roundHalfUp(decimal(rubles), 2)).toBe(kopecks);
});
it('accepts decimal comma only at draft parsing, leaving source decimals strict', async () => {
  const { parseDraftQuantity } = await arithmetic();
  expect(parseDraftQuantity(' 1,250 ')).toEqual(decimal('1.25'));
  for (const raw of ['-1', '', 'NaN', 'Infinity', '1e3', '+1', '1,2.3', '0x10', '.5', '1.', '1,', '9'.repeat(257)]) expect(() => parseDraftQuantity(raw)).toThrow();
  expect(parseDraftQuantity('0')).toEqual(decimal('0'));
  expect(() => decimal('1,25')).toThrow();
});
it.each([
  null, [], {}, { numerator: '1', denominator: '0' }, { numerator: '1', denominator: '-2' },
  { numerator: 'NaN', denominator: '1' }, { numerator: 1, denominator: 2 },
  { numerator: '1e3', denominator: '1' }, { numerator: '9'.repeat(257), denominator: '1' },
  { numerator: '1', denominator: '9'.repeat(257) }, { numerator: '1', denominator: '2', unexpected: true },
])('rejects malformed or oversized rational JSON %#', async value => {
  const { decodeRational } = await arithmetic();
  expect(() => decodeRational(value)).toThrow();
});
it('normalizes the codec and validates serialization before exposing raw BigInts', async () => {
  const { encodeRational, decodeRational } = await arithmetic();
  expect(decodeRational({ numerator: '-2', denominator: '6' })).toEqual(rational(-1n, 3n));
  expect(encodeRational(rational(2n, -6n))).toEqual({ numerator: '-1', denominator: '3' });
  expect(() => encodeRational({ numerator: 1n, denominator: 0n })).toThrow();
  expect(() => rational(1n, 0n)).toThrow();
  expect(() => divide(decimal('1'), decimal('0'))).toThrow();
  expect(() => normalizeQuantity({ amount: decimal('-1'), unit: 'g' })).toThrow();
});
it('round-trips the largest permitted signed numerator and requires own codec fields', async () => {
  const { encodeRational, decodeRational } = await arithmetic();
  const negative = rational(-BigInt('9'.repeat(256)));
  expect(decodeRational(encodeRational(negative))).toEqual(negative);
  const inherited: unknown = Object.assign(Object.create({ numerator: '1', denominator: '2' }), { a: true, b: true });
  expect(() => decodeRational(inherited)).toThrow();
  expect(() => rational(BigInt('9'.repeat(513)))).toThrow('EXACT_SIZE_LIMIT');
});
it.each([['g', 'ml'], ['ml', 'pcs'], ['pcs', 'g']] as const)('never invents a %s to %s conversion', async (from, to) => {
  const { addQuantities } = await arithmetic();
  expect(() => convertQuantity({ amount: decimal('1'), unit: from }, to)).toThrow('INCOMPATIBLE_DIMENSION');
  expect(() => addQuantities({ amount: decimal('1'), unit: from }, { amount: decimal('1'), unit: to })).toThrow('INCOMPATIBLE_DIMENSION');
});
it('permits a documented large-egg conversion only for that precise product profile', async () => {
  await arithmetic();
  const identity = { productId: 'egg', profileId: 'usda-171287-large' };
  const conversion: ProductConversion = {
    ...identity, from: { amount: decimal('1'), unit: 'pcs' }, to: { amount: decimal('50'), unit: 'g' },
    evidence: { sourceId: 'usda-fdc-sr-legacy', recordId: 'food_portion:88374', url: 'https://fdc.nal.usda.gov/food-details/171287/nutrients' },
  };
  expect(convertQuantity({ amount: decimal('3'), unit: 'pcs' }, 'kg', identity, [conversion])).toEqual({ amount: decimal('0.15'), unit: 'kg' });
  expect(convertQuantity({ amount: decimal('100'), unit: 'g' }, 'pcs', identity, [conversion])).toEqual({ amount: decimal('2'), unit: 'pcs' });
  expect(() => convertQuantity({ amount: decimal('1'), unit: 'pcs' }, 'g', { productId: 'egg', profileId: 'generic' }, [conversion])).toThrow('INCOMPATIBLE_DIMENSION');
  expect(() => convertQuantity({ amount: decimal('1'), unit: 'pcs' }, 'g', { productId: 'rice', profileId: identity.profileId }, [conversion])).toThrow('INCOMPATIBLE_DIMENSION');
});
it('exposes repeating fractions and preserves every digit of terminating quantities', async () => {
  const { roundHalfUp } = await arithmetic();
  expect(formatExact(rational(2n, 7n))).toBe('2/7');
  expect(formatExact(decimal('0.00000000000000000000000000000001'))).toBe('0.00000000000000000000000000000001');
  expect(() => roundHalfUp(decimal('1'), 257)).toThrow();
  expect(() => roundHalfUp(decimal('1'), -1)).toThrow();
  expect(() => roundHalfUp(decimal('1'), 1.5)).toThrow();
});
