import { expect, test } from '@playwright/test';
import { savedMenuText } from './plan-fixtures';

for (const width of [360, 768, 1280]) test(`real no-fish one-day wizard saves and reloads its reviewed plan at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  await page.goto('/plan/new');
  await page.getByLabel('Число дней', { exact: true }).fill('1');
  for (const step of [2, 3, 4]) {
    await page.getByRole('button', { name: 'Далее', exact: true }).click();
    await expect(page.getByText(`Шаг ${step} из 4`)).toBeVisible();
    if (step === 3) await page.getByRole('checkbox', { name: 'Без рыбы', exact: true }).check();
    if (step < 4) await page.waitForTimeout(270);
  }
  await page.getByRole('button', { name: 'Составить меню', exact: true }).click();
  await expect(page).toHaveURL(/\/menu$/);
  await expect(page.getByText('Меню сохранено на этом устройстве', { exact: true })).toBeVisible();
  await expect(page.locator('[data-date]')).toHaveCount(1);
  await expect(page.locator('[data-instance-id]')).toHaveCount(4);
  const raw = await page.evaluate(async () => {
    const adapterPath = '/src/adapters/activePlan.ts';
    const { createActivePlanAdapter, ACTIVE_PLAN_KEY } = await import(adapterPath);
    const loaded = await createActivePlanAdapter().load();
    if (loaded.status !== 'loaded') throw new Error('Real trusted plan must reload');
    const { plan, projections } = loaded.bundle;
    if (plan.inputs.appliedSettings.restrictions.join(',') !== 'no-fish') throw new Error('Restriction lost');
    if (!projections[0].budget.check.accepted) throw new Error('Budget not enforced');
    for (const instance of plan.variants[0].instances) {
      if (instance.recipeSnapshot.cookingMinutes > 30) throw new Error('Time limit lost');
      for (const ingredient of instance.recipeSnapshot.ingredients) {
        const food = plan.inputs.catalog.foods.find((row: { profileId: string }) => row.profileId === ingredient.profileId);
        if (food.safety.status !== 'known' || !food.safety.facts.some((fact: { kind: string; key: string; suitable: boolean }) => fact.kind === 'restriction' && fact.key === 'no-fish' && fact.suitable)) throw new Error('Missing reviewed no-fish fact');
        if (food.safety.facts.some((fact: { kind: string }) => fact.kind === 'allergen')) throw new Error('Unexpected allergen guarantee');
      }
    }
    return localStorage.getItem(ACTIVE_PLAN_KEY);
  });
  expect(raw).not.toBeNull();
  const menu = await savedMenuText(page);
  await page.reload();
  await expect.poll(() => savedMenuText(page)).toBe(menu);
  expect(await page.evaluate(() => localStorage.getItem('mealplan:guest:active-plan:v1'))).toBe(raw);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
