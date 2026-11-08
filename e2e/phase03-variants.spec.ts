import { test, expect } from '@playwright/test';
import legacyPlan from '../src/test/fixtures/phase02-active-plan-v1.json' with { type: 'json' };

for (const count of [1, 2]) test(`controlled successful port returns ${count} real alternatives with exact shortage and saved cardinality`, async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto('/plan/new');
  await expect(page.getByLabel('Число людей', { exact: true })).toBeVisible();
  await page.evaluate(async count => {
    const resources = performance.getEntriesByType('resource').map(row => row.name);
    const { default: { createElement } } = await import(resources.find(url => /\/react\.js\?/.test(url))!);
    const { default: { createRoot } } = await import(resources.find(url => /\/react-dom_client\.js\?/.test(url))!);
    const appPath = '/src/app/App.tsx', generationPath = '/src/adapters/generation.ts', catalogPath = '/src/data/catalog.ts';
    const { App } = await import(appPath), { createLocalGeneration } = await import(generationPath), { bundledCatalogPort } = await import(catalogPath);
    const actual = createLocalGeneration(bundledCatalogPort);
    // A controlled result-cardinality port, not a source-catalog scarcity claim.
    // All included assignments still come through the genuine source/eligibility gates.
    const generationPort = { async generate(...args: Parameters<typeof actual.generate>) {
      const result = await actual.generate(...args);
      return result.status === 'success' ? { ...result, plan: { ...result.plan, variants: result.plan.variants.slice(0, count) } } : result;
    } };
    document.getElementById('root')!.remove();
    const root = document.createElement('div'); document.body.append(root);
    history.replaceState({}, '', '/');
    createRoot(root).render(createElement(App, { generationPort }));
  }, count);
  await page.getByRole('button', { name: 'Меню за 1 клик', exact: true }).click();
  await expect(page).toHaveURL('/menu', { timeout: 32_000 });
  await expect(page.getByText(`Найдено ${count} из 3 вариантов. Поиск ограничен; другие допустимые меню могут существовать.`, { exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Варианты меню' }).getByRole('listitem')).toHaveCount(count);
  const raw = await page.evaluate(() => localStorage.getItem('mealplan:guest:active-plan:v1'));
  const plan = JSON.parse(raw!).plan;
  expect(plan.variants).toHaveLength(count);
  expect(new Set(plan.variants.map((v: typeof legacyPlan.plan.variants[number]) => JSON.stringify(v.instances.map(i => [i.date, i.slot, i.recipeId, i.selectedServings])))).size).toBe(count);
  await expect(page.getByRole('button', { name: 'Предыдущий вариант', exact: true })).toBeDisabled();
  if (count === 1) await expect(page.getByRole('button', { name: 'Следующий вариант', exact: true })).toBeDisabled();
  else {
    await page.getByRole('button', { name: 'Следующий вариант', exact: true }).click();
    await expect(page.getByText('Вариант 2 из 2', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Следующий вариант', exact: true })).toBeDisabled();
  }
  const selected = await page.evaluate(() => localStorage.getItem('mealplan:guest:active-plan:v1'));
  await page.reload();
  await expect(page.getByText(`Вариант ${count} из ${count}`, { exact: true })).toBeVisible();
  if (count === 1) await expect(page.getByText('В сохранённом наборе 1 вариант', { exact: true })).toBeVisible();
  await expect(page.getByText(/^Найдено \d из 3 вариантов/)).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('mealplan:guest:active-plan:v1'))).toBe(selected);
});

test('actual Phase2 single menu shows saved cardinality with both arrows disabled', async ({ page }) => {
  await page.addInitScript(raw => localStorage.setItem('mealplan:guest:active-plan:v1', raw), JSON.stringify(legacyPlan));
  await page.goto('/menu');
  await expect(page.getByText('В сохранённом наборе 1 вариант', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Предыдущий вариант', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Следующий вариант', exact: true })).toBeDisabled();
  await expect(page.getByText(/Найдено .* из 3 вариантов/)).toHaveCount(0);
});

test('real wizard generates three semantic alternatives and selection survives shopping and reload', async ({ page }) => {
  test.setTimeout(70_000);
  await page.goto('/plan/new');
  await expect(page.getByLabel('Число людей', { exact: true })).toBeVisible();
  for (let step = 2; step <= 4; step++) {
    await page.getByRole('button', { name: 'Далее', exact: true }).click();
    await expect(page.getByText(`Шаг ${step} из 4`)).toBeVisible();
    if (step < 4) await page.waitForTimeout(270);
  }
  const started = Date.now();
  await page.getByRole('button', { name: 'Составить меню', exact: true }).click();
  await expect(page).toHaveURL(/\/menu$/, { timeout: 32_000 });
  const raw = await page.evaluate(() => localStorage.getItem('mealplan:guest:active-plan:v1'));
  expect(raw).not.toBeNull();
  const saved = JSON.parse(raw!);
  expect(saved.plan.variants).toHaveLength(3);
  // Independent oracle: literal canonical assignments, no production fingerprint/UUID/name.
  const fingerprints = saved.plan.variants.map((variant: { instances: { date: string; slot: string; recipeId: string; selectedServings: { numerator: string; denominator: string } }[] }) => JSON.stringify(variant.instances.map(row => [row.date, row.slot, row.recipeId, row.selectedServings.numerator, row.selectedServings.denominator])));
  expect(new Set(fingerprints).size).toBe(3);
  const elapsed = Date.now() - started;
  console.info(`Default corpus generation and saved acknowledgement: ${elapsed} ms`);
  expect(elapsed).toBeLessThan(30_000);
  const active = saved.plan.activeVariantId;
  await expect(page.getByRole('button', { name: 'Предыдущий вариант', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Следующий вариант', exact: true }).click();
  await expect(page.getByText('Вариант 2 из 3', { exact: true })).toBeVisible();
  const selected = saved.plan.variants[1].id;
  expect(selected).not.toBe(active);
  await expect(page.locator('[data-plan-id]')).toHaveAttribute('data-plan-id', selected);
  const costs = await page.getByRole('region', { name: 'Бюджет меню' }).locator('dd').allTextContents();
  await page.getByRole('link', { name: /^Список покупок ·/ }).click();
  await expect(page.locator('[data-plan-id]')).toHaveAttribute('data-plan-id', selected);
  await expect(page.getByRole('region', { name: 'Бюджет меню' }).locator('dd')).toHaveText(costs);
  await page.reload();
  await expect(page.locator('[data-plan-id]')).toHaveAttribute('data-plan-id', selected);
  await expect(page.getByRole('region', { name: 'Бюджет меню' }).locator('dd')).toHaveText(costs);
  await page.goto('/menu');
  await expect(page.getByText('Вариант 2 из 3', { exact: true })).toBeVisible();
  const reloaded = await page.evaluate(() => JSON.parse(localStorage.getItem('mealplan:guest:active-plan:v1')!).plan);
  expect(reloaded.variants).toEqual(saved.plan.variants);
  expect(reloaded.activeVariantId).toBe(selected);
  for (const width of [360, 390, 430, 768, 1280]) {
    await page.setViewportSize({ width, height: 812 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
  }
});
