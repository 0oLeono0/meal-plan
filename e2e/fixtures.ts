import { expect, type Page } from '@playwright/test';
import type { SettingsDraft } from '../src/domain/settings';

export const draftKey = 'mealplan:guest:draft:v1';
export interface AppFixtureOptions {
  draft?: Partial<SettingsDraft>;
  raw?: string;
  readDelay?: number;
  writeDelay?: number;
  failRead?: boolean;
  failWrite?: boolean;
  failReset?: boolean;
  presence?: unknown;
}

/** Only test modules replace ports. Each Playwright context owns its storage. */
export async function mountAppFixture(page: Page, options: AppFixtureOptions = {}) {
  await page.goto('/plan/new');
  await expect(page.getByLabel('Число людей', { exact: true })).toBeVisible();
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
    const key = 'mealplan:guest:draft:v1';
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
    const draftPort = {
      async load() { await delay(options.readDelay); return adapter.load(); },
      async save(draft: SettingsDraft) { await delay(options.writeDelay); return adapter.save(draft); },
      reset: () => adapter.reset(),
    };
    document.getElementById('root')?.remove();
    const container = document.createElement('div');
    document.body.append(container);
    createRoot(container).render(createElement(App, { draftPort, planPresencePort: { load: async () => options.presence ?? { status: 'absent' } } }));
  }, options);
}
