import { test, expect } from '@playwright/test';
import { generateRealPlan, openSyntheticPlan } from './plan-fixtures';

test('real offline menu shopping menu navigation and reload preserve one active snapshot', async ({ page, context }) => {
  await generateRealPlan(page);
  const id = await page.locator('[data-plan-id]').getAttribute('data-plan-id');
  const costs = await page.getByRole('region', { name: 'Бюджет меню' }).locator('dd').allTextContents();
  const saved = await page.evaluate(() => localStorage.getItem('mealplan:guest:active-plan:v1'));
  await context.setOffline(true);
  await page.getByRole('link', { name: /^Список покупок ·/ }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Список покупок');
  await expect(page.locator('[data-plan-id]')).toHaveAttribute('data-plan-id', id!);
  await expect(page.getByRole('region', { name: 'Бюджет меню' }).locator('dd')).toHaveText(costs);
  await expect(page.locator('[data-product-id]').first()).toContainText('Купить');
  await page.getByRole('link', { name: 'К меню', exact: true }).click();
  await expect(page).toHaveURL(/\/menu$/);
  await expect(page.getByRole('region', { name: 'Бюджет меню' }).locator('dd')).toHaveText(costs);
  await context.setOffline(false); // A local dev-server module reload needs localhost; catalog itself stays bundled.
  await page.reload();
  await expect(page.locator('[data-plan-id]')).toHaveAttribute('data-plan-id', id!);
  await page.getByRole('link', { name: /^Список покупок ·/ }).click();
  await page.reload();
  await expect(page.locator('[data-plan-id]')).toHaveAttribute('data-plan-id', id!);
  await expect(page.getByRole('region', { name: 'Бюджет меню' }).locator('dd')).toHaveText(costs);
  expect(await page.evaluate(() => localStorage.getItem('mealplan:guest:active-plan:v1'))).toBe(saved);
});

test('synthetic partial stock is spent once and repeated recipe has four dated instance sources', async ({ page }) => {
  await openSyntheticPlan(page);
  await page.getByRole('link', { name: 'Список покупок · 1 товар', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Список покупок');
  await expect(page.getByText('1 товар · ≈ 30,00 ₽', { exact: true })).toBeVisible();
  const row = page.locator('[data-product-id="synthetic-0"]');
  await expect(row).toContainText('Купить 300 г');
  await expect(row).toContainText('Нужно 500 г · Из запасов 200 г');
  await expect(row).toContainText('≈ 30,00 ₽');
  await row.getByText('Из 4 блюд', { exact: true }).click();
  await expect(row.locator('li')).toHaveCount(4);
  for (const slot of ['Завтрак', 'Обед', 'Ужин', 'Перекус']) await expect(row.locator('li').filter({ hasText: slot })).toHaveText(`1 октября 2026 г. · ${slot} · Синтетическое повторяющееся блюдо · 125 г`);
  const covered = page.locator('details').filter({ has: page.locator('summary', { hasText: 'Уже есть дома' }) });
  await expect(covered).not.toHaveAttribute('open', '');
  await covered.locator('summary').click();
  await expect(covered).toContainText('200 г · ≈ 20,00 ₽');
  await expect(covered).toContainText('Запасы не списываются');
  await expect(page.getByRole('region', { name: 'Бюджет меню' }).locator('dd')).toHaveText(['50,00 ₽', '20,00 ₽', '30,00 ₽']);
  await expect(page.getByRole('checkbox')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /PDF|Добавить|Изменить|Поделиться/ })).toHaveCount(0);
});

for (const stock of ['all', 'over'] as const) test(`synthetic ${stock} stock leaves zero purchases and capped coverage`, async ({ page }) => {
  await openSyntheticPlan(page, { stock }, '/shopping');
  await expect(page.getByText('0 товаров · ≈ 0,00 ₽', { exact: true })).toBeVisible();
  await expect(page.getByText('Всё необходимое уже есть дома', { exact: true })).toBeVisible();
  await expect(page.getByText('Покупать ничего не нужно: требуемые количества покрыты запасами')).toBeVisible();
  await expect(page.locator('[data-product-id]')).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Бюджет меню' }).locator('dd')).toHaveText(['50,00 ₽', '50,00 ₽', '0,00 ₽']);
  await expect(page.getByText('Использовано бюджета: 0%', { exact: true })).toBeVisible();
  await page.getByText('Уже есть дома · ≈ 50,00 ₽', { exact: true }).click();
  await expect(page.getByText('Синтетический продукт · 500 г · ≈ 50,00 ₽', { exact: true })).toBeVisible();
  await expect(page.getByText('Всё куплено', { exact: true })).toHaveCount(0);
});

for (const stock of ['unknown', 'incompatible', 'none'] as const) test(`synthetic ${stock} stock never creates fictional coverage`, async ({ page }) => {
  await openSyntheticPlan(page, { stock }, '/shopping');
  await expect(page.locator('[data-product-id]')).toContainText('Купить 500 г');
  await expect(page.getByRole('region', { name: 'Бюджет меню' }).locator('dd')).toHaveText(['50,00 ₽', '0,00 ₽', '50,00 ₽']);
  await page.getByText('Уже есть дома · ≈ 0,00 ₽', { exact: true }).click();
  await expect(page.getByText('Нет количественного покрытия запасами')).toBeVisible();
  if (stock === 'unknown') await expect(page.getByText('Синтетический продукт: количество не указано — запас не вычтен', { exact: true })).toBeVisible();
  if (stock === 'incompatible') await expect(page.getByText('Синтетический продукт: единицы запаса и потребности несовместимы — запас не вычтен', { exact: true })).toBeVisible();
});

test('synthetic many rows keep duplicate names by ID and categories in approved order', async ({ page }) => {
  await openSyntheticPlan(page, { many: true }, '/shopping');
  await expect(page.getByText('6 товаров · ≈ 180,00 ₽', { exact: true })).toBeVisible();
  await expect(page.locator('[data-product-id]')).toHaveCount(6);
  await expect(page.locator('[data-category] h2')).toHaveText(['Овощи и фрукты', 'Мясо и рыба', 'Молочное', 'Бакалея', 'Хлеб', 'Прочее']);
  expect(await page.locator('[data-product-id]').evaluateAll(rows => new Set(rows.map(row => row.getAttribute('data-product-id'))).size)).toBe(6);
  await expect(page.getByRole('region', { name: 'Бюджет меню' }).locator('dd')).toHaveText(['300,00 ₽', '120,00 ₽', '180,00 ₽']);
  const saved = await page.evaluate(() => localStorage.getItem('mealplan:guest:active-plan:v1'));
  expect(saved).toContain('2026-10-02');
  expect(saved).toContain('price-1');
  await page.getByText('Как считаем', { exact: true }).click();
  await expect(page.getByRole('region', { name: 'О расчётах' })).toContainText('В магазине стоимость может отличаться');
  await expect(page.getByRole('region', { name: 'О расчётах' })).not.toContainText('synthetic-browser-only');
  expect(await page.evaluate(() => localStorage.getItem('mealplan:guest:active-plan:v1'))).toBe(saved);
});

for (const split of ['one', 'two'] as const) test(`synthetic ${split} instance sources have grammatical counts and literal contributions`, async ({ page }) => {
  await openSyntheticPlan(page, { split, stock: 'none' }, '/shopping');
  const row = page.locator('[data-product-id="synthetic-0"]');
  await row.getByText(split === 'one' ? 'Из 1 блюда' : 'Из 2 блюд', { exact: true }).click();
  await expect(row.locator('li')).toHaveCount(split === 'one' ? 1 : 2);
  await expect(row).toContainText(split === 'one' ? 'Купить 125 г · ≈ 12,50 ₽' : 'Купить 250 г · ≈ 25,00 ₽');
});

test('synthetic long product text fits mobile with all source and coverage rows accessible', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await openSyntheticPlan(page, { many: true, long: true }, '/shopping');
  await page.locator('[data-product-id]').last().locator('summary').click();
  await expect(page.locator('[data-product-id]').last().locator('li')).toHaveCount(4);
  await page.evaluate(() => document.documentElement.style.fontSize = '200%');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('link', { name: 'К меню', exact: true }).focus();
  await expect(page.getByRole('link', { name: 'К меню', exact: true })).toBeFocused();
});

for (const category of ['constructor', 'toString', '__proto__']) test(`synthetic inherited category ${category} remains visible as other`, async ({ page }) => {
  await openSyntheticPlan(page, { category }, '/shopping');
  await expect(page.locator('[data-category] h2')).toHaveText(['Прочее']);
  await expect(page.locator('[data-product-id]')).toHaveCount(1);
  await expect(page.locator('[data-product-id]')).toContainText('Купить 300 г · ≈ 30,00 ₽');
});

test('shopping absent corrupt and retry states remain truthful', async ({ page }) => {
  await page.goto('/shopping');
  await expect(page.getByRole('heading', { name: 'Сначала составьте меню' })).toBeVisible();
  await page.evaluate(() => localStorage.setItem('mealplan:guest:active-plan:v1', '{broken'));
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Сохранённое меню повреждено или несовместимо с текущей версией' })).toBeVisible();
  await page.getByRole('button', { name: 'Повторить загрузку', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Сохранённое меню повреждено или несовместимо с текущей версией' })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('mealplan:guest:active-plan:v1'))).toBe('{broken');
});

test('shopping pending load error and recovery use the real injected active port', async ({ page }) => {
  await page.goto('/shopping');
  await expect(page.getByRole('heading', { name: 'Сначала составьте меню' })).toBeVisible();
  await page.evaluate(async () => {
    const resources = performance.getEntriesByType('resource').map(row => row.name);
    const { default: { createElement } } = await import(resources.find(url => /\/react\.js\?/.test(url))!);
    const { default: { createRoot } } = await import(resources.find(url => /\/react-dom_client\.js\?/.test(url))!);
    const appPath = '/src/app/App.tsx'; const { App } = await import(appPath);
    let reads = 0;
    const activePlanPort = {
      async load() {
        if (++reads > 1) return { status: 'missing' };
        await new Promise<void>(resolve => window.addEventListener('release-active-load', () => resolve(), { once: true }));
        return { status: 'error' };
      },
      async save() { return { status: 'error' }; },
    };
    document.getElementById('root')?.remove();
    const container = document.createElement('div'); document.body.append(container);
    createRoot(container).render(createElement(App, { activePlanPort }));
  });
  await expect(page.getByText('Загружаем покупки…', { exact: true })).toBeVisible();
  await page.evaluate(() => window.dispatchEvent(new Event('release-active-load')));
  await expect(page.getByRole('heading', { name: 'Не удалось загрузить покупки' })).toBeVisible();
  await page.getByRole('button', { name: 'Повторить загрузку', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Сначала составьте меню' })).toBeVisible();
});
