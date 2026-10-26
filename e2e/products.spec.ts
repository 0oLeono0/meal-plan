import { expect, test, type Page } from '@playwright/test';
import { mountAppFixture, draftKey } from './fixtures';

async function exclusions(page: Page) {
  await mountAppFixture(page, { draft: { step: 3 } });
  await expect(page.getByRole('heading', { name: 'Предпочтения и ограничения' })).toBeVisible();
}
async function choose(page: Page, query: string, name: string, key = 'Enter') {
  const input = page.getByRole('combobox');
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
async function searchFixture(page: Page) {
  await page.goto('/plan/new');
  await expect(page.getByLabel('Число людей', { exact: true })).toBeVisible();
  await page.evaluate(async () => {
    const resources = performance.getEntriesByType('resource').map(entry => entry.name);
    const reactUrl = resources.find(url => /\/react\.js\?/.test(url))!;
    const rootUrl = resources.find(url => /\/react-dom_client\.js\?/.test(url))!;
    const { default: React } = await import(reactUrl);
    const { default: { createRoot } } = await import(rootUrl);
    const path = '/src/shared/ProductCombobox.tsx';
    const { ProductCombobox } = await import(path);
    const catalog = '/src/adapters/products.ts';
    const { searchProducts } = await import(catalog);
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
      return React.createElement('div', { className: 'app-shell' }, React.createElement('main', null,
        React.createElement(ProductCombobox, { label: 'Поиск', port, onSelect: (product: { id: string }) => setSelected((old: string[]) => [...old, product.id]) }),
        React.createElement('output', null, selected.join(','))));
    }
    document.getElementById('root')?.remove();
    const container = document.createElement('div'); document.body.append(container);
    createRoot(container).render(React.createElement(Fixture));
  });
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
