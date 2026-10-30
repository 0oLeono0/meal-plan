import { describe, expect, it } from 'vitest';
import { buildAppliedSettings } from '../domain/appliedSettings';
import { createDraft } from '../domain/settings';
import { createPlanInputs } from '../domain/plan';
import { createLocalGeneration } from '../adapters/generation';
import { createActivePlanAdapter, validateActiveBundle } from '../adapters/activePlan';
import { createPlanSearch } from '../domain/generatePlan';
import { validateCatalog } from '../adapters/catalog';
import { compare, decimal, divide, formatExact } from '../domain/quantities';
import { projectPlan } from '../domain/planProjection';
import type { Catalog } from '../domain/catalog';
import foodEvidence from '../../data/sources/food.snapshot.json';
import priceEvidence from '../../data/sources/prices.snapshot.json';
import safetyEvidence from '../../data/sources/safety.snapshot.json';

const sourceEvidence = { food: foodEvidence, prices: priceEvidence, safety: safetyEvidence };

const modules = import.meta.glob('./catalog.ts', { eager: true });
// An absent production catalog is an assertion failure, never an import/discovery error.
const production = () => modules['./catalog.ts'] as { bundledCatalog: Catalog; bundledCatalogPort: Parameters<typeof createLocalGeneration>[0]; validateBundledCatalog: (input: Catalog, sources?: typeof sourceEvidence) => Promise<ReturnType<typeof validateCatalog>> } | undefined;
describe('source-backed production corpus', () => {
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
    const module = production()!;
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
