import { useRef, useState } from 'react';
import { Link } from 'react-router';
import type { PantryInventoryRow } from '../../adapters/pantryInventory';
import { pantryProductCatalog, pantryProductNames, popularProductIds } from '../../adapters/products';
import type { ProductName } from '../../adapters/products';
import { ediblePantryProducts, needsPantryWeightConfirmation } from '../../domain/pantry';
import { validateInventoryRows } from '../../adapters/pantryInventory';
import type { Unit } from '../../domain/settings';
import { ProductCombobox } from '../../shared/ProductCombobox';
import { Button, ConfirmDialog, Field, Status } from '../../shared/ui';
import type { PantryInventoryState } from '../generation/controller';

const unitNames: Record<Unit, string> = { g: 'г', kg: 'кг', ml: 'мл', l: 'л', pcs: 'шт.' };

export function PantryPage({ state, rows, savingMenu, onSave, onRetryLoad, onRetrySave, onDiscardSave }: {
  state: PantryInventoryState;
  rows: readonly PantryInventoryRow[];
  savingMenu: boolean;
  onSave(rows: readonly PantryInventoryRow[]): Promise<boolean>;
  onRetryLoad(): void;
  onRetrySave(): Promise<boolean>;
  onDiscardSave(): void;
}) {
  const [selected, setSelected] = useState<ProductName | null>(null);
  const [editor, setEditor] = useState<{ row: PantryInventoryRow; error?: string } | null>(null);
  const [removal, setRemoval] = useState<{ productId: string; name: string; trigger: HTMLElement } | null>(null);
  const retryTarget = useRef<{ focus: string } | 'quantity' | null>(null);
  const editorTrigger = useRef<HTMLElement | null>(null);
  const quantityField = useRef<HTMLInputElement>(null);
  const saving = state.writeStatus === 'saving';
  const impaired = state.status === 'error' || state.status === 'corrupt';
  const disabled = saving || savingMenu || impaired || state.status === 'pending' || state.writeStatus === 'conflict';
  function focus(id: string) {
    requestAnimationFrame(() => document.getElementById(id)?.focus());
  }
  function edit(row: PantryInventoryRow, trigger?: HTMLElement) {
    onDiscardSave();
    retryTarget.current = null;
    editorTrigger.current = trigger ?? null;
    setEditor({ row });
    requestAnimationFrame(() => quantityField.current?.focus());
  }
  function closeEditor(restoreTrigger = false) {
    if (editor) {
      const trigger = restoreTrigger ? editorTrigger.current : null;
      if (trigger && trigger.isConnected && !trigger.matches(':disabled')) trigger.focus();
      else focus(`pantry-edit-${editor.row.productId}`);
    }
    setEditor(null);
  }
  async function add(productId: string, trigger: HTMLElement) {
    const current = rows.find(row => row.productId === productId);
    if (current) { setSelected(null); edit(current, trigger); return; }
    setEditor(null);
    if (await saveRows([...rows, { productId, quantity: '', expiresSoon: false }], `pantry-edit-${productId}`)) {
      setSelected(null);
    }
  }
  async function saveRows(nextRows: readonly PantryInventoryRow[], focusId: string) {
    retryTarget.current = { focus: focusId };
    if (!await onSave(nextRows)) return false;
    retryTarget.current = null;
    focus(focusId);
    return true;
  }
  function updateEditor(quantity: string, unit: Unit | undefined) {
    if (!editor) return;
    const { productId, expiresSoon } = editor.row;
    setEditor({ row: { productId, expiresSoon, quantity, ...(unit ? { unit } : {}) } });
  }
  async function saveQuantity() {
    if (!editor) return;
    if (!validateInventoryRows([editor.row])) {
      setEditor({ ...editor, error: 'Введите количество больше 0 и выберите подходящую единицу или оставьте количество пустым' });
      quantityField.current?.focus();
      return;
    }
    retryTarget.current = 'quantity';
    if (await onSave(rows.map(row => row.productId === editor.row.productId ? { ...editor.row, expiresSoon: row.expiresSoon } : row))) {
      retryTarget.current = null;
      closeEditor();
    }
  }
  async function retry() {
    const target = retryTarget.current;
    if (target === 'quantity') { await saveQuantity(); return; }
    if (!await onRetrySave()) return;
    retryTarget.current = null;
    if (target) focus(target.focus);
    setSelected(null);
  }
  function searchChanged() {
    if (!editor) onDiscardSave();
    setSelected(null);
  }
  function refresh() {
    retryTarget.current = null;
    setSelected(null);
    setEditor(null);
    onRetryLoad();
  }
  function toggleExpiry(productId: string, expiresSoon: boolean) {
    return saveRows(rows.map(row => row.productId === productId ? { ...row, expiresSoon } : row), `pantry-expiry-${productId}`);
  }
  function confirmRemoval() {
    if (!removal || disabled) return;
    const { productId } = removal;
    const index = rows.findIndex(row => row.productId === productId);
    setRemoval(null);
    if (index === -1) return;
    if (editor?.row.productId === productId) setEditor(null);
    const neighbour = rows[index + 1] ?? rows[index - 1];
    void saveRows(rows.filter(row => row.productId !== productId), neighbour ? `pantry-row-${neighbour.productId}` : 'pantry-search');
  }

  return <section className="plan-read-model [overflow-wrap:anywhere]" aria-labelledby="pantry-title">
    <h1 id="pantry-title" tabIndex={-1}>Продукты дома</h1>
    {state.status === 'pending' && <Status>Загружаем запасы…</Status>}
    {impaired && <div className="notice" role="alert"><p>Не удалось загрузить запасы. Изменения пока недоступны.</p><Button onClick={refresh}>Повторить загрузку</Button></div>}
    {state.writeStatus === 'conflict' && <div className="notice" role="alert"><p>Запасы изменились в другой вкладке. Обновите их перед сохранением.</p><Button onClick={refresh}>Обновить запасы</Button></div>}
    <div className="card grid gap-4 min-w-0">
      <ProductCombobox id="pantry-search" label="Найти продукт" onSelect={setSelected} onQueryChange={searchChanged} port={pantryProductCatalog} disabled={disabled} />
      {selected && <p>Выбран продукт: {selected.name}</p>}
      <Button aria-label="Добавить выбранный продукт" disabled={!selected || disabled} onClick={event => { if (selected) void add(selected.id, event.currentTarget); }}>Добавить</Button>
      <div role="group" aria-label="Популярные продукты" className="flex flex-wrap gap-2">
        {popularProductIds.map(id => <Button key={id} disabled={disabled} onClick={event => void add(id, event.currentTarget)}>{pantryProductNames.find(item => item.id === id)?.name}</Button>)}
      </div>
    </div>
    {state.writeStatus === 'saving' && <Status>Сохраняем запасы…</Status>}
    {state.writeStatus === 'saved' && <Status>Запасы сохранены</Status>}
    {state.writeStatus === 'error' && <div className="notice" role="alert"><p>Не удалось сохранить изменения</p><Button disabled={disabled} onClick={() => void retry()}>Повторить сохранение</Button></div>}
    {!rows.length && (state.status === 'missing' || state.status === 'loaded') && <div className="card">
      <h2>Добавьте, что есть дома, и мы не купим лишнего</h2><p>Найдите продукт или выберите популярный.</p>
    </div>}
    {rows.length > 0 && <p className="hint">При расчёте покупок учитывается только известное совместимое количество. Запасы не списываются.</p>}
    {state.status === 'missing' && rows.length > 0 && <p className="hint">Исходные запасы из сохранённого меню.</p>}
    {rows.map(row => {
      const product = pantryProductNames.find(item => item.id === row.productId);
      if (!product) return null;
      const name = product.name;
      const shownQuantity = row.quantity.trim() && row.unit ? `${row.quantity.trim()} ${unitNames[row.unit]}` : '';
      const open = editor?.row.productId === row.productId ? editor : null;
      const units = row.productId === 'egg' && !needsPantryWeightConfirmation(row.productId, row.unit) ? ['pcs' as const] : product.allowedUnits;
      const clarification = needsPantryWeightConfirmation(row.productId, open?.row.unit ?? row.unit)
        ? ediblePantryProducts.find(item => item.productId === row.productId) : undefined;
      const clarifiedName = pantryProductNames.find(item => item.id === clarification?.pantryId)?.name;
      const clarifiedRow = rows.find(item => item.productId === clarification?.pantryId);
      return <section key={row.productId} id={`pantry-row-${row.productId}`} tabIndex={-1} className="card min-w-0" aria-label={`Домашний продукт ${name}`}>
        <h2>{name}</h2>
        {!open && <Button id={`pantry-edit-${row.productId}`} disabled={disabled} aria-label={`${shownQuantity ? 'Изменить' : 'Указать'} количество: ${name}`} onClick={event => edit(row, event.currentTarget)}>{shownQuantity || 'Указать количество'}</Button>}
        {!shownQuantity && <p className="hint">Количество не указано</p>}
        {clarification && <div className="mt-2">
          <p className="hint">Уточните продукт, чтобы учитывался съедобный вес. Выберите «{clarifiedName}».</p>
          {!open && (clarifiedRow ? <Button disabled={disabled} onClick={event => edit(clarifiedRow, event.currentTarget)}>Открыть уточнённый продукт</Button>
            : <Button disabled={disabled} aria-label={`Уточнить продукт: ${name} — ${clarifiedName}`} onClick={() => {
              const productId = clarification.pantryId;
              void saveRows(rows.map(item => item.productId === row.productId ? { ...item, productId } : item), `pantry-edit-${productId}`);
            }}>Уточнить продукт</Button>)}
        </div>}
        {open && <form className="grid gap-4 mt-4" onSubmit={event => { event.preventDefault(); if (!disabled) void saveQuantity(); }}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="pantry-quantity" label="Количество" hint="Дробь через точку или запятую." error={open.error}>
              <input ref={quantityField} id="pantry-quantity" type="text" inputMode="decimal" autoComplete="off" value={open.row.quantity}
                disabled={disabled} aria-invalid={!!open.error} aria-describedby={`pantry-quantity-hint${open.error ? ' pantry-quantity-error' : ''}`}
                onChange={event => updateEditor(event.target.value, open.row.unit)} />
            </Field>
            <Field id="pantry-unit" label="Единица">
              <select id="pantry-unit" value={open.row.unit ?? ''} disabled={disabled} onChange={event => updateEditor(open.row.quantity, (event.target.value || undefined) as Unit | undefined)}>
                <option value="">Не выбрана</option>{units.map(unit => <option key={unit} value={unit}>{unitNames[unit]}</option>)}
              </select>
            </Field>
          </div>
          <div className="flex flex-wrap gap-2"><Button type="submit" variant="primary" disabled={disabled}>Сохранить количество</Button><Button disabled={saving} onClick={() => { onDiscardSave(); closeEditor(true); }}>Отменить правку количества</Button></div>
        </form>}
        <div className="flex flex-wrap items-center gap-2 mt-4">
          <label className="inline-flex items-center gap-2 min-h-[44px]">
            <input id={`pantry-expiry-${row.productId}`} type="checkbox" className="!w-5 !min-h-0 h-5" checked={row.expiresSoon} disabled={disabled}
              aria-label={`Скоро испортится: ${name}`} onChange={event => void toggleExpiry(row.productId, event.target.checked)} />Скоро испортится
          </label>
          <Button variant="danger" disabled={disabled} aria-label={`Удалить продукт: ${name}`} onClick={event => setRemoval({ productId: row.productId, name, trigger: event.currentTarget })}>Удалить</Button>
        </div>
      </section>;
    })}
    <Link className="action-link" to="/plan/new">Составить меню</Link>
    {removal && <ConfirmDialog title="Удалить продукт из запасов?" description={`«${removal.name}» перестанет учитываться в списке покупок.`}
      cancelLabel="Оставить продукт" confirmLabel="Удалить продукт" returnFocus={removal.trigger} fallbackFocusId="pantry-search"
      onCancel={() => setRemoval(null)} onConfirm={confirmRemoval} />}
  </section>;
}
