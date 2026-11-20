import { describe, expect, it } from 'vitest';
import manifest from '../../data/sources/phase031.snapshot.json';
import { bundledCatalog, sourceApprovedCatalogs } from './catalog';
import { validateExpandedCatalog } from './catalogExpansion';
const originals = import.meta.glob('../../data/sources/*.snapshot.json', { query: '?raw', import: 'default', eager: true });
const read = (name: string) => JSON.parse(String(originals[`../../data/sources/${name}.snapshot.json`]));
const hash = async (value: string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))), byte => byte.toString(16).padStart(2, '0')).join('');
describe('archived primary sources', () => {
  it('rejects independent source basis price identity safety and hash mutations for every new profile', async () => {
    for (const [index, original] of manifest.records.entries()) {
      const mutations: ((data: typeof manifest) => void)[] = [
        data => { data.records[index].state = 'wrong-cooked-state'; },
        data => { data.records[index].reference.amount = '1'; },
        data => { data.records[index].price.currency = 'USD'; },
        data => { data.records[index].price.observedQuantity.unit = 'pcs'; },
        data => { data.records[index].price.observedAt = '2000-01-01'; },
        data => { data.records[index].price.scope = 'unverified scope'; },
        data => { data.records[index].price.amount = '0.01'; },
        data => { data.records[index].price.sha256 = '0'.repeat(64); },
        data => { data.records[index].nutrition.sha256 = '0'.repeat(64); },
        data => { const row = data.records[index]; if (row.nutrition.nutrients) row.nutrition.nutrients[0].amount = '999'; else row.nutrition.values!.calories = '999'; },
        data => { data.records[index].safety.facts[0].suitable = !original.safety.facts[0].suitable; },
        data => { data.records[index].safety.unknown = []; },
        data => { data.records[index].safety.sha256 = '0'.repeat(64); },
        data => { data.records.splice(index, 1); },
        data => { data.records.push(data.records[index]); },
      ];
      for (const mutate of mutations) {
        const changed = structuredClone(manifest);
        mutate(changed);
        expect((await validateExpandedCatalog(bundledCatalog, changed)).status, original.profileId).toBe('invalid');
      }
      expect(original.safety.unknown).toEqual(['halal', 'gluten-free', 'lactose-free', 'allergen-guarantees']);
      expect(original.safety.facts.map(fact => [fact.kind, fact.key, fact.suitable])).toEqual([
        ['restriction', 'no-fish', !['pollock', 'cod'].includes(original.productId)],
        ['restriction', 'vegetarian', !['chicken', 'turkey', 'pollock', 'cod', 'beef-mince', 'pork'].includes(original.productId)],
      ]);
    }
  });
  it('rejects stale final release membership and forged pork cooking guidance', async () => {
    for (const mutate of [
      (data: typeof manifest) => { data.releases[3].recipeIds.pop(); },
      (data: typeof manifest) => { data.releases[3].profileIds.push(data.releases[3].profileIds[0]); },
      (data: typeof manifest) => { data.releases[3].version = 'unreviewed-version'; },
      (data: typeof manifest) => { data.porkCookingGuidance.temperatureC = '40'; },
      (data: typeof manifest) => { data.porkCookingGuidance.restMinutes = '0'; },
    ]) {
      const changed = structuredClone(manifest);
      mutate(changed);
      expect((await validateExpandedCatalog(bundledCatalog, changed)).status).toBe('invalid');
    }
    expect(manifest.porkCookingGuidance).toMatchObject({ temperatureC: '63', restMinutes: '3' });
    expect(await hash(manifest.porkCookingGuidance.originalEvidence)).toBe(manifest.porkCookingGuidance.sha256);
  });
  it('pins final82 dinners membership and independent raw pork source facts', async () => {
    const data = read('phase031');
    const pork = data.records.find((row: { productId: string }) => row.productId === 'pork');
    expect(pork, 'the final raw edible pork profile must be acquired').toBeDefined();
    expect(pork.profileId).toBe('usda-168249-raw');
    expect(pork.identity).toBe('Pork, fresh, loin, tenderloin, separable lean only, raw');
    expect(pork.state).toBe('raw');
    expect(pork.reference).toEqual({ amount: '100', unit: 'g', basis: 'edible' });
    expect(['1008', '1003', '1004', '1005'].map(id => pork.nutrition.nutrients.find((n: { nutrient_id: string }) => n.nutrient_id === id).amount)).toEqual(['109', '20.95', '2.17', '0']);
    expect(await hash(pork.nutrition.originalCsv)).toBe(pork.nutrition.sha256);
    expect(pork.price).toMatchObject({ amount: '600', observedAmount: '549', currency: 'RUB', scope: 'Санкт-Петербург, интернет-витрина МясоСторе', targetScope: 'Санкт-Петербург', observedAt: '2026-11-13', estimate: true });
    expect(pork.safety.facts.map((fact: { suitable: boolean }) => fact.suitable)).toEqual([true, false]);
    expect(data.records).toHaveLength(20);
    expect(data.records.filter((row: { nutrition: { kind: string } }) => row.nutrition.kind === 'usda')).toHaveLength(19);
    expect(bundledCatalog.version).toBe('mealplan-2026-11-11-4');
    expect(bundledCatalog.recipes).toHaveLength(82);
    expect(bundledCatalog.foods).toHaveLength(32);
    const issued75 = sourceApprovedCatalogs.find(catalog => catalog.version === 'mealplan-2026-11-11-3')!;
    expect(bundledCatalog.recipes.slice(0, 75)).toEqual(issued75.recipes);
    expect(bundledCatalog.foods.slice(0, 31)).toEqual(issued75.foods);
    expect(bundledCatalog.recipes.slice(75).map(recipe => recipe.id)).toEqual(['pollock-yogurt-buckwheat', 'pork-potato-cabbage', 'lazy-cabbage-rolls', 'turkey-pasta-tomato', 'chickpea-tomato-rice', 'bean-potato-stew', 'potato-tomato-frittata'].map(id => `familiar-${id}`));
    expect((await validateExpandedCatalog(bundledCatalog)).status).toBe('loaded');
  });
  it('pins five lunch raw dry profiles and complete issued75 membership', async () => {
    const data = read('phase031');
    for (const [productId, fdcId, state, values, price] of [
      ['turkey', '174515', 'raw', ['114', '23.34', '2.33', '0'], '850'],
      ['pollock', '173725', 'raw', ['76', '17.17', '0.82', '0'], '820'],
      ['cod', '171955', 'raw', ['82', '17.81', '0.67', '0'], '1700'],
      ['beef-mince', '174030', 'raw', ['176', '20', '10', '0'], '750'],
      ['pasta', '168927', 'dry', ['371', '13.04', '1.51', '74.67'], '230'],
    ] as const) {
      const row = data.records.find((row: { productId: string }) => row.productId === productId);
      expect(row, productId).toBeDefined();
      expect(row.profileId).toBe(`usda-${fdcId}-${state}`);
      expect(row.state).toBe(state);
      expect(row.reference).toEqual({ amount: '100', unit: 'g', basis: 'edible' });
      expect(['1008', '1003', '1004', '1005'].map(id => row.nutrition.nutrients.find((n: { nutrient_id: string }) => n.nutrient_id === id).amount)).toEqual(values);
      expect(await hash(row.nutrition.originalCsv)).toBe(row.nutrition.sha256);
      expect(row.price.amount).toBe(price);
      expect(row.price.targetScope).toBe('Санкт-Петербург');
      expect(row.price.reference).toEqual({ amount: '1', unit: 'kg', basis: 'edible' });
      expect(await hash(row.price.originalEvidence)).toBe(row.price.sha256);
      expect(await hash(row.safety.originalEvidence)).toBe(row.safety.sha256);
      expect(row.safety.facts.map((fact: { suitable: boolean }) => fact.suitable)).toEqual([!['pollock', 'cod'].includes(productId), productId === 'pasta']);
    }
    const issued75 = sourceApprovedCatalogs.find(catalog => catalog.version === 'mealplan-2026-11-11-3')!;
    expect(issued75.recipes).toHaveLength(75);
    expect(issued75.foods).toHaveLength(31);
    expect((await validateExpandedCatalog(issued75)).status).toBe('loaded');
  });
  it.each<[string, (data: typeof manifest) => void]>([
    ['observed scope', data => { data.records[8].price.scope = 'Санкт-Петербург verified'; }],
    ['edible basis', data => { data.records[8].reference.basis = 'whole-package'; }],
    ['assessment date', data => { data.records[8].price.assessmentDate = '2026-11-13'; }],
    ['source hash', data => { data.records[8].nutrition.sha256 = '0'.repeat(64); }],
    ['label value', data => { data.records[13].nutrition.values!.protein = '99'; }],
    ['label license', data => { data.records[13].nutrition.license = 'CC0-1.0'; }],
    ['drained identity', data => { data.records[10].productId = 'chickpea'; }],
    ['observed quantity', data => { data.records[10].price.observedQuantity.amount = '240'; }],
    ['derived edible price', data => { data.records[10].price.amount = '422.5'; }],
  ])('rejects changed breakfast snack %s before trusting the catalog', async (_, mutate) => {
    const changed = structuredClone(manifest);
    mutate(changed);
    expect((await validateExpandedCatalog(bundledCatalog, changed)).status).toBe('invalid');
  });
  it('pins independently recorded release evidence digests for 56 and 68 recipes', async () => {
    for (const [version, digest] of [
      ['mealplan-2026-11-11-1', '7e06f5d4ea1dd341571a54cc8fd62fff04988a32f843d0cd637413b4681ab1a3'],
      ['mealplan-2026-11-11-2', 'fab951b0150ec725b273bb3e9fe4fe92b127b76e6377fbf1ad40b5f651f60af5'],
      ['mealplan-2026-11-11-3', '0d1880370710718a9140cde07319fac51eb483c0044a47a3d3657f0a400e9bd2'],
    ]) {
      const release = manifest.releases.find(release => release.version === version)!;
      const records = release.profileIds.map(id => manifest.records.find(row => row.profileId === id));
      expect(await hash(JSON.stringify({ release, records }))).toBe(digest);
    }
  });
  it('retains attributed cooking temperatures and explicit assumed fish edible pricing', async () => {
    expect(manifest.cookingGuidance.temperaturesC).toEqual({ poultry: '74', beefGround: '71', fish: '63', eggDishes: '71' });
    expect(await hash(manifest.cookingGuidance.originalEvidence)).toBe(manifest.cookingGuidance.sha256);
    for (const product of ['pollock', 'cod']) {
      const row = manifest.records.find(row => row.productId === product)!;
      expect(row.price.assumptions).toContain('price-only');
      expect(row.price.assumptions).toMatch(/not measured|no measured/);
      expect(row.price.derivation).toContain('0.95');
      expect(row.mapping).toContain('Cooked yield and nutrient retention are not modelled');
    }
    for (const mutate of [
      (data: typeof manifest) => { data.records.find(row => row.productId === 'cod')!.state = 'cooked'; },
      (data: typeof manifest) => { data.records.find(row => row.productId === 'pollock')!.price.reference.basis = 'carcass'; },
      (data: typeof manifest) => { data.records.find(row => row.productId === 'beef-mince')!.safety.facts[1].suitable = true; },
      (data: typeof manifest) => { data.records.find(row => row.productId === 'pasta')!.nutrition.nutrients![0].amount = '120'; },
      (data: typeof manifest) => { data.cookingGuidance.temperaturesC.fish = '40'; },
    ]) {
      const altered = structuredClone(manifest);
      mutate(altered);
      expect((await validateExpandedCatalog(bundledCatalog, altered)).status).toBe('invalid');
    }
  });
  it('retains six independently acquired breakfast snack profiles and the separate label attribution', async () => {
    const data = read('phase031');
    for (const [productId, profileId, state, expected, amount] of [
      ['milk', 'usda-172217-ready', 'ready', ['61', '3.15', '3.27', '4.78'], '120'],
      ['oats', 'usda-173904-dry', 'dry', ['379', '13.15', '6.52', '67.7'], '170'],
      ['chickpea-canned', 'usda-173800-drained', 'drained', ['139', '7.05', '2.77', '22.53'], '710'],
      ['bean-canned', 'usda-174285-drained', 'drained', ['124', '7.98', '1.05', '21.49'], '390'],
      ['cucumber', 'usda-168409-raw', 'raw', ['15', '0.65', '0.11', '3.63'], '300'],
      ['cottage-cheese', 'label-vkusvill-51256-ready', 'ready', ['117', '16.5', '5', '1.5'], '710'],
    ] as const) {
      const row = data.records.find((row: { productId: string }) => row.productId === productId);
      expect(row, productId).toBeDefined();
      expect(row.profileId).toBe(profileId);
      expect(row.state).toBe(state);
      expect(row.reference).toEqual({ amount: '100', unit: 'g', basis: 'edible' });
      if (row.nutrition.kind === 'usda') {
        expect(['1008', '1003', '1004', '1005'].map(id => row.nutrition.nutrients.find((n: { nutrient_id: string }) => n.nutrient_id === id).amount)).toEqual(expected);
        expect(await hash(row.nutrition.originalCsv)).toBe(row.nutrition.sha256);
      } else {
        expect(row.nutrition.kind).toBe('label');
        expect(Object.values(row.nutrition.values)).toEqual(expected);
        expect(row.nutrition.license).not.toBe('CC0-1.0');
        expect(row.nutrition.url).toBe('https://vkusvill.ru/goods/tvorog-5-200-g-51256/');
        expect(await hash(row.nutrition.originalEvidence)).toBe(row.nutrition.sha256);
      }
      expect(row.price.amount).toBe(amount);
      expect(row.price.targetScope).toBe('Санкт-Петербург');
      expect(row.price.assessmentDate).toBe('2026-11-12');
      expect(row.price.reference).toEqual({ amount: '1', unit: 'kg', basis: 'edible' });
      expect(row.price.scope).toBeTruthy();
      expect(row.price.derivation).toBeTruthy();
      expect(await hash(row.price.originalEvidence)).toBe(row.price.sha256);
      expect(await hash(row.safety.originalEvidence)).toBe(row.safety.sha256);
    }
  });
  it('archives actual primary observations before catalog acceptance', () => {
    expect(typeof originals['../../data/sources/prices.snapshot.json']).toBe('string');
    expect(typeof originals['../../data/sources/food.snapshot.json']).toBe('string');
    expect(typeof originals['../../data/sources/safety.snapshot.json']).toBe('string');
  });
  it('retains independent literal USDA values and original CSV evidence', async () => {
    const food = read('food');
    expect(food.archiveSha256).toBe('b80817294b8850530aaedf2e515c02593b1824f763a0ff356e5c2081643e6fd0');
    for (const [id, expected] of [
      ['170457', ['18', '0.88', '0.2', '3.89']],
      ['170026', ['77', '2.05', '0.09', '17.49']],
      ['169756', ['365', '7.13', '0.66', '79.95']],
      ['170393', ['41', '0.93', '0.24', '9.58']],
      ['169975', ['25', '1.28', '0.1', '5.8']],
      ['169145', ['43', '1.61', '0.17', '9.56']],
      ['170685', ['346', '11.73', '2.71', '74.95']],
      ['169702', ['378', '11.02', '4.22', '72.85']],
      ['168933', ['360', '12.68', '1.05', '72.83']],
      ['169761', ['364', '10.33', '0.98', '76.31']],
      ['169655', ['387', '0', '0', '99.98']],
      ['173468', ['0', '0', '0', '0']],
    ] as const) {
      const row = food.records.find((row: { food: { fdc_id: string } }) => row.food.fdc_id === id);
      expect(['1008', '1003', '1004', '1005'].map(key => row.nutrients.find((n: { nutrient_id: string }) => n.nutrient_id === key).amount)).toEqual(expected);
    }
    for (const row of food.records) {
      expect(await hash(row.originalCsv)).toBe(row.sha256);
      expect(row.originalCsv).toContain(row.food.description);
      expect(row.nutrients).toHaveLength(4);
      for (const n of row.nutrients) expect(row.originalCsv).toContain(`"${n.id}","${n.foodId ?? n.fdc_id}","${n.nutrient_id}","${n.amount}"`);
      expect(row.reference).toEqual({ amount: '100', unit: 'g', basis: 'edible' });
      expect(row.mapping.length).toBeGreaterThan(40);
    }
  });
  it('retains literal RUB observations, exact original bases and separate scopes', async () => {
    const prices = read('prices');
    for (const [id, amount] of [['potato', '40.64'], ['rice', '69.7493827160494'], ['carrot', '51.7533333333333'], ['tomato', '270'],
      ['cabbage', '45.22125'], ['beet', '52.53'], ['buckwheat', '79.8820987654321'], ['millet', '60.9572530864198'],
      ['semolina', '70.4604938271605'], ['flour', '59.715'], ['sugar', '87.000024691358'], ['salt', '25.8177777777778']]) {
      expect(prices.records.find((r: { productId: string }) => r.productId === id).amount).toBe(amount);
    }
    for (const row of prices.records) {
      expect(await hash(row.originalEvidence)).toBe(row.evidenceSha256);
      expect(row.originalEvidence).toContain(row.amount);
      expect(row.currency).toBe('RUB');
      expect(row.reference).toEqual({ amount: '1', unit: 'kg', basis: 'edible' });
      expect(row.url).toMatch(/^https:\/\//);
      expect(row.sourceSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(row.accessedAt).toMatch(/^2026-10-28/);
      expect(row.reuseDisposition.length).toBeGreaterThan(80);
      expect(row.scope.length).toBeGreaterThan(15);
    }
    expect(prices.records.find((r: { productId: string }) => r.productId === 'tomato').scope).toContain('адрес/регион не выбран');
    expect(prices.records.find((r: { productId: string }) => r.productId === 'rice').observedAt).toBe('2026-10-21');
  });
  it('makes safety claims evidence-specific and preserves certification uncertainty', async () => {
    const safety = read('safety');
    for (const row of safety.records) {
      expect(row.unknown).toEqual(expect.arrayContaining(['halal', 'gluten-free', 'lactose-free']));
      expect(row.facts.map((f: { key: string }) => f.key)).toEqual(['no-fish', 'vegetarian']);
      expect(row.facts.every((f: { suitable: boolean }) => f.suitable)).toBe(true);
      expect(await hash(row.originalEvidence)).toBe(row.evidenceSha256);
      expect(row.originalEvidence).toContain(row.fdcId);
      expect(row.rationale.length).toBeGreaterThan(50);
    }
  });
});
