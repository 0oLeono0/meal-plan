import type { ActiveBundle } from '../../adapters/activePlan';
import type { PlanProjection } from '../../domain/planProjection';
import { decimal } from '../../domain/quantities';
import { formatCount, formatDateOnly, formatQuantity, selectPlanPresentation } from '../../domain/presentation';

export function PlanSummary({ bundle, projection }: { bundle: ActiveBundle; projection: PlanProjection }) {
  const { plan } = bundle;
  const view = selectPlanPresentation(projection, plan.inputs.appliedSettings.target);
  const percent = Number(projection.costs.exact.purchase.numerator * projection.budget.limit.denominator * 100n / (projection.costs.exact.purchase.denominator * projection.budget.limit.numerator));
  const scopes = [...new Set(projection.rows.map(row => `${row.price.region} · ${formatDateOnly(row.price.observedAt)}`))];
  const hasWebScope = projection.rows.some(row => /web|веб/i.test(row.price.region));
  return <>
    <section className="card" aria-label="Бюджет меню">
      <h2 className="!text-[length:var(--text-display)] tabular-nums">Покупки: ≈ {view.costs.purchase} / {view.costs.limit}</h2>
      <p>Лимит дополнительных покупок для всей семьи на {view.period}</p><p>Осталось {view.costs.remaining}</p>
      <p className="tabular-nums">Использовано бюджета: {percent}%</p>
      <progress className="w-full accent-[var(--color-accent)]" aria-label="Использовано бюджета" max={100} value={percent} />
      <dl className="tabular-nums"><dt>Все ингредиенты</dt><dd>{view.costs.ingredient}</dd><dt>Покрыто запасами</dt><dd>{view.costs.covered}</dd><dt>Нужно купить</dt><dd>{view.costs.purchase}</dd></dl>
      <p>Цены ориентировочные, проверяйте в магазине</p><p className="hint">Оценка цен: {scopes.join('; ')}</p>
      {hasWebScope && <p className="hint">Веб-витрина не подтверждает наличие цены в вашем регионе</p>}
    </section>
    <details className="card"><summary className="min-h-[44px] py-2 cursor-pointer">Источники расчёта</summary><p>Версия каталога: {plan.inputs.catalogVersion}</p>
      {projection.rows.map(row => <div key={JSON.stringify([row.productId, row.profileId, row.required.unit])} className="my-4"><p>{row.name} · {row.productId} · {row.profileId}</p>
        <p>Цена: {row.price.source.sourceId} / {row.price.source.recordId} · {formatQuantity({ amount: decimal(row.price.reference.amount), unit: row.price.reference.unit })} · {row.price.region} · {formatDateOnly(row.price.observedAt)}</p>
        <p className="hint">{row.price.source.url}</p>
        {plan.inputs.catalog.foods.filter(food => food.productId === row.productId && food.profileId === row.profileId).map(food => food.nutrition.status === 'known' && <div key={food.profileId}><p>КБЖУ: {food.nutrition.source.sourceId} / {food.nutrition.source.recordId} · {formatQuantity({ amount: decimal(food.nutrition.reference.amount), unit: food.nutrition.reference.unit })}</p><p className="hint">{food.nutrition.source.url}</p></div>)}
      </div>)}
      <p>Всего: {formatCount(plan.inputs.sourceSnapshots.length, 'item')}</p>
    </details>
  </>;
}
