import sourceSnapshot from '../../data/sources/phase031.snapshot.json';
import { createLocalCatalog, validateCatalog } from '../adapters/catalog';
import { immutableSnapshot, sameSnapshot } from '../domain/appliedSettings';
import { catalogError } from '../domain/catalog';
import type { Catalog, CatalogLoadResult, CatalogPort, FoodProfile, SourceReference } from '../domain/catalog';
import { familiarRecipes } from './familiarRecipes';
import { historicalCatalog, historicalCatalogPort } from './historicalCatalog';

const nutrientIds = { calories: '1008', protein: '1003', fat: '1004', carbohydrates: '1005' } as const;
const edible100 = { amount: '100', unit: 'g', basis: 'edible' } as const;
const edibleKg = { amount: '1', unit: 'kg', basis: 'edible' } as const;
const sha256 = async (value: string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))), byte => byte.toString(16).padStart(2, '0')).join('');
type Manifest = typeof sourceSnapshot;
type SourceRow = Manifest['records'][number];
// Reviewed release-specific evidence digests survive adding later manifest rows.
// Each includes exact profile/recipe membership and all original source fields.
const releaseSourceHashes: Readonly<Record<string, string>> = Object.freeze({
  'mealplan-2026-11-11-1': '7e06f5d4ea1dd341571a54cc8fd62fff04988a32f843d0cd637413b4681ab1a3',
});

function foodFromSource(row: SourceRow): FoodProfile {
  const source: SourceReference = { sourceId: 'usda-fdc-sr-legacy', recordId: row.nutrition.food.fdc_id,
    url: `https://fdc.nal.usda.gov/food-details/${row.nutrition.food.fdc_id}/nutrients`, release: 'SR Legacy April 2018', license: 'CC0-1.0',
    archiveUrl: sourceSnapshot.archiveUrl, archiveSha256: sourceSnapshot.archiveSha256 };
  const values = Object.fromEntries(Object.entries(nutrientIds).map(([key, id]) => [key, row.nutrition.nutrients.find(value => value.nutrient_id === id)?.amount]));
  if (Object.values(values).some(value => value === undefined)) throw new Error(`Missing acquired nutrient: ${row.profileId}`);
  return { productId: row.productId, profileId: row.profileId, name: row.name, identity: row.identity, state: row.state, category: row.category, conversions: [],
    nutrition: { status: 'known', reference: edible100, values: values as Record<keyof typeof nutrientIds, string>, source },
    price: { status: 'known', amount: row.price.amount, currency: 'RUB', reference: edibleKg, region: `${row.price.scope}; оценка для ${row.price.targetScope}`,
      observedAt: row.price.observedAt, estimate: true, source: { sourceId: 'mealplan-representative-price-estimates', recordId: row.profileId,
        url: 'https://mealplan.invalid/price-estimates/phase031', release: row.sourceVersion, license: 'MealPlan original estimate policy; attributed numeric retail observations', archiveSha256: row.price.sha256 } },
    safety: { status: 'known', facts: row.safety.facts.map(fact => ({ ...fact, kind: 'restriction', evidence: [{ ...source, sourceId: 'mealplan-reviewed-ingredient-identity',
      recordId: `${row.profileId}-identity`, release: row.sourceVersion, archiveSha256: row.safety.sha256 }] })) },
  };
}

const addedFoods = sourceSnapshot.records.map(foodFromSource);
export const expandedCatalogs: readonly Catalog[] = Object.freeze(sourceSnapshot.releases.map(release => immutableSnapshot({ version: release.version,
  foods: [...historicalCatalog.foods, ...release.profileIds.map(id => {
    const food = addedFoods.find(food => food.profileId === id);
    if (!food) throw new Error(`Unknown release profile: ${id}`);
    return food;
  })],
  recipes: [...historicalCatalog.recipes, ...release.recipeIds.map(id => {
    const recipe = familiarRecipes.find(recipe => recipe.id === id);
    if (!recipe) throw new Error(`Unknown release recipe: ${id}`);
    return recipe;
  })],
})));

/** Numeric source rows, identity safety facts and authored estimates have distinct bases.
 * Historical source rules remain in their original validator.
 */
export async function validateExpandedCatalog(input: Catalog, manifest: Manifest = sourceSnapshot): Promise<CatalogLoadResult> {
  try {
    const checked = validateCatalog(input);
    if (checked.status !== 'loaded') return checked;
    const compiled = expandedCatalogs.find(catalog => catalog.version === checked.catalog.version);
    if (!compiled || !sameSnapshot(checked.catalog, compiled)) return catalogError('SOURCE_CORPUS_GATE_FAILED', 'catalog');
    if (!sameSnapshot(manifest, sourceSnapshot)) return catalogError('SOURCE_MANIFEST_INVALID', 'sources');
    const historical = await historicalCatalogPort.load();
    if (historical.status !== 'loaded') return historical;
    const release = manifest.releases.find(release => release.version === input.version);
    if (!release || new Set(release.profileIds).size !== release.profileIds.length || new Set(release.recipeIds).size !== release.recipeIds.length
      || new Set(manifest.records.map(row => row.profileId)).size !== manifest.records.length) return catalogError('SOURCE_DUPLICATE_PROFILE', 'sources');
    const records = release.profileIds.map(id => manifest.records.find(row => row.profileId === id));
    if (await sha256(JSON.stringify({ release, records })) !== releaseSourceHashes[input.version]) return catalogError('SOURCE_RELEASE_HASH_MISMATCH', 'sources');
    for (const id of release.profileIds) {
      const row = manifest.records.find(row => row.profileId === id);
      const food = checked.catalog.foods.find(food => food.profileId === id);
      if (!row || !food || !sameSnapshot(food, foodFromSource(row))) return catalogError('SOURCE_PROFILE_MISMATCH', id);
      if (row.nutrition.kind !== 'usda' || manifest.archiveSha256 !== 'b80817294b8850530aaedf2e515c02593b1824f763a0ff356e5c2081643e6fd0'
        || manifest.archiveUrl !== 'https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_csv_2018-04.zip'
        || manifest.license !== 'CC0-1.0' || !sameSnapshot(row.reference, edible100) || row.identity !== row.nutrition.food.description
        || !row.mapping || !row.state || !row.nutrition.originalCsv.includes(row.identity)) return catalogError('SOURCE_BASIS_MISMATCH', id);
      if (row.nutrition.nutrients.length !== 4 || new Set(row.nutrition.nutrients.map(value => value.nutrient_id)).size !== 4
        || !Object.values(nutrientIds).every(nid => row.nutrition.nutrients.some(value => value.nutrient_id === nid && value.fdc_id === row.nutrition.food.fdc_id
          && /^\d+(\.\d+)?$/.test(value.amount) && row.nutrition.originalCsv.includes(`"${value.id}","${value.fdc_id}","${value.nutrient_id}","${value.amount}"`)))) return catalogError('SOURCE_NUTRIENT_MISMATCH', id);
      const { originalEvidence: priceEvidence, sha256: priceHash, ...price } = row.price;
      if (!sameSnapshot(JSON.parse(priceEvidence), price) || !sameSnapshot(price.reference, edibleKg) || price.currency !== 'RUB' || price.estimate !== true
        || !price.assessmentDate || !price.scope || !price.targetScope || !price.derivation || !price.assumptions || !price.excerpt || !price.reuseDisposition
        || !/^https:\/\//.test(price.url) || !/^\d+(\.\d+)?$/.test(price.amount) || !/^\d+(\.\d+)?$/.test(price.observedAmount)) return catalogError('SOURCE_PRICE_ESTIMATE_INVALID', id);
      const { originalEvidence: safetyEvidence, sha256: safetyHash, ...safety } = row.safety;
      const expectedFacts = [{ kind: 'restriction', key: 'no-fish', suitable: true }, { kind: 'restriction', key: 'vegetarian', suitable: row.productId !== 'chicken' }];
      if (!sameSnapshot(JSON.parse(safetyEvidence), safety) || safety.identity !== row.identity || !sameSnapshot(safety.facts, expectedFacts)
        || !sameSnapshot(safety.unknown, ['halal', 'gluten-free', 'lactose-free', 'allergen-guarantees']) || !safety.rationale) return catalogError('SOURCE_SAFETY_MISMATCH', id);
      if (await sha256(row.nutrition.originalCsv) !== row.nutrition.sha256 || await sha256(priceEvidence) !== priceHash
        || await sha256(safetyEvidence) !== safetyHash) return catalogError('SOURCE_HASH_MISMATCH', id);
    }
    return checked;
  } catch { return catalogError('SOURCE_MANIFEST_INVALID', 'sources'); }
}

export function expandedCatalogPort(catalog: Catalog): CatalogPort {
  const accepted = validateExpandedCatalog(catalog);
  const delegate = accepted.then(result => createLocalCatalog(result.status === 'loaded' ? result.catalog : null));
  return { async load() { return accepted; },
    async lookup(productId, profileId) { const result = await accepted; return result.status === 'invalid' ? result : (await delegate).lookup(productId, profileId); },
    async evaluate(ingredient) { const result = await accepted; return result.status === 'invalid' ? result : (await delegate).evaluate(ingredient); } };
}
