import { useRef, useState } from 'react';
import { Link } from 'react-router';
import type { PantryInventoryRow } from '../../adapters/pantryInventory';
import { pantryProductCatalog, pantryProductNames, popularProductIds } from '../../adapters/products';
import type { ProductName } from '../../adapters/products';
import { needsPantryWeightConfirmation } from '../../domain/pantry';
import { validateInventoryRows } from '../../adapters/pantryInventory';
import type { Unit } from '../../domain/settings';
import { ProductCombobox } from '../../shared/ProductCombobox';
import { Button, Field, Status } from '../../shared/ui';
import type { PantryInventoryState } from '../generation/controller';

const unitNames: Record<Unit, string> = { g: 'г', kg: 'кг', ml: 'мл', l: 'л', pcs: 'шт.' };

export function PantryPage({ state, rows, savingMenu, onSave, onRetryLoad, onRetrySave }: {
  state: PantryInventoryState;
  rows: readonly PantryInventoryRow[];
  savingMenu: boolean;
  onSave(rows: readonly PantryInventoryRow[]): Promise<boolean>;
  onRetryLoad(): void;
  onRetrySave(): Promise<boolean>;
}) {
  const [selected, setSelected] = useState<ProductName | null>(null);
  const [editor, setEditor] = useState<{ row: PantryInventoryRow; error?: string } | null>(null);
  const quantityField = useRef<HTMLInputElement>(null);
  const saving = state.writeStatus === 'saving';
  const impaired = state.status === 'error' || state.status === 'corrupt';
  const disabled = saving || savingMenu || impaired || state.status === 'pending' || state.writeStatus === 'conflict';
  function focus(id: string) {
    requestAnimationFrame(() => document.getElementById(id)?.focus());
  }
  function edit(row: PantryInventoryRow) {
    setEditor({ row });
    requestAnimationFrame(() => quantityField.current?.focus());
  }
  function closeEditor() {
    if (editor) focus(`pantry-edit-${editor.row.productId}`);
    setEditor(null);
  }
  async function add(productId: string) {
    const current = rows.find(row => row.productId === productId);
    if (current) { setSelected(null); edit(current); return; }
    if (await onSave([...rows, { productId, quantity: '', expiresSoon: false }])) {
      setSelected(null);
      focus(`pantry-edit-${productId}`);
    }
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
    if (await onSave(rows.map(row => row.productId === editor.row.productId ? editor.row : row))) closeEditor();
  }
  async function retry() {
    if (!await onRetrySave()) return;
    if (editor) closeEditor();
    else if (selected) { focus(`pantry-edit-${selected.id}`); setSelected(null); }
  }

  return <section className="plan-read-model [overflow-wrap:anywhere]" aria-labelledby="pantry-title">
    <h1 id="pantry-title" tabIndex={-1}>Продукты дома</h1>
    {state.status === 'pending' && <Status>Загружаем запасы…</Status>}
    {impaired && <div className="notice" role="alert"><p>Не удалось загрузить запасы. Изменения пока недоступны.</p><Button onClick={onRetryLoad}>Повторить загрузку</Button></div>}
    {state.writeStatus === 'conflict' && <div className="notice" role="alert"><p>Запасы изменились в другой вкладке. Обновите их перед сохранением.</p><Button onClick={onRetryLoad}>Обновить запасы</Button></div>}
    <div className="card grid gap-4 min-w-0">
      <ProductCombobox id="pantry-search" label="Найти продукт" onSelect={setSelected} onQueryChange={() => setSelected(null)} port={pantryProductCatalog} disabled={disabled} />
      {selected && <p>Выбран продукт: {selected.name}</p>}
      <Button aria-label="Добавить выбранный продукт" disabled={!selected || disabled} onClick={() => { if (selected) void add(selected.id); }}>Добавить</Button>
      <div role="group" aria-label="Популярные продукты" className="flex flex-wrap gap-2">
        {popularProductIds.map(id => <Button key={id} disabled={disabled} onClick={() => void add(id)}>{pantryProductNames.find(item => item.id === id)?.name}</Button>)}
      </div>
    </div>
    {state.writeStatus === 'saving' && <Status>Сохраняем запасы…</Status>}
    {state.writeStatus === 'saved' && <Status>Запасы сохранены</Status>}
    {state.writeStatus === 'error' && <div className="notice" role="alert"><p>Не удалось сохранить изменения</p><Button disabled={disabled} onClick={() => void retry()}>Повторить сохранение</Button></div>}
    {!rows.length && (state.status === 'missing' || state.status === 'loaded') && <div className="card">
      <h2>Добавьте, что есть дома, и мы не купим лишнего</h2><p>Найдите продукт или выберите популярный.</p>
    </div>}
    {rows.length > 0 && <p className="hint">При расчёте покупок учитывается только известное совместимое количество. Запасы не списываются.</p>}
    {rows.map(row => {
      const product = pantryProductNames.find(item => item.id === row.productId);
      if (!product) return null;
      const name = product.name;
      const shownQuantity = row.quantity.trim() && row.unit ? `${row.quantity.trim()} ${unitNames[row.unit]}` : '';
      const open = editor?.row.productId === row.productId ? editor : null;
      const units = row.productId === 'egg' && !needsPantryWeightConfirmation(row.productId, row.unit) ? ['pcs' as const] : product.allowedUnits;
      return <section key={row.productId} className="card min-w-0" aria-label={`Домашний продукт ${name}`}>
        <h2>{name}</h2>
        {!open && <Button id={`pantry-edit-${row.productId}`} disabled={disabled} aria-label={`${shownQuantity ? 'Изменить' : 'Указать'} количество: ${name}`} onClick={() => edit(row)}>{shownQuantity || 'Указать количество'}</Button>}
        {!shownQuantity && <p className="hint">Количество не указано</p>}
        {needsPantryWeightConfirmation(row.productId, open?.row.unit ?? row.unit) && <p className="hint">Уточните продукт, чтобы учитывался съедобный вес. Выберите филе без кожи и костей или яичную массу без скорлупы.</p>}
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
          <div className="flex flex-wrap gap-2"><Button type="submit" variant="primary" disabled={disabled}>Сохранить количество</Button><Button disabled={saving} onClick={closeEditor}>Отменить правку количества</Button></div>
        </form>}
      </section>;
    })}
    <Link className="action-link" to="/plan/new">Составить меню</Link>
  </section>;
}
