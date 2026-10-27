import type { PlanInputs, PlanVariant } from './plan';
/** Whole-plan numerical ledger. Implementation follows the independent RED oracles. */
export function projectPlan(_inputs: PlanInputs, _variant: PlanVariant) {
  void _inputs; void _variant;
  return { status: 'invalid' as const, diagnostics: [] };
}
