import { Link } from 'react-router';
import type { GenerationSnapshot } from '../generation/controller';
import { Button } from '../../shared/ui';
import { formatDateOnly, selectPlanPresentation } from '../../domain/presentation';
import { PlanSummary } from '../plan/PlanSummary';
import { PlanLoading } from '../plan/PlanLoading';

const categoryOrder = ['Овощи и фрукты', 'Мясо и рыба', 'Молочное', 'Бакалея', 'Хлеб', 'Прочее'] as const;
type Category = typeof categoryOrder[number];
const categoryAliases = new Map<string, Category>([
  ['Овощи', 'Овощи и фрукты'], ['Фрукты', 'Овощи и фрукты'], ['Овощи и фрукты', 'Овощи и фрукты'],
  ['Мясо', 'Мясо и рыба'], ['Мясо и птица', 'Мясо и рыба'], ['Рыба', 'Мясо и рыба'], ['Мясо и рыба', 'Мясо и рыба'],
  ['Молочное', 'Молочное'], ['Молочные продукты', 'Молочное'],
  ['Крупы', 'Бакалея'], ['Крупы и мука', 'Бакалея'], ['Крупы и макароны', 'Бакалея'], ['Бобовые', 'Бакалея'], ['Бакалея', 'Бакалея'], ['Хлеб', 'Хлеб'],
]);
const sourceLabel = (count: string) => `Из ${count.replace(/блюдо$|блюда$/, ending => ending === 'блюдо' ? 'блюда' : 'блюд')}`;
export function ShoppingPage({ snapshot, onRetryLoad }: { snapshot: GenerationSnapshot; onRetryLoad(): void }) {
  const bundle = snapshot.active;
  if (!bundle) {
    if (snapshot.loadStatus === 'pending' || snapshot.loadStatus === 'unloaded') return <PlanLoading kind="shopping" />;
    if (snapshot.loadStatus === 'error' || snapshot.loadStatus === 'corrupt') return <section><h1 tabIndex={-1}>{snapshot.loadStatus === 'corrupt' ? 'Сохранённое меню повреждено или несовместимо с текущей версией' : 'Не удалось загрузить покупки'}</h1><p>Исходная запись не изменена. Повторите загрузку или составьте новое меню</p><Button onClick={onRetryLoad}>Повторить загрузку</Button><Link className="action-link" to="/plan/new">К настройкам</Link></section>;
    return <section><h1 tabIndex={-1}>Сначала составьте меню</h1><p>Начните с настроек питания</p><Link className="primary action-link" to="/plan/new">Составить меню</Link></section>;
  }
  const { plan } = bundle;
  const projection = bundle.projections.find(item => item.variantId === plan.activeVariantId)!;
  const view = selectPlanPresentation(projection, plan.inputs.appliedSettings.target);
  const groups = categoryOrder.map(category => ({ category, rows: view.purchases.filter(row => (categoryAliases.get(row.category) ?? 'Прочее') === category) })).filter(group => group.rows.length > 0);
  const namesByInstance = new Map(projection.instances.map(row => [row.instance.id, row.instance.recipeSnapshot.name]));
  const issues = view.pantryIssues.map(issue => ({
    key: JSON.stringify([issue.productId, issue.profileId, issue.code]),
    name: projection.rows.find(row => row.productId === issue.productId && row.profileId === issue.profileId)!.name,
    reason: issue.code === 'UNKNOWN_PANTRY_QUANTITY' ? 'количество не указано — запас не вычтен' : 'единицы запаса и потребности несовместимы — запас не вычтен',
  }));
  return <section data-plan-id={plan.activeVariantId} className="plan-read-model [overflow-wrap:anywhere]">
    <h1 tabIndex={-1}>Список покупок</h1>
    <p>{formatDateOnly(plan.inputs.dates[0])} — {formatDateOnly(plan.inputs.dates[plan.inputs.dates.length - 1])} · На {view.people}</p>
    <p className="tabular-nums">{view.itemCount} · ≈ {view.costs.purchase}</p>
    <Link className="action-link" to="/menu">К меню</Link>
    <PlanSummary bundle={bundle} projection={projection} />
    {view.purchases.length === 0 && <section className="card"><h2>Всё необходимое уже есть дома</h2><p>Покупать ничего не нужно: требуемые количества покрыты запасами</p></section>}
    {groups.map(group => <section className="card" key={group.category} data-category={group.category} aria-label={group.category}>
      <h2>{group.category}</h2>
      {group.rows.map(row => <article className="border-b border-[var(--color-border)] py-4 min-w-0" key={JSON.stringify([row.productId, row.profileId])} data-product-id={row.productId} data-profile-id={row.profileId}>
        <h3 className="font-semibold">{row.name}</h3>
        <p className="tabular-nums">Купить {row.purchase} · ≈ {row.purchaseCost}</p>
        {projection.covered.some(covered => covered.productId === row.productId && covered.profileId === row.profileId) && <p className="hint tabular-nums">Нужно {row.required} · Из запасов {row.covered}</p>}
        <details><summary className="min-h-[44px] py-2 cursor-pointer">{sourceLabel(row.sourceCount)}</summary>
          <ul className="pl-4">{row.sources.map((source, index) => <li key={`${source.instanceId}/${index}`}>{source.date} · {source.slot} · {namesByInstance.get(source.instanceId)} · {source.quantity}</li>)}</ul>
        </details>
      </article>)}
    </section>)}
    {issues.length > 0 && <section className="card" aria-label="Запасы без количественного покрытия"><h2>Запасы без количественного покрытия</h2>{issues.map(issue => <p key={issue.key}>{issue.name}: {issue.reason}</p>)}</section>}
    <details className="card"><summary className="min-h-[44px] py-2 cursor-pointer">Уже есть дома · ≈ {view.costs.covered}</summary>
      <p className="hint">Покрытие рассчитано по снимку продуктов для этого меню. Запасы не списываются</p>
      {view.covered.length === 0 ? <p>Нет количественного покрытия запасами</p> : <ul className="pl-4">{view.covered.map(row => <li className="my-4 tabular-nums" key={JSON.stringify([row.productId, row.profileId])}>{row.name} · {row.covered} · ≈ {row.coveredCost}</li>)}</ul>}
    </details>
  </section>;
}
