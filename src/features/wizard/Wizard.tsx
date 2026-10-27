import { Link, useNavigate } from 'react-router';
import { useEffect, useRef, useState } from 'react';
import { createDraft, validateStep, type DraftAction, type SettingsDraft, type Step, type StepErrors } from '../../domain/settings';
import { Button, ConfirmDialog } from '../../shared/ui';
import { PeopleStep } from './PeopleStep';
import { BudgetStep } from './BudgetStep';
import { ExclusionsStep } from './ExclusionsStep';
import { HomeProductsStep, DraftReview } from './HomeProductsStep';

export function Wizard({ draft, onChange, recovery = false, saved = false, onReset }: { draft: SettingsDraft; onChange(action: DraftAction): void; recovery?: boolean; saved?: boolean; onReset?(): Promise<boolean> }) {
  const [resetOpen, setResetOpen] = useState(false);
  const [resetPending, setResetPending] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);
  const [dialogTrigger, setDialogTrigger] = useState<HTMLElement | null>(null);
  const [errors, setErrors] = useState<StepErrors>({});
  const [reviewed, setReviewed] = useState(false);
  const pendingFocus = useRef<string | null>(null);
  const touched = useRef(false);
  const nextLock = useRef<ReturnType<typeof setTimeout> | null>(null);
  const active = useRef(true);
  const footer = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  useEffect(() => () => { active.current = false; if (nextLock.current) clearTimeout(nextLock.current); }, []);
  useEffect(() => { document.getElementById('wizard-title')?.focus(); }, [draft.step]);
  useEffect(() => {
    const id = pendingFocus.current;
    if (!id) return;
    const invalid = document.getElementById(id);
    if (invalid) { invalid.focus(); (invalid.closest('.field') ?? invalid).scrollIntoView({ block: 'center' }); pendingFocus.current = null; }
  }, [draft.step, errors, reviewed]);
  useEffect(() => {
    const node = footer.current;
    if (!node) return;
    const measure = () => content.current?.style.setProperty('--footer-height', `${node.getBoundingClientRect().height}px`);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  function change(action: DraftAction) {
    touched.current = true;
    setReviewed(false);
    if (action.type === 'clearManualNutrition') setErrors({});
    onChange(action);
  }
  function review() {
    for (const step of [1, 2, 3, 4] as const) {
      const found = validateStep(draft, step);
      if (Object.keys(found).length) {
        pendingFocus.current = Object.keys(found)[0];
        change({ type: 'step', value: step }); setErrors(found); return;
      }
    }
    setErrors({}); setReviewed(true); pendingFocus.current = 'review-title';
  }
  function exit() {
    if (touched.current || JSON.stringify(draft) !== JSON.stringify(createDraft())) setExitOpen(true);
    else navigate('/');
  }
  function next() {
    if (nextLock.current) { document.getElementById('wizard-title')?.focus(); return; }
    if (draft.step === 4) return;
    const found = validateStep(draft);
    pendingFocus.current = Object.keys(found)[0] ?? null;
    setErrors(found);
    if (pendingFocus.current) return;
    nextLock.current = setTimeout(() => { nextLock.current = null; }, 250);
    change({ type: 'step', value: (draft.step + 1) as Step });
  }
  const titles = ['Для кого составляем меню', 'Бюджет и готовка', 'Предпочтения и ограничения', 'Продукты дома'];
  return <section className="wizard" aria-labelledby="wizard-title">
    <Link className="back" to="/" onClick={event => { event.preventDefault(); setDialogTrigger(event.currentTarget); exit(); }}>На главную</Link>
    {recovery && <Button onClick={event => { setDialogTrigger(event.currentTarget); setResetOpen(true); }} disabled={resetPending}>Сбросить черновик</Button>}
    <p className="eyebrow">Шаг {draft.step} из 4</p>
    <div className="steps" role="progressbar" aria-label="Настройка меню" aria-valuemin={0} aria-valuemax={4} aria-valuenow={draft.step}>
      {[1, 2, 3, 4].map(step => <span key={step} className={step <= draft.step ? 'filled' : ''} />)}
    </div>
    {resetOpen && <ConfirmDialog returnFocus={dialogTrigger} fallbackFocusId="wizard-title" title="Сбросить черновик?" description="Настройки мастера на этом устройстве будут удалены" cancelLabel="Оставить черновик" confirmLabel="Сбросить черновик" onCancel={() => { if (!resetPending) setResetOpen(false); }} onConfirm={() => {
      if (resetPending || !onReset) return;
      setResetPending(true);
      void onReset().then(success => { if (active.current) { setResetPending(false); if (success) { touched.current = false; setResetOpen(false); setErrors({}); } } });
    }} />}
    <h1 id="wizard-title" tabIndex={-1}>{titles[draft.step - 1]}</h1>
    <div ref={content} className="has-sticky-actions">
      {draft.step === 1 && <PeopleStep draft={draft} onChange={change} errors={errors} disabled={resetPending} />}
      {draft.step === 2 && <BudgetStep draft={draft} onChange={change} errors={errors} disabled={resetPending} />}
      {draft.step === 3 && <ExclusionsStep draft={draft} onChange={change} errors={errors} disabled={resetPending} />}
      {draft.step === 4 && <HomeProductsStep draft={draft} onChange={change} errors={errors} disabled={resetPending} />}
      {reviewed && <DraftReview draft={draft} />}
    </div>
    <div ref={footer} className="sticky-actions grid grid-cols-1 md:grid-cols-2 gap-2">
      <Button disabled={resetPending} onClick={event => { setErrors({}); if (draft.step === 1) { setDialogTrigger(event.currentTarget); setExitOpen(true); } else change({ type: 'step', value: (draft.step - 1) as Step }); }}>Назад</Button>
      {draft.step < 4 && <Button variant="primary" disabled={resetPending} onClick={next}>Далее</Button>}
      {draft.step === 4 && <Button variant="primary" disabled={resetPending} onClick={review}>Проверить настройки</Button>}
    </div>
    {exitOpen && <ConfirmDialog returnFocus={dialogTrigger} title="Выйти из мастера?" description={saved ? 'Черновик останется на этом устройстве' : 'Изменения не сохранены на этом устройстве'} cancelLabel="Продолжить настройку" confirmLabel="Выйти из мастера" onCancel={() => setExitOpen(false)} onConfirm={() => navigate('/')} />}
  </section>;
}
