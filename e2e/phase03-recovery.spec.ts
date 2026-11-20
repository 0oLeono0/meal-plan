import { test, expect } from '@playwright/test';
import { activeKey, count, mountGeneration, preserved, release } from './generation-fixtures';
import { generateRealPlan } from './plan-fixtures';

test('cancel returns keyboard focus to the launch control and rejects a late success', async ({ page }) => {
  await mountGeneration(page, { draft: { step: 4, days: '1' }, deferGeneration: true });
  const submit = page.getByRole('button', { name: 'Составить меню', exact: true });
  // Actual keyboard traversal from the wizard title, including pantry controls.
  for (let n = 0; n < 30 && !await submit.evaluate(node => node === document.activeElement); n++) await page.keyboard.press('Tab');
  await expect(submit).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Составляем меню' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Отмена', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(submit).toBeFocused();
  await release(page, 'generation-1');
  await expect(page).toHaveURL('/plan/new');
  expect(await page.evaluate(key => localStorage.getItem(key), activeKey)).toBeNull();
  expect(await count(page, 'save-calls')).toBe(0);
});

for (const intent of ['select', 'append', 'replace'] as const) test(`real ${intent} quota failure retains saved bytes and retry saves the same candidate`, async ({ page }) => {
  test.setTimeout(70_000);
  await generateRealPlan(page, 1);
  if (intent === 'replace') {
    await page.getByRole('button', { name: 'Следующий вариант', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Вариант 2 из 3', exact: true })).toBeVisible();
  }
  const old = await page.evaluate(key => localStorage.getItem(key), activeKey);
  const draft = await page.evaluate(() => localStorage.getItem('mealplan:guest:draft:v1'));
  await mountGeneration(page, { route: '/menu', failWrite: true, deferSave: true });
  const oldId = await page.locator('[data-plan-id]').getAttribute('data-plan-id');
  if (intent === 'select') await page.getByRole('button', { name: 'Следующий вариант', exact: true }).click();
  else if (intent === 'append') await page.getByRole('button', { name: 'Пересобрать', exact: true }).click();
  else {
    await page.getByText('Действия с меню', { exact: true }).click();
    await page.getByRole('button', { name: 'Составить заново', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Создать новый набор', exact: true }).click();
  }
  await expect.poll(() => count(page, 'save-calls')).toBe(1);
  await preserved(page, old);
  await expect(page.locator('[data-plan-id]')).toHaveAttribute('data-plan-id', oldId!);
  await release(page, 'save-1');
  const notice = page.getByRole('alert');
  await expect(notice).toContainText(intent === 'select' ? 'Не удалось сохранить выбор варианта' : intent === 'append' ? 'Новый вариант рассчитан, но не сохранён' : 'Новый набор рассчитан, но не сохранён');
  await preserved(page, old);
  const searches = await count(page, 'generation-calls');
  await page.evaluate(() => sessionStorage.setItem('allow-write', 'yes'));
  await notice.getByRole('button', { name: 'Повторить сохранение' }).dblclick();
  await expect.poll(() => count(page, 'save-calls')).toBe(2);
  await preserved(page, old);
  await release(page, 'save-2');
  await expect(page.getByRole('alert')).toHaveCount(0);
  expect(await count(page, 'generation-calls')).toBe(searches);
  expect(await count(page, 'final-writes')).toBe(1);
  const next = await page.evaluate(key => localStorage.getItem(key), activeKey);
  expect(next !== old).toBe(true);
  const saved = JSON.parse(next!).plan;
  expect(saved.variants).toHaveLength(intent === 'append' ? 4 : 3);
  if (intent === 'select') expect(saved.activeVariantId).not.toBe(oldId);
  expect(await page.evaluate(() => localStorage.getItem('mealplan:guest:draft:v1'))).toBe(draft);
  await page.reload();
  await expect(page.locator('[data-plan-id]')).toHaveAttribute('data-plan-id', saved.activeVariantId);
  expect(await page.evaluate(key => localStorage.getItem(key), activeKey)).toBe(next);
});

test('pending select announces the requested row while the saved selection remains active', async ({ page }) => {
  await generateRealPlan(page, 1);
  const raw = await page.evaluate(key => localStorage.getItem(key), activeKey);
  await mountGeneration(page, { route: '/menu', deferSave: true });
  const choices = page.getByRole('region', { name: 'Варианты меню' }).getByRole('listitem');
  await choices.nth(1).getByRole('button').click();
  await expect(choices.nth(1).getByRole('status')).toHaveText('Сохраняем выбор… Предыдущее меню остаётся активным');
  await expect(choices.nth(0).getByRole('button')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('status').filter({ hasText: 'Сохраняем выбор…' })).toHaveCount(1);
  await page.getByRole('button', { name: 'Отмена', exact: true }).click();
  await release(page, 'save-1');
  await expect.poll(() => page.evaluate(() => sessionStorage.getItem('save-result-1'))).toBe('cancelled');
  await preserved(page, raw);
  await expect(choices.nth(0).getByRole('button')).toHaveAttribute('aria-pressed', 'true');
});

for (const action of ['cancel', 'navigate'] as const) test(`inline append ${action} rejects late success without writing or redirecting`, async ({ page }) => {
  await generateRealPlan(page, 1);
  const old = await page.evaluate(key => localStorage.getItem(key), activeKey);
  await mountGeneration(page, { route: '/menu', deferGeneration: true });
  await page.getByRole('button', { name: 'Пересобрать', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Ищем новый вариант…' })).toHaveCount(1);
  if (action === 'cancel') {
    await page.getByRole('button', { name: 'Отменить подбор', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Подбор отменён. Прежнее меню не изменено' })).toHaveCount(1);
  }
  else await page.getByRole('navigation').getByRole('link', { name: 'Покупки', exact: true }).click();
  await release(page, 'generation-1');
  await expect(page).toHaveURL(action === 'cancel' ? '/menu' : '/shopping');
  await preserved(page, old);
  expect(await count(page, 'save-calls')).toBe(0);
});

test('external corrupt bytes block candidate persistence until a valid reload and keep-current never writes', async ({ page }) => {
  await generateRealPlan(page, 1);
  const old = await page.evaluate(key => localStorage.getItem(key), activeKey);
  await mountGeneration(page, { route: '/menu', deferSave: true });
  await page.getByRole('button', { name: 'Следующий вариант', exact: true }).click();
  await expect.poll(() => count(page, 'save-calls')).toBe(1);
  await page.evaluate(key => localStorage.setItem(key, '{external-corrupt'), activeKey);
  await release(page, 'save-1');
  await expect(page.getByRole('alert')).toContainText('Не удалось сохранить выбор варианта');
  await page.getByRole('button', { name: 'Повторить загрузку', exact: true }).click();
  await preserved(page, '{external-corrupt');
  await page.getByRole('button', { name: 'Оставить текущее меню', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  expect(await count(page, 'final-writes')).toBe(0);
  await page.evaluate(({ activeKey, old }) => localStorage.setItem(activeKey, old!), { activeKey, old });
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Вариант 1 из 3', exact: true })).toBeVisible();
});
