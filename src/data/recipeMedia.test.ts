import { describe, expect, it } from 'vitest';
// @ts-expect-error Node runtime API is available to Vitest; project intentionally has no @types/node dependency.
import { spawnSync as nodeSpawn } from 'node:child_process';
// @ts-expect-error Test-only Node runtime API; no browser bundle dependency.
import { readFileSync as nodeRead, writeFileSync as nodeWrite, copyFileSync as nodeCopy, unlinkSync as nodeUnlink } from 'node:fs';
const spawnSync: (command: string, args: string[], options?: { encoding: string }) => { status: number | null; stderr: string; stdout: string } = nodeSpawn;
const readFileSync: (path: string, encoding: string) => string = nodeRead;
const writeFileSync: (path: string, content: string) => void = nodeWrite;
const copyFileSync: (from: string, to: string) => void = nodeCopy;
const unlinkSync: (path: string) => void = nodeUnlink;
import { bundledCatalog } from './catalog';
import { recipes } from './recipes';
import { getRecipeMedia, mediaCatalogVersion, recipeMedia, recipeMediaIds } from './recipeMedia';

describe('compiled presentation media', () => {
  it('covers exactly 52 factual IDs without changing factual snapshots', () => {
    const serialize = () => JSON.stringify(bundledCatalog, (_, value: unknown) => typeof value === 'bigint' ? value.toString() : value);
    const before = serialize();
    expect([...recipeMediaIds].sort()).toEqual(recipes.map(r => r.id).sort());
    expect(recipeMediaIds).toHaveLength(52);
    for (const id of recipeMediaIds) {
      const media = getRecipeMedia(mediaCatalogVersion, id)!;
      expect(media.src).toBe(`/recipes/${id}.png`);
      expect(media.width * 3).toBe(media.height * 4);
      expect(Object.isFrozen(media)).toBe(true);
    }
    expect(serialize()).toBe(before);
    expect(serialize()).not.toContain('/recipes/');
    expect(Object.isFrozen(recipeMedia)).toBe(true);
  });
  it('audits all 52 real outputs and preserves original batch provenance', () => {
    const scoped = spawnSync('node', ['scripts/check-recipe-media.mjs', '--ids', 'rice-sweet-porridge'], { encoding: 'utf8' });
    expect(scoped.status, scoped.stderr).toBe(0);
    expect(JSON.parse(scoped.stdout)).toEqual({ checked: 1, full: false });
    const full = spawnSync('node', ['scripts/check-recipe-media.mjs', '--all'], { encoding: 'utf8' });
    expect(full.status).toBe(0);
    expect(JSON.parse(full.stdout)).toEqual({ checked: 52, full: true });
    const aggregate = JSON.parse(readFileSync('docs/data/recipe-media.json', 'utf8'));
    for (const batch of ['01', '02', '03', '04', '05']) {
      for (const row of JSON.parse(readFileSync(`docs/data/recipe-media-batches/${batch}.json`, 'utf8'))) {
        expect(aggregate.find((item: { recipeId: string }) => item.recipeId === row.recipeId)).toEqual(row);
      }
    }
  });
  it('rejects an extra physical PNG even when all 52 ledger entries are valid', () => {
    const extra = 'public/recipes/03-09-unexpected.png';
    copyFileSync('public/recipes/rice-sweet-porridge.png', extra);
    try {
      const result = spawnSync('node', ['scripts/check-recipe-media.mjs', '--all'], { encoding: 'utf8' });
      expect(result.status).toBe(1);
      expect(result.stderr.trim()).toContain('Physical PNG set');
    } finally { unlinkSync(extra); }
  });
  it('rejects mismatched hash, ratio, path, missing identity and unreviewed provenance', () => {
    const rows = JSON.parse(readFileSync('docs/data/recipe-media.json', 'utf8'));
    const corruptions = [{ sha256: '0'.repeat(64) }, { height: 12 }, { path: '/recipes/../secret.png' }, { provider: '' }, { visualReview: { status: 'rejected' } }, { recipeId: 'missing' }];
    for (const change of corruptions) {
      writeFileSync('.tmp/03-04-corrupt-ledger.json', JSON.stringify([{ ...rows[0], ...change }]));
      const result = spawnSync('node', ['scripts/check-recipe-media.mjs', '--ledger', '.tmp/03-04-corrupt-ledger.json', '--ids', 'rice-sweet-porridge']);
      expect(result.status).toBe(1);
    }
    writeFileSync('.tmp/03-04-corrupt-ledger.json', JSON.stringify([rows[0], rows[0]]));
    expect(spawnSync('node', ['scripts/check-recipe-media.mjs', '--ledger', '.tmp/03-04-corrupt-ledger.json', '--ids', 'rice-sweet-porridge']).status).toBe(1);
  });
  it('rejects unsupported versions and untrusted keys/URLs', () => {
    for (const id of ['__proto__', 'constructor', '../rice-sweet-porridge', 'https://evil.test/a.png', 'data:image/png;base64,xx', '']) expect(getRecipeMedia(mediaCatalogVersion, id)).toBeUndefined();
    expect(getRecipeMedia('old', 'rice-sweet-porridge')).toBeUndefined();
  });
});
