import { test, expect } from '@playwright/test';

const firstBatch = [
  'familiar-omelet-tomato-bread', 'familiar-milk-oats-apple', 'familiar-syrniki',
  'familiar-cottage-apple-bake', 'familiar-buckwheat-egg-carrot', 'familiar-oat-pancake-yogurt',
  'familiar-chickpea-pancakes', 'familiar-water-oats-apple', 'familiar-chicken-rice-carrot',
  'familiar-chicken-pasta-soup',
];

for (const [name, ids] of [['media-tracer', [firstBatch[0]]], ['media-batch-01', firstBatch]] as const) {
  test(`${name} local recipe heroes decode with disclosure`, async ({ page, context }, testInfo) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width: 360, height: 900 });
    const external: string[] = [];
    await context.route(url => url.origin !== 'http://127.0.0.1:4173', route => route.abort());
    page.on('request', request => {
      if (!request.url().startsWith('http://127.0.0.1:4173/')) external.push(request.url());
    });
    const decoded = [];
    for (const id of ids) {
      await page.goto(`/recipe/${id}`);
      const image = page.locator(`img[src="/recipes/${id}.png"]`);
      await expect(image).toBeVisible();
      const dimensions = await image.evaluate(async (node: HTMLImageElement) => {
        await node.decode();
        return { width: node.naturalWidth, height: node.naturalHeight };
      });
      expect(dimensions.width).toBeGreaterThan(0);
      expect(dimensions.width * 3).toBe(dimensions.height * 4);
      await expect(page.getByRole('img', { name: 'Фото недоступно' })).toHaveCount(0);
      await expect(page.getByText('Фотоиллюстрация создана с помощью ИИ; внешний вид блюда может отличаться')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(360);
      decoded.push({ id, ...dimensions });
      await page.screenshot({ path: `.tmp/phase031-media/${id}-browser.png`, fullPage: true });
    }
    const releases = await page.evaluate(async () => {
      const catalogPath = '/src/data/catalog.ts', mediaPath = '/src/data/recipeMedia.ts';
      const { sourceApprovedCatalogs } = await import(catalogPath);
      const { getRecipeMedia, mediaReleaseIds } = await import(mediaPath);
      return sourceApprovedCatalogs.map((catalog: { version: string; recipes: { id: string }[] }) => ({
        version: catalog.version,
        recipes: catalog.recipes.map(recipe => recipe.id).sort(),
        mediaIds: [...mediaReleaseIds[catalog.version]].sort(),
        historical: getRecipeMedia(catalog.version, 'rice-sweet-porridge')?.src,
      }));
    });
    expect(releases).toHaveLength(5);
    for (const release of releases) {
      expect(release.mediaIds).toEqual(release.recipes);
      expect(release.historical).toBe('/recipes/rice-sweet-porridge.png');
    }
    expect(external).toEqual([]);
    await testInfo.attach('decoded-local-media', { body: JSON.stringify(decoded), contentType: 'application/json' });
  });
}
