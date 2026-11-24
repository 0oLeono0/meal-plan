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

test('pantry-recovery follows storage events and preserves the last confirmed calculation during recovery', async ({ page }) => {
  const pantryKey = 'mealplan:guest:pantry:v1';
  const initialPlan = await openCarrotPlan(page, true);
  await page.getByRole('link', { name: 'Дома', exact: true }).click();
  const row = (tab: Page) => tab.getByRole('region', { name: /Домашний продукт Морковь/ });
  const openAmount = (tab: Page) => row(tab).getByRole('button', { name: /Изменить количество.*морковь/i }).click();
  const amount = (tab: Page) => row(tab).getByLabel('Количество', { exact: true });
  const save = (tab: Page) => row(tab).getByRole('button', { name: 'Сохранить количество' }).click();
  await openAmount(page);
  await amount(page).fill('200');
  await save(page);
  await expect(page.getByText('Запасы сохранены', { exact: true })).toBeVisible();

  const other = await page.context().newPage();
  await other.goto('/shopping');
  const purchase = (tab: Page) => tab.locator('article[data-product-id="carrot"]');
  await expect(purchase(other).getByText(/Купить 300 г/)).toBeVisible();
  await openAmount(page);
  await amount(page).fill('250');
  await save(page);
  await expect(purchase(other).getByText(/Купить 250 г/)).toBeVisible();

  await other.getByRole('link', { name: 'Дома', exact: true }).click();
  await openAmount(page);
  await amount(page).fill('210');
  await openAmount(other);
  await amount(other).fill('260');
  await save(other);
  await expect(page.getByText('Список запасов изменился. Проверьте введённое количество перед сохранением.')).toBeVisible();
  await expect(amount(page)).toHaveValue('210');
  await save(page);
  await expect(row(other).getByRole('button', { name: /Изменить количество.*морковь/i })).toHaveText('210 г');

  await page.getByRole('link', { name: 'Покупки', exact: true }).click();
  await expect(purchase(page).getByText(/Купить 290 г/)).toBeVisible();
  const previous = await other.evaluate(key => localStorage.getItem(key)!, pantryKey);
  await other.evaluate(key => localStorage.setItem(key, '{ damaged'), pantryKey);
  const alert = page.getByRole('alert').getByText('Не удалось проверить актуальные запасы. Показан последний подтверждённый расчёт.');
  await expect(alert).toBeVisible();
  await expect(purchase(page).getByText(/Купить 290 г/)).toBeVisible();
  await page.getByRole('button', { name: 'Повторить загрузку запасов' }).click();
  await expect(alert).toBeVisible();
  expect(await page.evaluate(key => localStorage.getItem(key), pantryKey)).toBe('{ damaged');
  await other.evaluate(key => localStorage.removeItem(key), pantryKey);
  await expect(alert).toBeVisible();
  await expect(purchase(page).getByText(/Купить 290 г/)).toBeVisible();
  await other.evaluate(({ key, previous }) => localStorage.setItem(key, previous), { key: pantryKey, previous });
  await expect(alert).toHaveCount(0);
  await expect(purchase(page).getByText(/Купить 290 г/)).toBeVisible();
  expect(await page.evaluate(key => localStorage.getItem(key), activeKey)).toBe(initialPlan);
});

async function openBudgetPlan(page: Page, codServings = '2.131811237915170') {
  await page.goto('/plan/new');
  const raw = await page.evaluate(async ({ key, codServings }) => {
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
    const applied = buildAppliedSettings({ ...createDraft(), days: '1', budget: '500', cookingTime: 'any',
      home: [{ productId: 'cod', quantity: '30', unit: 'g', expiresSoon: false }] });
    if (applied.status !== 'applied') throw new Error('Budget fixture settings are invalid');
    const inputs = createPlanInputs(applied.settings, bundledCatalog, { seed: 'pantry-budget-fixture', now: () => new Date(2026, 10, 20) });
    const [date] = inputs.dates;
    // Source-priced base recipes cost 289.4113533333333294 and 506.6114582716049354 RUB.
    // These portions independently yield rounded purchases of 460 and 540 RUB before stock.
    const variants = [
      ['stock-a', 'familiar-turkey-potato-cabbage', '3.178866307087745'],
      ['stock-b', 'familiar-cod-rice-soup', codServings],
    ].map(([id, recipeId, servings]) => {
      const recipe = bundledCatalog.recipes.find(item => item.id === recipeId);
      if (!recipe) throw new Error(`Missing fixture recipe: ${recipeId}`);
      const instance: RecipeInstance = { id: `${id}/lunch`, date, slot: 'lunch', recipeId,
        catalogVersion: bundledCatalog.version, recipeSnapshot: recipe, selectedServings: decimal(servings) };
      return { id, instances: [instance], emptySlots: mealSlots.filter(slot => slot !== 'lunch').map(slot => ({ date, slot })) };
    });
    const plan: EditedPlanEnvelope = { schemaVersion: 2, inputs, activeVariantId: 'stock-a', variants };
    const saved = JSON.stringify({ schemaVersion: 1, plan: encodePlanEnvelope(plan) });
    localStorage.setItem(key, saved);
    return saved;
  }, { key: activeKey, codServings });
  await page.goto('/menu');
  await expect(page.getByRole('heading', { name: 'Вариант 1 из 2' })).toBeVisible();
  return raw;
}

async function removeCodStock(page: Page) {
  await page.getByRole('link', { name: 'Дома', exact: true }).click();
  await page.getByRole('region', { name: /Домашний продукт.*треска/i }).getByRole('button', { name: /Удалить/ }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Удалить продукт' }).click();
  await expect(page.getByText('Запасы сохранены', { exact: true })).toBeVisible();
}

test('pantry-admission accepts budget relief and edits covered by current stock without rebasing other variants', async ({ page }) => {
  const raw = await openBudgetPlan(page);
  const savedPlan = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)!), activeKey);
  const menu = () => page.getByRole('link', { name: 'Меню', exact: true }).click();
  const select = (index: number) => page.getByRole('button', { name: new RegExp(`Вариант ${index} · Купить`) }).click();
  const portion = (value: number) => page.getByRole('button', { name: `×${value} от исходных порций для семьи` });
  const cod = () => page.getByRole('link', { name: /Рыбный суп с рисом и овощами/ }).click();
  await removeCodStock(page);
  await menu();
  await select(2);
  await cod();
  await portion(1).click();
  await expect(portion(1)).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('Изменения сохранены', { exact: true })).toBeVisible();
  await menu();
  await expect(page.getByRole('region', { name: 'Бюджет меню' }).getByText(/превышение/i)).toBeVisible();

  await select(1);
  await page.getByRole('link', { name: /индейк/i }).click();
  const beforeRejection = await savedPlan();
  await portion(2).click();
  await expect(page.getByRole('alert')).toContainText(/бюджет/i);
  expect(await savedPlan()).toEqual(beforeRejection);
  await portion(1).click();
  await expect(page.getByText('Изменения сохранены', { exact: true })).toBeVisible();

  await page.getByRole('link', { name: 'Дома', exact: true }).click();
  await page.getByRole('combobox', { name: 'Найти продукт' }).fill('треска');
  await page.getByRole('option', { name: /^Треска/ }).click();
  await page.getByRole('button', { name: 'Добавить выбранный продукт' }).click();
  await page.getByRole('button', { name: /Указать количество.*треск/i }).click();
  await page.getByLabel('Количество', { exact: true }).fill('600');
  await page.getByLabel('Единица', { exact: true }).selectOption('g');
  await page.getByRole('button', { name: 'Сохранить количество' }).click();
  await expect(page.getByText('Запасы сохранены', { exact: true })).toBeVisible();
  await menu();
  await select(2);
  await cod();
  await portion(2).click();
  await expect(page.getByText('Изменения сохранены', { exact: true })).toBeVisible();
  const after = await savedPlan();
  expect(after.admissionPantries).toEqual([{ variantId: 'stock-b', rows: [{ productId: 'cod', quantity: '600', unit: 'g', expiresSoon: false }] }]);
  expect(after.plan.inputs).toEqual(JSON.parse(raw).plan.inputs);
  expect(after.plan.variants[0].instances[0].selectedServings).toEqual({ numerator: '2', denominator: '1' });
  await menu();
  await select(1);
  await select(2);
  await page.reload();
  await cod();
  await expect(portion(2)).toHaveAttribute('aria-pressed', 'true');
  expect(await savedPlan()).toEqual(after);
});

test('pantry-budget keeps saved variants available when present-day purchases exceed the limit', async ({ page }) => {
  const before = await openBudgetPlan(page);
  await expect(page.getByRole('button', { name: /Вариант 1 · Купить: ≈ 460,00/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Вариант 2 · Купить: ≈ 489,00/ })).toBeVisible();
  await removeCodStock(page);
  expect(await page.evaluate(key => localStorage.getItem(key), activeKey)).toBe(before);

  await page.getByRole('link', { name: 'Меню', exact: true }).click();
  await page.getByRole('button', { name: /Вариант 2 · Купить: ≈ 540,00/ }).click();
  const budget = page.getByRole('region', { name: 'Бюджет меню' });
  await expect(budget.getByRole('heading')).toContainText(/540,00.*500,00/);
  await expect(page.getByRole('link', { name: /Рыбный суп с рисом и овощами/ })).toBeVisible();
  await expect(budget.getByText(/превышение.*40,00/i)).toBeVisible();
  await page.getByRole('link', { name: 'Покупки', exact: true }).click();
  await expect(budget.getByRole('heading')).toContainText(/540,00.*500,00/);
  await expect(budget.getByText(/превышение.*40,00/i)).toBeVisible();
  await budget.getByRole('button', { name: 'Пересчитать меню' }).click();
  await expect(page.getByRole('dialog', { name: 'Создать новый набор меню?' })).toBeVisible();
  await page.getByRole('button', { name: 'Оставить варианты' }).click();
  await page.getByRole('link', { name: 'Меню', exact: true }).click();
  await page.getByRole('button', { name: /Вариант 1 · Купить: ≈ 460,00/ }).click();
  await expect(budget.getByRole('heading')).toContainText(/460,00.*500,00/);
  await page.reload();
  await expect(page.getByRole('button', { name: /Вариант 1.*Выбран/ })).toBeVisible();
  await expect(budget.getByText(/Осталось 40,00/)).toBeVisible();
});

for (const [servings, explanation] of [
  ['1.973903242164488', 'меньше одной копейки по точному расчёту'],
  ['1.973898899586040', 'Превышение после округления строк: 0,01'],
]) test(`pantry-budget explains the exact or rounded limit for ${servings} portions`, async ({ page }) => {
  await openBudgetPlan(page, servings);
  await removeCodStock(page);
  await page.getByRole('link', { name: 'Меню', exact: true }).click();
  await page.getByRole('button', { name: /Вариант 2 · Купить: ≈ 500,01/ }).click();
  const budget = page.getByRole('region', { name: 'Бюджет меню' });
  await expect(budget.getByText(new RegExp(explanation))).toBeVisible();
  const other = await page.context().newPage();
  await other.goto('/pantry');
  await other.evaluate(() => localStorage.setItem('mealplan:guest:pantry:v1', '{ damaged'));
  await expect(page.getByRole('alert').getByText(/Не удалось проверить актуальные запасы/)).toBeVisible();
  await expect(budget.getByRole('button', { name: 'Пересчитать меню' })).toHaveCount(0);
});
