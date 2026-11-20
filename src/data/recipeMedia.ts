// Presentation sidecar only; never persisted with factual recipe snapshots.
import sourceManifest from '../../data/sources/phase031.snapshot.json';
import generatedMedia from '../../docs/data/recipe-media-031.json';
export const mediaCatalogVersion = 'mealplan-2026-10-28-1';
export const recipeMediaIds = [
  "rice-sweet-porridge",
  "millet-sweet-porridge",
  "semolina-smooth",
  "buckwheat-carrot-breakfast",
  "rice-carrot-porridge",
  "millet-carrot-mash",
  "semolina-carrot",
  "buckwheat-tomato-breakfast",
  "flour-dry-flatbread",
  "carrot-water-pancakes",
  "potato-rice-breakfast",
  "rice-millet-mix",
  "potato-carrot-soup",
  "cabbage-rice-soup",
  "beet-potato-soup",
  "tomato-rice-soup",
  "buckwheat-potato-soup",
  "millet-cabbage-soup",
  "potato-dumpling-soup",
  "carrot-semolina-soup",
  "beet-rice-pot",
  "buckwheat-tomato-stew",
  "millet-potato-stew",
  "cabbage-potato-braise",
  "carrot-potato-puree",
  "cabbage-buckwheat-pot",
  "rice-cabbage-pan",
  "millet-beet-pot",
  "potato-tomato-braise",
  "beet-cabbage-braise",
  "potato-flour-cakes",
  "cabbage-flour-pancakes",
  "carrot-semolina-cutlets",
  "beet-flour-pancakes",
  "buckwheat-potato-mash",
  "rice-carrot-dinner",
  "millet-tomato-dinner",
  "tomato-carrot-dumplings",
  "cabbage-carrot-salad",
  "tomato-cabbage-salad",
  "carrot-tomato-salad",
  "beet-carrot-raw-salad",
  "carrot-sweet-ribbons",
  "cabbage-beet-salad",
  "tomato-carrot-cabbage-salad",
  "carrot-semolina-pudding",
  "rice-sweet-snack",
  "semolina-small-flatbread",
  "warm-tomato-carrot",
  "beet-sweet-warm",
  "potato-cabbage-mash",
  "beet-tomato-rice"
] as const;
export interface RecipeMedia { readonly src: string; readonly width: number; readonly height: number; readonly generated: true }
const entries = recipeMediaIds.map(id => [id, Object.freeze({ src: `/recipes/${id}.png`, width: 1448, height: 1086, generated: true as const })]);
export const recipeMedia: Readonly<Record<string, RecipeMedia>> = Object.freeze(Object.fromEntries(entries));
// The immutable release manifest supplies both CLI and runtime membership.
export const mediaReleaseIds: Readonly<Record<string, readonly string[]>> = Object.freeze({
  [mediaCatalogVersion]: recipeMediaIds,
  ...Object.fromEntries(sourceManifest.releases.map(release => [release.version, Object.freeze([...recipeMediaIds, ...release.recipeIds])])),
});
const expansionMedia: Readonly<Record<string, RecipeMedia>> = Object.freeze(Object.fromEntries(generatedMedia.map(row => [row.recipeId,
  Object.freeze({ src: row.path, width: row.width, height: row.height, generated: true as const }),
])));
export function getRecipeMedia(catalogVersion: string, recipeId: string): RecipeMedia | undefined {
  if (!Object.prototype.hasOwnProperty.call(mediaReleaseIds, catalogVersion) || !mediaReleaseIds[catalogVersion].includes(recipeId)) return undefined;
  return Object.prototype.hasOwnProperty.call(recipeMedia, recipeId) ? recipeMedia[recipeId]
    : Object.prototype.hasOwnProperty.call(expansionMedia, recipeId) ? expansionMedia[recipeId] : undefined;
}
