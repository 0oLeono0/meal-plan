import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJson = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const source = fs.readFileSync(path.join(root, 'src/data/recipeMedia.ts'), 'utf8');
const historicalIds = JSON.parse(source.match(/recipeMediaIds = (\[[\s\S]*?\]) as const/)[1]);
const historicalVersion = source.match(/mediaCatalogVersion = '([^']+)'/)[1];
const releases = readJson('data/sources/phase031.snapshot.json').releases;
export const releaseIds = Object.freeze({ [historicalVersion]: historicalIds,
  ...Object.fromEntries(releases.map(release => [release.version, [...historicalIds, ...release.recipeIds]])) });
const currentVersion = releases[releases.length - 1].version;
export const expectedIds = [...new Set(Object.values(releaseIds).flat())];
const historicalRows = readJson('docs/data/recipe-media.json');
if (crypto.createHash('sha256').update(JSON.stringify(historicalRows)).digest('hex') !== 'dc2f7240026a032d6d6b5246e535d39ce8e6b17e71155ce338650bb209758dcb') throw Error('Historical provenance ledger changed');

export function auditMedia(rows, ids, version = currentVersion, requireFull = false) {
  if (!Object.hasOwn(releaseIds, version)) throw Error('Unsupported media version');
  if (!Array.isArray(rows) || !Array.isArray(ids) || !ids.length || new Set(ids).size !== ids.length) throw Error('Invalid requested IDs/ledger');
  const selectedIds = releaseIds[version];
  if (ids.some(id => !selectedIds.includes(id))) throw Error('Unexpected ID for selected version');
  const full = requireFull;
  const physical = fs.readdirSync(path.join(root, 'public/recipes'), { recursive: true }).filter(file => file.toLowerCase().endsWith('.png')).sort();
  const expected = expectedIds.map(id => `${id}.png`).sort();
  if (physical.some(file => !expected.includes(file)) || (full && (physical.length !== expected.length || physical.some((file, i) => file !== expected[i])))) throw Error('Physical PNG set must match supported union of 82 recipe IDs');
  const hashes = new Set();
  const requested = new Set(ids);
  const contained = fs.realpathSync(path.join(root, 'public/recipes')) + path.sep;
  const identities = new Set();
  const paths = new Set();
  // Validate all supplied rows, so nonselected entries cannot conceal duplicates.
  for (const row of rows) {
    const id = row?.recipeId;
    if (!expectedIds.includes(id) || identities.has(id) || paths.has(row.path)) throw Error(`Missing/duplicate/unexpected ledger ID or path: ${id}`);
    identities.add(id); paths.add(row.path);
    const sourceVersion = historicalIds.includes(id) ? historicalVersion : releases.find(release => release.recipeIds.includes(id))?.version;
    if (row.catalogVersion !== sourceVersion || row.path !== `/recipes/${id}.png` || row.generated !== true) throw Error(`Untrusted association: ${id}`);
    if (historicalIds.includes(id) && !isDeepStrictEqual(row, historicalRows.find(original => original.recipeId === id))) throw Error(`Historical provenance changed: ${id}`);
    if (!historicalIds.includes(id)) {
      const supported = releases.filter(release => release.recipeIds.includes(id)).map(release => release.version);
      if (JSON.stringify(row.supportedCatalogVersions) !== JSON.stringify(supported)) throw Error(`Wrong supported versions: ${id}`);
    }
    for (const key of ['originalArtifact', 'prompt', 'generatedAt', 'provider', 'termsUrl', 'effectiveDate']) if (typeof row[key] !== 'string' || !row[key].trim()) throw Error(`Missing provenance ${key}: ${id}`);
    if (!Number.isFinite(Date.parse(row.generatedAt)) || !row.termsUrl.startsWith('https://') || row.visualReview?.status !== 'accepted' || !row.visualReview.notes?.trim() || !Number.isFinite(Date.parse(row.visualReview.reviewedAt))) throw Error(`Unreviewed provenance: ${id}`);
    if (typeof row.sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(row.sha256) || hashes.has(row.sha256)) throw Error(`Invalid or duplicate ledger hash: ${id}`);
    hashes.add(row.sha256);
    if (!full && !requested.has(id)) continue;
    const file = path.resolve(root, `public${row.path}`);
    if (!fs.realpathSync(file).startsWith(contained)) throw Error(`Path escapes assets: ${id}`);
    const png = fs.readFileSync(file);
    if (png.length < 33 || png.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a' || png.readUInt32BE(8) !== 13 || png.subarray(12, 16).toString() !== 'IHDR') throw Error(`Invalid PNG header: ${id}`);
    const width = png.readUInt32BE(16), height = png.readUInt32BE(20);
    if (!width || !height || width * 3 !== height * 4 || width !== row.width || height !== row.height) throw Error(`Invalid dimensions: ${id}`);
    const hash = crypto.createHash('sha256').update(png).digest('hex');
    if (hash !== row.sha256 || (row.bytes !== undefined && row.bytes !== png.length)) throw Error(`Hash/duplicate/size mismatch: ${id}`);
  }
  for (const id of ids) if (!identities.has(id)) throw Error(`Missing ledger ID: ${id}`);
  if (full && (rows.length !== expectedIds.length || ids.length !== selectedIds.length)) throw Error('Full mode requires exactly 82 entries');
  return { checked: ids.length, full };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    const version = args.includes('--version') ? args[args.indexOf('--version') + 1] : currentVersion;
    if (!Object.hasOwn(releaseIds, version)) throw Error('Unsupported media version');
    const rows = args.includes('--ledger') ? readJson(args[args.indexOf('--ledger') + 1])
      : [...readJson('docs/data/recipe-media.json'), ...readJson('docs/data/recipe-media-031.json')];
    const ids = args.includes('--ids') ? args[args.indexOf('--ids') + 1].split(',') : args.includes('--all') || args.includes('--version') ? releaseIds[version] : [];
    if (args.includes('--all') && (version !== currentVersion || args.includes('--ids'))) throw Error('--all requires the complete current release');
    console.log(JSON.stringify(auditMedia(rows, ids, version, args.includes('--all'))));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
