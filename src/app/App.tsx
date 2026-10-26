import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Link, Navigate, Route, Routes } from 'react-router';
import { createDraft, draftReducer, type DraftAction, type SettingsDraft } from '../domain/settings';
import { createGuestDraftAdapter, type GuestDraftPort } from '../adapters/guestDraft';

export type PlanPresence = { status: 'absent' } | { status: 'valid'; planId: string } | { status: 'pending' } | { status: 'error' };
export interface PlanPresencePort { load(): Promise<unknown> }
const noPlan: PlanPresencePort = { async load() { return { status: 'absent' }; } };
const guestDraft = createGuestDraftAdapter();

function parsePresence(value: unknown): PlanPresence {
  if (typeof value !== 'object' || value === null || !('status' in value)) return { status: 'absent' };
  if (value.status === 'pending' || value.status === 'error') return { status: value.status };
  if (value.status === 'valid' && 'planId' in value && typeof value.planId === 'string' && value.planId.trim()) return { status: 'valid', planId: value.planId };
  return { status: 'absent' };
}

export function WelcomePage({ brand = 'MealPlan', onStart }: { brand?: string; onStart(): void }) {
  return <section className="welcome" aria-labelledby="welcome-title">
    <p className="brand" translate="no">{brand}</p>
    <p className="eyebrow">Питание в вашем ритме</p>
    <h1 id="welcome-title">Меню с учётом ваших привычек</h1>
    <p>Выберите бюджет, ограничения и продукты дома</p>
    <p className="journey">Настройки → Меню → Покупки</p>
    <button className="primary" type="button" onClick={onStart}>Составить меню</button>
    <p className="hint">Без регистрации. Черновик хранится на этом устройстве.</p>
  </section>;
}

export function Wizard({ draft, onChange }: { draft: SettingsDraft; onChange(action: DraftAction): void }) {
  const people = Number(draft.people);
  return <section className="wizard" aria-labelledby="wizard-title">
    <Link className="back" to="/">На главную</Link>
    <p className="eyebrow">Шаг {draft.step} из 4</p>
    <div className="steps" role="progressbar" aria-label="Настройка меню" aria-valuemin={0} aria-valuemax={4} aria-valuenow={draft.step}>
      {[1, 2, 3, 4].map(step => <span key={step} className={step <= draft.step ? 'filled' : ''} />)}
    </div>
    <h1 id="wizard-title">Для кого составляем меню</h1>
    <p>Укажите, сколько человек будет за столом.</p>
    <div className="card">
      <label htmlFor="people">Число людей</label>
      <div className="stepper">
        <button type="button" aria-label="Уменьшить число людей" disabled={!Number.isInteger(people) || people <= 1} onClick={() => onChange({ type: 'set', field: 'people', value: String(Math.max(1, people - 1)) })}>−</button>
        <input id="people" name="people" type="number" inputMode="numeric" autoComplete="off" min={1} max={10} value={draft.people} onChange={event => onChange({ type: 'set', field: 'people', value: event.target.value })} aria-describedby="people-hint" />
        <button type="button" aria-label="Увеличить число людей" disabled={!Number.isInteger(people) || people >= 10} onClick={() => onChange({ type: 'set', field: 'people', value: String(Math.min(10, people + 1)) })}>+</button>
      </div>
      <p id="people-hint" className="hint">От 1 до 10 человек. Значение сохраняется автоматически.</p>
    </div>
  </section>;
}

interface AppProps {
  draftPort?: GuestDraftPort;
  planPresencePort?: PlanPresencePort;
  brand?: string;
}
type LoadState = 'loading' | 'ready' | 'corrupt' | 'error';
type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export function App({ draftPort = guestDraft, planPresencePort = noPlan, brand = 'MealPlan' }: AppProps) {
  const [draft, setDraft] = useState(createDraft);
  const currentDraft = useRef(draft);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [presence, setPresence] = useState<PlanPresence>({ status: 'pending' });
  const revision = useRef(0);
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const mounted = useRef(false);

  useEffect(() => {
    let active = true;
    mounted.current = true;
    setLoadState('loading');
    setPresence({ status: 'pending' });
    setSaveState('idle');
    const readDraft = async () => {
      try {
        const result = await draftPort.load();
        if (!active) return;
        if (result.status === 'loaded' || result.status === 'missing') {
          currentDraft.current = result.draft;
          setDraft(result.draft);
          setLoadState('ready');
        } else setLoadState(result.status);
      } catch { if (active) setLoadState('error'); }
    };
    const readPresence = async () => {
      try { const result = parsePresence(await planPresencePort.load()); if (active) setPresence(result); }
      catch { if (active) setPresence({ status: 'error' }); }
    };
    void readDraft();
    void readPresence();
    return () => { active = false; mounted.current = false; revision.current++; };
  }, [draftPort, planPresencePort]);

  function persist(next: SettingsDraft) {
    const request = ++revision.current;
    setSaveState('saving');
    saveQueue.current = saveQueue.current.catch(() => undefined).then(async () => {
      try {
        const result = await draftPort.save(next);
        if (mounted.current && revision.current === request) setSaveState(result.status === 'saved' ? 'saved' : 'error');
      } catch { if (mounted.current && revision.current === request) setSaveState('error'); }
    });
  }

  function change(action: DraftAction) {
    const next = draftReducer(currentDraft.current, action);
    currentDraft.current = next;
    setDraft(next);
    if (loadState === 'ready') persist(next);
  }

  async function retry() {
    setSaveState('saving');
    if (loadState === 'error') {
      try {
        const result = await draftPort.load();
        if (!mounted.current) return;
        if (result.status === 'error' || result.status === 'corrupt') {
          setLoadState(result.status);
          setSaveState('error');
          return;
        }
        setLoadState('ready');
      } catch { if (mounted.current) setSaveState('error'); return; }
    }
    persist(currentDraft.current);
  }

  const loading = loadState === 'loading' || presence.status === 'pending';
  return <BrowserRouter>
    <a className="skip-link" href="#main">К содержимому</a>
    <main id="main">
      {loading ? <p role="status">Восстанавливаем настройки…</p> : <>
        {loadState === 'corrupt' && <div className="notice"><p>Не удалось восстановить настройки. Сохранённые данные повреждены или имеют другую версию</p><p>Можно продолжить в памяти. Исходная запись останется без изменений.</p><Link to="/">На главную</Link></div>}
        {(loadState === 'error' || saveState !== 'idle') && <div className="notice">
          <p role="status">{loadState === 'error' ? 'Не удалось прочитать настройки. Изменения доступны до закрытия страницы' : saveState === 'saving' ? 'Сохраняем настройки…' : saveState === 'saved' ? 'Сохранено на этом устройстве' : 'Не удалось сохранить на этом устройстве. Изменения доступны до закрытия страницы'}</p>
          {(loadState === 'error' || saveState === 'error') && <button type="button" disabled={saveState === 'saving'} onClick={() => void retry()}>Повторить сохранение</button>}
        </div>}
        {presence.status === 'error' && <p className="notice">Не удалось проверить наличие меню. Настройки доступны.</p>}
        <Routes>
          <Route path="/" element={presence.status === 'valid' ? <Navigate replace to="/menu" /> : <StartPage brand={brand} />} />
          <Route path="/plan/new" element={<Wizard draft={draft} onChange={change} />} />
          <Route path="/menu" element={<section><h1>Меню пока нет</h1><p>Начните с настроек питания</p><Link to="/plan/new">Составить меню</Link></section>} />
          <Route path="*" element={<section><h1>Страница не найдена</h1><Link to="/">На главную</Link></section>} />
        </Routes>
      </>}
    </main>
  </BrowserRouter>;
}

function StartPage({ brand }: { brand: string }) {
  // A single route instance owns the draft; repeat activation never creates a second wizard.
  const [started, setStarted] = useState(false);
  return started ? <Navigate to="/plan/new" /> : <WelcomePage brand={brand} onStart={() => setStarted(true)} />;
}

const rootElement = document.getElementById('root');
if (rootElement) createRoot(rootElement).render(<App />);
