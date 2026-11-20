import type { FoodProfile } from './catalog';
import type { Unit } from './settings';

export const ediblePantryProducts = [
  { productId: 'chicken', pantryId: 'pantry-chicken-fillet', profileId: 'usda-171077-raw' },
  { productId: 'egg', pantryId: 'pantry-egg-mass', profileId: 'usda-171287-raw' },
] as const;

export function needsPantryWeightConfirmation(productId: string, unit: Unit | undefined): boolean {
  return (unit === 'g' || unit === 'kg') && ediblePantryProducts.some(product => product.productId === productId);
}

/** Canonical IDs retain their issued snapshot semantics. Pantry-only IDs require the specific edible profile. */
export function matchesPantryFood(pantryId: string, food: Pick<FoodProfile, 'productId' | 'profileId'>): boolean {
  const edible = ediblePantryProducts.find(product => product.pantryId === pantryId);
  return edible ? food.productId === edible.productId && food.profileId === edible.profileId : pantryId === food.productId;
}
