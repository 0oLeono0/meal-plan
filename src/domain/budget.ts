/** Exact whole rubles; a slider's convenience range is not a financial limit. */
export function parseBudget(raw: string): number | null {
  const trimmed = raw.trim();
  if (!/^[0-9]+$/.test(trimmed)) return null;
  const value = Number(trimmed);
  return Number.isSafeInteger(value) && value >= 500 ? value : null;
}

export function projectSlider(amount: number): number {
  return Math.min(15000, Math.max(1000, Math.round(amount / 100) * 100));
}

/** A budget allocation hint, never an estimate of actual food/purchase costs. */
export function selectBudgetHint(budget: string, people: string, days: string): number | null {
  const amount = parseBudget(budget);
  const validCount = (raw: string, max: number) => /^[0-9]+$/.test(raw) && Number.isSafeInteger(Number(raw)) && Number(raw) >= 1 && Number(raw) <= max;
  if (amount === null || !validCount(people, 10) || !validCount(days, 7)) return null;
  return amount / Number(people) / Number(days);
}

export function budgetPeriodLabel(days: string): string {
  if (days === '7') return 'Бюджет на неделю';
  if (!/^[1-6]$/.test(days)) return 'Бюджет на выбранный период';
  return `Бюджет на ${days} ${days === '1' ? 'день' : Number(days) < 5 ? 'дня' : 'дней'}`;
}

export const formatRubles = (amount: number): string => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(amount).replace(/\u00a0/g, ' ');
