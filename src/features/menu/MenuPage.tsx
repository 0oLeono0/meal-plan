import { Link, useSearchParams } from 'react-router';
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { CSSProperties } from 'react';
import type { GenerationSnapshot } from '../generation/controller';
import { Button, ConfirmDialog } from '../../shared/ui';
import { formatDateOnly, formatNutrition, selectPlanPresentation } from '../../domain/presentation';
import type { TargetComparison } from '../../domain/presentation';
import { localDateOnly } from '../../domain/plan';
import type { Nutrition } from '../../domain/catalog';
import { PlanSummary } from '../plan/PlanSummary';
import { PlanLoading } from '../plan/PlanLoading';
import { menuSearch, resolveMenuView } from '../../domain/menuView';
import type { MenuView } from '../../domain/menuView';
import type { PlanProjection } from '../../domain/planProjection';
import { MealCard } from './MealCard';

const labels = { calories: 'Калории', protein: 'Белки', fat: 'Жиры', carbohydrates: 'Углеводы' } as const;
const desktopQuery = '(min-width: 1280px)';
const subscribeDesktop = (notify: () => void) => {
  const query = window.matchMedia(desktopQuery); query.addEventListener('change', notify);
  return () => query.removeEventListener('change', notify);
};
// Ephemeral local navigation origin only; no saved menu data or totals are copied.
let recipeOrigin: { variantId: string; instanceId: string } | null = null;

function MenuDays({ projection, catalogVersion, selected, onChange, days, today }: {
  projection: PlanProjection; catalogVersion: string; selected: MenuView; onChange(value: MenuView): void;
  days: ReturnType<typeof selectPlanPresentation>['days']; today: string;
}) {
  const desktop = useSyncExternalStore(subscribeDesktop, () => window.matchMedia(desktopQuery).matches);
  const grid = useRef<HTMLDivElement>(null);
  const dayMode = !desktop && selected.mode === 'day';
  useLayoutEffect(() => {
    const main = grid.current?.closest('main');
    main?.classList.add('menu-main');
    return () => main?.classList.remove('menu-main');
  }, []);
  useEffect(() => {
    const origin = recipeOrigin;
    if (!origin) return;
    recipeOrigin = null;
    const frame = requestAnimationFrame(() => {
      const row = origin.variantId === projection.variantId && projection.instances.find(item => item.instance.id === origin.instanceId);
      const element = row ? [...(grid.current?.querySelectorAll<HTMLElement>('[data-instance-id]') ?? [])].find(item => item.dataset.instanceId === origin.instanceId)?.querySelector<HTMLAnchorElement>('a') : null;
      (element ?? document.getElementById('menu-title'))?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [projection]);
  useLayoutEffect(() => {
    const host = grid.current;
    if (!desktop || !host) return;
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        for (const slot of ['breakfast', 'lunch', 'dinner', 'snack']) {
          const heights = [...host.querySelectorAll<HTMLElement>(`[data-slot="${slot}"] .meal-card-link`)].map(item => item.getBoundingClientRect().height);
          host.style.setProperty(`--${slot}-height`, `${Math.ceil(Math.max(0, ...heights))}px`);
        }
        const headers = [...host.querySelectorAll<HTMLElement>('.menu-day-title')].map(item => item.getBoundingClientRect().height);
        host.style.setProperty('--day-heading-height', `${Math.ceil(Math.max(0, ...headers))}px`);
      });
    };
    const observer = new ResizeObserver(measure);
    host.querySelectorAll('.meal-card-link, .menu-day-title').forEach(element => observer.observe(element));
    measure();
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, [desktop, projection]);
  return <>
    <div className="menu-mobile-controls">
      <div role="group" aria-label="Вид меню" className="menu-mode"><Button aria-pressed={selected.mode === 'day'} onClick={() => onChange({ ...selected, mode: 'day' })}>Текущий день</Button><Button aria-pressed={selected.mode === 'week'} onClick={() => onChange({ ...selected, mode: 'week' })}>Вся неделя</Button></div>
      {dayMode && <div className="menu-day-tabs" role="tablist" aria-label="Дни меню">{days.map(day => <button type="button" role="tab" key={day.dateOnly} id={`day-tab-${day.dateOnly}`} data-day={day.dateOnly} aria-label={`${day.date}${day.dateOnly === today ? ' · Сегодня' : ''}`} aria-current={day.dateOnly === today ? 'date' : undefined} aria-selected={selected.day === day.dateOnly} aria-controls={`day-panel-${day.dateOnly}`} tabIndex={selected.day === day.dateOnly ? 0 : -1} onClick={() => onChange({ ...selected, day: day.dateOnly })}>{new Intl.DateTimeFormat('ru-RU', { weekday: 'short', day: 'numeric', month: 'numeric', timeZone: 'UTC' }).format(new Date(`${day.dateOnly}T00:00:00Z`))}{day.dateOnly === today && <span>Сегодня</span>}</button>)}</div>}
    </div>
    <p className="menu-desktop-label">Вся неделя</p>
    <p className="hint">Ккал и стоимость — на одну порцию. Цена ингредиентов до вычета запасов</p>
    <p className="hint">Фотоиллюстрация создана с помощью ИИ; внешний вид блюда может отличаться. Изображение не является источником КБЖУ</p>
    <div className="menu-days" ref={grid} style={{ '--day-count': days.length } as CSSProperties}>
      {days.map(day => <section className="card menu-day" key={day.dateOnly} id={`day-panel-${day.dateOnly}`} data-date={day.dateOnly} hidden={dayMode && selected.day !== day.dateOnly} role={dayMode ? 'tabpanel' : undefined} aria-labelledby={dayMode ? `day-tab-${day.dateOnly}` : `day-title-${day.dateOnly}`} tabIndex={dayMode && selected.day === day.dateOnly ? 0 : undefined}>
        <header><h2 id={`day-title-${day.dateOnly}`} className="menu-day-title">{day.date}{day.dateOnly === today ? ' · Сегодня' : ''}</h2></header>
        {projection.instances.filter(row => row.instance.date === day.dateOnly).map((row, index) => <MealCard key={row.instance.id} row={row} catalogVersion={catalogVersion} variantId={projection.variantId} view={selected} priority={index === 0 && (desktop ? day.dateOnly === days[0]?.dateOnly : day.dateOnly === selected.day)} onOpen={() => { recipeOrigin = { variantId: projection.variantId, instanceId: row.instance.id }; }} />)}
        <div className="menu-day-totals"><h3>На человека за день</h3><NutritionSummary values={day.personNutrition} target={day.targetComparison} /><p>{day.costBasis}: {day.ingredientCost}</p><details><summary className="min-h-[44px] py-2">КБЖУ семьи за день</summary><NutritionSummary values={day.familyNutrition} /></details></div>
      </section>)}
    </div>
  </>;
}
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
export function MenuPage({ snapshot, onRetryLoad, onSelectVariant, onRetrySave, onCancel, onAppend, onRetryGeneration, onRecreate }: { snapshot: GenerationSnapshot; onRetryLoad(): void; onSelectVariant?(id: string): void; onRetrySave?(): void; onCancel?(): void; onAppend?(): void; onRetryGeneration?(): void; onRecreate?(focusAnchor: string): void }) {
  const [replacementTrigger, setReplacementTrigger] = useState<HTMLElement | null>(null);
  const [params, setParams] = useSearchParams();
  useEffect(() => {
    if (snapshot.status === 'succeeded' && snapshot.intent === 'replace' && document.activeElement === document.body) document.getElementById('menu-title')?.focus();
  }, [snapshot.status, snapshot.intent]);
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
  const selected = resolveMenuView(params.toString(), plan.inputs.dates, today);
  return <section data-plan-id={plan.activeVariantId} className="plan-read-model menu-page [overflow-wrap:anywhere]">
    <h1 id="menu-title" tabIndex={-1}>{view.days.length === 7 ? 'Меню на неделю' : `Меню на ${view.period}`}</h1>
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
      {plan.variants.length >= 12 && <div><p>В наборе 12 вариантов — это предел хранения на этом устройстве. Чтобы продолжить подбор, создайте новый набор</p><Button id="create-new-set" disabled={busy} onClick={event => setReplacementTrigger(event.currentTarget)}>Создать новый набор</Button></div>}
      <details><summary className="min-h-[44px] py-2">Действия с меню</summary><div className="grid gap-2"><Button id="recreate-set" disabled={busy} onClick={event => setReplacementTrigger(event.currentTarget)}>Составить заново</Button><Link className="action-link" to="/plan/new">Изменить настройки</Link></div></details>
      {snapshot.status === 'pending' && <div><progress aria-label={snapshot.intent === 'replace' ? 'Подбор нового набора' : 'Подбор нового варианта'} /><p role="status">{snapshot.intent === 'replace' ? 'Подбираем новый набор…' : 'Подбираем новый вариант…'} Прежнее меню остаётся доступным</p><Button onClick={onCancel}>Отмена</Button></div>}
      {saving && <div><p role="status">{snapshot.intent === 'append' ? 'Сохраняем новый вариант…' : snapshot.intent === 'replace' ? 'Сохраняем новый набор…' : 'Сохраняем выбор…'} Предыдущее меню остаётся активным</p><Button onClick={onCancel}>Отмена</Button></div>}
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
    <MenuDays projection={projection} catalogVersion={plan.inputs.catalogVersion} selected={selected} onChange={next => setParams(menuSearch(next))} days={view.days} today={today} />
    {replacementTrigger && <ConfirmDialog title="Создать новый набор меню?" description={`После успешного сохранения нового набора прежние ${plan.variants.length} ${plan.variants.length === 1 ? 'вариант' : plan.variants.length < 5 ? 'варианта' : 'вариантов'} будут заменены. До этого текущее меню останется доступным`} cancelLabel="Оставить варианты" confirmLabel="Создать новый набор" returnFocus={replacementTrigger} fallbackFocusId="menu-title" onCancel={() => setReplacementTrigger(null)} onConfirm={() => {
      const anchor = replacementTrigger.id;
      setReplacementTrigger(null); onRecreate?.(anchor);
    }} />}
  </section>;
}
