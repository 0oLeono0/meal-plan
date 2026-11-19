import { evaluateIngredient } from './catalog';
import type { CatalogDiagnostic, Recipe } from './catalog';
import type { PlanInputs } from './plan';
import { add, decimal } from './quantities';
import type { Rational } from './quantities';

type Eligibility = { status: 'eligible'; ingredientCost: Rational }
  | { status: 'rejected' | 'incomplete'; diagnostics: readonly CatalogDiagnostic[] };

/** Eligibility uses the plan's stored catalog and applied restrictions. Budget needs a whole-plan projection. */
export function createRecipeEligibility({ catalog, appliedSettings }: PlanInputs, allergens: readonly string[] = []) {
  const requirements = [
    ...appliedSettings.restrictions.map(key => ({ kind: 'restriction', key })),
    ...allergens.map(key => ({ kind: 'allergen', key })),
  ];
  const foods = new Map(catalog.foods.map(food => [food.profileId, food]));
  const exclusions = new Set(appliedSettings.exclusionIds);
  return (recipe: Recipe): Eligibility => {
    if (appliedSettings.cookingMinutes !== null && recipe.cookingMinutes > appliedSettings.cookingMinutes) {
      return { status: 'rejected', diagnostics: [{ code: 'COOKING_LIMIT', path: `recipes.${recipe.id}`, message: 'COOKING_LIMIT' }] };
    }
    if (recipe.ingredients.some(row => exclusions.has(row.productId))) {
      return { status: 'rejected', diagnostics: [{ code: 'EXCLUDED_PRODUCT', path: `recipes.${recipe.id}`, message: 'EXCLUDED_PRODUCT' }] };
    }
    const diagnostics: CatalogDiagnostic[] = [];
    let incompatible = false, ingredientCost = decimal('0');
    for (const ingredient of recipe.ingredients) {
      const food = foods.get(ingredient.profileId);
      const path = `recipes.${recipe.id}.${ingredient.profileId}`;
      if (!food || food.productId !== ingredient.productId) {
        diagnostics.push({ code: 'UNKNOWN_PROFILE', path, message: 'UNKNOWN_PROFILE' });
        continue;
      }
      if (food.safety.status !== 'known') diagnostics.push({ code: 'SAFETY_UNKNOWN', path, message: 'SAFETY_UNKNOWN' });
      for (const required of requirements) {
        const fact = food.safety.status === 'known' ? food.safety.facts.find(row => row.kind === required.kind && row.key === required.key) : undefined;
        if (fact?.suitable === false) incompatible = true;
        else if (!fact) diagnostics.push({ code: 'SAFETY_FACT_MISSING', path, message: `${required.kind}:${required.key}` });
      }
      const evaluated = evaluateIngredient(food, ingredient);
      if (evaluated.status !== 'evaluated') diagnostics.push(...evaluated.diagnostics);
      else if (evaluated.price.status !== 'known') diagnostics.push({ code: 'PRICE_UNKNOWN', path, message: 'PRICE_UNKNOWN' });
      else ingredientCost = add(ingredientCost, evaluated.price.amount);
    }
    if (incompatible) return { status: 'rejected', diagnostics };
    if (diagnostics.length) return { status: 'incomplete', diagnostics };
    return { status: 'eligible', ingredientCost };
  };
}
