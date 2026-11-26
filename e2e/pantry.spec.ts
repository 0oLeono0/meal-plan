import { expect, test, type Page } from '@playwright/test';
import type { EditedPlanEnvelope, MealCoordinate, RecipeInstance } from '../src/domain/plan';
import { activeKey, count, mountGeneration, release } from './generation-fixtures';

async function seedPantry(page: Page, quantity?: string) {
  return page.evaluate(quantity => {
    const raw = JSON.stringify({ schemaVersion: 1, token: 'a'.repeat(32),
      rows: quantity ? [{ productId: 'carrot', quantity, unit: 'g', expiresSoon: false }] : [] });
    localStorage.setItem('mealplan:guest:pantry:v1', raw);
    return raw;
  }, quantity);
}

test('pantry-wizard proposes household stock and keeps edited quantities in its own draft', async ({ page }) => {
  test.setTimeout(55_000);
  await page.goto('/plan/new');
  const household = await seedPantry(page, '200');
  await page.reload();
  await page.getByLabel('Число дней', { exact: true }).fill('1');
  const next = page.getByRole('button', { name: 'Далее', exact: true });
  await next.click();
  await expect(page.getByText('Шаг 2 из 4')).toBeVisible();
  await expect(async () => {
    if (await page.getByText('Шаг 2 из 4').isVisible()) await next.click();
    await expect(page.getByText('Шаг 3 из 4')).toBeVisible({ timeout: 600 });
  }).toPass({ timeout: 4_000 });
  await page.getByRole('button', { name: 'Пропустить', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Продукты дома' })).toBeVisible();
  const row = page.getByRole('region', { name: /^Домашний продукт Морковь/ });
  const quantity = row.getByRole('textbox', { name: /^Количество Морковь/ });
  await expect(quantity).toHaveValue('200');
  await expect(page.getByText('Предложение из холодильника', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('mealplan:guest:draft:v1')!).draft.home)).toEqual([]);
  await quantity.fill('250');
  await expect(page.getByText('Эти запасы относятся только к новому меню', { exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('mealplan:guest:draft:v1')!).draft.home[0]?.quantity)).toBe('250');
  expect(await page.evaluate(() => localStorage.getItem('mealplan:guest:pantry:v1'))).toBe(household);

  await page.goto('/pantry');
  await page.getByRole('button', { name: /Изменить количество.*морковь/i }).click();
  await page.getByRole('textbox', { name: 'Количество', exact: true }).fill('350');
  await page.getByRole('button', { name: 'Сохранить количество', exact: true }).click();
  await expect(page.getByText('Запасы сохранены', { exact: true })).toBeVisible();
  const changed = await page.evaluate(() => localStorage.getItem('mealplan:guest:pantry:v1'));
  await page.goto('/plan/new');
  await expect(quantity).toHaveValue('250');
  await page.getByRole('button', { name: 'Пропустить', exact: true }).click();
  await expect(page).toHaveURL(/\/menu$/, { timeout: 35_000 });
  expect(await page.evaluate(key => ({
    home: JSON.parse(localStorage.getItem(key)!).plan.inputs.appliedSettings.raw.home,
    inventory: localStorage.getItem('mealplan:guest:pantry:v1'),
  }), activeKey)).toEqual({ home: [{ productId: 'carrot', quantity: '250', unit: 'g', expiresSoon: false }], inventory: changed });
});

test('pantry-wizard leaves a legacy empty draft intact even with current household stock', async ({ page }) => {
  await page.goto('/plan/new');
  await seedPantry(page, '200');
  const raw = await page.evaluate(async () => {
    const path = '/src/domain/settings.ts';
    const { createDraft } = await import(path) as typeof import('../src/domain/settings');
    const raw = JSON.stringify({ schemaVersion: 1, draft: { ...createDraft(), step: 4 } });
    localStorage.setItem('mealplan:guest:draft:v1', raw);
    return raw;
  });
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'Продукты дома' })).toBeVisible();
  await expect(page.getByText('Эти запасы относятся только к новому меню', { exact: true })).toBeVisible();
  await expect(page.getByText('Домашних продуктов пока нет', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('mealplan:guest:draft:v1'))).toBe(raw);
});

async function seedHomeDraft(page: Page) {
  return page.evaluate(async () => {
    const path = '/src/domain/settings.ts';
    const { createDraft } = await import(path) as typeof import('../src/domain/settings');
    const home = [{ productId: 'carrot', quantity: '200', unit: 'g', expiresSoon: false }];
    const raw = JSON.stringify({ schemaVersion: 1, draft: { ...createDraft(), days: '1', step: 4, home } });
    localStorage.setItem('mealplan:guest:draft:v1', raw);
    return home;
  });
}

test('pantry-source uses a confirmed empty fridge for quick start and retains the applied wizard override', async ({ page }) => {
  test.setTimeout(65_000);
  await page.goto('/plan/new');
  const home = await seedHomeDraft(page);
  const household = await seedPantry(page);
  const getPlan = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)!), activeKey);

  await page.goto('/');
  await page.getByRole('button', { name: 'Меню за 1 клик' }).click();
  await expect(page).toHaveURL(/\/menu$/, { timeout: 30_000 });
  const quick = await getPlan();
  expect(quick.plan.inputs.appliedSettings.raw.home).toEqual(home);
  expect(quick.plan.inputs.pantrySnapshot).toEqual([]);

  await page.goto('/plan/new');
  await page.getByRole('textbox', { name: /^Количество Морковь/ }).fill('250');
  const start = page.getByRole('button', { name: 'Составить меню', exact: true });
  const confirmation = page.getByRole('dialog', { name: 'Составить меню с новыми настройками?' });
  await start.click();
  await confirmation.getByRole('button', { name: 'Оставить варианты' }).click();
  expect(await getPlan()).toEqual(quick);
  await start.click();
  await confirmation.getByRole('button', { name: 'Составить меню' }).click();
  await expect(page).toHaveURL(/\/menu$/, { timeout: 30_000 });
  const applied = await getPlan();
  expect(applied).toMatchObject({ schemaVersion: 2, wizardPantryToken: 'a'.repeat(32), plan: { inputs: {
    appliedSettings: { raw: { home: [{ ...home[0], quantity: '250' }] } },
    pantrySnapshot: [{ productId: 'carrot', quantity: { status: 'known' } }],
  } } });
  expect(applied.plan.inputs.pantrySnapshot).not.toEqual(quick.plan.inputs.pantrySnapshot);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'Меню на 1 день' })).toBeVisible();
  expect(await getPlan()).toEqual(applied);
  expect(await page.evaluate(() => localStorage.getItem('mealplan:guest:pantry:v1'))).toBe(household);
});

test('pantry-source blocks quick start on corrupt stock and keeps the original bytes', async ({ page }) => {
  await page.goto('/plan/new');
  await seedHomeDraft(page);
  await page.evaluate(() => localStorage.setItem('mealplan:guest:pantry:v1', '{bad'));
  await page.goto('/');
  await page.getByRole('button', { name: 'Меню за 1 клик' }).click();
  await expect(page.getByRole('alert').getByText('Не удалось проверить запасы для нового меню')).toBeVisible({ timeout: 6_000 });
  await expect(page.getByRole('button', { name: 'Повторить загрузку запасов' })).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
  expect(await page.evaluate(key => localStorage.getItem(key), activeKey)).toBeNull();
  expect(await page.evaluate(() => localStorage.getItem('mealplan:guest:pantry:v1'))).toBe('{bad');
});

async function openCarrotPlan(page: Page, withHistoricStock = false, wizardPantryToken?: string | null, budgetSensitive = false) {
  await page.goto('/plan/new');
  const raw = await page.evaluate(async ({ key, withHistoricStock, wizardPantryToken, budgetSensitive }) => {
    const catalogPath = '/src/data/catalog.ts';
    const planPath = '/src/domain/plan.ts';
    const settingsPath = '/src/domain/settings.ts';
    const appliedPath = '/src/domain/appliedSettings.ts';
    const quantitiesPath = '/src/domain/quantities.ts';
    const adapterPath = '/src/adapters/activePlan.ts';
    const { bundledCatalog } = await import(catalogPath) as typeof import('../src/data/catalog');
    const { createPlanInputs, encodePlanEnvelope, mealSlots } = await import(planPath) as typeof import('../src/domain/plan');
    const { createDraft } = await import(settingsPath) as typeof import('../src/domain/settings');
    const { buildAppliedSettings } = await import(appliedPath) as typeof import('../src/domain/appliedSettings');
    const { decimal } = await import(quantitiesPath) as typeof import('../src/domain/quantities');
    const { validateActiveBundle } = await import(adapterPath) as typeof import('../src/adapters/activePlan');
    const home = budgetSensitive
      ? Object.entries({ chicken: '1800', pollock: '960', carrot: '1500', rice: '840', onion: '480', buckwheat: '420', yogurt: '480' })
        .map(([productId, quantity]) => ({ productId, quantity, unit: 'g' as const, expiresSoon: false }))
      : withHistoricStock ? [{ productId: 'carrot', quantity: '100', unit: 'g' as const, expiresSoon: false }] : [];
    const applied = buildAppliedSettings({ ...createDraft(), days: '2', budget: budgetSensitive ? '1600' : '5000', cookingTime: 'any', home });
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
      return { id: `carrot-${date}-${slot}`, date, slot, recipeId, catalogVersion: bundledCatalog.version, recipeSnapshot: recipe,
        selectedServings: decimal(budgetSensitive ? '6' : servings) };
    });
    const emptySlots: MealCoordinate[] = inputs.dates.flatMap(date => mealSlots
      .filter(slot => !instances.some(row => row.date === date && row.slot === slot))
      .map(slot => ({ date, slot })));
    const first = { id: 'carrot-active', instances, emptySlots };
    const second = { ...first, id: 'carrot-second', instances: instances.map(meal => ({ ...meal, id: `second-${meal.id}` })) };
    const plan: EditedPlanEnvelope = { schemaVersion: 2, inputs, activeVariantId: first.id, variants: wizardPantryToken ? [first, second] : [first] };
    const checked = validateActiveBundle(plan, undefined, undefined, wizardPantryToken);
    if (checked.status !== 'valid') throw new Error(JSON.stringify(checked));
    const saved = JSON.stringify(wizardPantryToken !== undefined
      ? { schemaVersion: 2, plan: encodePlanEnvelope(plan), wizardPantryToken } : { schemaVersion: 1, plan: encodePlanEnvelope(plan) });
    localStorage.setItem(key, saved);
    return saved;
  }, { key: activeKey, withHistoricStock, wizardPantryToken, budgetSensitive });
  await page.goto('/shopping');
  await expect(page.getByRole('heading', { level: 1, name: 'Список покупок' })).toBeVisible();
  return raw;
}

test('pantry-leftovers uses confirmed expiring stock and preserves the active menu until confirmation', async ({ page }) => {
  test.setTimeout(55_000);
  const original = await openCarrotPlan(page, true);
  await page.getByRole('link', { name: 'Дома', exact: true }).click();
  const compose = page.getByRole('link', { name: 'Составить меню', exact: true });
  await expect(compose).toHaveAttribute('href', '/plan/new');
  await page.getByRole('button', { name: /Изменить количество.*морковь/i }).click();
  await page.getByLabel('Количество', { exact: true }).fill('200');
  await page.getByRole('button', { name: 'Сохранить количество' }).click();
  const expiry = page.getByRole('checkbox', { name: /Скоро испортится.*морковь/i });
  await expiry.check();
  await expect(expiry).toBeChecked();
  const pantryKey = 'mealplan:guest:pantry:v1';
  const stock = await page.evaluate(key => localStorage.getItem(key), pantryKey);
  expect(JSON.parse(stock!).rows).toEqual([{ productId: 'carrot', quantity: '200', unit: 'g', expiresSoon: true }]);

  const start = page.getByRole('button', { name: 'Составить меню из остатков' });
  await expect(start).toBeVisible();
  const confirmation = page.getByRole('dialog', { name: 'Создать новый набор меню?' });
  await start.click();
  await confirmation.getByRole('button', { name: 'Оставить варианты' }).click();
  await expect(start).toBeFocused();
  expect(await page.evaluate(key => localStorage.getItem(key), activeKey)).toBe(original);

  await page.evaluate(() => {
    document.documentElement.dataset.observedPantryGeneration = 'false';
    const observer = new MutationObserver(() => {
      if (location.pathname !== '/plan/generating'
        || !document.querySelector('#generation-title')?.parentElement?.textContent?.includes('Используем запасы из холодильника')) return;
      document.documentElement.dataset.observedPantryGeneration = 'true';
      observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  });
  await start.click();
  await confirmation.getByRole('button', { name: 'Создать новый набор' }).click();
  await expect(page).toHaveURL(/\/menu$/, { timeout: 35_000 });
  await expect(page.locator('html')).toHaveAttribute('data-observed-pantry-generation', 'true');
  const updated = await page.evaluate(key => localStorage.getItem(key), activeKey);
  const { plan } = JSON.parse(updated!);
  expect(updated).not.toBe(original);
  expect(plan.inputs.appliedSettings).toEqual(JSON.parse(original).plan.inputs.appliedSettings);
  expect(plan.inputs.pantrySnapshot).toEqual([{ productId: 'carrot', expiresSoon: true, quantity: {
    status: 'known', value: { unit: 'g', amount: { numerator: '200', denominator: '1' } },
  } }]);
  const variant = plan.variants.find((item: { id: string }) => item.id === plan.activeVariantId);
  const early = variant.instances.filter((meal: { date: string }) => plan.inputs.dates.slice(0, 2).includes(meal.date));
  expect(early.some((meal: { recipeSnapshot: { ingredients: { productId: string }[] } }) =>
    meal.recipeSnapshot.ingredients.some(ingredient => ingredient.productId === 'carrot'))).toBe(true);
  expect(await page.evaluate(key => localStorage.getItem(key), pantryKey)).toBe(stock);
});

test('pantry-recalculate postpones dishes only and restores focus when a confirmed search is cancelled or interrupted', async ({ page }) => {
  test.setTimeout(70_000);
  const pantryKey = 'mealplan:guest:pantry:v1';
  await page.goto('/');
  await seedPantry(page, '200');
  const original = await openCarrotPlan(page, true, 'a'.repeat(32));
  await mountGeneration(page, { activeRaw: original, route: '/pantry', deferGeneration: true });
  const banner = page.getByRole('region', { name: 'Пересчитать меню и список?' });
  const recalculate = banner.getByRole('button', { name: 'Пересчитать меню' });
  const home = page.getByRole('link', { name: 'Дома', exact: true });
  const shopping = page.getByRole('link', { name: 'Покупки', exact: true });
  const carrot = page.locator('article[data-product-id="carrot"]');
  const getMenu = () => page.evaluate(key => localStorage.getItem(key), activeKey);
  const dialog = page.getByRole('dialog', { name: 'Создать новый набор меню?' });
  const confirm = () => dialog.getByRole('button', { name: 'Создать новый набор' }).click();
  async function changeQuantity(value: string) {
    await page.getByRole('button', { name: /Изменить количество.*морковь/i }).click();
    await page.getByRole('textbox', { name: 'Количество', exact: true }).fill(value);
    await page.getByRole('button', { name: 'Сохранить количество', exact: true }).click();
    await expect(page.getByText('Запасы сохранены', { exact: true })).toBeVisible();
  }

  await expect(banner).toHaveCount(0);
  await changeQuantity('250');
  await expect(banner.getByText('Покупки уже обновлены по запасам. Можно подобрать новые блюда')).toBeVisible();
  await banner.getByRole('button', { name: 'Отложить пересчёт меню' }).click();
  await expect(banner).toHaveCount(0);
  await shopping.click();
  await expect(carrot.getByText(/Купить 250 г/)).toBeVisible();
  expect(await getMenu()).toBe(original);
  await home.click();
  await expect(banner).toHaveCount(0);

  await changeQuantity('100');
  await recalculate.click();
  await dialog.getByRole('button', { name: 'Оставить варианты' }).click();
  await expect(recalculate).toBeFocused();
  expect(await count(page, 'generation-calls')).toBe(0);
  expect(await getMenu()).toBe(original);

  await recalculate.click();
  await confirm();
  await expect(page).toHaveURL(/\/plan\/generating$/);
  await expect.poll(() => count(page, 'generation-calls')).toBe(1);
  await page.getByRole('button', { name: 'Отмена' }).click();
  await expect(page).toHaveURL(/\/pantry$/);
  await expect(recalculate).toBeFocused();
  const changedStock = page.getByRole('alert').filter({ hasText: 'Запасы изменились. Проверьте их и запустите подбор снова' });
  await expect(changedStock).toHaveCount(0);
  await release(page, 'generation-1');
  expect(await getMenu()).toBe(original);

  await recalculate.click();
  await confirm();
  await expect.poll(() => count(page, 'generation-calls')).toBe(2);
  const other = await page.context().newPage();
  await other.goto('/pantry');
  await other.evaluate(key => localStorage.setItem(key, JSON.stringify({ schemaVersion: 1, token: 'b'.repeat(32),
    rows: [{ productId: 'carrot', quantity: '300', unit: 'g', expiresSoon: false }] })), pantryKey);
  await expect(page).toHaveURL(/\/pantry$/);
  await expect(changedStock).toBeVisible();
  await expect(recalculate).toBeFocused();
  await release(page, 'generation-2');
  expect(await count(page, 'save-calls')).toBe(0);
  expect(await getMenu()).toBe(original);
  await shopping.click();
  await expect(carrot.getByText(/Купить 200 г/)).toBeVisible();
  await page.getByRole('link', { name: 'Меню', exact: true }).click();
  await page.getByRole('button', { name: /Вариант 2 · Купить/ }).click();
  await expect(page.getByRole('heading', { name: 'Вариант 2 из 2' })).toBeVisible();
  const afterSelection = JSON.parse((await getMenu())!);
  expect(afterSelection.plan.variants).toEqual(JSON.parse(original).plan.variants);
  expect(JSON.parse((await page.evaluate(key => localStorage.getItem(key), pantryKey))!).rows[0].quantity).toBe('300');
});

for (const route of ['/menu', '/shopping'] as const) {
  test(`pantry-interruption returns budget recalculation to ${route} when another tab changes stock`, async ({ page }) => {
    const original = await openCarrotPlan(page, true, null, true);
    await seedPantry(page, '200');
    await mountGeneration(page, { activeRaw: original, route, deferGeneration: true });
    const budget = page.getByRole('region', { name: 'Бюджет меню' });
    await expect(budget.getByText('Покупки превышают бюджет')).toBeVisible();
    const recalculate = budget.getByRole('button', { name: 'Пересчитать меню' });
    await recalculate.click();
    await page.getByRole('dialog', { name: 'Создать новый набор меню?' }).getByRole('button', { name: 'Создать новый набор' }).click();
    await expect(page).toHaveURL(/\/plan\/generating$/);
    await expect.poll(() => count(page, 'generation-calls')).toBe(1);

    const other = await page.context().newPage();
    await other.goto('/pantry');
    const stock = route === '/menu' ? await seedPantry(other, '300') : '{bad';
    const pantryKey = 'mealplan:guest:pantry:v1';
    if (route === '/shopping') await other.evaluate(key => localStorage.setItem(key, '{bad'), pantryKey);

    await expect(page).toHaveURL(new RegExp(`${route}$`));
    const message = route === '/menu' ? 'Запасы изменились. Проверьте их и запустите подбор снова' : 'Не удалось проверить запасы для нового меню';
    await expect(page.getByRole('alert').filter({ hasText: message })).toBeVisible();
    if (route === '/menu') await expect(recalculate).toBeFocused();
    else await expect(page.getByRole('heading', { level: 1, name: 'Список покупок' })).toBeFocused();
    await release(page, 'generation-1');
    expect(await count(page, 'save-calls')).toBe(0);
    expect(await page.evaluate(key => localStorage.getItem(key), activeKey)).toBe(original);
    expect(await page.evaluate(key => localStorage.getItem(key), pantryKey)).toBe(stock);
  });
}

test('pantry-interruption rejects a delayed menu write after another tab changes stock', async ({ page }) => {
  test.setTimeout(55_000);
  const original = await openCarrotPlan(page, true);
  await seedPantry(page, '200');
  await mountGeneration(page, { activeRaw: original, route: '/pantry', deferSave: true });
  const recalculate = page.getByRole('region', { name: 'Пересчитать меню и список?' }).getByRole('button', { name: 'Пересчитать меню' });
  await recalculate.click();
  await page.getByRole('dialog', { name: 'Создать новый набор меню?' }).getByRole('button', { name: 'Создать новый набор' }).click();
  await expect(page.getByText('Сохраняем меню…')).toBeVisible({ timeout: 30_000 });
  await expect.poll(() => count(page, 'save-calls')).toBe(1);
  const other = await page.context().newPage();
  await other.goto('/pantry');
  const updated = await seedPantry(other, '300');
  await release(page, 'save-1');

  await expect(page).toHaveURL(/\/pantry$/);
  await expect(page.getByRole('alert').filter({ hasText: 'Запасы изменились. Проверьте их и запустите подбор снова' })).toBeVisible();
  await expect(recalculate).toBeFocused();
  expect(await count(page, 'final-writes')).toBe(0);
  expect(await page.evaluate(key => localStorage.getItem(key), activeKey)).toBe(original);
  expect(await page.evaluate(() => localStorage.getItem('mealplan:guest:pantry:v1'))).toBe(updated);
});

test('pantry-stale-removal requires confirmation again after another tab updates the product', async ({ page }) => {
  const pantryKey = 'mealplan:guest:pantry:v1';
  await page.goto('/pantry');
  await seedPantry(page, '200');
  await page.reload();
  const carrot = page.getByRole('region', { name: 'Домашний продукт Морковь' });
  const remove = carrot.getByRole('button', { name: 'Удалить продукт: Морковь' });
  const dialog = page.getByRole('dialog', { name: 'Удалить продукт из запасов?' });
  const confirm = dialog.getByRole('button', { name: 'Удалить продукт', exact: true });
  await remove.click();
  await expect(dialog).toBeVisible();

  const other = await page.context().newPage();
  await other.goto('/pantry');
  const updated = await seedPantry(other, '350');
  await expect(page.locator('#pantry-edit-carrot')).toHaveText('350 г');
  await confirm.click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('alert').filter({ hasText: 'Запасы изменились. Проверьте продукт и подтвердите удаление снова.' })).toBeVisible();
  await expect(remove).toBeFocused();
  expect(await page.evaluate(key => localStorage.getItem(key), pantryKey)).toBe(updated);

  await remove.click();
  await confirm.click();
  await expect(carrot).toHaveCount(0);
  await expect(page.getByRole('combobox', { name: 'Найти продукт' })).toBeFocused();
});

test('pantry-recalculate returns from a failed search without restoring old purchases', async ({ page }) => {
  const original = await openCarrotPlan(page, true);
  const stock = await seedPantry(page, '225');
  await mountGeneration(page, { activeRaw: original, route: '/pantry', error: { code: 'FAILED', message: 'Search unavailable', diagnostics: [] } });
  const recalculate = page.getByRole('region', { name: 'Пересчитать меню и список?' }).getByRole('button', { name: 'Пересчитать меню' });
  await recalculate.click();
  await page.getByRole('dialog', { name: 'Создать новый набор меню?' }).getByRole('button', { name: 'Создать новый набор' }).click();
  await expect(page.getByRole('heading', { name: 'Не получилось составить меню' })).toBeVisible();
  await page.getByRole('button', { name: 'К холодильнику' }).click();
  await expect(recalculate).toBeFocused();
  await page.getByRole('link', { name: 'Покупки', exact: true }).click();
  await expect(page.locator('article[data-product-id="carrot"]').getByText(/Купить 275 г/)).toBeVisible();
  expect(await page.evaluate(key => localStorage.getItem(key), activeKey)).toBe(original);
  expect(await page.evaluate(() => localStorage.getItem('mealplan:guest:pantry:v1'))).toBe(stock);
});

test('pantry-source recalculates every variant only after a new confirmed fridge revision', async ({ page }) => {
  await page.goto('/');
  await seedPantry(page);
  await openCarrotPlan(page, true, 'a'.repeat(32));
  const carrot = page.locator('article[data-product-id="carrot"]');
  await expect(carrot.getByText(/Купить 400 г/)).toBeVisible();
  await page.reload();
  await expect(carrot.getByText(/Нужно 500 г · Из запасов 100 г/)).toBeVisible();
  await page.getByRole('link', { name: 'Дома', exact: true }).click();
  await page.getByRole('combobox', { name: 'Найти продукт' }).fill('морковь');
  await page.getByRole('option', { name: /^Морковь/ }).click();
  await page.getByRole('button', { name: 'Добавить выбранный продукт' }).click();
  await page.getByRole('button', { name: /Указать количество.*морковь/i }).click();
  await page.getByLabel('Количество', { exact: true }).fill('250');
  await page.getByLabel('Единица', { exact: true }).selectOption('g');
  await page.getByRole('button', { name: 'Сохранить количество' }).click();
  await expect(page.getByText('Запасы сохранены', { exact: true })).toBeVisible();
  const shopping = page.getByRole('link', { name: 'Покупки', exact: true });
  await shopping.click();
  await expect(carrot.getByText(/Купить 250 г/)).toBeVisible();
  await page.getByRole('link', { name: 'Меню', exact: true }).click();
  await page.getByRole('button', { name: /Вариант 2 · Купить/ }).click();
  await expect(page.getByRole('heading', { name: 'Вариант 2 из 2' })).toBeVisible();
  await shopping.click();
  await expect(carrot.getByText(/Нужно 500 г · Из запасов 250 г/)).toBeVisible();
  await page.reload();
  await expect(carrot.getByText(/Купить 250 г/)).toBeVisible();
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).wizardPantryToken, activeKey)).toBe('a'.repeat(32));
});

test('pantry-source prefers the first confirmed empty record to the wizard snapshot', async ({ page }) => {
  const original = await openCarrotPlan(page, true, null);
  const carrot = page.locator('article[data-product-id="carrot"]');
  await expect(carrot.getByText(/Купить 400 г/)).toBeVisible();
  await page.getByRole('link', { name: 'Дома', exact: true }).click();
  await page.getByRole('button', { name: /Удалить.*морковь/i }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Удалить продукт' }).click();
  await expect(page.getByText('Запасы сохранены', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Покупки', exact: true }).click();
  await expect(carrot.getByText(/Купить 500 г/)).toBeVisible();
  await page.reload();
  await expect(carrot.getByText(/Купить 500 г/)).toBeVisible();
  expect(await page.evaluate(key => localStorage.getItem(key), activeKey)).toBe(original);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('mealplan:guest:pantry:v1')!).rows)).toEqual([]);
});

test('pantry-source refuses a menu confirmation after the fridge changes', async ({ page }) => {
  const original = await openCarrotPlan(page, true);
  await seedHomeDraft(page);
  await page.goto('/plan/new');
  const start = page.getByRole('button', { name: 'Составить меню', exact: true });
  await start.click();
  const dialog = page.getByRole('dialog', { name: 'Составить меню с новыми настройками?' });
  await expect(dialog).toBeVisible();
  await seedPantry(page);
  await dialog.getByRole('button', { name: 'Составить меню' }).click();
  const alert = page.getByRole('alert');
  await expect(alert.getByText('Запасы изменились. Проверьте их и запустите подбор снова')).toBeVisible();
  await expect(page).toHaveURL(/\/plan\/new$/);
  expect(await page.evaluate(key => localStorage.getItem(key), activeKey)).toBe(original);
  await alert.getByRole('button', { name: 'Повторить загрузку запасов' }).click();
  await expect(alert).toBeHidden();
  await expect(page.getByRole('textbox', { name: /^Количество Морковь/ })).toHaveValue('200');
});

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

test('pantry-keyboard explains the early priority of flagged products beside the leftovers action', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 525 });
  await page.goto('/plan/new');
  await seedPantry(page, '200');
  await page.goto('/pantry');
  const start = page.getByRole('button', { name: 'Составить меню из остатков' });
  await expect(start).toBeVisible();
  await expect(page.getByText('При подборе постараемся использовать отмеченные продукты в первые 1–2 дня', { exact: true })).toBeVisible();
  await expect(start).toHaveAccessibleDescription('При подборе постараемся использовать отмеченные продукты в первые 1–2 дня');
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

test('pantry-edit-race withdraws the old offer and rejects a delayed save after another tab changes stock', async ({ page }) => {
  const raw = await openCarrotPlan(page);
  await mountGeneration(page, { activeRaw: raw, route: '/menu', deferSave: true });
  await page.getByRole('link', { name: /Куриное филе с рисом и морковью/ }).first().click();
  await page.getByRole('button', { name: 'Заменить в меню' }).click();
  const dialog = page.getByRole('dialog', { name: 'Заменить блюдо' });
  const offers = dialog.getByRole('button', { name: /Покупки за период/ });
  await expect(offers.first()).toBeVisible();
  const other = await page.context().newPage();
  await other.goto('/pantry');
  const change = (quantity: string) => other.evaluate(quantity => {
    localStorage.setItem('mealplan:guest:pantry:v1', JSON.stringify({ schemaVersion: 1, token: quantity.padStart(32, '0'),
      rows: [{ productId: 'carrot', quantity, unit: 'g', expiresSoon: false }] }));
  }, quantity);
  await change('200');
  await expect(dialog.getByRole('alert')).toContainText('Меню изменилось');
  await expect(offers).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Закрыть подбор' }).click();

  const portion = page.getByRole('button', { name: '×2 от исходных порций для семьи' });
  await portion.click();
  await expect.poll(() => count(page, 'save-calls')).toBe(1);
  await expect(portion).toHaveAttribute('aria-pressed', 'true');
  await change('300');
  await expect(portion).toHaveAttribute('aria-pressed', 'false');
  await release(page, 'save-1');
  await expect.poll(() => page.evaluate(() => sessionStorage.getItem('save-result-1'))).toBe('cancelled');
  await expect(page.getByText('Изменения сохранены', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Повторить сохранение' })).toHaveCount(0);
  expect(await count(page, 'final-writes')).toBe(0);
  expect(await page.evaluate(key => localStorage.getItem(key), activeKey)).toBe(raw);
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
