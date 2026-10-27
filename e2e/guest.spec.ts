import { test, expect, type Page } from '@playwright/test';

const draftKey = 'mealplan:guest:draft:v1';

for (const field of ['goal', 'cookingTime', 'variety', 'unit']) {
  test(`snapshot rejects arrays in the ${field} enum`, async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Меню с учётом ваших привычек' })).toBeVisible();
    await page.evaluate(async ({ key, field }) => {
      const modulePath = '/src/domain/settings.ts';
      const { createDraft } = await import(modulePath);
      const draft = createDraft();
      if (field === 'unit') draft.home = [{ productId: 'rice', quantity: '200', unit: ['g'], expiresSoon: false }];
      else draft[field] = [draft[field]];
      localStorage.setItem(key, JSON.stringify({ schemaVersion: 1, draft }));
    }, { key: draftKey, field });
    await page.reload();
    await expect(page.getByText('Не удалось восстановить настройки. Сохранённые данные повреждены или имеют другую версию')).toBeVisible();
  });
}

// Mount exported ports through the actual Vite modules, without adding test hooks to production.
async function mountWithPresence(page: Page, options: { value: unknown; delay?: number; stale?: boolean; brand?: string }) {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Меню с учётом ваших привычек' })).toBeVisible();
  await page.evaluate(async options => {
    const resources = performance.getEntriesByType('resource').map(entry => entry.name);
    const reactUrl = resources.find(url => /\/react\.js\?/.test(url));
    const rootUrl = resources.find(url => /\/react-dom_client\.js\?/.test(url));
    if (!reactUrl || !rootUrl) throw new Error('Actual React module URLs were not observed');
    const { default: { createElement } } = await import(reactUrl);
    const { default: { createRoot } } = await import(rootUrl);
    const modulePath = '/src/app/App.tsx';
    const { App } = await import(modulePath);
    document.getElementById('root')?.remove();
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    const port = { load: () => new Promise(resolve => setTimeout(() => resolve(options.value), options.delay ?? 0)) };
    root.render(createElement(App, { planPresencePort: port, brand: options.brand }));
    if (options.stale) setTimeout(() => root.render(createElement(App, {
      planPresencePort: { load: async () => ({ status: 'absent' }) }, brand: options.brand,
    })), 50);
  }, options);
}

for (const value of [{}, { status: 'valid', planId: '' }, { status: 'valid', planId: 42 }, { status: 'absent' }]) {
  test(`invalid plan presence stays on welcome: ${JSON.stringify(value)}`, async ({ page }) => {
    await mountWithPresence(page, { value });
    await expect(page.getByRole('heading', { name: 'Меню с учётом ваших привычек' })).toBeVisible();
    await expect(page).toHaveURL('/');
  });
}

test('only validated plan presence redirects the root', async ({ page }) => {
  await mountWithPresence(page, { value: { status: 'valid', planId: 'plan-1' } });
  await expect(page).toHaveURL('/menu');
});

test('presence load shows recovery instead of a false welcome', async ({ page }) => {
  await mountWithPresence(page, { value: { status: 'absent' }, delay: 1200 });
  await expect(page.getByRole('status')).toHaveText('Восстанавливаем настройки…');
  await expect(page.getByRole('heading', { name: 'Меню с учётом ваших привычек' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Меню с учётом ваших привычек' })).toBeVisible();
});

test('late old presence cannot override a newer absent result', async ({ page }) => {
  await mountWithPresence(page, { value: { status: 'valid', planId: 'stale' }, delay: 600, stale: true });
  await expect(page.getByRole('heading', { name: 'Меню с учётом ваших привычек' })).toBeVisible();
  // Let the obsolete operation actually finish before asserting it was ignored.
  await page.waitForTimeout(700);
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('heading', { name: 'Меню с учётом ваших привычек' })).toBeVisible();
});

test('long Cyrillic brand is text and wraps with doubled text size', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  const brand = 'ОченьДлинноеКириллическоеНазвание'.repeat(6) + ' ₽ <img src=x onerror=alert(1)>';
  await mountWithPresence(page, { value: { status: 'absent' }, brand });
  await expect(page.getByText(brand, { exact: true })).toBeVisible();
  await page.addStyleTag({ content: ':root { font-size: 32px; } h1 { font-size: 64px; } button, .brand { font-size: 32px; }' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.locator('img')).toHaveCount(0);
  await page.getByRole('button', { name: 'Составить меню', exact: true }).click();
  await expect(page.getByLabel('Число людей', { exact: true })).toHaveValue('2');
});

test('guest people count survives a real reload', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Меню с учётом ваших привычек' })).toBeVisible();
  await page.getByRole('button', { name: 'Составить меню', exact: true }).click();
  await expect(page.getByLabel('Число людей', { exact: true })).toHaveValue('2');
  await page.getByRole('button', { name: 'Увеличить число людей', exact: true }).click();
  await expect(page.getByLabel('Число людей', { exact: true })).toHaveValue('3');
  await expect(page.getByRole('status')).toHaveText('Сохранено на этом устройстве');
  await page.reload();
  await expect(page.getByLabel('Число людей', { exact: true })).toHaveValue('3');
});

test('unknown snapshot version is retained while guest edits in memory', async ({ page }) => {
  const original = JSON.stringify({ schemaVersion: 99, draft: { people: '8' } });
  await page.addInitScript(({ key, raw }) => localStorage.setItem(key, raw), { key: draftKey, raw: original });
  await page.goto('/');
  await expect(page.getByText('Не удалось восстановить настройки. Сохранённые данные повреждены или имеют другую версию')).toBeVisible();
  await page.getByRole('button', { name: 'Составить меню', exact: true }).click();
  await page.getByRole('button', { name: 'Увеличить число людей', exact: true }).click();
  await expect(page.getByLabel('Число людей', { exact: true })).toHaveValue('3');
  expect(await page.evaluate(key => localStorage.getItem(key), draftKey)).toBe(original);
  await expect(page.getByText('Сохранено на этом устройстве', { exact: true })).toHaveCount(0);
});

test('write failure preserves current input and retries the latest draft', async ({ page }) => {
  await page.addInitScript(() => {
    const set = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === 'mealplan:guest:draft:v1' && !sessionStorage.getItem('allow-write')) throw new DOMException('Quota exceeded', 'QuotaExceededError');
      return set.call(this, key, value);
    };
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Составить меню', exact: true }).click();
  await page.getByRole('button', { name: 'Увеличить число людей', exact: true }).click();
  await page.getByRole('button', { name: 'Увеличить число людей', exact: true }).click();
  await expect(page.getByLabel('Число людей', { exact: true })).toHaveValue('4');
  await expect(page.getByRole('status')).toContainText('Не удалось сохранить на этом устройстве');
  expect(await page.evaluate(key => localStorage.getItem(key), draftKey)).toBeNull();
  await page.evaluate(() => sessionStorage.setItem('allow-write', 'yes'));
  await page.getByRole('button', { name: 'Повторить сохранение' }).click();
  await expect(page.getByRole('status')).toHaveText('Сохранено на этом устройстве');
  await page.reload();
  await expect(page.getByLabel('Число людей', { exact: true })).toHaveValue('4');
});

test('read failure keeps the wizard accessible without claiming a save', async ({ page }) => {
  await page.addInitScript(() => {
    const get = Storage.prototype.getItem;
    Storage.prototype.getItem = function (key) {
      if (key === 'mealplan:guest:draft:v1') throw new DOMException('Denied', 'SecurityError');
      return get.call(this, key);
    };
  });
  await page.goto('/');
  await expect(page.getByRole('status')).toContainText('Не удалось прочитать настройки');
  await page.getByRole('button', { name: 'Составить меню', exact: true }).click();
  await page.getByRole('button', { name: 'Увеличить число людей', exact: true }).click();
  await expect(page.getByLabel('Число людей', { exact: true })).toHaveValue('3');
  await expect(page.getByText('Сохранено на этом устройстве', { exact: true })).toHaveCount(0);
});

test('raw fields remain drafts and foreign keys are untouched', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('mealplan:confirmed', '{"people":6}');
    localStorage.setItem('mealplan:pantry', '{"rice":200}');
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Составить меню', exact: true }).click();
  await page.getByLabel('Число людей', { exact: true }).fill('');
  await expect(page.getByRole('status')).toHaveText('Сохранено на этом устройстве');
  await page.reload();
  await expect(page.getByLabel('Число людей', { exact: true })).toHaveValue('');
  expect(await page.evaluate(() => [localStorage.getItem('mealplan:confirmed'), localStorage.getItem('mealplan:pantry')]))
    .toEqual(['{"people":6}', '{"rice":200}']);
});

test('double welcome CTA keeps one wizard and the current draft', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Составить меню', exact: true }).evaluate(button => {
    (button as HTMLButtonElement).click();
    (button as HTMLButtonElement).click();
  });
  await expect(page.getByRole('heading', { name: 'Для кого составляем меню' })).toHaveCount(1);
  await expect(page.getByLabel('Число людей', { exact: true })).toHaveValue('2');
});

for (const width of [360, 390, 430, 768, 1280]) {
  test(`guest UI fits ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Меню с учётом ваших привычек' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole('button', { name: 'Составить меню', exact: true }).click();
    await expect(page.getByLabel('Число людей', { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
