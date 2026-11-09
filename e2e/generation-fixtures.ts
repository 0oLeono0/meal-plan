import { expect, type Page } from '@playwright/test';
import type { GenerationError, GenerationPort } from '../src/domain/plan';
import type { ActivePlanPort } from '../src/adapters/activePlan';
import type { SettingsDraft } from '../src/domain/settings';

export const activeKey = 'mealplan:guest:active-plan:v1';
interface Options {
  draft?: Partial<SettingsDraft>;
  route?: string;
  activeRaw?: string;
  deferGeneration?: boolean;
  deferSave?: boolean;
  failWrite?: boolean;
  failRead?: boolean;
  holdRetryRead?: boolean;
  error?: GenerationError;
}

/** Test-only hostile async ports. Every success uses the real source-backed adapter.
 * Deliberately ignore generation abort to deliver a genuine late success; the
 * production controller must reject it. Final writes retain the actual guard.
 */
export async function mountGeneration(page: Page, options: Options = {}) {
  await page.goto('/plan/new');
  await expect(page.getByLabel('Число людей', { exact: true })).toBeVisible();
  await page.evaluate(async options => {
    const urls = performance.getEntriesByType('resource').map(row => row.name);
    const reactUrl = urls.find(url => /\/react\.js\?/.test(url));
    const rootUrl = urls.find(url => /\/react-dom_client\.js\?/.test(url));
    if (!reactUrl || !rootUrl) throw new Error('Actual React modules not observed');
    const { default: { createElement } } = await import(reactUrl);
    const { default: { createRoot } } = await import(rootUrl);
    const appPath = '/src/app/App.tsx', activePath = '/src/adapters/activePlan.ts';
    const generationPath = '/src/adapters/generation.ts', catalogPath = '/src/data/catalog.ts';
    const { App } = await import(appPath);
    const { createActivePlanAdapter } = await import(activePath);
    const { createLocalGeneration } = await import(generationPath);
    const { bundledCatalogPort } = await import(catalogPath);
    if (options.draft) {
      const settingsPath = '/src/domain/settings.ts';
      const { createDraft } = await import(settingsPath);
      localStorage.setItem('mealplan:guest:draft:v1', JSON.stringify({ schemaVersion: 1, draft: { ...createDraft(), ...options.draft } }));
    }
    if (options.activeRaw !== undefined) localStorage.setItem('mealplan:guest:active-plan:v1', options.activeRaw);
    localStorage.setItem('sentinel', 'keep'); localStorage.setItem('mealplan:pantry', 'pantry-sentinel');
    const count = (key: string) => {
      const next = Number(sessionStorage.getItem(key) ?? 0) + 1;
      sessionStorage.setItem(key, String(next)); return next;
    };
    const release = (name: string) => new Promise<void>(resolve => window.addEventListener(name, () => resolve(), { once: true }));
    const adapter = createActivePlanAdapter(() => ({
      getItem(key: string) {
        if (options.failRead && !sessionStorage.getItem('allow-read')) throw new Error('Controlled read denial');
        return localStorage.getItem(key);
      },
      setItem(key: string, value: string) {
        if (options.failWrite && !sessionStorage.getItem('allow-write')) throw new Error('Controlled quota');
        localStorage.setItem(key, value); count('final-writes');
      },
    }));
    const activePlanPort: ActivePlanPort = {
      async load() {
        const n = count('active-reads');
        if (n > 1 && options.holdRetryRead) await release(`release-read-${n}`);
        return adapter.load();
      },
      async save(plan, guard) {
        const n = count('save-calls');
        if (options.deferSave) await release(`release-save-${n}`);
        const result = await adapter.save(plan, guard);
        sessionStorage.setItem(`save-result-${n}`, result.status);
        return result;
      },
    };
    const actual = createLocalGeneration(bundledCatalogPort);
    const generationPort: GenerationPort = { async generate(request) {
      const n = count('generation-calls');
      if (options.deferGeneration) await release(`release-generation-${n}`);
      const result = options.error && !sessionStorage.getItem('allow-generation')
        ? { status: 'error' as const, error: options.error }
        : await actual.generate(request, new AbortController().signal);
      sessionStorage.setItem(`generation-result-${n}`, result.status);
      window.dispatchEvent(new Event(`fixture-complete-generation-${n}`));
      return result;
    } };
    document.getElementById('root')?.remove();
    const container = document.createElement('div'); document.body.append(container);
    history.replaceState({}, '', options.route ?? '/plan/new');
    createRoot(container).render(createElement(App, { generationPort, activePlanPort }));
  }, options);
  await expect(page.getByRole('heading').first()).toBeVisible();
  await expect.poll(() => page.evaluate(() => sessionStorage.getItem('active-reads'))).toBe('1');
}

export async function release(page: Page, name: string) {
  if (name.startsWith('generation-')) {
    // Release the controlled response and await its real port completion under
    // the existing test deadline. The subsequent assertions retain their 5s.
    await page.evaluate(name => new Promise<void>(resolve => {
      window.addEventListener(`fixture-complete-${name}`, () => resolve(), { once: true });
      window.dispatchEvent(new Event(`release-${name}`));
    }), name);
  } else await page.evaluate(name => window.dispatchEvent(new Event(`release-${name}`)), name);
}
export async function count(page: Page, key: string) { return page.evaluate(key => Number(sessionStorage.getItem(key) ?? 0), key); }
export async function finishWizard(page: Page, confirmReplacement = false) {
  for (let step = 2; step <= 4; step++) {
    await page.getByRole('button', { name: 'Далее', exact: true }).click();
    await expect(page.getByText(`Шаг ${step} из 4`)).toBeVisible();
    if (step < 4) await page.waitForTimeout(270);
  }
  await page.getByRole('button', { name: 'Составить меню', exact: true }).click();
  if (confirmReplacement) {
    const dialog = page.getByRole('dialog', { name: 'Составить меню с новыми настройками?', exact: true });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Составить меню', exact: true }).click();
  }
}
export async function preserved(page: Page, raw: string | null) {
  expect(await page.evaluate(() => localStorage.getItem('mealplan:guest:active-plan:v1'))).toBe(raw);
  expect(await page.evaluate(() => localStorage.getItem('sentinel'))).toBe('keep');
  expect(await page.evaluate(() => localStorage.getItem('mealplan:pantry'))).toBe('pantry-sentinel');
}
