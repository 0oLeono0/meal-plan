/**
 * Real USDA tracer, not a generation catalog. Extracted directly from the archived CSV.
 * food_nutrient IDs: kcal 1597626 / P 1597683 / F 1597714 / C 1597748.
 * USDA publication_date is 2019-04-01; dataset release is April 2018.
 * Source terms: https://fdc.nal.usda.gov/data-documentation.html (public domain / CC0).
 * Generic `egg` remains the Phase 1 identity. No generic pcs -> g mapping is asserted.
 */
export const foodSources = {
  version: 'usda-sr-2018-04-tracer-1',
  foods: [{
    productId: 'egg', profileId: 'usda-171287-raw', name: 'Яйцо цельное, сырое, свежее',
    identity: 'Egg, whole, raw, fresh', state: 'raw', category: 'eggs',
    nutrition: {
      status: 'known', reference: { amount: '100', unit: 'g', basis: 'edible' },
      values: { calories: '143', protein: '12.56', fat: '9.51', carbohydrates: '0.72' },
      source: {
        sourceId: 'usda-fdc-sr-legacy', recordId: '171287', release: 'SR Legacy April 2018',
        url: 'https://fdc.nal.usda.gov/food-details/171287/nutrients', license: 'CC0-1.0',
        archiveUrl: 'https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_csv_2018-04.zip',
        archiveSha256: 'b80817294b8850530aaedf2e515c02593b1824f763a0ff356e5c2081643e6fd0',
      },
    },
    price: { status: 'unknown', reason: 'Нет подтверждённого сопоставимого источника цены в RUB.' },
    safety: { status: 'unknown', reason: 'Нутриентная запись не подтверждает ограничения, аллергенную маркировку или сертификацию.' },
    conversions: [],
  }],
  recipes: [],
} as const;
