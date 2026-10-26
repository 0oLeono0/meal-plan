import { test, expect } from '@playwright/test';
import { mountAppFixture } from './fixtures';

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

test('recovery empty/loading: hydrate before edits and preserve raw partial strings', async ({ page }) => {
  await mountAppFixture(page, { draft: { people: '', budget: '1,', step: 1 }, readDelay: 700 });
  await expect(page.getByRole('status')).toHaveText('Восстанавливаем настройки…');
  await expect(page.getByLabel('Число людей', { exact: true })).toHaveCount(0);
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).draft.budget, key)).toBe('1,');
  await expect(page.getByLabel('Число людей', { exact: true })).toHaveValue('');
  await page.getByLabel('Число людей', { exact: true }).fill('3');
  await expect(page.getByRole('status')).toHaveText('Сохранено на этом устройстве');
  await page.reload();
  await expect(page.getByLabel('Число людей', { exact: true })).toHaveValue('3');
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).draft.budget, key)).toBe('1,');
});

test('recovery empty: missing is a new draft and never corruption or an unsolicited write', async ({ page }) => {
  await page.goto('/plan/new');
  await expect(page.getByLabel('Число людей', { exact: true })).toHaveValue('2');
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBeNull();
  await expect(page.getByRole('button', { name: 'Сбросить черновик', exact: true })).toHaveCount(0);
});

test('recovery error/loading: read retry keeps newest memory edits and reports actual pending save', async ({ page }) => {
  await mountAppFixture(page, { draft: { people: '8' }, failRead: true, readDelay: 200, writeDelay: 600 });
  await expect(page.getByRole('status')).toContainText('Не удалось прочитать настройки');
  await page.getByLabel('Число людей', { exact: true }).fill('4');
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).draft.people, key)).toBe('8');
  await page.evaluate(() => sessionStorage.setItem('allow-read', 'yes'));
  await page.getByRole('button', { name: 'Повторить сохранение' }).click();
  await expect(page.getByRole('status')).toHaveText('Сохраняем настройки…');
  await expect(page.getByRole('button', { name: 'Повторить сохранение' })).toBeDisabled();
  await page.getByLabel('Число людей', { exact: true }).fill('5');
  await expect(page.getByRole('status')).toHaveText('Сохранено на этом устройстве');
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).draft.people, key)).toBe('5');
});

test('recovery write failure retains input and retry saves latest value without touching foreign keys', async ({ page }) => {
  await mountAppFixture(page, { failWrite: true, writeDelay: 200 });
  await page.getByLabel('Число людей', { exact: true }).fill('3');
  await expect(page.getByRole('status')).toContainText('Не удалось сохранить');
  await page.getByLabel('Число людей', { exact: true }).fill('4');
  await expect(page.getByRole('status')).toContainText('Не удалось сохранить');
  await page.evaluate(() => sessionStorage.setItem('allow-write', 'yes'));
  await page.getByRole('button', { name: 'Повторить сохранение' }).click();
  await expect(page.getByRole('status')).toHaveText('Сохранено на этом устройстве');
  await page.reload();
  await expect(page.getByLabel('Число людей', { exact: true })).toHaveValue('4');
  expect(await page.evaluate(() => [localStorage.getItem('sentinel'), localStorage.getItem('mealplan:confirmed'), localStorage.getItem('mealplan:pantry')])).toEqual(['keep', 'confirmed', 'pantry']);
});

test('recovery reset failure keeps raw and memory until explicit retry succeeds', async ({ page }) => {
  await mountAppFixture(page, { raw: '{broken', failReset: true });
  await page.getByLabel('Число людей', { exact: true }).fill('4');
  await page.getByRole('button', { name: 'Сбросить черновик', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Сбросить черновик', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Не удалось сохранить');
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe('{broken');
  await page.getByRole('button', { name: 'Оставить черновик' }).click();
  await expect(page.getByLabel('Число людей', { exact: true })).toHaveValue('4');
  await page.evaluate(() => sessionStorage.setItem('allow-reset', 'yes'));
  await page.getByRole('button', { name: 'Сбросить черновик', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Сбросить черновик', exact: true }).click();
  await expect(page.getByLabel('Число людей', { exact: true })).toHaveValue('2');
});

test('recovery overflow/long-text: warning and reset remain in flow at 360px with doubled text', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 700 });
  await mountAppFixture(page, { raw: '{broken' });
  await expect(page.getByLabel('Число людей', { exact: true })).toBeVisible();
  await page.addStyleTag({ content: ':root { font-size: 32px; }' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const notice = await page.locator('.notice').boundingBox();
  const field = await page.getByLabel('Число людей', { exact: true }).boundingBox();
  expect(notice!.y + notice!.height).toBeLessThan(field!.y);
  await page.getByRole('button', { name: 'Сбросить черновик', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Оставить черновик' })).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
