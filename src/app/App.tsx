import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Link, Navigate, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router';
import { createDraft, draftReducer, type DraftAction, type SettingsDraft } from '../domain/settings';
import { createGuestDraftAdapter, type GuestDraftPort } from '../adapters/guestDraft';
import { Wizard } from '../features/wizard/Wizard';
import { Button, ConfirmDialog, Status } from '../shared/ui';
import '../shared/styles/tokens.css';

export const appConfig = { brand: 'MealPlan' };

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

export function WelcomePage({ brand = appConfig.brand, onStart }: { brand?: string; onStart(): void }) {
  return <section className="welcome" aria-labelledby="welcome-title">
    <p className="brand" translate="no">{brand}</p>
    <p className="eyebrow">Питание в вашем ритме</p>
    <h1 id="welcome-title" tabIndex={-1}>Меню с учётом ваших привычек</h1>
    <p>Выберите бюджет, ограничения и продукты дома</p>
    <p className="journey">Настройки → Меню → Покупки</p>
    <Button variant="primary" onClick={onStart}>Составить меню</Button>
    <p className="hint">Без регистрации. Черновик хранится на этом устройстве.</p>
  </section>;
}

interface AppProps {
  draftPort?: GuestDraftPort;
  planPresencePort?: PlanPresencePort;
  brand?: string;
}
type LoadState = 'loading' | 'ready' | 'corrupt' | 'error';
type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export function App({ draftPort = guestDraft, planPresencePort = noPlan, brand = appConfig.brand }: AppProps) {
  const [draft, setDraft] = useState(createDraft);
  const currentDraft = useRef(draft);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [presence, setPresence] = useState<PlanPresence>({ status: 'pending' });
  const revision = useRef(0);
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const mounted = useRef(false);
  const resetting = useRef(false);

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
          if (result.status === 'loaded') setSaveState('saved');
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
      if (!mounted.current || resetting.current || request !== revision.current) return;
      try {
        const result = await draftPort.save(next);
        if (mounted.current && revision.current === request) setSaveState(result.status === 'saved' ? 'saved' : 'error');
      } catch { if (mounted.current && revision.current === request) setSaveState('error'); }
    });
  }

  function change(action: DraftAction) {
    if (resetting.current || loadState === 'loading') return;
    const next = draftReducer(currentDraft.current, action);
    currentDraft.current = next;
    setDraft(next);
    if (loadState === 'ready') persist(next);
  }

  async function retry() {
    if (resetting.current) return;
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

  async function resetDraft() {
    resetting.current = true;
    revision.current++;
    setSaveState('saving');
    // Let an already-started write finish before deleting this exact key.
    await saveQueue.current.catch(() => undefined);
    try {
      const result = await draftPort.reset();
      if (!mounted.current) return false;
      if (result.status !== 'saved') { setSaveState('error'); return false; }
      const next = createDraft();
      currentDraft.current = next;
      setDraft(next);
      setLoadState('ready');
      setSaveState('idle');
      return true;
    } catch { if (mounted.current) setSaveState('error'); return false; }
    finally { resetting.current = false; }
  }

  const loading = loadState === 'loading' || presence.status === 'pending';
  return <BrowserRouter>
    <AppLayout brand={brand} loading={loading}>
      {loading ? <Status>Восстанавливаем настройки…</Status> : <>
        {loadState === 'corrupt' && <div className="notice"><p>Не удалось восстановить настройки. Сохранённые данные повреждены или имеют другую версию</p><p>Можно продолжить в памяти. Исходная запись останется без изменений.</p><Link to="/">На главную</Link></div>}
        {(loadState === 'error' || saveState !== 'idle') && <div className="notice">
          <p role="status">{saveState === 'saving' ? 'Сохраняем настройки…' : loadState === 'error' ? 'Не удалось прочитать настройки. Изменения доступны до закрытия страницы' : saveState === 'saved' ? 'Сохранено на этом устройстве' : 'Не удалось сохранить на этом устройстве. Изменения доступны до закрытия страницы'}</p>
          {(loadState === 'error' || saveState === 'error') && <button type="button" disabled={saveState === 'saving'} onClick={() => void retry()}>Повторить сохранение</button>}
        </div>}
        {presence.status === 'error' && <p className="notice">Не удалось проверить наличие меню. Настройки доступны.</p>}
        <Routes>
          <Route path="/" element={presence.status === 'valid' ? <Navigate replace to="/menu" /> : <StartPage brand={brand} />} />
          <Route path="/plan/new" element={<Wizard draft={draft} onChange={change} recovery={loadState === 'corrupt' || loadState === 'error'} saved={loadState === 'ready' && saveState === 'saved'} onReset={resetDraft} />} />
          <Route path="/plan/generating" element={<RouteStatePage title="Генерация не запущена" description="Откройте настройки питания, чтобы подготовить меню." to="/plan/new" action="К настройкам" />} />
          <Route path="/menu" element={<GuestSectionPage section="menu" />} />
          <Route path="/shopping" element={<GuestSectionPage section="shopping" />} />
          <Route path="/pantry" element={<GuestSectionPage section="pantry" />} />
          <Route path="/recipe/:id" element={<RouteStatePage title="Такого рецепта нет" description="Рецепт не найден. Вы можете вернуться к своему меню." to="/menu" action="Вернуться к меню" />} />
          <Route path="*" element={<RouteStatePage title="Страница не найдена" description="Проверьте адрес или начните с главной страницы." to="/" action="На главную" />} />
        </Routes>
      </>}
    </AppLayout>
  </BrowserRouter>;
}

export function RouteStatePage({ title, description, to, action }: { title: string; description: string; to: string; action: string }) {
  return <section className="route-state"><h1 tabIndex={-1}>{title}</h1><p>{description}</p><Link className="primary action-link" to={to}>{action}</Link></section>;
}

export function GuestSectionPage({ section }: { section: 'menu' | 'shopping' | 'pantry' }) {
  const title = section === 'menu' ? 'Меню пока нет' : section === 'shopping' ? 'Сначала составьте меню' : 'Добавьте, что есть дома, и мы не купим лишнего';
  return <RouteStatePage title={title} description={section === 'pantry' ? 'Продукты можно указать при настройке меню. Складские запасы пока не ведутся.' : 'Начните с настроек питания'} to="/plan/new" action={section === 'pantry' ? 'Указать продукты в мастере' : 'Составить меню'} />;
}

const navItems = [{ to: '/menu', label: 'Меню', path: 'M4 3v18M8 3v7H4m4-7v7m5-7v18m0-18c7 1 7 9 0 10' }, { to: '/shopping', label: 'Покупки', path: 'M3 3h2l3 12h10l3-9H6m3 14h.01M18 20h.01' }, { to: '/pantry', label: 'Дома', path: 'm3 10 9-7 9 7M5 9v12h14V9m-10 12v-7h6v7' }];
function NavIcon({ path }: { path: string }) {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={path} /></svg>;
}

function AppLayout({ brand, loading, children }: { brand: string; loading: boolean; children: React.ReactNode }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const shell = useRef<HTMLDivElement>(null);
  const nav = useRef<HTMLElement>(null);
  const fullscreen = pathname === '/plan/new' || pathname === '/plan/generating';
  useEffect(() => {
    if (!loading) shell.current?.querySelector<HTMLElement>('h1')?.focus();
  }, [pathname, loading]);
  useEffect(() => {
    const element = nav.current;
    const host = shell.current;
    if (!element || !host) return;
    const measure = () => host.style.setProperty('--nav-height', `${element.getBoundingClientRect().height}px`);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [fullscreen]);
  return <div className={`app-shell${fullscreen ? ' fullscreen' : ''}`} ref={shell}>
    <a className="skip-link" href="#main">К содержимому</a>
    {!fullscreen && <>
      <header className="app-header">{pathname !== '/' && <Link className="brand brand-link" to="/" translate="no">{brand}</Link>}<Link className="new-menu" to="/plan/new"><span aria-hidden="true">+ </span>Новое меню</Link></header>
      <nav className="app-nav" aria-label="Основные разделы" ref={nav}>
        {navItems.map(item => <NavLink key={item.to} to={item.to} end><NavIcon path={item.path} /><span>{item.label}</span></NavLink>)}
        <button type="button" onClick={() => setProfileOpen(true)} aria-haspopup="dialog"><NavIcon path="M20 21v-2a7 7 0 0 0-14 0v2M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8" /><span>Профиль</span></button>
      </nav>
    </>}
    <main id="main" tabIndex={-1}>{children}</main>
    {profileOpen && <ConfirmDialog title="Гостевой профиль" description="Вы пользуетесь гостевым режимом. Профиль появится позже" cancelLabel="Закрыть пояснение" confirmLabel="Вернуться к меню" onCancel={() => setProfileOpen(false)} onConfirm={() => {
      setProfileOpen(false);
      navigate('/menu');
      requestAnimationFrame(() => shell.current?.querySelector<HTMLElement>('h1')?.focus());
    }} />}
  </div>;
}

function StartPage({ brand }: { brand: string }) {
  // A single route instance owns the draft; repeat activation never creates a second wizard.
  const [started, setStarted] = useState(false);
  return started ? <Navigate to="/plan/new" /> : <WelcomePage brand={brand} onStart={() => setStarted(true)} />;
}

const rootElement = document.getElementById('root');
if (rootElement) createRoot(rootElement).render(<App />);
