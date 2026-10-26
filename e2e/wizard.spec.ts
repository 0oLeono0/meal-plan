import { test, expect } from '@playwright/test';
import { mountAppFixture } from './fixtures';

test('WIZ-03 boundary: people/days limits, 4+ and goals are saved without default reset', async ({ page }) => {
  await page.goto('/plan/new');
  await expect(page.getByLabel('Число людей', { exact: true })).toHaveValue('2');
  await expect(page.getByLabel('Число дней', { exact: true })).toHaveValue('7');
  await expect(page.getByRole('button', { name: 'Увеличить число дней' })).toBeDisabled();
  await page.getByRole('radio', { name: '4+' }).check();
  await expect(page.getByLabel('Число людей', { exact: true })).toHaveValue('4');
  for (let i = 4; i < 10; i++) await page.getByRole('button', { name: 'Увеличить число людей' }).click();
  await expect(page.getByRole('button', { name: 'Увеличить число людей' })).toBeDisabled();
  await page.getByLabel('Число людей', { exact: true }).fill('1');
  await page.getByLabel('Число дней', { exact: true }).fill('1');
  await expect(page.getByRole('button', { name: 'Уменьшить число людей' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Уменьшить число дней' })).toBeDisabled();
  await page.getByRole('radio', { name: 'Набрать вес' }).check();
  await expect(page.getByRole('status')).toHaveText('Сохранено на этом устройстве');
  await page.reload();
  await expect(page.getByLabel('Число людей', { exact: true })).toHaveValue('1');
  await expect(page.getByLabel('Число дней', { exact: true })).toHaveValue('1');
  await expect(page.getByRole('radio', { name: 'Набрать вес' })).toBeChecked();
});

test('D-08 partial/error: raw text reload, first invalid focus and no double-next skip', async ({ page }) => {
  await page.goto('/plan/new');
  for (const raw of ['', '1,', '1.5', 'Infinity', '11']) {
    await page.getByLabel('Число людей', { exact: true }).fill(raw);
    await page.getByRole('button', { name: 'Далее' }).click();
    await expect(page.getByLabel('Число людей', { exact: true })).toBeFocused();
    await expect(page.getByText('Шаг 1 из 4')).toBeVisible();
    await expect(page.getByRole('status')).toHaveText('Сохранено на этом устройстве');
    await page.reload();
    await expect(page.getByLabel('Число людей', { exact: true })).toHaveValue(raw);
  }
  await page.getByLabel('Число людей', { exact: true }).fill('4');
  await page.getByLabel('Число дней', { exact: true }).fill('8');
  await page.getByRole('button', { name: 'Далее' }).click();
  await expect(page.getByLabel('Число дней', { exact: true })).toBeFocused();
  await page.getByLabel('Число дней', { exact: true }).fill('3');
  await page.getByRole('button', { name: 'Далее' }).dblclick();
  await expect(page.getByText('Шаг 2 из 4')).toBeVisible();
  await page.getByRole('button', { name: 'Назад', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
  await expect(page.getByLabel('Число людей', { exact: true })).toHaveValue('4');
  await expect(page.getByLabel('Число дней', { exact: true })).toHaveValue('3');
});

test('D-04 navigation slots progress 1–4 preserve values and exit cancel/accept retains draft', async ({ page }) => {
  await page.goto('/plan/new');
  await page.getByRole('radio', { name: 'Снизить вес' }).check();
  for (let step = 2; step <= 4; step++) {
    await page.getByRole('button', { name: 'Далее' }).click();
    await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', String(step));
    await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
    if (step < 4) await page.waitForTimeout(260);
  }
  await expect(page.getByRole('button', { name: /Создать|Генерировать/ })).toHaveCount(0);
  for (let step = 3; step >= 1; step--) await page.getByRole('button', { name: 'Назад', exact: true }).click();
  await expect(page.getByRole('radio', { name: 'Снизить вес' })).toBeChecked();
  await page.getByRole('button', { name: 'Назад', exact: true }).click();
  await page.getByRole('button', { name: 'Продолжить настройку' }).click();
  await expect(page.getByRole('radio', { name: 'Снизить вес' })).toBeChecked();
  await page.getByRole('link', { name: 'На главную' }).click();
  await page.getByRole('button', { name: 'Выйти из мастера', exact: true }).click();
  await page.getByRole('link', { name: 'Новое меню' }).click();
  await expect(page.getByRole('radio', { name: 'Снизить вес' })).toBeChecked();
});

test('step1 loading/restored: hydration keeps edits unavailable and restored values win', async ({ page }) => {
  await mountAppFixture(page, { draft: { people: '6', days: '2', goal: 'lose' }, readDelay: 300 });
  await expect(page.getByRole('status')).toHaveText('Восстанавливаем настройки…');
  await expect(page.getByLabel('Число дней', { exact: true })).toHaveCount(0);
  await expect(page.getByLabel('Число людей', { exact: true })).toHaveValue('6');
  await expect(page.getByLabel('Число дней', { exact: true })).toHaveValue('2');
  await expect(page.getByRole('radio', { name: 'Снизить вес' })).toBeChecked();
});

for (const width of [360, 768, 1280]) test(`step1 overflow/long-text: ${width}px doubled text and sticky actions`, async ({ page }) => {
  await page.setViewportSize({ width, height: 800 });
  await page.goto('/plan/new');
  await page.evaluate(() => document.documentElement.style.fontSize = '200%');
  await page.getByLabel('Число дней', { exact: true }).fill('0');
  await page.getByRole('button', { name: 'Далее' }).click();
  await expect(page.getByLabel('Число дней', { exact: true })).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const input = await page.getByLabel('Число дней', { exact: true }).boundingBox();
  const actions = await page.locator('.sticky-actions').boundingBox();
  expect(input!.y + input!.height).toBeLessThanOrEqual(actions!.y);
});
