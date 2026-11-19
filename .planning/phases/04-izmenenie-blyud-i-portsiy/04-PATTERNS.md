# Фаза 4 — Карта существующих шаблонов

Дата 18.11.2026. Имена новых файлов ниже служат ориентирами для плана. Все аналоги относятся к действующим файлам проекта под контролем Git.

## File Classification

| Файл | Роль | Поток данных | Аналог |
| --- | --- | --- | --- |
| `src/domain/mealEdits.ts` (новый) | Доменная операция | Команда → проверенный вариант и проекция | `src/domain/generatePlan.ts:23–43,152–177,210–229`, `src/domain/planProjection.ts:59–93` |
| `src/domain/plan.ts` | Модель и кодек | Входящий снимок → проверка → запись | `src/domain/plan.ts:139–161,166–193,218–252` |
| `src/domain/planProjection.ts`, `src/domain/menuView.ts` | Проекция и представление | Вариант → итоги и отображаемые ячейки | `src/domain/planProjection.ts:67–93`, `src/domain/menuView.ts:9–43` |
| `src/domain/recipeView.ts` | Проекция маршрута | URL и активный вариант → контекст рецепта | `src/domain/recipeView.ts:24–66,91–127` |
| `src/domain/generatePlan.ts`, `src/adapters/generation.ts` | Генератор и адаптер | Допуск → ограниченный поиск и отмена | `src/domain/generatePlan.ts:125–177,210–229`, `src/adapters/generation.ts` |
| `src/features/generation/controller.ts` | Контроллер | Действие, ревизия и запись → публичный снимок | `src/features/generation/controller.ts:39–71,93–146,163–189,211–237` |
| `src/adapters/activePlan.ts` | Адаптер | Чтение → проверка → охраняемая запись | `src/adapters/activePlan.ts:22–57,59–97`, `src/adapters/trustedCatalogs.ts:15–33` |
| `src/app/App.tsx` | Маршруты | Публичный снимок → меню, рецепт и покупки | `src/app/App.tsx:217–234,250–288` |
| `src/features/menu/MenuPage.tsx`, `src/features/menu/MealCard.tsx` | Компоненты | Координаты и действия → сетка и связанный рецепт | `src/features/menu/MenuPage.tsx:108–142`, `src/features/menu/MealCard.tsx:8–26` |
| `src/features/recipe/RecipePage.tsx`, `src/features/shopping/ShoppingPage.tsx` | Компоненты | Общая проекция → рецепт и покупки | `src/features/recipe/RecipePage.tsx:49–96`, `src/features/shopping/ShoppingPage.tsx:17–45` |
| Панель альтернатив (новый компонент), `src/shared/ui.tsx` | Модальная панель | События выбора и завершения → действия и фокус | `src/shared/ui.tsx:16–79` |
| `src/domain/mealEdits.test.ts` (новый) и тесты расчётов | Тесты | Независимые ожидаемые величины → проверка точных итогов | `src/domain/planProjection.test.ts`, `src/domain/generatePlan.test.ts`, `src/domain/recipeView.test.ts` |
| Тесты кодека, записи и контроллера | Тесты | Снимки, отказы, очередность → проверка сохранённого состояния | `src/domain/plan.test.ts`, `src/adapters/activePlan.test.ts`, `src/features/generation/controller.test.ts` |
| `e2e/meal-edits.spec.ts` (новый) | Браузерный тест | Действия пользователя → три экрана, байты и перезагрузка | `e2e/phase03-recipes.spec.ts:7–76,134–171`, `e2e/generation-races.spec.ts:5–75`, `e2e/generation-fixtures.ts:23–119` |

## Pattern Assignments

### Доменная операция и бюджет

У `src/domain/planProjection.ts:59–64` есть единый точный и отображаемый допуск. Код после строки 67 принимает неполный набор вхождений для проекции. Строгая валидация сохранённого конверта и выдачи генератора остаётся отдельной.

```ts
const exactWithinLimit = compare(purchase, limit) <= 0;
const displayedWithinLimit = purchaseKopecks <= roundHalfUp(limit, 2);
return { accepted: exactWithinLimit && displayedWithinLimit, exactWithinLimit, displayedWithinLimit,
  reason: !exactWithinLimit ? 'exact-limit-exceeded' : !displayedWithinLimit ? 'display-rounding-exceeded' : 'within-budget' };
```

Взять проверку ограничений из генератора и адаптера сохранений, диапазоны в таблице. Из кандидата проектировать весь вариант. Для порций переиспользовать `Rational`, `selectedServings` и `baseServings`. Дельты рассчитывать для покупок за период и калорий одного приёма. Отпечаток из `generatePlan.ts:23–28` служит образцом для недопущения повторного автоматически добавленного варианта.

### Кодек и охраняемая запись

Модель разбирает поля и координаты в `plan.ts:166–193,218–252`. Сохранить строгий разбор исторического конверта с полными слотами. Для новой редакции проверить намеренную пустоту по явной координате и отдельно проверить полноту результатов генератора. Адаптер дополнительно проверяет доверенный снимок каталога, двоякий бюджетный допуск и лимит UTF-8. Хранимые байты при чтении остаются исходными.

В контроллере `controller.ts:121–141` публикация кандидата и подтверждение имеют одну управляемую очередь:

```ts
publish({ status: 'saving', candidate, error: null, saveError: null });
// Keep one final write in flight. A superseded queued task never calls the port.
const queued = writes.then(async (): Promise<ActivePlanSaveResult> => {
  if (!owned(op) || rejectExpired(op)) return { status: 'cancelled' };
  if (!writeAllowed) return { status: 'blocked' };
  return activePlan.save(candidate.plan, { isCurrent: () => owned(op) && writeAllowed && clock.now() < op.deadline });
});
```

Для правок применять тот же контроль владельца операции и ревизии. Один временный расчёт доступен всем трём маршрутам во время подтверждения. Сбой возвращает подтверждённый результат вместе с подходящим способом восстановления. В `activePlan.ts:80–96` проверка прочитанных байтов предшествует записи и ловит наблюдаемый конфликт. Текущая последовательность чтения и записи не является межвкладочной транзакцией.

### Координаты, маршруты и фокус

В `MenuPage.tsx:120–128` существующая сетка строит день и рендерит карточки проекции. Для пустоты строить канонические `dates × mealSlots`. Ссылка рецепта и кнопки действий соседи. В `MealCard.tsx:12–17` есть параметризация связанного URL. В `recipeView.ts:51–58` остаётся проверка, что этот URL относится к активной версии, нужному вхождению и рецепту:

```ts
const active = request.active;
if (!active || active.plan.activeVariantId !== variantId) return invalid();
if (day && !active.plan.inputs.dates.includes(day)) return invalid();
const variant = active.plan.variants.find(row => row.id === variantId);
const instance = variant?.instances.find(row => row.id === instanceId);
if (!instance || instance.recipeId !== id) return invalid();
```

Временный просмотр замены рецепта связывать с текущей операцией. Подтверждение меняет URL, только пока исходный экран и операция актуальны. При уходе различать отменяемый подбор и подтверждение правки. В `App.tsx:217–234` текущая общая отмена при уходе из меню служит точкой проверки этого различия.

Каркас панели взять из `ConfirmDialog` в `src/shared/ui.tsx:36–77`. Там скрытие фоновых соседей, блокировка прокрутки, удержание фокуса, Escape и восстановление атрибутов при закрытии. При исчезновении исходной кнопки использовать стабильный фокус карточки или пустого слота, затем заголовок дня:

```tsx
if (initiator?.isConnected) initiator.focus();
else if (fallback.current) document.getElementById(fallback.current)?.focus();
```

### Браузерная проверка

Короткий сквозной тест брать из `e2e/phase03-recipes.spec.ts:7–45`: старт из интерфейса, проверка существующего сохранения, выбор точного вхождения и связанного рецепта.

```ts
await page.goto('/');
await page.getByRole('button', { name: 'Меню за 1 клик', exact: true }).click();
await expect(page).toHaveURL(/\/menu$/, { timeout: 32_000 });
const raw = await page.evaluate(key => localStorage.getItem(key), key);
expect(raw).not.toBeNull();
```

Расширить проверками покупок и перезагрузки. Для отказов и поздних ответов использовать тестовый шаблон `mountGeneration`, `release`, `preserved` из `e2e/generation-fixtures.ts:23–119` и существующие сценарии `e2e/generation-races.spec.ts:5–75`. Фикстуры уместны для детерминированных конфликтов, эквивалентных вариантов и крайних состояний. Первый сценарий фазы должен проходить через действующие генерацию и запись.

## Shared Patterns

- Точный расчёт живёт в домене. Компоненты форматируют данные через текущие средства представления.
- Готовые значения покупок, питания и покрытия приходят из одного снимка проекции. Калькуляции по строкам интерфейса создавали бы расходящиеся итоги.
- Существующие формат сохранения, токены, роли и локальные адаптеры использовать в соответствующих границах. Изменения добавляют проверку пустых координат и хранение правок в той же предметной модели.
- UX для редакции блюда из рецепта в ожидании записи требует новой связи между URL и временным снимком. Существующий resolver даёт строгую проверку завершённого снимка, а точный переход и откат описывает UI-SPEC.
