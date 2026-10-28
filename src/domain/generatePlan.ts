import type { GenerationResult, PlanInputs } from './plan';

export interface SearchOptions {
  readonly allergenKeys?: readonly string[];
  readonly maxEvaluations?: number;
  readonly maxTransitions?: number;
}
export interface SearchProgress { readonly transitions: number; readonly evaluatedCandidates: number }
export function* createPlanSearch(_inputs: PlanInputs, _options: SearchOptions = {}): Generator<SearchProgress, GenerationResult> {
  yield { transitions: 0, evaluatedCandidates: 0 };
  return { status: 'error', error: { code: 'FAILED', message: 'Search not implemented', diagnostics: [] } };
}
