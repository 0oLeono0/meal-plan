import type { ActiveBundle } from '../../adapters/activePlan';
import type { PlanProjection } from '../../domain/planProjection';
import { selectPlanPresentation } from '../../domain/presentation';
import { CalculationNote } from '../../shared/CalculationNote';

export function PlanSummary({ bundle, projection }: { bundle: ActiveBundle; projection: PlanProjection }) {
  const { plan } = bundle;
  const view = selectPlanPresentation(projection, plan.inputs.appliedSettings.target);
  const percent = Number(projection.costs.exact.purchase.numerator * projection.budget.limit.denominator * 100n / (projection.costs.exact.purchase.denominator * projection.budget.limit.numerator));
  return <>
    <section className="card" aria-label="Бюджет меню">
      <h2 className="!text-[length:var(--text-display)] tabular-nums">Покупки: ≈ {view.costs.purchase} / {view.costs.limit}</h2>
      <p>Лимит дополнительных покупок для всей семьи на {view.period}</p>
      {view.budgetCheck.accepted ? <p>Осталось {view.costs.remaining}</p> : <p className="field-error">Покупки превышают бюджет</p>}
      <p className="tabular-nums">Использовано бюджета: {percent}%</p>
      <progress className="w-full accent-[var(--color-accent)]" aria-label="Использовано бюджета" max={100} value={percent} />
      <dl className="plan-costs tabular-nums"><dt>Все ингредиенты</dt><dd>{view.costs.ingredient}</dd><dt>Покрыто запасами</dt><dd>{view.costs.covered}</dd><dt>Нужно купить</dt><dd>{view.costs.purchase}</dd></dl>
    </section>
    <CalculationNote />
  </>;
}
