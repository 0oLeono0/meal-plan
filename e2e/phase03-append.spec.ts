import { test, expect } from '@playwright/test';
import { mountGeneration, activeKey } from './generation-fixtures';
import legacyPlan from '../src/test/fixtures/phase02-active-plan-v1.json' with { type: 'json' };

test('real append preserves saved inputs and alternatives across reload', async ({ page }) => {
  test.setTimeout(85_000);
  await page.goto('/');
  await page.getByRole('button', { name: 'Меню за 1 клик', exact: true }).click();
  await expect(page).toHaveURL(/\/menu$/, { timeout: 32_000 });
  const old = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).plan, activeKey);
  expect(old.variants).toHaveLength(3);
  await page.getByRole('button', { name: 'Пересобрать', exact: true }).click();
  await expect(page.getByText('Вариант 4 из 4', { exact: true })).toBeVisible({ timeout: 32_000 });
  const next = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).plan, activeKey);
  expect(next.inputs).toEqual(old.inputs);
  expect(next.variants.slice(0, 3)).toEqual(old.variants);
  const assignments = next.variants.map((v: typeof old.variants[number]) => JSON.stringify(v.instances.map((r: typeof v.instances[number]) => [r.date, r.slot, r.recipeId, r.selectedServings])));
  expect(new Set(assignments).size).toBe(4);
  expect(next.activeVariantId).toBe(next.variants[3].id);
  await page.reload();
  await expect(page.getByText('Вариант 4 из 4', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Предыдущий вариант', exact: true }).click();
  await expect(page.getByText('Вариант 3 из 4', { exact: true })).toBeVisible();
});

test('no new result preserves exact bytes and exposes persistent honest recovery', async ({ page }) => {
  const bytes = JSON.stringify(legacyPlan);
  await mountGeneration(page, { route: '/menu', activeRaw: bytes, error: { code: 'SEARCH_EXHAUSTED', message: 'controlled', diagnostics: [] } });
  await page.getByRole('button', { name: 'Пересобрать', exact: true }).click();
  await expect(page.getByText('Новый вариант не найден', { exact: true })).toBeVisible();
  expect(await page.evaluate(key => localStorage.getItem(key), activeKey)).toBe(bytes);
  expect(await page.evaluate(() => sessionStorage.getItem('generation-calls'))).toBe('1');
  await page.getByRole('link', { name: /^Список покупок ·/ }).click();
  await page.goBack();
  await expect(page.getByText('Новый вариант не найден', { exact: true })).toBeVisible();
});
