import { sourceApprovedCatalogs } from '../data/catalog';
import { sameSnapshot } from '../domain/appliedSettings';
import { catalogError } from '../domain/catalog';
import type { Catalog, InvalidCatalog } from '../domain/catalog';
import { validateCatalog } from './catalog';

export interface TrustedCatalogRegistry {
  validate(catalog: Catalog): { readonly status: 'trusted' } | InvalidCatalog;
}

/** Programmatic trust configuration only. Never register a persisted snapshot.
 * Each supported historical version keeps its original facts, without repricing.
 * Validation detaches/freezes inputs; the private map cannot be changed by callers.
 */
export function createTrustedCatalogRegistry(catalogs: readonly Catalog[]): TrustedCatalogRegistry {
  const versions = new Map<string, Catalog>();
  for (const catalog of catalogs) {
    const checked = validateCatalog(catalog);
    if (checked.status !== 'loaded') throw new Error('INVALID_TRUSTED_CATALOG');
    if (versions.has(checked.catalog.version)) throw new Error('DUPLICATE_TRUSTED_CATALOG_VERSION');
    versions.set(checked.catalog.version, checked.catalog);
  }
  return Object.freeze({ validate(catalog: Catalog) {
    const trusted = versions.get(catalog.version);
    if (!trusted) return catalogError('UNSUPPORTED_CATALOG_VERSION', 'inputs.catalogVersion');
    return sameSnapshot(catalog, trusted) ? { status: 'trusted' as const }
      : catalogError('UNTRUSTED_CATALOG_SNAPSHOT', 'inputs.catalog');
  } });
}

// Only compiled source-backed versions belong here. Add historical releases
// explicitly when the application ships an updated catalog.
export const trustedCatalogs = createTrustedCatalogRegistry(sourceApprovedCatalogs);
