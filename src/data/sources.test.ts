import { describe, expect, it } from 'vitest';
const originals = import.meta.glob('../../data/sources/*.snapshot.json', { query: '?raw', import: 'default', eager: true });
const read = (name: string) => JSON.parse(String(originals[`../../data/sources/${name}.snapshot.json`]));
const hash = async (value: string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))), byte => byte.toString(16).padStart(2, '0')).join('');
describe('archived primary sources', () => {
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
