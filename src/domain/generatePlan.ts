import { evaluateIngredient, nutrientKeys } from './catalog';
import type { CatalogDiagnostic, Recipe } from './catalog';
import { buildActivePlanEnvelope, mealSlots, validatePlanInputs } from './plan';
import type { BudgetEvidence, GenerationErrorCode, GenerationResult, PlanInputs, PlanVariant } from './plan';
import { projectPlan } from './planProjection';
import type { PlanProjection } from './planProjection';
import { add, compare, convertQuantity, decimal, divide, multiply, subtract } from './quantities';
import type { Rational } from './quantities';

export interface SearchOptions {
  readonly allergenKeys?: readonly string[];
  readonly maxEvaluations?: number;
  readonly maxTransitions?: number;
}
export interface SearchProgress { readonly transitions: number; readonly evaluatedCandidates: number }
export const SEARCH_LIMITS = Object.freeze({ beamWidth: 32, maxEvaluations: 512, evaluationCeiling: 20000, maxTransitions: 200000, batchSize: 128, exhaustiveSize: 256 });
interface Candidate { readonly recipe: Recipe; readonly ingredientCost: Rational }
interface Ranked { readonly ids: readonly string[]; readonly projection: PlanProjection; readonly variant: PlanVariant; readonly score: readonly Rational[]; readonly tie: number; readonly key: string }
const zero = () => decimal('0');
const diagnostic = (code: string, path: string, message = code): CatalogDiagnostic => ({ code, path, message });
const absolute = (value: Rational) => value.numerator < 0n ? subtract(zero(), value) : value;
const minimum = (left: Rational, right: Rational) => compare(left, right) < 0 ? left : right;
/** FNV-1a over explicit UTF-16 code units. No clock, randomness or locale collation. */
function hash(value: string): number { let result = 2166136261; for (let i = 0; i < value.length; i++) result = Math.imul(result ^ value.charCodeAt(i), 16777619); return result >>> 0; }
function compareRank(left: Ranked, right: Ranked): number {
  for (let i = 0; i < left.score.length; i++) { const order = compare(left.score[i], right.score[i]); if (order) return order; }
  return left.tie - right.tie || (left.key < right.key ? -1 : left.key > right.key ? 1 : 0);
}
function makeVariant(inputs: PlanInputs, ids: readonly string[]): PlanVariant {
  const recipes = new Map(inputs.catalog.recipes.map(recipe => [recipe.id, recipe]));
  return { id: 'generated-1', instances: ids.map((id, index) => ({ id: `${inputs.dates[Math.floor(index / 4)]}/${mealSlots[index % 4]}`,
    date: inputs.dates[Math.floor(index / 4)], slot: mealSlots[index % 4], recipeId: id, catalogVersion: inputs.catalogVersion,
    recipeSnapshot: recipes.get(id)!, selectedServings: decimal(String(inputs.appliedSettings.people)) })) };
}
/** Ascending lexicographic order: negative early stock usage; optional normalized target
 * deviation; variety; exact purchases; seeded hash then recipe-ID sequence.
 * Each expiring product contributes at most1: min(early use/known stock,1).
 * Unknown quantity contributes presence once (no monetary coverage); incompatible stock0.
 * Targets use sum |average person-day - target| / max(target,1), including literal zero.
 */
function score(inputs: PlanInputs, projection: PlanProjection, ids: readonly string[]): readonly Rational[] {
  let early = zero();
  for (const stock of inputs.pantrySnapshot.filter(row => row.expiresSoon)) {
    const rows = projection.rows.filter(row => row.productId === stock.productId);
    if (stock.quantity.status === 'unknown') {
      if (rows.some(row => row.sources.some(source => inputs.dates.slice(0, 2).includes(source.date)))) early = add(early, decimal('1'));
      continue;
    }
    const available = stock.quantity.value;
    let used = zero();
    for (const row of rows) {
      const food = inputs.catalog.foods.find(food => food.profileId === row.profileId)!;
      for (const source of row.sources.filter(source => inputs.dates.slice(0, 2).includes(source.date))) {
        try { used = add(used, convertQuantity(source.quantity, available.unit, food, food.conversions).amount); }
        catch { /* Incompatible stock cannot count as expiring usage. */ }
      }
    }
    early = add(early, minimum(divide(used, available.amount), decimal('1')));
  }
  const values = [subtract(zero(), early)];
  const target = inputs.appliedSettings.target;
  if (target.status === 'known') values.push(nutrientKeys.reduce((sum, key) => add(sum,
    divide(absolute(subtract(projection.averagePersonDayNutrition[key], target.values[key])), compare(target.values[key], decimal('1')) < 0 ? decimal('1') : target.values[key])), zero()));
  const variety = inputs.appliedSettings.variety;
  const repeats = ids.reduce((count, id, index) => count + (index >= 4 && id === ids[index - 4] ? 1 : 0), 0);
  values.push(decimal(String(variety === 'medium' ? repeats : new Set(ids).size * (variety === 'max' ? -1 : 1))), projection.costs.exact.purchase);
  return values;
}

/** Resumable pure search. One next() advances at most one recipe admission, complete
 * evaluation or local transition. Adapter owns clocks, macrotasks and cancellation.
 * Tiny spaces are enumerated fully; larger spaces use cheapest baseline and two rounds
 * of beam32 single-slot substitutions. The default512 evaluations was chosen to bound
 * expensive shared projection work; callers may lower it or raise it up to20000.
 */
export function* createPlanSearch(rawInputs: PlanInputs, options: SearchOptions = {}): Generator<SearchProgress, GenerationResult> {
  let transitions = 0, evaluatedCandidates = 0;
  const diagnostics: CatalogDiagnostic[] = [];
  const progress = () => ({ transitions, evaluatedCandidates });
  const refuse = (code: GenerationErrorCode, budgetEvidence?: BudgetEvidence): GenerationResult => ({ status: 'error', error: { code,
    message: ({ GENERATION_DATA_INCOMPLETE: 'Недостаточно проверенных данных для подбора меню', NO_RECIPES: 'Для некоторых приёмов пищи нет рецептов с заданными ограничениями',
      SEARCH_EXHAUSTED: 'Достигнут предел поиска. Невозможность меню не доказана', BUDGET_TOO_LOW: 'Проверенный бюджет недостаточен для допустимого меню',
      TIMEOUT: 'Время подбора истекло', FAILED: 'Не удалось выполнить подбор' })[code],
    diagnostics: [...diagnostics, diagnostic('SEARCH_WORK', 'search', JSON.stringify({ ...progress(), seed: rawInputs?.seed, catalogVersion: rawInputs?.catalogVersion }))],
    ...(budgetEvidence ? { budgetEvidence } : {}) } });
  try {
    const validated = validatePlanInputs(rawInputs);
    if (validated.status === 'invalid') { diagnostics.push(...validated.diagnostics); return refuse('GENERATION_DATA_INCOMPLETE'); }
    const inputs = validated.inputs;
    const maxEvaluations = options.maxEvaluations ?? SEARCH_LIMITS.maxEvaluations, maxTransitions = options.maxTransitions ?? SEARCH_LIMITS.maxTransitions;
    const allergens = [...new Set(options.allergenKeys ?? [])];
    if (!Number.isSafeInteger(maxEvaluations) || maxEvaluations < 1 || maxEvaluations > SEARCH_LIMITS.evaluationCeiling
      || !Number.isSafeInteger(maxTransitions) || maxTransitions < 1 || maxTransitions > SEARCH_LIMITS.maxTransitions
      || allergens.some(key => typeof key !== 'string' || !key.trim() || key.length > 256)) {
      diagnostics.push(diagnostic('INVALID_SEARCH_OPTIONS', 'search')); return refuse('GENERATION_DATA_INCOMPLETE');
    }
    // A no-fish assertion alone does not establish seafood suitability.
    const requirements = [...inputs.appliedSettings.restrictions.map(key => ({ kind: 'restriction', key })),
      ...[...new Set([...allergens, ...(inputs.appliedSettings.restrictions.includes('no-fish') ? ['seafood'] : [])])].map(key => ({ kind: 'allergen', key }))];
    const admitted: Candidate[] = [], incomplete: Recipe[] = [], rejected: Recipe[] = [];
    const foods = new Map(inputs.catalog.foods.map(food => [food.profileId, food]));
    for (const recipe of [...inputs.catalog.recipes].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0)) {
      if (transitions >= maxTransitions) return refuse('SEARCH_EXHAUSTED');
      let incompatible = inputs.appliedSettings.cookingMinutes !== null && recipe.cookingMinutes > inputs.appliedSettings.cookingMinutes;
      incompatible ||= recipe.ingredients.some(row => inputs.appliedSettings.exclusionIds.includes(row.productId));
      let missing = false, ingredientCost = zero();
      const recipeDiagnostics: CatalogDiagnostic[] = [];
      if (!incompatible) for (const ingredient of recipe.ingredients) {
        const food = foods.get(ingredient.profileId)!;
        if (food.safety.status !== 'known') { missing = true; recipeDiagnostics.push(diagnostic('SAFETY_UNKNOWN', `recipes.${recipe.id}.${food.profileId}`)); }
        for (const required of requirements) {
          const fact = food.safety.status === 'known' ? food.safety.facts.find(fact => fact.kind === required.kind && fact.key === required.key) : undefined;
          if (fact?.suitable === false) incompatible = true;
          else if (!fact) { missing = true; recipeDiagnostics.push(diagnostic('SAFETY_FACT_MISSING', `recipes.${recipe.id}.${food.profileId}`, `${required.kind}:${required.key}`)); }
        }
        const evaluated = evaluateIngredient(food, ingredient);
        if (evaluated.status !== 'evaluated') { missing = true; recipeDiagnostics.push(...evaluated.diagnostics); }
        else if (evaluated.price.status !== 'known') { missing = true; recipeDiagnostics.push(diagnostic('PRICE_UNKNOWN', `recipes.${recipe.id}.${food.profileId}`)); }
        else ingredientCost = add(ingredientCost, multiply(evaluated.price.amount, divide(decimal(String(inputs.appliedSettings.people)), recipe.baseServings)));
      }
      if (incompatible) rejected.push(recipe);
      else if (missing) { incomplete.push(recipe); diagnostics.push(...recipeDiagnostics); }
      else admitted.push({ recipe, ingredientCost });
      transitions++; yield progress();
    }
    const slots = inputs.dates.flatMap(() => mealSlots.map(slot => admitted.filter(row => row.recipe.slots.includes(slot))
      .sort((a, b) => compare(a.ingredientCost, b.ingredientCost) || (a.recipe.id < b.recipe.id ? -1 : 1))));
    for (const slot of mealSlots) diagnostics.push(diagnostic('SLOT_CANDIDATES', `slots.${slot}`, JSON.stringify({
      eligible: admitted.filter(row => row.recipe.slots.includes(slot)).length, incomplete: incomplete.filter(row => row.slots.includes(slot)).length, rejected: rejected.filter(row => row.slots.includes(slot)).length })));
    const empty = slots.map((rows, index) => ({ rows, slot: mealSlots[index % 4] })).filter(row => row.rows.length === 0);
    if (empty.length) return refuse(empty.some(row => incomplete.some(recipe => recipe.slots.includes(row.slot))) ? 'GENERATION_DATA_INCOMPLETE' : 'NO_RECIPES');
    const evidence = (kind: BudgetEvidence['kind'], amount: Rational, complete: boolean): BudgetEvidence => ({ kind, amount,
      proof: { method: kind === 'lower-bound' ? 'sum-slot-minimum-ingredient-value-minus-compatible-stock-upper-value' : 'all-eligible-complete-combinations-enumerated',
        catalogVersion: inputs.catalogVersion, evaluatedCandidates, complete } });
    let lowerBound = slots.reduce((sum, rows) => add(sum, rows[0].ingredientCost), zero());
    const eligibleProfiles = new Set(admitted.flatMap(row => row.recipe.ingredients.map(ingredient => ingredient.profileId)));
    for (const stock of inputs.pantrySnapshot) if (stock.quantity.status === 'known') {
      let maximum = zero();
      for (const food of inputs.catalog.foods.filter(food => food.productId === stock.productId && eligibleProfiles.has(food.profileId))) {
        if (food.price.status !== 'known') continue;
        try {
          const price = multiply(decimal(food.price.amount), divide(convertQuantity(stock.quantity.value, food.price.reference.unit, food, food.conversions).amount, decimal(food.price.reference.amount)));
          if (compare(price, maximum) > 0) maximum = price;
        } catch { /* Only compatible, evidenced stock has any discount value. */ }
      }
      lowerBound = subtract(lowerBound, maximum);
    }
    if (lowerBound.numerator < 0n) lowerBound = zero();
    if (!incomplete.length && compare(lowerBound, inputs.appliedSettings.budget.limit) > 0) return refuse('BUDGET_TOO_LOW', evidence('lower-bound', lowerBound, false));
    let best: Ranked | undefined, cheapest: Rational | undefined;
    let projectionFailure = false;
    const seen = new Set<string>();
    const evaluate = (ids: readonly string[]): Ranked | undefined => {
      const key = JSON.stringify(ids);
      if (seen.has(key)) return undefined;
      seen.add(key); evaluatedCandidates++;
      const variant = makeVariant(inputs, ids), result = projectPlan(inputs, variant);
      if (result.status !== 'projected') { diagnostics.push(...result.diagnostics); projectionFailure = true; return undefined; }
      const projection = result.projection;
      if (!cheapest || compare(projection.costs.exact.purchase, cheapest) < 0) cheapest = projection.costs.exact.purchase;
      const ranked = { ids: [...ids], variant, projection, score: score(inputs, projection, ids), tie: hash(`${inputs.seed}:${key}`), key };
      if (projection.budget.check.accepted && (!best || compareRank(ranked, best) < 0)) best = ranked;
      return ranked;
    };
    // Product computation is capped; no integer overflow or construction of huge spaces.
    let size = 1;
    for (const rows of slots) { size *= rows.length; if (size > SEARCH_LIMITS.exhaustiveSize) break; }
    let complete = false;
    if (size <= SEARCH_LIMITS.exhaustiveSize) {
      const indices = slots.map(() => 0);
      while (true) {
        if (transitions >= maxTransitions || evaluatedCandidates >= maxEvaluations) break;
        evaluate(slots.map((rows, index) => rows[indices[index]].recipe.id));
        transitions++; yield progress();
        let place = indices.length - 1;
        while (place >= 0 && ++indices[place] === slots[place].length) { indices[place] = 0; place--; }
        if (place < 0) { complete = true; break; }
      }
    } else {
      if (transitions >= maxTransitions) return refuse('SEARCH_EXHAUSTED');
      const baseline = evaluate(slots.map(rows => rows[0].recipe.id));
      transitions++; yield progress();
      let beam = baseline ? [baseline] : [];
      outer: for (let round = 0; round < 2; round++) {
        const next = [...beam];
        for (const current of beam) for (let index = 0; index < slots.length; index++) for (const candidate of slots[index]) {
          if (transitions >= maxTransitions || evaluatedCandidates >= maxEvaluations) break outer;
          const ids = [...current.ids]; ids[index] = candidate.recipe.id;
          const ranked = evaluate(ids);
          if (ranked) {
            next.push(ranked);
            // Feasible candidates dominate the beam; infeasible ones prefer lower purchase
            // cost to allow a route back inside the hard budget. Final choice uses soft order.
            next.sort((a, b) => Number(b.projection.budget.check.accepted) - Number(a.projection.budget.check.accepted)
              || (!a.projection.budget.check.accepted ? compare(a.projection.costs.exact.purchase, b.projection.costs.exact.purchase) : 0) || compareRank(a, b));
            if (next.length > SEARCH_LIMITS.beamWidth) next.pop();
          }
          transitions++; yield progress();
        }
        beam = next;
      }
    }
    if (best) return { status: 'success', plan: buildActivePlanEnvelope(inputs, [best.variant], best.variant.id) };
    if (incomplete.length || projectionFailure) return refuse('GENERATION_DATA_INCOMPLETE');
    if (complete && cheapest) return refuse('BUDGET_TOO_LOW', evidence('exhaustive-minimum', cheapest, true));
    return refuse('SEARCH_EXHAUSTED', evidence('lower-bound', lowerBound, false));
  } catch (error) {
    diagnostics.push(diagnostic(error instanceof Error ? error.message : 'INVALID_SEARCH', 'search'));
    return refuse('GENERATION_DATA_INCOMPLETE');
  }
}
