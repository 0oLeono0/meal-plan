import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { activeKey } from './generation-fixtures';

const pantryKey = 'mealplan:guest:pantry:v1';
const savedPlan = readFileSync('src/test/fixtures/phase02-active-plan-v1.json', 'utf8');

test('cold start hides purchases until corrupt pantry data can be read', async ({ page }) => {
  await page.goto('/shopping');
  await page.evaluate(({ activeKey, pantryKey, savedPlan }) => {
    localStorage.setItem(activeKey, savedPlan);
    localStorage.setItem(pantryKey, '{bad');
  }, { activeKey, pantryKey, savedPlan });
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Список покупок', exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Бюджет меню' })).toHaveCount(0);
  await expect(page.locator('[data-product-id]')).toHaveCount(0);
  await page.goto('/menu');
  await expect(page.locator('.meal-card').first()).toBeVisible();
  await expect(page.getByRole('region', { name: 'Бюджет меню' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Список покупок', exact: true })).toBeVisible();
  await page.goto('/shopping');
  await page.evaluate(key => localStorage.setItem(key, JSON.stringify({ schemaVersion: 1, token: 'a'.repeat(32), rows: [] })), pantryKey);
  await page.getByRole('button', { name: 'Повторить загрузку запасов', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Бюджет меню' })).toBeVisible();
});

test('shopping labels the applied wizard inventory when the household token matches', async ({ page }) => {
  await page.goto('/shopping');
  const token = 'b'.repeat(32);
  await page.evaluate(({ activeKey, pantryKey, savedPlan, token }) => {
    localStorage.setItem(activeKey, JSON.stringify({ ...JSON.parse(savedPlan), schemaVersion: 2, wizardPantryToken: token }));
    localStorage.setItem(pantryKey, JSON.stringify({ schemaVersion: 1, token, rows: [] }));
  }, { activeKey, pantryKey, savedPlan, token });
  await page.reload();
  await page.getByText(/^Уже есть дома ·/).click();
  await expect(page.getByText(/Покрытие рассчитано по запасам, применённым в мастере/)).toBeVisible();
});
