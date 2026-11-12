import { describe, expect, it } from 'vitest';
import { buildAppliedSettings } from '../domain/appliedSettings';
import { createDraft } from '../domain/settings';
import { createPlanInputs } from '../domain/plan';
import { createLocalGeneration } from '../adapters/generation';
import { createActivePlanAdapter, validateActiveBundle } from '../adapters/activePlan';
import { createPlanSearch } from '../domain/generatePlan';
import { validateCatalog } from '../adapters/catalog';
import { compare, decimal, divide, formatExact, multiply } from '../domain/quantities';
import { projectPlan } from '../domain/planProjection';
import type { Catalog } from '../domain/catalog';
import foodEvidence from '../../data/sources/food.snapshot.json';
import priceEvidence from '../../data/sources/prices.snapshot.json';
import safetyEvidence from '../../data/sources/safety.snapshot.json';
import { historicalCatalog, historicalCatalogPort } from './catalog';
import release1Raw from '../test/fixtures/phase031-release1-active-plan.json?raw';
import { sourceApprovedCatalogs, sourceApprovedCatalogPorts } from './catalog';
import { createVersionedGeneration } from '../adapters/generation';
import type { PantrySnapshotRow } from '../domain/appliedSettings';
import { createGenerationController } from '../features/generation/controller';

function projectBreakfastSnack(ids: readonly string[], servings: string, pantrySnapshot: readonly PantrySnapshotRow[] = []) {
  const catalog = production()!.bundledCatalog;
  const applied = buildAppliedSettings({ ...createDraft(), days: String(ids.length), budget: '3000', cookingTime: 'any' });
  if (applied.status !== 'applied') throw new Error('Test settings must be valid');
  const inputs = createPlanInputs(applied.settings, catalog, { seed: 'breakfast-snack-oracle', pantrySnapshot });
  const result = projectPlan(inputs, { id: 'oracle', instances: ids.map((id, index) => {
    const recipe = catalog.recipes.find(recipe => recipe.id === id)!;
    return { id: `oracle-${index}`, date: inputs.dates[index], slot: recipe.slots[0], recipeId: id,
      catalogVersion: catalog.version, recipeSnapshot: recipe, selectedServings: decimal(servings) };
  }) });
  if (result.status !== 'projected') throw new Error(JSON.stringify(result));
  return result.projection;
}

const sourceEvidence = { food: foodEvidence, prices: priceEvidence, safety: safetyEvidence };

const modules = import.meta.glob('./catalog.ts', { eager: true });
// An absent production catalog is an assertion failure, never an import/discovery error.
const production = () => modules['./catalog.ts'] as { bundledCatalog: Catalog; bundledCatalogPort: Parameters<typeof createLocalGeneration>[0]; validateBundledCatalog: (input: Catalog, sources?: typeof sourceEvidence) => Promise<ReturnType<typeof validateCatalog>> } | undefined;
describe('source-backed production corpus', () => {
  it.each<[string, string[], string]>([
    ['familiar-syrniki', ['923.7', '78.478', '35.343', '72.142'], '301.52290049382716'],
    ['familiar-cottage-apple-bake', ['973.96', '84.152', '36.27', '79.4688'], '345.530420148148148'],
    ['familiar-cottage-cucumber-bread', ['512.4', '50.86', '15.02', '45.028'], '256.0258177777777778'],
  ])('independent source arithmetic scales %s once at half and double portions', (id, nutrition, price) => {
    const base = projectBreakfastSnack([id], '2');
    expect(Object.values(base.familyNutrition).map(formatExact)).toEqual(nutrition);
    expect(formatExact(base.costs.exact.ingredient)).toBe(price);
    for (const [servings, factor] of [['1', '0.5'], ['4', '2']]) {
      const scaled = projectBreakfastSnack([id], servings);
      expect(Object.values(scaled.familyNutrition).map(formatExact)).toEqual(nutrition.map(value => formatExact(multiply(decimal(value), decimal(factor)))));
      expect(formatExact(scaled.costs.exact.ingredient)).toBe(formatExact(multiply(decimal(price), decimal(factor))));
      expect(scaled.rows.map(row => formatExact(row.required.amount))).toEqual(base.rows.map(row => formatExact(multiply(row.required.amount, decimal(factor)))));
    }
  });
  it('loads selects appends and recreates issued56 through the real controller after release68', async () => {
    let raw = release1Raw;
    const storage = { getItem: () => raw, setItem: (_key: string, value: string) => { raw = value; } };
    const controller = createGenerationController({ activePlan: createActivePlanAdapter(() => storage), generation: createVersionedGeneration(sourceApprovedCatalogPorts) });
    try {
      await controller.load();
      expect(raw).toBe(release1Raw);
      const original = controller.getSnapshot().active!.plan;
      const origin = { returnRoute: '/menu', focusAnchor: 'rebuild' };
      await controller.appendVariant(origin);
      expect(controller.getSnapshot().error).toBeNull();
      expect(controller.getSnapshot().active!.plan.variants).toHaveLength(original.variants.length + 1);
      expect(controller.getSnapshot().active!.plan.variants.slice(0, original.variants.length)).toEqual(original.variants);
      await controller.selectVariant(original.variants[1].id, origin);
      const loaded = await createActivePlanAdapter(() => storage).load();
      expect(loaded.status).toBe('loaded');
      if (loaded.status === 'loaded') expect(loaded.bundle.plan.activeVariantId).toBe(original.variants[1].id);
      await controller.recreateSet(origin);
      expect(controller.getSnapshot().error).toBeNull();
      expect(controller.getSnapshot().active!.plan.variants).toHaveLength(3);
      expect(controller.getSnapshot().active!.plan.inputs).toEqual(original.inputs);
      expect(controller.getSnapshot().active!.plan.variants.every(variant => variant.instances.every(row => row.catalogVersion === 'mealplan-2026-11-11-1'))).toBe(true);
    } finally { controller.dispose(); }
  }, 60000);
  it('keeps pcs and ml incompatible while spending known gram stocks once across repeated recipes', () => {
    const ids = ['familiar-oat-pancake-yogurt', 'familiar-steamed-egg-pudding', 'familiar-oat-pancake-yogurt', 'familiar-steamed-egg-pudding'];
    const pantry = (eggUnit: 'pcs' | 'g', milkUnit: 'ml' | 'g', eggAmount: string, milkAmount: string): PantrySnapshotRow[] => [
      { productId: 'egg', quantity: { status: 'known', value: { amount: decimal(eggAmount), unit: eggUnit } }, expiresSoon: false },
      { productId: 'milk', quantity: { status: 'known', value: { amount: decimal(milkAmount), unit: milkUnit } }, expiresSoon: false },
    ];
    const old = projectBreakfastSnack(ids, '2', pantry('pcs', 'ml', '3', '200'));
    expect(old.pantryIssues).toEqual(expect.arrayContaining([
      { productId: 'egg', profileId: 'usda-171287-raw', code: 'INCOMPATIBLE_PANTRY_UNIT' },
      { productId: 'milk', profileId: 'usda-172217-ready', code: 'INCOMPATIBLE_PANTRY_UNIT' },
    ]));
    expect(old.rows.filter(row => ['egg', 'milk'].includes(row.productId)).map(row => formatExact(row.covered.amount))).toEqual(['0', '0']);
    const grams = projectBreakfastSnack(ids, '2', pantry('g', 'g', '150', '200'));
    expect(grams.pantryIssues).toEqual([]);
    for (const [id, required, covered, purchase] of [['egg', '440', '150', '290'], ['milk', '560', '200', '360']]) {
      const row = grams.rows.find(row => row.productId === id)!;
      expect([row.required.amount, row.covered.amount, row.purchase.amount].map(formatExact)).toEqual([required, covered, purchase]);
    }
    const canned = projectBreakfastSnack(['familiar-chickpea-pancakes', 'familiar-bean-tomato-cabbage-salad'], '2', [
      { productId: 'chickpea', quantity: { status: 'known', value: { amount: decimal('500'), unit: 'g' } }, expiresSoon: false },
      { productId: 'bean', quantity: { status: 'known', value: { amount: decimal('500'), unit: 'g' } }, expiresSoon: false },
    ]);
    expect(canned.rows.filter(row => row.productId.endsWith('-canned')).map(row => formatExact(row.covered.amount))).toEqual(['0', '0']);
  });
  it('ships the exact breakfast snack release and preserves the original 56 recipe snapshot', async () => {
    const current = production()!.bundledCatalog;
    expect(current.version).toBe('mealplan-2026-11-11-2');
    expect(current.recipes).toHaveLength(68);
    expect(current.foods).toHaveLength(26);
    const first = validateActiveBundle(JSON.parse(release1Raw).plan);
    expect(first.status).toBe('valid');
    if (first.status !== 'valid') throw new Error('Original56 must remain trusted');
    expect(sourceApprovedCatalogs.find(catalog => catalog.version === 'mealplan-2026-11-11-1')).toEqual(first.bundle.plan.inputs.catalog);
    expect(current.recipes.slice(0, 56)).toEqual(first.bundle.plan.inputs.catalog.recipes);
    expect(current.foods.slice(0, 20)).toEqual(first.bundle.plan.inputs.catalog.foods);
    for (const version of ['mealplan-2026-10-28-1', 'mealplan-2026-11-11-1', 'mealplan-2026-11-11-2']) {
      expect((await sourceApprovedCatalogPorts[version]?.load())?.status).toBe('loaded');
    }
    const generation = createVersionedGeneration(sourceApprovedCatalogPorts);
    const result = await generation.generate({ requestId: 'release1-after68', inputs: first.bundle.plan.inputs }, new AbortController().signal);
    expect(result.status).toBe('success');
    if (result.status === 'success') expect(result.plan.inputs).toEqual(first.bundle.plan.inputs);
  }, 30000);
  it('generates, validates, saves and reloads reviewed no-fish facts without inventing allergen guarantees', async () => {
    const module = production()!;
    const applied = buildAppliedSettings({ ...createDraft(), days: '1', restrictions: ['no-fish'] });
    if (applied.status !== 'applied') throw new Error('Invalid real draft');
    const inputs = createPlanInputs(applied.settings, module.bundledCatalog, { seed: 'real-no-fish-proof' });
    const result = await createLocalGeneration(module.bundledCatalogPort).generate({ requestId: 'no-fish', inputs }, new AbortController().signal);
    expect(result.status).toBe('success');
    if (result.status !== 'success') throw new Error('Expected reviewed no-fish corpus to generate');
    expect(result.plan.variants[0].instances).toHaveLength(4);
    expect(validateActiveBundle(result.plan).status).toBe('valid');
    const values = new Map<string, string>();
    const store = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
    const port = createActivePlanAdapter(() => store);
    expect((await port.load()).status).toBe('missing');
    const saved = await port.save(result.plan, { isCurrent: () => true });
    expect(saved.status).toBe('saved');
    const loaded = await createActivePlanAdapter(() => store).load();
    expect(loaded.status).toBe('loaded');
    if (saved.status !== 'saved' || loaded.status !== 'loaded') throw new Error('Expected round-trip');
    expect(loaded.bundle).toEqual(saved.bundle);
    expect(loaded.bundle.plan.inputs.appliedSettings.restrictions).toEqual(['no-fish']);
    expect(loaded.bundle.projections[0].budget.check.accepted).toBe(true);
    expect(module.bundledCatalog.foods.every(food => food.safety.status === 'known' && food.safety.facts.every(fact => fact.kind === 'restriction'))).toBe(true);
    // The same real corpus cannot certify package-level seafood allergen safety.
    const search = createPlanSearch(inputs, { allergenKeys: ['seafood'] });
    let next = search.next();
    while (!next.done) next = search.next();
    expect(next.value.status).toBe('error');
    if (next.value.status !== 'error') throw new Error('Expected unknown allergy refusal');
    expect(next.value.error.code).toBe('GENERATION_DATA_INCOMPLETE');
    expect(next.value.error.diagnostics.some(row => row.message === 'allergen:seafood')).toBe(true);
  }, 30000);
  it('requires fifty complete genuinely distinct original recipes', async () => {
    expect(production()?.bundledCatalog.recipes.length ?? 0).toBeGreaterThanOrEqual(50);
    const catalog = production()!.bundledCatalog;
    expect(validateCatalog(catalog).status).toBe('loaded');
    expect((await production()!.validateBundledCatalog(catalog)).status).toBe('loaded');
    const fingerprints = catalog.recipes.map(recipe => recipe.ingredients.map(ingredient => `${ingredient.profileId}:${formatExact(divide(ingredient.quantity.amount, recipe.baseServings))}`).sort().join('|'));
    expect(new Set(fingerprints).size).toBe(catalog.recipes.length);
    expect(new Set(catalog.recipes.map(recipe => recipe.steps.join(' '))).size).toBe(catalog.recipes.length);
    expect(new Set(catalog.recipes.map(recipe => recipe.name)).size).toBe(catalog.recipes.length);
    for (const recipe of catalog.recipes) {
      expect(recipe.steps.length).toBeGreaterThanOrEqual(3);
      expect(recipe.steps.join(' ').length).toBeGreaterThan(180);
      expect(recipe.ingredients.length).toBeGreaterThanOrEqual(2);
      expect(recipe.cookingMinutes).toBeGreaterThan(0);
      expect(recipe.source.license).toBe('MealPlan original authored content');
      for (const ingredient of recipe.ingredients) {
        const food = catalog.foods.find(food => food.profileId === ingredient.profileId)!;
        expect(food.productId).toBe(ingredient.productId);
        expect(food.nutrition.status).toBe('known');
        expect(food.price.status).toBe('known');
        expect(food.conversions).toHaveLength(0);
      }
    }
    for (const slot of ['breakfast', 'lunch', 'dinner', 'snack']) expect(catalog.recipes.filter(recipe => recipe.slots.includes(slot as 'breakfast') && recipe.cookingMinutes <= 30).length).toBeGreaterThanOrEqual(10);
  });
  it('rejects an incomplete or tampered production catalog at its source gate', async () => {
    const module = production()!;
    const catalog = module.bundledCatalog;
    expect((await module.validateBundledCatalog({ ...catalog, recipes: catalog.recipes.slice(0, 49) })).status).toBe('invalid');
    expect((await module.validateBundledCatalog({ ...catalog, foods: catalog.foods.map((food, i) => i ? food : { ...food, price: { status: 'unknown', reason: 'missing observed value' } }) })).status).toBe('invalid');
    expect((await module.validateBundledCatalog({ ...catalog, foods: catalog.foods.map((food, i) => i || food.nutrition.status !== 'known' ? food : { ...food, nutrition: { ...food.nutrition, values: { ...food.nutrition.values, calories: '999' } } }) })).status).toBe('invalid');
    expect((await module.bundledCatalogPort.load()).status).toBe('loaded');
  });
  it('rejects malformed original source bases rather than relabeling them as RUB and edible mass', async () => {
    const sources = structuredClone(sourceEvidence);
    sources.prices.records[0].reference.unit = 'pcs';
    sources.prices.records[0].currency = 'USD';
    sources.food.records[0].reference.amount = '1000';
    sources.prices.records[0].evidenceSha256 = '0'.repeat(64);
    expect((await production()!.validateBundledCatalog(production()!.bundledCatalog, sources)).status).toBe('invalid');
  });
  it.each<[string, (sources: typeof sourceEvidence) => void]>([
    ['price currency', sources => { sources.prices.records[0].currency = 'USD'; }],
    ['price reference', sources => { sources.prices.records[0].reference.unit = 'pcs'; }],
    ['nutrition reference', sources => { sources.food.records[0].reference.amount = '1000'; }],
    ['price evidence hash', sources => { sources.prices.records[0].evidenceSha256 = '0'.repeat(64); }],
    ['food evidence hash', sources => { sources.food.records[0].sha256 = '0'.repeat(64); }],
    ['safety product identity', sources => { sources.safety.records[0].productId = 'WRONG'; }],
    ['safety evidence', sources => { sources.safety.records[0].originalEvidence += ' '; }],
    ['nutrient value', sources => { sources.food.records[0].nutrients[0].amount = '999'; }],
    ['price value', sources => { sources.prices.records[0].amount = '1'; }],
  ])('rejects independently malformed %s', async (_, corrupt) => {
    const sources = structuredClone(sourceEvidence);
    corrupt(sources);
    expect((await production()!.validateBundledCatalog(production()!.bundledCatalog, sources)).status).toBe('invalid');
  });
  it('generates all real default slots within the unchanged family budget offline', async () => {
    const module = { bundledCatalog: historicalCatalog, bundledCatalogPort: historicalCatalogPort };
    const applied = buildAppliedSettings(createDraft());
    expect(applied.status).toBe('applied');
    if (applied.status !== 'applied') return;
    const inputs = createPlanInputs(applied.settings, module.bundledCatalog, { seed: 'real-default-proof', now: () => new Date(2026, 9, 28) });
    const result = await createLocalGeneration(module.bundledCatalogPort).generate({ requestId: 'real-corpus', inputs }, new AbortController().signal);
    expect(result.status).toBe('success');
    if (result.status !== 'success') return;
    expect(result.plan.variants[0].instances).toHaveLength(28);
    expect(result.plan.variants[0].instances.every(instance => compare(instance.selectedServings, decimal('2')) === 0)).toBe(true);
    const projected = projectPlan(inputs, result.plan.variants[0]);
    expect(projected.status).toBe('projected');
    if (projected.status !== 'projected') return;
    expect(compare(projected.projection.costs.exact.purchase, decimal('3000'))).toBeLessThanOrEqual(0);
    expect(compare(projected.projection.costs.exact.purchase, decimal('0'))).toBeGreaterThan(0);
    // Independent calculation from literal acquired observations: this seeded plan
    // uses 770g semolina, 238g sugar, 49g salt, 3600g cabbage, 1260g rice,
    // 700g carrot, 1110g flour and 800g potato. Per-person-day divides by14.
    expect(formatExact(projected.projection.costs.exact.purchase)).toBe('461.9293627901234552');
    expect(projected.projection.costs.kopecks.purchase).toBe(46193n);
    expect(formatExact(projected.projection.averagePersonDayNutrition.calories)).toBe('706773/700');
    expect(formatExact(projected.projection.averagePersonDayNutrition.protein)).toBe('371127/14000');
    expect(formatExact(projected.projection.averagePersonDayNutrition.fat)).toBe('33279/14000');
    expect(formatExact(projected.projection.averagePersonDayNutrition.carbohydrates)).toBe('219.2096');
  }, 30000);
  it.each(['gluten-free', 'lactose-free', 'halal'])('never treats unknown %s evidence as safe', async restriction => {
    const module = production()!;
    const draft = { ...createDraft(), days: '1', restrictions: [restriction] };
    const applied = buildAppliedSettings(draft);
    if (applied.status !== 'applied') throw new Error('Invalid real draft');
    const inputs = createPlanInputs(applied.settings, module.bundledCatalog, { seed: 'restriction-proof' });
    const result = await createLocalGeneration(module.bundledCatalogPort).generate({ requestId: restriction, inputs }, new AbortController().signal);
    expect(result.status).toBe('error');
    if (result.status === 'error') expect(result.error.code).toBe('GENERATION_DATA_INCOMPLETE');
  });
});
