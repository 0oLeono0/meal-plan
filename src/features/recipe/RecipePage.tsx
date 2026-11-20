import { useEffect, useMemo, useRef, useState } from 'react';
import { RecipeImage } from '../../shared/RecipeImage';
import { CalculationNote } from '../../shared/CalculationNote';
import { Link, useLocation } from 'react-router';
import type { CatalogLoadResult } from '../../domain/catalog';
import { mealPortionMultipliers } from '../../domain/mealEdits';
import type { MealEditTarget, MealPortionMultiplier } from '../../domain/mealEdits';
import type { ActivePlanEnvelope } from '../../domain/plan';
import type { GenerationSnapshot } from '../generation/controller';
import { projectRecipeView } from '../../domain/recipeView';
import type { NutritionFact, RecipeView } from '../../domain/recipeView';
import { formatCurrency, formatDateOnly, formatNutrition, formatQuantity } from '../../domain/presentation';
import { add, compare, decimal, divide, formatExact, roundHalfUp, type Rational } from '../../domain/quantities';
import { Button, Status } from '../../shared/ui';
import { PlanLoading } from '../plan/PlanLoading';

const notices = {
  error: ['Не удалось загрузить рецепт', 'Не удалось загрузить рецепт. Повторите загрузку или вернитесь к меню'],
  incomplete: ['Не удалось показать состав рецепта', 'В данных рецепта не хватает обязательной информации. Повторите загрузку или вернитесь к меню'],
  notfound: ['Такого рецепта нет', 'Проверьте ссылку или выберите блюдо в меню'],
  stale: ['Этот рецепт больше не связан с текущим меню', 'Вариант или блюдо по этой ссылке недоступны. Откройте рецепт из актуального меню'],
} as const;
const slotNames = { breakfast: 'Завтрак', lunch: 'Обед', dinner: 'Ужин', snack: 'Перекус' };
const ruNumber = (value: Rational) => formatExact(value).replace('.', ',');
const countForPortions = (servings: Rational, unitsPerPortion: bigint) => (servings.numerator * unitsPerPortion + servings.denominator - 1n) / servings.denominator;
const smallPieces: Readonly<Partial<Record<string, { label: string; perPortion: bigint; batches: string }>>> = {
  'familiar-syrniki': { label: 'сырников', perPortion: 4n, batches: 'Сохраняйте толщину около 1 см. Жарьте в один слой, при необходимости в несколько партий. Распределите масло между партиями.' },
  'familiar-chickpea-pancakes': { label: 'оладий', perPortion: 4n, batches: 'Сохраняйте толщину около 5 мм. Жарьте до 4 оладий за партию, если они свободно помещаются. Распределите масло между партиями.' },
  'familiar-lazy-cabbage-rolls': { label: 'голубцов', perPortion: 4n, batches: 'Уложите голубцы в один слой. Если они не помещаются, готовьте партиями и распределите соус между ними.' },
  'familiar-turkey-balls-buckwheat': { label: 'тефтелей', perPortion: 5n, batches: 'Готовьте тефтели в один слой. Если они не помещаются, разделите их и соус на партии.' },
};
function scaledCookingGuidance({ recipe, servings, ingredients }: RecipeView): string | null {
  if (recipe.id === 'familiar-steamed-egg-pudding') {
    const mass = ingredients.reduce((total, row) => add(total, row.required.amount), decimal('0'));
    return `Замесите всю смесь по списку ингредиентов (${ruNumber(mass)} г). Формочки по 200 мл. Всего формочек: ${countForPortions(servings, 1n)}. На полную порцию нужна одна формочка. Если есть неполная порция, налейте её в отдельную формочку. Готовьте партиями, если все формочки не помещаются на паровую вставку. Воду наливайте ниже дна вставки.`;
  }
  if (recipe.id === 'familiar-oat-pancake-yogurt') {
    return `Всего блинов: ${countForPortions(servings, 1n)}. На полную порцию готовьте один блин из теста на одну порцию, с 4 г масла. Жарьте по одному тонкому блину за партию. Неполную порцию жарьте отдельно с пропорциональным количеством масла. Распределите йогурт и яблоко поровну между полными порциями, оставив соответствующую долю для неполной.`;
  }
  if (recipe.id === 'familiar-cottage-apple-bake') return 'Распределите всю массу по формам слоем не толще 3 см. Если для одной формы смеси мало, возьмите меньшую форму. Если форм больше, чем помещается в духовку, выпекайте партиями.';
  if (recipe.id === 'familiar-baked-apple-oats') return 'Разложите половинки яблок срезом вверх в один слой. При необходимости возьмите несколько форм и запекайте партиями. Воду со дна и крошку распределите между формами пропорционально количеству яблок.';
  const pieces = Object.prototype.hasOwnProperty.call(smallPieces, recipe.id) ? smallPieces[recipe.id] : undefined;
  if (!pieces) return null;
  const count = countForPortions(servings, pieces.perPortion);
  const partial = (servings.numerator * pieces.perPortion) % servings.denominator !== 0n;
  return `Всего ${pieces.label}: ${count}. На каждую полную порцию приходится ${pieces.perPortion}. ${partial ? 'Последнюю заготовку сделайте меньше, сохранив толщину. ' : ''}${pieces.batches}`;
}
function NutritionValues({ fact }: { fact: NutritionFact }) {
  const values = fact.status === 'known' ? formatNutrition(fact.value) : null;
  return <>{(['calories', 'protein', 'fat', 'carbohydrates'] as const).map((key, index) => <div key={key} className="min-w-0"><dt>{['Калории', 'Белки', 'Жиры', 'Углеводы'][index]}</dt><dd className="tabular-nums">{values ? `${values[key]} ${key === 'calories' ? 'ккал' : 'г'}` : 'Нет подтверждённых данных'}</dd></div>)}</>;
}
export function RecipePage({ snapshot, catalog, onRetry, onChangePortions, onRetrySave }: {
  snapshot: GenerationSnapshot;
  catalog: CatalogLoadResult | null;
  onRetry(source: 'plan' | 'catalog'): Promise<unknown>;
  onChangePortions(target: MealEditTarget, multiplier: MealPortionMultiplier, expectedPlan: ActivePlanEnvelope, returnRoute: string): void;
  onRetrySave(): void;
}) {
  const { pathname, search } = useLocation();
  const [retrying, setRetrying] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const view = useMemo(() => projectRecipeView({ pathname, search, active: snapshot.active, loadStatus: snapshot.loadStatus, catalog }), [pathname, search, snapshot.active, snapshot.loadStatus, catalog]);
  useEffect(() => { if (!retrying) heading.current?.focus(); }, [pathname, search, view.status, retrying]);
  if (view.status === 'pending' || retrying) return <PlanLoading kind="recipe" />;
  if (view.status !== 'direct' && view.status !== 'context') return <section className="[overflow-wrap:anywhere]">
    <h1 ref={heading} tabIndex={-1}>{notices[view.status][0]}</h1><p>{notices[view.status][1]}</p>
    {(view.status === 'error' || view.status === 'incomplete') && <Button disabled={retrying} onClick={() => { setRetrying(true); void onRetry(view.retry ?? 'catalog').catch(() => undefined).finally(() => setRetrying(false)); }}>Повторить загрузку</Button>}
    <Link className="action-link" to={view.status === 'stale' ? '/menu' : view.returnTo}>{view.status === 'stale' ? 'К актуальному меню' : 'К меню'}</Link>
  </section>;
  const scaled = compare(view.servings, view.recipe.baseServings) !== 0;
  const cookingGuidance = scaled ? scaledCookingGuidance(view) : null;
  const plan = snapshot.active?.plan;
  const context = view.instance;
  const route = pathname + search;
  const busy = snapshot.status === 'saving' || snapshot.status === 'pending';
  const portionEdit = snapshot.intent === 'edit' && snapshot.origin?.focusAnchor === 'recipe-portions' && snapshot.origin.returnRoute === route;
  return <section className="plan-read-model [overflow-wrap:anywhere] max-w-[960px] mx-auto" data-instance-id={view.instance?.id}>
    <Link className="action-link" to={view.returnTo}>К меню</Link>
    <div className="recipe-hero grid md:grid-cols-2 gap-6 items-start">
    <RecipeImage catalogVersion={view.catalogVersion} recipeId={view.recipe.id} name={view.recipe.name} priority />
    <header className="min-w-0">
    <h1 ref={heading} tabIndex={-1}>{view.recipe.name}</h1>
    {view.instance && <p>{formatDateOnly(view.instance.date)} · {slotNames[view.instance.slot]}</p>}
    <p>{view.status === 'context' ? `Порций для семьи: ${ruNumber(view.servings)}` : `Исходный рецепт · ${view.servingsLabel}`}</p>
    <p>{view.ingredientBasis}. КБЖУ и цена — на одну порцию</p>
    <p>Время приготовления: {view.recipe.cookingMinutes} мин</p>
    {plan && context && <>
      <div id="recipe-portions" role="group" aria-label="Порции для семьи" className="flex flex-wrap gap-2">
        {mealPortionMultipliers.map(multiplier => {
          const label = `×${multiplier.replace('.', ',')}`;
          return <Button key={multiplier}
            aria-label={`${label} от исходных порций для семьи`}
            aria-pressed={view.portionMultiplier === multiplier}
            aria-disabled={busy}
            className="aria-pressed:!text-[var(--color-text)] aria-disabled:opacity-60"
            onClick={() => {
              if (busy) return;
              onChangePortions({ variantId: plan.activeVariantId, date: context.date, slot: context.slot, instanceId: context.id, recipeId: context.recipeId },
                multiplier, plan, route);
            }}>{label}</Button>;
        })}
      </div>
      {portionEdit && snapshot.status === 'saving' && <Status>Сохраняем изменения меню…</Status>}
      {portionEdit && snapshot.status === 'succeeded' && <Status>Изменения сохранены</Status>}
      {portionEdit && snapshot.status === 'error' && <p className="field-error" role="alert">{snapshot.error?.message}</p>}
      {portionEdit && snapshot.status === 'memory-only' && <div role="alert">
        <p>{snapshot.saveError === 'blocked' ? 'Меню изменилось. Обновите его перед новой правкой' : 'Не удалось сохранить изменения. Восстановлено прежнее меню'}</p>
        {snapshot.saveError === 'blocked'
          ? <Button onClick={() => { void onRetry('plan'); }}>Обновить меню</Button>
          : <Button onClick={onRetrySave}>Повторить сохранение</Button>}
      </div>}
    </>}
    </header></div>
    <section className="card" aria-label="На одну порцию"><h2>На одну порцию</h2><dl className="grid grid-cols-2 sm:grid-cols-4 gap-4"><NutritionValues fact={view.perPortionNutrition} /><div className="col-span-2 sm:col-span-4"><dt>Цена</dt><dd>{view.perPortionCost === null ? 'Нет подтверждённых данных' : `≈ ${formatCurrency(roundHalfUp(view.perPortionCost, 2))}`}</dd></div></dl></section>
    <CalculationNote />
    <details className="card"><summary className="min-h-[44px] py-2 cursor-pointer">Состав — КБЖУ каждого ингредиента на одну порцию</summary><ul className="space-y-4">{view.ingredients.map(row => <li key={row.index}><h3>{row.food.name}</h3><dl className="grid grid-cols-2 sm:grid-cols-4 gap-4"><NutritionValues fact={row.perPortionNutrition} /></dl></li>)}</ul></details>
    <section className="card"><h2>{view.ingredientBasis}</h2><p>Полная стоимость ингредиентов до вычета запасов</p><ul className="space-y-4">
      {view.ingredients.map(row => <li key={row.index}><h3 className="font-semibold">{row.food.name}</h3><p>{formatQuantity(row.required)} · {row.familyCost === null ? 'Цена неизвестна' : `≈ ${formatCurrency(roundHalfUp(row.familyCost, 2))}`}</p>
        {row.stock && <div>{row.stock.issue ? <p>{row.stock.issue === 'UNKNOWN_PANTRY_QUANTITY' ? 'Количество запаса не указано — запас не вычтен' : 'Единицы запаса и потребности несовместимы — запас не вычтен'}</p>
          : row.stock.covered.amount.numerator > 0n ? row.stock.purchase.amount.numerator === 0n ? <p>Есть дома: {formatQuantity(row.stock.covered)}</p> : <p>Частично из запасов</p> : <p>Нет количественного покрытия запасами</p>}
          <p>Нужно {formatQuantity(row.required)} · Из запасов {formatQuantity(row.stock.covered)} · Докупить {formatQuantity(row.stock.purchase)}</p></div>}
      </li>)}
    </ul></section>
    <section className="card"><h2>Приготовление</h2>
      {scaled && <div role="note" aria-label="Пересчёт шагов" className="notice">
        <p>Исходные шаги рассчитаны на {ruNumber(view.recipe.baseServings)} порции. Выбрано порций: {ruNumber(view.servings)}. В составе выше количества для выбранных порций. Количества продуктов и воды в шагах умножьте на {ruNumber(divide(view.servings, view.recipe.baseServings))} для общей закладки. Количества на одну порцию, толщину и температуру сохраняйте. Время приготовления зависит от готовности блюда.</p>
        {cookingGuidance
          ? <p><strong>Для выбранного числа порций:</strong> {cookingGuidance}</p>
          : <p>Если в шагах указано общее число заготовок, пересчитайте его в той же пропорции. Делите готовое блюдо на выбранное число порций. Если продукты не помещаются в посуду при исходной толщине слоя, готовьте партиями.</p>}
      </div>}
      {scaled && <h3 className="mt-4">Исходные шаги рецепта</h3>}
      <ol aria-label="Шаги приготовления" className="list-decimal pl-6 space-y-4 leading-relaxed">{view.recipe.steps.map((step, index) => <li key={index}>{step}</li>)}</ol>
    </section>
    <p>Расчёт не подтверждает полноценность рациона</p><p>КБЖУ рассчитаны по составу продуктов и не являются медицинской рекомендацией</p>
  </section>;
}
