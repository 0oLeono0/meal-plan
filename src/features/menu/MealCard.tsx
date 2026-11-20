import { Link } from 'react-router';
import type { ReactNode } from 'react';
import type { InstanceProjection } from '../../domain/planProjection';
import type { MenuView } from '../../domain/menuView';
import { formatDateOnly } from '../../domain/presentation';
import { presentMealCard } from '../../domain/menuView';
import { RecipeImage } from '../../shared/RecipeImage';

export const mealSlotNames = { breakfast: 'Завтрак', lunch: 'Обед', dinner: 'Ужин', snack: 'Перекус' } as const;
export function MealCard({ row, catalogVersion, variantId, view, priority, actions, onOpen }: {
  row: InstanceProjection; catalogVersion: string; variantId: string; view: MenuView; priority: boolean; actions?: ReactNode; onOpen(): void;
}) {
  const { instance } = row, recipe = instance.recipeSnapshot;
  const { nutrition, price, servings, usesPantry } = presentMealCard(row);
  const href = `/recipe/${encodeURIComponent(instance.recipeId)}?${new URLSearchParams({ variant: variantId, instance: instance.id, view: view.mode, day: view.day ?? instance.date })}`;
  return <article className="meal-card" data-instance-id={instance.id} data-slot={instance.slot}>
    <Link className="meal-card-link" to={href} aria-label={`${recipe.name} · ${formatDateOnly(instance.date)} · ${mealSlotNames[instance.slot]}`} onClick={event => {
      if (event.button === 0 && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) onOpen();
    }}>
      <RecipeImage catalogVersion={catalogVersion} recipeId={instance.recipeId} name={recipe.name} priority={priority} decorative />
      <div className="meal-card-content"><h3 className={`meal-slot meal-slot-${instance.slot}`}>{mealSlotNames[instance.slot]}</h3>
        <p className="meal-card-name">{recipe.name}</p><p>{recipe.cookingMinutes} мин · {nutrition.calories} ккал</p>
        <p className="tabular-nums">≈ {price} за порцию</p><p>Порций для семьи: {servings}</p>
        {usesPantry && <p className="stock-badge">Использует запасы</p>}
        <p className="hint meal-nutrition">На порцию: {nutrition.calories} ккал · Б {nutrition.protein} г · Ж {nutrition.fat} г · У {nutrition.carbohydrates} г · ≈ {price}</p>
      </div>
    </Link>
    {actions}
  </article>;
}
