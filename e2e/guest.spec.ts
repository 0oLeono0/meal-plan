import { test, expect } from '@playwright/test';

test('guest people count survives a real reload', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Меню с учётом ваших привычек' })).toBeVisible();
  await page.getByRole('button', { name: 'Составить меню', exact: true }).click();
  await expect(page.getByLabel('Число людей', { exact: true })).toHaveValue('2');
  await page.getByRole('button', { name: 'Увеличить число людей', exact: true }).click();
  await expect(page.getByLabel('Число людей', { exact: true })).toHaveValue('3');
  await expect(page.getByRole('status')).toHaveText('Сохранено на этом устройстве');
  await page.reload();
  await expect(page.getByLabel('Число людей', { exact: true })).toHaveValue('3');
});
