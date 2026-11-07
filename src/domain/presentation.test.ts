import { describe, expect, it } from 'vitest';
import { buildAppliedSettings } from './appliedSettings';
import type { AppliedSettings } from './appliedSettings';
import type { FoodProfile, Nutrition, Recipe } from './catalog';
import { createPlanInputs } from './plan';
import { checkPurchaseBudget, projectPlan } from './planProjection';
import { decimal, rational } from './quantities';
import { createDraft } from './settings';
import * as presentation from './presentation';

const nutrition = (calories: string, protein = '0', fat = '0', carbohydrates = '0'): Nutrition => ({ calories: decimal(calories), protein: decimal(protein), fat: decimal(fat), carbohydrates: decimal(carbohydrates) });
const source = { sourceId: 'synthetic-price', recordId: 'synthetic-test', release: 'v1', license: 'CC0-1.0', url: 'https://example.org/synthetic' };
// Synthetic 1g foods only verify arithmetic; these fixtures make no production/source-readiness claim.
function projected(price = '0.005', budget = '500', secondPrice = price) {
  const draft = createDraft(); draft.days = '1'; draft.people = '1'; draft.budget = budget;
  const applied = buildAppliedSettings(draft); if (applied.status !== 'applied') throw new Error('Invalid fixture');
  const foods: FoodProfile[] = ['a', 'b'].map(id => ({ productId: id, profileId: id, name: id, identity: id, state: 'raw', category: 'Тестовая категория',
    nutrition: { status: 'known', reference: { amount: '1', unit: 'g', basis: 'edible' }, values: { calories: '5.5', protein: '0.05', fat: '0', carbohydrates: '0' }, source },
    price: { status: 'known', amount: id === 'a' ? price : secondPrice, currency: 'RUB', reference: { amount: '1', unit: 'g', basis: 'edible' }, source, region: 'Синтетический регион', observedAt: '2026-10-01', estimate: true },
    safety: { status: 'unknown', reason: 'Test only' }, conversions: [] }));
  const recipe: Recipe = { id: 'test', name: 'test', baseServings: decimal('1'), ingredients: foods.map(food => ({ productId: food.productId, profileId: food.profileId, quantity: { amount: decimal('1'), unit: 'g' } })), slots: ['breakfast'], cookingMinutes: 1, steps: ['Test'], source };
  const inputs = createPlanInputs(applied.settings, { version: 'test', foods, recipes: [recipe] }, { seed: 'test', now: () => new Date(2026, 9, 27) });
  const result = projectPlan(inputs, { id: 'test', instances: [{ id: 'instance', date: '2026-10-27', slot: 'breakfast', recipeId: 'test', catalogVersion: 'test', recipeSnapshot: recipe, selectedServings: decimal('1') }] });
  if (result.status !== 'projected') throw new Error('Invalid projection');
  return result.projection;
}
describe('canonical Russian plan presentation', () => {
  it('formats Russian variants and servings without throwing for supported cardinalities', () => {
    // New public count kinds: buildable RED against the previous union, runtime assertions stay real.
    expect(() => presentation.formatCount(1, 'variant' as 'day')).not.toThrow();
    expect([1, 2, 5, 11, 21].map(count => presentation.formatCount(count, 'variant' as 'day'))).toEqual(['1 вариант', '2 варианта', '5 вариантов', '11 вариантов', '21 вариант']);
    expect([1, 2, 5].map(count => presentation.formatCount(count, 'serving' as 'day'))).toEqual(['1 порция', '2 порции', '5 порций']);
  });
  it('formats canonical kopecks with one currency symbol', () => {
    expect(presentation.formatCurrency(123456n)).toBe('1 234,56 ₽');
    expect(presentation.formatCurrency(-1n)).toBe('-0,01 ₽');
    expect(presentation.formatCurrency(0n)).toBe('0,00 ₽');
    expect(presentation.formatCurrency(900719925474099301n)).toBe('9 007 199 254 740 993,01 ₽');
  });
  it('rounds kcal whole and each macro to one decimal half-up without changing exact values', () => {
    expect(presentation.formatNutrition(nutrition('120.5', '10.05', '4.04', '11.15'))).toEqual({ calories: '121', protein: '10,1', fat: '4,0', carbohydrates: '11,2' });
    expect(presentation.formatQuantity({ amount: rational(1n, 3n), unit: 'g' })).toBe('1/3 г');
    expect(presentation.formatQuantity({ amount: decimal('0.00001'), unit: 'kg' })).toBe('0,00001 кг');
  });
  it.each([
    [0, '0 дней', '0 человек', '0 товаров', '0 блюд'], [1, '1 день', '1 человек', '1 товар', '1 блюдо'],
    [2, '2 дня', '2 человека', '2 товара', '2 блюда'], [5, '5 дней', '5 человек', '5 товаров', '5 блюд'],
    [11, '11 дней', '11 человек', '11 товаров', '11 блюд'], [21, '21 день', '21 человек', '21 товар', '21 блюдо'],
  ])('uses Russian count forms for %i', (count, days, people, items, instances) => {
    expect(presentation.formatCount(count as number, 'day')).toBe(days);
    expect(presentation.formatCount(count as number, 'person')).toBe(people);
    expect(presentation.formatCount(count as number, 'item')).toBe(items);
    expect(presentation.formatCount(count as number, 'instance')).toBe(instances);
  });
  it('sums half-up product rows: two raw 0.005 RUB rows display 0.02', () => {
    const value = projected();
    expect(value.costs.exact.purchase).toEqual(decimal('0.01'));
    expect(value.costs.kopecks.purchase).toBe(2n);
    const menu = presentation.selectPlanPresentation(value, { status: 'absent' });
    const shopping = presentation.selectPlanPresentation(value, { status: 'absent' });
    expect(menu).toEqual(shopping);
    expect(menu.costs).toEqual({ ingredient: '0,02 ₽', purchase: '0,02 ₽', covered: '0,00 ₽', remaining: '499,98 ₽', limit: '500,00 ₽' });
    expect(menu.days[0].ingredientCost).toBe('0,02 ₽');
    expect(menu.itemCount).toBe('2 товара'); expect(menu.instanceCount).toBe('1 блюдо');
    expect(menu.purchases[0].sourceCount).toBe('1 блюдо');
    expect(menu.purchases[0].priceSource).toEqual({ sourceId: 'synthetic-price', recordId: 'synthetic-test', url: source.url, region: 'Синтетический регион', observedAt: '1 октября 2026 г.', estimate: true });
    expect(menu.purchases[0].sources[0]).toMatchObject({ instanceId: 'instance', date: '27 октября 2026 г.', slot: 'Завтрак' });
    expect(menu.budgetBasis).toContain('всей семьи'); expect(menu.days[0].costBasis).toContain('ингредиентов семьи');
  });
  it('rejects exact over-budget amount even when display is equal', () => {
    expect(checkPurchaseBudget(decimal('500'), 50000n, decimal('500')).accepted).toBe(true);
    expect(checkPurchaseBudget(decimal('500.0001'), 50000n, decimal('500'))).toMatchObject({ accepted: false, reason: 'exact-limit-exceeded' });
  });
  it('conservatively rejects rounded rows beyond displayed limit without minimum-budget claim', () => {
    const value = projected('250.005', '500', '249.995');
    expect(value.costs.exact.purchase).toEqual(decimal('500'));
    expect(value.costs.kopecks.purchase).toBe(50001n);
    expect(value.budget.check).toEqual({ accepted: false, exactWithinLimit: true, displayedWithinLimit: false, reason: 'display-rounding-exceeded' });
  });
});
describe('optional unrounded person-day targets', () => {
  const target: AppliedSettings['target'] = { status: 'known', basis: 'person-day', values: nutrition('1000', '0', '10', '100'), source: { kind: 'manual' } };
  it('warns strictly above 110 percent independently for every metric', () => {
    const equal = presentation.compareNutritionTarget(nutrition('1100', '0', '11', '110'), target);
    expect(equal.status).toBe('known');
    if (equal.status !== 'known') throw new Error('Expected target');
    expect(Object.values(equal.metrics).map(metric => metric.warning)).toEqual([false, false, false, false]);
    const above = presentation.compareNutritionTarget(nutrition('1100.01', '0.001', '11.0001', '110.0001'), target);
    if (above.status !== 'known') throw new Error('Expected target');
    expect(Object.values(above.metrics).map(metric => metric.warning)).toEqual([true, true, true, true]);
    expect(above.metrics.calories.ratio).toEqual(decimal('1.10001'));
  });
  it('distinguishes absent targets from explicit zero without a fabricated norm or division', () => {
    expect(presentation.compareNutritionTarget(nutrition('1000'), { status: 'absent' })).toEqual({ status: 'absent' });
    const result = presentation.compareNutritionTarget(nutrition('1000'), target);
    if (result.status !== 'known') throw new Error('Expected target');
    expect(result.metrics.protein).toMatchObject({ ratio: null, warning: false, actual: decimal('0'), target: decimal('0'), label: '0,0 из 0,0' });
  });
  it('rejects invalid date-only and negative count inputs', () => {
    expect(() => presentation.formatDateOnly('2026-02-30')).toThrow();
    expect(() => presentation.formatCount(-1, 'day')).toThrow();
  });
});
