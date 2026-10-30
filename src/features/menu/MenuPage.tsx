import { Link } from 'react-router';
import type { GenerationSnapshot } from '../generation/controller';
import { Button } from '../../shared/ui';
import { formatCurrency, formatDateOnly, formatNutrition, selectPlanPresentation } from '../../domain/presentation';
import type { TargetComparison } from '../../domain/presentation';
import { divide, formatExact, roundHalfUp } from '../../domain/quantities';
import { localDateOnly } from '../../domain/plan';
import type { Nutrition } from '../../domain/catalog';
import { PlanSummary } from '../plan/PlanSummary';
import { PlanLoading } from '../plan/PlanLoading';

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
    if (snapshot.loadStatus === 'pending' || snapshot.loadStatus === 'unloaded') return <PlanLoading kind="menu" />;
    if (snapshot.loadStatus === 'error' || snapshot.loadStatus === 'corrupt') return <section><h1 tabIndex={-1}>{snapshot.loadStatus === 'corrupt' ? 'Сохранённое меню повреждено или несовместимо с текущей версией' : 'Не удалось загрузить меню'}</h1><p>Исходная запись не изменена. Повторите загрузку или составьте новое меню</p><Button onClick={onRetryLoad}>Повторить загрузку</Button><Link className="action-link" to="/plan/new">К настройкам</Link></section>;
    return <section><h1 tabIndex={-1}>Меню пока нет</h1><p>Начните с настроек питания</p><Link className="primary action-link" to="/plan/new">Составить меню</Link></section>;
  }
  const { plan } = bundle;
  const projection = bundle.projections.find(item => item.variantId === plan.activeVariantId)!;
  const settings = plan.inputs.appliedSettings;
  const view = selectPlanPresentation(projection, settings.target);
  const today = localDateOnly(new Date());
  const instances = projection.instances.map(row => ({ id: row.instance.id, date: row.instance.date, slot: slots[row.instance.slot], name: row.instance.recipeSnapshot.name,
    minutes: row.instance.recipeSnapshot.cookingMinutes, servings: formatExact(row.instance.selectedServings), nutrition: formatNutrition(row.perPortionNutrition),
    cost: formatCurrency(roundHalfUp(divide(row.ingredientCost, row.instance.selectedServings), 2)) }));
  return <section data-plan-id={plan.activeVariantId} className="plan-read-model [overflow-wrap:anywhere]">
    <h1 tabIndex={-1}>{view.days.length === 7 ? 'Меню на неделю' : `Меню на ${view.period}`}</h1>
    <p>{formatDateOnly(plan.inputs.dates[0])} — {formatDateOnly(plan.inputs.dates[plan.inputs.dates.length - 1])} · На {view.people}</p>
    <p className="hint">Меню сохранено на этом устройстве</p>
    <PlanSummary bundle={bundle} projection={projection} />
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
      <h3 className="font-semibold mt-4">На человека за день</h3><NutritionSummary values={day.personNutrition} target={day.targetComparison} />
      <p>{day.costBasis}: {day.ingredientCost}</p><details><summary className="min-h-[44px] py-2">КБЖУ семьи за день</summary><NutritionSummary values={day.familyNutrition} /></details>
    </section>)}
  </section>;
}
