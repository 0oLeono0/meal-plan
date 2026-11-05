import type { ActiveBundle } from '../adapters/activePlan';
import type { Catalog, CatalogLoadResult, FoodProfile, Nutrition, Recipe, UnknownFact } from './catalog';
import { evaluateIngredient, nutrientKeys } from './catalog';
import { calendarDates } from './plan';
import type { RecipeInstance } from './plan';
import type { IngredientAllocation } from './planProjection';
import { sameSnapshot } from './appliedSettings';
import { add, compare, convertQuantity, decimal, divide, formatExact, multiply } from './quantities';
import type { Quantity, Rational } from './quantities';

type LoadStatus = 'unloaded' | 'pending' | 'missing' | 'loaded' | 'corrupt' | 'error';
export interface RecipeRequest {
  readonly pathname: string; readonly search: string;
  readonly active: ActiveBundle | null; readonly loadStatus: LoadStatus;
  readonly catalog: CatalogLoadResult | null;
}
type Failure = { readonly status: 'pending' | 'error' | 'incomplete' | 'stale' | 'notfound'; readonly returnTo: string; readonly retry?: 'plan' | 'catalog' };
type Resolved = { readonly status: 'direct' | 'context'; readonly recipe: Recipe; readonly catalog: Catalog;
  readonly servings: Rational; readonly returnTo: string; readonly instance?: RecipeInstance; readonly active?: ActiveBundle };
const validId = (value: string) => value.length > 0 && value.length <= 256 && value.trim().length > 0 && !/[\u0000-\u001f\u007f]/.test(value);

/** Validate the raw URL before URLSearchParams' forgiving percent decoder can hide malformed input.
 * No navigation, selection, persistence or fallback to a different instance occurs here. */
export function resolveRecipeContext(request: RecipeRequest): Resolved | Failure {
  const invalid = (): Failure => ({ status: 'stale', returnTo: '/menu' });
  try {
    if (request.pathname.length > 3100 || request.search.length > 8192) return invalid();
    const match = /^\/recipe(?:\/([^/]*))?\/?$/.exec(request.pathname);
    if (!match) return invalid();
    const id = decodeURIComponent(match[1] ?? '');
    decodeURIComponent(request.search.replace(/\+/g, ' '));
    if (!id) return { status: 'notfound', returnTo: '/menu' };
    if (!validId(id)) return invalid();
    const params = new URLSearchParams(request.search);
    const keys = [...params.keys()];
    if (new Set(keys).size !== keys.length || keys.some(key => !['variant', 'instance', 'view', 'day'].includes(key))) return invalid();
    const view = params.get('view'), day = params.get('day');
    if (view !== null && view !== 'day' && view !== 'week') return invalid();
    if (day !== null) calendarDates(day, 1);
    const menuQuery = new URLSearchParams();
    if (view) menuQuery.set('view', view);
    if (day) menuQuery.set('day', day);
    const returnQuery = menuQuery.toString();
    const returnTo = `/menu${returnQuery ? `?${returnQuery}` : ''}`;
    const variantId = params.get('variant'), instanceId = params.get('instance');
    if (variantId !== null || instanceId !== null) {
      if (!variantId || !instanceId || !validId(variantId) || !validId(instanceId)) return invalid();
      if (request.loadStatus === 'pending' || request.loadStatus === 'unloaded') return { status: 'pending', returnTo };
      if (request.loadStatus === 'error') return { status: 'error', returnTo, retry: 'plan' };
      if (request.loadStatus === 'corrupt') return { status: 'incomplete', returnTo, retry: 'plan' };
      const active = request.active;
      if (!active || active.plan.activeVariantId !== variantId) return invalid();
      if (day && !active.plan.inputs.dates.includes(day)) return invalid();
      const variant = active.plan.variants.find(row => row.id === variantId);
      const instance = variant?.instances.find(row => row.id === instanceId);
      if (!instance || instance.recipeId !== id) return invalid();
      return { status: 'context', recipe: instance.recipeSnapshot, catalog: active.plan.inputs.catalog,
        servings: instance.selectedServings, instance, active, returnTo };
    }
    if (request.catalog === null) return { status: 'pending', returnTo };
    if (request.catalog.status !== 'loaded') return { status: 'error', returnTo, retry: 'catalog' };
    const recipe = request.catalog.catalog.recipes.find(row => row.id === id);
    return recipe ? { status: 'direct', recipe, catalog: request.catalog.catalog, servings: recipe.baseServings, returnTo }
      : { status: 'notfound', returnTo };
  } catch { return invalid(); }
}

export type NutritionFact = { readonly status: 'known'; readonly value: Nutrition } | UnknownFact;
export interface RecipeIngredientView {
  readonly index: number; readonly food: FoodProfile; readonly required: Quantity;
  readonly perPortionNutrition: NutritionFact; readonly familyCost: Rational | null;
  readonly stock?: Pick<IngredientAllocation, 'covered' | 'purchase' | 'issue'>;
}
export interface RecipeView {
  readonly status: 'direct' | 'context'; readonly recipe: Recipe; readonly catalogVersion: string;
  readonly servings: Rational; readonly returnTo: string; readonly instance?: RecipeInstance;
  readonly ingredients: readonly RecipeIngredientView[]; readonly perPortionNutrition: NutritionFact;
  readonly perPortionCost: Rational | null;
  readonly servingsLabel: string; readonly ingredientBasis: string;
}
function servingLabel(value: Rational, afterNa: boolean): string {
  const last = value.numerator % 10n, lastTwo = value.numerator % 100n;
  const form = value.denominator !== 1n ? 'порции' : lastTwo >= 11n && lastTwo <= 14n ? 'порций'
    : last === 1n ? (afterNa ? 'порцию' : 'порция') : last >= 2n && last <= 4n ? 'порции' : 'порций';
  return `${formatExact(value).replace('.', ',')} ${form}`;
}
const unknownNutrition = (): UnknownFact => ({ status: 'unknown', reason: 'Нет подтверждённых данных КБЖУ' });
const scaleNutrition = (nutrition: Nutrition, factor: Rational): Nutrition => ({ calories: multiply(nutrition.calories, factor), protein: multiply(nutrition.protein, factor), fat: multiply(nutrition.fat, factor), carbohydrates: multiply(nutrition.carbohydrates, factor) });

/** Family ingredient basis and one-portion headline/composition; no rounded value enters arithmetic. */
export function projectRecipeView(request: RecipeRequest): RecipeView | Failure {
  const resolved = resolveRecipeContext(request);
  if (!('recipe' in resolved)) return resolved;
  const incomplete = (): Failure => ({ status: 'incomplete', returnTo: resolved.returnTo, retry: resolved.status === 'context' ? 'plan' : 'catalog' });
  try {
    const { recipe, catalog, servings } = resolved;
    if (!recipe.ingredients.length || !recipe.steps.length || recipe.steps.some(step => !step.trim())
      || compare(servings, decimal('0')) <= 0 || compare(servings, decimal('1000')) > 0 || compare(recipe.baseServings, decimal('0')) <= 0) return incomplete();
    const scale = divide(servings, recipe.baseServings);
    const saved = resolved.active?.projections.find(row => row.variantId === resolved.active?.plan.activeVariantId)?.instances.find(row => row.instance.id === resolved.instance?.id);
    if (resolved.status === 'context' && (!saved || !sameSnapshot(saved.instance, resolved.instance) || saved.ingredients.length !== recipe.ingredients.length)) return incomplete();
    const ingredients: RecipeIngredientView[] = [];
    for (const [index, original] of recipe.ingredients.entries()) {
      const food = catalog.foods.find(food => food.productId === original.productId && food.profileId === original.profileId);
      if (!food) return incomplete();
      if (saved) {
        const row = saved.ingredients[index];
        if (row.index !== index || row.productId !== food.productId || row.profileId !== food.profileId || food.nutrition.status !== 'known' || food.price.status !== 'known') return incomplete();
        ingredients.push({ index, food, required: row.required, perPortionNutrition: { status: 'known', value: row.perPortionNutrition }, familyCost: row.ingredientCost,
          stock: { covered: row.covered, purchase: row.purchase, issue: row.issue } });
        continue;
      }
      const required = { ...original.quantity, amount: multiply(original.quantity.amount, scale) };
      const evaluated = evaluateIngredient(food, { ...original, quantity: required });
      if (evaluated.status === 'invalid' && (resolved.status === 'context' || food.nutrition.status === 'known')) return incomplete();
      const perPortionNutrition: NutritionFact = evaluated.status === 'evaluated' ? { status: 'known', value: scaleNutrition(evaluated.nutrition, divide(decimal('1'), servings)) } : unknownNutrition();
      const familyCost = food.price.status === 'known' ? multiply(decimal(food.price.amount), divide(convertQuantity(required, food.price.reference.unit, food, food.conversions).amount, decimal(food.price.reference.amount))) : null;
      if (resolved.status === 'context' && familyCost === null) return incomplete();
      ingredients.push({ index, food, required, perPortionNutrition, familyCost });
    }
    const totals: Record<typeof nutrientKeys[number], Rational> = { calories: decimal('0'), protein: decimal('0'), fat: decimal('0'), carbohydrates: decimal('0') };
    for (const ingredient of ingredients) if (ingredient.perPortionNutrition.status === 'known') {
      for (const key of nutrientKeys) totals[key] = add(totals[key], ingredient.perPortionNutrition.value[key]);
    }
    const perPortionNutrition: NutritionFact = ingredients.every(row => row.perPortionNutrition.status === 'known') ? { status: 'known', value: totals } : unknownNutrition();
    const perPortionCost = ingredients.every(row => row.familyCost !== null) ? divide(ingredients.reduce((sum, row) => add(sum, row.familyCost!), decimal('0')), servings) : null;
    return { status: resolved.status, recipe, catalogVersion: catalog.version, servings, returnTo: resolved.returnTo, instance: resolved.instance, ingredients, perPortionNutrition, perPortionCost,
      servingsLabel: servingLabel(servings, false), ingredientBasis: `Ингредиенты на ${servingLabel(servings, true)}` };
  } catch { return incomplete(); }
}
