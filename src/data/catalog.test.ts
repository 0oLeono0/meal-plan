import { describe, expect, it } from 'vitest';
import { buildAppliedSettings } from '../domain/appliedSettings';
import { createDraft } from '../domain/settings';
import { createPlanInputs } from '../domain/plan';
import { createLocalGeneration } from '../adapters/generation';
import { validateCatalog } from '../adapters/catalog';
import { compare, decimal } from '../domain/quantities';
import { projectPlan } from '../domain/planProjection';
import type { Catalog } from '../domain/catalog';

const modules = import.meta.glob('./catalog.ts', { eager: true });
// An absent production catalog is an assertion failure, never an import/discovery error.
const production = () => modules['./catalog.ts'] as { bundledCatalog: Catalog; bundledCatalogPort: Parameters<typeof createLocalGeneration>[0]; validateBundledCatalog: (input: Catalog) => ReturnType<typeof validateCatalog> } | undefined;
describe('source-backed production corpus', () => {
  it('requires fifty complete genuinely distinct original recipes', () => {
    expect(production()?.bundledCatalog.recipes.length ?? 0).toBeGreaterThanOrEqual(50);
    const catalog = production()!.bundledCatalog;
    expect(validateCatalog(catalog).status).toBe('loaded');
    expect(production()!.validateBundledCatalog(catalog).status).toBe('loaded');
    const fingerprints = catalog.recipes.map(recipe => recipe.ingredients.map(ingredient => `${ingredient.profileId}:${ingredient.quantity.amount.numerator}/${ingredient.quantity.amount.denominator}/${recipe.baseServings.numerator}`).sort().join('|'));
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
    expect(module.validateBundledCatalog({ ...catalog, recipes: catalog.recipes.slice(0, 49) }).status).toBe('invalid');
    expect(module.validateBundledCatalog({ ...catalog, foods: catalog.foods.map((food, i) => i ? food : { ...food, price: { status: 'unknown', reason: 'missing observed value' } }) }).status).toBe('invalid');
    expect(module.validateBundledCatalog({ ...catalog, foods: catalog.foods.map((food, i) => i || food.nutrition.status !== 'known' ? food : { ...food, nutrition: { ...food.nutrition, values: { ...food.nutrition.values, calories: '999' } } }) }).status).toBe('invalid');
    expect((await module.bundledCatalogPort.load()).status).toBe('loaded');
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
