import { test, expect } from '@playwright/test';

test('all guest sections are reachable without a plan and preserve browser history', async ({ page }) => {
  await page.goto('/menu');
  const nav = page.getByRole('navigation', { name: 'Основные разделы' });
  await expect(nav.getByRole('link')).toHaveText(['Меню', 'Покупки', 'Дома']);
  await expect(nav.getByRole('button', { name: 'Профиль' })).toBeVisible();
  await nav.getByRole('link', { name: 'Покупки' }).click();
  await expect(page.getByRole('heading', { name: 'Сначала составьте меню' })).toBeVisible();
  await nav.getByRole('link', { name: 'Дома' }).click();
  await expect(page.getByRole('heading', { name: 'Добавьте, что есть дома, и мы не купим лишнего' })).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL('/shopping');
  await page.goForward();
  await expect(page).toHaveURL('/pantry');
  await expect(page.getByRole('link', { name: 'Новое меню', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Указать продукты в мастере' }).click();
  await expect(page).toHaveURL('/plan/new');
  await expect(nav).toHaveCount(0);
});

test('deep routes and neighboring paths have truthful distinct states on reload', async ({ page }) => {
  for (const [path, title, exit] of [
    ['/menu', 'Меню пока нет', 'Составить меню'],
    ['/shopping', 'Сначала составьте меню', 'Составить меню'],
    ['/recipe/unknown', 'Такого рецепта нет', 'Вернуться к меню'],
    ['/plan/generating', 'Генерация не запущена', 'К настройкам'],
    ['/menus', 'Страница не найдена', 'На главную'],
    ['/recipe', 'Страница не найдена', 'На главную'],
  ]) {
    await page.goto(path);
    await page.reload();
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: exit, exact: true })).toBeVisible();
    if (path === '/plan/generating') await expect(page.getByRole('navigation')).toHaveCount(0);
  }
});

test('CSS owns the exact 1199 to 1200 navigation boundary and fullscreen routes', async ({ page }) => {
  await page.goto('/menu');
  const nav = page.getByRole('navigation', { name: 'Основные разделы' });
  for (const width of [1199, 1200, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(nav).toHaveCount(1);
    const box = await nav.boundingBox();
    expect(box).not.toBeNull();
    if (width < 1200) expect(box!.y).toBeGreaterThan(700);
    else expect(box!.x).toBe(0);
    await expect(nav.locator('[aria-current="page"]')).toHaveText('Меню');
  }
  await page.getByRole('link', { name: 'Новое меню', exact: true }).click();
  await expect(nav).toHaveCount(0);
});

test('profile is one accessible dialog with keyboard trap, Escape and menu return across resize', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto('/shopping');
  const trigger = page.getByRole('button', { name: 'Профиль', exact: true });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Гостевой профиль' });
  await expect(dialog).toHaveCount(1);
  await expect(dialog.getByRole('button', { name: 'Закрыть пояснение' })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(dialog.getByRole('button', { name: 'Вернуться к меню' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(dialog.getByRole('button', { name: 'Закрыть пояснение' })).toBeFocused();
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(dialog).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await trigger.click();
  await dialog.getByRole('button', { name: 'Вернуться к меню' }).click();
  await expect(page).toHaveURL('/menu');
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Меню пока нет' })).toBeFocused();
});

test('navigation does not clear the saved draft or create a plan', async ({ page }) => {
  await page.goto('/plan/new');
  await page.getByLabel('Число людей', { exact: true }).fill('4');
  await expect(page.getByRole('status')).toHaveText('Сохранено на этом устройстве');
  await page.getByRole('link', { name: 'На главную' }).click();
  await page.goto('/menu');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Меню пока нет' })).toBeVisible();
  await page.getByRole('link', { name: 'Составить меню', exact: true }).click();
  await expect(page.getByLabel('Число людей', { exact: true })).toHaveValue('4');
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual(['mealplan:guest:draft:v1']);
});

test('late presence completion cannot pull the user away from a new route', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading')).toBeVisible();
  await page.evaluate(async () => {
    // Match the existing Vite test harness without requiring test-only app routes.
    const resources = performance.getEntriesByType('resource').map(entry => entry.name);
    const reactUrl = resources.find(url => /\/react\.js\?/.test(url));
    const rootUrl = resources.find(url => /\/react-dom_client\.js\?/.test(url));
    if (!reactUrl || !rootUrl) throw new Error('Actual React module URLs were not observed');
    const appUrl = '/src/app/App.tsx';
    const { default: { createElement } } = await import(reactUrl);
    const { default: { createRoot } } = await import(rootUrl);
    const { App } = await import(appUrl);
    document.getElementById('root')?.remove();
    const host = document.createElement('div');
    document.body.append(host);
    createRoot(host).render(createElement(App, {
      planPresencePort: { load: () => new Promise(resolve => setTimeout(() => resolve({ status: 'valid', planId: 'late' }), 700)) },
    }));
  });
  // Pending restore still permits navigating to a section; it only gates root redirect.
  await page.getByRole('link', { name: 'Покупки', exact: true }).click();
  await expect(page).toHaveURL('/shopping');
  await page.waitForTimeout(850);
  await expect(page).toHaveURL('/shopping');
  await expect(page.getByRole('heading', { name: 'Сначала составьте меню' })).toBeVisible();
});

for (const width of [360, 390, 430, 768, 1280]) {
  test(`navigation targets, focus and content remain reachable at ${width}px with doubled text`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/pantry');
    await page.addStyleTag({ content: ':root { font-size: 32px; }' });
    const nav = page.getByRole('navigation', { name: 'Основные разделы' });
    for (const control of await nav.locator('a,button').all()) {
      const box = await control.boundingBox();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const action = page.getByRole('link', { name: 'Указать продукты в мастере' });
    await action.focus();
    await action.scrollIntoViewIfNeeded();
    const actionBox = await action.boundingBox();
    const navBox = await nav.boundingBox();
    if (width < 1200) expect(actionBox!.y + actionBox!.height).toBeLessThanOrEqual(navBox!.y);
    await page.keyboard.press('Shift+Tab');
    const focus = await page.locator(':focus-visible').count();
    expect(focus).toBe(1);
  });
}
