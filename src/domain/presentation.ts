import type { Nutrition } from './catalog';
import type { AppliedSettings } from './appliedSettings';
import type { PlanProjection } from './planProjection';
import type { Quantity } from './quantities';
export function formatCurrency(_kopecks: bigint): string { void _kopecks; return ''; }
export function formatNutrition(_nutrition: Nutrition) { void _nutrition; return {}; }
export function formatQuantity(_quantity: Quantity): string { void _quantity; return ''; }
export function formatCount(_count: number, _kind: string): string { void _count; void _kind; return ''; }
export function formatDateOnly(_date: string): string { void _date; return ''; }
export function compareNutritionTarget(_actual: Nutrition, _target: AppliedSettings['target']) { void _actual; void _target; return { status: 'absent' as const }; }
export function selectPlanPresentation(_value: PlanProjection, _target: AppliedSettings['target']) { void _value; void _target; return {}; }
