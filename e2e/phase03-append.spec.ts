import { test, expect } from '@playwright/test';
import { mountGeneration, activeKey, finishWizard, release, count } from './generation-fixtures';
import legacyPlan from '../src/test/fixtures/phase02-active-plan-v1.json' with { type: 'json' };

test('real append preserves saved inputs and alternatives across reload', async ({ page }) => {
  test.setTimeout(85_000);
  await page.goto('/');
  await page.getByRole('button', { name: 'Меню за 1 клик', exact: true }).click();
  await expect(page).toHaveURL(/\/menu$/, { timeout: 32_000 });
  const old = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).plan, activeKey);
  expect(old.variants).toHaveLength(3);
  await page.getByRole('button', { name: 'Пересобрать', exact: true }).click();
  await expect(page.getByText('Вариант 4 из 4', { exact: true })).toBeVisible({ timeout: 32_000 });
  const next = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).plan, activeKey);
  expect(next.inputs).toEqual(old.inputs);
  expect(next.variants.slice(0, 3)).toEqual(old.variants);
  const assignments = next.variants.map((v: typeof old.variants[number]) => JSON.stringify(v.instances.map((r: typeof v.instances[number]) => [r.date, r.slot, r.recipeId, r.selectedServings])));
  expect(new Set(assignments).size).toBe(4);
  expect(next.activeVariantId).toBe(next.variants[3].id);
  await page.reload();
  await expect(page.getByText('Вариант 4 из 4', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Предыдущий вариант', exact: true }).click();
  await expect(page.getByText('Вариант 3 из 4', { exact: true })).toBeVisible();
});

test('no new result preserves exact bytes and exposes persistent honest recovery', async ({ page }) => {
  const bytes = JSON.stringify(legacyPlan);
  await mountGeneration(page, { route: '/menu', activeRaw: bytes, error: { code: 'SEARCH_EXHAUSTED', message: 'controlled', diagnostics: [] } });
  await page.getByRole('button', { name: 'Пересобрать', exact: true }).click();
  await expect(page.getByText('Новый вариант не найден', { exact: true })).toBeVisible();
  expect(await page.evaluate(key => localStorage.getItem(key), activeKey)).toBe(bytes);
  expect(await page.evaluate(() => sessionStorage.getItem('generation-calls'))).toBe('1');
  await page.getByRole('link', { name: /^Список покупок ·/ }).click();
  await page.goBack();
  await expect(page.getByText('Новый вариант не найден', { exact: true })).toBeVisible();
});

function savedAlternatives(amount: number) {
  const source = legacyPlan.plan.variants[0];
  const gcd = (a: number, b: number): number => b ? gcd(b, a % b) : a;
  const variants = Array.from({ length: amount }, (_, i) => ({ ...source, id: `saved-${i}`, instances: source.instances.map(row => ({
    ...row, id: `saved-${i}/${row.date}/${row.slot}`, selectedServings: { numerator: String((5 + i) / gcd(5 + i, 10)), denominator: String(10 / gcd(5 + i, 10)) },
  })) }));
  return JSON.stringify({ ...legacyPlan, plan: { ...legacyPlan.plan, variants, activeVariantId: variants[0].id } });
}

test('cap twelve confirms replacement and preserves old bytes through cancel and failed write', async ({ page }) => {
  test.setTimeout(65_000);
  const bytes = savedAlternatives(12);
  await mountGeneration(page, { route: '/menu', activeRaw: bytes, failWrite: true, draft: { budget: '777.25', days: '1' } });
  await expect(page.getByText('Вариант 1 из 12', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Пересобрать', exact: true })).toBeDisabled();
  const create = page.getByRole('button', { name: 'Создать новый набор', exact: true });
  await create.click({ timeout: 5000 });
  await expect(page.getByRole('dialog', { name: 'Создать новый набор меню?' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Оставить варианты', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(create).toBeFocused();
  expect(await page.evaluate(key => localStorage.getItem(key), activeKey)).toBe(bytes);
  expect(await count(page, 'generation-calls')).toBe(0);
  await create.click();
  await page.getByRole('dialog').getByRole('button', { name: 'Создать новый набор', exact: true }).click();
  await expect(page.getByText('Новый набор рассчитан, но не сохранён', { exact: true })).toBeVisible({ timeout: 32_000 });
  expect(await page.evaluate(key => localStorage.getItem(key), activeKey)).toBe(bytes);
  await expect(page.getByText('Вариант 1 из 12', { exact: true })).toBeVisible();
  await page.evaluate(() => sessionStorage.setItem('allow-write', 'yes'));
  await page.getByRole('button', { name: 'Повторить сохранение', exact: true }).click();
  await expect(page.getByText('Вариант 1 из 3', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
  expect(await count(page, 'generation-calls')).toBe(1);
  const next = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).plan, activeKey);
  expect(next.inputs).toEqual(JSON.parse(bytes).plan.inputs);
  expect(next.variants).toHaveLength(3);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('mealplan:guest:draft:v1')!).draft.budget)).toBe('777.25');
  await expect(page.getByRole('button', { name: /Заменить блюдо|Удалить блюдо|PNG|Избранное/ })).toHaveCount(0);
});

test('eleven appends to twelve using saved settings despite a different editable draft', async ({ page }) => {
  test.setTimeout(65_000);
  const bytes = savedAlternatives(11);
  await mountGeneration(page, { route: '/menu', activeRaw: bytes, draft: { budget: '777.25', days: '1' } });
  await page.getByRole('button', { name: 'Пересобрать', exact: true }).click();
  await expect(page.getByText('Вариант 12 из 12', { exact: true })).toBeVisible({ timeout: 32_000 });
  await expect(page.getByRole('button', { name: 'Пересобрать', exact: true })).toBeDisabled();
  const next = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).plan, activeKey);
  expect(next.inputs).toEqual(JSON.parse(bytes).plan.inputs);
  expect(next.variants.slice(0, 11)).toEqual(JSON.parse(bytes).plan.variants);
  expect(await count(page, 'generation-calls')).toBe(1);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('mealplan:guest:draft:v1')!).draft.budget)).toBe('777.25');
});

test('changed draft launch needs confirmation and installs only after save acknowledgement', async ({ page }) => {
  test.setTimeout(65_000);
  const bytes = JSON.stringify(legacyPlan);
  await mountGeneration(page, { route: '/menu', activeRaw: bytes, draft: { days: '1', budget: '01777' }, deferSave: true });
  await page.getByText('Действия с меню', { exact: true }).click({ timeout: 5000 });
  await page.getByRole('link', { name: 'Изменить настройки', exact: true }).click();
  expect(await page.evaluate(key => localStorage.getItem(key), activeKey)).toBe(bytes);
  await finishWizard(page);
  await expect(page.getByRole('dialog', { name: 'Составить меню с новыми настройками?' })).toBeVisible();
  const oldDraft = await page.evaluate(() => localStorage.getItem('mealplan:guest:draft:v1'));
  await page.getByRole('button', { name: 'Оставить варианты', exact: true }).click();
  expect(await page.evaluate(() => localStorage.getItem('mealplan:guest:draft:v1'))).toBe(oldDraft);
  expect(await page.evaluate(key => localStorage.getItem(key), activeKey)).toBe(bytes);
  await expect(page.getByRole('button', { name: 'Составить меню', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Составить меню', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Составить меню', exact: true }).click();
  await expect.poll(() => count(page, 'save-calls'), { timeout: 32_000 }).toBe(1);
  expect(await page.evaluate(key => localStorage.getItem(key), activeKey)).toBe(bytes);
  await release(page, 'save-1');
  await expect(page).toHaveURL(/\/menu$/);
  const next = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).plan, activeKey);
  expect(next.inputs.appliedSettings.raw.budget).toBe('01777');
  expect(next.inputs.dates).toHaveLength(1);
  expect(next.variants).toHaveLength(3);
});
