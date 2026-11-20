import type { Unit } from '../domain/settings';
import { ediblePantryProducts } from '../domain/pantry';
import foodSnapshot from '../../data/sources/food.snapshot.json';
import expansion from '../../data/sources/phase031.snapshot.json';

/** Names and supported input units only: no nutritional, price or allergy assertions. */
export interface ProductName { id: string; name: string; synonyms: readonly string[]; allowedUnits: readonly Unit[] }
export interface ProductCatalogPort { search(query: string): Promise<readonly ProductName[]> }
export const productNames: readonly ProductName[] = [
  { id: 'egg', name: 'Яйца', synonyms: ['яйцо'], allowedUnits: ['pcs', 'g', 'kg'] },
  { id: 'chicken', name: 'Курица', synonyms: ['куриное мясо'], allowedUnits: ['g', 'kg'] },
  { id: 'tomato', name: 'Помидоры', synonyms: ['томат', 'помидор'], allowedUnits: ['g', 'kg'] },
  { id: 'cottage-cheese', name: 'Творог', synonyms: [], allowedUnits: ['g', 'kg'] },
  { id: 'rice', name: 'Рис', synonyms: [], allowedUnits: ['g', 'kg'] },
  { id: 'potato', name: 'Картофель', synonyms: ['картошка'], allowedUnits: ['g', 'kg'] },
  ...[...foodSnapshot.records, ...expansion.records].filter(food => !['egg', 'chicken', 'tomato', 'cottage-cheese', 'rice', 'potato'].includes(food.productId)).map(food => ({
    id: food.productId, name: food.name, synonyms: [], allowedUnits: ['g', 'kg'] as const,
  })),
];
export const popularProductIds = productNames.slice(0, 6).map(product => product.id);
export const pantryProductNames: readonly ProductName[] = [
  ...productNames,
  { id: ediblePantryProducts[0].pantryId, name: 'Куриное филе без кожи и костей', synonyms: ['курица'], allowedUnits: ['g', 'kg'] },
  { id: ediblePantryProducts[1].pantryId, name: 'Яичная масса без скорлупы', synonyms: ['яйца', 'яйцо'], allowedUnits: ['g', 'kg'] },
];
const normalize = (value: string) => value.trim().normalize('NFC').toLocaleLowerCase('ru');
export function searchProducts(query: string, names = productNames): readonly ProductName[] {
  const term = normalize(query);
  return term ? names.filter(product => [product.name, ...product.synonyms].some(name => normalize(name).includes(term))) : [];
}
export const localProductCatalog: ProductCatalogPort = { async search(query) { return searchProducts(query); } };
export const pantryProductCatalog: ProductCatalogPort = { async search(query) { return searchProducts(query, pantryProductNames); } };
