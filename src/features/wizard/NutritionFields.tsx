import { useState } from 'react';
import { nutritionKeys, parseManualTarget } from '../../domain/nutritionTarget';
import type { ManualNutrition } from '../../domain/settings';
import { Button, Field } from '../../shared/ui';
import type { PeopleStepProps } from './PeopleStep';

const labels: Record<keyof ManualNutrition, string> = {
  calories: 'Калории, ккал', protein: 'Белки, г', fat: 'Жиры, г', carbohydrates: 'Углеводы, г',
};

export function NutritionFields({ draft, onChange, errors, disabled = false }: PeopleStepProps) {
  const result = parseManualTarget(draft.manualNutrition);
  const [expanded, setExpanded] = useState(result.status !== 'absent');
  // Invalid submit reveals the fields even if the user collapsed the disclosure.
  const open = expanded || !!errors.manualNutrition;
  return <div className="card">
    <Button aria-expanded={open} aria-controls="nutrition-fields" disabled={disabled} onClick={() => setExpanded(!open)}>Норма КБЖУ</Button>
    <p className="hint">На человека в день</p>
    {result.status === 'absent' && <p>Норма не задана</p>}
    {result.status === 'invalid' && <p>Норма заполнена не полностью или содержит ошибку</p>}
    {result.status === 'valid' && <p>{draft.targetSource.kind === 'manual' ? 'Введено вручную' : 'Сохранённая норма из расчёта'}</p>}
    <div id="nutrition-fields" hidden={!open}>
      <p>Введите свою норму. Автоматический расчёт пока недоступен.</p>
      {nutritionKeys.map(key => <Field key={key} id={key} label={labels[key]} error={errors[key]}>
        <input id={key} name={key} type="text" inputMode="decimal" autoComplete="off" value={draft.manualNutrition[key]} disabled={disabled} aria-invalid={!!errors[key]} aria-describedby={errors[key] ? `${key}-error` : undefined} onChange={event => onChange({ type: 'manualNutrition', field: key, value: event.target.value })} />
      </Field>)}
      {errors.manualNutrition && <p className="field-error">{errors.manualNutrition}</p>}
      <Button disabled={disabled || result.status === 'absent'} onClick={() => onChange({ type: 'clearManualNutrition' })}>Очистить норму</Button>
    </div>
    <p className="hint">Планирование питания не является медицинской рекомендацией</p>
  </div>;
}
