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
  expect(next).not.toBe(old);
  const saved = JSON.parse(next!).plan;
  expect(saved.variants).toHaveLength(intent === 'append' ? 4 : 3);
  if (intent === 'select') expect(saved.activeVariantId).not.toBe(oldId);
  expect(await page.evaluate(() => localStorage.getItem('mealplan:guest:draft:v1'))).toBe(draft);
  await page.reload();
  await expect(page.locator('[data-plan-id]')).toHaveAttribute('data-plan-id', saved.activeVariantId);
  expect(await page.evaluate(key => localStorage.getItem(key), activeKey)).toBe(next);
});
