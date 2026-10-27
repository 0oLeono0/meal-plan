import type { Unit } from './settings';

/** Exact values only. JSON boundaries use string codecs, never Number/BigInt casts. */
export interface Rational { readonly numerator: bigint; readonly denominator: bigint }
export interface Quantity { readonly amount: Rational; readonly unit: Unit }
export type Dimension = 'mass' | 'volume' | 'count';
export interface ConversionEvidence { readonly sourceId: string; readonly recordId: string; readonly url: string }
export interface ProductConversion {
  readonly productId: string;
  readonly profileId: string;
  readonly from: Quantity;
  readonly to: Quantity;
  readonly evidence: ConversionEvidence;
}
export const MAX_EXACT_DIGITS = 256;
const abs = (value: bigint) => value < 0n ? -value : value;
function gcd(left: bigint, right: bigint): bigint {
  while (right !== 0n) [left, right] = [right, left % right];
  return left;
}
export function rational(numerator: bigint, denominator = 1n): Rational {
  if (typeof numerator !== 'bigint' || typeof denominator !== 'bigint' || denominator === 0n) throw new RangeError('INVALID_RATIONAL');
  // Bound work even before normalization; arithmetic may temporarily double the input size.
  if (abs(numerator).toString().length > MAX_EXACT_DIGITS * 2 || abs(denominator).toString().length > MAX_EXACT_DIGITS * 2) throw new RangeError('EXACT_SIZE_LIMIT');
  if (denominator < 0n) { numerator = -numerator; denominator = -denominator; }
  const factor = gcd(abs(numerator), denominator);
  numerator /= factor; denominator /= factor;
  if (abs(numerator).toString().length > MAX_EXACT_DIGITS || denominator.toString().length > MAX_EXACT_DIGITS) throw new RangeError('EXACT_SIZE_LIMIT');
  return Object.freeze({ numerator, denominator });
}
export function decimal(raw: string): Rational {
  if (typeof raw !== 'string' || raw.length > MAX_EXACT_DIGITS || !/^-?\d+(?:\.\d+)?$/.test(raw)) throw new RangeError('INVALID_DECIMAL');
  const negative = raw.startsWith('-');
  const [whole, fraction = ''] = (negative ? raw.slice(1) : raw).split('.');
  return rational(BigInt(whole + fraction) * (negative ? -1n : 1n), 10n ** BigInt(fraction.length));
}
/** User-input normalization only; source imports must use the strict decimal parser. */
export function parseDraftQuantity(raw: string): Rational {
  if (typeof raw !== 'string' || raw.length > MAX_EXACT_DIGITS) throw new RangeError('INVALID_QUANTITY');
  const value = decimal(raw.trim().replace(',', '.'));
  if (value.numerator < 0n) throw new RangeError('NEGATIVE_QUANTITY');
  return value;
}
export function add(left: Rational, right: Rational): Rational {
  return rational(left.numerator * right.denominator + right.numerator * left.denominator, left.denominator * right.denominator);
}
export function subtract(left: Rational, right: Rational): Rational {
  return rational(left.numerator * right.denominator - right.numerator * left.denominator, left.denominator * right.denominator);
}
export function compare(left: Rational, right: Rational): -1 | 0 | 1 {
  const difference = left.numerator * right.denominator - right.numerator * left.denominator;
  return difference < 0n ? -1 : difference > 0n ? 1 : 0;
}
export function clamp(value: Rational, minimum: Rational, maximum: Rational): Rational {
  if (compare(minimum, maximum) > 0) throw new RangeError('INVALID_BOUNDS');
  return compare(value, minimum) < 0 ? minimum : compare(value, maximum) > 0 ? maximum : value;
}
export function multiply(left: Rational, right: Rational): Rational {
  return rational(left.numerator * right.numerator, left.denominator * right.denominator);
}
export function divide(left: Rational, right: Rational): Rational {
  return rational(left.numerator * right.denominator, left.denominator * right.numerator);
}
const dimensions: Record<Unit, Dimension> = { g: 'mass', kg: 'mass', ml: 'volume', l: 'volume', pcs: 'count' };
const multipliers: Record<Unit, bigint> = { g: 1n, kg: 1000n, ml: 1n, l: 1000n, pcs: 1n };
export function dimension(unit: Unit): Dimension {
  if (!Object.prototype.hasOwnProperty.call(dimensions, unit)) throw new RangeError('INVALID_UNIT');
  const result = dimensions[unit];
  if (!result) throw new RangeError('INVALID_UNIT');
  return result;
}
export function normalizeQuantity(quantity: Quantity): Quantity {
  const basis = dimension(quantity.unit);
  if (quantity.amount.numerator < 0n) throw new RangeError('NEGATIVE_QUANTITY');
  return { amount: multiply(quantity.amount, rational(multipliers[quantity.unit])), unit: basis === 'mass' ? 'g' : basis === 'volume' ? 'ml' : 'pcs' };
}
export function addQuantities(left: Quantity, right: Quantity): Quantity {
  const normalizedLeft = normalizeQuantity(left), normalizedRight = normalizeQuantity(right);
  if (normalizedLeft.unit !== normalizedRight.unit) throw new RangeError('INCOMPATIBLE_DIMENSION');
  return { amount: add(normalizedLeft.amount, normalizedRight.amount), unit: normalizedLeft.unit };
}
export function convertQuantity(quantity: Quantity, unit: Unit, identity?: { productId: string; profileId: string }, conversions: readonly ProductConversion[] = []): Quantity {
  const input = normalizeQuantity(quantity);
  const target = dimension(unit);
  if (dimension(input.unit) === target) return { amount: divide(input.amount, rational(multipliers[unit])), unit };
  for (const conversion of conversions) {
    if (!identity || conversion.productId !== identity.productId || conversion.profileId !== identity.profileId || !conversion.evidence.sourceId || !conversion.evidence.recordId || !/^https:\/\//.test(conversion.evidence.url)) continue;
    const from = normalizeQuantity(conversion.from), to = normalizeQuantity(conversion.to);
    if (from.amount.numerator <= 0n || to.amount.numerator <= 0n) continue;
    const pair = dimension(from.unit) === dimension(input.unit) && dimension(to.unit) === target ? [from, to] : dimension(to.unit) === dimension(input.unit) && dimension(from.unit) === target ? [to, from] : undefined;
    if (pair) return { amount: divide(multiply(divide(input.amount, pair[0].amount), pair[1].amount), rational(multipliers[unit])), unit };
  }
  throw new RangeError('INCOMPATIBLE_DIMENSION');
}
/** Terminating decimals are complete. Repeating values are exposed as exact fractions. */
export function formatExact(value: Rational): string {
  const normalized = rational(value.numerator, value.denominator);
  let remaining = normalized.denominator;
  while (remaining % 2n === 0n) remaining /= 2n;
  while (remaining % 5n === 0n) remaining /= 5n;
  if (remaining !== 1n) return `${normalized.numerator}/${normalized.denominator}`;
  const sign = normalized.numerator < 0n ? '-' : '';
  const numerator = abs(normalized.numerator);
  let remainder = numerator % normalized.denominator;
  let digits = '';
  while (remainder !== 0n) {
    remainder *= 10n;
    digits += (remainder / normalized.denominator).toString();
    remainder %= normalized.denominator;
  }
  return `${sign}${numerator / normalized.denominator}${digits ? `.${digits}` : ''}`;
}
/** Returns integer minor units; ties round away from zero (half-up on magnitude). */
export function roundHalfUp(value: Rational, places = 0): bigint {
  if (!Number.isSafeInteger(places) || places < 0 || places > MAX_EXACT_DIGITS) throw new RangeError('INVALID_PRECISION');
  const normalized = rational(value.numerator, value.denominator);
  const scaled = abs(normalized.numerator) * 10n ** BigInt(places);
  const rounded = scaled / normalized.denominator + (scaled % normalized.denominator * 2n >= normalized.denominator ? 1n : 0n);
  return normalized.numerator < 0n ? -rounded : rounded;
}
export interface EncodedRational { readonly numerator: string; readonly denominator: string }
export function encodeRational(value: Rational): EncodedRational {
  const normalized = rational(value.numerator, value.denominator);
  return { numerator: normalized.numerator.toString(), denominator: normalized.denominator.toString() };
}
export function decodeRational(value: unknown): Rational {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new RangeError('INVALID_ENCODING');
  const encoded = value as Record<string, unknown>;
  if (Object.keys(encoded).sort().join(',') !== 'denominator,numerator' || typeof encoded.numerator !== 'string' || typeof encoded.denominator !== 'string'
    || encoded.numerator.length > MAX_EXACT_DIGITS + (encoded.numerator.startsWith('-') ? 1 : 0) || encoded.denominator.length > MAX_EXACT_DIGITS
    || !/^-?(?:0|[1-9]\d*)$/.test(encoded.numerator) || !/^[1-9]\d*$/.test(encoded.denominator)) throw new RangeError('INVALID_ENCODING');
  return rational(BigInt(encoded.numerator), BigInt(encoded.denominator));
}
