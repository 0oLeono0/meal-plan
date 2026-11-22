# Фаза 5 — Карта шаблонов для домашних запасов

**Дата** 22.11.2026. Сопоставление опирается на текущие CONTEXT, RESEARCH, UI-SPEC и файлы под контролем Git. Имена новых файлов служат ориентирами для плана.

## Классификация файлов

| Файл или область | Роль | Поток данных | Аналог |
| --- | --- | --- | --- |
| `src/adapters/pantry.ts`, `pantry.test.ts` | Адаптер, тест | Версионное чтение и запись | `src/adapters/activePlan.ts:56–94`, `src/adapters/guestDraft.ts:17–45`, `src/adapters/activePlan.test.ts:36–102` |
| `src/domain/pantry.ts`, `src/domain/settings.ts` | Доменная модель и валидация | Ввод → стабильная строка запаса → точный снимок | `src/domain/pantry.ts:4–17`, `src/domain/settings.ts:105–124`, `src/domain/appliedSettings.ts:90–126` |
| `src/domain/planProjection.ts`, `src/adapters/activePlan.ts` | Проекция и граница доверия | Принятый план и актуальный запас → ведомость каждого варианта | `src/domain/planProjection.ts:59–79,107–150`, `src/adapters/activePlan.ts:23–54` |
| `src/features/generation/controller.ts` и тесты | Оркестратор | Снимок, редакция, команды, подтверждение или откат | `src/features/generation/controller.ts:114–176,230–304`, `src/features/generation/controller.test.ts:260–308` |
| `src/features/pantry/PantryPage.tsx`, редактор количества | Экран и компоненты | События формы → подтверждённый CRUD | `src/features/wizard/HomeProductsStep.tsx:11–67`, `src/shared/ProductCombobox.tsx:5–69`, `src/shared/ui.tsx:26–62` |
| `src/app/App.tsx`, `src/features/wizard/Wizard.tsx` | Маршруты и владение вводом | Черновик и сохранённые настройки → выбор базы → запуск | `src/app/App.tsx:115–159,207–280`, `src/domain/settings.ts:90`, `src/domain/appliedSettings.ts:137–144` |
| `src/features/shopping/ShoppingPage.tsx`, `src/features/menu/MenuPage.tsx`, `src/features/recipe/RecipePage.tsx` | Читающие экраны | Общий подтверждённый снимок → покупки, меню и рецепт | `src/features/generation/controller.ts:38–42`, `src/app/App.tsx:207–310`, `e2e/meal-edits.spec.ts:137–197` |
| `src/domain/generatePlan.ts`, `src/adapters/generation.ts` | Солвер и порт | Допустимые рецепты → ограниченный поиск → проверяемый результат | `src/domain/generatePlan.ts:24–31,55–74,93–128`, `src/adapters/generation.ts:44–49,65–91` |
| `e2e/pantry.spec.ts` | Браузерный тест | Подтверждённое меню, правка, покупки, reload | `e2e/generation-fixtures.ts:23–119`, `e2e/meal-edits.spec.ts:137–197,377–444` |

## Назначение шаблонов

### Хранилище и валидатор

В `src/adapters/activePlan.ts:56–94` адаптер инъецирует getter хранилища, запоминает исходные байты после чтения и сверяет их непосредственно перед записью. `src/adapters/guestDraft.ts:17–31` показывает отдельные состояния отсутствия, повреждения и отказа; подтверждённый пустой холодильник должен возвращаться как результат чтения, отличный от отсутствия. Ограничение длины и UTF-8 перед разбором показано в `activePlan.ts:23–24,66–67`, негативный тест с сохранением исходных байтов — в `activePlan.test.ts:59–101`.

```ts
// src/adapters/activePlan.ts:87–92
if (storage.getItem(ACTIVE_PLAN_KEY) !== inspectedRaw) { writable = false; return { status: 'blocked' }; }
if (!writable) return { status: 'blocked' };
if (!isCurrent()) return { status: 'cancelled' };
storage.setItem(ACTIVE_PLAN_KEY, raw);
inspectedRaw = raw;
```

### Запасы и живая проекция

Применять `needsPantryWeightConfirmation` и `matchesPantryFood` из `src/domain/pantry.ts:9–17`, в том числе сопоставление с точным профилем съедобной массы. `validateHomeRow` в `src/domain/settings.ts:111–124` проверяет разрешённую единицу; точное преобразование строки выполняется в `buildAppliedSettings`, а числовой результат проверки формы не служит основой расчёта. `src/domain/planProjection.ts:70–79,107–150` создаёт новую карту остатка для одного варианта, переводит только совместимые величины и после покрытия уменьшает остаток.

```ts
// src/domain/planProjection.ts:119
stock.set(pantry.productId, { ...remainder, amount: subtract(remainder.amount, consumed.amount) });
```

`validateActiveBundle` в `src/adapters/activePlan.ts:27–49` проверяет версию, доверенный каталог, допуск рецептов и бюджет сохранённого основания. Живая проекция должна сохранить эту границу. Для превышения из-за изменения запасов и отдельного сохранённого основания допуска использовать контракт RESEARCH § 2. При выборе другого варианта создавать его собственную проекцию, без списания из холодильника.

### Контроллер и экран

`visiblePlanSnapshot` в `src/features/generation/controller.ts:38–42` выдаёт один отображаемый снимок. `save` в строках 149–176 сериализует запись и проверяет актуальность перед мутацией. Тест `src/features/generation/controller.test.ts:276–308` фиксирует подтверждение записи, которая уже состоялась на границе дедлайна. `mealAlternatives` и `applyMealEdit` в строках 271–304 показывают, куда включить эффективную редакцию запасов вместе с редакцией плана.

```ts
// src/features/generation/controller.ts:158
return activePlan.save(candidate.plan, { isCurrent: () => owned(op) && writeAllowed && clock.now() < op.deadline });
```

У редактора взять подписанные `Field`, `inputMode="decimal"`, ошибки поля, список допустимых единиц и имена действий из `src/features/wizard/HomeProductsStep.tsx:29–67`. Состояние временного количества сохраняется отдельно от подтверждённого холодильника. `src/shared/ProductCombobox.tsx:5–69` даёт выбор продукта и защиту от устаревшей выдачи. На экране «Дома» обработчик выбора запоминает выбранный ID до «Добавить», чипы добавляют сразу.

### Черновик, запуск и тесты

`src/app/App.tsx:115–159` сохраняет пользовательский ввод и отличает его от повторной загрузки по редакции. Домашние строки обновляются единственной командой `home` в `src/domain/settings.ts:90`. При выборе базы запасов сохранять происхождение черновика отдельно от действующих запретов и не записывать холодильник из обработчика мастера. `selectQuickStartInput` в `src/domain/appliedSettings.ts:137–144` сохраняет текущий порядок валидных применённых настроек, черновика и начальных значений.

`src/app/App.tsx:235–280` использует действующее подтверждение замены плана и хранит базу для повторного запуска. Даты и новый запрос создавать штатным путём. `src/domain/generatePlan.ts:55–74` начисляет мягкий приоритет `expiresSoon` по первым двум датам:

```ts
// src/domain/generatePlan.ts:67
for (const source of row.sources.filter(source => inputs.dates.slice(0, 2).includes(source.date))) {
```

Использовать существующий ограниченный поиск и проверку актуальности между пакетами. `src/domain/generatePlan.test.ts:52` проверяет согласованную трактовку подтверждённых съедобных запасов при бюджете, исключении и приоритете. Для браузерных проверок `e2e/generation-fixtures.ts:23–119` показывает делегирование реальному порту с управляемой задержкой, `e2e/meal-edits.spec.ts:137–197` сравнивает суммы на двух экранах и отказ при изменении сырых байтов. Первый сценарий фазы проходит через получившееся приложение и сохранённый план, с независимым ожиданием моркови 500 г → покупка 300 г при запасе 200 г.

## Общие правила

- Проектор выдаёт точные суммы и количественные источники. Формы и экраны отображают результаты без отдельной арифметики.
- У фазового контракта нет прямого аналога для отдельного основания бюджета каждого варианта или пометки актуальности при недоступной записи. Их интерфейс и ограничения описаны в RESEARCH. Повторное использование адаптера относится к паттерну проверки и записи.
- Различать отсутствие записи, подтверждённый пустой список, чтение, конфликт и ошибку. Неподтверждённый расчёт маркируется на связанных экранах.
