import { Link } from 'react-router';
import type { DraftAction, SettingsDraft } from '../../domain/settings';
import { Button, Field } from '../../shared/ui';

export function Wizard({ draft, onChange }: { draft: SettingsDraft; onChange(action: DraftAction): void }) {
  const people = Number(draft.people);
  return <section className="wizard" aria-labelledby="wizard-title">
    <Link className="back" to="/">На главную</Link>
    <p className="eyebrow">Шаг {draft.step} из 4</p>
    <div className="steps" role="progressbar" aria-label="Настройка меню" aria-valuemin={0} aria-valuemax={4} aria-valuenow={draft.step}>
      {[1, 2, 3, 4].map(step => <span key={step} className={step <= draft.step ? 'filled' : ''} />)}
    </div>
    <h1 id="wizard-title" tabIndex={-1}>Для кого составляем меню</h1>
    <p>Укажите, сколько человек будет за столом.</p>
    <div className="card">
      <Field id="people" label="Число людей" hint="От 1 до 10 человек. Значение сохраняется автоматически.">
        <div className="stepper">
          <Button aria-label="Уменьшить число людей" disabled={!Number.isInteger(people) || people <= 1} onClick={() => onChange({ type: 'set', field: 'people', value: String(Math.max(1, people - 1)) })}>−</Button>
          <input id="people" name="people" type="number" inputMode="numeric" autoComplete="off" min={1} max={10} value={draft.people} onChange={event => onChange({ type: 'set', field: 'people', value: event.target.value })} aria-describedby="people-hint" />
          <Button aria-label="Увеличить число людей" disabled={!Number.isInteger(people) || people >= 10} onClick={() => onChange({ type: 'set', field: 'people', value: String(Math.min(10, people + 1)) })}>+</Button>
        </div>
      </Field>
    </div>
  </section>;
}
