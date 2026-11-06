import { describe, expect, it } from 'vitest';
import { bundledCatalog } from './catalog';
import { recipes } from './recipes';
import { getRecipeMedia, mediaCatalogVersion, recipeMedia, recipeMediaIds } from './recipeMedia';

describe('compiled presentation media', () => {
  it('covers exactly 52 factual IDs without changing factual snapshots', () => {
    const before = JSON.stringify(bundledCatalog);
    expect([...recipeMediaIds].sort()).toEqual(recipes.map(r => r.id).sort());
    expect(recipeMediaIds).toHaveLength(52);
    for (const id of recipeMediaIds) {
      const media = getRecipeMedia(mediaCatalogVersion, id)!;
      expect(media.src).toBe(`/recipes/${id}.png`);
      expect(media.width * 3).toBe(media.height * 4);
      expect(Object.isFrozen(media)).toBe(true);
    }
    expect(JSON.stringify(bundledCatalog)).toBe(before);
    expect(JSON.stringify(bundledCatalog)).not.toContain('/recipes/');
    expect(Object.isFrozen(recipeMedia)).toBe(true);
  });
  it('rejects unsupported versions and untrusted keys/URLs', () => {
    for (const id of ['__proto__', 'constructor', '../rice-sweet-porridge', 'https://evil.test/a.png', 'data:image/png;base64,xx', '']) expect(getRecipeMedia(mediaCatalogVersion, id)).toBeUndefined();
    expect(getRecipeMedia('old', 'rice-sweet-porridge')).toBeUndefined();
  });
});
