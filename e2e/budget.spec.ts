import { test, expect, type Page } from '@playwright/test';
import { mountAppFixture } from './fixtures';
import { createDraft } from '../src/domain/settings';

async function openBudget(page: Page) {
  await page.goto('/plan/new');
  await page.getByRole('button', { name: 'Далее' }).click();
  await expect(page.getByText('Шаг 2 из 4')).toBeVisible();
  // The wizard intentionally suppresses double-next clicks for 250ms.
  await page.waitForTimeout(260);
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
  await page.waitForTimeout(260);
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
  const error = await page.getByText('Введите целое число рублей от 500').boundingBox();
  expect(error!.y + error!.height).toBeLessThanOrEqual(footer!.y);
  await page.screenshot({ path: `.tmp/01-05-budget-${width}.png`, fullPage: true });
});

test('time-variety defaults and stable radio order', async ({ page }) => {
  await openBudget(page);
  const time = page.getByRole('group', { name: 'Время приготовления' });
  const variety = page.getByRole('group', { name: 'Разнообразие' });
  expect(await time.getByRole('radio').count()).toBe(4);
  await expect(time.locator('label')).toHaveText(['до 15 мин', 'до 30 мин', 'до 60 мин', 'любое']);
  await expect(variety.locator('label')).toHaveText(['Одно и то же каждый день', 'Среднее', 'Каждый день разное']);
  await expect(time.getByRole('radio', { name: 'до 30 мин', exact: true })).toBeChecked();
  await expect(variety.getByRole('radio', { name: 'Среднее', exact: true })).toBeChecked();
});

test('time-variety adjacency keyboard and idempotency keep independent values', async ({ page }) => {
  await openBudget(page);
  await page.getByLabel('Бюджет на неделю', { exact: true }).fill('1050');
  const time = page.getByRole('group', { name: 'Время приготовления' });
  const variety = page.getByRole('group', { name: 'Разнообразие' });
  await time.getByRole('radio', { name: 'до 15 мин', exact: true }).check();
  await time.getByRole('radio', { name: 'до 15 мин', exact: true }).press('ArrowRight');
  await expect(time.getByRole('radio', { name: 'до 30 мин', exact: true })).toBeChecked();
  await time.getByRole('radio', { name: 'до 30 мин', exact: true }).press('ArrowRight');
  await expect(time.getByRole('radio', { name: 'до 60 мин', exact: true })).toBeChecked();
  await time.getByRole('radio', { name: 'до 60 мин', exact: true }).press('ArrowRight');
  await expect(time.getByRole('radio', { name: 'любое', exact: true })).toBeChecked();
  for (const name of ['Одно и то же каждый день', 'Среднее', 'Каждый день разное']) {
    await variety.getByRole('radio', { name, exact: true }).check();
    await variety.getByRole('radio', { name, exact: true }).check();
    await expect(variety.locator('input:checked')).toHaveCount(1);
    await expect(time.locator('input:checked')).toHaveCount(1);
    await expect(time.getByRole('radio', { name: 'любое', exact: true })).toBeChecked();
    await expect(page.getByLabel('Бюджет на неделю', { exact: true })).toHaveValue('1050');
    await expect(page.getByText('Точная сумма введена вручную')).toBeVisible();
  }
  await variety.getByRole('radio', { name: 'Каждый день разное', exact: true }).press('ArrowLeft');
  await expect(variety.getByRole('radio', { name: 'Среднее', exact: true })).toBeChecked();
  const targets = await page.locator('fieldset label').evaluateAll(labels => labels.map(label => ({ height: label.getBoundingClientRect().height, width: label.getBoundingClientRect().width })));
  expect(targets.every(rect => rect.height >= 44 && rect.width >= 44)).toBe(true);
});

test('time-variety concurrency: latest rapid choices survive back and reload', async ({ page }) => {
  await openBudget(page);
  await page.getByLabel('Бюджет на неделю', { exact: true }).fill('20000');
  for (const name of ['до 15 мин', 'до 60 мин', 'любое']) await page.getByRole('radio', { name, exact: true }).check();
  for (const name of ['Одно и то же каждый день', 'Каждый день разное']) await page.getByRole('radio', { name, exact: true }).check();
  await page.getByRole('button', { name: 'Назад', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Сохранено на этом устройстве');
  await page.reload();
  await page.getByRole('button', { name: 'Далее' }).click();
  await expect(page.getByRole('radio', { name: 'любое', exact: true })).toBeChecked();
  await expect(page.getByRole('radio', { name: 'Каждый день разное', exact: true })).toBeChecked();
  await expect(page.getByLabel('Бюджет на неделю', { exact: true })).toHaveValue('20000');
});

for (const field of ['cookingTime', 'variety'] as const) test(`time-variety empty/recovery: unknown restored ${field} never silently defaults`, async ({ page }) => {
  const raw = JSON.stringify({ schemaVersion: 1, draft: { ...createDraft(), step: 2, [field]: 'unknown' } });
  await mountAppFixture(page, { raw });
  await expect(page.getByText('Не удалось восстановить настройки. Сохранённые данные повреждены или имеют другую версию')).toBeVisible();
  await expect(page.getByText('Можно продолжить в памяти. Исходная запись останется без изменений.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Сбросить черновик', exact: true })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('mealplan:guest:draft:v1'))).toBe(raw);
});
