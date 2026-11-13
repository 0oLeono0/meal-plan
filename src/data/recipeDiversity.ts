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
const secondRelease: RecipeDiversityMap = Object.freeze({
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
  } satisfies RecipeDiversityMap);
const thirdRelease: RecipeDiversityMap = Object.freeze({
    ...secondRelease,
    'familiar-chicken-pasta-soup': { groups: ['poultry'], family: 'chicken-pasta-soup' },
    'familiar-turkey-balls-buckwheat': { groups: ['poultry'], family: 'turkey-meatballs-grain' },
    'familiar-turkey-potato-cabbage': { groups: ['poultry'], family: 'poultry-vegetable-braise' },
    'familiar-pollock-potato-carrot': { groups: ['fish'], family: 'fish-vegetable-braise' },
    'familiar-cod-rice-soup': { groups: ['fish'], family: 'fish-rice-soup' },
    'familiar-beef-pasta-tomato': { groups: ['meat'], family: 'beef-pasta-tomato' },
    'familiar-lentil-vegetable-soup': { groups: ['legume', 'plant'], family: 'lentil-vegetable-soup' },
  } satisfies RecipeDiversityMap);
const releases: Readonly<Record<string, RecipeDiversityMap>> = Object.freeze({
  'mealplan-2026-11-11-1': firstRelease,
  'mealplan-2026-11-11-2': secondRelease,
  'mealplan-2026-11-11-3': thirdRelease,
  'mealplan-2026-11-11-4': Object.freeze({
    ...thirdRelease,
    'familiar-pollock-yogurt-buckwheat': { groups: ['fish', 'dairy'], family: 'fish-yogurt-grain' },
    'familiar-pork-potato-cabbage': { groups: ['meat'], family: 'pork-vegetable-braise' },
    'familiar-lazy-cabbage-rolls': { groups: ['meat'], family: 'beef-rice-cabbage-rolls' },
    'familiar-turkey-pasta-tomato': { groups: ['poultry'], family: 'turkey-pasta-vegetables' },
    'familiar-chickpea-tomato-rice': { groups: ['legume', 'plant'], family: 'chickpea-rice-skillet' },
    'familiar-bean-potato-stew': { groups: ['legume', 'plant'], family: 'bean-potato-stew' },
    'familiar-potato-tomato-frittata': { groups: ['egg'], family: 'potato-egg-frittata' },
  } satisfies RecipeDiversityMap),
});
export function recipeDiversityFor(version: string): RecipeDiversityMap | undefined {
  return Object.prototype.hasOwnProperty.call(releases, version) ? releases[version] : undefined;
}
