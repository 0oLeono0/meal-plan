import type { CatalogPort } from '../domain/catalog';
import type { GenerationPort } from '../domain/plan';
import type { SearchOptions } from '../domain/generatePlan';
export interface GenerationOptions {
  readonly search?: SearchOptions;
  readonly yieldTask?: () => Promise<void>;
  readonly timeoutMs?: number;
}
export function createLocalGeneration(_catalog: CatalogPort, _options: GenerationOptions = {}): GenerationPort {
  return { async generate() { return { status: 'error', error: { code: 'FAILED', message: 'Not implemented', diagnostics: [] } }; } };
}
