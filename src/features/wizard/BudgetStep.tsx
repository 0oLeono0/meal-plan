import { budgetPeriodLabel, formatRubles, parseBudget, projectSlider, selectBudgetHint } from '../../domain/budget';
import type { DraftAction, SettingsDraft, StepErrors } from '../../domain/settings';
import { Field } from '../../shared/ui';

export function BudgetStep({ draft, onChange, errors, disabled = false }: { draft: SettingsDraft; onChange(action: DraftAction): void; errors: StepErrors; disabled?: boolean }) {
  const amount = parseBudget(draft.budget);
  const thumb = amount === null ? 3000 : projectSlider(amount);
  const manual = amount !== null && amount !== thumb;
  const hint = selectBudgetHint(draft.budget, draft.people, draft.days);
  const error = amount === null ? errors.budget || 'Введите целое число рублей от 500' : undefined;
  const rangeText = amount === null
    ? `Отдельный выбор суммы: ${formatRubles(thumb)} рублей. Введите точную сумму или выберите её ползунком`
    : `Ползунок: ${formatRubles(thumb)} рублей${manual ? `. Точная сумма в поле: ${formatRubles(amount)} рублей` : ''}`;
  return <>
    <p>Задайте бюджет на весь период. Время и разнообразие помогут подобрать подходящие блюда.</p>
    <div className="card min-w-0">
      <Field id="budget" label={budgetPeriodLabel(draft.days)} hint="В рублях. Целое число от 500; точную сумму можно ввести вручную." error={error}>
        <div className="budget-amount">
          <input id="budget" name="budget" className="min-w-0 max-w-full" type="text" inputMode="numeric" autoComplete="off" value={draft.budget} disabled={disabled} onChange={event => onChange({ type: 'set', field: 'budget', value: event.target.value })} aria-invalid={!!error} aria-describedby={`budget-hint${error ? ' budget-error' : ''}`} />
          <span aria-hidden="true">₽</span>
        </div>
      </Field>
      <label htmlFor="budget-slider">Выбрать бюджет ползунком</label>
      <input id="budget-slider" className="min-h-[44px] accent-[var(--color-accent)]" type="range" min={1000} max={15000} step={100} value={thumb} disabled={disabled} aria-valuenow={thumb} aria-valuetext={rangeText} aria-describedby="budget-slider-hint" onChange={event => onChange({ type: 'set', field: 'budget', value: event.target.value })} />
      <p className="hint" id="budget-slider-hint">Ползунок: от 1 000 до 15 000 ₽, шаг 100 ₽. В поле можно указать другую точную сумму.</p>
      {manual && <p className="hint">Точная сумма введена вручную</p>}
      {hint !== null && <p>≈ {formatRubles(Math.round(hint))} ₽ на человека в день</p>}
    </div>
    <fieldset className="card border-0 min-w-0" disabled={disabled}>
      <legend>Время приготовления</legend>
      <div className="grid gap-2">
        {([{ value: '15', label: 'до 15 мин' }, { value: '30', label: 'до 30 мин' }, { value: '60', label: 'до 60 мин' }, { value: 'any', label: 'любое' }] as const).map(option => <label className="flex items-center gap-2 min-h-[44px] m-0" key={option.value}>
          <input className="!w-6 shrink-0 accent-[var(--color-accent)]" type="radio" name="cooking-time" value={option.value} checked={draft.cookingTime === option.value} onChange={() => onChange({ type: 'cookingTime', value: option.value })} />
          <span>{option.label}</span>
        </label>)}
      </div>
    </fieldset>
    <fieldset className="card border-0 min-w-0" disabled={disabled}>
      <legend>Разнообразие</legend>
      <div className="grid gap-2">
        {([{ value: 'same', label: 'Одно и то же каждый день' }, { value: 'medium', label: 'Среднее' }, { value: 'max', label: 'Каждый день разное' }] as const).map(option => <label className="flex items-center gap-2 min-h-[44px] m-0" key={option.value}>
          <input className="!w-6 shrink-0 accent-[var(--color-accent)]" type="radio" name="variety" value={option.value} checked={draft.variety === option.value} onChange={() => onChange({ type: 'variety', value: option.value })} />
          <span>{option.label}</span>
        </label>)}
      </div>
    </fieldset>
  </>;
}
