import { convertQuantity, decimal, divide, multiply } from './quantities';
import type { ProductConversion, Quantity, Rational } from './quantities';
import type { Unit } from './settings';

export const nutrientKeys = ['calories', 'protein', 'fat', 'carbohydrates'] as const;
export type NutrientKey = typeof nutrientKeys[number];
export type Nutrition = Readonly<Record<NutrientKey, Rational>>;
export interface SourceReference {
  readonly sourceId: string; readonly recordId: string; readonly url: string;
  readonly release: string; readonly license: string;
  readonly archiveUrl?: string; readonly archiveSha256?: string;
}
export interface ReferenceQuantity { readonly amount: string; readonly unit: Unit; readonly basis: 'edible' }
export interface UnknownFact { readonly status: 'unknown'; readonly reason: string }
export type NutrientProfile = UnknownFact | {
  readonly status: 'known'; readonly reference: ReferenceQuantity;
  readonly values: Readonly<Record<NutrientKey, string>>; readonly source: SourceReference;
};
export type PriceProfile = UnknownFact | {
  readonly status: 'known'; readonly amount: string; readonly currency: 'RUB';
  readonly reference: ReferenceQuantity; readonly source: SourceReference;
  readonly region: string; readonly observedAt: string; readonly estimate: true;
};
export interface SafetyFact {
  readonly kind: 'restriction' | 'allergen'; readonly key: string;
  readonly suitable: boolean; readonly evidence: readonly SourceReference[];
}
/** Unknown and conflicting assertions never imply suitability. Known facts cover named keys only. */
export type SafetyProfile = UnknownFact | { readonly status: 'known'; readonly facts: readonly SafetyFact[] }
  | { readonly status: 'conflicting'; readonly reason: string; readonly evidence: readonly SourceReference[] };
export interface FoodProfile {
  readonly productId: string; readonly profileId: string; readonly name: string;
  readonly identity: string; readonly state: string; readonly category: string;
  readonly nutrition: NutrientProfile; readonly price: PriceProfile; readonly safety: SafetyProfile;
  readonly conversions: readonly ProductConversion[];
}
export interface Ingredient { readonly productId: string; readonly profileId: string; readonly quantity: Quantity }
export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export interface Recipe {
  readonly id: string; readonly name: string; readonly baseServings: Rational;
  readonly ingredients: readonly Ingredient[]; readonly slots: readonly MealSlot[];
  readonly cookingMinutes: number; readonly steps: readonly string[]; readonly source: SourceReference;
}
export interface Catalog { readonly version: string; readonly foods: readonly FoodProfile[]; readonly recipes: readonly Recipe[] }
export interface CatalogDiagnostic { readonly code: string; readonly path: string; readonly message: string }
export interface InvalidCatalog { readonly status: 'invalid'; readonly diagnostics: readonly CatalogDiagnostic[] }
export type CatalogLoadResult = { readonly status: 'loaded'; readonly catalog: Catalog } | InvalidCatalog;
export type CatalogLookupResult = { readonly status: 'found'; readonly food: FoodProfile }
  | { readonly status: 'not-found'; readonly diagnostics: readonly CatalogDiagnostic[] } | InvalidCatalog;
export type IngredientEvaluation = InvalidCatalog | {
  readonly status: 'evaluated'; readonly nutrition: Nutrition;
  readonly price: UnknownFact | { readonly status: 'known'; readonly amount: Rational; readonly source: SourceReference };
  readonly safety: SafetyProfile;
  readonly completeness: { readonly status: 'incomplete'; readonly missing: readonly string[] } | { readonly status: 'facts-present' };
};
export interface CatalogPort {
  load(): Promise<CatalogLoadResult>;
  lookup(productId: string, profileId?: string): Promise<CatalogLookupResult>;
  evaluate(ingredient: Ingredient): Promise<IngredientEvaluation>;
}
export function catalogError(code: string, path: string): InvalidCatalog {
  return { status: 'invalid', diagnostics: [{ code, path, message: code }] };
}
/** Pure source-based ingredient calculation; facts-present is not recipe/generation readiness. */
export function evaluateIngredient(food: FoodProfile, ingredient: Ingredient): IngredientEvaluation {
  if (food.productId !== ingredient.productId) return catalogError('UNKNOWN_PRODUCT', 'productId');
  if (food.profileId !== ingredient.profileId) return catalogError('UNKNOWN_PROFILE', 'profileId');
  if (food.nutrition.status !== 'known') return catalogError('NUTRITION_UNKNOWN', 'nutrition');
  try {
    const nutritionQuantity = convertQuantity(ingredient.quantity, food.nutrition.reference.unit, food, food.conversions);
    const factor = divide(nutritionQuantity.amount, decimal(food.nutrition.reference.amount));
    const nutrition: Nutrition = {
      calories: multiply(decimal(food.nutrition.values.calories), factor),
      protein: multiply(decimal(food.nutrition.values.protein), factor),
      fat: multiply(decimal(food.nutrition.values.fat), factor),
      carbohydrates: multiply(decimal(food.nutrition.values.carbohydrates), factor),
    };
    const price = food.price.status === 'known' ? {
      status: 'known' as const,
      amount: multiply(decimal(food.price.amount), divide(convertQuantity(ingredient.quantity, food.price.reference.unit, food, food.conversions).amount, decimal(food.price.reference.amount))),
      source: food.price.source,
    } : food.price;
    const missing = [...(price.status === 'unknown' ? ['price'] : []), ...(food.safety.status !== 'known' ? ['safety'] : [])];
    return { status: 'evaluated', nutrition, price, safety: food.safety, completeness: missing.length ? { status: 'incomplete', missing } : { status: 'facts-present' } };
  } catch (error) { return catalogError(error instanceof Error ? error.message : 'INVALID_QUANTITY', 'quantity'); }
}
