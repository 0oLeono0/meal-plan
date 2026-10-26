import { productNames, type ProductCatalogPort } from '../../adapters/products';
import { dietaryRestrictions, type DraftAction, type SettingsDraft, type StepErrors } from '../../domain/settings';
import { ProductCombobox, useRemovalUndo } from '../../shared/ProductCombobox';
import { Button } from '../../shared/ui';

export function ExclusionsStep({ draft, onChange, disabled = false, productPort, errors = {} }: { draft: SettingsDraft; onChange(action: DraftAction): void; disabled?: boolean; productPort?: ProductCatalogPort; errors?: StepErrors }) {
  const { removed, setRemoved, undoRef } = useRemovalUndo<string>('exclusion-search');
  const focusTag = (id: string) => requestAnimationFrame(() => document.getElementById(`exclusion-${id}`)?.focus());
  return <>
    <p>Отметьте ограничения и продукты, которые не хотите видеть в меню.</p>
    <fieldset id="restrictions" tabIndex={-1} className="card border-0 min-w-0" disabled={disabled}><legend>Ограничения питания</legend>
      <div className="grid gap-2">{dietaryRestrictions.map(({ id: value, label }) => <label key={value} className="flex items-center gap-2 min-h-[44px] m-0">
        <input type="checkbox" className="!w-6 shrink-0 accent-[var(--color-accent)]" checked={draft.restrictions.includes(value)}
          onChange={event => onChange({ type: 'restrictions', value: event.target.checked ? [...draft.restrictions, value] : draft.restrictions.filter(id => id !== value) })} />{label}
      </label>)}</div>
      {errors.restrictions && <><p className="field-error">{errors.restrictions}</p><Button onClick={() => onChange({ type: 'restrictions', value: draft.restrictions.filter(id => dietaryRestrictions.some(option => option.id === id)) })}>Убрать неизвестные ограничения</Button></>}
    </fieldset>
    <div className="card min-w-0"><h2>Не люблю</h2>
      <ProductCombobox id="exclusion-search" label="Добавить исключение" port={productPort} disabled={disabled} onSelect={product => {
        if (draft.exclusionIds.includes(product.id)) { focusTag(product.id); return; }
        onChange({ type: 'exclusions', value: [...draft.exclusionIds, product.id] });
      }} />
      {errors['exclusion-search'] && <p className="field-error">{errors['exclusion-search']}</p>}
      {!draft.exclusionIds.length && <p>Исключений пока нет</p>}
      <div className="flex flex-wrap gap-2 mt-4">{draft.exclusionIds.map((id, index) => {
        const label = productNames.find(product => product.id === id)?.name ?? `Продукт из сохранённого черновика (${id})`;
        return <Button key={id} id={`exclusion-${id}`} disabled={disabled} aria-label={`Удалить исключение ${label}`} className="max-w-full [overflow-wrap:anywhere]" onClick={() => {
          setRemoved({ value: id, index }); onChange({ type: 'exclusions', value: draft.exclusionIds.filter(value => value !== id) });
          document.getElementById('exclusion-search')?.focus();
        }}>Удалить {label}</Button>;
      })}</div>
      {removed && <div className="notice mt-4"><p role="status">Исключение удалено. Можно отменить в течение 5 секунд.</p><button ref={undoRef} type="button" disabled={disabled} onClick={() => {
        const next = draft.exclusionIds.filter(id => id !== removed.value); next.splice(removed.index, 0, removed.value);
        onChange({ type: 'exclusions', value: next }); focusTag(removed.value); setRemoved(null);
      }} aria-label="Отменить удаление">Отменить</button></div>}
      <p className="hint">Справочник содержит только названия. Он не подтверждает безопасность продуктов при аллергии.</p>
    </div>
  </>;
}
