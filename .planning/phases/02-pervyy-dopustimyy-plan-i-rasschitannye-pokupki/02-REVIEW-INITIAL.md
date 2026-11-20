---
phase: 02-pervyy-dopustimyy-plan-i-rasschitannye-pokupki
reviewed: 2026-10-30T11:32:36Z
depth: standard
diff_base: a259fae
reviewed_head: c797a1d6fe5c4a05af29557c7cf789bf1c3fcc19
files_reviewed: 53
files_reviewed_list:
  - e2e/accessibility.spec.ts
  - e2e/budget.spec.ts
  - e2e/entry-policies.spec.ts
  - e2e/fixtures.ts
  - e2e/generation-fixtures.ts
  - e2e/generation-races.spec.ts
  - e2e/generation-storage.spec.ts
  - e2e/generation.spec.ts
  - e2e/menu.spec.ts
  - e2e/navigation.spec.ts
  - e2e/phase02-presentation.spec.ts
  - e2e/plan-fixtures.ts
  - e2e/presentation.spec.ts
  - e2e/products.spec.ts
  - e2e/shopping.spec.ts
  - src/adapters/activePlan.test.ts
  - src/adapters/activePlan.ts
  - src/adapters/catalog.test.ts
  - src/adapters/catalog.ts
  - src/adapters/generation.test.ts
  - src/adapters/generation.ts
  - src/adapters/products.ts
  - src/adapters/trustedCatalogs.ts
  - src/app/App.tsx
  - src/data/catalog.test.ts
  - src/data/catalog.ts
  - src/data/foodSources.ts
  - src/data/recipes.ts
  - src/data/sources.test.ts
  - src/domain/appliedSettings.test.ts
  - src/domain/appliedSettings.ts
  - src/domain/catalog.ts
  - src/domain/generatePlan.test.ts
  - src/domain/generatePlan.ts
  - src/domain/plan.test.ts
  - src/domain/plan.ts
  - src/domain/planProjection.test.ts
  - src/domain/planProjection.ts
  - src/domain/presentation.test.ts
  - src/domain/presentation.ts
  - src/domain/quantities.test.ts
  - src/domain/quantities.ts
  - src/features/generation/GenerationPage.tsx
  - src/features/generation/controller.test.ts
  - src/features/generation/controller.ts
  - src/features/menu/MenuPage.tsx
  - src/features/plan/PlanLoading.tsx
  - src/features/plan/PlanSummary.tsx
  - src/features/shopping/ShoppingPage.tsx
  - src/features/wizard/ExclusionsStep.tsx
  - src/features/wizard/HomeProductsStep.tsx
  - src/features/wizard/Wizard.tsx
  - src/shared/styles/tokens.css
findings:
  critical: 2
  warning: 0
  info: 0
  total: 2
status: issues_found
---

# Phase 2: Code Review Report

**Reviewed:** 2026-10-30T11:32:36Z  
**Depth:** standard  
**Files Reviewed:** 53  
**Status:** issues_found

## Summary

Проверен явный список `.tmp/phase2-code-review-files.txt` на HEAD `c797a1d`, с контекстом правил проекта, решений D-01–D-20 и контрактов второй фазы. Проверены вычисления, ограничения, единицы, pantry-покрытие, обработка отказов, async ownership, сохранение и интеграция экранов; тесты прочитаны в части надёжности и покрытия этих границ. Найдены два воспроизводимых дефекта пользовательского запуска. Оба требуют исправления до приёмки фазы.

Выводы ниже подтверждены текущими исходниками и двумя реально выполненными минимальными Node/Vite SSR probes без изменений исходников. Полная Vitest/Playwright-матрица, build, typecheck и lint в рамках этого review повторно не запускались; результаты оркестратора не представлены как собственные проверки. Повторная экспертиза всех исходных USDA строк и кулинарного содержания не входила в эту проверку. Новых подтверждённых уязвимостей сверх двух описанных ошибок поведения не установлено. Исторические исправления каталожного trust boundary и UI не повторяются как открытые findings.

## Narrative Findings (AI reviewer)

## Critical Issues

### CR-01: «Без рыбы» ошибочно требует отдельную аллергенную гарантию и исключает весь рабочий каталог

**Classification:** BLOCKER  
**File:** `D:/Projects/meal-plan/src/domain/generatePlan.ts:97-99`  
**Related files:** `D:/Projects/meal-plan/src/adapters/activePlan.ts:32-44`, `D:/Projects/meal-plan/src/data/catalog.ts:32-34`, `D:/Projects/meal-plan/src/data/catalog.ts:84-85`

**Issue:** При выборе диетического ограничения `no-fish` генератор добавляет обязательный факт `kind: 'allergen', key: 'seafood'`. Ту же дополнительную проверку выполняет load/save boundary. Однако рабочий каталог переводит проверенную классификацию `no-fish` только в restriction fact; в нём нет разрешающих allergen facts. Зафиксированная семантика этой классификации уже включает отсутствие рыбных ингредиентов и морепродуктов (`docs/data/phase02-sources.md:81-86`). Отдельная гарантия отсутствия аллергенных следов в упаковке остаётся unknown. Смешение этих контрактов делает обычный выбор «Без рыбы» неизменно неработающим даже для всех 52 подтверждённых растительных рецептов.

**Trigger / reproduction:** Взять `createDraft()`, изменить только `days: '1'` и `restrictions: ['no-fish']`, применить через `buildAppliedSettings`, создать `createPlanInputs` с `bundledCatalog` и выполнить `createPlanSearch` до завершения. Выполненный probe получил `status: 'error'`, `code: 'GENERATION_DATA_INCOMPLETE'` и **178** diagnostics с `message: 'allergen:seafood'`. Контрольные запуски того же каталога с `restrictions: []` и `['vegetarian']` дали `success`.

**Impact:** Пользователь не может составить план с поддерживаемым диетическим ограничением. Исправление только генератора недостаточно: persistence boundary затем отклонит тот же план. Это не обнаружение опасного продукта и не основание снимать ограничения пользователя.

**Fix:** Разделить подтверждённую классификацию ингредиентного ограничения `no-fish` (рыба и все морепродукты) и явно запрошенную аллергенную гарантию. Согласовать predicate генерации и проверки active bundle с этой семантикой; отдельно запрошенный `allergenKeys: ['seafood']` по-прежнему должен требовать собственное подтверждение и отказывать при unknown. Не создавать разрешающий allergen fact из общего названия растения. При необходимости выразить охват restriction fact явно в модели/источнике и проверять его на source gate. Добавить production-catalog regression: no-fish success → validate/save/load success, а explicit seafood-allergy unknown → отказ; сохранить отрицательные проверки рыбных/морепродуктовых ингредиентов. Согласовать затронутые синтетические ожидания `src/domain/generatePlan.test.ts:77-80` и описание контракта в `02-04-SUMMARY.md` с документированной source classification.

### CR-02: Очистка единицы домашнего продукта превращает допустимый черновик в «повреждённый»

**Classification:** BLOCKER  
**File:** `D:/Projects/meal-plan/src/domain/appliedSettings.ts:79-82`  
**Related files:** `D:/Projects/meal-plan/src/domain/appliedSettings.ts:36-51`, `D:/Projects/meal-plan/src/features/wizard/HomeProductsStep.tsx:43`, `D:/Projects/meal-plan/src/app/App.tsx:230-232`

**Issue:** Обработчик выбора «Не выбрана» записывает в строку собственное поле `unit: undefined`. Это законная форма `HomeDraftRow` и разрешена `isSettingsDraft`; при пустом количестве все четыре `validateStep` проходят. Но новый apply gate сначала передаёт исходный объект в строгий `immutableSnapshot`, который отвергает `undefined` до проверки draft shape. Catch возвращает ложную ошибку повреждения по полю `people` на первом шаге.

**Trigger / reproduction:** На шаге 4 добавить Рис, оставить количество пустым, выбрать единицу «г», затем снова «Не выбрана» и нажать «Составить меню» или «Пропустить». Получится строка `{ productId: 'rice', quantity: '', expiresSoon: false, unit: undefined }`. Выполненный domain probe подтвердил результаты четырёх `validateStep`: `[{}, {}, {}, {}]`, затем `buildAppliedSettings` → `{ status: 'invalid', step: 1, errors: { people: 'Сохранённые настройки повреждены. Проверьте мастер' } }`. После JSON roundtrip того же объекта результат становится `applied`, поскольку JSON удаляет optional undefined property.

**Impact:** Нормальное действие интерфейса блокирует генерацию и переносит пользователя на несвязанный шаг, где корректировка числа людей не устраняет причину. Поведение зависит от перезагрузки страницы, хотя настройки семантически не меняются.

**Fix:** На доменной границе черновика валидировать и канонизировать разрешённое optional поле: `unit === undefined` представлять отсутствием свойства, сохранив отказ для недопустимых заданных значений. Использовать эту каноническую форму при построении `AppliedSettings.raw` и её повторной проверке. Не ослаблять общий `immutableSnapshot` для всех объектов. UI также может удалять поле при очистке, но это не заменяет совместимость apply gate с контрактом `HomeDraftRow`. Добавить domain regression для собственного `unit: undefined` и browser regression «г → Не выбрана → submit» с пустым количеством; отдельно сохранить ошибку шага 4 при известном количестве без единицы. Проверить одинаковую семантику до и после сохранения/reload.

---

_Reviewed: 2026-10-30T11:32:36Z_  
_Reviewer: the agent (gsd-code-reviewer)_  
_Depth: standard_
