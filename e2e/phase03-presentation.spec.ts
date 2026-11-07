import { test, expect } from '@playwright/test';
import { openSyntheticPlan } from './plan-fixtures';

const key = 'mealplan:guest:active-plan:v1';

test('EC-23/24/28/29 real saved day card opens exact occurrence and returns to its day and focus', async ({ page }) => {
  test.setTimeout(70_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Меню за 1 клик', exact: true }).click();
  await expect(page).toHaveURL(/\/menu$/, { timeout: 32_000 });
  const raw = await page.evaluate(key => localStorage.getItem(key), key);
  const saved = JSON.parse(raw!).plan;
  const variant = saved.variants.find((row: { id: string }) => row.id === saved.activeVariantId);
  const occurrence = variant.instances[variant.instances.length - 1];
  const tab = page.getByRole('tab').last();
  await expect(tab).toBeVisible();
  await tab.click();
  const card = page.locator(`[data-instance-id="${occurrence.id}"]`);
  const link = card.getByRole('link');
  await expect(link).toHaveAccessibleName(new RegExp(occurrence.recipeSnapshot.name));
  await expect(link).toHaveAttribute('href', `/recipe/${occurrence.recipeId}?${new URLSearchParams({ variant: saved.activeVariantId, instance: occurrence.id, view: 'day', day: occurrence.date })}`);
  await expect(card.locator('img')).toHaveAttribute('alt', '');
  await link.click();
  await expect(page.locator('[data-instance-id]')).toHaveAttribute('data-instance-id', occurrence.id);
  await page.getByRole('link', { name: 'К меню', exact: true }).click();
  await expect(page).toHaveURL(`/menu?view=day&day=${occurrence.date}`);
  await expect(link).toBeFocused();
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(raw);
  await page.getByRole('button', { name: 'Следующий вариант', exact: true }).click();
  await expect(page.getByText('Вариант 2 из 3', { exact: true })).toBeVisible();
  await expect(page.getByRole('tab', { selected: true })).toHaveAttribute('data-day', occurrence.date);
});

test('EC-18/21/25/26/27/30 actual dates slots per-portion facts allocation and responsive grid', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 812 });
  await openSyntheticPlan(page, { days: 3, stock: 'partial' });
  await expect(page.getByRole('tab')).toHaveCount(3);
  await expect(page.locator('[data-instance-id]:visible')).toHaveCount(4);
  const breakfast = page.locator('[data-instance-id="synthetic-2026-10-01-breakfast"]');
  await expect(breakfast.getByText('Использует запасы', { exact: true })).toBeVisible();
  await expect(page.locator('[data-instance-id="synthetic-2026-10-01-lunch"]').getByText('Использует запасы', { exact: true })).toBeVisible();
  await expect(page.locator('[data-instance-id="synthetic-2026-10-01-dinner"]').getByText('Использует запасы', { exact: true })).toHaveCount(0);
  await expect(breakfast).toContainText('10 мин · 250 ккал');
  await expect(breakfast).toContainText('≈ 6,25 ₽ за порцию');
  await expect(breakfast).toContainText('Порций для семьи: 2');
  await expect(breakfast.getByRole('img', { name: 'Фото недоступно' })).toBeVisible();
  await page.getByRole('button', { name: 'Вся неделя', exact: true }).click();
  for (const width of [360, 390, 430, 768, 1199, 1200, 1279, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    const days = page.locator('.menu-day');
    await expect(days).toHaveCount(3);
    const first = (await days.nth(0).boundingBox())!, second = (await days.nth(1).boundingBox())!;
    if (width < 1280) expect(second.y).toBeGreaterThan(first.y + first.height - 1);
    else { expect(second.y).toBe(first.y); expect(second.x).toBeGreaterThan(first.x); }
    const media = (await breakfast.getByRole('img').boundingBox())!;
    expect(media.width / media.height).toBeCloseTo(4 / 3, 1);
    expect((await breakfast.getByRole('link').boundingBox())!.height).toBeGreaterThanOrEqual(44);
  }
  expect(await page.locator('.menu-days [data-instance-id]').evaluateAll(rows => rows.map(row => row.getAttribute('data-instance-id')))).toEqual(
    ['01', '02', '03'].flatMap(day => ['breakfast', 'lunch', 'dinner', 'snack'].map(slot => `synthetic-2026-10-${day}-${slot}`)));
});
