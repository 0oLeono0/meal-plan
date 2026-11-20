import { foodSources } from '../data/foodSources';
import { catalogError, evaluateIngredient, nutrientKeys } from '../domain/catalog';
import type { Catalog, CatalogLoadResult, CatalogPort, FoodProfile, SourceReference } from '../domain/catalog';
import { decimal, dimension, normalizeQuantity, rational } from '../domain/quantities';
import type { Quantity, Rational } from '../domain/quantities';

const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const text = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0 && value.length <= 2000;
const https = (value: unknown): value is string => text(value) && /^https:\/\/[^\s]+$/.test(value);
function fail(code: string): never { throw new Error(code); }
function assertSource(value: unknown): asserts value is SourceReference {
  if (!record(value) || !['sourceId', 'recordId', 'release', 'license'].every(key => text(value[key])) || !https(value.url)
    || (value.archiveUrl !== undefined && !https(value.archiveUrl))
    || (value.archiveSha256 !== undefined && (typeof value.archiveSha256 !== 'string' || !/^[a-f0-9]{64}$/.test(value.archiveSha256)))) fail('INVALID_SOURCE');
}
function validDecimal(value: unknown, positive = false): boolean {
  if (typeof value !== 'string') return false;
  try { const parsed = decimal(value); return positive ? parsed.numerator > 0n : parsed.numerator >= 0n; } catch { return false; }
}
function assertReference(value: unknown) {
  if (!record(value) || !validDecimal(value.amount, true) || value.basis !== 'edible' || !['g', 'kg', 'ml', 'l', 'pcs'].includes(String(value.unit))) fail('INVALID_REFERENCE');
}
function assertRational(value: unknown): asserts value is Rational {
  if (!record(value) || typeof value.numerator !== 'bigint' || typeof value.denominator !== 'bigint' || value.denominator <= 0n) fail('INVALID_QUANTITY');
  rational(value.numerator, value.denominator);
}
function assertQuantity(value: unknown): asserts value is Quantity {
  if (!record(value)) fail('INVALID_QUANTITY');
  assertRational(value.amount);
  if (!['g', 'kg', 'ml', 'l', 'pcs'].includes(String(value.unit)) || value.amount.numerator < 0n) fail('INVALID_QUANTITY');
}
function unknownFact(value: Record<string, unknown>) { return value.status === 'unknown' && text(value.reason); }
function assertFood(value: unknown): asserts value is FoodProfile {
  if (!record(value) || !['productId', 'profileId', 'name', 'identity', 'state', 'category'].every(key => text(value[key]))) fail('INVALID_FOOD');
  const nutrition = value.nutrition;
  if (!record(nutrition)) fail('INVALID_NUTRITION');
  if (!unknownFact(nutrition)) {
    if (nutrition.status !== 'known' || !record(nutrition.values)) fail('INVALID_NUTRITION');
    const values = nutrition.values;
    if (!nutrientKeys.every(key => validDecimal(values[key]))) fail('INVALID_NUTRITION');
    assertReference(nutrition.reference); assertSource(nutrition.source);
  }
  const price = value.price;
  if (!record(price)) fail('INVALID_PRICE');
  if (!unknownFact(price)) {
    if (price.status !== 'known' || !validDecimal(price.amount, true) || price.currency !== 'RUB' || price.estimate !== true || !text(price.region)
      || typeof price.observedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(price.observedAt)) fail('INVALID_PRICE');
    assertReference(price.reference); assertSource(price.source);
  }
  const safety = value.safety;
  if (!record(safety)) fail('INVALID_SAFETY');
  if (!unknownFact(safety)) {
    if (safety.status === 'known') {
      if (!Array.isArray(safety.facts) || !safety.facts.length) fail('INVALID_SAFETY');
      const keys = new Set<string>();
      for (const fact of safety.facts) {
        if (!record(fact) || !['restriction', 'allergen'].includes(String(fact.kind)) || !text(fact.key) || typeof fact.suitable !== 'boolean'
          || !Array.isArray(fact.evidence) || !fact.evidence.length) fail('INVALID_SAFETY');
        const key = `${fact.kind}:${fact.key}`;
        if (keys.has(key)) fail('INVALID_SAFETY');
        keys.add(key); fact.evidence.forEach(assertSource);
      }
    } else if (safety.status === 'conflicting' && text(safety.reason) && Array.isArray(safety.evidence) && safety.evidence.length > 1) safety.evidence.forEach(assertSource);
    else fail('INVALID_SAFETY');
  }
  if (!Array.isArray(value.conversions)) fail('INVALID_CONVERSION');
  const dimensions = new Set<string>();
  for (const conversion of value.conversions) {
    if (!record(conversion) || conversion.productId !== value.productId || conversion.profileId !== value.profileId) fail('INVALID_CONVERSION');
    assertQuantity(conversion.from); assertQuantity(conversion.to);
    if (conversion.from.amount.numerator <= 0n || conversion.to.amount.numerator <= 0n || !record(conversion.evidence)
      || !text(conversion.evidence.sourceId) || !text(conversion.evidence.recordId) || !https(conversion.evidence.url)) fail('INVALID_CONVERSION');
    const pair = [dimension(conversion.from.unit), dimension(conversion.to.unit)].sort().join(':');
    if (dimension(conversion.from.unit) === dimension(conversion.to.unit) || dimensions.has(pair)) fail('INVALID_CONVERSION');
    dimensions.add(pair);
  }
}
/** Bounded, detached, recursively frozen snapshots; no browser-specific cloning API. */
function snapshot(value: unknown, depth = 0, budget = { nodes: 0 }): unknown {
  if (++budget.nodes > 100000 || depth > 16) fail('CATALOG_SIZE_LIMIT');
  if (typeof value === 'string' && value.length > 4096) fail('CATALOG_SIZE_LIMIT');
  if (typeof value === 'bigint' && value.toString().length > 257) fail('CATALOG_SIZE_LIMIT');
  if (Array.isArray(value)) {
    if (value.length > 5000) fail('CATALOG_SIZE_LIMIT');
    return Object.freeze(value.map(item => snapshot(item, depth + 1, budget)));
  }
  if (record(value)) {
    const keys = Object.keys(value);
    if (keys.length > 100) fail('CATALOG_SIZE_LIMIT');
    return Object.freeze(Object.fromEntries(keys.map(key => [key, snapshot(value[key], depth + 1, budget)])));
  }
  if (value === null || ['string', 'number', 'boolean', 'bigint'].includes(typeof value)) return value;
  return fail('INVALID_CATALOG');
}
export function validateCatalog(input: unknown): CatalogLoadResult {
  try {
    const value = snapshot(input);
    if (!record(value) || !text(value.version) || !Array.isArray(value.foods) || !Array.isArray(value.recipes)) return catalogError('INVALID_CATALOG', 'catalog');
    const profiles = new Map<string, FoodProfile>();
    for (const food of value.foods) {
      assertFood(food);
      if (profiles.has(food.profileId)) return catalogError('DUPLICATE_ID', 'foods.profileId');
      profiles.set(food.profileId, food);
    }
    const recipeIds = new Set<string>();
    for (const recipe of value.recipes) {
      if (!record(recipe) || !text(recipe.id) || !text(recipe.name) || !Array.isArray(recipe.ingredients) || !recipe.ingredients.length
        || !Array.isArray(recipe.slots) || !recipe.slots.length || !recipe.slots.every(slot => ['breakfast', 'lunch', 'dinner', 'snack'].includes(String(slot)))
        || new Set(recipe.slots).size !== recipe.slots.length || !Number.isSafeInteger(recipe.cookingMinutes) || Number(recipe.cookingMinutes) <= 0
        || !Array.isArray(recipe.steps) || !recipe.steps.length || !recipe.steps.every(text)) fail('INVALID_RECIPE');
      assertRational(recipe.baseServings); if (recipe.baseServings.numerator <= 0n) fail('INVALID_RECIPE');
      assertSource(recipe.source);
      if (recipeIds.has(recipe.id)) fail('DUPLICATE_ID'); recipeIds.add(recipe.id);
      for (const ingredient of recipe.ingredients) {
        if (!record(ingredient) || !text(ingredient.productId) || !text(ingredient.profileId)) fail('INVALID_INGREDIENT');
        const food = profiles.get(ingredient.profileId);
        if (!food || food.productId !== ingredient.productId) fail('UNKNOWN_PROFILE');
        assertQuantity(ingredient.quantity);
        if (normalizeQuantity(ingredient.quantity).amount.numerator <= 0n) fail('INVALID_INGREDIENT');
      }
    }
    // All catalog fields have been checked above, including nested quantities and references.
    return { status: 'loaded', catalog: value as unknown as Catalog };
  } catch (error) { return catalogError(error instanceof Error ? error.message : 'INVALID_CATALOG', 'catalog'); }
}
export function createLocalCatalog(input: unknown): CatalogPort {
  const result = validateCatalog(input);
  const lookup: CatalogPort['lookup'] = async (productId, profileId) => {
    if (result.status === 'invalid') return result;
    const foods = result.catalog.foods.filter(food => food.productId === productId);
    if (!foods.length) return { status: 'not-found', diagnostics: [{ code: 'UNKNOWN_PRODUCT', path: 'productId', message: 'UNKNOWN_PRODUCT' }] };
    const food = profileId ? foods.find(food => food.profileId === profileId) : foods.length === 1 ? foods[0] : undefined;
    return food ? { status: 'found', food } : catalogError(profileId ? 'UNKNOWN_PROFILE' : 'AMBIGUOUS_PROFILE', 'profileId');
  };
  return {
    async load() { return result; }, lookup,
    async evaluate(ingredient) {
      const found = await lookup(ingredient.productId, ingredient.profileId);
      return found.status === 'found' ? evaluateIngredient(found.food, ingredient) : { status: 'invalid', diagnostics: found.diagnostics };
    },
  };
}
export const localCatalog: CatalogPort = createLocalCatalog(foodSources);
