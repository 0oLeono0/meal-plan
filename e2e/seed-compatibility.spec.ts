import { test, expect, type Page } from '@playwright/test';
import { finishWizard } from './generation-fixtures';

type CryptoMode = 'missing-uuid' | 'throwing-uuid' | 'unavailable-entropy';
async function restrictCrypto(page: Page, mode: CryptoMode) {
  await page.addInitScript(mode => {
    Object.defineProperty(Crypto.prototype, 'randomUUID', {
      configurable: true,
      value: mode === 'missing-uuid' ? undefined : () => { throw new Error('UUID unavailable'); },
    });
    if (mode === 'unavailable-entropy') Object.defineProperty(Crypto.prototype, 'getRandomValues', {
      configurable: true, value: () => { throw new Error('Random values unavailable'); },
    });
  }, mode);
}

async function assertSavedMenu(page: Page, errors: string[]) {
  await expect(page).toHaveURL(/\/menu$/);
  await expect(page.locator('[data-date]')).toHaveCount(7);
  await expect(page.locator('[data-instance-id]')).toHaveCount(28);
  const id = await page.locator('[data-plan-id]').getAttribute('data-plan-id');
  const saved = await page.evaluate(() => localStorage.getItem('mealplan:guest:active-plan:v1'));
  const draft = await page.evaluate(() => localStorage.getItem('mealplan:guest:draft:v1'));
  expect(saved).not.toBeNull();
  const seed = JSON.parse(saved!).plan.inputs.seed;
  if (draft !== null) expect(JSON.parse(saved!).plan.inputs.appliedSettings.raw).toEqual(JSON.parse(draft).draft);
  expect(typeof seed).toBe('string');
  expect(seed.length).toBeGreaterThan(0);
  expect(seed.length).toBeLessThanOrEqual(200);
  await page.reload();
  await expect(page.locator('[data-plan-id]')).toHaveAttribute('data-plan-id', id!);
  expect(await page.evaluate(() => localStorage.getItem('mealplan:guest:active-plan:v1'))).toBe(saved);
  expect(await page.evaluate(() => localStorage.getItem('mealplan:guest:draft:v1'))).toBe(draft);
  expect(errors).toEqual([]);
}

for (const mode of ['missing-uuid', 'throwing-uuid', 'unavailable-entropy'] as const) {
  test(`quick start saves and reloads a real menu with ${mode}`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await restrictCrypto(page, mode);
    await page.goto('/');
    await page.getByRole('button', { name: 'Меню за 1 клик', exact: true }).click();
    await assertSavedMenu(page, errors);
  });
}

test('wizard submit saves and reloads a real menu without randomUUID', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await restrictCrypto(page, 'missing-uuid');
  await page.goto('/plan/new');
  await finishWizard(page);
  await assertSavedMenu(page, errors);
});

test('catalog reload retry saves a real menu without randomUUID', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await restrictCrypto(page, 'missing-uuid');
  await page.goto('/plan/new');
  await expect(page.getByLabel('Число людей', { exact: true })).toBeVisible();
  await page.evaluate(async () => {
    const resources = performance.getEntriesByType('resource').map(entry => entry.name);
    const reactUrl = resources.find(url => /\/react\.js\?/.test(url))!;
    const rootUrl = resources.find(url => /\/react-dom_client\.js\?/.test(url))!;
    const { default: { createElement } } = await import(reactUrl);
    const { default: { createRoot } } = await import(rootUrl);
    const appPath = '/src/app/App.tsx', catalogPath = '/src/data/catalog.ts';
    const { App } = await import(appPath);
    const { bundledCatalogPort } = await import(catalogPath);
    let reads = 0;
    const catalogPort = { load: () => ++reads === 1 ? Promise.resolve({ status: 'invalid', diagnostics: [] }) : bundledCatalogPort.load() };
    document.getElementById('root')?.remove();
    const container = document.createElement('div'); document.body.append(container);
    history.replaceState({}, '', '/');
    createRoot(container).render(createElement(App, { catalogPort }));
  });
  await page.getByRole('button', { name: 'Меню за 1 клик', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Недостаточно проверенных данных для расчёта меню', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Повторить', exact: true }).click();
  await assertSavedMenu(page, errors);
});
