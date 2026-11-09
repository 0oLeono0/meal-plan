import { test, expect, type Page } from '@playwright/test';
import type { SettingsDraft } from '../src/domain/settings';

async function seedDraft(page: Page, patch: Partial<SettingsDraft>) {
  await page.goto('/plan/new');
  await expect(page.getByLabel('Число людей', { exact: true })).toBeVisible();
  await page.evaluate(async patch => {
    const path = '/src/domain/settings.ts';
    const { createDraft } = await import(path);
    localStorage.setItem('mealplan:guest:draft:v1', JSON.stringify({ schemaVersion: 1, draft: { ...createDraft(), ...patch } }));
    localStorage.setItem('mealplan:pantry', 'global-pantry-sentinel');
    localStorage.setItem('sentinel', 'keep');
  }, patch);
  await page.reload();
}
async function appliedRaw(page: Page): Promise<SettingsDraft> {
  return page.evaluate(async () => {
    const path = '/src/adapters/activePlan.ts';
    const { createActivePlanAdapter } = await import(path);
    const loaded = await createActivePlanAdapter().load();
    if (loaded.status !== 'loaded') throw new Error('Expected validated saved active plan');
    return loaded.bundle.plan.inputs.appliedSettings.raw;
  });
}

for (const action of ['Составить меню', 'Пропустить']) {
  test(`cleared optional home unit keeps unknown quantity on ${action} and reload`, async ({ page }) => {
    await seedDraft(page, { step: 4, days: '1' });
    await page.getByRole('group', { name: 'Популярные продукты' }).getByRole('button', { name: 'Рис', exact: true }).click();
    await page.getByLabel('Единица Рис', { exact: true }).selectOption('g');
    await page.getByLabel('Единица Рис', { exact: true }).selectOption('');
    await page.getByLabel('Скоро испортится Рис', { exact: true }).check();
    await expect(page.getByLabel('Количество Рис', { exact: true })).toHaveValue('');
    await page.getByRole('button', { name: action, exact: true }).click();
    await expect(page.getByText('Сохранённые настройки повреждены. Проверьте мастер', { exact: true })).toBeHidden();
    await page.waitForURL('**/menu');
    const raw = await appliedRaw(page);
    expect(raw.home).toEqual([{ productId: 'rice', quantity: '', expiresSoon: true }]);
    const home = await page.evaluate(async () => {
      const path = '/src/adapters/activePlan.ts';
      const { createActivePlanAdapter } = await import(path);
      const loaded = await createActivePlanAdapter().load();
      if (loaded.status !== 'loaded') throw new Error('Expected validated plan');
      return loaded.bundle.plan.inputs.appliedSettings.home;
    });
    expect(home).toEqual([{ productId: 'rice', quantity: { status: 'unknown' }, expiresSoon: true }]);
    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: 'Меню на 1 день', exact: true })).toBeVisible();
    expect(await appliedRaw(page)).toEqual(raw);
  });

  test(`cleared home unit with numeric quantity focuses step four on ${action}`, async ({ page }) => {
    await seedDraft(page, { step: 4, days: '1', home: [{ productId: 'rice', quantity: '100', unit: 'g', expiresSoon: false }] });
    await page.getByLabel('Единица Рис', { exact: true }).selectOption('');
    await page.getByRole('button', { name: action, exact: true }).click();
    await expect(page.getByText('Шаг 4 из 4')).toBeVisible();
    await expect(page.getByLabel('Единица Рис', { exact: true })).toBeFocused();
    await expect(page.getByLabel('Количество Рис', { exact: true })).toHaveValue('100');
    expect(await page.evaluate(() => localStorage.getItem('mealplan:guest:active-plan:v1'))).toBeNull();
  });
}

test('skip retains restrictions exclusions home quantities and global pantry', async ({ page }) => {
  const restrictions = ['vegetarian'], exclusionIds = ['egg'];
  const home = [{ productId: 'rice', quantity: '100', unit: 'g' as const, expiresSoon: true }];
  await seedDraft(page, { step: 3, restrictions, exclusionIds, home });
  await expect(page.getByText('Пропуск сохранит выбранные ограничения и исключения', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Пропустить', exact: true }).click();
  await expect(page.getByText('Шаг 4 из 4')).toBeVisible();
  await expect(page.getByText('Пропуск сохранит добавленные продукты. Запасы не списываются', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Пропустить', exact: true }).click();
  await expect(page).toHaveURL(/\/menu$/);
  const applied = await appliedRaw(page);
  expect(applied.restrictions).toEqual(restrictions);
  expect(applied.exclusionIds).toEqual(exclusionIds);
  expect(applied.home).toEqual(home);
  expect(await page.evaluate(() => localStorage.getItem('mealplan:pantry'))).toBe('global-pantry-sentinel');
  expect(await page.evaluate(() => localStorage.getItem('sentinel'))).toBe('keep');
});

test('skip cannot bypass partial home quantity and focuses the field', async ({ page }) => {
  await seedDraft(page, { step: 4, home: [{ productId: 'rice', quantity: '1,', unit: 'g', expiresSoon: false }] });
  await page.getByRole('button', { name: 'Пропустить', exact: true }).click();
  await expect(page.locator('#quantity-rice')).toBeFocused();
  await expect(page).toHaveURL(/\/plan\/new$/);
  expect(await page.evaluate(() => localStorage.getItem('mealplan:guest:active-plan:v1'))).toBeNull();
});

test('skip checks a partial manual target across all four steps', async ({ page }) => {
  await seedDraft(page, { step: 4, manualNutrition: { calories: '1800', protein: '', fat: '', carbohydrates: '' } });
  await page.getByRole('button', { name: 'Пропустить', exact: true }).click();
  await expect(page.getByText('Шаг 1 из 4')).toBeVisible();
  await expect(page.locator('[aria-invalid="true"]').first()).toBeFocused();
  expect(await page.evaluate(() => localStorage.getItem('mealplan:guest:active-plan:v1'))).toBeNull();
});

test('quick start opens the first invalid step instead of changing raw input', async ({ page }) => {
  await seedDraft(page, { step: 4, people: '0' });
  await page.goto('/');
  await expect(page.getByText('Используем настройки из черновика', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Меню за 1 клик', exact: true }).click();
  await expect(page.getByText('Шаг 1 из 4')).toBeVisible();
  await expect(page.getByLabel('Число людей', { exact: true })).toBeFocused();
  await expect(page.getByLabel('Число людей', { exact: true })).toHaveValue('0');
});

test('editing the next draft leaves current menu and stored active unchanged', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Меню за 1 клик', exact: true }).click();
  await expect(page).toHaveURL(/\/menu$/);
  const active = await page.evaluate(() => localStorage.getItem('mealplan:guest:active-plan:v1'));
  const costs = await page.getByRole('region', { name: 'Бюджет меню' }).innerText();
  await page.getByRole('link', { name: 'Новое меню', exact: true }).click();
  await page.getByLabel('Число людей', { exact: true }).fill('5');
  await expect(page.getByText('Редактируются настройки следующего меню', { exact: true })).toBeVisible();
  await page.goto('/menu');
  await expect(page.getByRole('region', { name: 'Бюджет меню' })).toHaveText(costs, { useInnerText: true });
  expect(await page.evaluate(() => localStorage.getItem('mealplan:guest:active-plan:v1'))).toBe(active);
  expect((await appliedRaw(page)).people).toBe('2');
});

test('quick start prefers last applied settings while preserving the changed draft', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Меню за 1 клик', exact: true }).click();
  await expect(page).toHaveURL(/\/menu$/);
  const originalApplied = await appliedRaw(page);
  await page.getByRole('link', { name: 'Новое меню', exact: true }).click();
  await page.getByLabel('Число людей', { exact: true }).fill('5');
  await expect(page.getByText('Сохранено на этом устройстве', { exact: true })).toBeVisible();
  const changedDraft = await page.evaluate(() => localStorage.getItem('mealplan:guest:draft:v1'));
  // Compatibility presence port exposes welcome without inventing active data.
  await page.evaluate(async () => {
    const urls = performance.getEntriesByType('resource').map(row => row.name);
    const { default: { createElement } } = await import(urls.find(url => /\/react\.js\?/.test(url))!);
    const { default: { createRoot } } = await import(urls.find(url => /\/react-dom_client\.js\?/.test(url))!);
    const path = '/src/app/App.tsx'; const { App } = await import(path);
    document.getElementById('root')?.remove();
    const container = document.createElement('div'); document.body.append(container);
    history.replaceState(null, '', '/');
    createRoot(container).render(createElement(App, { planPresencePort: { load: async () => ({ status: 'absent' }) } }));
  });
  await expect(page.getByText('Используем последние применённые настройки', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Меню за 1 клик', exact: true }).click();
  const replacement = page.getByRole('dialog', { name: 'Составить меню с новыми настройками?', exact: true });
  await expect(replacement).toBeVisible();
  await replacement.getByRole('button', { name: 'Составить меню', exact: true }).click();
  await expect(page).toHaveURL(/\/menu$/);
  expect(await appliedRaw(page)).toEqual(originalApplied);
  expect(await page.evaluate(() => localStorage.getItem('mealplan:guest:draft:v1'))).toBe(changedDraft);
});
