import { test, expect } from '@playwright/test';

const key = 'mealplan:guest:active-plan:v1';

test('real generation opens the exact saved recipe instance and returns without changing saved bytes', async ({ page }) => {
  test.setTimeout(70_000);
  await page.goto('/');
  await page.getByRole('button', { name: 'Меню за 1 клик', exact: true }).click();
  await expect(page).toHaveURL(/\/menu$/, { timeout: 32_000 });
  const raw = await page.evaluate(key => localStorage.getItem(key), key);
  expect(raw).not.toBeNull();
  const saved = JSON.parse(raw!).plan;
  const variant = saved.variants.find((row: { id: string }) => row.id === saved.activeVariantId);
  const instance = variant.instances[variant.instances.length - 1];
  await page.locator(`[data-instance-id="${instance.id}"]`).getByRole('link', { name: instance.recipeSnapshot.name, exact: true }).click();
  await expect(page.getByRole('heading', { name: instance.recipeSnapshot.name, exact: true })).toBeVisible();
  await expect(page.locator('[data-instance-id]')).toHaveAttribute('data-instance-id', instance.id);
  await expect(page.getByText('Порций для семьи: 2', { exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'На одну порцию' }).locator('dt')).toHaveText(['Калории', 'Белки', 'Жиры', 'Углеводы', 'Цена']);
  await expect(page.getByRole('list', { name: 'Шаги приготовления' }).getByRole('listitem')).toHaveText(instance.recipeSnapshot.steps);
  await page.getByRole('link', { name: 'К меню', exact: true }).click();
  await expect(page).toHaveURL(`/menu?view=week&day=${instance.date}`);
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(raw);
});

test('direct known recipe has base servings while unknown and invalid contexts have distinct recovery', async ({ page }) => {
  await page.goto('/recipe/rice-sweet-porridge');
  await expect(page.getByText(/^Исходный рецепт ·/)).toBeVisible();
  await expect(page.getByRole('list', { name: 'Шаги приготовления' }).getByRole('listitem')).not.toHaveCount(0);
  await expect(page.getByText(/Есть дома:|Частично из запасов/)).toHaveCount(0);
  await page.goto('/recipe/unknown-exact-id');
  await expect(page.getByRole('heading', { name: 'Такого рецепта нет', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'К меню', exact: true })).toHaveAttribute('href', '/menu');
  await page.goto('/recipe/rice-sweet-porridge?variant=missing');
  await expect(page.getByRole('heading', { name: 'Этот рецепт больше не связан с текущим меню', exact: true })).toBeVisible();
});
