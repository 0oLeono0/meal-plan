import { expect, test, type Page } from '@playwright/test';
import type { ActivePlanEnvelope, PlanVariant } from '../src/domain/plan';
import { generateRealPlan, openSyntheticPlan } from './plan-fixtures';

const activeKey = 'mealplan:guest:active-plan:v1';
const formatDate = (date: string) => new Intl.DateTimeFormat('ru-RU', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`));

async function readMenu(page: Page) {
  const raw = await page.evaluate(key => localStorage.getItem(key), activeKey);
  expect(raw).not.toBeNull();
  const { plan } = JSON.parse(raw!) as { plan: ActivePlanEnvelope };
  const variant = plan.variants.find(row => row.id === plan.activeVariantId)!;
  return { raw, plan, variant };
}

async function generateTwoDays(page: Page) {
  await page.goto('/plan/new');
  await page.getByLabel('Число людей', { exact: true }).fill('2');
  await page.getByLabel('Число дней', { exact: true }).fill('2');
  await page.getByRole('button', { name: 'Далее', exact: true }).click();
  await page.getByLabel('Бюджет на 2 дня', { exact: true }).fill('5000');
  await page.waitForTimeout(270);
  const next = page.getByRole('button', { name: 'Далее', exact: true });
  await next.click();
  await page.getByRole('button', { name: 'Пропустить', exact: true }).click();
  await page.getByRole('button', { name: 'Составить меню', exact: true }).click();
  await expect(page).toHaveURL(/\/menu$/, { timeout: 32_000 });
}

function othersAt(variant: PlanVariant, id: string) {
  return variant.instances.filter(row => row.id !== id);
}

async function withRepeatedRiceBreakfast(page: Page) {
  await generateTwoDays(page);
  // Keep the real saved inputs and reviewed catalogue. Pin both breakfasts to
  // the same recipe so the isolation and arithmetic checks do not depend on the seed.
  await page.evaluate(key => {
    const saved = JSON.parse(localStorage.getItem(key)!);
    const active = saved.plan.variants.find((row: PlanVariant) => row.id === saved.plan.activeVariantId);
    const recipe = saved.plan.inputs.catalog.recipes.find((row: { id: string }) => row.id === 'rice-sweet-porridge');
    active.instances = active.instances.map((row: PlanVariant['instances'][number]) =>
      row.slot === 'breakfast' ? { ...row, recipeId: recipe.id, recipeSnapshot: recipe } : row);
    localStorage.setItem(key, JSON.stringify(saved));
  }, activeKey);
  await page.goto('/menu?view=week');
  await expect(page.getByRole('heading', { level: 1, name: 'Меню на 2 дня' })).toBeVisible();
  return readMenu(page);
}

test('portions-cycle changes only one repeated recipe and keeps purchasing totals after reload', async ({ page }) => {
  test.setTimeout(65_000);
  await page.setViewportSize({ width: 390, height: 844 });
  const before = await withRepeatedRiceBreakfast(page);
  const [first, second] = before.variant.instances.filter(row => row.slot === 'breakfast');
  expect(first.recipeId).toBe(second.recipeId);
  const card = page.locator(`[data-instance-id="${first.id}"]`);
  const firstDay = page.locator(`section[data-date="${first.date}"] .menu-day-totals`);
  const secondDay = page.locator(`section[data-date="${second.date}"] .menu-day-totals`);
  const dayCalories = async () => Number((await firstDay.locator('details dd').first().textContent())?.replace(/[^0-9]/g, ''));
  const baseCalories = await dayCalories();
  const secondTotals = await secondDay.innerText();
  const menuBudget = await page.getByRole('region', { name: 'Бюджет меню' }).innerText();
  await card.getByRole('link').click();
  const recipeUrl = page.url();
  const facts = page.getByRole('region', { name: 'На одну порцию' }).locator('dd');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Рисовая каша на воде');
  await expect(facts).toHaveText(['297 ккал', '5,3 г', '0,5 г', '66,0 г', /≈ 5,77/]);
  const portions = page.getByRole('group', { name: 'Порции для семьи' });
  await expect(portions.getByRole('button', { name: /^×1/ })).toHaveAttribute('aria-pressed', 'true');

  // 150 g rice per two portions; 69.7493827160494 RUB/kg.
  for (const [label, count, rice, price] of [['×2', '4', '300', '20,92'], ['×0,5', '1', '75', '5,23'], ['×1', '2', '150', '10,46']]) {
    const button = portions.getByRole('button', { name: new RegExp(`^${label}`) });
    await button.click();
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await expect(button).toBeFocused();
    await expect(page.getByRole('status').filter({ hasText: 'Изменения сохранены' })).toBeVisible();
    await expect(page.getByText(`Порций для семьи: ${count}`, { exact: true })).toBeVisible();
    await expect(page.getByText(new RegExp(`^${rice} г · ≈ ${price}`))).toBeVisible();
    await expect(facts).toHaveText(['297 ккал', '5,3 г', '0,5 г', '66,0 г', /≈ 5,77/]);
    expect(page.url()).toBe(recipeUrl);
    const after = await readMenu(page);
    expect(after.variant.instances.find(row => row.id === first.id)?.selectedServings).toEqual({ numerator: count, denominator: '1' });
    expect(othersAt(after.variant, first.id)).toEqual(othersAt(before.variant, first.id));
    expect(after.plan.variants.filter(row => row.id !== before.variant.id)).toEqual(before.plan.variants.filter(row => row.id !== before.variant.id));
  }
  // Leave a non-default multiplier persisted to verify affected quantities on reload.
  await portions.getByRole('button', { name: /^×2/ }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Изменения сохранены' })).toBeVisible();
  const edited = await readMenu(page);
  await page.reload();
  await expect(portions.getByRole('button', { name: /^×2/ })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText(/^300 г · ≈ 20,92/)).toBeVisible();
  expect((await readMenu(page)).raw).toBe(edited.raw);
  await page.getByRole('link', { name: 'К меню', exact: true }).click();
  // The exact meal delta is 593.94 kcal. The rounded day totals can differ
  // by either 593 or 594 depending on the other meals' fractional calories.
  expect([593, 594]).toContain(await dayCalories() - baseCalories);
  await expect(secondDay).toHaveText(secondTotals, { useInnerText: true });
  const updatedBudget = await page.getByRole('region', { name: 'Бюджет меню' }).innerText();
  expect(updatedBudget).not.toBe(menuBudget);
  await page.getByRole('link', { name: /^Список покупок ·/ }).click();
  await expect(page.getByRole('region', { name: 'Бюджет меню' })).toHaveText(updatedBudget, { useInnerText: true });
  const riceSources = page.locator('article[data-product-id="rice"] details li');
  for (const [instance, rice] of [[first, '300'], [second, '150']] as const) {
    const row = riceSources.filter({ hasText: `${formatDate(instance.date)} · Завтрак · Рисовая каша на воде · ${rice} г` });
    await expect(row).toHaveCount(1);
  }
});

test('portions-guards preserves an edited envelope and refuses an unaffordable scale without writing', async ({ page }) => {
  test.setTimeout(65_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await generateTwoDays(page);
  const target = await page.evaluate(key => {
    const saved = JSON.parse(localStorage.getItem(key)!);
    const plan = saved.plan;
    const active = plan.variants.find((row: PlanVariant) => row.id === plan.activeVariantId);
    const lunch = active.instances.find((row: PlanVariant['instances'][number]) => row.slot === 'lunch');
    const cod = plan.inputs.catalog.recipes.find((row: { id: string }) => row.id === 'familiar-cod-rice-soup');
    const settings = plan.inputs.appliedSettings;
    settings.people = 3;
    settings.raw.people = '3';
    settings.raw.budget = '500';
    settings.budget.limit = { numerator: '500', denominator: '1' };
    settings.raw.cookingTime = 'any';
    settings.cookingMinutes = null;
    // A single serving of the reviewed cod soup at 500 RUB uses an intentionally
    // off-scale saved quantity. 1.5 servings fit, while 6 portions do not.
    plan.schemaVersion = 2;
    plan.variants = [{ ...active,
      emptySlots: active.instances.filter((row: PlanVariant['instances'][number]) => row !== lunch)
        .map(({ date, slot }: PlanVariant['instances'][number]) => ({ date, slot })),
      instances: [{ ...lunch, recipeId: cod.id, recipeSnapshot: cod, selectedServings: { numerator: '1', denominator: '1' } }],
    }];
    localStorage.setItem(key, JSON.stringify(saved));
    return { instance: lunch.id, variant: active.id, recipe: cod.id };
  }, activeKey);
  await page.addInitScript(key => {
    const set = Storage.prototype.setItem;
    Storage.prototype.setItem = function (entry, value) {
      if (this === localStorage && entry === key) {
        set.call(sessionStorage, 'portion-write-count', String(Number(sessionStorage.getItem('portion-write-count') ?? 0) + 1));
      }
      set.call(this, entry, value);
    };
  }, activeKey);
  const query = new URLSearchParams({ instance: target.instance, variant: target.variant });
  const route = `/recipe/${target.recipe}?${query}`;
  await page.goto(route);
  const writes = () => page.evaluate(() => Number(sessionStorage.getItem('portion-write-count') ?? 0));
  const portions = page.getByRole('group', { name: 'Порции для семьи' });
  const half = portions.getByRole('button', { name: /^×0,5/ });
  const double = portions.getByRole('button', { name: /^×2/ });
  await expect(page.getByText('Порций для семьи: 1', { exact: true })).toBeVisible();
  await expect(portions.getByRole('button', { pressed: false })).toHaveCount(3);
  const before = await readMenu(page);
  expect(await writes()).toBe(0);
  await half.click();
  await expect(page.getByRole('status').filter({ hasText: 'Изменения сохранены' })).toBeVisible();
  await expect(half).toHaveAttribute('aria-pressed', 'true');
  const changed = await readMenu(page);
  expect(changed.variant.instances[0].selectedServings).toEqual({ numerator: '3', denominator: '2' });
  expect(changed.plan.schemaVersion).toBe(2);
  expect(changed.variant).toMatchObject({ emptySlots: 'emptySlots' in before.variant ? before.variant.emptySlots : [] });
  expect(await writes()).toBe(1);

  await half.click();
  expect(await writes()).toBe(1);
  await expect(page.getByText('Порций для семьи: 1,5', { exact: true })).toBeVisible();
  await double.click();
  await expect(page.getByRole('alert')).toContainText('Эти порции превышают бюджет покупок. Выберите меньше порций');
  await expect(half).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText(/^210 г · ≈/)).toBeVisible();
  expect((await readMenu(page)).raw).toBe(changed.raw);
  expect(await writes()).toBe(1);

  await page.goto(`/recipe/${target.recipe}`);
  await expect(page.getByText('Исходный рецепт · 2 порции', { exact: true })).toBeVisible();
  await expect(portions).toHaveCount(0);
  query.set('instance', target.instance + '/absent');
  await page.goto(`/recipe/${target.recipe}?${query}`);
  await expect(page.getByRole('link', { name: 'К актуальному меню' })).toBeVisible();
  await expect(portions).toHaveCount(0);
  expect(await writes()).toBe(1);
});

test('tracer replaces a generated lunch and keeps recipe and shopping after reload', async ({ page }) => {
  test.setTimeout(65_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await generateTwoDays(page);
  const before = await readMenu(page);
  expect(before.plan.inputs.dates).toHaveLength(2);
  expect(before.variant.instances).toHaveLength(8);
  const original = before.variant.instances.find(instance => instance.slot === 'lunch')!;
  await page.getByRole('button', { name: 'Вся неделя', exact: true }).click();
  const lunch = page.locator(`[data-instance-id="${original.id}"]`);
  await expect(lunch.getByRole('link')).toContainText(original.recipeSnapshot.name);
  await lunch.getByRole('button', { name: /^Действия для блюда/ }).click({ timeout: 5_000 });
  await lunch.getByRole('button', { name: 'Заменить блюдо', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Заменить блюдо' });
  const choice = dialog.getByRole('button').filter({ hasText: 'Покупки за период' }).first();
  await expect(choice).toContainText('Ккал за приём');
  await expect(choice).not.toContainText(original.recipeSnapshot.name);
  await choice.click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('status').filter({ hasText: 'Изменения сохранены' })).toBeVisible();

  const edited = await readMenu(page);
  const replacement = edited.variant.instances.find(row => row.id === original.id)!;
  expect(replacement.recipeId).not.toBe(original.recipeId);
  expect(replacement.date).toBe(original.date);
  expect(replacement.slot).toBe(original.slot);
  expect(replacement.selectedServings).toEqual(original.selectedServings);
  expect(edited.plan.inputs).toEqual(before.plan.inputs);
  expect(edited.plan.activeVariantId).toBe(before.plan.activeVariantId);
  expect(edited.plan.variants.filter(row => row.id !== before.variant.id)).toEqual(before.plan.variants.filter(row => row.id !== before.variant.id));
  expect(othersAt(edited.variant, original.id)).toEqual(othersAt(before.variant, original.id));
  await expect(lunch.getByRole('link')).toContainText(replacement.recipeSnapshot.name);
  const facts = (await lunch.getByText(/^На порцию:/).textContent())?.match(/^На порцию: (.+) ккал · Б (.+) г · Ж (.+) г · У (.+) г · ≈ (.+)$/);
  expect(facts).toBeTruthy();
  const total = await page.getByRole('region', { name: 'Бюджет меню' }).innerText();
  await lunch.getByRole('link').click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(replacement.recipeSnapshot.name);
  expect(new URL(page.url()).searchParams.get('instance')).toBe(original.id);
  await expect(page.getByText('Порций для семьи: 2', { exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'На одну порцию' }).locator('dd')).toHaveText([
    `${facts![1]} ккал`, `${facts![2]} г`, `${facts![3]} г`, `${facts![4]} г`, `≈ ${facts![5]}`,
  ]);
  await page.getByRole('link', { name: 'К меню', exact: true }).click();
  await page.getByRole('link', { name: /^Список покупок ·/ }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Список покупок');
  const source = `${formatDate(original.date)} · Обед · ${replacement.recipeSnapshot.name} ·`;
  const previousSource = `${formatDate(original.date)} · Обед · ${original.recipeSnapshot.name} ·`;
  const purchases = page.locator('article[data-product-id]');
  const sources = await purchases.locator('details li').allTextContents();
  expect(sources.some(row => row.includes(source))).toBe(true);
  expect(sources.some(row => row.includes(previousSource))).toBe(false);
  await expect(page.getByRole('region', { name: 'Бюджет меню' })).toHaveText(total, { useInnerText: true });
  await page.reload();
  await expect(page.getByRole('region', { name: 'Бюджет меню' })).toHaveText(total, { useInnerText: true });
  expect((await readMenu(page)).raw).toBe(edited.raw);
  expect(await purchases.locator('details li').allTextContents()).toEqual(sources);
});

for (const count of [0, 1]) test(`alternatives show ${count} actual choices and return focus when closed`, async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openSyntheticPlan(page, { split: count === 1 ? 'one' : undefined });
  const before = (await readMenu(page)).raw;
  const breakfast = page.locator('article[data-slot="breakfast"]');
  await breakfast.getByRole('button', { name: /^Действия для блюда/ }).click();
  const trigger = breakfast.getByRole('button', { name: 'Заменить блюдо', exact: true });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Заменить блюдо' });
  const close = dialog.getByRole('button', { name: 'Закрыть подбор' });
  await expect(close).toBeFocused();
  await expect(dialog.getByRole('button').filter({ hasText: 'Покупки за период' })).toHaveCount(count);
  if (count === 0) await expect(dialog.getByRole('heading', { name: 'Нет подходящих блюд' })).toBeVisible();
  else await expect(dialog.getByRole('status')).toHaveText('Найден 1 подходящий вариант');
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  expect((await readMenu(page)).raw).toBe(before);
});

test('remove-slot confirms a generated meal removal and restores its empty slot after reload', async ({ page }) => {
  test.setTimeout(65_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await generateTwoDays(page);
  const before = await readMenu(page);
  const original = before.variant.instances.find(instance => instance.slot === 'lunch')!;
  await page.getByRole('button', { name: 'Вся неделя', exact: true }).click();
  const lunch = page.locator(`[data-instance-id="${original.id}"]`);
  const savedRecipe = await lunch.getByRole('link').getAttribute('href');
  await expect(lunch.getByRole('link')).toContainText(original.recipeSnapshot.name);
  const actions = lunch.getByRole('button', { name: /^Действия для блюда/ });
  await actions.click();
  const remove = lunch.getByRole('button', { name: 'Убрать из меню', exact: true });
  await remove.click({ timeout: 5_000 });
  const dialog = page.getByRole('dialog', { name: 'Убрать блюдо из меню?' });
  const keep = dialog.getByRole('button', { name: 'Оставить блюдо' });
  await expect(keep).toBeFocused();
  await keep.click();
  await expect(dialog).toHaveCount(0);
  expect((await readMenu(page)).raw).toBe(before.raw);
  await expect(remove).toBeFocused();
  await remove.click();
  await dialog.getByRole('button', { name: 'Убрать из меню' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Изменения сохранены' })).toBeVisible();
  const after = await readMenu(page);
  expect(after.variant.instances).toEqual(othersAt(before.variant, original.id));
  expect(after.plan.inputs).toEqual(before.plan.inputs);
  const empty = page.locator(`[data-empty-date="${original.date}"][data-slot="lunch"]`);
  await expect(empty).toContainText('Обед');
  const menu = page.url();
  const budget = await page.getByRole('region', { name: 'Бюджет меню' }).innerText();
  await page.getByRole('link', { name: /^Список покупок ·/ }).click();
  await expect(page.getByRole('region', { name: 'Бюджет меню' })).toHaveText(budget, { useInnerText: true });
  const sources = await page.locator('article[data-product-id] details li').allTextContents();
  expect(sources.some(row => row.includes(`${formatDate(original.date)} · Обед ·`))).toBe(false);
  await page.goto(savedRecipe!);
  await expect(page.getByRole('link', { name: 'К актуальному меню' })).toBeVisible();
  await page.goto(menu);
  await page.reload();
  await expect(empty).toContainText('Обед');
  expect((await readMenu(page)).raw).toBe(after.raw);
});

test('add-slot fills a persisted empty meal with a new identity and updated purchases', async ({ page }) => {
  test.setTimeout(65_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await generateTwoDays(page);
  const before = await readMenu(page);
  const old = before.variant.instances.find(row => row.slot === 'lunch')!;
  const oldCard = page.locator(`[data-instance-id="${old.id}"]`);
  const oldRecipe = await oldCard.getByRole('link').getAttribute('href');
  await oldCard.getByRole('button', { name: /^Действия для блюда/ }).click();
  await oldCard.getByRole('button', { name: 'Убрать из меню' }).click();
  await page.getByRole('dialog', { name: 'Убрать блюдо из меню?' }).getByRole('button', { name: 'Убрать из меню' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Изменения сохранены' })).toBeVisible();
  await page.reload();
  const empty = page.locator(`[data-empty-date="${old.date}"][data-slot="lunch"]`);
  await expect(empty).toContainText('Обед');
  await empty.getByRole('button', { name: '+ Добавить блюдо', exact: true }).click({ timeout: 5_000 });
  const dialog = page.getByRole('dialog', { name: 'Добавить блюдо' });
  const option = dialog.getByRole('button').filter({ hasText: 'Покупки за период' }).first();
  await expect(option).toContainText('Ккал за приём');
  await option.click();
  await expect(empty).toHaveCount(0);
  await expect(page.getByRole('status').filter({ hasText: 'Изменения сохранены' })).toBeVisible();
  const after = await readMenu(page);
  const added = after.variant.instances.find(row => row.date === old.date && row.slot === old.slot)!;
  expect(after.plan.schemaVersion).toBe(2);
  expect(after.variant).toMatchObject({ emptySlots: [] });
  expect(added.id).not.toBe(old.id);
  expect(added.selectedServings).toEqual(old.selectedServings);
  expect(othersAt(after.variant, added.id)).toEqual(othersAt(before.variant, old.id));
  const addedLink = page.locator(`[data-instance-id="${added.id}"]`).getByRole('link');
  await expect(addedLink).toBeFocused();
  await addedLink.click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(added.recipeSnapshot.name);
  await page.getByRole('link', { name: 'К меню', exact: true }).click();
  await page.getByRole('link', { name: /^Список покупок ·/ }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Список покупок');
  const source = `${formatDate(added.date)} · Обед · ${added.recipeSnapshot.name} ·`;
  const list = page.locator('article[data-product-id] details li');
  expect((await list.allTextContents()).some(row => row.includes(source))).toBe(true);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Список покупок');
  expect((await readMenu(page)).raw).toBe(after.raw);
  expect((await list.allTextContents()).some(row => row.includes(source))).toBe(true);
  await page.goto(oldRecipe!);
  await expect(page.getByRole('link', { name: 'К актуальному меню' })).toBeVisible();
});

test('remove-slot keeps all four add actions when no meals remain and explains zero purchases', async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 1280, height: 850 });
  await generateRealPlan(page, 1);
  const before = await readMenu(page);
  for (const instance of before.variant.instances) {
    const meal = page.locator(`[data-instance-id="${instance.id}"]`);
    await meal.getByRole('button', { name: /^Действия для блюда/ }).click();
    await meal.getByRole('button', { name: 'Убрать из меню' }).click();
    await page.getByRole('dialog', { name: 'Убрать блюдо из меню?' }).getByRole('button', { name: 'Убрать из меню' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Изменения сохранены' })).toBeVisible();
  }
  await page.reload();
  await expect(page.getByRole('button', { name: '+ Добавить блюдо', exact: true })).toHaveCount(4);
  expect((await readMenu(page)).variant.instances).toHaveLength(0);
  await page.getByRole('link', { name: 'Список покупок · 0 товаров' }).click();
  await expect(page.getByRole('heading', { name: 'В меню пока нет блюд' })).toBeVisible({ timeout: 5_000 });
  await expect(page.locator('article[data-product-id]')).toHaveCount(0);
});
