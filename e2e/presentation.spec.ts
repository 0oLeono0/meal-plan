import { test, expect, type Page, type Locator } from '@playwright/test';
import { draftKey } from './fixtures';

const widths = [360, 390, 430, 768, 1199, 1200, 1280];

async function fits(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

async function next(page: Page, step: number) {
  // The wizard intentionally ignores repeated activation within 250 ms.
  await page.waitForTimeout(260);
  await page.getByRole('button', { name: 'Далее', exact: true }).click();
  await expect(page.getByRole('progressbar', { name: 'Настройка меню' })).toHaveAttribute('aria-valuenow', String(step));
}

async function alignedChoices(page: Page) {
  const choices = page.locator('label').filter({ has: page.locator('input[type="radio"], input[type="checkbox"]') });
  expect(await choices.count()).toBeGreaterThan(0);
  for (const choice of await choices.all()) {
    await expect(choice).toHaveCSS('display', 'flex');
    await expect(choice).toHaveCSS('align-items', 'center');
    await expect(choice).toHaveCSS('column-gap', '8px');
    await expect(choice).toHaveCSS('margin', '0px');
    await expect(choice).toHaveCSS('font-weight', '400');
    expect((await choice.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await expect(choice.locator('input')).toHaveCSS('accent-color', 'rgb(28, 124, 80)');
  }
}

async function footerFits(page: Page, primary: Locator, mobile: boolean) {
  const footer = page.locator('.sticky-actions');
  const reserved = page.locator('.has-sticky-actions');
  await expect.poll(async () => reserved.evaluate(element => parseFloat(getComputedStyle(element).getPropertyValue('--footer-height')))).toBeCloseTo((await footer.boundingBox())!.height, 0);
  const bounds = await footer.boundingBox();
  const button = await primary.boundingBox();
  expect(button!.height).toBeGreaterThanOrEqual(48);
  if (mobile) expect(button!.width).toBeCloseTo(bounds!.width - 32, 0);
  const padding = await reserved.evaluate(element => parseFloat(getComputedStyle(element).paddingBottom));
  expect(padding).toBeGreaterThanOrEqual(bounds!.height + 16);
  await primary.focus();
  const focused = await primary.boundingBox();
  expect(focused!.y).toBeGreaterThanOrEqual(0);
  expect(focused!.y + focused!.height).toBeLessThanOrEqual(800);
  await fits(page);
}

for (const width of [360, 390, 768, 1280]) {
  test(`presentation contract ${width}px choice captions align beside controls across all steps`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/plan/new');
    await alignedChoices(page);
    await next(page, 2);
    await alignedChoices(page);
    await next(page, 3);
    await alignedChoices(page);
    await next(page, 4);
    await page.getByRole('group', { name: 'Популярные продукты' }).getByRole('button', { name: 'Рис', exact: true }).click();
    await alignedChoices(page);
  });

  test(`presentation contract ${width}px budget is prominent with currency and retains exact raw amount`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/plan/new');
    await next(page, 2);
    const budget = page.getByLabel('Бюджет на неделю', { exact: true });
    await budget.fill(' 1050 ');
    await expect(budget).toHaveCSS('font-size', '32px');
    await expect(budget).toHaveCSS('font-weight', '600');
    await expect(budget).toHaveCSS('font-variant-numeric', 'tabular-nums');
    await expect(page.locator('.budget-amount').getByText('₽', { exact: true })).toBeVisible();
    await expect(budget).toHaveValue(' 1050 ');
    await expect(page.getByRole('slider')).toHaveAttribute('aria-valuenow', '1100');
    await expect(page.getByRole('slider')).toHaveAttribute('aria-valuetext', /Точная сумма в поле: 1\s050 рублей/);
    await budget.fill('9007199254740991');
    await fits(page);
    await budget.fill('1,');
    await expect(budget).toHaveValue('1,');
    await expect(budget).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByRole('slider')).toHaveAttribute('aria-valuetext', /Отдельный выбор суммы/);
  });

  test(`presentation contract ${width}px primary fills mobile footer and reservation tracks enlarged final action`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/plan/new');
    await footerFits(page, page.getByRole('button', { name: 'Далее', exact: true }), width < 768);
    await next(page, 2);
    await next(page, 3);
    await next(page, 4);
    await page.evaluate(() => document.documentElement.style.fontSize = '200%');
    await footerFits(page, page.getByRole('button', { name: 'Проверить настройки' }), width < 768);
  });
}

for (const width of widths) test(`presentation ${width === 360 ? 'smoke ' : ''}${width}px complete guest journey retains raw values IDs and manual origin`, async ({ page, browser }, info) => {
  await page.setViewportSize({ width, height: 800 });
  const capture = async (screen: string) => {
    await fits(page);
    await page.screenshot({ path: `.tmp/phase01-qa/${info.project.name}-${width}-${screen}.png`, fullPage: true });
  };
  console.log(`QA_BROWSER ${info.project.name} ${browser.version()} viewport=${width}x800`);
  await page.goto('/');
  await expect(page.getByText('Настройки → Меню → Покупки')).toBeVisible();
  await capture('welcome');
  const start = page.getByRole('button', { name: 'Составить меню', exact: true });
  expect((await start.boundingBox())!.height).toBeGreaterThanOrEqual(48);
  await start.click();
  await page.getByLabel('Число людей', { exact: true }).fill('3');
  await page.getByLabel('Число дней', { exact: true }).fill('5');
  await page.getByRole('radio', { name: 'Набор массы' }).check();
  await page.getByRole('button', { name: 'Норма КБЖУ', exact: true }).click();
  for (const [label, value] of [['Калории, ккал', ' 1800,5 '], ['Белки, г', '90'], ['Жиры, г', '0'], ['Углеводы, г', '240']]) {
    await page.getByLabel(label, { exact: true }).fill(value);
  }
  await expect(page.getByText('Введено вручную', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /Рассчитать норму|Использовать/ })).toHaveCount(0);
  for (const name of ['Пол', 'Возраст', 'Рост', 'Вес', 'Активность']) await expect(page.getByLabel(name, { exact: true })).toHaveCount(0);
  await capture('step1');
  await next(page, 2);
  await page.getByLabel('Бюджет на 5 дней', { exact: true }).fill('1050');
  await expect(page.getByText(/Точная сумма введена вручную/)).toBeVisible();
  await page.getByRole('radio', { name: 'любое', exact: true }).check();
  await page.getByRole('radio', { name: 'Каждый день разное', exact: true }).check();
  await capture('step2');
  await next(page, 3);
  await page.getByRole('checkbox', { name: 'Без рыбы', exact: true }).check();
  const exclusions = page.getByRole('combobox', { name: 'Добавить исключение' });
  await exclusions.fill('Помидор');
  await expect(page.getByRole('option', { name: 'Помидоры', exact: true })).toBeVisible();
  await exclusions.press('Enter');
  await expect(page.getByRole('button', { name: 'Удалить исключение Помидоры' })).toBeVisible();
  await capture('step3');
  await next(page, 4);
  const popular = page.getByRole('group', { name: 'Популярные продукты' });
  await popular.getByRole('button', { name: 'Рис', exact: true }).click();
  await page.getByLabel('Количество Рис', { exact: true }).fill(' 1,25 ');
  await page.getByLabel('Единица Рис', { exact: true }).selectOption('kg');
  await page.getByRole('checkbox', { name: 'Скоро испортится Рис' }).check();
  await popular.getByRole('button', { name: 'Яйца', exact: true }).click();
  await expect(page.getByText('Количество не указано', { exact: true })).toBeVisible();
  await capture('step4');
  await page.getByRole('button', { name: 'Проверить настройки' }).click();
  const review = page.getByRole('region', { name: 'Настройки подготовлены' });
  await expect(review).toContainText('1050 ₽');
  await expect(review).toContainText('На следующем этапе'.toLowerCase());
  await expect(review).toContainText('Введено вручную');
  await expect(review).toContainText('Количество не указано');
  await expect(page.getByRole('button', { name: /Создать меню|Генерировать/ })).toHaveCount(0);
  await capture('review');
  await expect(page.getByRole('status').filter({ hasText: 'Сохранено на этом устройстве' })).toBeVisible();
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).draft, draftKey);
  expect(saved).toMatchObject({ step: 4, people: '3', days: '5', budget: '1050', targetSource: { kind: 'manual' }, manualNutrition: { calories: ' 1800,5 ', protein: '90', fat: '0', carbohydrates: '240' }, exclusionIds: ['tomato'] });
  expect(saved.home).toEqual(expect.arrayContaining([expect.objectContaining({ productId: 'rice', quantity: ' 1,25 ', unit: 'kg', expiresSoon: true }), expect.objectContaining({ productId: 'egg', quantity: '' })]));
  await page.reload();
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '4');
  await expect(page.getByLabel('Количество Рис', { exact: true })).toHaveValue(' 1,25 ');
  await expect(page.getByLabel('Единица Рис', { exact: true })).toHaveValue('kg');
  await page.getByRole('button', { name: 'Проверить настройки' }).click();
  await expect(review).toContainText('Без рыбы');
  await expect(review).toContainText('Помидоры');
  await expect(review).toContainText('Введено вручную');
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).draft, draftKey)).toEqual(saved);
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([draftKey]);
});

test('presentation manual absence and partial correction preserve optional contract without averages', async ({ page }) => {
  await page.goto('/plan/new');
  await expect(page.getByText('Норма не задана', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Норма КБЖУ', exact: true }).click();
  await page.getByLabel('Калории, ккал', { exact: true }).fill('1,');
  await expect(page.getByRole('status').filter({ hasText: 'Сохранено на этом устройстве' })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Калории, ккал', { exact: true })).toHaveValue('1,');
  await page.getByRole('button', { name: 'Далее', exact: true }).click();
  await expect(page.getByLabel('Калории, ккал', { exact: true })).toBeFocused();
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
  await page.getByRole('button', { name: 'Очистить норму' }).click();
  await next(page, 2);
  // Wait for observable save, not a fixed delay, before traversing an unchanged step.
  await expect(page.getByRole('status').filter({ hasText: 'Сохранено на этом устройстве' })).toBeVisible();
  await page.getByLabel('Бюджет на неделю', { exact: true }).fill('20000');
  await next(page, 3);
  await page.getByRole('checkbox', { name: 'Халяль', exact: true }).check();
  await next(page, 4);
  await page.getByRole('button', { name: 'Проверить настройки' }).click();
  const review = page.getByRole('region', { name: 'Настройки подготовлены' });
  await expect(review).toContainText('Цель КБЖУ не указана');
  await expect(review).not.toContainText(/Введено вручную|2100|Рассчитано|средняя норма/i);
  await expect(page.getByRole('status').filter({ hasText: 'Сохранено на этом устройстве' })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Проверить настройки' }).click();
  await expect(review).toContainText('Цель КБЖУ не указана');
});

for (const width of widths) test(`presentation ${width}px truthful route states reflow under 200 percent text`, async ({ page }, info) => {
  await page.setViewportSize({ width, height: 800 });
  for (const [path, title] of [['/menu', 'Меню пока нет'], ['/shopping', 'Сначала составьте меню'], ['/pantry', 'Добавьте, что есть дома, и мы не купим лишнего'], ['/recipe/missing', 'Такого рецепта нет'], ['/missing', 'Страница не найдена'], ['/plan/generating', 'Генерация не запущена']]) {
    await page.goto(path);
    await page.evaluate(() => document.documentElement.style.fontSize = '200%');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
    await fits(page);
    await page.screenshot({ path: `.tmp/phase01-qa/${info.project.name}-${width}-${path.replace(/\//g, '_')}-text200.png`, fullPage: true });
  }
});
