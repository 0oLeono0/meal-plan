import { useEffect, useId, useRef, useState } from 'react';
import { localProductCatalog, type ProductCatalogPort, type ProductName } from '../adapters/products';
import { Button } from './ui';

export function ProductCombobox({ label, onSelect, port = localProductCatalog, id, disabled = false }: {
  label: string; onSelect(product: ProductName): void; port?: ProductCatalogPort; id?: string; disabled?: boolean;
}) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const listId = `${inputId}-list`;
  const [query, setQuery] = useState('');
  const [retry, setRetry] = useState(0);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const request = useRef(0);
  const [response, setResponse] = useState<{ query: string; retry: number; items: readonly ProductName[]; error: boolean } | null>(null);
  const term = query.trim();
  const current = response?.query === query && response.retry === retry ? response : null;
  const pending = !!term && !current;
  const expanded = open && !!term;
  const items = current?.items ?? [];
  useEffect(() => {
    const token = ++request.current;
    if (!term) return;
    let active = true;
    void Promise.resolve().then(() => port.search(query)).then(items => {
      if (active && token === request.current) setResponse({ query, retry, items, error: false });
    }).catch(() => {
      if (active && token === request.current) setResponse({ query, retry, items: [], error: true });
    });
    return () => { active = false; };
  }, [query, retry, port, term]);
  useEffect(() => {
    if (expanded && items.length) document.getElementById(`${listId}-option-${highlight}`)?.scrollIntoView({ block: 'nearest' });
  }, [highlight, expanded, items.length, listId]);
  function select(product: ProductName) {
    if (pending || disabled || !expanded) return;
    request.current++;
    setQuery(''); setOpen(false); setHighlight(0);
    onSelect(product);
  }
  return <div className="field min-w-0">
    <label htmlFor={inputId}>{label}</label>
    <input id={inputId} type="text" role="combobox" autoComplete="off" value={query} disabled={disabled}
      aria-autocomplete="list" aria-expanded={expanded} aria-controls={expanded ? listId : undefined}
      aria-activedescendant={expanded && !pending && items[highlight] ? `${listId}-option-${highlight}` : undefined}
      aria-describedby={`${inputId}-status`} className="!text-left"
      onFocus={() => setOpen(true)} onBlur={event => { if (!event.currentTarget.parentElement?.contains(event.relatedTarget)) setOpen(false); }}
      onChange={event => { request.current++; setQuery(event.target.value); setHighlight(0); setOpen(true); }}
      onKeyDown={event => {
        if (event.nativeEvent.isComposing) return;
        if (event.key === 'Escape') { event.preventDefault(); setOpen(false); }
        else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault(); setOpen(true);
          if (items.length) setHighlight(old => (old + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length);
        } else if (event.key === 'Enter' || event.key === ',') {
          event.preventDefault(); if (expanded && !pending && items[highlight]) select(items[highlight]);
        }
      }} />
    {expanded && <ul id={listId} role="listbox" aria-label={label} aria-busy={pending} className="max-h-[240px] overflow-y-auto list-none p-0 m-0 min-w-0 border border-[var(--color-border)] rounded-xl">
      {!pending && items.map((product, index) => <li key={product.id} id={`${listId}-option-${index}`} role="option" aria-selected={highlight === index}
        className={`min-h-[44px] p-3 cursor-pointer [overflow-wrap:anywhere] ${highlight === index ? 'bg-[var(--color-selected)]' : 'bg-[var(--color-surface)]'}`}
        onMouseDown={event => event.preventDefault()} onMouseMove={() => setHighlight(index)} onClick={() => select(product)}>{product.name}</li>)}
    </ul>}
    <p id={`${inputId}-status`} role="status" className="hint">{!term ? 'Начните вводить название продукта' : pending ? 'Ищем продукты…' : !current?.error && !items.length ? 'Ничего не найдено. Попробуйте другое название' : ''}</p>
    {current?.error && <div><p role="alert">Не удалось загрузить продукты</p><Button disabled={disabled} onClick={() => { request.current++; setRetry(old => old + 1); setOpen(true); }}>Повторить поиск</Button></div>}
  </div>;
}

/** One pending removal per list; a newer removal replaces the preceding undo. */
export function useRemovalUndo<T>(fallbackId: string) {
  const [removed, setRemoved] = useState<{ value: T; index: number } | null>(null);
  const undoRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!removed) return;
    const timer = setTimeout(() => {
      if (document.activeElement === undoRef.current) document.getElementById(fallbackId)?.focus();
      setRemoved(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [removed, fallbackId]);
  return { removed, setRemoved, undoRef };
}
