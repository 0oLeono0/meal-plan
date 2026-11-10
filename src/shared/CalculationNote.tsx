export function CalculationNote() {
  return <section aria-label="О расчётах" className="my-6 text-[length:var(--text-label)] text-[var(--color-muted)]">
    <p className="!mb-0">Цены и КБЖУ примерные</p>
    <details className="mt-1">
      <summary className="min-h-[44px] w-fit py-2 cursor-pointer">Как считаем</summary>
      <p className="!mb-0 max-w-prose">Используем примерные справочные цены. В магазине стоимость может отличаться. КБЖУ считаем по количеству продуктов и порциям, значения зависят от марки продуктов и способа приготовления.</p>
    </details>
  </section>;
}
