import type { Unit } from '../domain/settings';
import foodSnapshot from '../../data/sources/food.snapshot.json';

/** Names and supported input units only: no nutritional, price or allergy assertions. */
export interface ProductName { id: string; name: string; synonyms: readonly string[]; allowedUnits: readonly Unit[] }
export interface ProductCatalogPort { search(query: string): Promise<readonly ProductName[]> }
export const productNames: readonly ProductName[] = [
  { id: 'egg', name: 'Яйца', synonyms: ['яйцо'], allowedUnits: ['pcs'] },
  { id: 'chicken', name: 'Курица', synonyms: ['куриное мясо'], allowedUnits: ['g', 'kg'] },
  { id: 'tomato', name: 'Помидоры', synonyms: ['томат', 'помидор'], allowedUnits: ['g', 'kg'] },
  { id: 'cottage-cheese', name: 'Творог', synonyms: [], allowedUnits: ['g', 'kg'] },
  { id: 'rice', name: 'Рис', synonyms: [], allowedUnits: ['g', 'kg'] },
  { id: 'potato', name: 'Картофель', synonyms: ['картошка'], allowedUnits: ['g', 'kg'] },
  ...foodSnapshot.records.filter(food => !['egg', 'chicken', 'tomato', 'cottage-cheese', 'rice', 'potato'].includes(food.productId)).map(food => ({
    id: food.productId, name: food.name, synonyms: [], allowedUnits: ['g', 'kg'] as const,
  })),
];
export const popularProductIds = productNames.slice(0, 6).map(product => product.id);
const normalize = (value: string) => value.trim().normalize('NFC').toLocaleLowerCase('ru');
export function searchProducts(query: string): readonly ProductName[] {
  const term = normalize(query);
  return term ? productNames.filter(product => [product.name, ...product.synonyms].some(name => normalize(name).includes(term))) : [];
}
export const localProductCatalog: ProductCatalogPort = { async search(query) { return searchProducts(query); } };
