import { immutableSnapshot, sameSnapshot } from './appliedSettings';
import { evaluateIngredient, nutrientKeys } from './catalog';
import type { CatalogDiagnostic, FoodProfile, MealSlot, Nutrition, PriceProfile } from './catalog';
import { mealSlots, validatePlanInputs } from './plan';
import type { PlanInputs, PlanVariant, RecipeInstance } from './plan';
import { add, compare, convertQuantity, decimal, divide, multiply, normalizeQuantity, rational, roundHalfUp, subtract } from './quantities';
import type { Quantity, Rational } from './quantities';

export interface Costs<Value> { readonly ingredient: Value; readonly purchase: Value; readonly covered: Value }
export interface Contribution {
  readonly instanceId: string; readonly recipeId: string; readonly date: string; readonly slot: MealSlot; readonly quantity: Quantity;
}
export interface ProjectionRow {
  readonly productId: string; readonly profileId: string; readonly name: string; readonly category: string;
  readonly required: Quantity; readonly covered: Quantity; readonly purchase: Quantity;
  readonly price: Extract<PriceProfile, { status: 'known' }>;
  readonly sources: readonly Contribution[];
  readonly costs: { readonly exact: Costs<Rational>; readonly kopecks: Costs<bigint> };
}
export interface InstanceProjection {
  readonly instance: RecipeInstance; readonly familyNutrition: Nutrition; readonly perPortionNutrition: Nutrition;
  readonly ingredientCost: Rational;
  readonly ingredients: readonly IngredientAllocation[];
}
export type PantryIssue = 'UNKNOWN_PANTRY_QUANTITY' | 'INCOMPATIBLE_PANTRY_UNIT';
export interface IngredientAllocation {
  readonly index: number; readonly productId: string; readonly profileId: string;
  readonly required: Quantity; readonly covered: Quantity; readonly purchase: Quantity;
  readonly issue: PantryIssue | null; readonly familyNutrition: Nutrition; readonly perPortionNutrition: Nutrition;
  readonly ingredientCost: Rational;
}
export interface DayProjection {
  readonly date: string; readonly familyNutrition: Nutrition; readonly personNutrition: Nutrition; readonly ingredientCost: Rational;
  readonly ingredientKopecks: bigint;
}
export interface BudgetCheck {
  readonly accepted: boolean; readonly exactWithinLimit: boolean; readonly displayedWithinLimit: boolean;
  /** A rejected candidate is never proof that no cheaper solution exists. */
  readonly reason: 'within-budget' | 'exact-limit-exceeded' | 'display-rounding-exceeded';
}
export interface PlanProjection {
  readonly variantId: string; readonly people: number; readonly dates: readonly string[];
  readonly rows: readonly ProjectionRow[]; readonly purchases: readonly ProjectionRow[]; readonly covered: readonly ProjectionRow[];
  readonly instances: readonly InstanceProjection[]; readonly days: readonly DayProjection[];
  readonly familyNutrition: Nutrition; readonly averagePersonDayNutrition: Nutrition;
  readonly costs: { readonly exact: Costs<Rational>; readonly kopecks: Costs<bigint> };
  readonly budget: { readonly limit: Rational; readonly limitKopecks: bigint; readonly remaining: Rational; readonly remainingKopecks: bigint; readonly check: BudgetCheck };
  readonly pantryIssues: readonly { readonly productId: string; readonly profileId: string; readonly code: 'UNKNOWN_PANTRY_QUANTITY' | 'INCOMPATIBLE_PANTRY_UNIT' }[];
}
export type ProjectionResult = { readonly status: 'projected'; readonly projection: PlanProjection }
  | { readonly status: 'invalid'; readonly diagnostics: readonly CatalogDiagnostic[] };
const zero = () => decimal('0');
const zeroNutrition = (): Nutrition => ({ calories: zero(), protein: zero(), fat: zero(), carbohydrates: zero() });
const plusNutrition = (left: Nutrition, right: Nutrition): Nutrition => ({ calories: add(left.calories, right.calories), protein: add(left.protein, right.protein), fat: add(left.fat, right.fat), carbohydrates: add(left.carbohydrates, right.carbohydrates) });
const divideNutrition = (values: Nutrition, divisor: Rational): Nutrition => ({ calories: divide(values.calories, divisor), protein: divide(values.protein, divisor), fat: divide(values.fat, divisor), carbohydrates: divide(values.carbohydrates, divisor) });
function fail(code: string): never { throw new RangeError(code); }
const validId = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0 && value.length <= 256;
export function checkPurchaseBudget(purchase: Rational, purchaseKopecks: bigint, limit: Rational): BudgetCheck {
  if (compare(purchase, zero()) < 0 || compare(limit, zero()) < 0 || purchaseKopecks < 0n) fail('INVALID_BUDGET');
  const exactWithinLimit = compare(purchase, limit) <= 0;
  const displayedWithinLimit = purchaseKopecks <= roundHalfUp(limit, 2);
  return { accepted: exactWithinLimit && displayedWithinLimit, exactWithinLimit, displayedWithinLimit,
    reason: !exactWithinLimit ? 'exact-limit-exceeded' : !displayedWithinLimit ? 'display-rounding-exceeded' : 'within-budget' };
}

/** Pure candidate projection; permits incomplete slot sets for bounded search and later removals.
 * Input/catalog integrity and instance references are checked here; recipe eligibility is the solver's gate.
 */
export function projectPlan(rawInputs: PlanInputs, variant: PlanVariant): ProjectionResult {
  try {
    const validated = validatePlanInputs(rawInputs);
    if (validated.status === 'invalid') return validated;
    const inputs = validated.inputs;
    if (!validId(variant.id) || !Array.isArray(variant.instances) || variant.instances.length > inputs.dates.length * mealSlots.length) fail('INVALID_VARIANT');
    const ids = new Set<string>(), slots = new Set<string>();
    const aggregates = new Map<string, { food: FoodProfile; quantity: Quantity; coveredAmount: Rational; sources: Contribution[] }>();
    // The only stock remainder in this projection. Alternatives start from their own snapshot.
    const stock = new Map(inputs.pantrySnapshot.filter(row => row.quantity.status === 'known').map(row => [row.productId, row.quantity.status === 'known' ? row.quantity.value : fail('INVALID_PANTRY')]));
    const pantryIssues: PlanProjection['pantryIssues'][number][] = [];
    const issueKeys = new Set<string>();
    const instanceRows: InstanceProjection[] = [];
    // Canonical order is independent of the caller's instance array; integrity is checked below.
    const ordered = [...variant.instances].sort((left, right) => inputs.dates.indexOf(left.date) - inputs.dates.indexOf(right.date) || mealSlots.indexOf(left.slot) - mealSlots.indexOf(right.slot));
    for (const instance of ordered) {
      const recipe = inputs.catalog.recipes.find(entry => entry.id === instance.recipeId);
      if (!validId(instance.id) || ids.has(instance.id) || !inputs.dates.includes(instance.date) || !mealSlots.includes(instance.slot)
        || slots.has(`${instance.date}/${instance.slot}`) || instance.catalogVersion !== inputs.catalogVersion
        || !recipe || !recipe.slots.includes(instance.slot) || !sameSnapshot(recipe, instance.recipeSnapshot)) fail('INVALID_RECIPE_REFERENCE');
      const servings = rational(instance.selectedServings.numerator, instance.selectedServings.denominator);
      if (!sameSnapshot(servings, instance.selectedServings) || compare(servings, zero()) <= 0 || compare(servings, decimal('1000')) > 0) fail('INVALID_SERVINGS');
      ids.add(instance.id); slots.add(`${instance.date}/${instance.slot}`);
      const scale = divide(servings, recipe.baseServings);
      let familyNutrition = zeroNutrition(), ingredientCost = zero();
      const ingredients: IngredientAllocation[] = [];
      for (const [index, original] of recipe.ingredients.entries()) {
        const food = inputs.catalog.foods.find(entry => entry.productId === original.productId && entry.profileId === original.profileId);
        if (!food || food.nutrition.status !== 'known') fail('NUTRITION_UNKNOWN');
        const ingredient = { ...original, quantity: { ...original.quantity, amount: multiply(original.quantity.amount, scale) } };
        const evaluated = evaluateIngredient(food, ingredient);
        if (evaluated.status === 'invalid') return evaluated;
        if (evaluated.price.status !== 'known') fail('PRICE_UNKNOWN');
        familyNutrition = plusNutrition(familyNutrition, evaluated.nutrition);
        ingredientCost = add(ingredientCost, evaluated.price.amount);
        // A food's verified nutrient basis provides a single compatible row, including evidenced cross-unit conversions.
        const quantity = normalizeQuantity(convertQuantity(ingredient.quantity, food.nutrition.reference.unit, food, food.conversions));
        let coveredAmount = zero(), issue: PantryIssue | null = null;
        const pantry = inputs.pantrySnapshot.find(row => row.productId === food.productId);
        const remainder = stock.get(food.productId);
        if (pantry?.quantity.status === 'unknown') issue = 'UNKNOWN_PANTRY_QUANTITY';
        if (remainder) {
          try {
            const available = convertQuantity(remainder, quantity.unit, food, food.conversions);
            coveredAmount = compare(available.amount, quantity.amount) > 0 ? quantity.amount : available.amount;
            const consumed = convertQuantity({ amount: coveredAmount, unit: quantity.unit }, remainder.unit, food, food.conversions);
            stock.set(food.productId, { ...remainder, amount: subtract(remainder.amount, consumed.amount) });
          } catch (error) {
            if (!(error instanceof Error) || error.message !== 'INCOMPATIBLE_DIMENSION') throw error;
            issue = 'INCOMPATIBLE_PANTRY_UNIT';
          }
        }
        if (issue) {
          const issueKey = JSON.stringify([food.productId, food.profileId, issue]);
          if (!issueKeys.has(issueKey)) { issueKeys.add(issueKey); pantryIssues.push({ productId: food.productId, profileId: food.profileId, code: issue }); }
        }
        ingredients.push({ index, productId: food.productId, profileId: food.profileId, required: quantity,
          covered: { ...quantity, amount: coveredAmount }, purchase: { ...quantity, amount: subtract(quantity.amount, coveredAmount) }, issue,
          familyNutrition: evaluated.nutrition, perPortionNutrition: divideNutrition(evaluated.nutrition, servings), ingredientCost: evaluated.price.amount });
        const key = JSON.stringify([food.productId, food.profileId, quantity.unit]);
        const contribution: Contribution = { instanceId: instance.id, recipeId: recipe.id, date: instance.date, slot: instance.slot, quantity };
        const row = aggregates.get(key);
        if (row) { row.quantity = { ...quantity, amount: add(row.quantity.amount, quantity.amount) }; row.coveredAmount = add(row.coveredAmount, coveredAmount); row.sources.push(contribution); }
        else aggregates.set(key, { food, quantity, coveredAmount, sources: [contribution] });
      }
      instanceRows.push({ instance, familyNutrition, perPortionNutrition: divideNutrition(familyNutrition, servings), ingredientCost, ingredients });
    }
    const rows: ProjectionRow[] = [];
    for (const { food, quantity: required, coveredAmount, sources } of aggregates.values()) {
      const covered = { ...required, amount: coveredAmount }, purchase = { ...required, amount: subtract(required.amount, coveredAmount) };
      const evaluated = evaluateIngredient(food, { productId: food.productId, profileId: food.profileId, quantity: required });
      if (evaluated.status === 'invalid') return evaluated;
      if (evaluated.price.status !== 'known' || food.price.status !== 'known') fail('PRICE_UNKNOWN');
      const ingredient = evaluated.price.amount, purchaseCost = multiply(ingredient, divide(purchase.amount, required.amount));
      const ingredientKopecks = roundHalfUp(ingredient, 2), purchaseKopecks = roundHalfUp(purchaseCost, 2);
      rows.push({ productId: food.productId, profileId: food.profileId, name: food.name, category: food.category, required, covered, purchase, sources, price: food.price,
        costs: { exact: { ingredient, purchase: purchaseCost, covered: subtract(ingredient, purchaseCost) }, kopecks: { ingredient: ingredientKopecks, purchase: purchaseKopecks, covered: ingredientKopecks - purchaseKopecks } } });
    }
    const exact = rows.reduce<Costs<Rational>>((total, row) => ({ ingredient: add(total.ingredient, row.costs.exact.ingredient), purchase: add(total.purchase, row.costs.exact.purchase), covered: add(total.covered, row.costs.exact.covered) }), { ingredient: zero(), purchase: zero(), covered: zero() });
    const kopecks = rows.reduce<Costs<bigint>>((total, row) => ({ ingredient: total.ingredient + row.costs.kopecks.ingredient, purchase: total.purchase + row.costs.kopecks.purchase, covered: total.covered + row.costs.kopecks.covered }), { ingredient: 0n, purchase: 0n, covered: 0n });
    const days = inputs.dates.map(date => {
      const selected = instanceRows.filter(row => row.instance.date === date);
      const familyNutrition = selected.reduce((total, row) => plusNutrition(total, row.familyNutrition), zeroNutrition());
      // Canonical day display follows rounded product rows too. The period has its own
      // product aggregation: never distribute purchase/rounding residuals arbitrarily among days.
      const ingredientKopecks = rows.reduce((sum, row) => {
        const dayAmount = row.sources.filter(source => source.date === date).reduce((amount, source) => add(amount, source.quantity.amount), zero());
        return sum + roundHalfUp(multiply(row.costs.exact.ingredient, divide(dayAmount, row.required.amount)), 2);
      }, 0n);
      return { date, familyNutrition, personNutrition: divideNutrition(familyNutrition, decimal(String(inputs.appliedSettings.people))), ingredientCost: selected.reduce((total, row) => add(total, row.ingredientCost), zero()), ingredientKopecks };
    });
    const familyNutrition = instanceRows.reduce((total, row) => plusNutrition(total, row.familyNutrition), zeroNutrition());
    // Nutrients retain their exact source arithmetic; no stock/currency rounding can affect them.
    for (const key of nutrientKeys) if (compare(familyNutrition[key], zero()) < 0) fail('INVALID_NUTRITION');
    const limit = inputs.appliedSettings.budget.limit, limitKopecks = roundHalfUp(limit, 2);
    return { status: 'projected', projection: immutableSnapshot({ variantId: variant.id, people: inputs.appliedSettings.people, dates: inputs.dates,
      rows, purchases: rows.filter(row => row.purchase.amount.numerator > 0n), covered: rows.filter(row => row.covered.amount.numerator > 0n), instances: instanceRows, days,
      familyNutrition, averagePersonDayNutrition: divideNutrition(familyNutrition, decimal(String(inputs.appliedSettings.people * inputs.dates.length))), costs: { exact, kopecks },
      budget: { limit, limitKopecks, remaining: subtract(limit, exact.purchase), remainingKopecks: limitKopecks - kopecks.purchase, check: checkPurchaseBudget(exact.purchase, kopecks.purchase, limit) }, pantryIssues }) };
  } catch (error) {
    const code = error instanceof Error ? error.message : 'INVALID_PROJECTION';
    return { status: 'invalid', diagnostics: [{ code, path: 'projection', message: code }] };
  }
}
