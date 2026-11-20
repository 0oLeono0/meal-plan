import { describe, expect, it } from 'vitest';
import { bundledCatalog, bundledCatalogPort, sourceApprovedCatalogs } from './catalog';
import { trustedCatalogs } from '../adapters/trustedCatalogs';
import legacy from '../test/fixtures/phase02-active-plan-v1.json';
import { validateActiveBundle } from '../adapters/activePlan';
import manifest from '../../data/sources/phase031.snapshot.json';
import { validateExpandedCatalog } from './catalogExpansion';
import { historicalCatalog, validateHistoricalCatalog } from './catalog';

describe('immutable source-approved release expansion', () => {
  it('pins recipe contents for every published catalog version', async () => {
    const versions = [];
    for (const { version, recipes } of sourceApprovedCatalogs) {
      const payload = JSON.stringify(recipes, (_, value: unknown) =>
        typeof value === 'bigint' ? value.toString() : value);
      const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(payload));
      const sha256 = Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
      versions.push([version, sha256]);
    }
    expect(Object.fromEntries(versions)).toEqual({
      'mealplan-2026-10-28-1': '8a278e5f30878afafe3a283dd0751b5a259c407fbe54f926a63cc0637590c2a8',
      'mealplan-2026-11-11-1': '2516287fb2b899e555167f6facfe7494a5b1c100583ddf1347850579454aaa90',
      'mealplan-2026-11-11-2': '2011733d0aab25c3089c88fd1bfe63776ba1acef8916ccad03e355441d8e8e89',
      'mealplan-2026-11-11-3': 'a9ab154426c10f8bdb205c0cebb887692023e1b3872c982335925e44821c2056',
      'mealplan-2026-11-11-4': '3bb1b6a00cd112f543c08253201530a76e65841ed14c0022dd5a497e7d897dc2',
    });
  });

  it('ships four original recipes and keeps all original historical facts', async () => {
    const firstRelease = sourceApprovedCatalogs.find(catalog => catalog.version === 'mealplan-2026-11-11-1')!;
    expect(firstRelease.recipes).toHaveLength(56);
    expect(firstRelease.foods).toHaveLength(20);
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
      (data: typeof manifest) => { data.records[0].nutrition.nutrients![0].amount = '999'; },
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
