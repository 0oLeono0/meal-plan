import { expect, type Page } from '@playwright/test';
import type { SettingsDraft } from '../src/domain/settings';

export const draftKey = 'mealplan:guest:draft:v1';
export interface AppFixtureOptions {
  draft?: Partial<SettingsDraft>;
  raw?: string;
  readDelay?: number;
  holdRetryRead?: boolean;
  writeDelay?: number;
  failRead?: boolean;
  failWrite?: boolean;
  failReset?: boolean;
  presence?: unknown;
  route?: string;
  activeRaw?: string;
  operation?: 'pending' | 'failure' | 'save-failure';
  activeRead?: 'pending' | 'error';
}

/** Only test modules replace ports. Each Playwright context owns its storage. */
export async function mountAppFixture(page: Page, options: AppFixtureOptions = {}) {
  await page.goto('/plan/new');
  await expect(page.getByRole('progressbar', { name: 'Настройка меню' })).toBeVisible();
  await page.evaluate(async options => {
    const resources = performance.getEntriesByType('resource').map(entry => entry.name);
    const reactUrl = resources.find(url => /\/react\.js\?/.test(url));
    const rootUrl = resources.find(url => /\/react-dom_client\.js\?/.test(url));
    if (!reactUrl || !rootUrl) throw new Error('Actual React module URLs were not observed');
    const { default: { createElement } } = await import(reactUrl);
    const { default: { createRoot } } = await import(rootUrl);
    const appPath = '/src/app/App.tsx';
    const adapterPath = '/src/adapters/guestDraft.ts';
    const domainPath = '/src/domain/settings.ts';
    const { App } = await import(appPath);
    const { createGuestDraftAdapter } = await import(adapterPath);
    const { createDraft } = await import(domainPath);
    const activePath = '/src/adapters/activePlan.ts', generationPath = '/src/adapters/generation.ts', catalogPath = '/src/data/catalog.ts';
    const { createActivePlanAdapter } = await import(activePath);
    const { createLocalGeneration } = await import(generationPath);
    const { bundledCatalogPort } = await import(catalogPath);
    const key = 'mealplan:guest:draft:v1';
    if (options.activeRaw !== undefined) localStorage.setItem('mealplan:guest:active-plan:v1', options.activeRaw);
    if (options.raw !== undefined) localStorage.setItem(key, options.raw);
    else if (options.draft) localStorage.setItem(key, JSON.stringify({ schemaVersion: 1, draft: { ...createDraft(), ...options.draft } }));
    localStorage.setItem('sentinel', 'keep');
    localStorage.setItem('mealplan:confirmed', 'confirmed');
    localStorage.setItem('mealplan:pantry', 'pantry');
    const adapter = createGuestDraftAdapter(() => ({
      getItem(key: string) {
        if (options.failRead && !sessionStorage.getItem('allow-read')) throw new Error('read denied');
        return localStorage.getItem(key);
      },
      setItem(key: string, value: string) {
        if (options.failWrite && !sessionStorage.getItem('allow-write')) throw new Error('quota');
        localStorage.setItem(key, value);
      },
      removeItem(key: string) {
        if (options.failReset && !sessionStorage.getItem('allow-reset')) throw new Error('remove denied');
        localStorage.removeItem(key);
      },
    }));
    const delay = (ms = 0) => new Promise(resolve => setTimeout(resolve, ms));
    let reads = 0;
    const draftPort = {
      async load() {
        await delay(options.readDelay);
        const result = await adapter.load();
        if (++reads > 1 && options.holdRetryRead) {
          sessionStorage.setItem('retry-read-pending', 'yes');
          await new Promise<void>(resolve => window.addEventListener('release-retry-read', () => resolve(), { once: true }));
        }
        return result;
      },
      async save(draft: SettingsDraft) { await delay(options.writeDelay); return adapter.save(draft); },
      reset: () => adapter.reset(),
    };
    const activeAdapter = createActivePlanAdapter(() => ({
      getItem: (key: string) => localStorage.getItem(key),
      setItem(key: string, value: string) {
        if (options.operation === 'save-failure' && !sessionStorage.getItem('allow-plan-write')) throw new Error('quota');
        localStorage.setItem(key, value);
      },
    }));
    const activePlanPort = {
      async load() {
        if (options.activeRead === 'pending') await new Promise<void>(resolve => window.addEventListener('release-active-read', () => resolve(), { once: true }));
        if (options.activeRead === 'error' && !sessionStorage.getItem('allow-active-read')) return { status: 'error' as const };
        return activeAdapter.load();
      },
      save: activeAdapter.save,
    };
    const actualGeneration = createLocalGeneration(bundledCatalogPort);
    const generationPort = { async generate(...args: Parameters<typeof actualGeneration.generate>) {
      sessionStorage.setItem('fixture-search-count', String(Number(sessionStorage.getItem('fixture-search-count') ?? 0) + 1));
      if (options.operation === 'pending') await new Promise<void>(resolve => window.addEventListener('release-generation', () => resolve(), { once: true }));
      if (options.operation === 'failure' && !sessionStorage.getItem('allow-generation')) return { status: 'error' as const, error: { code: 'FAILED' as const, message: 'Test-only failure', diagnostics: [] } };
      return actualGeneration.generate(...args);
    } };
    document.getElementById('root')?.remove();
    const container = document.createElement('div');
    document.body.append(container);
    history.replaceState({}, '', options.route ?? '/plan/new');
    createRoot(container).render(createElement(App, { draftPort,
      ...(options.presence === undefined ? {} : { planPresencePort: { load: async () => options.presence } }),
      ...(options.operation || options.activeRead ? { activePlanPort, generationPort } : {}),
    }));
  }, options);
}
