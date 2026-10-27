import type { SettingsDraft, StepErrors, Step } from './settings';

// Fail closed until the apply gate is implemented in the GREEN step.
export function buildAppliedSettings(_input: unknown): { status: 'invalid'; step: Step; errors: StepErrors } {
  return { status: 'invalid', step: 1, errors: { people: 'Настройки ещё не применены' } };
}
export function selectQuickStartInput(_draft?: SettingsDraft, _lastApplied?: unknown): unknown {
  return buildAppliedSettings(_draft);
}
