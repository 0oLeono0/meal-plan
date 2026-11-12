import type { Catalog, CatalogPort } from '../domain/catalog';
import { historicalCatalog, historicalCatalogPort, validateHistoricalCatalog } from './historicalCatalog';
import { expandedCatalogPort, expandedCatalogs, validateExpandedCatalog } from './catalogExpansion';

export { historicalCatalog, historicalCatalogPort, validateHistoricalCatalog };
export const bundledCatalog = expandedCatalogs[expandedCatalogs.length - 1];
export const bundledCatalogPort = expandedCatalogPort(bundledCatalog);
export const sourceApprovedCatalogs: readonly Catalog[] = Object.freeze([historicalCatalog, ...expandedCatalogs]);
export const sourceApprovedCatalogPorts: Readonly<Record<string, CatalogPort>> = Object.freeze({
  [historicalCatalog.version]: historicalCatalogPort,
  ...Object.fromEntries(expandedCatalogs.map(catalog => [catalog.version, catalog.version === bundledCatalog.version ? bundledCatalogPort : expandedCatalogPort(catalog)])),
});

// Explicit historical evidence retains its original source gate and injection API.
export async function validateBundledCatalog(input: Catalog, historicalSources?: Parameters<typeof validateHistoricalCatalog>[1]) {
  if (historicalSources || input.version === historicalCatalog.version) return validateHistoricalCatalog(input, historicalSources);
  return validateExpandedCatalog(input);
}
