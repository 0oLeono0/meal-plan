import { popularProductIds, productNames, type ProductCatalogPort } from '../../adapters/products';
import { dietaryRestrictions, parseHomeQuantity, validateHomeRow, type DraftAction, type HomeDraftRow, type SettingsDraft, type StepErrors, type Unit } from '../../domain/settings';
import { ProductCombobox, useRemovalUndo } from '../../shared/ProductCombobox';
import { Button, Field } from '../../shared/ui';

const unitLabels: Record<Unit, string> = { g: 'г', kg: 'кг', ml: 'мл', l: 'л', pcs: 'шт' };
const nameFor = (id: string) => productNames.find(product => product.id === id)?.name ?? `Продукт из сохранённого черновика (${id})`;

export function HomeProductsStep({ draft, onChange, errors, disabled = false, productPort }: { draft: SettingsDraft; onChange(action: DraftAction): void; errors: StepErrors; disabled?: boolean; productPort?: ProductCatalogPort }) {
  const { removed, setRemoved, undoRef } = useRemovalUndo<HomeDraftRow>('home-search');
  const focusRow = (id: string) => requestAnimationFrame(() => document.getElementById(`quantity-${id}`)?.focus());
  function add(productId: string) {
    if (draft.home.some(row => row.productId === productId)) { focusRow(productId); return; }
    onChange({ type: 'home', value: [...draft.home, { productId, quantity: '', expiresSoon: false }] });
  }
  function edit(productId: string, patch: Partial<HomeDraftRow>) {
    onChange({ type: 'home', value: draft.home.map(row => row.productId === productId ? { ...row, ...patch } : row) });
  }
  return <>
    <p>Укажите, что есть дома. Количество можно оставить пустым; это не означает ноль.</p>
    <div className="card min-w-0"><ProductCombobox id="home-search" label="Добавить домашний продукт" disabled={disabled} port={productPort} onSelect={product => add(product.id)} />
      <div role="group" aria-label="Популярные продукты" className="flex flex-wrap gap-2 mt-4">{popularProductIds.map(id => <Button disabled={disabled} key={id} onClick={() => add(id)}>{nameFor(id)}</Button>)}</div>
    </div>
    <div id="home" tabIndex={-1}>
      {!draft.home.length && <p>Домашних продуктов пока нет</p>}
      {errors.home && <p className="field-error">{errors.home}</p>}
      {draft.home.map((row, index) => {
        const label = nameFor(row.productId);
        const product = productNames.find(product => product.id === row.productId);
        const rowErrors = validateHomeRow(row);
        const quantityId = `quantity-${row.productId}` as const;
        const unitId = `unit-${row.productId}` as const;
        const quantityError = rowErrors[quantityId];
        const unitError = rowErrors[unitId];
        return <section key={row.productId} className="card min-w-0" aria-label={`Домашний продукт ${label}`}>
          <h2 className="[overflow-wrap:anywhere]">{label}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id={quantityId} label={`Количество ${label}`} error={quantityError} hint="Необязательно. Дробь через точку или запятую.">
              <input id={quantityId} type="text" inputMode="decimal" autoComplete="off" disabled={disabled} value={row.quantity} aria-invalid={!!quantityError} aria-describedby={`${quantityId}-hint${quantityError ? ` ${quantityId}-error` : ''}`} onChange={event => edit(row.productId, { quantity: event.target.value })} />
            </Field>
            <Field id={unitId} label={`Единица ${label}`} error={unitError}>
              <select id={unitId} className="w-full min-h-[44px]" disabled={disabled} value={row.unit ?? ''} aria-invalid={!!unitError} aria-describedby={unitError ? `${unitId}-error` : undefined} onChange={event => edit(row.productId, { unit: event.target.value ? event.target.value as Unit : undefined })}>
                <option value="">Не выбрана</option>{product?.allowedUnits.map(unit => <option value={unit} key={unit}>{unitLabels[unit]}</option>)}
              </select>
            </Field>
          </div>
          {parseHomeQuantity(row.quantity).status === 'unknown' && <p className="hint">Количество не указано</p>}
          <label className="flex items-center gap-2 min-h-[44px] mt-4"><input type="checkbox" className="!w-6 shrink-0 accent-[var(--color-accent)]" disabled={disabled} aria-label={`Скоро испортится ${label}`} checked={row.expiresSoon} onChange={event => edit(row.productId, { expiresSoon: event.target.checked })} />Скоро испортится</label>
          <Button disabled={disabled} aria-label={`Удалить продукт ${label}`} onClick={() => {
            setRemoved({ value: { ...row }, index }); onChange({ type: 'home', value: draft.home.filter(value => value.productId !== row.productId) });
            document.getElementById('home-search')?.focus();
          }}>Удалить {label}</Button>
        </section>;
      })}
    </div>
    {removed && <div className="notice"><p role="status">Продукт удалён. Можно отменить в течение 5 секунд.</p><button ref={undoRef} type="button" disabled={disabled} aria-label="Отменить удаление" onClick={() => {
      // A re-added product wins; undo must never overwrite newly edited data.
      if (!draft.home.some(row => row.productId === removed.value.productId)) {
        const next = [...draft.home]; next.splice(removed.index, 0, { ...removed.value }); onChange({ type: 'home', value: next });
      }
      focusRow(removed.value.productId); setRemoved(null);
    }}>Отменить</button></div>}
    <p className="hint">Это черновик. Глобальные запасы не изменяются; покупки пока не рассчитываются.</p>
  </>;
}

export function DraftReview({ draft }: { draft: SettingsDraft }) {
  return <section className="notice" aria-labelledby="review-title">
    <h2 id="review-title" tabIndex={-1}>Настройки подготовлены</h2>
    <p>Запуск меню будет доступен на следующем этапе</p>
    <dl className="grid gap-2 [overflow-wrap:anywhere]">
      <dt>Люди и период</dt><dd className="m-0">{draft.people} чел. · {draft.days} дн.</dd>
      <dt>Бюджет на весь период</dt><dd className="m-0">{draft.budget.trim()} ₽</dd>
      <dt>Цель питания</dt><dd className="m-0">{{ maintain: 'Поддержание веса', lose: 'Похудение', gain: 'Набор массы' }[draft.goal]}</dd>
      <dt>Время и разнообразие</dt><dd className="m-0">{draft.cookingTime === 'any' ? 'Любое время' : `До ${draft.cookingTime} мин`} · {{ same: 'Одно и то же каждый день', medium: 'Среднее', max: 'Каждый день разное' }[draft.variety]}</dd>
      <dt>Цель КБЖУ на человека в день</dt><dd className="m-0">{draft.manualNutrition.calories.trim() ? `${draft.manualNutrition.calories} ккал; Б ${draft.manualNutrition.protein} г / Ж ${draft.manualNutrition.fat} г / У ${draft.manualNutrition.carbohydrates} г · ${draft.targetSource.kind === 'manual' ? 'Введено вручную' : 'Сохранённая норма из расчёта'}` : 'Цель КБЖУ не указана'}</dd>
      <dt>Ограничения</dt><dd className="m-0">{draft.restrictions.map(id => dietaryRestrictions.find(option => option.id === id)?.label).join(', ') || 'Не выбраны'}</dd>
      <dt>Не люблю</dt><dd className="m-0">{draft.exclusionIds.map(nameFor).join(', ') || 'Исключений нет'}</dd>
      <dt>Продукты дома</dt><dd className="m-0">{!draft.home.length ? 'Не указаны' : <ul className="pl-5">{draft.home.map(row => <li key={row.productId}>{nameFor(row.productId)}: <span>{parseHomeQuantity(row.quantity).status === 'unknown' ? 'Количество не указано' : `${row.quantity} ${row.unit ? unitLabels[row.unit] : ''}`}</span>{row.expiresSoon && ' · Скоро испортится'}</li>)}</ul>}</dd>
    </dl>
  </section>;
}
