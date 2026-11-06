import { test, expect } from '@playwright/test';

test('sample decodes a local generated recipe illustration', async ({ page }) => {
  const external: string[] = [];
  page.on('request', request => { if (request.resourceType() === 'image' && !request.url().startsWith('http://127.0.0.1:4173/')) external.push(request.url()); });
  await page.goto('/recipe/rice-sweet-porridge');
  const image = page.locator('img[src="/recipes/rice-sweet-porridge.png"]');
  await expect(image).toBeVisible();
  await expect.poll(() => image.evaluate((node: HTMLImageElement) => node.naturalWidth > 0 && node.naturalWidth * 3 === node.naturalHeight * 4)).toBe(true);
  await expect(page.getByText('Фотоиллюстрация создана с помощью ИИ; внешний вид блюда может отличаться')).toBeVisible();
  expect(external).toEqual([]);
});

// Static expected production groups; absent images fail rather than skip.
const groups: Record<string, readonly string[]> = {
  "batch-01-01": [
    "millet-sweet-porridge",
    "semolina-smooth",
    "buckwheat-carrot-breakfast",
    "rice-carrot-porridge"
  ],
  "batch-01-02": [
    "millet-carrot-mash",
    "semolina-carrot",
    "buckwheat-tomato-breakfast",
    "flour-dry-flatbread"
  ],
  "batch-01-03": [
    "carrot-water-pancakes",
    "potato-rice-breakfast",
    "rice-millet-mix",
    "potato-carrot-soup"
  ],
  "batch-02-01": [
    "cabbage-rice-soup",
    "beet-potato-soup",
    "tomato-rice-soup",
    "buckwheat-potato-soup"
  ],
  "batch-02-02": [
    "millet-cabbage-soup",
    "potato-dumpling-soup",
    "carrot-semolina-soup",
    "beet-rice-pot"
  ],
  "batch-02-03": [
    "buckwheat-tomato-stew",
    "millet-potato-stew",
    "cabbage-potato-braise",
    "carrot-potato-puree"
  ],
  "batch-03-01": [
    "cabbage-buckwheat-pot",
    "rice-cabbage-pan",
    "millet-beet-pot",
    "potato-tomato-braise"
  ],
  "batch-03-02": [
    "beet-cabbage-braise",
    "potato-flour-cakes",
    "cabbage-flour-pancakes",
    "carrot-semolina-cutlets"
  ],
  "batch-03-03": [
    "beet-flour-pancakes",
    "buckwheat-potato-mash",
    "rice-carrot-dinner",
    "millet-tomato-dinner"
  ],
  "batch-04-01": [
    "tomato-carrot-dumplings",
    "cabbage-carrot-salad",
    "tomato-cabbage-salad",
    "carrot-tomato-salad"
  ],
  "batch-04-02": [
    "beet-carrot-raw-salad",
    "carrot-sweet-ribbons",
    "cabbage-beet-salad",
    "tomato-carrot-cabbage-salad"
  ],
  "batch-04-03": [
    "carrot-semolina-pudding",
    "rice-sweet-snack",
    "semolina-small-flatbread",
    "warm-tomato-carrot"
  ],
  "batch-05-01": [
    "beet-sweet-warm",
    "potato-cabbage-mash",
    "beet-tomato-rice"
  ],
  "full-media": [
    "rice-sweet-porridge",
    "millet-sweet-porridge",
    "semolina-smooth",
    "buckwheat-carrot-breakfast",
    "rice-carrot-porridge",
    "millet-carrot-mash",
    "semolina-carrot",
    "buckwheat-tomato-breakfast",
    "flour-dry-flatbread",
    "carrot-water-pancakes",
    "potato-rice-breakfast",
    "rice-millet-mix",
    "potato-carrot-soup",
    "cabbage-rice-soup",
    "beet-potato-soup",
    "tomato-rice-soup",
    "buckwheat-potato-soup",
    "millet-cabbage-soup",
    "potato-dumpling-soup",
    "carrot-semolina-soup",
    "beet-rice-pot",
    "buckwheat-tomato-stew",
    "millet-potato-stew",
    "cabbage-potato-braise",
    "carrot-potato-puree",
    "cabbage-buckwheat-pot",
    "rice-cabbage-pan",
    "millet-beet-pot",
    "potato-tomato-braise",
    "beet-cabbage-braise",
    "potato-flour-cakes",
    "cabbage-flour-pancakes",
    "carrot-semolina-cutlets",
    "beet-flour-pancakes",
    "buckwheat-potato-mash",
    "rice-carrot-dinner",
    "millet-tomato-dinner",
    "tomato-carrot-dumplings",
    "cabbage-carrot-salad",
    "tomato-cabbage-salad",
    "carrot-tomato-salad",
    "beet-carrot-raw-salad",
    "carrot-sweet-ribbons",
    "cabbage-beet-salad",
    "tomato-carrot-cabbage-salad",
    "carrot-semolina-pudding",
    "rice-sweet-snack",
    "semolina-small-flatbread",
    "warm-tomato-carrot",
    "beet-sweet-warm",
    "potato-cabbage-mash",
    "beet-tomato-rice"
  ]
};
for (const [name, ids] of Object.entries(groups)) test(name, async ({ page }) => {
  test.setTimeout(180_000);
  const external: string[] = [];
  page.on('request', r => { if(r.resourceType()==='image' && !r.url().startsWith('http://127.0.0.1:4173/'))external.push(r.url()); });
  for(const id of ids) {
    await page.goto('/recipe/'+id);
    const image=page.locator('img[src="/recipes/'+id+'.png"]');
    await expect(image).toBeVisible();
    await expect.poll(()=>image.evaluate((n: HTMLImageElement)=>n.naturalWidth>0 && n.naturalWidth*3===n.naturalHeight*4)).toBe(true);
  }
  expect(external).toEqual([]);
});
