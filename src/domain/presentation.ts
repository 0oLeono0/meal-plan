import { nutrientKeys } from './catalog';
import type { MealSlot, Nutrition, NutrientKey } from './catalog';
import type { AppliedSettings } from './appliedSettings';
import { calendarDates } from './plan';
import type { PlanProjection, ProjectionRow } from './planProjection';
import { compare, decimal, divide, formatExact, multiply, roundHalfUp, subtract } from './quantities';
import type { Quantity, Rational } from './quantities';

const integers = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });
function fixed(value: Rational, places: number): string {
  const rounded = roundHalfUp(value, places), magnitude = rounded < 0n ? -rounded : rounded;
  const scale = 10n ** BigInt(places);
  return `${rounded < 0n ? '-' : ''}${integers.format(magnitude / scale)}${places ? `,${String(magnitude % scale).padStart(places, '0')}` : ''}`;
}
/** Only canonical minor units enter currency formatting; never round the total again. */
export function formatCurrency(kopecks: bigint): string {
  const absolute = kopecks < 0n ? -kopecks : kopecks;
  return `${kopecks < 0n ? '-' : ''}${integers.format(absolute / 100n)},${String(absolute % 100n).padStart(2, '0')} ₽`;
}
export function formatNutrition(values: Nutrition): Readonly<Record<NutrientKey, string>> {
  return { calories: fixed(values.calories, 0), protein: fixed(values.protein, 1), fat: fixed(values.fat, 1), carbohydrates: fixed(values.carbohydrates, 1) };
}
export function formatQuantity(quantity: Quantity): string {
  const units = { g: 'г', kg: 'кг', ml: 'мл', l: 'л', pcs: 'шт.' };
  return `${formatExact(quantity.amount).replace('.', ',')} ${units[quantity.unit]}`;
}
const forms = { day: ['день', 'дня', 'дней'], person: ['человек', 'человека', 'человек'], item: ['товар', 'товара', 'товаров'], instance: ['блюдо', 'блюда', 'блюд'] } as const;
export function formatCount(count: number, kind: keyof typeof forms): string {
  if (!Number.isSafeInteger(count) || count < 0) throw new RangeError('INVALID_COUNT');
  const last = count % 10, lastTwo = count % 100;
  const form = lastTwo >= 11 && lastTwo <= 14 ? 2 : last === 1 ? 0 : last >= 2 && last <= 4 ? 1 : 2;
  return `${integers.format(count)} ${forms[kind][form]}`;
}
const dates = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
/** UTC only formats an already-local calendar date; the user's instant is never reinterpreted. */
export function formatDateOnly(date: string): string {
  calendarDates(date, 1);
  return dates.format(new Date(`${date}T00:00:00Z`));
}
export interface TargetMetric {
  readonly actual: Rational; readonly target: Rational; readonly delta: Rational; readonly ratio: Rational | null;
  readonly warning: boolean; readonly label: string;
}
export type TargetComparison = { readonly status: 'absent' }
  | { readonly status: 'known'; readonly basis: 'person-day'; readonly metrics: Readonly<Record<NutrientKey, TargetMetric>> };
export function compareNutritionTarget(actual: Nutrition, target: AppliedSettings['target']): TargetComparison {
  if (target.status === 'absent') return { status: 'absent' };
  const metrics = {} as Record<NutrientKey, TargetMetric>;
  for (const key of nutrientKeys) {
    const value = actual[key], goal = target.values[key];
    if (compare(value, decimal('0')) < 0 || compare(goal, decimal('0')) < 0) throw new RangeError('INVALID_TARGET_COMPARISON');
    const places = key === 'calories' ? 0 : 1;
    metrics[key] = { actual: value, target: goal, delta: subtract(value, goal), ratio: goal.numerator === 0n ? null : divide(value, goal),
      warning: compare(value, multiply(goal, decimal('1.1'))) > 0, label: `${fixed(value, places)} из ${fixed(goal, places)}` };
  }
  return { status: 'known', basis: 'person-day', metrics };
}
const slots: Record<MealSlot, string> = { breakfast: 'Завтрак', lunch: 'Обед', dinner: 'Ужин', snack: 'Перекус' };
function presentRow(row: ProjectionRow) {
  return { productId: row.productId, profileId: row.profileId, name: row.name, category: row.category,
    required: formatQuantity(row.required), covered: formatQuantity(row.covered), purchase: formatQuantity(row.purchase),
    ingredientCost: formatCurrency(row.costs.kopecks.ingredient), purchaseCost: formatCurrency(row.costs.kopecks.purchase), coveredCost: formatCurrency(row.costs.kopecks.covered),
    sourceCount: formatCount(new Set(row.sources.map(source => source.instanceId)).size, 'instance'),
    sources: row.sources.map(source => ({ instanceId: source.instanceId, recipeId: source.recipeId, date: formatDateOnly(source.date), slot: slots[source.slot], quantity: formatQuantity(source.quantity) })),
    priceSource: { sourceId: row.price.source.sourceId, recordId: row.price.source.recordId, url: row.price.source.url,
      region: row.price.region, observedAt: formatDateOnly(row.price.observedAt), estimate: row.price.estimate } };
}
/** Shared menu/shopping selector: no inventory arithmetic or invented nutrition/source facts. */
export function selectPlanPresentation(value: PlanProjection, target: AppliedSettings['target']) {
  const categories = [...new Set(value.purchases.map(row => row.category))];
  return { variantId: value.variantId, people: formatCount(value.people, 'person'), period: formatCount(value.dates.length, 'day'),
    itemCount: formatCount(value.purchases.length, 'item'), instanceCount: formatCount(value.instances.length, 'instance'),
    nutritionBasis: 'На одного человека в день', budgetBasis: 'Оценка дополнительных покупок всей семьи за выбранные дни',
    estimateLabel: 'Цены ориентировочные', coveredLabel: 'Уже есть дома',
    costs: { ingredient: formatCurrency(value.costs.kopecks.ingredient), purchase: formatCurrency(value.costs.kopecks.purchase), covered: formatCurrency(value.costs.kopecks.covered),
      remaining: formatCurrency(value.budget.remainingKopecks), limit: formatCurrency(value.budget.limitKopecks) },
    budgetCheck: value.budget.check, familyNutrition: formatNutrition(value.familyNutrition), averagePersonDayNutrition: formatNutrition(value.averagePersonDayNutrition),
    targetComparison: compareNutritionTarget(value.averagePersonDayNutrition, target),
    days: value.days.map(day => ({ date: formatDateOnly(day.date), dateOnly: day.date, personNutrition: formatNutrition(day.personNutrition), familyNutrition: formatNutrition(day.familyNutrition),
      ingredientCost: formatCurrency(roundHalfUp(day.ingredientCost, 2)), costBasis: 'Полная стоимость ингредиентов семьи за день', targetComparison: compareNutritionTarget(day.personNutrition, target) })),
    purchases: value.purchases.map(presentRow), covered: value.covered.map(presentRow),
    categories: categories.map(category => ({ category, rows: value.purchases.filter(row => row.category === category).map(presentRow) })),
    pantryIssues: value.pantryIssues.map(issue => ({ ...issue, message: issue.code === 'UNKNOWN_PANTRY_QUANTITY' ? 'Количество дома неизвестно — запас не уменьшает покупки' : 'Единица запаса несовместима с потребностью — запас не уменьшает покупки' })),
  };
}
