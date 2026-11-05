import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router';
import type { CatalogLoadResult } from '../../domain/catalog';
import type { GenerationSnapshot } from '../generation/controller';
import { projectRecipeView } from '../../domain/recipeView';
import type { NutritionFact } from '../../domain/recipeView';
import { formatCurrency, formatDateOnly, formatNutrition, formatQuantity } from '../../domain/presentation';
import { formatExact, roundHalfUp } from '../../domain/quantities';
import { Button, Status } from '../../shared/ui';

const notices = {
  error: ['Не удалось загрузить рецепт', 'Не удалось загрузить рецепт. Повторите загрузку или вернитесь к меню'],
  incomplete: ['Не удалось показать состав рецепта', 'В данных рецепта не хватает обязательной информации. Повторите загрузку или вернитесь к меню'],
  notfound: ['Такого рецепта нет', 'Проверьте ссылку или выберите блюдо в меню'],
  stale: ['Этот рецепт больше не связан с текущим меню', 'Вариант или блюдо по этой ссылке недоступны. Откройте рецепт из актуального меню'],
} as const;
const slotNames = { breakfast: 'Завтрак', lunch: 'Обед', dinner: 'Ужин', snack: 'Перекус' };
function NutritionValues({ fact }: { fact: NutritionFact }) {
  const values = fact.status === 'known' ? formatNutrition(fact.value) : null;
  return <>{(['calories', 'protein', 'fat', 'carbohydrates'] as const).map((key, index) => <div key={key} className="min-w-0"><dt>{['Калории', 'Белки', 'Жиры', 'Углеводы'][index]}</dt><dd className="tabular-nums">{values ? `${values[key]} ${key === 'calories' ? 'ккал' : 'г'}` : 'Нет данных'}</dd></div>)}</>;
}
export function RecipePage({ snapshot, catalog, onRetry }: { snapshot: GenerationSnapshot; catalog: CatalogLoadResult | null; onRetry(): Promise<unknown> }) {
  const { pathname, search } = useLocation();
  const [retrying, setRetrying] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const view = projectRecipeView({ pathname, search, active: snapshot.active, loadStatus: snapshot.loadStatus, catalog });
  useEffect(() => { heading.current?.focus(); }, [pathname, search, view.status]);
  if (view.status === 'pending' || retrying) return <section aria-busy="true"><h1 ref={heading} tabIndex={-1}>Рецепт</h1><Status>Загружаем рецепт…</Status></section>;
  if (view.status !== 'direct' && view.status !== 'context') return <section className="[overflow-wrap:anywhere]">
    <h1 ref={heading} tabIndex={-1}>{notices[view.status][0]}</h1><p>{notices[view.status][1]}</p>
    {(view.status === 'error' || view.status === 'incomplete') && <Button disabled={retrying} onClick={() => { setRetrying(true); void onRetry().finally(() => setRetrying(false)); }}>Повторить загрузку</Button>}
    <Link className="action-link" to={view.status === 'stale' ? '/menu' : view.returnTo}>{view.status === 'stale' ? 'К актуальному меню' : 'К меню'}</Link>
  </section>;
  return <section className="plan-read-model [overflow-wrap:anywhere]" data-instance-id={view.instance?.id}>
    <Link className="action-link" to={view.returnTo}>К меню</Link>
    <h1 ref={heading} tabIndex={-1}>{view.recipe.name}</h1>
    {view.instance && <p>{formatDateOnly(view.instance.date)} · {slotNames[view.instance.slot]}</p>}
    <div className="aspect-[4/3] w-full max-w-xl rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center" role="img" aria-label="Фото недоступно"><span>Фото недоступно</span></div>
    <p>{view.status === 'context' ? `Порций для семьи: ${formatExact(view.servings)}` : `Исходный рецепт · ${formatExact(view.servings)} порции`}</p>
    <p>Ингредиенты указаны на {formatExact(view.servings)} порции. КБЖУ и цена — на одну порцию</p>
    <p>Время приготовления: {view.recipe.cookingMinutes} мин</p>
    <section className="card" aria-label="На одну порцию"><h2>На одну порцию</h2><dl className="grid grid-cols-2 sm:grid-cols-5 gap-4"><NutritionValues fact={view.perPortionNutrition} /><div><dt>Цена</dt><dd>{view.perPortionCost === null ? 'Нет данных' : `≈ ${formatCurrency(roundHalfUp(view.perPortionCost, 2))}`}</dd></div></dl></section>
    <section className="card"><h2>Ингредиенты на {formatExact(view.servings)} порции</h2><p>Полная стоимость ингредиентов до вычета запасов</p><ul className="space-y-4">
      {view.ingredients.map(row => <li key={row.index}><h3 className="font-semibold">{row.food.name}</h3><p>{formatQuantity(row.required)} · {row.familyCost === null ? 'Цена неизвестна' : `≈ ${formatCurrency(roundHalfUp(row.familyCost, 2))}`}</p></li>)}
    </ul></section>
    <details className="card"><summary className="min-h-[44px] py-2 cursor-pointer">Состав — КБЖУ каждого ингредиента на одну порцию</summary><ul className="space-y-4">{view.ingredients.map(row => <li key={row.index}><h3>{row.food.name}</h3><dl className="grid grid-cols-2 sm:grid-cols-4 gap-4"><NutritionValues fact={row.perPortionNutrition} /></dl></li>)}</ul></details>
    <section className="card"><h2>Приготовление</h2><ol aria-label="Шаги приготовления" className="list-decimal pl-6 space-y-4 leading-relaxed">{view.recipe.steps.map((step, index) => <li key={index}>{step}</li>)}</ol></section>
    <details className="card"><summary className="min-h-[44px] py-2 cursor-pointer">Источники данных</summary><p>Версия каталога: {view.catalogVersion}</p><p>Рецепт: {view.recipe.source.sourceId} · {view.recipe.source.recordId} · {view.recipe.source.release}</p>
      <ul>{view.ingredients.map(row => <li key={row.index}>{row.food.name}: {row.food.nutrition.status === 'known' ? `КБЖУ — ${row.food.nutrition.source.sourceId}, ${row.food.nutrition.source.recordId}, ${row.food.nutrition.source.release}` : 'КБЖУ — нет данных'}; {row.food.price.status === 'known' ? `цена — ${row.food.price.source.sourceId}, ${row.food.price.region}, ${formatDateOnly(row.food.price.observedAt)}` : 'цена — нет данных'}</li>)}</ul>
    </details>
    <p>Цены ориентировочные, проверяйте в магазине</p><p>Текущий каталог ограничен растительными рецептами. Расчёт не подтверждает полноценность рациона</p><p>КБЖУ рассчитаны по составу продуктов и не являются медицинской рекомендацией</p>
  </section>;
}
