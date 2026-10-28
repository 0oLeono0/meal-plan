import { test, expect } from '@playwright/test';

test('real catalog wizard saves every dated slot and reloads the same active menu', async ({ page }) => {
  await page.goto('/plan/new');
  for (let step = 2; step <= 4; step++) {
    await page.getByRole('button', { name: 'Далее', exact: true }).click();
    await expect(page.getByText(`Шаг ${step} из 4`)).toBeVisible();
    if (step < 4) await page.waitForTimeout(270);
  }
  await expect(page.getByRole('button', { name: 'Составить меню', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Составить меню', exact: true }).click();
  await expect(page).toHaveURL(/\/menu$/);
  await expect(page.getByRole('heading', { name: 'Меню на неделю', exact: true })).toBeVisible();
  await expect(page.locator('[data-date]')).toHaveCount(7);
  await expect(page.locator('[data-instance-id]')).toHaveCount(28);
  for (const slot of ['Завтрак', 'Обед', 'Ужин', 'Перекус']) await expect(page.getByRole('heading', { name: slot, exact: true })).toHaveCount(7);
  await expect(page.getByText('Ручная цель КБЖУ не задана', { exact: true })).toBeVisible();
  await expect(page.getByText('Меню сохранено на этом устройстве', { exact: true })).toBeVisible();
  const values = await page.locator('[data-plan-id]').innerText();
  const id = await page.locator('[data-plan-id]').getAttribute('data-plan-id');
  const storage = await page.evaluate(() => ({ ...localStorage }));
  expect(Object.keys(storage).some(key => key.includes('active'))).toBe(true);
  await page.reload();
  await expect(page.locator('[data-plan-id]')).toHaveAttribute('data-plan-id', id!);
  await expect(page.locator('[data-plan-id]')).toHaveText(values);
  expect(await page.evaluate(() => ({ ...localStorage }))).toEqual(storage);
  await page.goto('/');
  await expect(page).toHaveURL(/\/menu$/);
});

test('deep generation entry never resurrects a request', async ({ page }) => {
  await page.goto('/plan/generating');
  await expect(page.getByRole('heading', { name: 'Генерация прервана или не запущена' })).toBeVisible();
  await page.getByRole('link', { name: 'К настройкам', exact: true }).click();
  await expect(page).toHaveURL(/\/plan\/new$/);
});
