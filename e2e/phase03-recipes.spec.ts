import { test, expect } from '@playwright/test';
import { openSyntheticPlan } from './plan-fixtures';
import legacyPlan from '../src/test/fixtures/phase02-active-plan-v1.json' with { type: 'json' };

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
  const menuRow = page.locator(`[data-instance-id="${instance.id}"]`);
  const menuFacts = (await menuRow.getByText(/^На порцию:/).textContent())!.match(/^На порцию: (.+) ккал · Б (.+) г · Ж (.+) г · У (.+) г · ≈ (.+)$/)!;
  expect(menuFacts).not.toBeNull();
  await menuRow.getByRole('link', { name: instance.recipeSnapshot.name, exact: true }).click();
  const oldRecipeUrl = page.url();
  await expect(page.getByRole('heading', { name: instance.recipeSnapshot.name, exact: true })).toBeVisible();
  await expect(page.locator('[data-instance-id]')).toHaveAttribute('data-instance-id', instance.id);
  await expect(page.getByText('Порций для семьи: 2', { exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'На одну порцию' }).locator('dt')).toHaveText(['Калории', 'Белки', 'Жиры', 'Углеводы', 'Цена']);
  await expect(page.getByRole('region', { name: 'На одну порцию' }).locator('dd')).toHaveText([`${menuFacts[1]} ккал`, `${menuFacts[2]} г`, `${menuFacts[3]} г`, `${menuFacts[4]} г`, `≈ ${menuFacts[5]}`]);
  await expect(page.getByRole('list', { name: 'Шаги приготовления' }).getByRole('listitem')).toHaveText(instance.recipeSnapshot.steps);
  await page.reload();
  await expect(page.locator('[data-instance-id]')).toHaveAttribute('data-instance-id', instance.id);
  await page.getByRole('link', { name: 'К меню', exact: true }).click();
  await expect(page).toHaveURL(`/menu?view=week&day=${instance.date}`);
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(raw);
  await page.getByRole('button', { name: 'Следующий вариант', exact: true }).click();
  await expect(page.getByText('Вариант 2 из 3', { exact: true })).toBeVisible();
  const changedBytes = await page.evaluate(key => localStorage.getItem(key), key);
  await page.goto(oldRecipeUrl);
  await expect(page.getByRole('heading', { name: 'Этот рецепт больше не связан с текущим меню', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('link', { name: 'К актуальному меню', exact: true })).toHaveAttribute('href', '/menu');
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(changedBytes);
});

test('repeated recipe instances show full partial and no stock from the same shopping ledger', async ({ page }) => {
  await openSyntheticPlan(page, { stock: 'partial' });
  const raw = await page.evaluate(key => localStorage.getItem(key), key);
  for (const [slot, message, quantities] of [
    ['breakfast', 'Есть дома: 125 г', 'Нужно 125 г · Из запасов 125 г · Докупить 0 г'],
    ['lunch', 'Частично из запасов', 'Нужно 125 г · Из запасов 75 г · Докупить 50 г'],
    ['dinner', 'Нет количественного покрытия запасами', 'Нужно 125 г · Из запасов 0 г · Докупить 125 г'],
  ]) {
    const id = `synthetic-2026-10-01-${slot}`;
    await page.locator(`[data-instance-id="${id}"]`).getByRole('link', { name: 'Синтетическое повторяющееся блюдо', exact: true }).click();
    await expect(page).toHaveURL(/\/recipe\//);
    await expect(page.locator('[data-instance-id]')).toHaveAttribute('data-instance-id', id);
    await expect(page.getByText(message, { exact: true })).toBeVisible();
    await expect(page.getByText(quantities, { exact: true })).toBeVisible();
    await page.getByText('Состав — КБЖУ каждого ингредиента на одну порцию', { exact: true }).focus();
    await page.keyboard.press('Enter');
    const composition = page.locator('details').filter({ hasText: 'Состав — КБЖУ' });
    await expect(composition.locator('dd')).toHaveText(['250 ккал', '12,5 г', '0,0 г', '37,5 г']);
    await expect(page.getByRole('list', { name: 'Шаги приготовления' }).getByRole('listitem')).toHaveText(['Синтетический тест']);
    for (const width of [360, 768, 1280]) {
      await page.setViewportSize({ width, height: 812 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    }
    await page.getByRole('link', { name: 'К меню', exact: true }).click();
  }
  await page.getByRole('link', { name: /^Список покупок ·/ }).click();
  await expect(page.getByText('Купить 300 г · ≈ 30,00 ₽', { exact: true })).toBeVisible();
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(raw);
});

test('catalog adapter failure retries with real pending feedback and a late read cannot replace a new route', async ({ page }) => {
  await page.goto('/plan/new');
  await expect(page.getByLabel('Число людей', { exact: true })).toBeVisible();
  await page.evaluate(async () => {
    const urls = performance.getEntriesByType('resource').map(row => row.name);
    const reactUrl = urls.find(url => /\/react\.js\?/.test(url))!, rootUrl = urls.find(url => /\/react-dom_client\.js\?/.test(url))!;
    const { default: { createElement } } = await import(reactUrl);
    const { default: { createRoot } } = await import(rootUrl);
    const appPath = '/src/app/App.tsx', catalogPath = '/src/data/catalog.ts';
    const { App } = await import(appPath), { bundledCatalogPort } = await import(catalogPath);
    let reads = 0;
    const catalogPort = { ...bundledCatalogPort, async load() {
      reads++;
      if (reads === 1) return { status: 'invalid', diagnostics: [] };
      await new Promise<void>(resolve => window.addEventListener('release-recipe-catalog', () => resolve(), { once: true }));
      return bundledCatalogPort.load();
    } };
    document.getElementById('root')!.remove();
    const container = document.createElement('div'); container.id = 'root'; document.body.append(container);
    history.replaceState({}, '', '/recipe/rice-sweet-porridge');
    createRoot(container).render(createElement(App, { catalogPort }));
  });
  await expect(page.getByRole('heading', { name: 'Не удалось загрузить рецепт', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
  const retry = page.getByRole('button', { name: 'Повторить загрузку', exact: true });
  expect((await retry.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await retry.click();
  await expect(page.getByRole('status', { name: '', exact: true }).filter({ hasText: 'Загружаем рецепт…' })).toBeVisible();
  // Navigate while the real adapter read is still pending, then deliver its late result.
  await page.getByRole('link', { name: 'Новое меню', exact: false }).click();
  await expect(page.getByLabel('Число людей', { exact: true })).toBeVisible();
  await page.evaluate(() => window.dispatchEvent(new Event('release-recipe-catalog')));
  await expect(page).toHaveURL('/plan/new');
  await expect(page.getByText(/^Исходный рецепт ·/)).toHaveCount(0);
  // The acknowledged catalog is available on a later direct visit; no old context is reused.
  await page.evaluate(() => {
    history.pushState({}, '', '/recipe/rice-sweet-porridge');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  await expect(page.getByText(/^Исходный рецепт ·/)).toBeVisible();
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

test('malformed duplicate oversized and external return URLs cannot rebind a saved occurrence', async ({ page }) => {
  const raw = JSON.stringify(legacyPlan), instance = legacyPlan.plan.variants[0].instances[0];
  await page.addInitScript(({ key, raw }) => localStorage.setItem(key, raw), { key, raw });
  await page.goto('/menu');
  await expect(page.getByRole('heading', { name: 'Меню на неделю', exact: true })).toBeVisible();
  const identity = new URLSearchParams({ variant: legacyPlan.plan.activeVariantId, instance: instance.id }).toString();
  for (const path of [
    `/recipe/%QQ?${identity}`,
    `/recipe/${instance.recipeId}?${identity}&instance=duplicate`,
    `/recipe/${instance.recipeId}?${identity}&return=https://evil.invalid/`,
    `/recipe/${instance.recipeId}?${identity}&view=invalid`,
    `/recipe/${instance.recipeId}?${identity}&day=2026-02-30`,
    `/recipe/${instance.recipeId}?variant=${'a'.repeat(257)}&instance=${encodeURIComponent(instance.id)}`,
    `/recipe/${instance.recipeId}?variant=%E0%A4&instance=x`,
  ]) {
    if (path.includes('%QQ')) {
      // Vite rejects malformed path encoding before serving the SPA (HTTP404).
      // Exercise the application's raw-URL guard through actual client navigation.
      await page.evaluate(path => { history.pushState({}, '', path); window.dispatchEvent(new PopStateEvent('popstate')); }, path);
    } else await page.goto(path);
    await expect(page.getByRole('heading', { name: 'Этот рецепт больше не связан с текущим меню', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'К актуальному меню', exact: true })).toHaveAttribute('href', '/menu');
    expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(raw);
  }
  await page.goto('/recipe/unknown-exact-id');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Такого рецепта нет', exact: true })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Этот рецепт больше не связан с текущим меню', exact: true })).toBeVisible();
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(raw);
});

test('corrupt persisted recipe context stays incomplete through retry without rewriting source bytes', async ({ page }) => {
  const corrupted = structuredClone(legacyPlan);
  const instance = corrupted.plan.variants[0].instances[0];
  instance.recipeSnapshot.steps = [];
  const raw = JSON.stringify(corrupted);
  await page.addInitScript(({ key, raw }) => localStorage.setItem(key, raw), { key, raw });
  await page.goto(`/recipe/${instance.recipeId}?${new URLSearchParams({ variant: corrupted.plan.activeVariantId, instance: instance.id })}`);
  await expect(page.getByRole('heading', { name: 'Не удалось показать состав рецепта', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Повторить загрузку', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Не удалось показать состав рецепта', exact: true })).toBeVisible();
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(raw);
  await page.getByRole('link', { name: 'К меню', exact: true }).click();
  await expect(page).toHaveURL('/menu');
});
