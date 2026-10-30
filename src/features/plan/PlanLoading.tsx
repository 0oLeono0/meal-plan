import { Status } from '../../shared/ui';

export function PlanLoading({ kind }: { kind: 'menu' | 'shopping' }) {
  return <section>
    <Status>{kind === 'menu' ? 'Загружаем меню…' : 'Загружаем покупки…'}</Status>
    <div className="plan-loading-skeleton" data-loading-skeleton="" aria-hidden="true"><div /><div /><div /></div>
  </section>;
}
