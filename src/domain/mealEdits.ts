import type { Recipe } from './catalog';
import { EDITED_PLAN_SCHEMA_VERSION, mealSlots, planCoordinates } from './plan';
import type { ActivePlanEnvelope, MealCoordinate, PlanVariant, RecipeInstance } from './plan';
import { projectPlan } from './planProjection';
import type { InstanceProjection, PlanProjection } from './planProjection';
import { createRecipeEligibility } from './recipeEligibility';
import { compare, decimal, multiply, subtract } from './quantities';
import type { Rational } from './quantities';

export interface MealEditTarget extends MealCoordinate {
  readonly variantId: string;
  readonly instanceId: string;
  readonly recipeId: string;
}
export interface EmptyMealTarget extends MealCoordinate {
  readonly variantId: string;
  readonly kind: 'empty';
}
export type MealSelectionTarget = MealEditTarget | EmptyMealTarget;
export const mealPortionMultipliers = ['0.5', '1', '2'] as const;
export type MealPortionMultiplier = (typeof mealPortionMultipliers)[number];

function familyServings(people: number, multiplier: MealPortionMultiplier): Rational {
  return multiply(decimal(String(people)), decimal(multiplier));
}

export function selectedPortionMultiplier(people: number, servings: Rational): MealPortionMultiplier | null {
  return mealPortionMultipliers.find(multiplier => compare(servings, familyServings(people, multiplier)) === 0) ?? null;
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
type MealEditResult = { status: 'ready'; plan: ActivePlanEnvelope } | { status: Unavailable | 'unchanged' };
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
function matchesCoordinate(left: MealCoordinate, right: MealCoordinate) {
  return left.date === right.date && left.slot === right.slot;
}
function slotOrder(left: MealCoordinate, right: MealCoordinate) {
  return left.date < right.date ? -1 : left.date > right.date ? 1 : mealSlots.indexOf(left.slot) - mealSlots.indexOf(right.slot);
}
function resolveSelection(plan: ActivePlanEnvelope, baseline: PlanProjection, target: MealSelectionTarget) {
  if (!('kind' in target)) return resolveTarget(plan, baseline, target);
  if (plan.schemaVersion !== EDITED_PLAN_SCHEMA_VERSION || target.variantId !== plan.activeVariantId || target.variantId !== baseline.variantId) return null;
  const variant = plan.variants.find(row => row.id === target.variantId);
  if (!variant?.emptySlots.some(slot => matchesCoordinate(slot, target)) || variant.instances.some(row => matchesCoordinate(row, target))) return null;
  const insertion = variant.instances.findIndex(row => slotOrder(row, target) > 0);
  return { variant, row: null, index: insertion < 0 ? variant.instances.length : insertion };
}
export function freeMealId(plan: ActivePlanEnvelope, seed: string): string {
  const ids = new Set(plan.variants.flatMap(row => row.instances.map(instance => instance.id)));
  let id = `added/${seed}`;
  for (let suffix = 1; ids.has(id); suffix++) id = `added/${seed}/${suffix}`;
  return id;
}

type ReplacementProjection = { status: 'ready'; variant: PlanVariant; projection: PlanProjection; meal: InstanceProjection }
  | { status: 'over-budget' | 'incomplete' };

function budgetImproves(next: PlanProjection, baseline: PlanProjection): boolean {
  const exact = compare(next.costs.exact.purchase, baseline.costs.exact.purchase);
  const displayed = next.costs.kopecks.purchase - baseline.costs.kopecks.purchase;
  return exact <= 0 && displayed <= 0n && (exact < 0 || displayed < 0n);
}

function projectInstance(plan: ActivePlanEnvelope, variant: PlanVariant, index: number, selected: RecipeInstance, insert = false, reliefBaseline?: PlanProjection): ReplacementProjection {
  const instances = [...variant.instances];
  instances.splice(index, insert ? 0 : 1, selected);
  const next = { ...variant, instances };
  const result = projectPlan(plan.inputs, next);
  if (result.status === 'invalid') return { status: 'incomplete' };
  if (!result.projection.budget.check.accepted && !(reliefBaseline && budgetImproves(result.projection, reliefBaseline))) return { status: 'over-budget' };
  const meal = result.projection.instances.find(row => row.instance.id === selected.id);
  return meal ? { status: 'ready', variant: next, projection: result.projection, meal } : { status: 'incomplete' };
}

function projectSelection(plan: ActivePlanEnvelope, variant: PlanVariant, index: number, recipe: Recipe, extra?: RecipeInstance): ReplacementProjection {
  return projectInstance(plan, variant, index, extra ?? { ...variant.instances[index], recipeId: recipe.id, recipeSnapshot: recipe }, Boolean(extra));
}

function installInstances(plan: ActivePlanEnvelope, next: PlanVariant): MealEditResult {
  const install = <T extends PlanVariant>(variant: T): T => variant.id === next.id ? { ...variant, instances: next.instances } : variant;
  return { status: 'ready', plan: plan.schemaVersion === EDITED_PLAN_SCHEMA_VERSION
    ? { ...plan, variants: plan.variants.map(install) }
    : { ...plan, variants: plan.variants.map(install) } };
}

export function changeMealServings(plan: ActivePlanEnvelope, baseline: PlanProjection, target: MealEditTarget, multiplier: MealPortionMultiplier): MealEditResult {
  const current = resolveTarget(plan, baseline, target);
  if (!current) return { status: 'stale' };
  if (!mealPortionMultipliers.includes(multiplier)) return { status: 'incompatible' };
  const selectedServings = familyServings(plan.inputs.appliedSettings.people, multiplier);
  const instance = current.variant.instances[current.index];
  const change = compare(selectedServings, instance.selectedServings);
  if (change === 0) return { status: 'unchanged' };
  const next = projectInstance(plan, current.variant, current.index, { ...instance, selectedServings }, false, change < 0 ? baseline : undefined);
  return next.status === 'ready' ? installInstances(plan, next.variant) : next;
}
function newInstance(plan: ActivePlanEnvelope, target: EmptyMealTarget, recipe: Recipe, id: string): RecipeInstance {
  return { id, date: target.date, slot: target.slot, recipeId: recipe.id, recipeSnapshot: recipe, catalogVersion: plan.inputs.catalogVersion,
    selectedServings: decimal(String(plan.inputs.appliedSettings.people)) };
}

export function replaceMeal(plan: ActivePlanEnvelope, baseline: PlanProjection, target: MealEditTarget, recipeId: string): MealEditResult {
  const current = resolveTarget(plan, baseline, target);
  if (!current) return { status: 'stale' };
  const recipe = plan.inputs.catalog.recipes.find(row => row.id === recipeId);
  if (!recipe || recipe.id === target.recipeId || !recipe.slots.includes(target.slot)) return { status: 'incompatible' };
  const eligibility = createRecipeEligibility(plan.inputs)(recipe);
  if (eligibility.status !== 'eligible') return { status: eligibility.status === 'incomplete' ? 'incomplete' : 'incompatible' };
  const next = projectSelection(plan, current.variant, current.index, recipe);
  return next.status === 'ready' ? installInstances(plan, next.variant) : next;
}

export function addMeal(plan: ActivePlanEnvelope, baseline: PlanProjection, target: EmptyMealTarget, recipeId: string, newId: string): MealEditResult {
  const current = resolveSelection(plan, baseline, target);
  if (!current || plan.schemaVersion !== EDITED_PLAN_SCHEMA_VERSION) return { status: 'stale' };
  const recipe = plan.inputs.catalog.recipes.find(row => row.id === recipeId);
  if (!recipe?.slots.includes(target.slot) || plan.variants.some(row => row.instances.some(instance => instance.id === newId))) return { status: 'incompatible' };
  const eligibility = createRecipeEligibility(plan.inputs)(recipe);
  if (eligibility.status !== 'eligible') return { status: eligibility.status === 'incomplete' ? 'incomplete' : 'incompatible' };
  const next = projectSelection(plan, current.variant, current.index, recipe, newInstance(plan, target, recipe, newId));
  if (next.status !== 'ready') return next;
  return {
    status: 'ready',
    plan: { ...plan, variants: plan.variants.map(row => row.id === current.variant.id
      ? { ...row, instances: next.variant.instances, emptySlots: row.emptySlots.filter(slot => !matchesCoordinate(slot, target)) } : row) },
  };
}

export function removeMeal(plan: ActivePlanEnvelope, baseline: PlanProjection, target: MealEditTarget): MealEditResult {
  const current = resolveTarget(plan, baseline, target);
  if (!current) return { status: 'stale' };
  const remaining = current.variant.instances.filter((_, index) => index !== current.index);
  const result = projectPlan(plan.inputs, { ...current.variant, instances: remaining });
  if (result.status === 'invalid') return { status: 'incomplete' };
  if (!result.projection.budget.check.accepted && !budgetImproves(result.projection, baseline)) return { status: 'over-budget' };
  const emptySlots = planCoordinates(plan.inputs.dates).filter(({ date, slot }) =>
    !remaining.some(instance => instance.date === date && instance.slot === slot));
  const variants = plan.schemaVersion === EDITED_PLAN_SCHEMA_VERSION ? plan.variants
    : plan.variants.map(variant => ({ ...variant, emptySlots: [] }));
  return {
    status: 'ready',
    plan: { ...plan, schemaVersion: EDITED_PLAN_SCHEMA_VERSION, variants: variants.map(variant =>
      variant.id === current.variant.id ? { ...variant, instances: remaining, emptySlots } : variant) },
  };
}

export async function listMealAlternatives(plan: ActivePlanEnvelope, baseline: PlanProjection, target: MealSelectionTarget, { signal, isCurrent, yieldControl = yieldMacroTask }: MealSearchOptions = {}): Promise<MealAlternativesResult> {
  function interrupted(): 'cancelled' | 'stale' | null {
    return signal?.aborted ? 'cancelled' : isCurrent && !isCurrent() ? 'stale' : null;
  }
  const initial = interrupted();
  if (initial) return { status: initial };
  const current = resolveSelection(plan, baseline, target);
  if (!current) return { status: 'stale' };
  const emptyTarget = 'kind' in target ? target : null;
  const previewId = emptyTarget ? freeMealId(plan, 'preview') : null;
  const evaluate = createRecipeEligibility(plan.inputs);
  const admitted: MealAlternative[] = [];
  let overBudget = false, incomplete = false;
  let attempted = 0;
  for (const recipe of plan.inputs.catalog.recipes) {
    if ((!('kind' in target) && recipe.id === target.recipeId) || !recipe.slots.includes(target.slot)) continue;
    if (attempted > 0 && attempted % alternativesBatchSize === 0) {
      await yieldControl();
      const stopped = interrupted();
      if (stopped) return { status: stopped };
    }
    attempted++;
    const eligibility = evaluate(recipe);
    if (eligibility.status === 'rejected') continue;
    if (eligibility.status === 'incomplete') { incomplete = true; continue; }
    const extra = emptyTarget && previewId ? newInstance(plan, emptyTarget, recipe, previewId) : undefined;
    const candidate = projectSelection(plan, current.variant, current.index, recipe, extra);
    if (candidate.status !== 'ready') {
      overBudget ||= candidate.status === 'over-budget';
      incomplete ||= candidate.status === 'incomplete';
      continue;
    }
    admitted.push({
      recipeId: recipe.id, name: recipe.name, cookingMinutes: recipe.cookingMinutes,
      purchaseDelta: subtract(candidate.projection.costs.exact.purchase, baseline.costs.exact.purchase),
      purchaseDeltaKopecks: candidate.projection.costs.kopecks.purchase - baseline.costs.kopecks.purchase,
      familyCalorieDelta: current.row ? subtract(candidate.meal.familyNutrition.calories, current.row.familyNutrition.calories) : candidate.meal.familyNutrition.calories,
    });
  }
  const stopped = interrupted();
  if (stopped) return { status: stopped };
  admitted.sort((left, right) => compare(left.purchaseDelta, right.purchaseDelta) || (left.recipeId < right.recipeId ? -1 : left.recipeId === right.recipeId ? 0 : 1));
  return { status: 'ready', options: admitted.slice(0, 5), overBudget, incomplete };
}
