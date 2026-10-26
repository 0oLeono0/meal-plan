import { test, expect } from '@playwright/test';

const key = 'mealplan:guest:draft:v1';

test('recovery partial/error: corrupt bytes require explicit safe reset and keep unrelated keys', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('mealplan:guest:draft:v1', '{broken');
    localStorage.setItem('sentinel', 'keep');
    localStorage.setItem('mealplan:confirmed', 'confirmed');
    localStorage.setItem('mealplan:pantry', 'pantry');
  });
  await page.goto('/plan/new');
  await page.getByLabel('Число людей', { exact: true }).fill('4');
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe('{broken');
  await expect(page.getByRole('button', { name: 'Сбросить черновик', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Сбросить черновик', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Оставить черновик', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe('{broken');
  await page.getByRole('button', { name: 'Сбросить черновик', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Сбросить черновик', exact: true }).click();
  await expect(page.getByLabel('Число людей', { exact: true })).toHaveValue('2');
  expect(await page.evaluate(() => [localStorage.getItem('sentinel'), localStorage.getItem('mealplan:confirmed'), localStorage.getItem('mealplan:pantry')])).toEqual(['keep', 'confirmed', 'pantry']);
  await expect(page.getByText('Не удалось восстановить настройки. Сохранённые данные повреждены или имеют другую версию')).toHaveCount(0);
});
