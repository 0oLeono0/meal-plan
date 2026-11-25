import type { ActiveBundle } from '../../adapters/activePlan';
import type { PlanProjection } from '../../domain/planProjection';
import { formatCurrency, selectPlanPresentation } from '../../domain/presentation';
import { roundHalfUp } from '../../domain/quantities';
import { CalculationNote } from '../../shared/CalculationNote';
import { Button } from '../../shared/ui';

export function PlanSummary({ bundle, projection, onRecalculate }: {
  bundle: ActiveBundle; projection: PlanProjection; onRecalculate?(trigger: HTMLElement): void;
}) {
  const { plan } = bundle;
  const view = selectPlanPresentation(projection, plan.inputs.appliedSettings.target);
  const { reason } = view.budgetCheck;
  const roundedExcess = -projection.budget.remainingKopecks;
  const exactExcess = -roundHalfUp(projection.budget.remaining, 2);
  const lessThanKopeck = projection.budget.remaining.numerator * -100n < projection.budget.remaining.denominator;
  const percent = Number(projection.costs.exact.purchase.numerator * projection.budget.limit.denominator * 100n / (projection.costs.exact.purchase.denominator * projection.budget.limit.numerator));
  return <>
    <section className="card" aria-label="Бюджет меню">
      <h2 className="!text-[length:var(--text-display)] tabular-nums">Покупки: ≈ {view.costs.purchase} / {view.costs.limit}</h2>
      <p>Лимит дополнительных покупок для всей семьи на {view.period}</p>
      {view.budgetCheck.accepted ? <p>Осталось {view.costs.remaining}</p> : <div>
        <p className="field-error">Покупки превышают бюджет</p>
        {reason === 'display-rounding-exceeded'
          ? <p>Превышение после округления строк: {formatCurrency(roundedExcess)}</p>
          : <p>Превышение: {lessThanKopeck ? 'меньше одной копейки по точному расчёту' : formatCurrency(roundedExcess > 0n ? roundedExcess : exactExcess)}</p>}
        {onRecalculate && <Button id="recalculate-menu-budget" onClick={event => onRecalculate(event.currentTarget)}>Пересчитать меню</Button>}
      </div>}
      <p className="tabular-nums">Использовано бюджета: {percent}%</p>
      <progress className="w-full accent-[var(--color-accent)]" aria-label="Использовано бюджета" max={100} value={percent} />
      <dl className="plan-costs tabular-nums"><dt>Все ингредиенты</dt><dd>{view.costs.ingredient}</dd><dt>Покрыто запасами</dt><dd>{view.costs.covered}</dd><dt>Нужно купить</dt><dd>{view.costs.purchase}</dd></dl>
    </section>
    <CalculationNote />
  </>;
}
