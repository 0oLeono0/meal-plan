import { test, expect } from '@playwright/test';
import type { SettingsDraft } from '../src/domain/settings';
import { draftKey, mountAppFixture } from './fixtures';

// Every persisted field is deliberate: a recovery must retain the complete snapshot.
const stored: SettingsDraft = {
  step: 3, people: '8', days: '5', goal: 'gain', budget: '7654',
  cookingTime: '60', variety: 'max', restrictions: ['no-fish'], exclusionIds: ['egg'],
  home: [{ productId: 'rice', quantity: ' 1,25 ', unit: 'kg', expiresSoon: true }],
  manualNutrition: { calories: ' 2345,5 ', protein: '123', fat: '78', carbohydrates: '250' },
  targetSource: { kind: 'manual' },
};

test('CR-01 read retry without edits restores full stored snapshot without rewriting its bytes', async ({ page }) => {
  const raw = JSON.stringify({ schemaVersion: 1, draft: stored }, null, 2);
  await page.addInitScript(({ raw, key }) => {
    localStorage.setItem(key, raw);
    const getItem = Storage.prototype.getItem;
    Storage.prototype.getItem = function (name) {
      if (this === localStorage && name === key && !sessionStorage.getItem('allow-read')) throw new Error('read denied');
      return getItem.call(this, name);
    };
  }, { raw, key: draftKey });
  await page.goto('/plan/new');
  await expect(page.getByRole('status')).toContainText('Не удалось прочитать настройки');
  await page.evaluate(() => sessionStorage.setItem('allow-read', 'yes'));
  await page.getByRole('button', { name: 'Повторить сохранение' }).click();
  await expect(page.locator('.notice').getByRole('status')).toHaveText('Сохранено на этом устройстве');
  expect(await page.evaluate(key => localStorage.getItem(key), draftKey)).toBe(raw);
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '3');
  await expect(page.getByLabel('Без рыбы', { exact: true })).toBeChecked();
  await expect(page.getByRole('button', { name: 'Удалить исключение Яйца', exact: true })).toBeVisible();
});

for (const editTiming of ['before', 'during'] as const) test(`CR-01 read retry preserves latest complete memory draft edited ${editTiming} retry`, async ({ page }) => {
  await mountAppFixture(page, { draft: stored, failRead: true, holdRetryRead: true });
  await expect(page.getByRole('status')).toContainText('Не удалось прочитать настройки');
  if (editTiming === 'before') await page.getByLabel('Число людей', { exact: true }).fill('4');
  await page.evaluate(() => sessionStorage.setItem('allow-read', 'yes'));
  await page.getByRole('button', { name: 'Повторить сохранение' }).click();
  await expect.poll(() => page.evaluate(() => sessionStorage.getItem('retry-read-pending'))).toBe('yes');
  await page.getByLabel('Число людей', { exact: true }).fill('5');
  await page.getByRole('button', { name: 'Норма КБЖУ', exact: true }).click();
  await page.getByLabel('Калории, ккал', { exact: true }).fill('1,');
  await page.evaluate(() => window.dispatchEvent(new Event('release-retry-read')));
  await expect(page.getByRole('status')).toHaveText('Сохранено на этом устройстве');
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).draft, draftKey)).toEqual({
    step: 1, people: '5', days: '7', goal: 'maintain', budget: '3000',
    cookingTime: '30', variety: 'medium', restrictions: [], exclusionIds: [], home: [],
    manualNutrition: { calories: '1,', protein: '', fat: '', carbohydrates: '' }, targetSource: { kind: 'manual' },
  });
  await expect(page.getByLabel('Число людей', { exact: true })).toHaveValue('5');
  await expect(page.getByLabel('Калории, ккал', { exact: true })).toHaveValue('1,');
});

test('CR-01 retry missing read does not write an untouched default draft', async ({ page }) => {
  await mountAppFixture(page, { failRead: true });
  await expect(page.getByRole('status')).toContainText('Не удалось прочитать настройки');
  await page.evaluate(() => sessionStorage.setItem('allow-read', 'yes'));
  await page.getByRole('button', { name: 'Повторить сохранение' }).click();
  await expect(page.getByRole('status')).toHaveCount(0);
  await expect(page.getByLabel('Число людей', { exact: true })).toHaveValue('2');
  expect(await page.evaluate(key => localStorage.getItem(key), draftKey)).toBeNull();
});

test('CR-01 retry corrupt read preserves raw bytes and memory edits until explicit reset', async ({ page }) => {
  await mountAppFixture(page, { raw: '{broken', failRead: true });
  await expect(page.getByRole('status')).toContainText('Не удалось прочитать настройки');
  await page.getByLabel('Число людей', { exact: true }).fill('4');
  await page.evaluate(() => sessionStorage.setItem('allow-read', 'yes'));
  await page.getByRole('button', { name: 'Повторить сохранение' }).click();
  await expect(page.getByText('Не удалось восстановить настройки. Сохранённые данные повреждены или имеют другую версию')).toBeVisible();
  await expect(page.getByLabel('Число людей', { exact: true })).toHaveValue('4');
  expect(await page.evaluate(key => localStorage.getItem(key), draftKey)).toBe('{broken');
  await expect(page.getByText('Сохранено на этом устройстве', { exact: true })).toHaveCount(0);
});

test('CR-01 read retry then failed write retains memory and saves latest edit on another retry', async ({ page }) => {
  await mountAppFixture(page, { draft: stored, failRead: true, failWrite: true });
  await expect(page.getByRole('status')).toContainText('Не удалось прочитать настройки');
  await page.getByLabel('Число людей', { exact: true }).fill('4');
  await page.evaluate(() => sessionStorage.setItem('allow-read', 'yes'));
  await page.getByRole('button', { name: 'Повторить сохранение' }).click();
  await expect(page.getByRole('status')).toContainText('Не удалось сохранить');
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).draft, draftKey)).toEqual(stored);
  await page.getByLabel('Число людей', { exact: true }).fill('6');
  await expect(page.getByRole('status')).toContainText('Не удалось сохранить');
  await page.evaluate(() => sessionStorage.setItem('allow-write', 'yes'));
  await page.getByRole('button', { name: 'Повторить сохранение' }).click();
  await expect(page.getByRole('status')).toHaveText('Сохранено на этом устройстве');
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).draft, draftKey)).toEqual({
    step: 1, people: '6', days: '7', goal: 'maintain', budget: '3000',
    cookingTime: '30', variety: 'medium', restrictions: [], exclusionIds: [], home: [],
    manualNutrition: { calories: '', protein: '', fat: '', carbohydrates: '' }, targetSource: { kind: 'manual' },
  });
});
