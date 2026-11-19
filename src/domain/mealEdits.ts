import type { MealSlot, Recipe } from './catalog';
import type { ActivePlanEnvelope, PlanVariant, RecipeInstance } from './plan';
import { projectPlan } from './planProjection';
import type { InstanceProjection, PlanProjection } from './planProjection';
import { createRecipeEligibility } from './recipeEligibility';
import { compare, subtract } from './quantities';
import type { Rational } from './quantities';

export interface MealEditTarget {
  readonly variantId: string;
  readonly date: string;
  readonly slot: MealSlot;
  readonly instanceId: string;
  readonly recipeId: string;
}

export interface MealAlternative {
  readonly recipeId: string;
  readonly name: string;
  readonly cookingMinutes: number;
  readonly purchaseDelta: Rational;
  readonly purchaseDeltaKopecks: bigint;
  readonly familyCalorieDelta: Rational;
}

type Unavailable = 'stale' | 'incompatible' | 'over-budget' | 'incomplete';
type MealEditResult = { status: 'ready'; plan: ActivePlanEnvelope } | { status: Unavailable };
export type MealAlternativesResult = { status: 'ready'; options: readonly MealAlternative[]; overBudget: boolean; incomplete: boolean }
  | { status: 'stale' | 'cancelled' };

interface MealSearchOptions {
  readonly signal?: AbortSignal;
  readonly isCurrent?: () => boolean;
  readonly yieldControl?: () => Promise<void>;
}

const alternativesBatchSize = 4;
const yieldMacroTask = () => new Promise<void>(resolve => globalThis.setTimeout(resolve, 0));

function resolveTarget(plan: ActivePlanEnvelope, baseline: PlanProjection, target: MealEditTarget) {
  if (target.variantId !== plan.activeVariantId || target.variantId !== baseline.variantId) return null;
  const variant = plan.variants.find(row => row.id === target.variantId);
  const row = baseline.instances.find(({ instance }) => matchesTarget(instance, target));
  const index = variant?.instances.findIndex(instance => matchesTarget(instance, target)) ?? -1;
  return variant && row && index >= 0 ? { variant, row, index } : null;
}

function matchesTarget(instance: RecipeInstance, target: MealEditTarget) {
  return instance.id === target.instanceId && instance.recipeId === target.recipeId && instance.date === target.date && instance.slot === target.slot;
}

type ReplacementProjection = { status: 'ready'; variant: PlanVariant; projection: PlanProjection; meal: InstanceProjection }
  | { status: 'over-budget' | 'incomplete' };

function projectReplacement(plan: ActivePlanEnvelope, variant: PlanVariant, index: number, recipe: Recipe): ReplacementProjection {
  const next = { ...variant, instances: variant.instances.map((instance, at) => at === index ? { ...instance, recipeId: recipe.id, recipeSnapshot: recipe } : instance) };
  const result = projectPlan(plan.inputs, next);
  if (result.status === 'invalid') return { status: 'incomplete' };
  if (!result.projection.budget.check.accepted) return { status: 'over-budget' };
  const meal = result.projection.instances.find(row => row.instance.id === variant.instances[index].id);
  return meal ? { status: 'ready', variant: next, projection: result.projection, meal } : { status: 'incomplete' };
}

export function replaceMeal(plan: ActivePlanEnvelope, baseline: PlanProjection, target: MealEditTarget, recipeId: string): MealEditResult {
  const current = resolveTarget(plan, baseline, target);
  if (!current) return { status: 'stale' };
  const recipe = plan.inputs.catalog.recipes.find(row => row.id === recipeId);
  if (!recipe || recipe.id === target.recipeId || !recipe.slots.includes(target.slot)) return { status: 'incompatible' };
  const eligibility = createRecipeEligibility(plan.inputs)(recipe);
  if (eligibility.status !== 'eligible') return { status: eligibility.status === 'incomplete' ? 'incomplete' : 'incompatible' };
  const next = projectReplacement(plan, current.variant, current.index, recipe);
  if (next.status !== 'ready') return next;
  return { status: 'ready', plan: { ...plan, variants: plan.variants.map(row => row.id === current.variant.id ? next.variant : row) } };
}

export async function listMealAlternatives(plan: ActivePlanEnvelope, baseline: PlanProjection, target: MealEditTarget, { signal, isCurrent, yieldControl = yieldMacroTask }: MealSearchOptions = {}): Promise<MealAlternativesResult> {
  function interrupted(): 'cancelled' | 'stale' | null {
    return signal?.aborted ? 'cancelled' : isCurrent && !isCurrent() ? 'stale' : null;
  }
  const initial = interrupted();
  if (initial) return { status: initial };
  const current = resolveTarget(plan, baseline, target);
  if (!current) return { status: 'stale' };
  const evaluate = createRecipeEligibility(plan.inputs);
  const admitted: MealAlternative[] = [];
  let overBudget = false, incomplete = false;
  let attempted = 0;
  for (const recipe of plan.inputs.catalog.recipes) {
    if (recipe.id === target.recipeId || !recipe.slots.includes(target.slot)) continue;
    if (attempted > 0 && attempted % alternativesBatchSize === 0) {
      await yieldControl();
      const stopped = interrupted();
      if (stopped) return { status: stopped };
    }
    attempted++;
    const eligibility = evaluate(recipe);
    if (eligibility.status === 'rejected') continue;
    if (eligibility.status === 'incomplete') { incomplete = true; continue; }
    const candidate = projectReplacement(plan, current.variant, current.index, recipe);
    if (candidate.status !== 'ready') {
      overBudget ||= candidate.status === 'over-budget';
      incomplete ||= candidate.status === 'incomplete';
      continue;
    }
    admitted.push({
      recipeId: recipe.id, name: recipe.name, cookingMinutes: recipe.cookingMinutes,
      purchaseDelta: subtract(candidate.projection.costs.exact.purchase, baseline.costs.exact.purchase),
      purchaseDeltaKopecks: candidate.projection.costs.kopecks.purchase - baseline.costs.kopecks.purchase,
      familyCalorieDelta: subtract(candidate.meal.familyNutrition.calories, current.row.familyNutrition.calories),
    });
  }
  const stopped = interrupted();
  if (stopped) return { status: stopped };
  admitted.sort((left, right) => compare(left.purchaseDelta, right.purchaseDelta) || (left.recipeId < right.recipeId ? -1 : left.recipeId === right.recipeId ? 0 : 1));
  return { status: 'ready', options: admitted.slice(0, 5), overBudget, incomplete };
}
