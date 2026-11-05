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
export function MenuPage({ snapshot, onRetryLoad, onSelectVariant, onRetrySave, onCancel, onAppend, onRetryGeneration }: { snapshot: GenerationSnapshot; onRetryLoad(): void; onSelectVariant?(id: string): void; onRetrySave?(): void; onCancel?(): void; onAppend?(): void; onRetryGeneration?(): void }) {
  const bundle = snapshot.active;
  if (!bundle) {
    if (snapshot.loadStatus === 'pending' || snapshot.loadStatus === 'unloaded') return <PlanLoading kind="menu" />;
    if (snapshot.loadStatus === 'error' || snapshot.loadStatus === 'corrupt') return <section><h1 tabIndex={-1}>{snapshot.loadStatus === 'corrupt' ? 'Сохранённое меню повреждено или несовместимо с текущей версией' : 'Не удалось загрузить меню'}</h1><p>Исходная запись не изменена. Повторите загрузку или составьте новое меню</p><Button onClick={onRetryLoad}>Повторить загрузку</Button><Link className="action-link" to="/plan/new">К настройкам</Link></section>;
    return <section><h1 tabIndex={-1}>Меню пока нет</h1><p>Начните с настроек питания</p><Link className="primary action-link" to="/plan/new">Составить меню</Link></section>;
  }
  const { plan } = bundle;
  const projection = bundle.projections.find(item => item.variantId === plan.activeVariantId)!;
  const settings = plan.inputs.appliedSettings;
  const activeIndex = plan.variants.findIndex(variant => variant.id === plan.activeVariantId);
  const saving = snapshot.status === 'saving';
  const busy = saving || snapshot.status === 'pending';
  const view = selectPlanPresentation(projection, settings.target);
  const today = localDateOnly(new Date());
  const instances = projection.instances.map(row => ({ id: row.instance.id, date: row.instance.date, slot: slots[row.instance.slot], name: row.instance.recipeSnapshot.name,
    minutes: row.instance.recipeSnapshot.cookingMinutes, servings: formatExact(row.instance.selectedServings), nutrition: formatNutrition(row.perPortionNutrition),
    cost: formatCurrency(roundHalfUp(divide(row.ingredientCost, row.instance.selectedServings), 2)) }));
  return <section data-plan-id={plan.activeVariantId} className="plan-read-model [overflow-wrap:anywhere]">
    <h1 tabIndex={-1}>{view.days.length === 7 ? 'Меню на неделю' : `Меню на ${view.period}`}</h1>
    <p>{formatDateOnly(plan.inputs.dates[0])} — {formatDateOnly(plan.inputs.dates[plan.inputs.dates.length - 1])} · На {view.people}</p>
    <p className="hint">Меню сохранено на этом устройстве</p>
    <section className="card" aria-label="Варианты меню" aria-busy={busy}>
      <h2>Вариант {activeIndex + 1} из {plan.variants.length}</h2>
      {snapshot.initialSearchCount === null && plan.variants.length === 1 && <p>В сохранённом наборе 1 вариант</p>}
      {snapshot.initialSearchCount !== null && snapshot.initialSearchCount < 3 && <p>Найдено {snapshot.initialSearchCount} из 3 вариантов. Поиск ограничен; другие допустимые меню могут существовать.</p>}
      <p className="hint">Покупки для той же семьи на весь период. Запасы учитываются в каждом варианте отдельно.</p>
      <div className="flex gap-2">
        <Button aria-label="Предыдущий вариант" disabled={busy || activeIndex === 0} onClick={() => onSelectVariant?.(plan.variants[activeIndex - 1].id)}><span aria-hidden="true">←</span></Button>
        <Button aria-label="Следующий вариант" disabled={busy || activeIndex === plan.variants.length - 1} onClick={() => onSelectVariant?.(plan.variants[activeIndex + 1].id)}><span aria-hidden="true">→</span></Button>
      </div>
      <ul className="grid gap-2 p-0 list-none">{plan.variants.map((variant, index) => {
        const costs = selectPlanPresentation(bundle.projections.find(row => row.variantId === variant.id)!, settings.target).costs;
        const selected = variant.id === plan.activeVariantId;
        return <li key={variant.id}><Button className="w-full text-left" aria-pressed={selected} disabled={busy} onClick={() => onSelectVariant?.(variant.id)}>Вариант {index + 1} · Купить: ≈ {costs.purchase}{selected ? ' · Выбран' : ''}</Button></li>;
      })}</ul>
      <Button id="append-variant" disabled={busy || snapshot.status === 'memory-only' || plan.variants.length >= 12} onClick={onAppend}>Пересобрать</Button>
      {snapshot.status === 'pending' && <div><p role="status">Подбираем новый вариант… Прежнее меню остаётся доступным</p><Button onClick={onCancel}>Отмена</Button></div>}
      {saving && <div><p role="status">{snapshot.intent === 'append' ? 'Сохраняем новый вариант…' : 'Сохраняем выбор…'} Предыдущее меню остаётся активным</p><Button onClick={onCancel}>Отмена</Button></div>}
      {snapshot.status === 'succeeded' && <p role="status">{snapshot.intent === 'append' ? `Новый вариант добавлен и выбран. В наборе ${plan.variants.length} вариантов` : `Выбран вариант ${activeIndex + 1} из ${plan.variants.length}. Меню и список покупок обновлены`}</p>}
      {snapshot.status === 'memory-only' && <div role="alert"><p>{snapshot.intent === 'append' ? 'Новый вариант рассчитан, но не сохранён' : snapshot.intent === 'replace' ? 'Новый набор рассчитан, но не сохранён' : 'Не удалось сохранить выбор варианта'}</p><p>Результат доступен только до закрытия страницы. Прежнее меню не изменено</p><Button onClick={onRetrySave}>Повторить сохранение</Button><Button onClick={onCancel}>Оставить текущее меню</Button>{snapshot.saveError === 'blocked' && <Button onClick={onRetryLoad}>Повторить загрузку</Button>}</div>}
      {snapshot.status === 'no-new-result' && <div role="alert"><h3>Новый вариант не найден</h3><p>За отведённый поиск не удалось найти ещё один допустимый вариант. Прежние варианты сохранены</p><Button onClick={onRetryGeneration}>Повторить</Button><Link className="action-link" to="/plan/new">Изменить настройки</Link></div>}
      {snapshot.status === 'error' && <div role="alert"><p>{snapshot.error?.message}. Предыдущее меню не изменено</p><Button onClick={onRetryGeneration}>Повторить</Button><Link className="action-link" to="/plan/new">Изменить настройки</Link></div>}
    </section>
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
