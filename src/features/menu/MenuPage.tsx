import { Link } from 'react-router';
import type { GenerationSnapshot } from '../generation/controller';
import { Button, Status } from '../../shared/ui';
import { compareNutritionTarget, formatCount, formatCurrency, formatDateOnly, formatNutrition, formatQuantity, selectPlanPresentation } from '../../domain/presentation';
import type { TargetComparison } from '../../domain/presentation';
import { decimal, divide, formatExact, roundHalfUp } from '../../domain/quantities';
import { localDateOnly } from '../../domain/plan';
import type { Nutrition } from '../../domain/catalog';

const labels = { calories: 'Калории', protein: 'Белки', fat: 'Жиры', carbohydrates: 'Углеводы' } as const;
const slots = { breakfast: 'Завтрак', lunch: 'Обед', dinner: 'Ужин', snack: 'Перекус' } as const;
function NutritionSummary({ values, target }: { values: ReturnType<typeof formatNutrition>; target?: TargetComparison }) {
  const deviations = target?.status === 'known' ? formatNutrition(Object.fromEntries(Object.entries(target.metrics).map(([key, metric]) => [key, metric.delta])) as unknown as Nutrition) : null;
  return <dl className="grid grid-cols-2 gap-2 tabular-nums">{Object.entries(labels).map(([name, label]) => {
    const key = name as keyof typeof labels, unit = key === 'calories' ? 'ккал' : 'г';
    const metric = target?.status === 'known' ? target.metrics[key] : null;
    return <div key={key} className="min-w-0"><dt>{label}</dt><dd className="m-0">{metric ? metric.label : values[key]} {unit}
      {metric && <><p className="hint">Отклонение: {deviations![key]} {unit}</p>{metric.warning && <p className="field-error">{metric.target.numerator === 0n ? 'Выше заданного значения 0 г' : `${label} выше ручной цели более чем на 10%`}</p>}</>}
    </dd></div>;
  })}</dl>;
}
export function MenuPage({ snapshot, onRetryLoad }: { snapshot: GenerationSnapshot; onRetryLoad(): void }) {
  const bundle = snapshot.active;
  if (!bundle) {
    if (snapshot.loadStatus === 'pending' || snapshot.loadStatus === 'unloaded') return <Status>Загружаем меню…</Status>;
    if (snapshot.loadStatus === 'error' || snapshot.loadStatus === 'corrupt') return <section><h1 tabIndex={-1}>{snapshot.loadStatus === 'corrupt' ? 'Сохранённое меню повреждено или несовместимо с текущей версией' : 'Не удалось загрузить меню'}</h1><p>Исходная запись не изменена. Повторите загрузку или составьте новое меню</p><Button onClick={onRetryLoad}>Повторить загрузку</Button><Link className="action-link" to="/plan/new">К настройкам</Link></section>;
    return <section><h1 tabIndex={-1}>Меню пока нет</h1><p>Начните с настроек питания</p><Link className="primary action-link" to="/plan/new">Составить меню</Link></section>;
  }
  const { plan } = bundle;
  const projection = bundle.projections.find(item => item.variantId === plan.activeVariantId)!;
  const settings = plan.inputs.appliedSettings;
  const view = selectPlanPresentation(projection, settings.target);
  const today = localDateOnly(new Date());
  const budgetPercent = Number(projection.costs.exact.purchase.numerator * projection.budget.limit.denominator * 100n / (projection.costs.exact.purchase.denominator * projection.budget.limit.numerator));
  const priceScopes = [...new Set(projection.rows.map(row => `${row.price.region} · ${formatDateOnly(row.price.observedAt)}`))];
  const instances = projection.instances.map(row => ({ id: row.instance.id, date: row.instance.date, slot: slots[row.instance.slot], name: row.instance.recipeSnapshot.name,
    minutes: row.instance.recipeSnapshot.cookingMinutes, servings: formatExact(row.instance.selectedServings), nutrition: formatNutrition(row.perPortionNutrition),
    cost: formatCurrency(roundHalfUp(divide(row.ingredientCost, row.instance.selectedServings), 2)) }));
  return <section data-plan-id={plan.activeVariantId} className="[overflow-wrap:anywhere]">
    <h1 tabIndex={-1}>{view.days.length === 7 ? 'Меню на неделю' : `Меню на ${view.period}`}</h1>
    <p>{formatDateOnly(plan.inputs.dates[0])} — {formatDateOnly(plan.inputs.dates[plan.inputs.dates.length - 1])} · На {view.people}</p>
    <p className="hint">Меню сохранено на этом устройстве</p>
    <section className="card" aria-label="Бюджет меню">
      <h2>Покупки: ≈ {view.costs.purchase} / {view.costs.limit}</h2>
      <p>Лимит дополнительных покупок для всей семьи на {view.period}</p><p>Осталось {view.costs.remaining}</p>
      <progress className="w-full accent-[var(--color-accent)]" aria-label="Использовано бюджета" max={100} value={budgetPercent} />
      <dl className="tabular-nums"><dt>Все ингредиенты</dt><dd>{view.costs.ingredient}</dd><dt>Покрыто запасами</dt><dd>{view.costs.covered}</dd><dt>Нужно купить</dt><dd>{view.costs.purchase}</dd></dl>
      <p>Цены ориентировочные, проверяйте в магазине</p><p className="hint">Оценка цен: {priceScopes.join('; ')}</p>
    </section>
    <section className="card"><h2>Среднее на человека в день</h2><NutritionSummary values={view.averagePersonDayNutrition} target={view.targetComparison} />
      <p>{settings.target.status === 'absent' ? 'Ручная цель КБЖУ не задана' : settings.target.source.kind === 'manual' ? 'Цель введена вручную · на человека в день' : 'Цель из сохранённого расчёта · на человека в день'}</p>
      <p className="hint">КБЖУ рассчитаны по составу продуктов и не являются медицинской рекомендацией</p>
      <p className="hint">Текущий каталог ограничен растительными рецептами. Расчёт не подтверждает полноценность рациона.</p>
    </section>
    <Link className="action-link" to="/shopping">Список покупок · {view.itemCount}</Link>
    {view.days.map(day => <section className="card" key={day.dateOnly} data-date={day.dateOnly} aria-label={day.date}>
      <h2>{day.date}{day.dateOnly === today ? ' · Сегодня' : ''}</h2>
      {instances.filter(instance => instance.date === day.dateOnly).map(instance => <article className="border-b border-[var(--color-border)] py-4" key={instance.id} data-instance-id={instance.id}>
        <h3 className="font-semibold">{instance.slot}</h3><p>{instance.name}</p><p className="hint">{instance.minutes} мин · Порций для семьи: {instance.servings}</p>
        <p className="tabular-nums">На порцию: {instance.nutrition.calories} ккал · Б {instance.nutrition.protein} г · Ж {instance.nutrition.fat} г · У {instance.nutrition.carbohydrates} г · ≈ {instance.cost}</p>
      </article>)}
      <h3 className="font-semibold mt-4">На человека за день</h3><NutritionSummary values={day.personNutrition} target={compareNutritionTarget(projection.days.find(item => item.date === day.dateOnly)!.personNutrition, settings.target)} />
      <p>{day.costBasis}: {day.ingredientCost}</p><details><summary className="min-h-[44px] py-2">КБЖУ семьи за день</summary><NutritionSummary values={day.familyNutrition} /></details>
    </section>)}
    <details className="card"><summary className="min-h-[44px] py-2">Источники расчёта</summary><p>Версия каталога: {plan.inputs.catalogVersion}</p>
      {projection.rows.map(row => <div key={row.profileId} className="my-4"><p>{row.name} · {row.productId} · {row.profileId}</p>
        <p>Цена: {row.price.source.sourceId} / {row.price.source.recordId} · {formatQuantity({ amount: decimal(row.price.reference.amount), unit: row.price.reference.unit })} · {row.price.region} · {row.price.observedAt}</p>
        {plan.inputs.catalog.foods.filter(food => food.profileId === row.profileId).map(food => food.nutrition.status === 'known' && <p key={food.profileId}>КБЖУ: {food.nutrition.source.sourceId} / {food.nutrition.source.recordId} · {formatQuantity({ amount: decimal(food.nutrition.reference.amount), unit: food.nutrition.reference.unit })}</p>)}
      </div>)}
      <p>Всего: {formatCount(plan.inputs.sourceSnapshots.length, 'item')}</p>
    </details>
  </section>;
}
