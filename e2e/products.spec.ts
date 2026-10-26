import { expect, test, type Page } from '@playwright/test';
import { mountAppFixture, draftKey } from './fixtures';
import type { DraftAction, SettingsDraft } from '../src/domain/settings';

async function exclusions(page: Page) {
  await mountAppFixture(page, { draft: { step: 3 } });
  await expect(page.getByRole('heading', { name: 'Предпочтения и ограничения' })).toBeVisible();
}
async function choose(page: Page, query: string, name: string, key = 'Enter') {
  const input = page.locator('input[role="combobox"]');
  await input.fill(query);
  await expect(page.getByRole('option', { name, exact: true })).toBeVisible();
  await input.press(key);
}

test('exclusions populated keyboard: exactly five restrictions and resolved ID tags', async ({ page }) => {
  await exclusions(page);
  await expect(page.getByRole('checkbox')).toHaveCount(5);
  for (const name of ['Без рыбы', 'Без глютена', 'Без лактозы', 'Вегетарианство', 'Халяль']) await page.getByRole('checkbox', { name, exact: true }).check();
  await choose(page, '  ЯЙЦА  ', 'Яйца');
  await choose(page, 'кур', 'Курица', ',');
  await expect(page.getByRole('button', { name: 'Удалить исключение Яйца', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Удалить исключение Курица', exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(key => JSON.parse(localStorage.getItem(key)!).draft.exclusionIds, draftKey)).toEqual(['egg', 'chicken']);
  await page.reload();
  await expect(page.getByRole('checkbox', { checked: true })).toHaveCount(5);
  await expect(page.getByRole('button', { name: /^Удалить исключение/ })).toHaveText(['Удалить Яйца', 'Удалить Курица']);
});

test('exclusions adjacency/ordering zero-one-many: duplicates focus and undo restores previous position', async ({ page }) => {
  await exclusions(page);
  for (const [q, label] of [['яй', 'Яйца'], ['кур', 'Курица'], ['рис', 'Рис']]) await choose(page, q, label);
  await choose(page, 'кур', 'Курица');
  await expect(page.getByRole('button', { name: 'Удалить исключение Курица', exact: true })).toBeFocused();
  await expect(page.getByRole('button', { name: /^Удалить исключение/ })).toHaveCount(3);
  await page.getByRole('button', { name: 'Удалить исключение Курица', exact: true }).click();
  await page.getByRole('button', { name: 'Отменить удаление', exact: true }).click();
  await expect(page.getByRole('button', { name: /^Удалить исключение/ })).toHaveText(['Удалить Яйца', 'Удалить Курица', 'Удалить Рис']);
  await expect(page.getByRole('button', { name: 'Удалить исключение Курица', exact: true })).toBeFocused();
});

test('exclusions empty/partial: unknown text never creates an ID, Escape closes results', async ({ page }) => {
  await exclusions(page);
  await expect(page.getByText('Исключений пока нет')).toBeVisible();
  await expect(page.getByText('Начните вводить название продукта')).toBeVisible();
  await page.getByRole('combobox').fill('несуществующий продукт');
  await expect(page.getByText('Ничего не найдено. Попробуйте другое название')).toBeVisible();
  await page.getByRole('combobox').press('Enter');
  await page.getByRole('combobox').press(',');
  await expect(page.getByRole('button', { name: /^Удалить исключение/ })).toHaveCount(0);
  await page.getByRole('combobox').fill('яй');
  await expect(page.getByRole('option')).toHaveCount(1);
  await page.getByRole('combobox').press('Escape');
  await expect(page.getByRole('combobox')).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByRole('heading', { name: 'Предпочтения и ограничения' })).toBeVisible();
});

// Replace only the catalog port in a standalone real component. No production switches.
async function searchFixture(page: Page, surface: 'combobox' | 'home' = 'combobox') {
  await page.goto('/plan/new');
  await expect(page.getByLabel('Число людей', { exact: true })).toBeVisible();
  await page.evaluate(async surface => {
    const resources = performance.getEntriesByType('resource').map(entry => entry.name);
    const reactUrl = resources.find(url => /\/react\.js\?/.test(url))!;
    const rootUrl = resources.find(url => /\/react-dom_client\.js\?/.test(url))!;
    const { default: React } = await import(reactUrl);
    const { default: { createRoot } } = await import(rootUrl);
    const path = '/src/shared/ProductCombobox.tsx';
    const { ProductCombobox } = await import(path);
    const catalog = '/src/adapters/products.ts';
    const { searchProducts } = await import(catalog);
    const homePath = '/src/features/wizard/HomeProductsStep.tsx';
    const { HomeProductsStep } = await import(homePath);
    const settingsPath = '/src/domain/settings.ts';
    const { createDraft, draftReducer } = await import(settingsPath);
    let failed = false;
    const port = { async search(query: string) {
      if (query === 'сбой' && !failed) { failed = true; throw new Error('offline'); }
      await new Promise(resolve => setTimeout(resolve, query === 'медленно' ? 900 : query === 'ждать' ? 400 : 20));
      if (query === 'медленно') return [{ id: 'old', name: 'Старый ответ', synonyms: [], allowedUnits: ['g'] }];
      if (query === 'сбой' || query === 'ждать') return searchProducts('рис');
      if (query === 'тест') return [
        { id: 'a', name: '<img src=x onerror=alert(1)> ОченьДлинноеНазвание'.repeat(4), synonyms: [], allowedUnits: ['g'] },
        { id: 'b', name: 'Рис похожий', synonyms: [], allowedUnits: ['g'] },
        { id: 'c', name: 'Рис похожий', synonyms: [], allowedUnits: ['g'] },
      ];
      return searchProducts(query);
    } };
    function Fixture() {
      const [selected, setSelected] = React.useState([] as string[]);
      const [draft, setDraft] = React.useState({ ...createDraft(), home: [{ productId: 'rice', quantity: '2', unit: 'g', expiresSoon: true }] });
      return React.createElement('div', { className: 'app-shell' }, React.createElement('main', null,
        surface === 'home' ? React.createElement(HomeProductsStep, { draft, productPort: port, errors: {}, onChange: (action: DraftAction) => setDraft((old: SettingsDraft) => draftReducer(old, action)) })
          : React.createElement(ProductCombobox, { label: 'Поиск', port, onSelect: (product: { id: string }) => setSelected((old: string[]) => [...old, product.id]) }),
        React.createElement('output', null, selected.join(','))));
    }
    document.getElementById('root')?.remove();
    const container = document.createElement('div'); document.body.append(container);
    createRoot(container).render(React.createElement(Fixture));
  }, surface);
}

test('exclusions loading/error/retry/concurrency: latest response and repeated Enter guard', async ({ page }) => {
  await searchFixture(page);
  const input = page.getByRole('combobox');
  await input.fill('сбой');
  await expect(page.getByRole('alert')).toHaveText('Не удалось загрузить продукты');
  await expect(input).toHaveValue('сбой');
  await page.getByRole('button', { name: 'Повторить поиск' }).click();
  await expect(page.getByRole('option', { name: 'Рис', exact: true })).toBeVisible();
  await input.fill('медленно');
  await expect(page.getByRole('listbox')).toHaveAttribute('aria-busy', 'true');
  await input.fill('кур');
  await expect(page.getByRole('option', { name: 'Курица' })).toBeVisible();
  await expect(page.getByRole('option', { name: 'Старый ответ' })).toHaveCount(0);
  await page.waitForTimeout(950);
  await expect(page.getByRole('option', { name: 'Курица' })).toBeVisible();
  await input.fill('ждать');
  await input.press('Enter'); await input.press('Enter');
  await expect(page.locator('output')).toHaveText('');
  await expect(page.getByRole('option', { name: 'Рис', exact: true })).toBeVisible();
  await input.press('Enter'); await input.press('Enter');
  await expect(page.locator('output')).toHaveText('rice');
});

test('exclusions encoding/long-text/overflow: literal labels, similar names keep distinct IDs and keyboard highlight', async ({ page }) => {
  await searchFixture(page);
  await page.setViewportSize({ width: 360, height: 800 });
  const input = page.getByRole('combobox');
  await input.fill('тест');
  await expect(page.getByRole('option')).toHaveCount(3);
  await expect(page.locator('img')).toHaveCount(0);
  await input.press('ArrowDown');
  await expect(input).toHaveAttribute('aria-activedescendant', /option-1$/);
  await input.press('Enter');
  await input.fill('тест'); await expect(page.getByRole('option')).toHaveCount(3);
  await input.press('ArrowDown'); await input.press('ArrowDown'); await input.press('Enter');
  await expect(page.locator('output')).toHaveText('b,c');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await input.fill(' Ё '); await expect(page.getByRole('option')).toHaveCount(0);
});

test('exclusions zero-one-many expiry: undo disappears after five seconds and focus remains safe', async ({ page }) => {
  await exclusions(page);
  await choose(page, 'рис', 'Рис');
  await page.clock.install();
  await page.getByRole('button', { name: 'Удалить исключение Рис', exact: true }).click();
  await expect(page.getByRole('combobox')).toBeFocused();
  await page.clock.fastForward(5100);
  await expect(page.getByRole('button', { name: 'Отменить удаление' })).toHaveCount(0);
  await expect(page.getByRole('combobox')).toBeFocused();
});

async function home(page: Page) {
  await mountAppFixture(page, { draft: { step: 4, restrictions: ['no-fish'], exclusionIds: ['egg'] } });
  await expect(page.getByRole('heading', { name: 'Продукты дома', exact: true })).toBeVisible();
}
test('home-products populated/partial/ordering: six popular IDs, unknown amount, duplicates focus, expiry and reload', async ({ page }) => {
  await home(page);
  await expect(page.getByText('Домашних продуктов пока нет')).toBeVisible();
  const popular = page.getByRole('group', { name: 'Популярные продукты' });
  await expect(popular.getByRole('button')).toHaveText(['Яйца', 'Курица', 'Помидоры', 'Творог', 'Рис', 'Картофель']);
  await popular.getByRole('button', { name: 'Рис', exact: true }).click();
  await expect(page.getByText('Количество не указано')).toBeVisible();
  await page.getByLabel('Количество Рис', { exact: true }).fill('1,25');
  await page.getByLabel('Единица Рис', { exact: true }).selectOption('kg');
  await page.getByLabel('Скоро испортится Рис', { exact: true }).check();
  await popular.getByRole('button', { name: 'Рис', exact: true }).click();
  await expect(page.getByLabel('Количество Рис', { exact: true })).toBeFocused();
  await choose(page, 'рис', 'Рис');
  await expect(page.getByLabel('Количество Рис', { exact: true })).toBeFocused();
  await expect(page.getByRole('button', { name: /^Удалить продукт/ })).toHaveCount(1);
  await popular.getByRole('button', { name: 'Яйца', exact: true }).click();
  await page.getByRole('button', { name: 'Удалить продукт Рис', exact: true }).click();
  await page.getByRole('button', { name: 'Отменить удаление', exact: true }).click();
  await expect(page.getByRole('button', { name: /^Удалить продукт/ })).toHaveText(['Удалить Рис', 'Удалить Яйца']);
  await expect(page.getByLabel('Количество Рис', { exact: true })).toBeFocused();
  await expect.poll(() => page.evaluate(key => JSON.parse(localStorage.getItem(key)!).draft.home.length, draftKey)).toBe(2);
  await page.reload();
  await expect(page.getByLabel('Количество Рис', { exact: true })).toHaveValue('1,25');
  await expect(page.getByLabel('Единица Рис', { exact: true })).toHaveValue('kg');
  await expect(page.getByLabel('Скоро испортится Рис', { exact: true })).toBeChecked();
  await page.getByRole('button', { name: 'Назад', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: 'Без рыбы', exact: true })).toBeChecked();
  await expect(page.getByRole('button', { name: 'Удалить исключение Яйца', exact: true })).toBeVisible();
});

test('home-products boundary/precision/error: invalid raw persists, unit mandatory only for known quantity', async ({ page }) => {
  await home(page);
  await page.getByRole('button', { name: 'Рис', exact: true }).click();
  const amount = page.getByLabel('Количество Рис', { exact: true });
  await amount.fill('0');
  await page.getByRole('button', { name: 'Проверить настройки' }).click();
  await expect(amount).toBeFocused();
  await expect(amount).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByText('Настройки подготовлены', { exact: true })).toHaveCount(0);
  await expect.poll(() => page.evaluate(key => JSON.parse(localStorage.getItem(key)!).draft.home[0].quantity, draftKey)).toBe('0');
  await page.reload();
  await expect(amount).toHaveValue('0');
  await amount.fill('0.00000000000000000001');
  await page.getByRole('button', { name: 'Проверить настройки' }).click();
  await expect(page.getByLabel('Единица Рис', { exact: true })).toBeFocused();
  await page.getByLabel('Единица Рис', { exact: true }).selectOption('g');
  await page.getByRole('button', { name: 'Проверить настройки' }).click();
  await expect(page.getByRole('heading', { name: 'Настройки подготовлены' })).toBeVisible();
  await expect(page.getByText('0.00000000000000000001 г', { exact: true })).toBeVisible();
});

test('home-products honest review: all four steps validated, no confirmed or pantry mutation', async ({ page }) => {
  await mountAppFixture(page, { draft: { step: 4, people: '', budget: '0' } });
  await page.getByRole('button', { name: 'Проверить настройки' }).click();
  await expect(page.getByLabel('Число людей', { exact: true })).toBeFocused();
  await page.getByLabel('Число людей', { exact: true }).fill('2');
  await page.getByRole('button', { name: 'Далее', exact: true }).click();
  await expect(page.getByLabel('Бюджет на неделю', { exact: true })).toBeVisible();
  await page.getByLabel('Бюджет на неделю', { exact: true }).fill('3000');
  await expect(page.getByRole('status').filter({ hasText: 'Сохранено на этом устройстве' })).toBeVisible();
  await page.waitForTimeout(260);
  await page.getByRole('button', { name: 'Далее', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Предпочтения и ограничения' })).toBeVisible();
  await page.waitForTimeout(260);
  await page.getByRole('button', { name: 'Далее', exact: true }).click();
  await page.getByRole('button', { name: 'Проверить настройки' }).click();
  await expect(page.getByRole('heading', { name: 'Настройки подготовлены' })).toBeFocused();
  await expect(page.getByText('Запуск меню будет доступен на следующем этапе')).toBeVisible();
  await expect(page.getByText('Цель КБЖУ не указана', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Составить меню', exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => [localStorage.getItem('mealplan:confirmed'), localStorage.getItem('mealplan:pantry')])).toEqual(['confirmed', 'pantry']);
  await page.getByRole('button', { name: 'Назад', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Предпочтения и ограничения' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Настройки подготовлены' })).toHaveCount(0);
});

test('home-products zero-one-many/overflow: all rows wrap at 360, last removal and undo preserve unknown quantity', async ({ page }) => {
  await home(page);
  await page.setViewportSize({ width: 360, height: 800 });
  for (const name of ['Яйца', 'Курица', 'Помидоры', 'Творог', 'Рис', 'Картофель']) await page.getByRole('group', { name: 'Популярные продукты' }).getByRole('button', { name, exact: true }).click();
  await expect(page.getByRole('button', { name: /^Удалить продукт/ })).toHaveCount(6);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const last = page.getByRole('button', { name: 'Удалить продукт Картофель', exact: true });
  await last.focus();
  const bounds = await last.boundingBox();
  const footer = await page.locator('.sticky-actions').boundingBox();
  expect(bounds!.y + bounds!.height <= footer!.y).toBe(true);
  for (const name of ['Яйца', 'Курица', 'Помидоры', 'Творог', 'Рис', 'Картофель']) await page.getByRole('button', { name: `Удалить продукт ${name}`, exact: true }).click();
  await expect(page.getByText('Домашних продуктов пока нет')).toBeVisible();
  await page.getByRole('button', { name: 'Отменить удаление', exact: true }).click();
  await expect(page.getByLabel('Количество Картофель', { exact: true })).toHaveValue('');
  await expect(page.getByText('Количество не указано')).toBeVisible();
});

test('home-products loading/error/retry: existing rows and expiry survive catalog failure and stale responses', async ({ page }) => {
  await searchFixture(page, 'home');
  const input = page.locator('input[role="combobox"]');
  await input.fill('сбой');
  await expect(page.getByRole('alert')).toHaveText('Не удалось загрузить продукты');
  await expect(page.getByLabel('Количество Рис', { exact: true })).toHaveValue('2');
  await expect(page.getByLabel('Скоро испортится Рис', { exact: true })).toBeChecked();
  await page.getByRole('button', { name: 'Повторить поиск' }).click();
  await expect(page.getByRole('option', { name: 'Рис', exact: true })).toBeVisible();
  await input.press('Enter');
  await expect(page.getByLabel('Количество Рис', { exact: true })).toBeFocused();
  await input.fill('медленно');
  await expect(page.getByText('Ищем продукты…')).toBeVisible();
  await expect(page.getByRole('button', { name: /^Удалить продукт/ })).toHaveCount(1);
  await input.fill('томат');
  await expect(page.getByRole('option', { name: 'Помидоры' })).toBeVisible();
  await page.waitForTimeout(950);
  await expect(page.getByRole('option', { name: 'Старый ответ' })).toHaveCount(0);
  await input.press('Enter');
  await expect(page.getByRole('button', { name: /^Удалить продукт/ })).toHaveCount(2);
  await expect(page.getByLabel('Количество Рис', { exact: true })).toHaveValue('2');
});

test('home-products long-text: unknown stored ID stays literal, wraps and cannot pass readiness', async ({ page }) => {
  const productId = '<img src=x onerror=alert(1)>ОченьДлинноеНазвание'.repeat(5);
  await mountAppFixture(page, { draft: { step: 4, home: [{ productId, quantity: '', expiresSoon: false }] } });
  await page.setViewportSize({ width: 360, height: 800 });
  await expect(page.getByRole('button', { name: /^Удалить продукт/ })).toHaveCount(1);
  await expect(page.locator('img')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Проверить настройки' }).click();
  await expect(page.getByText('Продукт отсутствует в справочнике. Удалите строку и выберите продукт заново')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Настройки подготовлены' })).toHaveCount(0);
});

test('home-products review preserves saved nutrition provenance', async ({ page }) => {
  await mountAppFixture(page, { draft: { step: 4, targetSource: { kind: 'calculated', formulaVersion: 'existing-source', sourceRef: 'existing-ref' }, manualNutrition: { calories: '2000', protein: '90', fat: '70', carbohydrates: '240' } } });
  await page.getByRole('button', { name: 'Проверить настройки' }).click();
  await expect(page.getByRole('heading', { name: 'Настройки подготовлены' })).toBeVisible();
  await expect(page.getByText(/Сохранённая норма из расчёта/)).toBeVisible();
  await expect(page.getByText(/Введено вручную/)).toHaveCount(0);
});
