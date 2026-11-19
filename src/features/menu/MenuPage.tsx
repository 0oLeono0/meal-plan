import { Link, useSearchParams } from 'react-router';
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { CSSProperties } from 'react';
import type { GenerationSnapshot } from '../generation/controller';
import { Button, ConfirmDialog } from '../../shared/ui';
import { formatCount, formatDateOnly, formatNutrition, selectPlanPresentation } from '../../domain/presentation';
import type { TargetComparison } from '../../domain/presentation';
import { localDateOnly } from '../../domain/plan';
import type { ActivePlanEnvelope, MealCoordinate } from '../../domain/plan';
import type { Nutrition } from '../../domain/catalog';
import type { MealEditTarget } from '../../domain/mealEdits';
import { PlanSummary } from '../plan/PlanSummary';
import { PlanLoading } from '../plan/PlanLoading';
import { menuDaySlots, menuSearch, resolveMenuView } from '../../domain/menuView';
import type { MenuView } from '../../domain/menuView';
import type { PlanProjection } from '../../domain/planProjection';
import { MealCard, mealSlotNames } from './MealCard';
import { MealAlternatives, type MealAlternativesActions } from './MealAlternatives';

const labels = { calories: 'Калории', protein: 'Белки', fat: 'Жиры', carbohydrates: 'Углеводы' } as const;
const desktopQuery = '(min-width: 1280px)';
const subscribeDesktop = (notify: () => void) => {
  const query = window.matchMedia(desktopQuery); query.addEventListener('change', notify);
  return () => query.removeEventListener('change', notify);
};
// Ephemeral local navigation origin only; no saved menu data or totals are copied.
let recipeOrigin: { variantId: string; instanceId: string } | null = null;
const emptySlotId = ({ date, slot }: MealCoordinate) => `empty-slot-${date}-${slot}`;

function ShoppingAction({ label }: { label: string }) {
  const bar = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const element = bar.current, main = element?.closest('main');
    if (!element || !main) return;
    const viewport = window.visualViewport;
    const measure = () => {
      const available = viewport?.height ?? window.innerHeight;
      const inFlow = available < 500 || window.innerHeight - available > 150 || element.getBoundingClientRect().height > available / 3;
      element.dataset.inFlow = String(inFlow);
      main.style.setProperty('--shopping-height', inFlow ? '0px' : `${element.getBoundingClientRect().height}px`);
    };
    const observer = new ResizeObserver(measure); observer.observe(element);
    window.addEventListener('resize', measure); viewport?.addEventListener('resize', measure);
    measure();
    return () => { observer.disconnect(); window.removeEventListener('resize', measure); viewport?.removeEventListener('resize', measure); main.style.removeProperty('--shopping-height'); };
  }, []);
  return <div ref={bar} className="menu-shopping"><Link className="primary action-link" to="/shopping">Список покупок · {label}</Link></div>;
}

function MenuDays({ projection, catalogVersion, selected, onChange, days, today, editingDisabled, onReplace, onRemove }: {
  projection: PlanProjection; catalogVersion: string; selected: MenuView; onChange(value: MenuView): void;
  days: ReturnType<typeof selectPlanPresentation>['days']; today: string; editingDisabled: boolean;
  onReplace?: (target: MealEditTarget, recipeName: string, trigger: HTMLElement) => void;
  onRemove?: (target: MealEditTarget, trigger: HTMLElement) => void;
}) {
  const desktop = useSyncExternalStore(subscribeDesktop, () => window.matchMedia(desktopQuery).matches);
  const grid = useRef<HTMLDivElement>(null);
  const tabs = useRef<HTMLDivElement>(null);
  const pointerFocus = useRef(false);
  const [focusedDay, setFocusedDay] = useState<string | null>(null);
  const [openActions, setOpenActions] = useState<string | null>(null);
  const dayMode = !desktop && selected.mode === 'day';
  useEffect(() => {
    // Safari can focus the containing tabpanel on pointerdown. Scrolling it
    // then moves the card before pointerup and cancels the native link click.
    const pointer = () => { pointerFocus.current = true; };
    const keyboard = () => { pointerFocus.current = false; };
    document.addEventListener('pointerdown', pointer, true);
    document.addEventListener('keydown', keyboard, true);
    return () => {
      document.removeEventListener('pointerdown', pointer, true);
      document.removeEventListener('keydown', keyboard, true);
    };
  }, []);
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
        const measurements = ['breakfast', 'lunch', 'dinner', 'snack'].map(slot => {
          const heights = [...host.querySelectorAll<HTMLElement>(`[data-slot="${slot}"] .meal-card-link, [data-slot="${slot}"][data-empty-date]`)].map(item => item.getBoundingClientRect().height);
          return [`--${slot}-height`, `${Math.ceil(Math.max(0, ...heights))}px`];
        });
        const headers = [...host.querySelectorAll<HTMLElement>('.menu-day-title')].map(item => item.getBoundingClientRect().height);
        measurements.push(['--day-heading-height', `${Math.ceil(Math.max(0, ...headers))}px`]);
        measurements.forEach(([name, value]) => host.style.setProperty(name, value));
      });
    };
    const observer = new ResizeObserver(measure);
    host.querySelectorAll('.meal-card-link, .menu-day-title, [data-empty-date]').forEach(element => observer.observe(element));
    measure();
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, [desktop, projection]);
  return <>
    <div className="menu-mobile-controls">
      <div role="group" aria-label="Вид меню" className="menu-mode"><Button aria-pressed={selected.mode === 'day'} onClick={() => onChange({ ...selected, mode: 'day' })}>Текущий день</Button><Button aria-pressed={selected.mode === 'week'} onClick={() => onChange({ ...selected, mode: 'week' })}>Вся неделя</Button></div>
      {dayMode && <div ref={tabs} className="menu-day-tabs" role="tablist" aria-label="Дни меню" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocusedDay(null); }} onKeyDown={event => {
        const controls = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('[role=tab]')];
        const index = controls.indexOf(document.activeElement as HTMLButtonElement);
        if (index < 0) return;
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? controls.length - 1 : event.key === 'ArrowRight' ? (index + 1) % controls.length : event.key === 'ArrowLeft' ? (index + controls.length - 1) % controls.length : null;
        if (next !== null) { event.preventDefault(); controls[next].focus(); }
      }}>{days.map(day => <button type="button" role="tab" key={day.dateOnly} id={`day-tab-${day.dateOnly}`} data-day={day.dateOnly} aria-label={`${day.date}${day.dateOnly === today ? ' · Сегодня' : ''}`} aria-current={day.dateOnly === today ? 'date' : undefined} aria-selected={selected.day === day.dateOnly} aria-controls={`day-panel-${day.dateOnly}`} tabIndex={(focusedDay ?? selected.day) === day.dateOnly ? 0 : -1} onFocus={() => setFocusedDay(day.dateOnly)} onClick={() => onChange({ ...selected, day: day.dateOnly })}>{new Intl.DateTimeFormat('ru-RU', { weekday: 'short', day: 'numeric', month: 'numeric', timeZone: 'UTC' }).format(new Date(`${day.dateOnly}T00:00:00Z`))}{day.dateOnly === today && <span>Сегодня</span>}</button>)}</div>}
    </div>
    <p className="menu-desktop-label">Вся неделя</p>
    <p className="hint">Ккал и стоимость — на одну порцию. Цена ингредиентов до вычета запасов</p>
    <p className="hint">Фотоиллюстрация создана с помощью ИИ; внешний вид блюда может отличаться. Изображение не является источником КБЖУ</p>
    <div className="menu-days" ref={grid} style={{ '--day-count': days.length } as CSSProperties}>
      {days.map(day => <section className="card menu-day" key={day.dateOnly} id={`day-panel-${day.dateOnly}`} data-date={day.dateOnly} hidden={dayMode && selected.day !== day.dateOnly} role={dayMode ? 'tabpanel' : undefined} aria-labelledby={dayMode ? `day-tab-${day.dateOnly}` : `day-title-${day.dateOnly}`} tabIndex={dayMode && selected.day === day.dateOnly ? 0 : undefined} onFocus={event => {
        if (pointerFocus.current) return;
        // Firefox native focus scrolling can ignore the reserved sticky area.
        event.target.scrollIntoView({ block: event.target === event.currentTarget ? 'start' : 'nearest' });
      }}>
        <header><h2 id={`day-title-${day.dateOnly}`} className="menu-day-title">{day.date}{day.dateOnly === today ? ' · Сегодня' : ''}</h2></header>
        {menuDaySlots(day.dateOnly, projection.instances).map(({ slot, row }, index) => {
          if (!row) return <div key={slot} id={emptySlotId({ date: day.dateOnly, slot })} data-empty-date={day.dateOnly} data-slot={slot} tabIndex={-1} className="meal-card rounded-[var(--radius-field)] border border-[var(--color-border)] p-2">
            <h3 className={`meal-slot meal-slot-${slot}`}>{mealSlotNames[slot]}</h3>
            <p className="hint">Место свободно</p>
          </div>;
          const instance = row.instance, recipeName = instance.recipeSnapshot.name;
          const target = { variantId: projection.variantId, date: instance.date, slot: instance.slot, instanceId: instance.id, recipeId: instance.recipeId };
          const expanded = openActions === instance.id && !editingDisabled;
          const actionsId = `actions-${instance.id}`;
          const actions = (onReplace || onRemove) && <div className="mt-2 flex flex-wrap items-center justify-end gap-2" onKeyDown={event => {
            if (event.key === 'Escape' && expanded) {
              event.preventDefault(); setOpenActions(null); event.currentTarget.querySelector('button')?.focus();
            }
          }}>
            <Button className="!px-2" aria-label={`Действия для блюда ${recipeName} · ${day.date} · ${mealSlotNames[instance.slot]}`} aria-expanded={expanded} aria-controls={actionsId} disabled={editingDisabled} onClick={() => setOpenActions(expanded ? null : instance.id)}>⋯</Button>
            <div id={actionsId} hidden={!expanded}>
              {onReplace && <Button className="!px-2" aria-label="Заменить блюдо" onClick={event => onReplace(target, recipeName, event.currentTarget)}>Заменить</Button>}
              {onRemove && <Button className="!px-2 text-[var(--color-danger)]" onClick={event => onRemove(target, event.currentTarget)}>Убрать из меню</Button>}
            </div>
          </div>;
          return <MealCard key={instance.id} row={row} catalogVersion={catalogVersion} variantId={projection.variantId} view={selected} priority={index === 0 && (desktop ? day.dateOnly === days[0]?.dateOnly : day.dateOnly === selected.day)} actions={actions} onOpen={() => { recipeOrigin = { variantId: projection.variantId, instanceId: instance.id }; }} />;
        })}
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
export function MenuPage({ snapshot, onRetryLoad, onSelectVariant, onRetrySave, onCancel, onAppend, onRetryGeneration, onRecreate, mealAlternatives, onRemove }: { snapshot: GenerationSnapshot; onRetryLoad(): void; onSelectVariant?(id: string): void; onRetrySave?(): void; onCancel?(): void; onAppend?(): void; onRetryGeneration?(): void; onRecreate?(focusAnchor: string): void; mealAlternatives?: MealAlternativesActions; onRemove?(target: MealEditTarget, expectedPlan: ActivePlanEnvelope): void }) {
  const [replacementTrigger, setReplacementTrigger] = useState<HTMLElement | null>(null);
  const [mealChoice, setMealChoice] = useState<{ target: MealEditTarget; recipeName: string; trigger: HTMLElement } | null>(null);
  const [removal, setRemoval] = useState<{ target: MealEditTarget; trigger: HTMLElement; plan: ActivePlanEnvelope } | null>(null);
  const removedFocus = useRef<MealEditTarget | null>(null);
  const [params, setParams] = useSearchParams();
  useEffect(() => {
    if (snapshot.status === 'succeeded' && snapshot.intent === 'replace') document.getElementById('menu-title')?.focus();
  }, [snapshot.status, snapshot.intent]);
  useEffect(() => {
    if (!removedFocus.current || snapshot.intent !== 'edit') return;
    if (snapshot.status === 'succeeded') {
      const target = removedFocus.current;
      removedFocus.current = null;
      const empty = document.getElementById(emptySlotId(target));
      (empty ?? document.getElementById('menu-title'))?.focus();
    }
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
  const editing = snapshot.intent === 'edit';
  const busy = saving || snapshot.status === 'pending';
  const view = selectPlanPresentation(projection, settings.target);
  const today = localDateOnly(new Date());
  const selected = resolveMenuView(params.toString(), plan.inputs.dates, today);
  return <section data-plan-id={plan.activeVariantId} className="plan-read-model menu-page [overflow-wrap:anywhere]">
    <h1 id="menu-title" tabIndex={-1}>{view.days.length === 7 ? 'Меню на неделю' : `Меню на ${view.period}`}</h1>
    <p>{formatDateOnly(plan.inputs.dates[0])} — {formatDateOnly(plan.inputs.dates[plan.inputs.dates.length - 1])} · На {view.people}</p>
    {!(saving && editing) && <p className="hint">Меню сохранено на этом устройстве</p>}
    <section id="variants" tabIndex={-1} className="card" aria-label="Варианты меню" aria-busy={busy}>
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
        return <li key={variant.id}><Button className="w-full text-left" aria-pressed={selected} disabled={busy} onClick={() => onSelectVariant?.(variant.id)}>Вариант {index + 1} · Купить: ≈ {costs.purchase}{selected ? ' · Выбран' : ''}</Button>{saving && snapshot.intent === 'select' && snapshot.candidate?.plan.activeVariantId === variant.id && <p role="status">Сохраняем выбор… Предыдущее меню остаётся активным</p>}</li>;
      })}</ul>
      <Button id="append-variant" disabled={busy || snapshot.status === 'memory-only' || plan.variants.length >= 12} onClick={onAppend}>Пересобрать</Button>
      {plan.variants.length >= 12 && <div><p>В наборе 12 вариантов — это предел хранения на этом устройстве. Чтобы продолжить подбор, создайте новый набор</p><Button id="create-new-set" disabled={busy} onClick={event => setReplacementTrigger(event.currentTarget)}>Создать новый набор</Button></div>}
      <details><summary className="min-h-[44px] py-2">Действия с меню</summary><div className="grid gap-2"><Button id="recreate-set" disabled={busy} onClick={event => setReplacementTrigger(event.currentTarget)}>Составить заново</Button><Link className="action-link" to="/plan/new">Изменить настройки</Link></div></details>
      {snapshot.status === 'pending' && <div><progress aria-label={snapshot.intent === 'replace' ? 'Подбор нового набора' : 'Подбор нового варианта'} /><p role="status">{snapshot.intent === 'replace' ? 'Подбираем новый набор…' : 'Ищем новый вариант…'} Используем применённые настройки и даты этого меню. Прежнее меню остаётся доступным</p><Button onClick={onCancel}>Отменить подбор</Button></div>}
      {saving && !editing && <div>{snapshot.intent !== 'select' && <p role="status">{snapshot.intent === 'append' ? 'Сохраняем новый вариант…' : 'Сохраняем новый набор…'} Предыдущее меню остаётся активным</p>}<Button onClick={onCancel}>Отмена</Button></div>}
      {snapshot.status === 'succeeded' && !editing && <p role="status">{snapshot.intent === 'append' ? `Новый вариант добавлен и выбран. В наборе ${formatCount(plan.variants.length, 'variant')}` : `Выбран вариант ${activeIndex + 1} из ${plan.variants.length}. Меню и список покупок обновлены`}</p>}
      {snapshot.status === 'memory-only' && !editing && <div role="alert"><p>{snapshot.intent === 'append' ? 'Новый вариант рассчитан, но не сохранён' : snapshot.intent === 'replace' ? 'Новый набор рассчитан, но не сохранён' : 'Не удалось сохранить выбор варианта'}</p><p>{snapshot.intent === 'select' ? 'Активным осталось прежнее меню. Повторите сохранение' : 'Результат доступен только до закрытия страницы. Прежнее меню не изменено'}</p><Button onClick={onRetrySave}>Повторить сохранение</Button><Button onClick={onCancel}>Оставить текущее меню</Button>{snapshot.saveError === 'blocked' && <Button onClick={onRetryLoad}>Повторить загрузку</Button>}</div>}
      {snapshot.status === 'no-new-result' && <div role="alert"><h3>Новый вариант не найден</h3><p>За отведённый поиск не удалось найти ещё один допустимый вариант. Прежние варианты сохранены</p><Button onClick={onRetryGeneration}>Повторить</Button><Link className="action-link" to="/plan/new">Изменить настройки</Link></div>}
      {snapshot.status === 'idle' && snapshot.origin && (snapshot.intent === 'append' || snapshot.intent === 'replace') && <p role="status">Подбор отменён. Прежнее меню не изменено</p>}
      {snapshot.status === 'error' && !editing && <div role="alert"><p>{snapshot.error?.message}. Предыдущее меню не изменено</p><Button onClick={onRetryGeneration}>Повторить</Button><Link className="action-link" to="/plan/new">Изменить настройки</Link></div>}
    </section>
    <PlanSummary bundle={bundle} projection={projection} />
    <section className="card"><h2>Среднее на человека в день</h2><NutritionSummary values={view.averagePersonDayNutrition} target={view.targetComparison} />
      <p>{settings.target.status === 'absent' ? 'Ручная цель КБЖУ не задана' : settings.target.source.kind === 'manual' ? 'Цель введена вручную · на человека в день' : 'Цель из сохранённого расчёта · на человека в день'}</p>
      <p className="hint">КБЖУ рассчитаны по составу продуктов и не являются медицинской рекомендацией</p>
      <p className="hint">Расчёт не подтверждает полноценность рациона.</p>
    </section>
    <MenuDays projection={projection} catalogVersion={plan.inputs.catalogVersion} selected={selected} onChange={next => setParams(menuSearch(next))} days={view.days} today={today} editingDisabled={busy} onReplace={mealAlternatives ? (target, recipeName, trigger) => setMealChoice({ target, recipeName, trigger }) : undefined} onRemove={onRemove ? (target, trigger) => setRemoval({ target, trigger, plan }) : undefined} />
    {mealChoice && mealAlternatives && <MealAlternatives {...mealChoice} request={mealAlternatives.request} onClose={() => setMealChoice(null)} onChoose={(recipeId, revision) => {
      const link = mealChoice.trigger.closest('article')?.querySelector('a');
      setMealChoice(null); mealAlternatives.select(mealChoice.target, recipeId, revision);
      requestAnimationFrame(() => link?.isConnected && link.focus());
    }} />}
    {removal && <ConfirmDialog title="Убрать блюдо из меню?" description="Этот приём пищи останется пустым. Позже сюда можно добавить другое блюдо." cancelLabel="Оставить блюдо" confirmLabel="Убрать из меню" returnFocus={removal.trigger} fallbackFocusId="menu-title" onCancel={() => setRemoval(null)} onConfirm={() => {
      setRemoval(null);
      removedFocus.current = removal.target;
      onRemove?.(removal.target, removal.plan);
    }} />}
    <ShoppingAction label={view.itemCount} />
    {replacementTrigger && <ConfirmDialog title="Создать новый набор меню?" description={`После успешного сохранения нового набора прежние ${formatCount(plan.variants.length, 'variant')} будут заменены. До этого текущее меню останется доступным`} cancelLabel="Оставить варианты" confirmLabel="Создать новый набор" returnFocus={replacementTrigger} fallbackFocusId="menu-title" onCancel={() => setReplacementTrigger(null)} onConfirm={() => {
      const anchor = replacementTrigger.id;
      setReplacementTrigger(null); onRecreate?.(anchor);
    }} />}
  </section>;
}
