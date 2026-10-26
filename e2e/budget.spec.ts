import { test, expect, type Page } from '@playwright/test';

async function openBudget(page: Page) {
  await page.goto('/plan/new');
  await page.getByRole('button', { name: 'Далее' }).click();
  await expect(page.getByText('Шаг 2 из 4')).toBeVisible();
}

test('budget exact field and truthful range projection preserve manual amounts', async ({ page }) => {
  await openBudget(page);
  const field = page.getByLabel('Бюджет на неделю', { exact: true });
  const slider = page.getByRole('slider', { name: 'Выбрать бюджет ползунком' });
  await expect(field).toHaveValue('3000');
  await expect(page.getByText('≈ 214 ₽ на человека в день')).toBeVisible();
  for (const [raw, projection, exact, projected] of [['500', '1000', '500', '1 000'], ['1050', '1100', '1 050', '1 100'], ['20000', '15000', '20 000', '15 000']]) {
    await field.fill(raw);
    await expect(field).toHaveValue(raw);
    await expect(slider).toHaveValue(projection);
    await expect(slider).toHaveAttribute('aria-valuenow', projection);
    await expect(slider).toHaveAttribute('aria-valuetext', `Ползунок: ${projected} рублей. Точная сумма в поле: ${exact} рублей`);
    await expect(page.getByText('Точная сумма введена вручную')).toBeVisible();
  }
  await field.fill('1050');
  await slider.focus();
  await slider.press('ArrowRight');
  await expect(field).toHaveValue('1200');
  await expect(slider).toHaveValue('1200');
  await expect(slider).toHaveAttribute('aria-valuetext', 'Ползунок: 1 200 рублей');
  await expect(page.getByText('Точная сумма введена вручную')).toHaveCount(0);
});

test('budget partial/error: invalid raw reloads, no hint, no next, then exact trimmed input succeeds', async ({ page }) => {
  await openBudget(page);
  const field = page.getByLabel('Бюджет на неделю', { exact: true });
  for (const raw of ['', '499', '-500', '500.1', '1e3', '9007199254740992']) {
    await field.fill(raw);
    await page.getByRole('button', { name: 'Далее' }).click();
    await expect(field).toBeFocused();
    await expect(field).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByText('Введите целое число рублей от 500')).toBeVisible();
    await expect(page.getByText(/≈ .*на человека в день/)).toHaveCount(0);
    await expect(page.getByRole('slider')).toHaveAttribute('aria-valuetext', /Отдельный выбор суммы/);
    await expect(page.getByRole('status')).toHaveText('Сохранено на этом устройстве');
    await page.reload();
    await expect(field).toHaveValue(raw);
  }
  await field.fill(' 1050 ');
  await page.getByRole('button', { name: 'Далее' }).click();
  await expect(page.getByText('Шаг 3 из 4')).toBeVisible();
});

test('budget period: changing people/days changes only the hint and label', async ({ page }) => {
  await openBudget(page);
  await page.getByLabel('Бюджет на неделю', { exact: true }).fill('20000');
  await page.getByRole('button', { name: 'Назад', exact: true }).click();
  await page.getByLabel('Число людей', { exact: true }).fill('4');
  await page.getByLabel('Число дней', { exact: true }).fill('3');
  await page.getByRole('button', { name: 'Далее' }).click();
  await expect(page.getByLabel('Бюджет на 3 дня', { exact: true })).toHaveValue('20000');
  await expect(page.getByText('≈ 1 667 ₽ на человека в день')).toBeVisible();
  await expect(page.getByText(/стоимость покупок|стоимость ингредиентов|экономия/i)).toHaveCount(0);
  await expect(page.getByRole('status')).toHaveText('Сохранено на этом устройстве');
  await page.reload();
  await expect(page.getByLabel('Бюджет на 3 дня', { exact: true })).toHaveValue('20000');
});

for (const width of [360, 768, 1280]) test(`budget overflow/long-text ${width}px with doubled text`, async ({ page }) => {
  await page.setViewportSize({ width, height: 800 });
  await openBudget(page);
  await page.evaluate(() => document.documentElement.style.fontSize = '200%');
  await page.getByLabel('Бюджет на неделю', { exact: true }).fill('9'.repeat(310));
  await page.getByRole('button', { name: 'Далее' }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const field = await page.getByLabel('Бюджет на неделю', { exact: true }).boundingBox();
  const footer = await page.locator('.sticky-actions').boundingBox();
  expect(field!.y + field!.height).toBeLessThanOrEqual(footer!.y);
  await page.screenshot({ path: `.tmp/01-05-budget-${width}.png`, fullPage: true });
});
