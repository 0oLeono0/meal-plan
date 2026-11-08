import { test, expect } from '@playwright/test';
import { openSyntheticPlan } from './plan-fixtures';
import legacyPlan from '../src/test/fixtures/phase02-active-plan-v1.json' with { type: 'json' };
import { mountGeneration } from './generation-fixtures';

const key = 'mealplan:guest:active-plan:v1';

test('EC-42 actual local recipe hero preserves four-to-three geometry at mobile tablet and desktop', async ({ page }) => {
  await page.goto('/recipe/rice-sweet-porridge');
  await expect(page.getByRole('heading', { name: 'Рисовая каша на воде', exact: true })).toBeVisible();
  const image = page.locator('main figure img');
  await expect.poll(() => image.evaluate(node => (node as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  for (const width of [360, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    const box = (await image.boundingBox())!;
    expect(box.width / box.height).toBeCloseTo(4 / 3, 1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    await image.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `.tmp/phase03-qa/03-11-actual-hero-${width}.png` });
  }
});

test('EC-40 twelve alternatives wrap and native keyboard dialog trap returns its initiator at short height', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 400 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const source = legacyPlan.plan.variants[0];
  const gcd = (a: number, b: number): number => b ? gcd(b, a % b) : a;
  const variants = Array.from({ length: 12 }, (_, i) => ({ ...source, id: `saved-${i}`, instances: source.instances.map(row => ({ ...row,
    id: `saved-${i}/${row.date}/${row.slot}`, selectedServings: { numerator: String((5 + i) / gcd(5 + i, 10)), denominator: String(10 / gcd(5 + i, 10)) },
  })) }));
  const raw = JSON.stringify({ ...legacyPlan, plan: { ...legacyPlan.plan, variants, activeVariantId: variants[0].id } });
  await mountGeneration(page, { route: '/menu', activeRaw: raw });
  const choices = page.getByRole('region', { name: 'Варианты меню' }).getByRole('listitem');
  await expect(choices).toHaveCount(12);
  await expect(page.getByRole('button', { name: 'Пересобрать', exact: true })).toBeDisabled();
  for (const width of [360, 390, 430, 768, 1199, 1200, 1279, 1280]) {
    await page.setViewportSize({ width, height: 400 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    await expect(page.locator('.menu-shopping')).toHaveAttribute('data-in-flow', 'true');
  }
  await page.setViewportSize({ width: 360, height: 400 });
  const create = page.getByRole('button', { name: 'Создать новый набор', exact: true });
  for (let n = 0; n < 60 && !await create.evaluate(node => node === document.activeElement); n++) await page.keyboard.press('Tab');
  await expect(create).toBeFocused();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'Создать новый набор меню?' });
  const cancel = dialog.getByRole('button', { name: 'Оставить варианты', exact: true });
  const confirm = dialog.getByRole('button', { name: 'Создать новый набор', exact: true });
  await expect(cancel).toBeFocused();
  await page.keyboard.press('Shift+Tab'); await expect(confirm).toBeFocused();
  await page.keyboard.press('Tab'); await expect(cancel).toBeFocused();
  await page.keyboard.press('Tab'); await expect(confirm).toBeFocused();
  await page.keyboard.press('Tab'); await expect(cancel).toBeFocused();
  await page.screenshot({ path: '.tmp/phase03-qa/03-11-dialog360.png' });
  await page.keyboard.press('Escape');
  await expect(create).toBeFocused();
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(raw);
  await page.evaluate(() => document.documentElement.style.fontSize = '200%');
  for (const width of [360, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    await choices.last().scrollIntoViewIfNeeded();
    const box = (await choices.last().boundingBox())!;
    expect(box.width).toBeGreaterThan(44);
    await page.screenshot({ path: `.tmp/phase03-qa/03-11-12variants-200text-${width}.png` });
  }
});

test('EC-23/24/28/29 real saved day card opens exact occurrence and returns to its day and focus', async ({ page }) => {
  test.setTimeout(70_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Меню за 1 клик', exact: true }).click();
  await expect(page).toHaveURL(/\/menu$/, { timeout: 32_000 });
  const raw = await page.evaluate(key => localStorage.getItem(key), key);
  const saved = JSON.parse(raw!).plan;
  const variant = saved.variants.find((row: { id: string }) => row.id === saved.activeVariantId);
  const occurrence = variant.instances[variant.instances.length - 1];
  const tab = page.getByRole('tab').last();
  await expect(tab).toBeVisible();
  await tab.click();
  const card = page.locator(`[data-instance-id="${occurrence.id}"]`);
  const link = card.getByRole('link');
  await expect(link).toHaveAccessibleName(new RegExp(occurrence.recipeSnapshot.name));
  await expect(link).toHaveAttribute('href', `/recipe/${occurrence.recipeId}?${new URLSearchParams({ variant: saved.activeVariantId, instance: occurrence.id, view: 'day', day: occurrence.date })}`);
  await expect(card.locator('img')).toHaveAttribute('alt', '');
  await link.click();
  await expect(page).toHaveURL(/\/recipe\//);
  await expect(page.locator('[data-instance-id]')).toHaveAttribute('data-instance-id', occurrence.id);
  await page.getByRole('link', { name: 'К меню', exact: true }).click();
  await expect(page).toHaveURL(`/menu?view=day&day=${occurrence.date}`);
  await expect(link).toBeFocused();
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(raw);
  await link.click();
  await expect(page).toHaveURL(/\/recipe\//);
  await expect(page.locator('[data-instance-id]')).toHaveAttribute('data-instance-id', occurrence.id);
  await page.goBack();
  await expect(link).toBeFocused();
  await page.getByRole('button', { name: 'Следующий вариант', exact: true }).click();
  await expect(page.getByText('Вариант 2 из 3', { exact: true })).toBeVisible();
  await expect(page.getByRole('tab', { selected: true })).toHaveAttribute('data-day', occurrence.date);
  await page.getByRole('button', { name: 'Вся неделя', exact: true }).click();
  for (const width of [360, 390, 430, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.locator('.menu-days').scrollIntoViewIfNeeded();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    await expect(page.locator('.menu-day')).toHaveCount(7);
    const actualImage = (await page.locator('.menu-days img').first().boundingBox())!;
    expect(actualImage.width / actualImage.height).toBeCloseTo(4 / 3, 1);
    if (width === 1280) {
      for (const slot of ['breakfast', 'lunch', 'dinner', 'snack']) {
        const positions = await page.locator(`[data-slot="${slot}"]`).evaluateAll(rows => rows.map(row => row.getBoundingClientRect().y));
        expect(Math.max(...positions) - Math.min(...positions)).toBeLessThanOrEqual(1);
      }
    }
    await page.screenshot({ path: `.tmp/phase03-qa/03-10-${width}-menu.png` });
  }
});

test('EC-27 failed compiled local image keeps four-to-three space and working recipe link', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('**/recipes/**', route => route.abort());
  await page.addInitScript(({ key, raw }) => localStorage.setItem(key, raw), { key, raw: JSON.stringify(legacyPlan) });
  await page.goto('/menu?view=week');
  const card = page.locator('[data-instance-id]').first();
  // With today's date inside the legacy period this earlier day's image is
  // intentionally lazy. Scroll it into the actual viewport to request it.
  await card.scrollIntoViewIfNeeded();
  await expect(card.getByRole('img', { name: 'Фото недоступно' })).toBeVisible();
  const image = (await card.getByRole('img').boundingBox())!;
  expect(image.width / image.height).toBeCloseTo(4 / 3, 1);
  await card.getByRole('link').click();
  await expect(page.locator('[data-instance-id]')).toHaveAttribute('data-instance-id', legacyPlan.plan.variants[0].instances[0].id);
});

test('EC-41 long recipe facts sources and equal hero columns reflow at every required width', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openSyntheticPlan(page, { long: true, many: true, days: 3 });
  await page.locator('[data-instance-id]').first().getByRole('link').click();
  await expect(page).toHaveURL(/\/recipe\//);
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
  await page.getByText('Источники данных', { exact: true }).click();
  for (const width of [360, 390, 430, 768, 1199, 1200, 1279, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    const image = (await page.locator('figure').boundingBox())!;
    const header = (await page.locator('main header').boundingBox())!;
    if (width >= 768) {
      expect(Math.abs(image.width - header.width)).toBeLessThanOrEqual(1);
      expect(header.y).toBeCloseTo(image.y, 0);
      expect(header.x).toBeGreaterThan(image.x);
    } else expect(header.y).toBeGreaterThan(image.y);
    if ([360, 768, 1280].includes(width)) {
      await page.getByRole('heading', { level: 1 }).scrollIntoViewIfNeeded();
      await page.screenshot({ path: `.tmp/phase03-qa/03-11-long-recipe-${width}.png` });
    }
  }
});

test('EC-18/21/25/26/27/30 actual dates slots per-portion facts allocation and responsive grid', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 812 });
  await openSyntheticPlan(page, { days: 3, stock: 'partial' });
  await expect(page.getByRole('tab')).toHaveCount(3);
  await expect(page.locator('[data-instance-id]:visible')).toHaveCount(4);
  const breakfast = page.locator('[data-instance-id="synthetic-2026-10-01-breakfast"]');
  await expect(breakfast.getByText('Использует запасы', { exact: true })).toBeVisible();
  await expect(page.locator('[data-instance-id="synthetic-2026-10-01-lunch"]').getByText('Использует запасы', { exact: true })).toBeVisible();
  await expect(page.locator('[data-instance-id="synthetic-2026-10-01-dinner"]').getByText('Использует запасы', { exact: true })).toHaveCount(0);
  await expect(breakfast).toContainText('10 мин · 250 ккал');
  await expect(breakfast).toContainText('≈ 6,25 ₽ за порцию');
  await expect(breakfast).toContainText('Порций для семьи: 2');
  await expect(breakfast.getByRole('img', { name: 'Фото недоступно' })).toBeVisible();
  await page.getByRole('button', { name: 'Вся неделя', exact: true }).click();
  for (const width of [360, 390, 430, 768, 1199, 1200, 1279, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    const days = page.locator('.menu-day');
    await expect(days).toHaveCount(3);
    const first = (await days.nth(0).boundingBox())!, second = (await days.nth(1).boundingBox())!;
    if (width < 1280) expect(second.y).toBeGreaterThan(first.y + first.height - 1);
    else { expect(second.y).toBe(first.y); expect(second.x).toBeGreaterThan(first.x); }
    const media = (await breakfast.getByRole('img').boundingBox())!;
    expect(media.width / media.height).toBeCloseTo(4 / 3, 1);
    expect((await breakfast.getByRole('link').boundingBox())!.height).toBeGreaterThanOrEqual(44);
  }
  expect(await page.locator('.menu-days [data-instance-id]').evaluateAll(rows => rows.map(row => row.getAttribute('data-instance-id')))).toEqual(
    ['01', '02', '03'].flatMap(day => ['breakfast', 'lunch', 'dinner', 'snack'].map(slot => `synthetic-2026-10-${day}-${slot}`)));
});

test('EC-19/21/23 manual day tabs keep today separate and activate only on Enter or Space', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 812 });
  await openSyntheticPlan(page, { days: 7 });
  await page.clock.setFixedTime(new Date('2026-10-02T12:00:00'));
  await page.evaluate(() => { history.pushState({}, '', '/menu?view=day'); window.dispatchEvent(new PopStateEvent('popstate')); });
  const raw = await page.evaluate(key => localStorage.getItem(key), key);
  const tabs = page.getByRole('tab');
  await expect(tabs.nth(1)).toHaveAttribute('aria-current', 'date');
  await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
  await tabs.nth(1).focus();
  await page.keyboard.press('ArrowRight');
  await expect(tabs.nth(2)).toBeFocused();
  await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('Enter');
  await expect(tabs.nth(2)).toHaveAttribute('aria-selected', 'true');
  await expect(tabs.nth(1)).toHaveAttribute('aria-current', 'date');
  await page.keyboard.press('End');
  await expect(tabs.last()).toBeFocused();
  await page.keyboard.press('Home');
  await expect(tabs.first()).toBeFocused();
  await page.keyboard.press('Space');
  await expect(tabs.first()).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('tabpanel')).toBeFocused();
  const firstRect = (await tabs.first().boundingBox())!, fifthRect = (await tabs.nth(4).boundingBox())!;
  expect(fifthRect.y).toBeGreaterThan(firstRect.y);
  for (const width of [1280, 1279, 390]) {
    await page.setViewportSize({ width, height: 812 });
    await expect(tabs).toHaveCount(width === 1280 ? 0 : 7);
    if (width !== 1280) await expect(tabs.first()).toHaveAttribute('aria-selected', 'true');
  }
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(raw);
});

test('EC-20/25 shopping action leaves final content and keyboard focus visible at all boundaries and short height', async ({ page }) => {
  await page.goto('/menu');
  await expect(page.getByRole('heading', { name: 'Меню пока нет', exact: true })).toBeVisible();
  await openSyntheticPlan(page, { days: 1, long: true });
  for (const width of [360, 390, 430, 768, 1199, 1200, 1279, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    const summary = page.locator('.menu-day-totals summary').last();
    await summary.focus();
    await expect(page.locator('.menu-shopping')).toBeVisible();
    const rect = (await summary.boundingBox())!, action = (await page.locator('.menu-shopping').boundingBox())!;
    expect(rect.y).toBeGreaterThanOrEqual(0);
    expect(rect.y + rect.height).toBeLessThanOrEqual(action.y + 1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    await page.keyboard.press('Tab');
    await expect(page.locator('.menu-shopping a')).toBeFocused();
    expect((await page.locator('.menu-shopping a').boundingBox())!.height).toBeGreaterThanOrEqual(48);
  }
  await page.setViewportSize({ width: 360, height: 400 });
  await expect(page.locator('.menu-shopping')).toHaveCSS('position', 'static');
  // Browser text zoom: rem doubles, content must reflow rather than be clipped.
  await page.evaluate(() => document.documentElement.style.fontSize = '200%');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(360);
});
