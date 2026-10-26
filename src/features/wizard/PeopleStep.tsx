import type { DraftAction, SettingsDraft, StepErrors } from '../../domain/settings';
import { Button, Field } from '../../shared/ui';

export interface PeopleStepProps {
  draft: SettingsDraft;
  onChange(action: DraftAction): void;
  errors: StepErrors;
  disabled?: boolean;
}

export function PeopleStep({ draft, onChange, errors, disabled = false }: PeopleStepProps) {
  function counter(field: 'people' | 'days', label: string, max: number) {
    const raw = draft[field];
    const number = Number(raw);
    const valid = /^\d+$/.test(raw) && Number.isSafeInteger(number) && number >= 1 && number <= max;
    const noun = field === 'people' ? 'людей' : 'дней';
    return <Field id={field} label={label} hint={`От 1 до ${max} ${field === 'people' ? 'человек' : 'дней'}. Значение сохраняется автоматически.`} error={errors[field]}>
      <div className="stepper">
        <Button aria-label={`Уменьшить число ${noun}`} disabled={disabled || !valid || number <= 1} onClick={() => onChange({ type: 'set', field, value: String(number - 1) })}>−</Button>
        <input id={field} name={field} type="text" inputMode="numeric" autoComplete="off" disabled={disabled} value={raw} onChange={event => onChange({ type: 'set', field, value: event.target.value })} aria-invalid={!!errors[field]} aria-describedby={`${field}-hint${errors[field] ? ` ${field}-error` : ''}`} />
        <Button aria-label={`Увеличить число ${noun}`} disabled={disabled || !valid || number >= max} onClick={() => onChange({ type: 'set', field, value: String(number + 1) })}>+</Button>
      </div>
    </Field>;
  }
  return <>
    <p>Укажите, сколько человек будет за столом, цель и длительность меню.</p>
    <div className="card">
      {counter('people', 'Число людей', 10)}
      <fieldset className="border-0 p-0 m-0 min-w-0 mt-4" disabled={disabled}>
        <legend>Быстрый выбор числа людей</legend>
        <div className="grid grid-cols-2 gap-2 mt-2">
          {[1, 2, 3, 4].map(count => <label className="flex items-center gap-2 min-h-[44px] m-0" key={count}>
            <input className="!w-6 shrink-0" type="radio" name="people-preset" checked={draft.people === String(count)} onChange={() => onChange({ type: 'set', field: 'people', value: String(count) })} />
            {count === 4 ? '4+' : String(count)}
          </label>)}
        </div>
      </fieldset>
    </div>
    <fieldset id="goal" tabIndex={-1} className="card border-0 min-w-0" disabled={disabled} aria-describedby={errors.goal ? 'goal-error' : undefined}>
      <legend>Цель питания</legend>
      {([{ value: 'maintain', label: 'Поддерживать вес' }, { value: 'lose', label: 'Снизить вес' }, { value: 'gain', label: 'Набрать вес' }] as const).map(goal => <label className="flex items-center gap-2 min-h-[44px]" key={goal.value}>
        <input className="!w-6 shrink-0" type="radio" name="goal" checked={draft.goal === goal.value} onChange={() => onChange({ type: 'goal', value: goal.value })} />
        <span>{goal.label}</span>
      </label>)}
      {errors.goal && <p className="field-error" id="goal-error">{errors.goal}</p>}
    </fieldset>
    <div className="card">{counter('days', 'Число дней', 7)}</div>
  </>;
}
