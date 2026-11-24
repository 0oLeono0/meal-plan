import { expect, test, type Page } from '@playwright/test';
import type { EditedPlanEnvelope, MealCoordinate, RecipeInstance } from '../src/domain/plan';
import { activeKey } from './generation-fixtures';

async function openCarrotPlan(page: Page, withHistoricStock = false) {
  await page.goto('/plan/new');
  const raw = await page.evaluate(async ({ key, withHistoricStock }) => {
    const catalogPath = '/src/data/catalog.ts';
    const planPath = '/src/domain/plan.ts';
    const settingsPath = '/src/domain/settings.ts';
    const appliedPath = '/src/domain/appliedSettings.ts';
    const quantitiesPath = '/src/domain/quantities.ts';
    const { bundledCatalog } = await import(catalogPath) as typeof import('../src/data/catalog');
    const { createPlanInputs, encodePlanEnvelope, mealSlots } = await import(planPath) as typeof import('../src/domain/plan');
    const { createDraft } = await import(settingsPath) as typeof import('../src/domain/settings');
    const { buildAppliedSettings } = await import(appliedPath) as typeof import('../src/domain/appliedSettings');
    const { decimal } = await import(quantitiesPath) as typeof import('../src/domain/quantities');
    const applied = buildAppliedSettings({ ...createDraft(), days: '2', budget: '5000', cookingTime: 'any',
      home: withHistoricStock ? [{ productId: 'carrot', quantity: '100', unit: 'g', expiresSoon: false }] : [] });
    if (applied.status !== 'applied') throw new Error('Carrot fixture settings are invalid');
    const inputs = createPlanInputs(applied.settings, bundledCatalog, { seed: 'pantry-carrot-fixture', now: () => new Date(2026, 10, 20) });
    const portions = [
      { date: inputs.dates[0], slot: 'lunch', recipeId: 'familiar-chicken-rice-carrot', servings: '2' },
      { date: inputs.dates[0], slot: 'dinner', recipeId: 'familiar-pollock-yogurt-buckwheat', servings: '2' },
      { date: inputs.dates[1], slot: 'lunch', recipeId: 'familiar-chicken-rice-carrot', servings: '1' },
    ] as const;
    const instances = portions.map(({ date, slot, recipeId, servings }): RecipeInstance => {
      const recipe = bundledCatalog.recipes.find(item => item.id === recipeId);
      if (!recipe) throw new Error(`Missing fixture recipe: ${recipeId}`);
      return { id: `carrot-${date}-${slot}`, date, slot, recipeId, catalogVersion: bundledCatalog.version, recipeSnapshot: recipe, selectedServings: decimal(servings) };
    });
    const emptySlots: MealCoordinate[] = inputs.dates.flatMap(date => mealSlots
      .filter(slot => !instances.some(row => row.date === date && row.slot === slot))
      .map(slot => ({ date, slot })));
    const plan: EditedPlanEnvelope = { schemaVersion: 2, inputs, activeVariantId: 'carrot-active', variants: [{ id: 'carrot-active', instances, emptySlots }] };
    const saved = JSON.stringify({ schemaVersion: 1, plan: encodePlanEnvelope(plan) });
    localStorage.setItem(key, saved);
    return saved;
  }, { key: activeKey, withHistoricStock });
  await page.goto('/shopping');
  await expect(page.getByRole('heading', { level: 1, name: 'Список покупок' })).toBeVisible();
  return raw;
}

test('pantry-tracer saves 200 g of the 500 g requirement and buys 300 g after reload', async ({ page }) => {
  const initial = await openCarrotPlan(page);
  const carrot = page.locator('article[data-product-id="carrot"]');
  await expect(carrot.getByText(/Купить 500 г/)).toBeVisible();
  await page.getByRole('link', { name: 'Дома', exact: true }).click();
  await expect(page).toHaveURL(/\/pantry$/);
  const search = page.getByRole('combobox', { name: 'Найти продукт' });
  await expect(search).toBeVisible();
  await search.fill('морковь');
  await page.getByRole('option', { name: /^Морковь/ }).click();
  await page.getByRole('button', { name: 'Добавить выбранный продукт' }).click();
  await page.getByRole('button', { name: /Указать количество.*морковь/i }).click();
  await page.getByLabel('Количество', { exact: true }).fill('200');
  await page.getByLabel('Единица', { exact: true }).selectOption('g');
  await page.getByRole('button', { name: 'Сохранить количество' }).click();
  await expect(page.getByText('Запасы сохранены', { exact: true })).toBeVisible();

  await page.getByRole('link', { name: 'Покупки', exact: true }).click();
  for (const reload of [false, true]) {
    if (reload) await page.reload();
    await expect(carrot.getByText(/Купить 300 г/)).toBeVisible();
    await expect(carrot.getByText(/Нужно 500 г · Из запасов 200 г/)).toBeVisible();
    expect(await page.evaluate(key => localStorage.getItem(key), activeKey)).toBe(initial);
  }
});

test('pantry-crud edits a stock flag and quantity and removes the last confirmed row', async ({ page }) => {
  const pantryKey = 'mealplan:guest:pantry:v1';
  const initialPlan = await openCarrotPlan(page, true);
  await page.getByRole('link', { name: 'Дома', exact: true }).click();
  const carrot = page.getByRole('region', { name: /Домашний продукт Морковь/ });
  await expect(carrot).toBeVisible();
  expect(await page.evaluate(key => localStorage.getItem(key), pantryKey)).toBeNull();

  const search = page.getByRole('combobox', { name: 'Найти продукт' });
  const chips = page.getByRole('group', { name: 'Популярные продукты' });
  await expect(chips.getByRole('button')).toHaveText(['Яйца', 'Курица', 'Помидоры', 'Творог', 'Рис', 'Картофель']);
  await search.fill('рис');
  await expect(page.getByRole('option', { name: 'Рис', exact: true })).toBeVisible();
  await search.press('Enter');
  const rice = page.getByRole('region', { name: 'Домашний продукт Рис' });
  await expect(rice).toHaveCount(0);
  const add = page.getByRole('button', { name: 'Добавить выбранный продукт' });
  await add.focus();
  await add.press('Enter');
  await expect(rice).toBeVisible();

  const beforeDuplicate = await page.evaluate(key => localStorage.getItem(key), pantryKey);
  await chips.getByRole('button', { name: 'Рис', exact: true }).click();
  await expect(rice.getByLabel('Количество', { exact: true })).toBeFocused();
  await expect(rice).toHaveCount(1);
  expect(await page.evaluate(key => localStorage.getItem(key), pantryKey)).toBe(beforeDuplicate);
  await rice.getByRole('button', { name: 'Отменить правку количества' }).click();

  const expiry = carrot.getByRole('checkbox', { name: /Скоро испортится.*морковь/i });
  await expect(expiry).toBeVisible();
  await expiry.check();
  await expect(expiry).toBeChecked();
  expect(await page.evaluate(key => localStorage.getItem(key), pantryKey)).toContain('"productId":"carrot","quantity":"100","expiresSoon":true');
  await carrot.getByRole('button', { name: /Изменить количество.*морковь/i }).click();
  await carrot.getByLabel('Количество', { exact: true }).fill('0,2');
  await carrot.getByLabel('Единица', { exact: true }).selectOption('kg');
  await carrot.getByRole('button', { name: 'Сохранить количество' }).click();
  await expect(carrot.getByRole('button', { name: /Изменить количество.*морковь/i })).toHaveText('0,2 кг');
  await expect(expiry).toBeChecked();

  const removeCarrot = carrot.getByRole('button', { name: /Удалить.*морковь/i });
  const dialog = page.getByRole('dialog');
  await removeCarrot.click();
  await expect(dialog.getByRole('button', { name: 'Оставить продукт' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(removeCarrot).toBeFocused();
  await expect(expiry).toBeChecked();
  await rice.getByRole('button', { name: /Удалить.*рис/i }).click();
  await dialog.getByRole('button', { name: 'Удалить продукт' }).click();
  await expect(rice).toHaveCount(0);
  await removeCarrot.click();
  await dialog.getByRole('button', { name: 'Удалить продукт' }).click();
  await expect(search).toBeFocused();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Добавьте, что есть дома, и мы не купим лишнего' })).toBeVisible();
  await expect(carrot).toHaveCount(0);
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).rows, pantryKey)).toEqual([]);
  await page.getByRole('link', { name: 'Покупки', exact: true }).click();
  await expect(page.locator('article[data-product-id="carrot"]').getByText(/Купить 500 г/)).toBeVisible();
  expect(await page.evaluate(key => localStorage.getItem(key), activeKey)).toBe(initialPlan);
});

test('pantry-write-failure preserves confirmed stock and retries the visible quantity', async ({ page }) => {
  const pantryKey = 'mealplan:guest:pantry:v1';
  await page.addInitScript(key => {
    const write = Storage.prototype.setItem;
    Storage.prototype.setItem = function (storageKey, value) {
      if (this === localStorage && storageKey === key && sessionStorage.getItem('deny-pantry-write')) {
        throw new DOMException('Simulated quota reached', 'QuotaExceededError');
      }
      write.call(this, storageKey, value);
    };
  }, pantryKey);

  const initialPlan = await openCarrotPlan(page);
  await page.getByRole('link', { name: 'Дома', exact: true }).click();
  await page.getByRole('combobox', { name: 'Найти продукт' }).fill('морковь');
  await page.getByRole('option', { name: /^Морковь/ }).click();
  await page.getByRole('button', { name: 'Добавить выбранный продукт' }).click();
  await expect(page.getByText('Запасы сохранены', { exact: true })).toBeVisible();
  const initialPantry = await page.evaluate(key => {
    sessionStorage.setItem('deny-pantry-write', '1');
    return localStorage.getItem(key);
  }, pantryKey);
  expect(initialPantry).toContain('"productId":"carrot","quantity":""');

  await page.getByRole('button', { name: /Указать количество.*морковь/i }).click();
  const quantity = page.getByLabel('Количество', { exact: true });
  const unit = page.getByLabel('Единица', { exact: true });
  await quantity.fill('200');
  await unit.selectOption('g');
  await page.getByRole('button', { name: 'Сохранить количество' }).click();
  await expect(page.getByRole('alert').getByText('Не удалось сохранить изменения')).toBeVisible();
  expect(await page.evaluate(key => localStorage.getItem(key), pantryKey)).toBe(initialPantry);
  expect(await page.evaluate(key => localStorage.getItem(key), activeKey)).toBe(initialPlan);

  const shopping = await page.context().newPage();
  await shopping.goto('/shopping');
  const carrot = shopping.locator('article[data-product-id="carrot"]');
  await expect(carrot.getByText(/Купить 500 г/)).toBeVisible();
  await page.evaluate(() => sessionStorage.removeItem('deny-pantry-write'));
  await quantity.fill('0,25');
  await unit.selectOption('kg');
  await page.getByRole('button', { name: 'Повторить сохранение' }).click();
  await expect(page.getByText('Запасы сохранены', { exact: true })).toBeVisible();
  await shopping.reload();
  await expect(carrot.getByText(/Купить 250 г/)).toBeVisible();
  await expect(carrot.getByText(/Нужно 500 г · Из запасов 250 г/)).toBeVisible();
  expect(await page.evaluate(key => localStorage.getItem(key), pantryKey)).toContain('"quantity":"0,25"');
  expect(await page.evaluate(key => localStorage.getItem(key), activeKey)).toBe(initialPlan);
});
