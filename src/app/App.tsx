import React, { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Link, Navigate, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router';
import { createDraft, draftReducer, type DraftAction, type SettingsDraft } from '../domain/settings';
import { createGuestDraftAdapter, type GuestDraftPort } from '../adapters/guestDraft';
import { Wizard } from '../features/wizard/Wizard';
import { Button, ConfirmDialog, Status } from '../shared/ui';
import { createGenerationController, visiblePlanSnapshot } from '../features/generation/controller';
import { createActivePlanAdapter, type ActivePlanPort } from '../adapters/activePlan';
import { createVersionedGeneration } from '../adapters/generation';
import { bundledCatalogPort, sourceApprovedCatalogPorts } from '../data/catalog';
import { trustedCatalogs as defaultTrustedCatalogs, type TrustedCatalogRegistry } from '../adapters/trustedCatalogs';
import type { CatalogLoadResult, CatalogPort } from '../domain/catalog';
import { buildAppliedSettings, sameSnapshot, selectQuickStartInput, type AppliedSettings } from '../domain/appliedSettings';
import { createPlanInputs, type GenerationPort } from '../domain/plan';
import { GenerationPage } from '../features/generation/GenerationPage';
import { MenuPage } from '../features/menu/MenuPage';
import { ShoppingPage } from '../features/shopping/ShoppingPage';
import { RecipePage } from '../features/recipe/RecipePage';
import { PlanLoading } from '../features/plan/PlanLoading';
import { createGenerationSeed } from './generationSeed';
import '../shared/styles/tokens.css';

export const appConfig = { brand: 'MealPlan' };

export type PlanPresence = { status: 'absent' } | { status: 'valid'; planId: string } | { status: 'pending' } | { status: 'error' };
export interface PlanPresencePort { load(): Promise<unknown> }
const guestDraft = createGuestDraftAdapter();
const activePlan = createActivePlanAdapter();
const localGeneration = createVersionedGeneration(sourceApprovedCatalogPorts);

function parsePresence(value: unknown): PlanPresence {
  if (typeof value !== 'object' || value === null || !('status' in value)) return { status: 'absent' };
  if (value.status === 'pending' || value.status === 'error') return { status: value.status };
  if (value.status === 'valid' && 'planId' in value && typeof value.planId === 'string' && value.planId.trim()) return { status: 'valid', planId: value.planId };
  return { status: 'absent' };
}

export function WelcomePage({ brand = appConfig.brand, onStart, onQuickStart, quickStartBasis }: { brand?: string; onStart(): void; onQuickStart?(): void; quickStartBasis?: string }) {
  return <section className="welcome" aria-labelledby="welcome-title">
    <p className="brand" translate="no">{brand}</p>
    <p className="eyebrow">Питание в вашем ритме</p>
    <h1 id="welcome-title" tabIndex={-1}>Меню с учётом ваших привычек</h1>
    <p>Выберите бюджет, ограничения и продукты дома</p>
    <p className="journey">Настройки → Меню → Покупки</p>
    <Button variant="primary" onClick={onStart}>Составить меню</Button>
    {onQuickStart && <><Button id="quick-start" onClick={onQuickStart}>Меню за 1 клик</Button><p className="hint">{quickStartBasis}</p></>}
    <p className="hint">Без регистрации. Черновик хранится на этом устройстве.</p>
  </section>;
}

interface AppProps {
  draftPort?: GuestDraftPort;
  planPresencePort?: PlanPresencePort;
  brand?: string;
  generationPort?: GenerationPort;
  activePlanPort?: ActivePlanPort;
  catalogPort?: CatalogPort;
  trustedCatalogs?: TrustedCatalogRegistry;
}
type LoadState = 'loading' | 'ready' | 'corrupt' | 'error';
type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export function App({ draftPort = guestDraft, planPresencePort, brand = appConfig.brand, generationPort = localGeneration, activePlanPort = activePlan, catalogPort = bundledCatalogPort, trustedCatalogs = defaultTrustedCatalogs }: AppProps) {
  const controller = useMemo(() => createGenerationController({ generation: generationPort, activePlan: activePlanPort, trustedCatalogs }), [generationPort, activePlanPort, trustedCatalogs]);
  const operation = useSyncExternalStore(controller.subscribe, controller.getSnapshot);
  const [catalog, setCatalog] = useState<CatalogLoadResult | null>(null);
  const [draft, setDraft] = useState(createDraft);
  const currentDraft = useRef(draft);
  const memoryEdited = useRef(false);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [presence, setPresence] = useState<PlanPresence>({ status: 'pending' });
  const revision = useRef(0);
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const mounted = useRef(false);
  const resetting = useRef(false);

  useEffect(() => { void controller.load(); return () => controller.dispose(); }, [controller]);
  useEffect(() => {
    let current = true;
    void catalogPort.load().then(value => { if (current) setCatalog(value); }, () => { if (current) setCatalog({ status: 'invalid', diagnostics: [] }); });
    return () => { current = false; };
  }, [catalogPort]);

  useEffect(() => {
    let active = true;
    mounted.current = true;
    setLoadState('loading');
    setPresence({ status: 'pending' });
    setSaveState('idle');
    memoryEdited.current = false;
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
      if (!planPresencePort) return;
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
    memoryEdited.current = true;
    currentDraft.current = next;
    setDraft(next);
    if (loadState === 'ready') persist(next);
  }

  async function retry() {
    if (resetting.current) return;
    setSaveState('saving');
    if (loadState === 'error') {
      const readRevision = revision.current;
      try {
        const result = await draftPort.load();
        if (!mounted.current || resetting.current || revision.current !== readRevision) return;
        if (result.status === 'error' || result.status === 'corrupt') {
          setLoadState(result.status);
          setSaveState('error');
          return;
        }
        setLoadState('ready');
        // Check after the await: edits made while reading also take precedence.
        if (!memoryEdited.current) {
          currentDraft.current = result.draft;
          setDraft(result.draft);
          setSaveState(result.status === 'loaded' ? 'saved' : 'idle');
          return;
        }
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
      memoryEdited.current = false;
      setDraft(next);
      setLoadState('ready');
      setSaveState('idle');
      return true;
    } catch { if (mounted.current) setSaveState('error'); return false; }
    finally { resetting.current = false; }
  }

  const actualPresence = planPresencePort ? presence : operation.presence;
  const loading = loadState === 'loading' || actualPresence.status === 'pending' || catalog === null;
  return <BrowserRouter>
    <AppLayout brand={brand} loading={loading}>
      {loading ? <InitialLoadStatus /> : <>
        {loadState === 'corrupt' && <div className="notice"><p>Не удалось восстановить настройки. Сохранённые данные повреждены или имеют другую версию</p><p>Можно продолжить в памяти. Исходная запись останется без изменений.</p><Link to="/">На главную</Link></div>}
        {(loadState === 'error' || saveState !== 'idle') && <div className="notice">
          <p role="status">{saveState === 'saving' ? 'Сохраняем настройки…' : loadState === 'error' ? 'Не удалось прочитать настройки. Изменения доступны до закрытия страницы' : saveState === 'saved' ? 'Сохранено на этом устройстве' : 'Не удалось сохранить на этом устройстве. Изменения доступны до закрытия страницы'}</p>
          {(loadState === 'error' || saveState === 'error') && <button type="button" disabled={saveState === 'saving'} onClick={() => void retry()}>Повторить сохранение</button>}
        </div>}
        {actualPresence.status === 'error' && <p className="notice">Не удалось проверить наличие меню. Настройки доступны.</p>}
        <ApplicationRoutes brand={brand} draft={draft} change={change} controller={controller} catalog={catalog!} reloadCatalog={async () => { try { const value = await catalogPort.load(); setCatalog(value); return value; } catch { return { status: 'invalid', diagnostics: [] }; } }} presence={actualPresence} recovery={loadState === 'corrupt' || loadState === 'error'} saved={loadState === 'ready' && saveState === 'saved'} resetDraft={resetDraft} />
      </>}
    </AppLayout>
  </BrowserRouter>;
}

function InitialLoadStatus() {
  const { pathname } = useLocation();
  if (pathname.startsWith('/recipe')) return <PlanLoading kind="recipe" />;
  if (pathname === '/shopping' || pathname === '/menu') return <PlanLoading kind={pathname === '/menu' ? 'menu' : 'shopping'} />;
  return <Status>Восстанавливаем настройки…</Status>;
}

function ApplicationRoutes({ brand, draft, change, controller, catalog, reloadCatalog, presence, recovery, saved, resetDraft }: {
  brand: string; draft: SettingsDraft; change(action: DraftAction): void; controller: ReturnType<typeof createGenerationController>;
  catalog: CatalogLoadResult; reloadCatalog(): Promise<CatalogLoadResult>; presence: PlanPresence; recovery: boolean; saved: boolean; resetDraft(): Promise<boolean>;
}) {
  const operation = useSyncExternalStore(controller.subscribe, controller.getSnapshot);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [launchErrors, setLaunchErrors] = useState<ReturnType<typeof buildAppliedSettings> | null>(null);
  const [catalogError, setCatalogError] = useState(false);
  const [launchConfirmation, setLaunchConfirmation] = useState<{ settings: AppliedSettings; origin: { returnRoute: string; focusAnchor: string }; trigger: HTMLElement | null } | null>(null);
  const returningFocus = useRef<{ route: string; anchor: string } | null>(null);
  const previousRoute = useRef(pathname);
  const launch = useRef<{ settings: AppliedSettings; origin: { returnRoute: string; focusAnchor: string } } | null>(null);
  const catalogAttempt = useRef(0);
  useEffect(() => {
    if ((previousRoute.current === '/plan/generating' && pathname !== '/plan/generating' && operation.status !== 'succeeded')
      || (previousRoute.current === '/menu' && pathname !== '/menu' && operation.intent !== 'edit' && (operation.status === 'pending' || operation.status === 'saving'))) { catalogAttempt.current++; controller.cancel(); }
    previousRoute.current = pathname;
    // Store notifications can commit before React Router's transition. Keep the
    // origin until its destination exists, rather than consuming it on the old page.
    if (returningFocus.current?.route === pathname) {
      const { anchor } = returningFocus.current; returningFocus.current = null;
      requestAnimationFrame(() => (document.getElementById(anchor) ?? document.querySelector<HTMLElement>('h1'))?.focus());
    }
  }, [pathname, controller, operation.status, operation.intent]);
  useEffect(() => {
    if (operation.status === 'succeeded' && pathname === '/plan/generating') navigate('/menu', { replace: true });
  }, [operation.status, pathname, navigate]);
  function start(quick = false, focusAnchor = 'generate-menu') {
    if (operation.status === 'pending' || operation.status === 'saving') return;
    const applied = quick ? selectQuickStartInput(draft, operation.lastApplied) : buildAppliedSettings(draft);
    setLaunchErrors(applied);
    if (applied.status === 'invalid') { change({ type: 'step', value: applied.step }); navigate('/plan/new'); return; }
    setCatalogError(catalog.status !== 'loaded');
    const origin = { returnRoute: pathname, focusAnchor: quick ? 'quick-start' : focusAnchor };
    if (operation.active) {
      setLaunchConfirmation({ settings: applied.settings, origin, trigger: document.getElementById(origin.focusAnchor) }); return;
    }
    performStart(applied.settings, origin);
  }
  function performStart(settings: AppliedSettings, origin: { returnRoute: string; focusAnchor: string }) {
    launch.current = { settings, origin };
    navigate('/plan/generating');
    if (catalog.status === 'loaded') void controller.start(createPlanInputs(settings, catalog.catalog, { seed: createGenerationSeed() }), origin);
  }
  function settings(budget = false) {
    catalogAttempt.current++; controller.cancel(); setCatalogError(false);
    if (budget) change({ type: 'step', value: 2 });
    navigate('/plan/new');
  }
  function cancel() {
    const origin = operation.origin;
    const route = origin?.returnRoute ?? '/plan/new';
    returningFocus.current = { route, anchor: origin?.focusAnchor ?? 'wizard-title' };
    controller.cancel();
    navigate(route);
  }
  async function retryGeneration() {
    if (!catalogError) { await controller.retryGeneration(); return; }
    const atAttempt = ++catalogAttempt.current;
    const loaded = await reloadCatalog();
    if (atAttempt !== catalogAttempt.current || previousRoute.current !== '/plan/generating' || !launch.current) return;
    if (loaded.status === 'loaded') {
      setCatalogError(false);
      await controller.start(createPlanInputs(launch.current.settings, loaded.catalog, { seed: createGenerationSeed() }), launch.current.origin);
    }
  }
  const basis = operation.lastApplied ? 'Используем последние применённые настройки' : sameSnapshot(draft, createDraft())
    ? '2 человека · 7 дней · 3 000 ₽ · до 30 минут · среднее разнообразие · без ограничений' : 'Используем настройки из черновика';
  const visible = visiblePlanSnapshot(operation);
  const editFeedback = operation.intent === 'edit' && ['/menu', '/shopping'].includes(pathname);
  return <>{editFeedback && <div className="plan-read-model" aria-label="Изменение меню">
    {operation.status === 'saving' && <Status>Сохраняем изменения меню…</Status>}
    {operation.status === 'succeeded' && <Status>Изменения сохранены</Status>}
    {operation.status === 'memory-only' && <div role="alert" className="notice">
      {operation.saveError === 'blocked' ? <><p>Меню изменилось. Обновите его перед новой правкой</p><Button onClick={() => void controller.retryLoad()}>Обновить меню</Button></>
        : <><p>Не удалось сохранить изменения. Восстановлено прежнее меню</p><Button onClick={() => void controller.retrySave()}>Повторить сохранение</Button></>}
    </div>}
    {operation.status === 'error' && <div role="alert" className="notice"><p>{operation.error?.message}</p></div>}
  </div>}<Routes>
    <Route path="/" element={presence.status === 'valid' ? <Navigate replace to="/menu" /> : <WelcomePage brand={brand} onStart={() => navigate('/plan/new')} onQuickStart={() => start(true)} quickStartBasis={basis} />} />
    <Route path="/plan/new" element={<Wizard draft={draft} onChange={change} recovery={recovery} saved={saved} onReset={resetDraft} onStart={anchor => start(false, anchor)} launchErrors={launchErrors?.status === 'invalid' ? launchErrors.errors : undefined} editingNext={!!operation.lastApplied && !sameSnapshot(draft, operation.lastApplied.raw)} />} />
    <Route path="/plan/generating" element={<GenerationPage snapshot={operation} requestedSettings={launch.current?.settings} catalog={catalog} catalogError={catalogError} draftSaved={saved} onCancel={cancel} onRetry={() => void retryGeneration()} onSettings={settings} onRetrySave={() => void controller.retrySave()} onRetryLoad={() => void controller.retryLoad()} />} />
    <Route path="/menu" element={<MenuPage snapshot={visible} mealAlternatives={{ request: controller.mealAlternatives, select: (target, recipeId, revision) => void controller.editMeal(target, recipeId, revision, { returnRoute: '/menu', focusAnchor: 'menu-title' }) }}
      onRemove={(target, expectedPlan) => void controller.removeMeal(target, expectedPlan, { returnRoute: '/menu', focusAnchor: 'menu-title' })}
      onRetryLoad={() => void controller.retryLoad()} onSelectVariant={id => void controller.selectVariant(id, { returnRoute: '/menu', focusAnchor: 'variants' })} onRetrySave={() => void controller.retrySave()} onCancel={controller.cancel} onAppend={() => void controller.appendVariant({ returnRoute: '/menu', focusAnchor: 'append-variant' })} onRetryGeneration={() => void controller.retryGeneration()} onRecreate={focusAnchor => void controller.recreateSet({ returnRoute: '/menu', focusAnchor })} />} />
    <Route path="/shopping" element={<ShoppingPage snapshot={visible} onRetryLoad={() => void controller.retryLoad()} />} />
    <Route path="/pantry" element={<GuestSectionPage section="pantry" />} />
    <Route path="/recipe/:id?" element={<RecipePage snapshot={visible} catalog={catalog} onRetry={source => source === 'plan' ? controller.retryLoad() : reloadCatalog()} />} />
    <Route path="*" element={<RouteStatePage title="Страница не найдена" description="Проверьте адрес или начните с главной страницы." to="/" action="На главную" />} />
  </Routes>{launchConfirmation && <ConfirmDialog title="Составить меню с новыми настройками?" description={`После успешного сохранения новое меню заменит прежний набор вариантов.${saved ? ' Черновик настроек сохранится' : ''}`} cancelLabel="Оставить варианты" confirmLabel="Составить меню" returnFocus={launchConfirmation.trigger} fallbackFocusId="wizard-title" onCancel={() => setLaunchConfirmation(null)} onConfirm={() => {
    const confirmed = launchConfirmation; setLaunchConfirmation(null); performStart(confirmed.settings, confirmed.origin);
  }} />}</>;
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
  const [profileTrigger, setProfileTrigger] = useState<HTMLElement | null>(null);
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
        <button type="button" onClick={event => { setProfileTrigger(event.currentTarget); setProfileOpen(true); }} aria-haspopup="dialog"><NavIcon path="M20 21v-2a7 7 0 0 0-14 0v2M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8" /><span>Профиль</span></button>
      </nav>
    </>}
    <main id="main" tabIndex={-1}>{children}</main>
    {profileOpen && <ConfirmDialog returnFocus={profileTrigger} title="Гостевой профиль" description="Вы пользуетесь гостевым режимом. Профиль появится позже" cancelLabel="Закрыть пояснение" confirmLabel="Вернуться к меню" onCancel={() => setProfileOpen(false)} onConfirm={() => {
      setProfileOpen(false);
      navigate('/menu');
      requestAnimationFrame(() => shell.current?.querySelector<HTMLElement>('h1')?.focus());
    }} />}
  </div>;
}

const rootElement = document.getElementById('root');
if (rootElement) createRoot(rootElement).render(<App />);
