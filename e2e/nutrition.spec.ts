import { test, expect } from '@playwright/test';
import { mountAppFixture } from './fixtures';

for (const { width, textSize, raw, firstInvalid } of [
  { width: 390, textSize: '100%', raw: '1,', firstInvalid: 'calories' },
  { width: 360, textSize: '200%', raw: '2000', firstInvalid: 'protein' },
]) test(`WR-01 collapsed partial nutrition reveals and focuses first error at ${width}px ${textSize} text`, async ({ page }) => {
  await page.setViewportSize({ width, height: 800 });
  await page.goto('/plan/new');
  await page.evaluate(textSize => document.documentElement.style.fontSize = textSize, textSize);
  const disclosure = page.getByRole('button', { name: 'Норма КБЖУ', exact: true });
  await disclosure.focus();
  await page.keyboard.press('Enter');
  await page.getByLabel('Калории, ккал', { exact: true }).fill(raw);
  await disclosure.focus();
  await page.keyboard.press('Enter');
  await expect(disclosure).toHaveAttribute('aria-expanded', 'false');
  await page.getByRole('button', { name: 'Далее', exact: true }).focus();
  await page.keyboard.press('Enter');
  const invalid = page.locator(`#${firstInvalid}`);
  await expect(disclosure).toHaveAttribute('aria-expanded', 'true');
  await expect(invalid).toBeFocused();
  await expect(invalid).toHaveAttribute('aria-invalid', 'true');
  await expect(invalid).toHaveAttribute('aria-describedby', `${firstInvalid}-error`);
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
  const field = await invalid.locator('..').boundingBox();
  const footer = await page.locator('.sticky-actions').boundingBox();
  expect(field!.y).toBeGreaterThanOrEqual(0);
  expect(field!.y + field!.height).toBeLessThanOrEqual(footer!.y);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('manual-nutrition empty: keyboard disclosure, explicit basis and no guessed target', async ({ page }) => {
  await page.goto('/plan/new');
  const disclosure = page.getByRole('button', { name: 'Норма КБЖУ', exact: true });
  await expect(page.getByText('Норма не задана', { exact: true })).toBeVisible();
  await expect(disclosure).toHaveAttribute('aria-expanded', 'false');
  await disclosure.focus();
  await page.keyboard.press('Enter');
  await expect(disclosure).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByText('На человека в день', { exact: true })).toBeVisible();
  for (const label of ['Калории, ккал', 'Белки, г', 'Жиры, г', 'Углеводы, г']) await expect(page.getByLabel(label, { exact: true })).toHaveValue('');
  await expect(page.getByText('Планирование питания не является медицинской рекомендацией')).toBeVisible();
  await expect(page.getByText('Введено вручную', { exact: true })).toHaveCount(0);
  await expect(page.getByText(/2100|105\/70\/260|Рассчитано/)).toHaveCount(0);
});

test('manual-nutrition partial/error: exact raw reload, validation focus and explicit clear all', async ({ page }) => {
  await page.goto('/plan/new');
  await page.getByRole('button', { name: 'Норма КБЖУ', exact: true }).click();
  await page.getByLabel('Калории, ккал', { exact: true }).fill('1,');
  await expect(page.getByRole('status')).toHaveText('Сохранено на этом устройстве');
  await page.reload();
  await expect(page.getByLabel('Калории, ккал', { exact: true })).toHaveValue('1,');
  await page.getByRole('button', { name: 'Далее' }).click();
  await expect(page.getByLabel('Калории, ккал', { exact: true })).toBeFocused();
  await expect(page.getByText('Шаг 1 из 4')).toBeVisible();
  await page.getByRole('button', { name: 'Очистить норму' }).click();
  for (const label of ['Калории, ккал', 'Белки, г', 'Жиры, г', 'Углеводы, г']) await expect(page.getByLabel(label, { exact: true })).toHaveValue('');
  await expect(page.getByText('Норма не задана', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Далее' }).click();
  await expect(page.getByText('Шаг 2 из 4')).toBeVisible();
});

test('manual-nutrition precision/origin: complete values persist across next back reload, manual edit resets origin', async ({ page }) => {
  await mountAppFixture(page, { draft: { manualNutrition: { calories: '1234', protein: '10', fat: '20', carbohydrates: '30' }, targetSource: { kind: 'calculated', formulaVersion: 'test-only', sourceRef: 'fixture' } } });
  await page.getByLabel('Калории, ккал', { exact: true }).fill(' 1234,5 ');
  await page.getByLabel('Белки, г', { exact: true }).fill(' 12.5 ');
  await page.getByLabel('Жиры, г', { exact: true }).fill('0');
  await expect(page.getByText('Введено вручную', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Далее' }).click();
  await expect(page.getByText('Шаг 2 из 4')).toBeVisible();
  await page.getByRole('button', { name: 'Назад', exact: true }).click();
  await expect(page.getByLabel('Калории, ккал', { exact: true })).toHaveValue(' 1234,5 ');
  await expect(page.getByRole('status')).toHaveText('Сохранено на этом устройстве');
  await page.reload();
  await expect(page.getByText('Введено вручную', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('mealplan:guest:draft:v1')!).draft.targetSource)).toEqual({ kind: 'manual' });
});

test('manual-nutrition boundary: zero calories negative macro nonfinite overflow and mixed decimals remain errors', async ({ page }) => {
  await page.goto('/plan/new');
  await page.getByRole('button', { name: 'Норма КБЖУ', exact: true }).click();
  for (const label of ['Калории, ккал', 'Белки, г', 'Жиры, г', 'Углеводы, г']) await page.getByLabel(label, { exact: true }).fill('10');
  for (const raw of ['0', '-1', 'NaN', 'Infinity', '1e3', '1,2.3', '9'.repeat(310)]) {
    await page.getByLabel('Калории, ккал', { exact: true }).fill(raw);
    await page.getByRole('button', { name: 'Далее' }).click();
    await expect(page.getByLabel('Калории, ккал', { exact: true })).toBeFocused();
    await expect(page.getByText('Шаг 1 из 4')).toBeVisible();
  }
  await page.getByLabel('Калории, ккал', { exact: true }).fill('100');
  await page.getByLabel('Белки, г', { exact: true }).fill('-1');
  await page.getByRole('button', { name: 'Далее' }).click();
  await expect(page.getByLabel('Белки, г', { exact: true })).toBeFocused();
});

test('manual-nutrition storage error: raw text survives memory editing without fake saved success', async ({ page }) => {
  await mountAppFixture(page, { failWrite: true });
  await page.getByRole('button', { name: 'Норма КБЖУ', exact: true }).click();
  await page.getByLabel('Калории, ккал', { exact: true }).fill('1,');
  await expect(page.getByRole('status')).toContainText('Не удалось сохранить на этом устройстве');
  await page.getByRole('button', { name: 'Норма КБЖУ', exact: true }).click();
  await page.getByRole('button', { name: 'Норма КБЖУ', exact: true }).click();
  await expect(page.getByLabel('Калории, ккал', { exact: true })).toHaveValue('1,');
});

for (const width of [360, 768, 1280]) test(`manual-nutrition overflow/long-text: ${width}px doubled text keeps last field and source readable`, async ({ page }) => {
  await page.setViewportSize({ width, height: 800 });
  await page.goto('/plan/new');
  await page.evaluate(() => document.documentElement.style.fontSize = '200%');
  await page.getByRole('button', { name: 'Норма КБЖУ', exact: true }).click();
  await page.getByLabel('Калории, ккал', { exact: true }).fill('100');
  await page.getByLabel('Белки, г', { exact: true }).fill('10');
  await page.getByLabel('Жиры, г', { exact: true }).fill('10');
  await page.getByRole('button', { name: 'Далее' }).click();
  await expect(page.getByLabel('Углеводы, г', { exact: true })).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const field = await page.getByLabel('Углеводы, г', { exact: true }).boundingBox();
  const footer = await page.locator('.sticky-actions').boundingBox();
  expect(field!.y + field!.height).toBeLessThanOrEqual(footer!.y);
  await page.screenshot({ path: `.tmp/01-04-nutrition-${width}.png`, fullPage: true });
});
