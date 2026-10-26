import { Link, useNavigate } from 'react-router';
import { useEffect, useRef, useState } from 'react';
import { createDraft, validateStep, type DraftAction, type SettingsDraft, type Step, type StepErrors } from '../../domain/settings';
import { Button, ConfirmDialog, Field } from '../../shared/ui';

export function Wizard({ draft, onChange, recovery = false, saved = false, onReset }: { draft: SettingsDraft; onChange(action: DraftAction): void; recovery?: boolean; saved?: boolean; onReset?(): Promise<boolean> }) {
  const people = Number(draft.people);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetPending, setResetPending] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);
  const [errors, setErrors] = useState<StepErrors>({});
  const touched = useRef(false);
  const nextLock = useRef<ReturnType<typeof setTimeout> | null>(null);
  const active = useRef(true);
  const navigate = useNavigate();
  useEffect(() => () => { active.current = false; if (nextLock.current) clearTimeout(nextLock.current); }, []);
  function change(action: DraftAction) { touched.current = true; onChange(action); }
  function exit() {
    if (touched.current || JSON.stringify(draft) !== JSON.stringify(createDraft())) setExitOpen(true);
    else navigate('/');
  }
  function next() {
    if (nextLock.current || draft.step === 4) return;
    const found = validateStep(draft);
    setErrors(found);
    if (Object.keys(found).length) { document.getElementById(Object.keys(found)[0])?.focus(); return; }
    nextLock.current = setTimeout(() => { nextLock.current = null; }, 250);
    change({ type: 'step', value: (draft.step + 1) as Step });
  }
  const titles = ['Для кого составляем меню', 'Бюджет и готовка', 'Предпочтения и ограничения', 'Продукты дома'];
  return <section className="wizard" aria-labelledby="wizard-title">
    <Link className="back" to="/" onClick={event => { event.preventDefault(); exit(); }}>На главную</Link>
    {recovery && <Button onClick={() => setResetOpen(true)} disabled={resetPending}>Сбросить черновик</Button>}
    <p className="eyebrow">Шаг {draft.step} из 4</p>
    <div className="steps" role="progressbar" aria-label="Настройка меню" aria-valuemin={0} aria-valuemax={4} aria-valuenow={draft.step}>
      {[1, 2, 3, 4].map(step => <span key={step} className={step <= draft.step ? 'filled' : ''} />)}
    </div>
    {resetOpen && <ConfirmDialog title="Сбросить черновик?" description="Настройки мастера на этом устройстве будут удалены" cancelLabel="Оставить черновик" confirmLabel="Сбросить черновик" onCancel={() => { if (!resetPending) setResetOpen(false); }} onConfirm={() => {
      if (resetPending || !onReset) return;
      setResetPending(true);
      void onReset().then(success => { if (active.current) { setResetPending(false); if (success) { touched.current = false; setResetOpen(false); setErrors({}); } } });
    }} />}
    <h1 id="wizard-title" tabIndex={-1}>{titles[draft.step - 1]}</h1>
    {draft.step === 1 && <><p>Укажите, сколько человек будет за столом.</p>
    <div className="card">
      <Field id="people" label="Число людей" hint="От 1 до 10 человек. Значение сохраняется автоматически." error={errors.people}>
        <div className="stepper">
          <Button aria-label="Уменьшить число людей" disabled={resetPending || !Number.isInteger(people) || people <= 1} onClick={() => change({ type: 'set', field: 'people', value: String(Math.max(1, people - 1)) })}>−</Button>
          <input id="people" name="people" type="number" inputMode="numeric" autoComplete="off" min={1} max={10} disabled={resetPending} value={draft.people} onChange={event => change({ type: 'set', field: 'people', value: event.target.value })} aria-invalid={!!errors.people} aria-describedby={`people-hint${errors.people ? ' people-error' : ''}`} />
          <Button aria-label="Увеличить число людей" disabled={resetPending || !Number.isInteger(people) || people >= 10} onClick={() => change({ type: 'set', field: 'people', value: String(Math.min(10, people + 1)) })}>+</Button>
        </div>
      </Field>
    </div></>}
    <div className="sticky-actions">
      <Button disabled={resetPending} onClick={() => { setErrors({}); if (draft.step === 1) setExitOpen(true); else change({ type: 'step', value: (draft.step - 1) as Step }); }}>Назад</Button>
      {draft.step < 4 && <Button variant="primary" disabled={resetPending} onClick={next}>Далее</Button>}
    </div>
    {exitOpen && <ConfirmDialog title="Выйти из мастера?" description={saved ? 'Черновик останется на этом устройстве' : 'Изменения не сохранены на этом устройстве'} cancelLabel="Продолжить настройку" confirmLabel="Выйти из мастера" onCancel={() => setExitOpen(false)} onConfirm={() => navigate('/')} />}
  </section>;
}
