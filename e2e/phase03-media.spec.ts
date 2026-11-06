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
