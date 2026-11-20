import { test, expect } from '@playwright/test';
import { generateRealPlan } from './plan-fixtures';

const activeKey = 'mealplan:guest:active-plan:v1';

for (const width of [360, 768, 1280]) test(`plain calculation note on real menu shopping recipe at ${width}px`, async ({ page }, testInfo) => {
  await page.setViewportSize({ width, height: 900 });
  await generateRealPlan(page, 1);
  const saved = await page.evaluate(key => localStorage.getItem(key), activeKey);
  expect(saved).toContain('sourceSnapshots');
  expect(saved).toContain('usda-fdc-sr-legacy');

  for (const screen of ['menu', 'shopping', 'recipe']) {
    if (screen === 'shopping') await page.getByRole('link', { name: /^Список покупок ·/ }).click();
    if (screen === 'recipe') {
      await page.getByRole('link', { name: 'К меню', exact: true }).click();
      await page.locator('[data-instance-id]').first().getByRole('link').click();
    }
    const note = page.getByRole('region', { name: 'О расчётах' });
    await expect(note.getByText('Цены и КБЖУ примерные', { exact: true })).toBeVisible();
    const summary = note.locator('summary');
    const details = note.locator('details');
    await expect(summary).toHaveText('Как считаем');
    await expect(details).not.toHaveAttribute('open');
    await summary.focus();
    await page.keyboard.press('Enter');
    await expect(details).toHaveAttribute('open', '');
    await expect(details).toContainText('Используем примерные справочные цены');
    await expect(details).toContainText('В магазине стоимость может отличаться');
    await expect(details).toContainText('КБЖУ считаем по количеству продуктов и порциям');
    await expect(details).toContainText('марки продуктов и способа приготовления');
    await expect(note).not.toContainText(/https?:|sourceId|recordId|usda|synthetic|Смоленск|Версия каталога/i);
    await expect(page.getByText('Источники расчёта', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Источники данных', { exact: true })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    await note.screenshot({ path: `.tmp/quick-estimates/${testInfo.project.name}-${screen}-${width}-open.png` });
    await page.keyboard.press('Space');
    await expect(details).not.toHaveAttribute('open');
    await expect(summary).toBeFocused();
    await page.screenshot({ path: `.tmp/quick-estimates/${testInfo.project.name}-${screen}-${width}.png`, fullPage: true });
    expect(await page.evaluate(key => localStorage.getItem(key), activeKey)).toBe(saved);
  }
  await page.reload();
  await expect(page.getByRole('region', { name: 'О расчётах' })).toBeVisible();
  expect(await page.evaluate(key => localStorage.getItem(key), activeKey)).toBe(saved);
});
