import { test, expect } from '@playwright/test';
import { activeKey, count, finishWizard, mountGeneration, preserved, release } from './generation-fixtures';
import { generateRealPlan } from './plan-fixtures';

test('pending rotates every 2s, rejects repeat submit and cancel restores initiator before late success', async ({ page }) => {
  await mountGeneration(page, { deferGeneration: true });
  await page.clock.install();
  await finishWizard(page);
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100));
  await expect(page.getByText('Подбираю блюда…', { exact: true })).toBeVisible();
  // The wizard submit is unavailable while the actual request route is mounted.
  await expect(page.getByRole('button', { name: 'Составить меню', exact: true })).toHaveCount(0);
  expect(await count(page, 'generation-calls')).toBe(1);
  await page.clock.runFor(2000);
  await expect(page.getByText('Считаю бюджет…', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Отмена', exact: true }).click();
  await page.clock.resume();
  await expect(page.getByRole('button', { name: 'Составить меню', exact: true })).toBeFocused();
  await release(page, 'generation-1');
  await expect.poll(() => page.evaluate(() => sessionStorage.getItem('generation-result-1'))).toBe('success');
  await expect(page).toHaveURL(/\/plan\/new$/);
  await preserved(page, null);
  expect(await count(page, 'save-calls')).toBe(0);
});

test('navigate away invalidates request and a newer real success survives an older late response', async ({ page }) => {
  await generateRealPlan(page);
  const old = await page.evaluate(key => localStorage.getItem(key), activeKey);
  await mountGeneration(page, { deferGeneration: true });
  await finishWizard(page);
  await page.goBack();
  await expect(page).toHaveURL(/\/plan\/new$/);
  await preserved(page, old);
  await page.getByRole('button', { name: 'Составить меню', exact: true }).click();
  await expect.poll(() => count(page, 'generation-calls')).toBe(2);
  await release(page, 'generation-2');
  await expect(page).toHaveURL(/\/menu$/);
  const newer = await page.evaluate(key => localStorage.getItem(key), activeKey);
  const id = await page.locator('[data-plan-id]').getAttribute('data-plan-id');
  expect(newer).not.toBe(old);
  await release(page, 'generation-1');
  await expect.poll(() => page.evaluate(() => sessionStorage.getItem('generation-result-1'))).toBe('success');
  await preserved(page, newer);
  await expect(page.locator('[data-plan-id]')).toHaveAttribute('data-plan-id', id!);
  await page.getByRole('link', { name: 'Покупки', exact: true }).first().click();
  await page.reload();
  await expect(page.locator('[data-plan-id]')).toHaveAttribute('data-plan-id', id!);
});

test('quick-start pending rejects a double click and cancellation restores quick-start focus', async ({ page }) => {
  await mountGeneration(page, { deferGeneration: true, route: '/' });
  await page.getByRole('button', { name: 'Меню за 1 клик', exact: true }).dblclick();
  await expect(page.getByRole('heading', { name: 'Составляем меню', exact: true })).toBeVisible();
  expect(await count(page, 'generation-calls')).toBe(1);
  await page.getByRole('button', { name: 'Отмена', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Меню за 1 клик', exact: true })).toBeFocused();
  await release(page, 'generation-1');
  await expect.poll(() => page.evaluate(() => sessionStorage.getItem('generation-result-1'))).toBe('success');
  await preserved(page, null);
});

for (const kind of ['lower-bound', 'exhaustive-minimum'] as const) for (const complete of [true, false])
  test(`budget ${kind}, complete=${complete}: labels only the supplied complete proof`, async ({ page }) => {
    await mountGeneration(page, { error: { code: 'BUDGET_TOO_LOW', message: 'Synthetic proof UI test', diagnostics: [], budgetEvidence: {
      kind, amount: { numerator: 5000n, denominator: 1n },
      proof: { method: 'synthetic-browser-only', catalogVersion: 'synthetic', evaluatedCandidates: 1, complete },
    } } });
    await finishWizard(page);
    const proof = page.getByText(kind === 'lower-bound' ? /Даже нижняя оценка покупок/ : /Минимум по доступному каталогу/);
    if (complete) await expect(proof).toContainText('5 000');
    else await expect(proof).toHaveCount(0);
    await page.getByRole('button', { name: 'Изменить бюджет', exact: true }).click();
    await expect(page.getByText('Шаг 2 из 4')).toBeVisible();
  });

test('30s timeout is precise, distinct from search, ignores late result and retry preserves settings', async ({ page }) => {
  await mountGeneration(page, { deferGeneration: true });
  await page.clock.install();
  await page.getByLabel('Число дней', { exact: true }).fill('2');
  await finishWizard(page);
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100));
  await page.clock.fastForward(29_000);
  await expect(page.getByRole('heading', { name: 'Составляем меню', exact: true })).toBeVisible();
  await page.clock.fastForward(1000);
  await expect(page.getByRole('alert')).toContainText('больше 30 секунд');
  await expect(page.getByRole('alert')).not.toContainText('Это не доказывает');
  await page.clock.resume();
  await release(page, 'generation-1');
  await expect.poll(() => page.evaluate(() => sessionStorage.getItem('generation-result-1'))).toBe('success');
  await preserved(page, null);
  await page.getByRole('button', { name: 'Повторить', exact: true }).click();
  await expect.poll(() => count(page, 'generation-calls')).toBe(2);
  await release(page, 'generation-2');
  await expect(page.locator('[data-date]')).toHaveCount(2);
  await page.reload();
  await expect(page.locator('[data-date]')).toHaveCount(2);
});

for (const [code, copy] of [
  ['GENERATION_DATA_INCOMPLETE', 'Не подтверждены данные'],
  ['NO_RECIPES', 'Мы не будем снимать их автоматически'],
  ['SEARCH_EXHAUSTED', 'Это не доказывает'],
  ['FAILED', 'Повторите подбор'],
] as const) test(`${code}: one truthful alert, focus, unchanged old bytes and real retry`, async ({ page }) => {
  await generateRealPlan(page);
  const old = await page.evaluate(key => localStorage.getItem(key), activeKey);
  await mountGeneration(page, { error: { code, message: 'Controlled test error', diagnostics: [] } });
  await finishWizard(page);
  await expect(page.getByRole('alert')).toHaveCount(1);
  await expect(page.getByRole('alert')).toContainText(copy);
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
  await expect(page.getByText(/Минимум по доступному каталогу|нижняя оценка/)).toHaveCount(0);
  await preserved(page, old);
  await page.evaluate(() => sessionStorage.setItem('allow-generation', 'yes'));
  await page.getByRole('button', { name: 'Повторить', exact: true }).click();
  await expect(page).toHaveURL(/\/menu$/);
  expect(await count(page, 'generation-calls')).toBe(2);
});

test('budget refusal without proof never claims a minimum and opens preserved step 2', async ({ page }) => {
  await mountGeneration(page, { error: { code: 'BUDGET_TOO_LOW', message: 'Controlled budget', diagnostics: [] } });
  await finishWizard(page);
  await expect(page.getByRole('alert')).not.toContainText('Минимум');
  await page.getByRole('button', { name: 'Изменить бюджет', exact: true }).click();
  await expect(page.getByText('Шаг 2 из 4')).toBeVisible();
  await expect(page.locator('#budget')).toHaveValue('3000');
});

test('deep generation reload cannot resurrect a pending request or mutate the old saved plan', async ({ page }) => {
  await generateRealPlan(page);
  const old = await page.evaluate(key => localStorage.getItem(key), activeKey);
  await mountGeneration(page, { deferGeneration: true, route: '/' });
  // Valid old plan redirects welcome, use the real wizard to launch a new request.
  await page.getByRole('link', { name: 'Новое меню', exact: true }).click();
  await finishWizard(page);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Генерация прервана или не запущена' })).toBeVisible();
  await preserved(page, old);
  await page.getByRole('link', { name: 'К текущему меню', exact: true }).click();
  await expect(page.locator('[data-plan-id]')).toBeVisible();
});
