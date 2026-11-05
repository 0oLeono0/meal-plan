import { test, expect } from '@playwright/test';
import legacyPlan from '../src/test/fixtures/phase02-active-plan-v1.json' with { type: 'json' };

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
