import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(root, 'src/data/recipeMedia.ts'), 'utf8');
export const expectedIds = JSON.parse(source.match(/recipeMediaIds = (\[[\s\S]*?\]) as const/)[1]);
const version = source.match(/mediaCatalogVersion = '([^']+)'/)[1];
export function auditMedia(rows, ids) {
  if (!Array.isArray(rows) || !Array.isArray(ids) || !ids.length || new Set(ids).size !== ids.length) throw Error('Invalid requested IDs/ledger');
  const hashes = new Set();
  for (const id of ids) {
    if (!expectedIds.includes(id)) throw Error(`Unexpected ID: ${id}`);
    const matches = rows.filter(row => row?.recipeId === id);
    if (matches.length !== 1) throw Error(`Missing/duplicate ledger ID: ${id}`);
    const row = matches[0];
    if (row.catalogVersion !== version || row.path !== `/recipes/${id}.png` || row.generated !== true) throw Error(`Untrusted association: ${id}`);
    for (const key of ['originalArtifact', 'prompt', 'generatedAt', 'provider', 'termsUrl', 'effectiveDate']) if (typeof row[key] !== 'string' || !row[key].trim()) throw Error(`Missing provenance ${key}: ${id}`);
    if (!Number.isFinite(Date.parse(row.generatedAt)) || !row.termsUrl.startsWith('https://') || row.visualReview?.status !== 'accepted' || !row.visualReview.notes?.trim() || !Number.isFinite(Date.parse(row.visualReview.reviewedAt))) throw Error(`Unreviewed provenance: ${id}`);
    const file = path.resolve(root, `public${row.path}`);
    const contained = fs.realpathSync(path.join(root, 'public/recipes')) + path.sep;
    if (!fs.realpathSync(file).startsWith(contained)) throw Error(`Path escapes assets: ${id}`);
    const png = fs.readFileSync(file);
    if (png.length < 33 || png.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a' || png.readUInt32BE(8) !== 13 || png.subarray(12, 16).toString() !== 'IHDR') throw Error(`Invalid PNG header: ${id}`);
    const width = png.readUInt32BE(16), height = png.readUInt32BE(20);
    if (!width || !height || width * 3 !== height * 4 || width !== row.width || height !== row.height) throw Error(`Invalid dimensions: ${id}`);
    const hash = crypto.createHash('sha256').update(png).digest('hex');
    if (hash !== row.sha256 || hashes.has(hash) || (row.bytes !== undefined && row.bytes !== png.length)) throw Error(`Hash/duplicate/size mismatch: ${id}`);
    hashes.add(hash);
  }
  return { checked: ids.length, full: ids.length === 52 && expectedIds.every(id => ids.includes(id)) };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    const ledger = args.includes('--ledger') ? args[args.indexOf('--ledger') + 1] : 'docs/data/recipe-media.json';
    const rows = JSON.parse(fs.readFileSync(path.resolve(root, ledger), 'utf8'));
    const ids = args.includes('--all') ? expectedIds : args.includes('--ids') ? args[args.indexOf('--ids') + 1].split(',') : [];
    if (args.includes('--all') && (rows.length !== 52 || rows.some(row => !expectedIds.includes(row.recipeId)))) throw Error('Full mode requires exactly 52 entries');
    console.log(JSON.stringify(auditMedia(rows, ids)));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
