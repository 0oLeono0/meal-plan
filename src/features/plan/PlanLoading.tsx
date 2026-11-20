import { Status } from '../../shared/ui';

export function PlanLoading({ kind }: { kind: 'menu' | 'shopping' | 'recipe' }) {
  return <section aria-busy="true">
    {kind === 'recipe' && <h1 tabIndex={-1}>Рецепт</h1>}
    <Status>{kind === 'menu' ? 'Загружаем меню…' : kind === 'recipe' ? 'Загружаем рецепт…' : 'Загружаем покупки…'}</Status>
    <div className="plan-loading-skeleton" data-loading-skeleton="" aria-hidden="true"><div /><div /><div /></div>
  </section>;
}
