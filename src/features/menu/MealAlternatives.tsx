import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { formatCurrency, formatDateOnly } from '../../domain/presentation';
import { roundHalfUp } from '../../domain/quantities';
import type { MealEditTarget } from '../../domain/mealEdits';
import { Button, Status, useModalFocus } from '../../shared/ui';
import type { MealAlternativesRequest } from '../generation/controller';
import { mealSlotNames } from './MealCard';

export interface MealAlternativesActions {
  request(target: MealEditTarget, signal: AbortSignal): Promise<MealAlternativesRequest>;
  select(target: MealEditTarget, recipeId: string, revision: number): void;
}

type PanelState = MealAlternativesRequest | { status: 'pending' | 'error' };

function signedKopecks(amount: bigint) {
  if (amount === 0n) return '0 ₽';
  return `${amount < 0n ? '−' : '+'}${formatCurrency(amount < 0n ? -amount : amount)}`;
}

function signedCalories(amount: bigint) {
  return `${amount === 0n ? '' : amount < 0n ? '−' : '+'}${amount < 0n ? -amount : amount} ккал`;
}

export function MealAlternatives({ target, recipeName, trigger, request, onChoose, onClose }: {
  target: MealEditTarget; recipeName: string; trigger: HTMLElement | null; request: MealAlternativesActions['request'];
  onChoose(recipeId: string, revision: number): void; onClose(): void;
}) {
  const id = useId();
  const overlay = useRef<HTMLDivElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const selection = useRef(false);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<PanelState>({ status: 'pending' });
  useModalFocus(overlay, close, onClose, trigger, 'menu-title');
  useEffect(() => {
    const abort = new AbortController();
    void request(target, abort.signal).then(result => {
      if (!abort.signal.aborted) setState(result);
    }, () => {
      if (!abort.signal.aborted) setState({ status: 'error' });
    });
    return () => abort.abort();
  }, [target, request, attempt]);

  return createPortal(<div ref={overlay} className="dialog-overlay !items-end !p-0 md:!items-center md:!p-[var(--space-md)]">
    <div className="app-shell !min-h-0 w-full md:max-w-[480px]">
      <section className="confirm-dialog mx-auto !max-h-[85vh] !rounded-b-none !pb-[max(var(--space-lg),env(safe-area-inset-bottom))] md:!rounded-b-[var(--radius-card)] [overflow-wrap:anywhere]" role="dialog" aria-modal="true" aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`}>
        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <h2 id={`${id}-title`}>Заменить блюдо</h2>
          <button type="button" ref={close} aria-label="Закрыть подбор" onClick={onClose}>Закрыть</button>
        </div>
        <p id={`${id}-description`}>{formatDateOnly(target.date)} · {mealSlotNames[target.slot]} · {recipeName}</p>
        {state.status === 'pending' && <Status>Подбираем блюда…</Status>}
        {(state.status === 'stale' || state.status === 'cancelled') && <p role="alert">Меню изменилось. Закройте подбор и попробуйте снова</p>}
        {state.status === 'error' && <div><p role="alert">Не удалось подобрать блюда</p><Button onClick={() => { setState({ status: 'pending' }); setAttempt(value => value + 1); }}>Повторить подбор</Button></div>}
        {state.status === 'ready' && (state.options.length === 0 ? <>
          <h3>Нет подходящих блюд</h3>
          <p>{state.overBudget ? 'Доступных замен в пределах бюджета нет' : 'При текущих настройках подходящих блюд не найдено. Закройте список, чтобы вернуться к меню'}</p>
          {state.incomplete && <p>Не удалось рассчитать покупку для части подходящих блюд</p>}
        </> : <>
          <p className="hint">Для всей семьи, цены примерные</p>
          {state.options.length < 3 && <Status>{state.options.length === 1 ? 'Найден 1 подходящий вариант' : 'Найдено 2 подходящих варианта'}</Status>}
          <ul className="grid gap-2 p-0 list-none">{state.options.map(option => <li key={option.recipeId}>
            <Button className="w-full text-left" onClick={() => {
              if (selection.current) return;
              selection.current = true;
              onChoose(option.recipeId, state.revision);
            }}><span className="block">{option.name}</span><span className="block text-[length:var(--text-label)] font-normal">{option.cookingMinutes} мин · Покупки за период: {signedKopecks(option.purchaseDeltaKopecks)} · Ккал за приём: {signedCalories(roundHalfUp(option.familyCalorieDelta))}</span></Button>
          </li>)}</ul>
        </>)}
      </section>
    </div>
  </div>, document.body);
}
