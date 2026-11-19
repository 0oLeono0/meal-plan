import { expect, test, type Page } from '@playwright/test';
import type { ActivePlanEnvelope, PlanVariant } from '../src/domain/plan';
import { openSyntheticPlan } from './plan-fixtures';

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
