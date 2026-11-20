import { expect, type Page } from '@playwright/test';
import type { Catalog, FoodProfile } from '../src/domain/catalog';

export interface PlanFixtureOptions {
  stock?: 'partial' | 'all' | 'over' | 'none' | 'unknown' | 'incompatible';
  target?: 'absent' | 'exact-ten' | 'above-ten' | 'zero-positive';
  many?: boolean;
  long?: boolean;
  split?: 'one' | 'two';
  category?: string;
  days?: number;
}
// Test-only synthetic inputs. Literal expectations in specs are independent of selectors.
// Four 125g family meals = 500g need; 200g stock => 300g purchase.
// 100 RUB/kg => ingredient50, covered20, purchase30; two people =>1000kcal/person/day.
export async function syntheticEnvelope(options: PlanFixtureOptions = {}) {
  const settingsPath = '/src/domain/settings.ts', appliedPath = '/src/domain/appliedSettings.ts', planPath = '/src/domain/plan.ts', quantitiesPath = '/src/domain/quantities.ts';
  const { createDraft } = await import(settingsPath);
  const { buildAppliedSettings } = await import(appliedPath);
  const { buildActivePlanEnvelope, createPlanInputs, createRecipeInstances, encodePlanEnvelope } = await import(planPath);
  const { decimal } = await import(quantitiesPath);
  const source = { sourceId: 'synthetic-browser-only', recordId: 'literal-oracle', release: 'test-v1', license: 'Synthetic test data', url: `https://example.org/synthetic${options.long ? `?record=${'ДлинныйИсточник'.repeat(24)}` : ''}` };
  const categories = ['Овощи и фрукты', 'Мясо и рыба', 'Молочное', 'Бакалея', 'Хлеб', 'Прочее'];
  const foods: FoodProfile[] = Array.from({ length: options.many ? 6 : options.split ? 2 : 1 }, (_, index) => ({
    productId: `synthetic-${index}`, profileId: `synthetic-profile-${index}`,
    name: options.long ? `СинтетическийПродукт${'ОченьДлинноеНазвание'.repeat(8)}${index}` : 'Синтетический продукт', identity: `synthetic food ${index}`, state: 'raw', category: options.category ?? categories[index],
    nutrition: { status: 'known', reference: { amount: '100', unit: 'g', basis: 'edible' }, values: { calories: options.target === 'exact-ten' ? '440' : options.target === 'above-ten' ? '440.004' : '400', protein: '20', fat: '0', carbohydrates: '60' }, source },
    price: { status: 'known', amount: options.long ? '1000000000000.99' : '100', currency: 'RUB', reference: { amount: '1', unit: 'kg', basis: 'edible' }, source: { ...source, recordId: `price-${index}` }, region: index % 2 ? 'Синтетический второй регион' : 'Синтетическая веб-витрина, регион не указан', observedAt: index % 2 ? '2026-10-02' : '2026-10-01', estimate: true },
    safety: { status: 'known', facts: [{ kind: 'restriction', key: 'vegetarian', suitable: true, evidence: [source] }] }, conversions: [],
  }));
  const draft = createDraft(); draft.days = String(options.days ?? 1); draft.people = '2';
  if (options.long) draft.budget = '9007199254740991';
  if (options.target && options.target !== 'absent') {
    draft.targetSource = { kind: 'manual' };
    draft.manualNutrition = { calories: '1000', protein: options.target === 'zero-positive' ? '0' : '50', fat: '0', carbohydrates: '150' };
  }
  const applied = buildAppliedSettings(draft);
  if (applied.status !== 'applied') throw new Error('Invalid synthetic settings');
  const recipes: Catalog['recipes'] = (options.split ? [foods.slice(0, 1), foods.slice(1)] : [foods]).map((selected, index) => ({ id: index ? 'synthetic-other' : 'synthetic-repeated', name: options.long ? `${'<img src=x onerror=alert(1)>ОченьДлинноеБлюдо'.repeat(8)}${index}` : index ? 'Синтетическое второе блюдо' : 'Синтетическое повторяющееся блюдо', baseServings: decimal('2'), slots: ['breakfast', 'lunch', 'dinner', 'snack'], cookingMinutes: 10,
    ingredients: selected.map(food => ({ productId: food.productId, profileId: food.profileId, quantity: { amount: decimal('125'), unit: 'g' } })), steps: ['Синтетический тест'], source }));
  const catalog: Catalog = { version: 'synthetic-browser-v1', foods, recipes };
  const stock = options.stock ?? 'partial';
  const pantrySnapshot = stock === 'none' ? [] : foods.map(food => ({ productId: food.productId, expiresSoon: false, quantity: stock === 'unknown' ? { status: 'unknown' as const } : { status: 'known' as const, value: { amount: decimal(stock === 'all' ? '500' : stock === 'over' ? '900' : '200'), unit: stock === 'incompatible' ? 'ml' as const : 'g' as const } } }));
  const inputs = createPlanInputs(applied.settings, catalog, { seed: 'synthetic', now: () => new Date(2026, 9, 1), pantrySnapshot });
  const recipeIds = options.split === 'one' ? ['synthetic-repeated', 'synthetic-other', 'synthetic-other', 'synthetic-other'] : options.split === 'two' ? ['synthetic-repeated', 'synthetic-repeated', 'synthetic-other', 'synthetic-other'] : Array(4 * (options.days ?? 1)).fill('synthetic-repeated');
  const instances = createRecipeInstances(inputs, recipeIds, (date: string, slot: string) => `synthetic-${date}-${slot}`);
  return encodePlanEnvelope(buildActivePlanEnvelope(inputs, [{ id: 'synthetic-active', instances }], 'synthetic-active'));
}

export async function openSyntheticPlan(page: Page, options: PlanFixtureOptions = {}, route = '/menu') {
  await page.goto('/plan/new');
  await expect(page.getByLabel('Число людей', { exact: true })).toBeVisible();
  const plan = await page.evaluate(syntheticEnvelope, options);
  await page.evaluate(async ({ plan, route }) => {
    // Explicit test-owned trust is injected into a separate App instance.
    // Production boot never registers catalogs found in browser storage.
    const urls = performance.getEntriesByType('resource').map(row => row.name);
    const reactUrl = urls.find(url => /\/react\.js\?/.test(url));
    const rootUrl = urls.find(url => /\/react-dom_client\.js\?/.test(url));
    if (!reactUrl || !rootUrl) throw new Error('Actual React modules not observed');
    const { default: { createElement } } = await import(reactUrl);
    const { default: { createRoot } } = await import(rootUrl);
    const appPath = '/src/app/App.tsx', planPath = '/src/domain/plan.ts';
    const registryPath = '/src/adapters/trustedCatalogs.ts', activePath = '/src/adapters/activePlan.ts';
    const { App } = await import(appPath);
    const { validateActivePlanEnvelope } = await import(planPath);
    const { createTrustedCatalogRegistry } = await import(registryPath);
    const { createActivePlanAdapter } = await import(activePath);
    const validated = validateActivePlanEnvelope(plan);
    if (validated.status !== 'valid') throw new Error('Invalid test-owned synthetic plan');
    const trustedCatalogs = createTrustedCatalogRegistry([validated.plan.inputs.catalog]);
    localStorage.setItem('mealplan:guest:active-plan:v1', JSON.stringify({ schemaVersion: 1, plan }));
    document.getElementById('root')?.remove();
    const container = document.createElement('div'); container.id = 'root'; document.body.append(container);
    history.replaceState({}, '', route);
    createRoot(container).render(createElement(App, { trustedCatalogs,
      activePlanPort: createActivePlanAdapter(() => localStorage, trustedCatalogs) }));
  }, { plan, route });
  await expect(page.locator('[data-plan-id]')).toHaveAttribute('data-plan-id', 'synthetic-active');
}

export async function generateRealPlan(page: Page, days?: number) {
  if (days !== undefined) {
    await page.goto('/plan/new');
    await page.getByLabel('Число дней', { exact: true }).fill(String(days));
    await expect(page.getByRole('status')).toHaveText('Сохранено на этом устройстве');
  }
  await page.goto('/');
  await page.getByRole('button', { name: 'Меню за 1 клик', exact: true }).click();
  // Real generation is a navigation-producing operation, not a 5s DOM update.
  // The existing 20s overall test deadline still bounds the entire journey.
  await page.waitForURL('**/menu');
  const title = days === undefined || days === 7 ? 'Меню на неделю'
    : `Меню на ${days} ${days === 1 ? 'день' : days < 5 ? 'дня' : 'дней'}`;
  await expect(page.getByRole('heading', { level: 1, name: title, exact: true })).toBeVisible();
  await expect(page.locator('[data-instance-id]')).toHaveCount(4 * (days ?? 7));
}

/** Saved content remains identical; live operation acknowledgements are ephemeral.
 * Read the actual visible text, omitting only role=status (not alerts or facts).
 * Cancellation/success messages are asserted independently in acceptance/recovery.
 */
export async function savedMenuText(page: Page) {
  const menu = page.locator('[data-plan-id]');
  await expect(menu).toBeVisible();
  return menu.evaluate(node => {
    let text = (node as HTMLElement).innerText;
    for (const status of node.querySelectorAll<HTMLElement>('[role="status"]')) text = text.replace(status.innerText, '');
    return text.replace(/\s+/g, ' ').trim();
  });
}
