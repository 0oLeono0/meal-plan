import { describe, expect, it } from 'vitest';
import { bundledCatalog, bundledCatalogPort } from './catalog';
import { trustedCatalogs } from '../adapters/trustedCatalogs';
import legacy from '../test/fixtures/phase02-active-plan-v1.json';
import { validateActiveBundle } from '../adapters/activePlan';
import manifest from '../../data/sources/phase031.snapshot.json';
import { validateExpandedCatalog } from './catalogExpansion';
import { historicalCatalog, validateHistoricalCatalog } from './catalog';

describe('immutable source-approved release expansion', () => {
  it('ships four original recipes and keeps all original historical facts', async () => {
    expect(bundledCatalog.version).toBe('mealplan-2026-11-11-1');
    expect(bundledCatalog.recipes).toHaveLength(56);
    expect(bundledCatalog.foods).toHaveLength(20);
    const old = validateActiveBundle(legacy.plan);
    expect(old.status).toBe('valid');
    if (old.status !== 'valid') throw new Error('Invalid original fixture');
    expect(trustedCatalogs.validate(old.bundle.plan.inputs.catalog).status).toBe('trusted');
    expect(bundledCatalog.recipes.slice(0, 52)).toEqual(old.bundle.plan.inputs.catalog.recipes);
    expect(bundledCatalog.foods.slice(0, 12)).toEqual(old.bundle.plan.inputs.catalog.foods);
    expect((await bundledCatalogPort.load()).status).toBe('loaded');
    const altered = { ...bundledCatalog, foods: bundledCatalog.foods.map(food => food.productId === 'egg' && food.nutrition.status === 'known'
      ? { ...food, nutrition: { ...food.nutrition, values: { ...food.nutrition.values, calories: '999' } } } : food) };
    expect(trustedCatalogs.validate(altered).status).toBe('invalid');
  });
  it('rejects independently changed evidence, units, safety and current runtime facts', async () => {
    expect((await validateHistoricalCatalog(historicalCatalog)).status).toBe('loaded');
    for (const mutate of [
      (data: typeof manifest) => { data.records[0].nutrition.nutrients[0].amount = '999'; },
      (data: typeof manifest) => { data.records[0].nutrition.originalCsv += ' '; },
      (data: typeof manifest) => { data.records[0].price.reference.unit = 'ml'; },
      (data: typeof manifest) => { data.records[0].price.originalEvidence += ' '; },
      (data: typeof manifest) => { data.records[0].price.targetScope = ''; },
      (data: typeof manifest) => { data.records[0].safety.facts[0].suitable = false; },
      (data: typeof manifest) => { data.records[0].state = 'cooked'; },
      (data: typeof manifest) => { data.releases[0].profileIds.pop(); },
    ]) {
      const changed = structuredClone(manifest);
      mutate(changed);
      expect((await validateExpandedCatalog(bundledCatalog, changed)).status).toBe('invalid');
    }
    expect((await validateExpandedCatalog({ ...bundledCatalog, recipes: bundledCatalog.recipes.slice(0, 52) })).status).toBe('invalid');
  });
});
