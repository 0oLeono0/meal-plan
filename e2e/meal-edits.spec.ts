import { expect, test, type Page } from '@playwright/test';
import type { ActivePlanEnvelope, PlanVariant } from '../src/domain/plan';
import { count, mountGeneration, preserved, release } from './generation-fixtures';
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

async function pickRecipeAlternative(page: Page) {
  await page.getByRole('button', { name: 'Заменить в меню', exact: true }).click();
  const sheet = page.getByRole('dialog', { name: 'Заменить блюдо' });
  const option = sheet.getByRole('button', { name: /Покупки за период/ }).first();
  await expect(option).toBeVisible();
  const name = (await option.locator('span').first().textContent())!;
  await option.click();
  return name;
}

test('recipe-replace preserves the contextual route until save and never redirects from shopping', async ({ page }) => {
  test.setTimeout(65_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await generateTwoDays(page);
  const generated = await readMenu(page);
  const target = generated.variant.instances.find(row => row.slot === 'lunch')!;
  const params = new URLSearchParams({ variant: generated.variant.id, instance: target.id, view: 'week', day: target.date });
  const route = `/recipe/${target.recipeId}?${params}`;
  await page.goto(route);
  await page.getByRole('button', { name: /^×0,5/ }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Изменения сохранены' })).toBeVisible();
  await expect(page.getByText('Порций для семьи: 1', { exact: true })).toBeVisible();
  const before = await readMenu(page);
  await mountGeneration(page, { route, deferSave: true });
  const title = page.getByRole('heading', { level: 1 });
  await expect(title).toHaveText(target.recipeSnapshot.name);
  const recipeUrl = page.url();

  const chosen = await pickRecipeAlternative(page);
  await expect.poll(() => count(page, 'save-calls')).toBe(1);
  await expect(title).toHaveText(chosen);
  await expect(page.getByRole('status').filter({ hasText: 'Сохраняем изменения меню' })).toHaveCount(1);
  await expect(page.getByRole('status').filter({ hasText: 'Изменения сохранены' })).toHaveCount(0);
  await expect(page.getByText('Порций для семьи: 1', { exact: true })).toBeVisible();
  expect(page.url()).toBe(recipeUrl);
  await preserved(page, before.raw);
  await release(page, 'save-1');
  await expect.poll(() => page.url()).not.toBe(recipeUrl);
  await expect(title).toHaveText(chosen);
  await expect(title).toBeFocused();
  const saved = await readMenu(page);
  const edited = saved.variant.instances.find(row => row.id === target.id)!;
  expect(edited.recipeSnapshot.name).toBe(chosen);
  expect(edited.selectedServings).toEqual({ numerator: '1', denominator: '1' });
  expect(othersAt(saved.variant, target.id)).toEqual(othersAt(before.variant, target.id));
  expect(new URL(page.url()).pathname).toBe(`/recipe/${edited.recipeId}`);
  expect(new URL(page.url()).searchParams.toString()).toBe(params.toString());
  await expect(page.getByRole('link', { name: 'К меню', exact: true })).toHaveAttribute('href', `/menu?view=week&day=${target.date}`);

  const next = await pickRecipeAlternative(page);
  await expect.poll(() => count(page, 'save-calls')).toBe(2);
  await expect(title).toHaveText(next);
  await page.getByRole('link', { name: 'Покупки', exact: true }).click();
  await expect(page).toHaveURL(/\/shopping$/);
  await expect(page.getByRole('status').filter({ hasText: 'Сохраняем изменения меню' })).toHaveCount(1);
  await expect(page.locator('details li').filter({ hasText: next }).first()).toBeAttached();
  await release(page, 'save-2');
  await expect(page.getByRole('status').filter({ hasText: 'Изменения сохранены' })).toBeVisible();
  await expect(page).toHaveURL(/\/shopping$/);
});

test('rollback restores the recipe and its focus, then retries and announces the confirmed recipe once', async ({ page }) => {
  test.setTimeout(65_000);
  await generateTwoDays(page);
  const before = await readMenu(page);
  const target = before.variant.instances.find(row => row.slot === 'lunch')!;
  const params = new URLSearchParams({ variant: before.variant.id, instance: target.id, view: 'week', day: target.date });
  await mountGeneration(page, { route: `/recipe/${target.recipeId}?${params}`, deferSave: true, failWrite: true });
  const title = page.getByRole('heading', { level: 1 });
  await expect(title).toHaveText(target.recipeSnapshot.name);
  const price = page.getByRole('region', { name: 'На одну порцию' }).locator('dd');
  const initialFacts = await price.allTextContents();
  const route = page.url();
  const chosen = await pickRecipeAlternative(page);
  await expect.poll(() => count(page, 'save-calls')).toBe(1);
  await expect(title).toHaveText(chosen);
  await preserved(page, before.raw);
  await release(page, 'save-1');
  await expect(page.getByRole('alert')).toContainText('Восстановлено прежнее меню');
  await expect(title).toHaveText(target.recipeSnapshot.name);
  await expect(price).toHaveText(initialFacts);
  await expect(page.getByRole('button', { name: 'Заменить в меню' })).toBeFocused();
  await expect(page).toHaveURL(route);
  await preserved(page, before.raw);

  await page.evaluate(() => sessionStorage.setItem('allow-write', 'yes'));
  await page.getByRole('button', { name: 'Повторить сохранение', exact: true }).click();
  await expect.poll(() => count(page, 'save-calls')).toBe(2);
  await expect(title).toHaveText(chosen);
  await release(page, 'save-2');
  await expect.poll(() => page.url()).not.toBe(route);
  await expect(title).toHaveText(chosen);
  await expect(title).toBeFocused();
  await expect(page.getByRole('status').filter({ hasText: 'Изменения сохранены' })).toHaveCount(1);
  expect(await count(page, 'final-writes')).toBe(1);
  const saved = await readMenu(page);
  expect(saved.variant.instances.find(row => row.id === target.id)?.recipeSnapshot.name).toBe(chosen);
  await page.reload();
  await expect(title).toHaveText(chosen);
  await preserved(page, saved.raw);
});

test('rollback shows identical optimistic totals on menu and shopping and restores both after failure', async ({ page }) => {
  test.setTimeout(65_000);
  await generateTwoDays(page);
  const before = await readMenu(page);
  const target = before.variant.instances.find(row => row.slot === 'lunch')!;
  const budget = page.getByRole('region', { name: 'Бюджет меню' });
  const confirmedBudget = await budget.innerText();
  const params = new URLSearchParams({ variant: before.variant.id, instance: target.id, view: 'week', day: target.date });
  await mountGeneration(page, { route: `/recipe/${target.recipeId}?${params}`, deferSave: true, failWrite: true });
  const chosen = await pickRecipeAlternative(page);
  await expect.poll(() => count(page, 'save-calls')).toBe(1);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(chosen);
  await page.getByRole('link', { name: 'К меню', exact: true }).click();
  const menuCard = page.locator(`[data-instance-id="${target.id}"]`);
  await expect(menuCard).toContainText(chosen);
  const previewBudget = await budget.innerText();
  await page.getByRole('link', { name: /^Список покупок ·/ }).click();
  await expect(page).toHaveURL(/\/shopping$/);
  await expect(budget).toHaveText(previewBudget, { useInnerText: true });
  await expect(page.getByRole('status').filter({ hasText: 'Сохраняем изменения меню' })).toHaveCount(1);
  await expect(page.getByRole('status').filter({ hasText: 'Изменения сохранены' })).toHaveCount(0);
  await expect(page.locator('details li').filter({ hasText: chosen }).first()).toBeAttached();
  await release(page, 'save-1');
  await expect(page.getByRole('alert')).toContainText('Восстановлено прежнее меню');
  await expect(page).toHaveURL(/\/shopping$/);
  await expect(budget).toHaveText(confirmedBudget, { useInnerText: true });
  await preserved(page, before.raw);
  await page.getByRole('link', { name: 'К меню', exact: true }).click();
  await expect(menuCard).toContainText(target.recipeSnapshot.name);
  await expect(budget).toHaveText(confirmedBudget, { useInnerText: true });
});

test('rollback reports another tab’s raw change and requires refresh before another edit', async ({ page, context }) => {
  test.setTimeout(65_000);
  await generateTwoDays(page);
  const before = await readMenu(page);
  const target = before.variant.instances.find(row => row.slot === 'lunch')!;
  const params = new URLSearchParams({ variant: before.variant.id, instance: target.id, view: 'week', day: target.date });
  await mountGeneration(page, { route: `/recipe/${target.recipeId}?${params}`, deferSave: true });
  const title = page.getByRole('heading', { level: 1 });
  const chosen = await pickRecipeAlternative(page);
  await expect.poll(() => count(page, 'save-calls')).toBe(1);
  await expect(title).toHaveText(chosen);
  const external = ' ' + before.raw;
  const other = await context.newPage();
  await other.goto('/menu');
  await other.evaluate(({ key, external }) => localStorage.setItem(key, external), { key: activeKey, external });
  await other.close();
  await release(page, 'save-1');
  await expect(page.getByRole('alert')).toContainText('Меню изменилось');
  await expect(title).toHaveText(target.recipeSnapshot.name);
  await expect(page.getByRole('button', { name: 'Повторить сохранение' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Заменить в меню', exact: true })).toBeDisabled();
  await preserved(page, external);
  await page.getByRole('button', { name: 'Обновить меню', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Заменить в меню', exact: true })).toBeEnabled();
  await expect(title).toHaveText(target.recipeSnapshot.name);
  await expect(page.getByRole('alert')).toHaveCount(0);
  expect(await count(page, 'save-calls')).toBe(1);
  await preserved(page, external);
});

test('recipe-replace cannot redirect a later visit to the same address', async ({ page }) => {
  test.setTimeout(65_000);
  await generateTwoDays(page);
  const before = await readMenu(page);
  const target = before.variant.instances.find(row => row.slot === 'lunch')!;
  const params = new URLSearchParams({ variant: before.variant.id, instance: target.id, view: 'week', day: target.date });
  await mountGeneration(page, { route: `/recipe/${target.recipeId}?${params}`, deferSave: true });
  const route = page.url();
  const chosen = await pickRecipeAlternative(page);
  await expect.poll(() => count(page, 'save-calls')).toBe(1);
  await page.getByRole('link', { name: 'Покупки', exact: true }).click();
  await expect(page).toHaveURL(/\/shopping$/);
  await page.goBack();
  await expect(page).toHaveURL(route);
  await release(page, 'save-1');
  await expect.poll(() => count(page, 'final-writes')).toBe(1);
  await expect(page.getByRole('link', { name: 'К актуальному меню' })).toBeVisible();
  await expect(page).toHaveURL(route);
  expect((await readMenu(page)).variant.instances.find(row => row.id === target.id)?.recipeSnapshot.name).toBe(chosen);
});

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
  await expect(page.getByRole('button', { name: 'Заменить в меню', exact: true })).toHaveCount(0);
  query.set('instance', target.instance + '/absent');
  await page.goto(`/recipe/${target.recipe}?${query}`);
  await expect(page.getByRole('link', { name: 'К актуальному меню' })).toBeVisible();
  await expect(portions).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Заменить в меню', exact: true })).toHaveCount(0);
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

test('keyboard-responsive selects a weekly replacement and keeps the dialog usable at five widths', async ({ page, browserName }, testInfo) => {
  test.setTimeout(70_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await generateRealPlan(page);
  const { plan, variant } = await readMenu(page);
  expect(plan.inputs.catalog.recipes).toHaveLength(82);
  const lunch = variant.instances.find(row => row.slot === 'lunch')!;
  const card = page.locator(`[data-instance-id="${lunch.id}"]`);
  const tools = card.getByRole('button', { name: /^Действия для блюда/ });
  const trigger = card.getByRole('button', { name: 'Заменить блюдо', exact: true });
  const dialog = page.getByRole('dialog', { name: 'Заменить блюдо' });
  const close = dialog.getByRole('button', { name: 'Закрыть подбор' });
  const choices = dialog.getByRole('button').filter({ hasText: 'Покупки за период' });

  for (const width of [360, 390, 430, 768, 1280]) {
    const height = width < 768 ? 460 : 740;
    await page.setViewportSize({ width, height });
    const entireWeek = page.getByRole('button', { name: 'Вся неделя', exact: true });
    if (await entireWeek.isVisible() && await entireWeek.getAttribute('aria-pressed') === 'false') await entireWeek.click();
    await tools.focus();
    await page.keyboard.press('Enter');
    await page.keyboard.press('Tab');
    await expect(trigger).toBeFocused();
    const started = Date.now();
    await page.keyboard.press('Enter');
    await expect(close).toBeFocused();
    await expect(choices.last()).toBeVisible();
    if (width === 390) testInfo.annotations.push({ type: 'actual-panel-ms', description: `${Date.now() - started} ms (${browserName}, 390 × ${height}, 82 recipes, 7 days)` });
    expect(await choices.count()).toBeGreaterThanOrEqual(3);
    expect(await choices.count()).toBeLessThanOrEqual(5);
    const panel = (await dialog.boundingBox())!;
    const crossesPage = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    expect(crossesPage).toBe(false);
    expect(panel.x).toBeGreaterThanOrEqual(0);
    expect(panel.x + panel.width).toBeLessThanOrEqual(width);
    expect(panel.y + panel.height).toBeLessThanOrEqual(height);
    if (width < 768) expect(panel.y + panel.height).toBeCloseTo(height, 0);
    else {
      expect(panel.width).toBe(560);
      expect(panel.x + panel.width / 2).toBeCloseTo(width / 2, 0);
      expect(panel.y + panel.height / 2).toBeCloseTo(height / 2, 0);
    }
    await page.keyboard.press('Shift+Tab');
    await expect(choices.last()).toBeFocused();
    await expect(choices.last()).toBeInViewport({ ratio: 0.9 });
    await expect(close).toBeInViewport({ ratio: 0.9 });
    if (browserName === 'chromium' && [360, 768, 1280].includes(width)) {
      await dialog.screenshot({ path: `.tmp/phase04-05/screenshots/alternatives-${width}.png` });
    }
    await page.keyboard.press('Tab');
    await expect(close).toBeFocused();
    if (width !== 1280) {
      await page.keyboard.press('Escape');
      await expect(dialog).toHaveCount(0);
      await expect(trigger).toBeFocused();
      await page.keyboard.press('Escape');
      await expect(tools).toBeFocused();
    }
  }

  await page.keyboard.press('Shift+Tab');
  await expect(choices.last()).toBeFocused();
  const replacement = await choices.last().locator('span').first().innerText();
  await page.keyboard.press('Enter');
  await expect(dialog).toHaveCount(0);
  await expect(card.getByRole('link')).toBeFocused();
  await expect(card.getByRole('link')).toContainText(replacement);
  const total = await page.getByRole('region', { name: 'Бюджет меню' }).innerText();
  const purchases = page.getByRole('link', { name: /^Список покупок ·/ });
  await purchases.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Список покупок', exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Бюджет меню' })).toHaveText(total, { useInnerText: true });
  const sources = await page.locator('article[data-product-id] details li').allTextContents();
  expect(sources.some(row => row.includes(` · Обед · ${replacement} ·`))).toBe(true);
});

test('keyboard-responsive wraps long text and keeps controls visible at an effective 200% reflow width', async ({ page, browserName }) => {
  await page.setViewportSize({ width: 360, height: 420 });
  await openSyntheticPlan(page, { long: true, split: 'one' });
  const breakfast = page.locator('article[data-slot="breakfast"]');
  await breakfast.getByRole('button', { name: /^Действия для блюда/ }).click();
  await breakfast.getByRole('button', { name: 'Заменить блюдо', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Заменить блюдо' });
  const close = dialog.getByRole('button', { name: 'Закрыть подбор' });
  const alternative = dialog.getByRole('button').filter({ hasText: 'Покупки за период' });
  await expect(alternative).toHaveCount(1);
  await expect(dialog.getByRole('status')).toHaveText('Найден 1 подходящий вариант');
  await expect(alternative).toContainText('ОченьДлинноеБлюдо');
  await expect(alternative.locator('img')).toHaveCount(0);

  // Half the reference viewport dimensions exercises desktop browser-zoom reflow at 200%.
  // This does not set browser chrome zoom or depend on OS accessibility settings.
  for (const viewport of [{ width: 360, height: 420 }, { width: 640, height: 420 }]) {
    await page.setViewportSize(viewport);
    await expect(close).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(alternative).toBeFocused();
    await expect(alternative).toBeInViewport();
    await expect(close).toBeInViewport({ ratio: 0.9 });
    const widths = await dialog.evaluate(element => ({ sheet: element.scrollWidth, inner: element.clientWidth, page: document.documentElement.scrollWidth, viewport: innerWidth }));
    expect(widths.sheet).toBe(widths.inner);
    expect(widths.page).toBe(widths.viewport);
    if (browserName === 'chromium') await dialog.screenshot({ path: `.tmp/phase04-05/screenshots/long-alternative-${viewport.width}.png` });
    await page.keyboard.press('Tab');
  }
  await expect(close).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(breakfast.getByRole('button', { name: 'Заменить блюдо', exact: true })).toBeFocused();
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
