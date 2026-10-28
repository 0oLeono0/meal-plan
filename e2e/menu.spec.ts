import { test, expect } from '@playwright/test';
import { generateRealPlan, openSyntheticPlan } from './plan-fixtures';

test('real saved catalog menu has dated ordered slots and truthful provenance', async ({ page }) => {
  await generateRealPlan(page);
  await expect(page.locator('[data-date]')).toHaveCount(7);
  await expect(page.locator('[data-instance-id]')).toHaveCount(28);
  await expect(page.locator('[data-date]').first().locator('article h3')).toHaveText(['Завтрак', 'Обед', 'Ужин', 'Перекус']);
  await expect(page.getByText('Ручная цель КБЖУ не задана', { exact: true })).toBeVisible();
  await expect(page.getByText(/Расчёт не подтверждает полноценность рациона/)).toBeVisible();
  const summary = page.getByRole('region', { name: 'Бюджет меню' });
  await expect(summary.getByText(/Использовано бюджета: \d+%/)).toBeVisible();
  await page.getByText('Источники расчёта', { exact: true }).click();
  await expect(page.getByText(/usda-fdc-sr-legacy/).first()).toBeVisible();
  await expect(page.getByText(/Веб-витрина не подтверждает наличие цены в вашем регионе/)).toBeVisible();
  const id = await page.locator('[data-plan-id]').getAttribute('data-plan-id');
  await page.reload();
  await expect(page.locator('[data-plan-id]')).toHaveAttribute('data-plan-id', id!);
});

test('synthetic independent nutrition costs and family basis stay distinct without norm', async ({ page }) => {
  await openSyntheticPlan(page);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Меню на 1 день');
  await expect(page.getByText('1 октября 2026 г. — 1 октября 2026 г. · На 2 человека')).toBeVisible();
  const summary = page.getByRole('region', { name: 'Бюджет меню' });
  await expect(summary.locator('dd')).toHaveText(['50,00 ₽', '20,00 ₽', '30,00 ₽']);
  await expect(summary).toContainText('Осталось 2 970,00 ₽');
  await expect(summary).toContainText('Использовано бюджета: 1%');
  const average = page.getByRole('heading', { name: 'Среднее на человека в день' }).locator('..');
  await expect(average.locator('dd')).toHaveText(['1 000 ккал', '50,0 г', '0,0 г', '150,0 г']);
  await expect(average).not.toContainText(/из \d|Отклонение|выше ручной/);
  await expect(average.getByRole('progressbar')).toHaveCount(0);
  await expect(page.locator('article').first()).toContainText('На порцию: 250 ккал · Б 12,5 г · Ж 0,0 г · У 37,5 г · ≈ 6,25 ₽');
  await expect(page.getByText('Полная стоимость ингредиентов семьи за день: 50,00 ₽')).toBeVisible();
  await page.getByText('КБЖУ семьи за день', { exact: true }).click();
  await expect(page.locator('[data-date] details')).toContainText('2 000 ккал');
  await page.getByText('Источники расчёта', { exact: true }).click();
  await expect(page.getByText(/Цена: synthetic-browser-only \/ price-0/)).toContainText('1 кг');
  await expect(page.getByText(/КБЖУ: synthetic-browser-only/)).toContainText('100 г');
});

for (const target of ['exact-ten', 'above-ten', 'zero-positive'] as const) test(`synthetic target ${target} uses exact boundary and zero handling`, async ({ page }) => {
  await openSyntheticPlan(page, { target });
  const average = page.getByRole('heading', { name: 'Среднее на человека в день' }).locator('..');
  await expect(average).toContainText('Цель введена вручную · на человека в день');
  await expect(average).toContainText('0,0 из 0,0 г');
  await expect(average).not.toContainText(/Infinity|NaN/);
  if (target === 'exact-ten') {
    await expect(average).toContainText('1 100 из 1 000 ккал');
    await expect(average.locator('.field-error')).toHaveCount(0);
  } else if (target === 'above-ten') {
    await expect(average).toContainText('1 100 из 1 000 ккал');
    await expect(average.getByText('Калории выше ручной цели более чем на 10%')).toHaveCount(1);
    await expect(average.locator('.field-error')).toHaveCount(1);
  } else {
    await expect(average.getByText('Выше заданного значения 0 г')).toHaveCount(1);
    await expect(average.locator('.field-error')).toHaveCount(1);
  }
});
