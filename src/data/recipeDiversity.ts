export type FoodGroup = 'poultry' | 'fish' | 'meat' | 'egg' | 'dairy' | 'legume' | 'plant';
export interface RecipeDiversity { readonly groups: readonly FoodGroup[]; readonly family: string }
export type RecipeDiversityMap = Readonly<Record<string, RecipeDiversity>>;

// Compiled ranking metadata only. Ingredient safety remains the admission gate.
// Historical release and catalogs without this sidecar retain their original policy.
const firstRelease: RecipeDiversityMap = Object.freeze({
  'familiar-omelet-tomato-bread': Object.freeze({ groups: Object.freeze(['egg'] as const), family: 'vegetable-omelet' }),
  'familiar-chicken-rice-carrot': Object.freeze({ groups: Object.freeze(['poultry'] as const), family: 'poultry-grain-stew' }),
  'familiar-lentil-cabbage-tomato': Object.freeze({ groups: Object.freeze(['legume'] as const), family: 'lentil-vegetable-stew' }),
  'familiar-yogurt-apple': Object.freeze({ groups: Object.freeze(['dairy'] as const), family: 'fresh-dairy-fruit' }),
});
const releases: Readonly<Record<string, RecipeDiversityMap>> = Object.freeze({
  'mealplan-2026-11-11-1': firstRelease,
  'mealplan-2026-11-11-2': Object.freeze({
    ...firstRelease,
    'familiar-milk-oats-apple': { groups: ['dairy'], family: 'milk-oat-porridge' },
    'familiar-syrniki': { groups: ['dairy', 'egg'], family: 'pan-fried-cottage-cakes' },
    'familiar-cottage-apple-bake': { groups: ['dairy', 'egg'], family: 'cottage-fruit-bake' },
    'familiar-buckwheat-egg-carrot': { groups: ['egg'], family: 'egg-grain-vegetables' },
    'familiar-oat-pancake-yogurt': { groups: ['egg', 'dairy'], family: 'oat-egg-pancake' },
    'familiar-chickpea-pancakes': { groups: ['legume', 'plant'], family: 'chickpea-pan-cakes' },
    'familiar-water-oats-apple': { groups: ['plant'], family: 'water-oat-porridge' },
    'familiar-cottage-cucumber-bread': { groups: ['dairy'], family: 'fresh-dairy-vegetables' },
    'familiar-chickpea-cucumber-toast': { groups: ['legume', 'plant'], family: 'chickpea-spread-toast' },
    'familiar-steamed-egg-pudding': { groups: ['egg', 'dairy'], family: 'steamed-egg-custard' },
    'familiar-baked-apple-oats': { groups: ['plant'], family: 'baked-fruit-crumble' },
    'familiar-bean-tomato-cabbage-salad': { groups: ['legume', 'plant'], family: 'bean-vegetable-salad' },
  } satisfies RecipeDiversityMap),
});
export function recipeDiversityFor(version: string): RecipeDiversityMap | undefined {
  return Object.prototype.hasOwnProperty.call(releases, version) ? releases[version] : undefined;
}
