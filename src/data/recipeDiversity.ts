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
});
export function recipeDiversityFor(version: string): RecipeDiversityMap | undefined {
  return Object.prototype.hasOwnProperty.call(releases, version) ? releases[version] : undefined;
}
