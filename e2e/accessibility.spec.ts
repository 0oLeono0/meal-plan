import { test, expect, type Page, type Locator } from '@playwright/test';

async function next(page: Page) {
  // Respect the intentional 250 ms protection against double activation.
  await page.waitForTimeout(260);
  await page.getByRole('button', { name: 'Далее', exact: true }).click();
}

async function unobscured(page: Page, field: Locator) {
  await expect(field).toBeFocused();
  const box = await field.boundingBox();
  const footer = await page.locator('.sticky-actions').boundingBox();
  expect(box).not.toBeNull();
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.y + box!.height).toBeLessThanOrEqual(footer!.y);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

test('accessibility smoke keyboard modal trap cancel restoration and first wizard error', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/shopping');
  const profile = page.getByRole('button', { name: 'Профиль', exact: true });
  await profile.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'Гостевой профиль' });
  await expect(dialog).toHaveAttribute('aria-modal', 'true');
  await expect(dialog).toHaveAttribute('aria-describedby', /.+/);
  const cancel = dialog.getByRole('button', { name: 'Закрыть пояснение' });
  await expect(cancel).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(dialog.getByRole('button', { name: 'Вернуться к меню' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(cancel).toBeFocused();
  // Focus containment must also handle scripted focus outside the dialog.
  await page.locator('main').focus();
  await expect(cancel).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(profile).toBeFocused();
  await page.getByRole('link', { name: 'Новое меню', exact: true }).focus();
  await page.keyboard.press('Enter');
  const people = page.getByLabel('Число людей', { exact: true });
  await people.fill('');
  await page.getByRole('button', { name: 'Далее', exact: true }).focus();
  await page.keyboard.press('Enter');
  await unobscured(page, people);
  await expect(people).toHaveAttribute('aria-invalid', 'true');
  await expect(people).toHaveAttribute('aria-describedby', /people-error/);
  await page.getByRole('button', { name: 'Назад', exact: true }).focus();
  await page.keyboard.press('Enter');
  const exit = page.getByRole('dialog', { name: 'Выйти из мастера?' });
  await expect(exit.getByRole('button', { name: 'Продолжить настройку' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(exit).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Назад', exact: true })).toBeFocused();
  await expect(people).toHaveValue('');
});

test('accessibility skip link visible focus target sizes navigation current state and reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/menu');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
  await expect(page.locator('meta[name="viewport"]')).not.toHaveAttribute('content', /user-scalable=no|maximum-scale=1(?:,|$)/);
  const skip = page.getByRole('link', { name: 'К содержимому' });
  await skip.focus();
  await expect(skip).toBeVisible();
  expect(await skip.evaluate(element => getComputedStyle(element).outlineStyle)).not.toBe('none');
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
  await expect(page.getByRole('navigation').getByRole('link', { name: 'Меню', exact: true })).toHaveAttribute('aria-current', 'page');
  const controls = page.getByRole('navigation').locator('a,button');
  for (const control of await controls.all()) {
    const box = await control.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
    expect(box!.width).toBeGreaterThanOrEqual(44);
  }
  await page.getByRole('link', { name: 'Новое меню', exact: true }).click();
  for (const control of await page.locator('button.primary').all()) {
    expect((await control.boundingBox())!.height).toBeGreaterThanOrEqual(48);
    expect(await control.evaluate(element => getComputedStyle(element).transitionDuration)).toBe('0s');
  }
  await expect(page.getByRole('progressbar', { name: 'Настройка меню' })).toHaveAttribute('aria-valuemax', '4');
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
  await expect(page.getByRole('navigation')).toHaveCount(0);
});

test('accessibility combobox keyboard active descendant arrows escape reopen selection removal and undo', async ({ page }) => {
  await page.goto('/plan/new');
  await next(page);
  await page.getByLabel('Бюджет на неделю', { exact: true }).fill('1050');
  await next(page);
  const search = page.getByRole('combobox', { name: 'Добавить исключение' });
  await search.fill('к');
  const list = page.getByRole('listbox', { name: 'Добавить исключение' });
  await expect(list).toHaveAttribute('aria-busy', 'false');
  expect(await list.getByRole('option').count()).toBeGreaterThan(1);
  await search.press('ArrowDown');
  let selected = list.getByRole('option', { selected: true });
  await expect(search).toHaveAttribute('aria-activedescendant', (await selected.getAttribute('id'))!);
  await expect(search).toBeFocused();
  await search.press('Escape');
  await expect(list).toHaveCount(0);
  await expect(search).toHaveAttribute('aria-expanded', 'false');
  await search.press('ArrowUp');
  selected = list.getByRole('option', { selected: true });
  const product = (await selected.innerText()).trim();
  await search.press(',');
  const remove = page.getByRole('button', { name: `Удалить исключение ${product}`, exact: true });
  await expect(remove).toBeVisible();
  await remove.focus();
  await page.keyboard.press('Enter');
  await expect(search).toBeFocused();
  await expect(remove).toHaveCount(0);
  const undo = page.getByRole('button', { name: 'Отменить удаление' });
  await undo.focus();
  await page.keyboard.press('Enter');
  await expect(remove).toBeFocused();
});

for (const width of [360, 390, 430, 768, 1199, 1200, 1280]) test(`accessibility ${width}px 200 percent text sticky errors all four steps and final action`, async ({ page }, info) => {
  await page.setViewportSize({ width, height: 800 });
  await page.goto('/plan/new');
  await page.evaluate(() => document.documentElement.style.fontSize = '200%');
  const days = page.getByLabel('Число дней', { exact: true });
  await days.fill('0');
  await next(page);
  await unobscured(page, days);
  await days.fill('7');
  await next(page);
  const budget = page.getByLabel('Бюджет на неделю', { exact: true });
  await budget.fill('');
  await next(page);
  await unobscured(page, budget);
  await budget.fill('500');
  await next(page);
  const exclusion = page.getByRole('combobox', { name: 'Добавить исключение' });
  await exclusion.fill('Рис');
  await expect(page.getByRole('option', { name: 'Рис', exact: true })).toBeVisible();
  await exclusion.press('Enter');
  await expect(page.getByRole('button', { name: 'Удалить исключение Рис' })).toBeVisible();
  await next(page);
  await page.getByRole('group', { name: 'Популярные продукты' }).getByRole('button', { name: 'Курица', exact: true }).click();
  const quantity = page.getByLabel('Количество Курица', { exact: true });
  await quantity.fill('1,');
  await page.getByRole('button', { name: 'Проверить настройки' }).click();
  await unobscured(page, quantity);
  await quantity.fill('200');
  await page.getByLabel('Единица Курица', { exact: true }).selectOption('g');
  await page.getByRole('button', { name: 'Проверить настройки' }).click();
  await expect(page.getByRole('heading', { name: 'Настройки подготовлены' })).toBeFocused();
  await page.screenshot({ path: `.tmp/phase01-qa/${info.project.name}-${width}-wizard-text200.png`, fullPage: true });
  const last = page.getByRole('button', { name: 'Проверить настройки' });
  await last.focus();
  const box = await last.boundingBox();
  expect(box!.height).toBeGreaterThanOrEqual(48);
  expect(box!.y + box!.height).toBeLessThanOrEqual(800);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('accessibility short viewport moves action panel into flow without claiming real virtual keyboard', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 400 });
  await page.goto('/plan/new');
  await expect(page.getByLabel('Число людей', { exact: true })).toBeVisible();
  expect(await page.locator('.sticky-actions').evaluate(element => getComputedStyle(element).position)).toBe('static');
  await page.getByRole('button', { name: 'Далее', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '2');
});

