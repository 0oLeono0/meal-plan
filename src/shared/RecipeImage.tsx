import { useState } from 'react';
import { getRecipeMedia } from '../data/recipeMedia';

export function RecipeImage({ catalogVersion, recipeId, name, priority = false, decorative = false }: {
  catalogVersion: string; recipeId: string; name: string; priority?: boolean; decorative?: boolean;
}) {
  const media = getRecipeMedia(catalogVersion, recipeId);
  const [failedSrc, setFailedSrc] = useState<string>();
  return <figure className="min-w-0">
    {!media || failedSrc === media.src
      ? <div role="img" aria-label="Фото недоступно" className="aspect-[4/3] w-full rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] flex flex-col gap-2 items-center justify-center">
        <svg aria-hidden="true" width="40" height="32" viewBox="0 0 40 32" fill="none"><rect x="1" y="1" width="38" height="30" rx="4" stroke="currentColor" /><path d="m4 27 10-12 8 8 5-6 9 10" stroke="currentColor" /><circle cx="28" cy="9" r="3" stroke="currentColor" /></svg><span>Фото недоступно</span>
      </div>
      : <img key={media.src} src={media.src} width={media.width} height={media.height} loading={priority ? 'eager' : 'lazy'} decoding="async" alt={decorative ? '' : `Фотоиллюстрация: ${name}`} onError={() => setFailedSrc(media.src)} className="aspect-[4/3] w-full object-cover rounded-2xl" />}
    {!decorative && <figcaption>Фотоиллюстрация создана с помощью ИИ; внешний вид блюда может отличаться</figcaption>}
  </figure>;
}
