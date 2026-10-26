import { useEffect, useId, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

export function Button({ variant = 'secondary', className = '', type = 'button', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' }) {
  return <button type={type} className={`${variant} ${className}`.trim()} {...props} />;
}

export function Field({ id, label, hint, error, children }: { id: string; label: string; hint?: string; error?: string; children: ReactNode }) {
  return <div className="field">
    <label htmlFor={id}>{label}</label>
    {children}
    {hint && <p className="hint" id={`${id}-hint`}>{hint}</p>}
    {error && <p className="field-error" id={`${id}-error`}>{error}</p>}
  </div>;
}

export function Status({ children }: { children: ReactNode }) {
  return <p role="status">{children}</p>;
}

// Custom modal avoids requiring dialog.showModal/inert, absent in Safari 15.0.
export function ConfirmDialog({ title, description, cancelLabel = 'Отмена', confirmLabel, onCancel, onConfirm }: {
  title: string; description: string; cancelLabel?: string; confirmLabel: string;
  onCancel(): void; onConfirm(): void;
}) {
  const id = useId();
  const overlay = useRef<HTMLDivElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const handlers = useRef({ onCancel, onConfirm });
  useEffect(() => { handlers.current = { onCancel, onConfirm }; }, [onCancel, onConfirm]);
  useEffect(() => {
    const initiator = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const node = overlay.current;
    if (!node) return;
    const siblings = Array.from(node.parentElement?.children ?? []).filter(element => element !== node);
    const previous = siblings.map(element => [element, element.getAttribute('aria-hidden')] as const);
    siblings.forEach(element => element.setAttribute('aria-hidden', 'true'));
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    cancel.current?.focus();
    function focusables() {
      return Array.from(node!.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), [tabindex="0"]'));
    }
    function keydown(event: KeyboardEvent) {
      if (event.key === 'Escape') { event.preventDefault(); handlers.current.onCancel(); }
      if (event.key !== 'Tab') return;
      const controls = focusables();
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
    function focusin(event: FocusEvent) {
      if (event.target instanceof Node && !node!.contains(event.target)) cancel.current?.focus();
    }
    document.addEventListener('keydown', keydown, true);
    document.addEventListener('focusin', focusin);
    return () => {
      document.removeEventListener('keydown', keydown, true);
      document.removeEventListener('focusin', focusin);
      previous.forEach(([element, value]) => value === null ? element.removeAttribute('aria-hidden') : element.setAttribute('aria-hidden', value));
      document.body.style.overflow = overflow;
      if (initiator?.isConnected) initiator.focus();
    };
  }, []);
  return <div className="dialog-overlay" ref={overlay}>
    <section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`}>
      <h2 id={`${id}-title`}>{title}</h2>
      <p id={`${id}-description`}>{description}</p>
      <div className="dialog-actions">
        <button type="button" ref={cancel} onClick={onCancel}>{cancelLabel}</button>
        <Button variant="primary" onClick={onConfirm}>{confirmLabel}</Button>
      </div>
    </section>
  </div>;
}
