import foodSnapshot from '../../data/sources/food.snapshot.json';
import priceSnapshot from '../../data/sources/prices.snapshot.json';
import safetySnapshot from '../../data/sources/safety.snapshot.json';
import { createLocalCatalog, validateCatalog } from '../adapters/catalog';
import { immutableSnapshot, sameSnapshot } from '../domain/appliedSettings';
import { catalogError } from '../domain/catalog';
import type { Catalog, CatalogLoadResult, CatalogPort, FoodProfile, SourceReference } from '../domain/catalog';
import { recipes } from './recipes';

const categories: Readonly<Record<string, string>> = {
  potato: 'Овощи', tomato: 'Овощи', carrot: 'Овощи', cabbage: 'Овощи', beet: 'Овощи',
  rice: 'Крупы и мука', buckwheat: 'Крупы и мука', millet: 'Крупы и мука', semolina: 'Крупы и мука', flour: 'Крупы и мука',
  salt: 'Бакалея', sugar: 'Бакалея',
};
const foods: readonly FoodProfile[] = foodSnapshot.records.map(record => {
  const price = priceSnapshot.records.find(row => row.profileId === record.profileId);
  const safety = safetySnapshot.records.find(row => row.profileId === record.profileId);
  const source: SourceReference = { sourceId: 'usda-fdc-sr-legacy', recordId: record.food.fdc_id,
    url: `https://fdc.nal.usda.gov/food-details/${record.food.fdc_id}/nutrients`, release: 'SR Legacy April 2018', license: 'CC0-1.0',
    archiveUrl: foodSnapshot.archiveUrl, archiveSha256: foodSnapshot.archiveSha256 };
  const nutrient = (id: string) => record.nutrients.find(row => row.nutrient_id === id)?.amount;
  const values = { calories: nutrient('1008'), protein: nutrient('1003'), fat: nutrient('1004'), carbohydrates: nutrient('1005') };
  const complete = Object.values(values).every((value): value is string => typeof value === 'string');
  return { productId: record.productId, profileId: record.profileId, name: record.name,
    identity: record.food.description, state: 'raw', category: categories[record.productId], conversions: [],
    nutrition: complete ? { status: 'known', reference: { amount: '100', unit: 'g', basis: 'edible' },
      values: values as Record<keyof typeof values, string>, source } : { status: 'unknown', reason: 'Отсутствует обязательный исходный нутриент' },
    price: price ? { status: 'known', amount: price.amount, currency: 'RUB', reference: { amount: '1', unit: 'kg', basis: 'edible' },
      region: price.scope, observedAt: price.observedAt, estimate: true,
      source: { sourceId: price.sourceId, recordId: price.recordId, url: price.url, release: price.observedAt,
        license: price.reuseDisposition, archiveSha256: price.sourceSha256 } } : { status: 'unknown', reason: 'Нет совместимого ценового наблюдения' },
    safety: safety ? { status: 'known', facts: safety.facts.map(fact => ({ kind: 'restriction', key: fact.key, suitable: fact.suitable,
      evidence: [{ ...source, sourceId: 'mealplan-reviewed-usda-identity', recordId: `${record.food.fdc_id}-identity`,
        release: safetySnapshot.version, archiveSha256: safety.evidenceSha256 }] })) } : { status: 'unknown', reason: 'Нет проверенной классификации' },
  };
});
export const historicalCatalog: Catalog = immutableSnapshot({ version: 'mealplan-2026-10-28-1', foods, recipes });

/** Production acceptance is deliberately stronger than structural CatalogPort validity.
 * Synthetic algorithm fixtures keep using createLocalCatalog; production consumers
 * receive this port, which accepts only the complete reviewed source/corpus snapshot.
 */
type SourceSnapshots = { food: typeof foodSnapshot; prices: typeof priceSnapshot; safety: typeof safetySnapshot };
const sha256 = async (value: string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))), byte => byte.toString(16).padStart(2, '0')).join('');
/** The original evidence is a separate trust boundary: never silently relabel
 * malformed units, currencies or numeric bases while constructing runtime facts.
 * WebCrypto failure also fails closed; there is no unhashed production fallback.
 */
export async function validateHistoricalCatalog(input: Catalog, sources: SourceSnapshots = { food: foodSnapshot, prices: priceSnapshot, safety: safetySnapshot }): Promise<CatalogLoadResult> {
  try {
  const checked = validateCatalog(input);
  if (checked.status !== 'loaded') return checked;
  if (checked.catalog.recipes.length < 50 || !sameSnapshot(checked.catalog, historicalCatalog)) return catalogError('SOURCE_CORPUS_GATE_FAILED', 'catalog');
  if (sources.food.archiveSha256 !== 'b80817294b8850530aaedf2e515c02593b1824f763a0ff356e5c2081643e6fd0'
    || sources.food.license !== 'CC0-1.0'
    || [sources.food.records.length, sources.prices.records.length, sources.safety.records.length].some(count => count !== checked.catalog.foods.length)) return catalogError('SOURCE_MANIFEST_INVALID', 'sources');
  const unique = (rows: readonly { profileId: string }[]) => new Set(rows.map(row => row.profileId)).size === rows.length;
  if (![sources.food.records, sources.prices.records, sources.safety.records].every(unique)) return catalogError('SOURCE_DUPLICATE_PROFILE', 'sources');
  for (const food of checked.catalog.foods) {
    if (food.nutrition.status !== 'known' || food.price.status !== 'known' || food.safety.status !== 'known') return catalogError('SOURCE_FACTS_INCOMPLETE', food.profileId);
    const raw = sources.food.records.find(row => row.profileId === food.profileId);
    const price = sources.prices.records.find(row => row.profileId === food.profileId);
    const safety = sources.safety.records.find(row => row.profileId === food.profileId);
    if (!raw || !price || !safety || !raw.originalCsv || !raw.mapping || !price.originalEvidence || !price.reuseDisposition
      || !price.scope || !safety.originalEvidence || safety.fdcId !== raw.food.fdc_id
      || raw.productId !== food.productId || safety.productId !== food.productId || price.productId !== food.productId
      || ![raw.sha256, price.sourceSha256, price.evidenceSha256, safety.evidenceSha256].every(hash => /^[a-f0-9]{64}$/.test(hash))) return catalogError('SOURCE_EVIDENCE_INCOMPLETE', food.profileId);
    if (!sameSnapshot(raw.reference, { amount: '100', unit: 'g', basis: 'edible' })
      || !sameSnapshot(price.reference, { amount: '1', unit: 'kg', basis: 'edible' })
      || price.currency !== 'RUB' || price.amount !== food.price.amount || price.scope !== food.price.region || price.observedAt !== food.price.observedAt
      || raw.food.description !== food.identity || raw.food.fdc_id !== food.nutrition.source.recordId
      || price.sourceSha256 !== food.price.source.archiveSha256 || price.url !== food.price.source.url
      || price.recordId !== food.price.source.recordId || price.sourceId !== food.price.source.sourceId
      || !/^2026-10-28/.test(price.accessedAt) || !price.originalEvidence.includes(price.amount)) return catalogError('SOURCE_BASIS_MISMATCH', food.profileId);
    const keys = { calories: '1008', protein: '1003', fat: '1004', carbohydrates: '1005' } as const;
    const nutritionValues = food.nutrition.values;
    if (raw.nutrients.length !== 4 || new Set(raw.nutrients.map(row => row.nutrient_id)).size !== 4
      || !Object.entries(keys).every(([key, id]) => raw.nutrients.some(row => row.nutrient_id === id && row.fdc_id === raw.food.fdc_id
        && row.amount === nutritionValues[key as keyof typeof keys]
        && raw.originalCsv.includes(`"${row.id}","${row.fdc_id}","${row.nutrient_id}","${row.amount}"`)))
      || !raw.originalCsv.includes(raw.food.description)) return catalogError('SOURCE_NUTRIENT_MISMATCH', food.profileId);
    const identity = JSON.parse(safety.originalEvidence);
    if (!sameSnapshot(identity.food, raw.food) || !sameSnapshot(identity.category, raw.category)
      || !sameSnapshot(safety.facts, [{ key: 'no-fish', suitable: true }, { key: 'vegetarian', suitable: true }])
      || !sameSnapshot(safety.unknown, ['halal', 'gluten-free', 'lactose-free'])
      || !safety.rationale || !raw.mapping || safety.url !== food.nutrition.source.url) return catalogError('SOURCE_SAFETY_MISMATCH', food.profileId);
    if (await sha256(raw.originalCsv) !== raw.sha256 || await sha256(price.originalEvidence) !== price.evidenceSha256
      || await sha256(safety.originalEvidence) !== safety.evidenceSha256) return catalogError('SOURCE_HASH_MISMATCH', food.profileId);
  }
  return checked;
  } catch { return catalogError('SOURCE_MANIFEST_INVALID', 'sources'); }
}
const accepted = validateHistoricalCatalog(historicalCatalog);
const delegate = accepted.then(result => createLocalCatalog(result.status === 'loaded' ? result.catalog : null));
export const historicalCatalogPort: CatalogPort = {
  async load() { return accepted; },
  async lookup(productId, profileId) { const result = await accepted; return result.status === 'invalid' ? result : (await delegate).lookup(productId, profileId); },
  async evaluate(ingredient) { const result = await accepted; return result.status === 'invalid' ? result : (await delegate).evaluate(ingredient); },
};

