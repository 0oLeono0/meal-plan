import { calendarDates, planCoordinates } from './plan';
import type { InstanceProjection } from './planProjection';
import { formatCurrency, formatNutrition } from './presentation';
import { divide, formatExact, roundHalfUp } from './quantities';

export type MenuMode = 'day' | 'week';
export interface MenuView { readonly mode: MenuMode; readonly day: string | null }
/** Presentation only: date membership comes from the applied period, never elapsed milliseconds. */
export function resolveMenuView(search: string, dates: readonly string[], today: string): MenuView {
  const fallback: MenuView = { mode: 'day', day: dates.includes(today) ? today : dates[0] ?? null };
  try {
    if (search.length > 1024) return fallback;
    decodeURIComponent(search.replace(/\+/g, ' '));
    const params = new URLSearchParams(search), keys = [...params.keys()];
    if (new Set(keys).size !== keys.length || keys.some(key => key !== 'view' && key !== 'day')) return fallback;
    const mode = params.get('view') ?? 'day', day = params.get('day');
    if (mode !== 'day' && mode !== 'week') return fallback;
    if (day !== null) calendarDates(day, 1);
    return { mode, day: day !== null && dates.includes(day) ? day : fallback.day };
  } catch { return fallback; }
}
export function menuSearch(view: MenuView): string {
  const params = new URLSearchParams({ view: view.mode });
  if (view.day !== null) params.set('day', view.day);
  return params.toString();
}
export function menuDaySlots(date: string, instances: readonly InstanceProjection[]) {
  return planCoordinates([date]).map(({ slot }) => ({ slot, row: instances.find(item => item.instance.date === date && item.instance.slot === slot) ?? null }));
}
export function presentMealCard(row: InstanceProjection) {
  return { nutrition: formatNutrition(row.perPortionNutrition), price: formatCurrency(roundHalfUp(divide(row.ingredientCost, row.instance.selectedServings), 2)),
    servings: formatExact(row.instance.selectedServings), usesPantry: row.ingredients.some(item => item.covered.amount.numerator > 0n) };
}
