import { useEffect, useRef } from 'react';
import { Link } from 'react-router';
import type { GenerationSnapshot } from './controller';
import { Button, Status } from '../../shared/ui';
import { formatCurrency } from '../../domain/presentation';
import { roundHalfUp } from '../../domain/quantities';
import type { AppliedSettings } from '../../domain/appliedSettings';
import type { CatalogLoadResult } from '../../domain/catalog';
import { dietaryRestrictions } from '../../domain/settings';
import { formatCount } from '../../domain/presentation';

const pendingTexts = ['Подбираю блюда…', 'Считаю бюджет…', 'Проверяю КБЖУ…', 'Собираю список покупок…'];
export function GenerationPage({ snapshot, requestedSettings, catalog, catalogError = false, draftSaved, onCancel, onRetry, onSettings, onRetrySave, onRetryLoad }: {
  snapshot: GenerationSnapshot; catalogError?: boolean; draftSaved: boolean; onCancel(): void; onRetry(): void;
  requestedSettings?: AppliedSettings; catalog: CatalogLoadResult;
  onSettings(budget?: boolean): void; onRetrySave(): void; onRetryLoad(): void;
}) {
  const title = useRef<HTMLHeadingElement>(null);
  useEffect(() => { title.current?.focus(); }, [snapshot.status, catalogError]);
  const pending = snapshot.status === 'pending' || snapshot.status === 'saving';
  if (pending) return <section aria-labelledby="generation-title" className="py-8">
    <h1 ref={title} id="generation-title" tabIndex={-1}>Составляем меню</h1>
    <div role="progressbar" aria-label="Подбор меню" />
    <Status>{snapshot.status === 'saving' ? 'Сохраняем меню…' : pendingTexts[snapshot.pendingTextIndex]}</Status>
    <Button onClick={onCancel}>Отмена</Button>
  </section>;
  if (snapshot.status === 'memory-only') return <section>
    <h1 ref={title} tabIndex={-1}>Меню рассчитано, но не сохранено</h1>
    <p role="alert">Расчёт доступен только до закрытия страницы.{snapshot.active ? ' Предыдущее меню не изменено' : ''}</p>
    {snapshot.candidate && <p>Рассчитано блюд: {snapshot.candidate.plan.variants[0].instances.length}</p>}
    <div className="grid gap-2"><Button variant="primary" onClick={onRetrySave}>Повторить сохранение</Button>
      {snapshot.saveError === 'blocked' && <Button onClick={onRetryLoad}>Повторить загрузку</Button>}
      {snapshot.active ? <Link className="action-link" to="/menu">К текущему меню</Link> : <Button onClick={() => onSettings()}>К настройкам</Button>}
    </div>
  </section>;
  if (snapshot.status === 'error' || catalogError) {
    const error = snapshot.error;
    const code = catalogError ? 'GENERATION_DATA_INCOMPLETE' : error?.code;
    const headings = { GENERATION_DATA_INCOMPLETE: 'Недостаточно проверенных данных для расчёта меню', NO_RECIPES: 'В доступном каталоге нет блюд для выбранных условий', BUDGET_TOO_LOW: 'С выбранными ограничениями бюджета недостаточно' };
    const heading = code === 'BUDGET_TOO_LOW' && requestedSettings ? `Для ${requestedSettings.people} ${requestedSettings.people === 1 ? 'человека' : 'человек'} с выбранными ограничениями бюджета недостаточно`
      : code && code in headings ? headings[code as keyof typeof headings] : 'Не получилось составить меню';
    const evidence = error?.budgetEvidence;
    const proof = evidence?.proof.complete ? `${evidence.kind === 'exhaustive-minimum' ? 'Минимум по доступному каталогу' : 'Даже нижняя оценка покупок'} ≈ ${formatCurrency(roundHalfUp(evidence.amount, 2))}${evidence.kind === 'lower-bound' ? ' выше лимита' : ''}` : null;
    const missingProducts = catalog.status === 'loaded' ? catalog.catalog.foods.filter(food => error?.diagnostics.some(item => item.path.includes(food.profileId))).map(food => food.name) : [];
    return <section><h1 ref={title} tabIndex={-1}>{heading}</h1><div role="alert">
      {code === 'TIMEOUT' ? <p>Подбор занял больше 30 секунд. Повторите попытку или измените настройки</p>
        : code === 'SEARCH_EXHAUSTED' ? <p>Не удалось подобрать меню за отведённый поиск. Это не доказывает, что подходящего меню нет</p>
        : code === 'NO_RECIPES' ? <p>Проверьте время готовки и ограничения. Мы не будем снимать их автоматически</p>
        : code === 'GENERATION_DATA_INCOMPLETE' ? <p>{missingProducts.length ? `Для ${missingProducts.join(', ')} не подтверждены данные о цене / КБЖУ / выбранном ограничении. Эти продукты не использованы` : 'Не подтверждены данные о цене / КБЖУ / выбранном ограничении. Эти продукты не использованы'}</p>
        : <p>{draftSaved ? 'Настройки сохранены в черновике. Повторите подбор или измените настройки' : 'Настройки доступны на этой странице. Повторите подбор или измените настройки'}</p>}
      {proof && <p>{proof}</p>}
      {code === 'BUDGET_TOO_LOW' && requestedSettings && <p>{formatCount(requestedSettings.days, 'day')} · {requestedSettings.cookingMinutes === null ? 'Любое время готовки' : `До ${requestedSettings.cookingMinutes} минут`} · {requestedSettings.restrictions.map(id => dietaryRestrictions.find(item => item.id === id)?.label ?? id).join(', ') || 'Без ограничений'}{requestedSettings.exclusionIds.length ? ` · Исключены: ${requestedSettings.exclusionIds.join(', ')}` : ''}</p>}
    </div><div className="grid gap-2"><Button variant="primary" onClick={onRetry}>Повторить</Button><Button onClick={() => onSettings(code === 'BUDGET_TOO_LOW')}>{code === 'BUDGET_TOO_LOW' ? 'Изменить бюджет' : 'Изменить настройки'}</Button></div></section>;
  }
  return <section><h1 ref={title} tabIndex={-1}>Генерация прервана или не запущена</h1><p>Откройте настройки и запустите подбор снова</p><Link className="primary action-link" to="/plan/new">К настройкам</Link>{snapshot.active && <Link className="action-link" to="/menu">К текущему меню</Link>}</section>;
}
