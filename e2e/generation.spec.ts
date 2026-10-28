import { test, expect } from '@playwright/test';

test('real catalog wizard saves every dated slot and reloads the same active menu', async ({ page }) => {
  await page.goto('/plan/new');
  for (let step = 2; step <= 4; step++) {
    await page.getByRole('button', { name: 'Далее', exact: true }).click();
    await expect(page.getByText(`Шаг ${step} из 4`)).toBeVisible();
    if (step < 4) await page.waitForTimeout(270);
  }
  await expect(page.getByRole('button', { name: 'Составить меню', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Составить меню', exact: true }).click();
  await expect(page).toHaveURL(/\/menu$/);
  await expect(page.getByRole('heading', { name: 'Меню на неделю', exact: true })).toBeVisible();
  await expect(page.locator('[data-date]')).toHaveCount(7);
  await expect(page.locator('[data-instance-id]')).toHaveCount(28);
  for (const slot of ['Завтрак', 'Обед', 'Ужин', 'Перекус']) await expect(page.getByRole('heading', { name: slot, exact: true })).toHaveCount(7);
  await expect(page.getByText('Ручная цель КБЖУ не задана', { exact: true })).toBeVisible();
  await expect(page.getByText('Меню сохранено на этом устройстве', { exact: true })).toBeVisible();
  const calculated = await page.evaluate(async () => {
    const activePath = '/src/adapters/activePlan.ts', presentationPath = '/src/domain/presentation.ts';
    const { createActivePlanAdapter } = await import(activePath);
    const { selectPlanPresentation } = await import(presentationPath);
    const result = await createActivePlanAdapter().load();
    if (result.status !== 'loaded') throw new Error('Expected a validated whole active bundle');
    const projection = result.bundle.projections.find((item: { variantId: string }) => item.variantId === result.bundle.plan.activeVariantId);
    const view = selectPlanPresentation(projection, result.bundle.plan.inputs.appliedSettings.target);
    return { costs: view.costs, nutrition: view.averagePersonDayNutrition, dates: result.bundle.plan.inputs.dates };
  });
  await expect(page.getByRole('region', { name: 'Бюджет меню' }).getByRole('heading')).toHaveText(`Покупки: ≈ ${calculated.costs.purchase} / ${calculated.costs.limit}`);
  expect(await page.locator('[data-date]').evaluateAll(rows => rows.map(row => row.getAttribute('data-date')))).toEqual(calculated.dates);
  await expect(page.getByRole('region', { name: 'Бюджет меню' }).locator('dd')).toHaveText([calculated.costs.ingredient, calculated.costs.covered, calculated.costs.purchase]);
  const average = page.getByRole('heading', { name: 'Среднее на человека в день', exact: true }).locator('..');
  await expect(average).toContainText(`${calculated.nutrition.calories} ккал`);
  for (const value of [calculated.nutrition.protein, calculated.nutrition.fat, calculated.nutrition.carbohydrates]) await expect(average).toContainText(`${value} г`);
  const values = await page.locator('[data-plan-id]').innerText();
  const id = await page.locator('[data-plan-id]').getAttribute('data-plan-id');
  const storage = await page.evaluate(() => ({ ...localStorage }));
  expect(Object.keys(storage).some(key => key.includes('active'))).toBe(true);
  await page.reload();
  await expect(page.locator('[data-plan-id]')).toHaveAttribute('data-plan-id', id!);
  await expect(page.locator('[data-plan-id]')).toHaveText(values, { useInnerText: true });
  expect(await page.evaluate(() => ({ ...localStorage }))).toEqual(storage);
  await page.goto('/');
  await expect(page).toHaveURL(/\/menu$/);
});

export async function mountOperation(page: import('@playwright/test').Page, mode: 'pending' | 'failure' | 'save-failure' | 'budget' | 'missing-data' | 'search' | 'no-recipes' = 'pending') {
  await page.goto('/plan/new');
  await expect(page.getByLabel('Число людей', { exact: true })).toBeVisible();
  await page.evaluate(async mode => {
    const urls = performance.getEntriesByType('resource').map(row => row.name);
    const reactUrl = urls.find(url => /\/react\.js\?/.test(url))!;
    const rootUrl = urls.find(url => /\/react-dom_client\.js\?/.test(url))!;
    const { default: { createElement } } = await import(reactUrl);
    const { default: { createRoot } } = await import(rootUrl);
    const path = '/src/app/App.tsx', adapterPath = '/src/adapters/activePlan.ts', generationPath = '/src/adapters/generation.ts', catalogPath = '/src/data/catalog.ts';
    const { App } = await import(path);
    const { createActivePlanAdapter } = await import(adapterPath);
    const { createLocalGeneration } = await import(generationPath);
    const { bundledCatalogPort } = await import(catalogPath);
    const actual = createLocalGeneration(bundledCatalogPort);
    const activePlanPort = createActivePlanAdapter(() => ({
      getItem: (key: string) => localStorage.getItem(key),
      setItem: (key: string, value: string) => {
        if (mode === 'save-failure' && !sessionStorage.getItem('allow-plan-write')) throw new Error('quota');
        localStorage.setItem(key, value);
      },
    }));
    const generationPort = { async generate(...args: Parameters<typeof actual.generate>) {
      sessionStorage.setItem('search-count', String(Number(sessionStorage.getItem('search-count') ?? 0) + 1));
      if (mode === 'pending') await new Promise<void>(resolve => window.addEventListener('release-generation', () => resolve(), { once: true }));
      if (mode !== 'pending' && mode !== 'save-failure' && !sessionStorage.getItem('allow-generation')) return { status: 'error', error: {
        code: ({ failure: 'FAILED', budget: 'BUDGET_TOO_LOW', 'missing-data': 'GENERATION_DATA_INCOMPLETE', search: 'SEARCH_EXHAUSTED', 'no-recipes': 'NO_RECIPES' })[mode], message: 'Fixture refusal', diagnostics: [],
      } };
      return actual.generate(...args);
    } };
    document.getElementById('root')?.remove();
    const container = document.createElement('div'); document.body.append(container);
    createRoot(container).render(createElement(App, { generationPort, activePlanPort }));
  }, mode);
  await expect(page.getByLabel('Число людей', { exact: true })).toBeVisible();
}

async function finishWizard(page: import('@playwright/test').Page) {
  for (let step = 2; step <= 4; step++) {
    await page.getByRole('button', { name: 'Далее', exact: true }).click();
    await expect(page.getByText(`Шаг ${step} из 4`)).toBeVisible();
    if (step < 4) await page.waitForTimeout(270);
  }
  await page.getByRole('button', { name: 'Составить меню', exact: true }).click();
}

test('pending rotates honestly, cancellation restores origin and ignores late result', async ({ page }) => {
  await mountOperation(page);
  await finishWizard(page);
  await expect(page.getByText('Подбираю блюда…', { exact: true })).toBeVisible();
  await expect(page.getByText('Считаю бюджет…', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Отмена', exact: true }).click();
  await expect(page).toHaveURL(/\/plan\/new$/);
  await expect(page.getByRole('button', { name: 'Составить меню', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Пропустить', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Составляем меню', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Отмена', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Пропустить', exact: true })).toBeFocused();
  await page.evaluate(() => window.dispatchEvent(new Event('release-generation')));
  await expect(page.getByText('Шаг 4 из 4')).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('mealplan:guest:active-plan:v1'))).toBeNull();
});

test('retry-save commits the existing candidate without rerunning search', async ({ page }) => {
  await mountOperation(page, 'save-failure');
  await finishWizard(page);
  await expect(page.getByRole('heading', { name: 'Меню рассчитано, но не сохранено' })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('mealplan:guest:active-plan:v1'))).toBeNull();
  await page.evaluate(() => sessionStorage.setItem('allow-plan-write', 'yes'));
  await page.getByRole('button', { name: 'Повторить сохранение', exact: true }).click();
  await expect(page).toHaveURL(/\/menu$/);
  expect(await page.evaluate(() => sessionStorage.getItem('search-count'))).toBe('1');
});

test('failure retains input, retry runs a new real operation', async ({ page }) => {
  await mountOperation(page, 'failure');
  await page.getByLabel('Число дней', { exact: true }).fill('2');
  await finishWizard(page);
  await expect(page.getByRole('heading', { name: 'Не получилось составить меню' })).toBeVisible();
  await page.evaluate(() => sessionStorage.setItem('allow-generation', 'yes'));
  await page.getByRole('button', { name: 'Повторить', exact: true }).click();
  await expect(page).toHaveURL(/\/menu$/);
  await expect(page.locator('[data-date]')).toHaveCount(2);
  expect(await page.evaluate(() => sessionStorage.getItem('search-count'))).toBe('2');
});

test('budget action opens step two with preserved limit', async ({ page }) => {
  await mountOperation(page, 'budget');
  await finishWizard(page);
  await page.getByRole('button', { name: 'Изменить бюджет', exact: true }).click();
  await expect(page.getByText('Шаг 2 из 4')).toBeVisible();
  await expect(page.locator('#budget')).toHaveValue('3000');
});

test('save failure preserves the old whole active plan and reloads it', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Меню за 1 клик', exact: true }).click();
  await expect(page).toHaveURL(/\/menu$/);
  const previous = await page.evaluate(() => localStorage.getItem('mealplan:guest:active-plan:v1'));
  const previousId = await page.locator('[data-plan-id]').getAttribute('data-plan-id');
  await mountOperation(page, 'save-failure');
  // The previous draft finished at step1 because it was a quick start.
  await page.getByLabel('Число дней', { exact: true }).fill('2');
  await finishWizard(page);
  await expect(page.getByText('Расчёт доступен только до закрытия страницы. Предыдущее меню не изменено', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('mealplan:guest:active-plan:v1'))).toBe(previous);
  await page.getByRole('link', { name: 'К текущему меню', exact: true }).click();
  await expect(page.locator('[data-plan-id]')).toHaveAttribute('data-plan-id', previousId!);
  await page.reload();
  await expect(page.locator('[data-date]')).toHaveCount(7);
});

test('timeout at thirty seconds preserves draft and offers retry', async ({ page }) => {
  await mountOperation(page);
  await page.clock.install();
  await finishWizard(page);
  await expect(page.getByRole('heading', { name: 'Составляем меню' })).toBeVisible();
  await page.clock.fastForward(30_001);
  await expect(page.getByText('Подбор занял больше 30 секунд. Повторите попытку или измените настройки', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Изменить настройки', exact: true }).click();
  await expect(page.getByText('Шаг 4 из 4')).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('mealplan:guest:active-plan:v1'))).toBeNull();
});

test('corrupt active remains untouched and retry load is explicit', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('mealplan:guest:active-plan:v1', '{invalid saved value'));
  await page.goto('/menu');
  await expect(page.getByRole('heading', { name: 'Сохранённое меню повреждено или несовместимо с текущей версией' })).toBeVisible();
  await page.getByRole('button', { name: 'Повторить загрузку', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Сохранённое меню повреждено или несовместимо с текущей версией' })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('mealplan:guest:active-plan:v1'))).toBe('{invalid saved value');
});

test('deep generation entry never resurrects a request', async ({ page }) => {
  await page.goto('/plan/generating');
  await expect(page.getByRole('heading', { name: 'Генерация прервана или не запущена' })).toBeVisible();
  await page.getByRole('link', { name: 'К настройкам', exact: true }).click();
  await expect(page).toHaveURL(/\/plan\/new$/);
});
