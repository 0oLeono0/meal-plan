import { test, expect } from '@playwright/test';
import { activeKey, count, finishWizard, mountGeneration, preserved, release } from './generation-fixtures';
import { generateRealPlan, savedMenuText } from './plan-fixtures';
import { mountAppFixture } from './fixtures';

for (const kind of ['nutrition', 'price', 'unknown-version'] as const) test(`source trust rejects altered ${kind} after genuine reload and blocks replacement writes`, async ({ page }) => {
  await generateRealPlan(page, 1);
  const raw = await page.evaluate(({ activeKey, kind }) => {
    const stored = JSON.parse(localStorage.getItem(activeKey)!);
    if (kind === 'unknown-version') {
      stored.plan.inputs.catalog.version = 'unregistered-browser-version';
      stored.plan.inputs.catalogVersion = 'unregistered-browser-version';
      for (const variant of stored.plan.variants) for (const instance of variant.instances) instance.catalogVersion = 'unregistered-browser-version';
    } else {
      const profileId = stored.plan.variants[0].instances[0].recipeSnapshot.ingredients[0].profileId;
      const food = stored.plan.inputs.catalog.foods.find((food: { profileId: string }) => food.profileId === profileId);
      if (kind === 'nutrition') food.nutrition.values.calories = '0';
      else food.price.amount = '0.0000001';
    }
    const raw = JSON.stringify(stored); localStorage.setItem(activeKey, raw); return raw;
  }, { activeKey, kind });
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Сохранённое меню повреждено или несовместимо с текущей версией' })).toBeVisible();
  await expect(page.locator('[data-plan-id]')).toHaveCount(0);
  expect(await page.evaluate(key => localStorage.getItem(key), activeKey)).toBe(raw);
  await mountGeneration(page, { route: '/menu' });
  await page.getByRole('link', { name: 'К настройкам', exact: true }).click();
  await finishWizard(page);
  await expect(page.getByRole('heading', { name: 'Меню рассчитано, но не сохранено' })).toBeVisible();
  await page.getByRole('button', { name: 'Повторить сохранение', exact: true }).click();
  expect(await count(page, 'save-calls')).toBe(0);
  expect(await count(page, 'final-writes')).toBe(0);
  await preserved(page, raw);
});

test('failed save exposes a separate candidate, preserves exact old active and retries only the write', async ({ page }) => {
  await generateRealPlan(page);
  const old = await page.evaluate(key => localStorage.getItem(key), activeKey);
  const id = await page.locator('[data-plan-id]').getAttribute('data-plan-id');
  await mountGeneration(page, { failWrite: true });
  await page.getByLabel('Число дней', { exact: true }).fill('2');
  await finishWizard(page, true);
  await expect(page.getByRole('heading', { name: 'Меню рассчитано, но не сохранено' })).toBeFocused();
  await expect(page.getByRole('alert')).toHaveCount(1);
  await expect(page.getByRole('alert')).toContainText('Предыдущее меню не изменено');
  await expect(page.getByText('Рассчитано блюд: 8', { exact: true })).toBeVisible();
  await preserved(page, old);
  await page.getByRole('link', { name: 'К текущему меню', exact: true }).click();
  await expect(page.locator('[data-plan-id]')).toHaveAttribute('data-plan-id', id!);
  // Browser back remounts the operation view but never re-runs its search.
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Генерация прервана или не запущена' })).toBeVisible();
  await preserved(page, old);
});

test('retry-save promotes the existing real candidate, saved dates and sources survive genuine reload', async ({ page }) => {
  await generateRealPlan(page);
  const old = await page.evaluate(key => localStorage.getItem(key), activeKey);
  await mountGeneration(page, { failWrite: true });
  await page.getByLabel('Число дней', { exact: true }).fill('2');
  await finishWizard(page, true);
  await expect(page.getByRole('heading', { name: 'Меню рассчитано, но не сохранено' })).toBeVisible();
  await preserved(page, old);
  await page.evaluate(() => sessionStorage.setItem('allow-write', 'yes'));
  await page.getByRole('button', { name: 'Повторить сохранение', exact: true }).click();
  await expect(page).toHaveURL(/\/menu$/);
  expect(await count(page, 'generation-calls')).toBe(1);
  expect(await count(page, 'save-calls')).toBe(2);
  expect(await count(page, 'final-writes')).toBe(1);
  const saved = await page.evaluate(key => localStorage.getItem(key), activeKey);
  expect(saved).not.toBe(old);
  const dates = await page.locator('[data-date]').evaluateAll(rows => rows.map(row => row.getAttribute('data-date')));
  const sourceSummary = page.locator('summary').filter({ hasText: /^Как считаем$/ });
  await sourceSummary.click();
  const sources = await sourceSummary.locator('..').innerText();
  expect(sources).toContain('Используем примерные справочные цены');
  expect(sources).toContain('КБЖУ считаем по количеству продуктов и порциям');
  expect(sources).not.toMatch(/Версия каталога|https?:|usda-fdc-sr-legacy/);
  expect(saved).toContain('sourceSnapshots');
  expect(saved).toContain('usda-fdc-sr-legacy');
  const text = await savedMenuText(page);
  await page.reload();
  await sourceSummary.click();
  await expect(sourceSummary.locator('..')).toHaveText(sources, { useInnerText: true });
  await expect.poll(() => savedMenuText(page)).toBe(text);
  expect(await page.locator('[data-date]').evaluateAll(rows => rows.map(row => row.getAttribute('data-date')))).toEqual(dates);
  await preserved(page, saved);
});

for (const raw of ['{corrupt', '{"schemaVersion":999,"plan":{}}']) test(`blocked recovery never overwrites ${raw}`, async ({ page }) => {
  await mountGeneration(page, { activeRaw: raw, route: '/menu' });
  await expect(page.getByRole('heading', { name: 'Сохранённое меню повреждено или несовместимо с текущей версией' })).toBeVisible();
  await page.getByRole('link', { name: 'К настройкам', exact: true }).click();
  await finishWizard(page);
  await expect(page.getByRole('heading', { name: 'Меню рассчитано, но не сохранено' })).toBeFocused();
  await expect(page.getByRole('alert')).not.toContainText('Предыдущее меню не изменено');
  await page.getByRole('button', { name: 'Повторить сохранение', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Меню рассчитано, но не сохранено' })).toBeVisible();
  await page.getByRole('button', { name: 'Повторить загрузку', exact: true }).click();
  await expect.poll(() => count(page, 'active-reads')).toBe(2);
  await expect(page.getByRole('button', { name: 'К настройкам', exact: true })).toBeVisible();
  expect(await count(page, 'generation-calls')).toBe(1);
  expect(await count(page, 'save-calls')).toBe(0);
  await preserved(page, raw);
  await page.getByRole('button', { name: 'К настройкам', exact: true }).click();
  await expect(page.getByText('Шаг 4 из 4')).toBeVisible();
});

test('read denial blocks writes until actual reload retry recovers the old active', async ({ page }) => {
  await generateRealPlan(page);
  const old = await page.evaluate(key => localStorage.getItem(key), activeKey);
  const id = await page.locator('[data-plan-id]').getAttribute('data-plan-id');
  await mountGeneration(page, { failRead: true, route: '/menu' });
  await expect(page.getByRole('heading', { name: 'Не удалось загрузить меню', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'К настройкам', exact: true }).click();
  await finishWizard(page);
  await expect(page.getByRole('heading', { name: 'Меню рассчитано, но не сохранено' })).toBeVisible();
  await preserved(page, old);
  await page.evaluate(() => sessionStorage.setItem('allow-read', 'yes'));
  await page.getByRole('button', { name: 'Повторить загрузку', exact: true }).click();
  await expect(page.getByRole('link', { name: 'К текущему меню', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'К текущему меню', exact: true }).click();
  await expect(page.locator('[data-plan-id]')).toHaveAttribute('data-plan-id', id!);
  await preserved(page, old);
  expect(await count(page, 'final-writes')).toBe(0);
});

test('cancelled deferred final save is guarded and cannot replace old active even after a newer request', async ({ page }) => {
  await generateRealPlan(page, 1);
  const old = await page.evaluate(key => localStorage.getItem(key), activeKey);
  await mountGeneration(page, { deferSave: true });
  await page.getByLabel('Число дней', { exact: true }).fill('2');
  await finishWizard(page, true);
  await expect(page.getByText('Сохраняем меню…', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Отмена', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Составить меню', exact: true })).toBeFocused();
  await preserved(page, old);
  await page.getByRole('button', { name: 'Составить меню', exact: true }).click();
  await page.getByRole('dialog', { name: 'Составить меню с новыми настройками?', exact: true }).getByRole('button', { name: 'Составить меню', exact: true }).click();
  await expect.poll(() => count(page, 'generation-calls')).toBe(2);
  await release(page, 'save-1');
  await expect.poll(() => page.evaluate(() => sessionStorage.getItem('save-result-1'))).toBe('cancelled');
  await expect.poll(() => count(page, 'save-calls')).toBe(2);
  await preserved(page, old);
  await release(page, 'save-2');
  await expect(page).toHaveURL(/\/menu$/);
  expect(await count(page, 'final-writes')).toBe(1);
  const newer = await page.evaluate(key => localStorage.getItem(key), activeKey);
  expect(newer).not.toBe(old);
  await page.reload();
  await preserved(page, newer);
});

test('timeout also invalidates a deferred save before its final write', async ({ page }) => {
  await generateRealPlan(page);
  const old = await page.evaluate(key => localStorage.getItem(key), activeKey);
  await mountGeneration(page, { deferSave: true });
  await page.clock.install();
  await finishWizard(page, true);
  await expect(page.getByText('Сохраняем меню…', { exact: true })).toBeVisible();
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100));
  await page.clock.fastForward(30_000);
  await expect(page.getByRole('alert')).toContainText('больше 30 секунд');
  await release(page, 'save-1');
  await expect.poll(() => page.evaluate(() => sessionStorage.getItem('save-result-1'))).toBe('cancelled');
  await preserved(page, old);
  await page.clock.resume();
  expect(await count(page, 'final-writes')).toBe(0);
});

test('draft load retry preserves edits made while its read is pending (CR-01 boundary)', async ({ page }) => {
  await mountAppFixture(page, { draft: { people: '8' }, failRead: true, holdRetryRead: true });
  await expect(page.getByRole('status')).toContainText('Не удалось прочитать настройки');
  await page.evaluate(() => sessionStorage.setItem('allow-read', 'yes'));
  await page.getByRole('button', { name: 'Повторить сохранение', exact: true }).click();
  await expect.poll(() => page.evaluate(() => sessionStorage.getItem('retry-read-pending'))).toBe('yes');
  await page.getByLabel('Число людей', { exact: true }).fill('5');
  await page.evaluate(() => window.dispatchEvent(new Event('release-retry-read')));
  await expect(page.getByRole('status')).toHaveText('Сохранено на этом устройстве');
  await expect(page.getByLabel('Число людей', { exact: true })).toHaveValue('5');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('mealplan:guest:draft:v1')!).draft.people)).toBe('5');
  expect(await page.evaluate(() => localStorage.getItem('sentinel'))).toBe('keep');
  expect(await page.evaluate(() => localStorage.getItem('mealplan:pantry'))).toBe('pantry');
});
