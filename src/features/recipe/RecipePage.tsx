import { useEffect, useMemo, useRef, useState } from 'react';
import { RecipeImage } from '../../shared/RecipeImage';
import { CalculationNote } from '../../shared/CalculationNote';
import { Link, useLocation } from 'react-router';
import type { CatalogLoadResult } from '../../domain/catalog';
import type { GenerationSnapshot } from '../generation/controller';
import { projectRecipeView } from '../../domain/recipeView';
import type { NutritionFact } from '../../domain/recipeView';
import { formatCurrency, formatDateOnly, formatNutrition, formatQuantity } from '../../domain/presentation';
import { compare, divide, formatExact, roundHalfUp } from '../../domain/quantities';
import { Button } from '../../shared/ui';
import { PlanLoading } from '../plan/PlanLoading';

const notices = {
  error: ['Не удалось загрузить рецепт', 'Не удалось загрузить рецепт. Повторите загрузку или вернитесь к меню'],
  incomplete: ['Не удалось показать состав рецепта', 'В данных рецепта не хватает обязательной информации. Повторите загрузку или вернитесь к меню'],
  notfound: ['Такого рецепта нет', 'Проверьте ссылку или выберите блюдо в меню'],
  stale: ['Этот рецепт больше не связан с текущим меню', 'Вариант или блюдо по этой ссылке недоступны. Откройте рецепт из актуального меню'],
} as const;
const slotNames = { breakfast: 'Завтрак', lunch: 'Обед', dinner: 'Ужин', snack: 'Перекус' };
function NutritionValues({ fact }: { fact: NutritionFact }) {
  const values = fact.status === 'known' ? formatNutrition(fact.value) : null;
  return <>{(['calories', 'protein', 'fat', 'carbohydrates'] as const).map((key, index) => <div key={key} className="min-w-0"><dt>{['Калории', 'Белки', 'Жиры', 'Углеводы'][index]}</dt><dd className="tabular-nums">{values ? `${values[key]} ${key === 'calories' ? 'ккал' : 'г'}` : 'Нет подтверждённых данных'}</dd></div>)}</>;
}
export function RecipePage({ snapshot, catalog, onRetry }: { snapshot: GenerationSnapshot; catalog: CatalogLoadResult | null; onRetry(source: 'plan' | 'catalog'): Promise<unknown> }) {
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
  return <section className="plan-read-model [overflow-wrap:anywhere] max-w-[960px] mx-auto" data-instance-id={view.instance?.id}>
    <Link className="action-link" to={view.returnTo}>К меню</Link>
    <div className="recipe-hero grid md:grid-cols-2 gap-6 items-start">
    <RecipeImage catalogVersion={view.catalogVersion} recipeId={view.recipe.id} name={view.recipe.name} priority />
    <header className="min-w-0">
    <h1 ref={heading} tabIndex={-1}>{view.recipe.name}</h1>
    {view.instance && <p>{formatDateOnly(view.instance.date)} · {slotNames[view.instance.slot]}</p>}
    <p>{view.status === 'context' ? `Порций для семьи: ${formatExact(view.servings)}` : `Исходный рецепт · ${view.servingsLabel}`}</p>
    <p>{view.ingredientBasis}. КБЖУ и цена — на одну порцию</p>
    <p>Время приготовления: {view.recipe.cookingMinutes} мин</p>
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
      {compare(view.servings, view.recipe.baseServings) !== 0 && <p role="note" aria-label="Пересчёт шагов" className="notice">
        Исходные шаги рассчитаны на {formatExact(view.recipe.baseServings).replace('.', ',')} порции. Выбрано порций: {formatExact(view.servings).replace('.', ',')}. В составе выше количества для выбранных порций. Количества продуктов и воды в шагах умножьте на {formatExact(divide(view.servings, view.recipe.baseServings)).replace('.', ',')}. Время приготовления зависит от готовности блюда.
      </p>}
      <ol aria-label="Шаги приготовления" className="list-decimal pl-6 space-y-4 leading-relaxed">{view.recipe.steps.map((step, index) => <li key={index}>{step}</li>)}</ol>
    </section>
    <p>Расчёт не подтверждает полноценность рациона</p><p>КБЖУ рассчитаны по составу продуктов и не являются медицинской рекомендацией</p>
  </section>;
}
