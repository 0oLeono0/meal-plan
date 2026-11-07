import { expect, test, type Locator, type Page } from '@playwright/test';
import { mountAppFixture } from './fixtures';
import { generateRealPlan, openSyntheticPlan } from './plan-fixtures';

const widths = [360, 390, 430, 768, 1199, 1200, 1280];

async function fits(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(await page.evaluate(() => innerWidth));
  for (const root of await page.locator('html, body, .app-shell, main').all()) {
    expect(await root.evaluate(element => getComputedStyle(element).overflowX)).not.toMatch(/hidden|clip/);
  }
}

async function keyboardVisible(page: Page, control: Locator) {
  await control.focus();
  await control.scrollIntoViewIfNeeded();
  await focusedVisible(page, control);
}

async function focusedVisible(page: Page, control: Locator) {
  await expect(control).toBeFocused();
  const bounds = (await control.boundingBox())!;
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(await page.evaluate(() => innerWidth) + 1);
  expect(bounds.y).toBeGreaterThanOrEqual(0);
  const nav = page.getByRole('navigation');
  const bottom = await nav.count() && !await control.evaluate(element => Boolean(element.closest('nav'))) && await page.evaluate(() => innerWidth < 1200)
    ? (await nav.boundingBox())!.y : await page.evaluate(() => innerHeight);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(bottom + 1);
}

async function disclosure(page: Page, summary: Locator) {
  await keyboardVisible(page, summary);
  // Firefox preserves pointer modality after focus(). Enter alone does not
  // imply :focus-visible; reach the disclosure with a real Tab before checking.
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  await focusedVisible(page, summary);
  expect((await summary.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await page.keyboard.press('Enter');
  await expect(summary.locator('..')).toHaveAttribute('open', '');
  await expect(summary).toHaveCSS('outline-style', 'solid');
  await fits(page);
}

async function lastContentClear(page: Page, content: Locator) {
  // Playwright WebKit uses the native mac command for End even on Windows.
  // The installed port ignores Control+End; actual scroll metrics prove End.
  const endKey = page.context().browser()!.browserType().name() === 'webkit' ? 'End' : 'Control+End';
  await page.keyboard.press(endKey);
  const nav = page.getByRole('navigation');
  // Native keyboard scrolling can settle after the key event has returned.
  await expect.poll(async () => {
    const box = (await content.boundingBox())!;
    const bottom = await page.evaluate(() => innerWidth < 1200) ? (await nav.boundingBox())!.y : await page.evaluate(() => innerHeight);
    return box.y + box.height - bottom;
  }).toBeLessThanOrEqual(1);
  const last = (await content.boundingBox())!;
  expect(last.y + last.height).toBeGreaterThan(0);
}

for (const width of widths) {
  test(`phase02 ${width}px real 28 slots menu shopping return and exact navigation boundary`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 800 });
    await generateRealPlan(page);
    const saved = await page.evaluate(() => localStorage.getItem('mealplan:guest:active-plan:v1'));
    await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
    // Phase03 defaults to the actual selected day below the independent1280 menu boundary.
    if (width < 1280) await page.getByRole('button', { name: 'Вся неделя', exact: true }).click();
    await expect(page.locator('[data-instance-id]')).toHaveCount(28);
    const first = page.locator('[data-instance-id]').first(), last = page.locator('[data-instance-id]').last();
    await expect(first.getByRole('heading', { name: 'Завтрак' })).toBeVisible();
    await expect(last.getByRole('heading', { name: 'Перекус' })).toBeVisible();
    await last.locator('p').last().scrollIntoViewIfNeeded();
    const nav = page.getByRole('navigation');
    const navBounds = (await nav.boundingBox())!;
    if (width < 1200) expect((await last.locator('p').last().boundingBox())!.y + (await last.locator('p').last().boundingBox())!.height).toBeLessThanOrEqual(navBounds.y);
    else expect(navBounds.x).toBe(0);
    expect(await nav.evaluate(element => getComputedStyle(element).gap)).toBe('8px');
    for (const control of await nav.locator('a,button').all()) {
      const bounds = (await control.boundingBox())!;
      expect(bounds.width).toBeGreaterThanOrEqual(44); expect(bounds.height).toBeGreaterThanOrEqual(44);
    }
    await fits(page);
    await disclosure(page, page.getByText('КБЖУ семьи за день', { exact: true }).last());
    const shopping = page.getByRole('link', { name: /^Список покупок ·/ });
    await keyboardVisible(page, shopping);
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: 'Список покупок' })).toBeFocused();
    await disclosure(page, page.locator('[data-product-id] summary').first());
    await expect(page.locator('[data-product-id] details[open] li').first()).toContainText(/\d{1,2} .*·.*·/);
    await disclosure(page, page.getByText(/^Уже есть дома ·/));
    await lastContentClear(page, page.locator('[data-plan-id] > details').last().locator('p').last());
    await expect(page.getByRole('navigation').getByRole('link', { name: 'Покупки' })).toHaveAttribute('aria-current', 'page');
    await fits(page);
    await page.screenshot({ path: `.tmp/phase02-qa/${info.project.name}-${width}-shopping.png` });
    await keyboardVisible(page, page.getByRole('link', { name: 'К меню', exact: true }));
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: 'Меню на неделю' })).toBeFocused();
    expect(await page.evaluate(() => localStorage.getItem('mealplan:guest:active-plan:v1'))).toBe(saved);
    await page.reload();
    await expect(page.locator('[data-instance-id]')).toHaveCount(28);
    await page.screenshot({ path: `.tmp/phase02-qa/${info.project.name}-${width}-menu.png` });
  });

  test(`phase02 ${width}px long names URLs large sums and all covered stock at 200 percent text`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 800 });
    await openSyntheticPlan(page, { many: true, long: true });
    await page.evaluate(() => document.documentElement.style.fontSize = '200%');
    await expect(page.locator('[data-instance-id]')).toHaveCount(4);
    await expect(page.locator('[data-instance-id]').last()).toContainText('<img src=x onerror=alert(1)>');
    await expect(page.locator('img')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: /^Покупки:/ })).toContainText(/\d.*₽/);
    await disclosure(page, page.getByText('Источники расчёта', { exact: true }));
    await expect(page.getByText(/^https:\/\/example.org\/synthetic\?record=/).first()).toBeVisible();
    await fits(page);
    await page.getByRole('link', { name: /^Список покупок ·/ }).click();
    await expect(page.getByRole('heading', { name: 'Список покупок' })).toBeFocused();
    await expect(page.locator('[data-product-id]')).toHaveCount(6);
    await disclosure(page, page.locator('[data-product-id] summary').last());
    await expect(page.locator('[data-product-id] details[open] li')).toHaveCount(4);
    await disclosure(page, page.getByText(/^Уже есть дома ·/));
    await expect(page.locator('details[open]').last().locator('li')).toHaveCount(6);
    await lastContentClear(page, page.locator('details[open]').last().locator('li').last());
    await fits(page);
    await page.screenshot({ path: `.tmp/phase02-qa/${info.project.name}-${width}-long-text200.png` });
    await openSyntheticPlan(page, { stock: 'all' }, '/shopping');
    await page.evaluate(() => document.documentElement.style.fontSize = '200%');
    await expect(page.getByRole('heading', { name: 'Всё необходимое уже есть дома' })).toBeVisible();
    await expect(page.locator('[data-product-id]')).toHaveCount(0);
    await disclosure(page, page.getByText(/^Уже есть дома ·/));
    await expect(page.locator('details[open] li')).toContainText(['500 г']);
    await lastContentClear(page, page.locator('details[open] li').last());
    await fits(page);
  });

  test(`phase02 ${width}px pending cancellation preserves keyboard recovery`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await mountAppFixture(page, { draft: { step: 4, days: '1' }, operation: 'pending' });
    const submit = page.getByRole('button', { name: 'Составить меню', exact: true });
    await submit.focus(); await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: 'Составляем меню' })).toBeFocused();
    await expect(page.getByRole('navigation')).toHaveCount(0);
    await expect(page.getByRole('status').filter({ hasText: 'Подбираю блюда…' })).toHaveCount(1);
    const cancel = page.getByRole('button', { name: 'Отмена', exact: true });
    await keyboardVisible(page, cancel);
    expect(await cancel.evaluate(element => getComputedStyle(element).transitionDuration)).toBe('0s');
    await fits(page);
    await page.keyboard.press('Enter');
    await expect(submit).toBeFocused();
    await page.evaluate(() => window.dispatchEvent(new Event('release-generation')));
    await expect(page.getByText('Шаг 4 из 4')).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('mealplan:guest:active-plan:v1'))).toBeNull();
  });

  test(`phase02 ${width}px generation error and retry preserve keyboard recovery`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await mountAppFixture(page, { draft: { step: 4, days: '1' }, operation: 'failure' });
    await page.getByRole('button', { name: 'Составить меню', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Не получилось составить меню' })).toBeFocused();
    await expect(page.getByRole('alert')).toHaveCount(1);
    await keyboardVisible(page, page.getByRole('button', { name: 'Повторить', exact: true }));
    expect((await page.getByRole('button', { name: 'Повторить', exact: true }).boundingBox())!.height).toBeGreaterThanOrEqual(48);
    await fits(page);
    await page.evaluate(() => sessionStorage.setItem('allow-generation', 'yes'));
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL('/menu');
  });

  test(`phase02 ${width}px save failure and retry preserve old active and keyboard recovery`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await generateRealPlan(page, 1);
    const previous = await page.evaluate(() => localStorage.getItem('mealplan:guest:active-plan:v1'));
    await mountAppFixture(page, { draft: { step: 4, days: '2' }, operation: 'save-failure' });
    await page.getByRole('button', { name: 'Составить меню', exact: true }).click();
    await page.getByRole('dialog', { name: 'Составить меню с новыми настройками?' }).getByRole('button', { name: 'Составить меню', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Меню рассчитано, но не сохранено' })).toBeFocused();
    expect(await page.evaluate(() => localStorage.getItem('mealplan:guest:active-plan:v1'))).toBe(previous);
    await expect(page.getByRole('navigation')).toHaveCount(0);
    await keyboardVisible(page, page.getByRole('button', { name: 'Повторить сохранение', exact: true }));
    await fits(page);
    const searches = await page.evaluate(() => sessionStorage.getItem('fixture-search-count'));
    await page.evaluate(() => sessionStorage.setItem('allow-plan-write', 'yes'));
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL('/menu');
    expect(await page.evaluate(() => sessionStorage.getItem('fixture-search-count'))).toBe(searches);
  });
}

for (const width of [768, 1280]) test(`phase02 ${width}px CSS 200 percent zoom and short height keep last content reachable`, async ({ page }) => {
  await page.setViewportSize({ width, height: 500 });
  await openSyntheticPlan(page, { many: true }, '/shopping');
  await page.evaluate(() => document.documentElement.style.zoom = '2');
  await expect(page.locator('html')).toHaveCSS('zoom', '2');
  await disclosure(page, page.getByText(/^Уже есть дома ·/));
  await fits(page);
  await page.goto('/plan/new');
  await page.setViewportSize({ width: 390, height: 400 });
  await expect(page.getByRole('navigation')).toHaveCount(0);
  await expect(page.locator('.sticky-actions')).toHaveCSS('position', 'static');
  await keyboardVisible(page, page.getByRole('button', { name: 'Далее', exact: true }));
  await page.keyboard.press('Enter');
  await expect(page.getByRole('progressbar', { name: 'Настройка меню' })).toHaveAttribute('aria-valuenow', '2');
});

test('phase02 active pending and load error retry use honest recoverable screens', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 400 });
  await mountAppFixture(page, { activeRead: 'pending', route: '/shopping' });
  await expect(page.getByRole('status')).toHaveText('Загружаем покупки…');
  await expect(page.getByRole('heading', { name: 'Сначала составьте меню' })).toHaveCount(0);
  await page.evaluate(() => window.dispatchEvent(new Event('release-active-read')));
  await expect(page.getByRole('heading', { name: 'Сначала составьте меню' })).toBeFocused();
  await mountAppFixture(page, { activeRead: 'error', route: '/shopping' });
  await expect(page.getByRole('heading', { name: 'Не удалось загрузить покупки' })).toBeFocused();
  await keyboardVisible(page, page.getByRole('button', { name: 'Повторить загрузку' }));
  await page.evaluate(() => sessionStorage.setItem('allow-active-read', 'yes'));
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Сначала составьте меню' })).toBeFocused();
  await fits(page);
});

test('phase02 sequential Tab ShiftTab Space and Enter traverse saved screens and navigation', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  const tab = async (control: Locator, backwards = false) => {
    await page.keyboard.press(backwards ? 'Shift+Tab' : 'Tab');
    await focusedVisible(page, control);
    expect(await control.evaluate(element => getComputedStyle(element).outlineStyle)).not.toBe('none');
  };
  await generateRealPlan(page);
  const nav = page.getByRole('navigation');
  await tab(nav.getByRole('button', { name: 'Профиль', exact: true }), true);
  for (const label of ['Дома', 'Покупки', 'Меню']) await tab(nav.getByRole('link', { name: label, exact: true }), true);
  await tab(page.getByRole('link', { name: 'Новое меню', exact: true }), true);
  await tab(page.getByRole('link', { name: 'MealPlan', exact: true }), true);
  await tab(page.getByRole('link', { name: 'К содержимому', exact: true }), true);
  await tab(page.getByRole('link', { name: 'MealPlan', exact: true }));
  await tab(page.getByRole('link', { name: 'Новое меню', exact: true }));
  for (const label of ['Меню', 'Покупки', 'Дома']) await tab(nav.getByRole('link', { name: label, exact: true }));
  await tab(nav.getByRole('button', { name: 'Профиль', exact: true }));
  for (const control of await page.getByRole('region', { name: 'Варианты меню' }).locator('button:enabled:visible, summary:visible').all()) await tab(control);
  const sources = page.getByText('Источники расчёта', { exact: true });
  await tab(sources);
  await page.keyboard.press('Space');
  await expect(sources.locator('..')).toHaveAttribute('open', '');
  await page.keyboard.press('Space');
  await expect(sources.locator('..')).not.toHaveAttribute('open');
  const shopping = page.getByRole('link', { name: /^Список покупок ·/ });
  for (const mode of await page.getByRole('group', { name: 'Вид меню' }).getByRole('button').all()) await tab(mode);
  await tab(page.getByRole('tab', { selected: true }));
  const panel = page.getByRole('tabpanel');
  await page.keyboard.press('Tab');
  await expect(panel).toBeFocused();
  // A day panel is taller than the viewport; its labelled start must be visible,
  // then actual Tab traverses each fully visible card rather than clipping the panel.
  expect((await panel.locator('.menu-day-title').boundingBox())!.y).toBeGreaterThanOrEqual(0);
  for (const card of await page.getByRole('tabpanel').locator('.meal-card-link').all()) await tab(card);
  const daySummary = page.getByRole('tabpanel').getByText('КБЖУ семьи за день', { exact: true });
  await tab(daySummary);
  await tab(shopping); await tab(daySummary, true); await tab(shopping);
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Список покупок' })).toBeFocused();
  await tab(page.getByRole('link', { name: 'К меню', exact: true }));
  await tab(sources);
  const rows = await page.locator('[data-product-id] summary').all();
  expect(rows.length).toBeGreaterThan(1);
  for (const row of rows) await tab(row);
  const covered = page.getByText(/^Уже есть дома ·/);
  await tab(covered); await page.keyboard.press('Space');
  await expect(covered.locator('..')).toHaveAttribute('open', '');
  await page.keyboard.press('Space');
  await expect(covered.locator('..')).not.toHaveAttribute('open');
  await tab(rows[rows.length - 1], true); await tab(covered);
});

test('phase02 sequential Tab ShiftTab and Enter traverse generation recovery', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  const tab = async (control: Locator, backwards = false) => {
    await page.keyboard.press(backwards ? 'Shift+Tab' : 'Tab');
    await focusedVisible(page, control);
    expect(await control.evaluate(element => getComputedStyle(element).outlineStyle)).not.toBe('none');
  };
  const submitByTab = async (mode: 'pending' | 'failure' | 'save-failure') => {
    await mountAppFixture(page, { draft: { step: 4, days: '1' }, operation: mode });
    await expect(page.getByRole('heading', { name: 'Продукты дома', exact: true })).toBeFocused();
    await tab(page.getByRole('combobox', { name: 'Найти продукт' }));
    for (const popular of await page.getByRole('group', { name: 'Популярные продукты' }).getByRole('button').all()) await tab(popular);
    await tab(page.getByRole('button', { name: 'Пропустить', exact: true }));
    await tab(page.getByRole('button', { name: 'Назад', exact: true }));
    await tab(page.getByRole('button', { name: 'Составить меню', exact: true }));
    await page.keyboard.press('Enter');
  };
  await submitByTab('pending');
  await expect(page.getByRole('heading', { name: 'Составляем меню' })).toBeFocused();
  await tab(page.getByRole('button', { name: 'Отмена', exact: true }));
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Составить меню', exact: true })).toBeFocused();
  await submitByTab('failure');
  await expect(page.getByRole('heading', { name: 'Не получилось составить меню' })).toBeFocused();
  const retry = page.getByRole('button', { name: 'Повторить', exact: true });
  await tab(retry);
  await tab(page.getByRole('button', { name: 'Изменить настройки', exact: true }));
  await tab(retry, true);
  await page.evaluate(() => sessionStorage.setItem('allow-generation', 'yes'));
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL('/menu');
  await submitByTab('save-failure');
  await expect(page.getByRole('heading', { name: 'Меню рассчитано, но не сохранено' })).toBeFocused();
  const retrySave = page.getByRole('button', { name: 'Повторить сохранение', exact: true });
  await tab(retrySave);
  await tab(page.getByRole('link', { name: 'К текущему меню', exact: true }));
  await tab(retrySave, true);
  await page.evaluate(() => sessionStorage.setItem('allow-plan-write', 'yes'));
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Меню на 1 день', exact: true })).toBeFocused();
  await fits(page);
});
