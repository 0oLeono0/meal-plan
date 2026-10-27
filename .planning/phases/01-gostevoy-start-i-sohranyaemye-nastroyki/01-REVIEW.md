---
phase: 01-gostevoy-start-i-sohranyaemye-nastroyki
reviewed: 2026-10-27T08:43:49Z
depth: standard
reviewed_revision: c899a1caea6564461b815fce1966923bc35c5bcd
scope_status: degraded
scope_reason: no-task-commit-rows
files_reviewed: 38
files_reviewed_list:
  - .gitignore
  - e2e/accessibility.spec.ts
  - e2e/budget.spec.ts
  - e2e/fixtures.ts
  - e2e/guest.spec.ts
  - e2e/navigation.spec.ts
  - e2e/nutrition.spec.ts
  - e2e/presentation.spec.ts
  - e2e/products.spec.ts
  - e2e/storage.spec.ts
  - e2e/wizard.spec.ts
  - eslint.config.js
  - index.html
  - package.json
  - playwright.config.ts
  - scripts/verify-calculator-decision.mjs
  - src/adapters/guestDraft.test.ts
  - src/adapters/guestDraft.ts
  - src/adapters/products.ts
  - src/app/App.tsx
  - src/domain/budget.test.ts
  - src/domain/budget.ts
  - src/domain/nutritionTarget.test.ts
  - src/domain/nutritionTarget.ts
  - src/domain/settings.test.ts
  - src/domain/settings.ts
  - src/features/wizard/BudgetStep.tsx
  - src/features/wizard/ExclusionsStep.tsx
  - src/features/wizard/HomeProductsStep.tsx
  - src/features/wizard/NutritionFields.tsx
  - src/features/wizard/PeopleStep.tsx
  - src/features/wizard/Wizard.tsx
  - src/features/wizard/copy.ts
  - src/shared/ProductCombobox.tsx
  - src/shared/styles/tokens.css
  - src/shared/ui.tsx
  - tsconfig.json
  - vite.config.ts
findings:
  critical: 1
  warning: 2
  info: 0
  total: 3
status: issues_found
---

# Phase 1: Code Review Report

**Reviewed:** 2026-10-27T08:43:49Z  
**Depth:** standard  
**Files Reviewed:** 38  
**Status:** issues_found

## Summary

Проверены исходники гостевого каркаса, четырёх шагов, адаптеров, доменной валидации, общих компонентов, конфигурации и тестов на ревизии `c899a1c`, включая presentation fix `6ebde75`. Найден один риск потери сохранённых настроек и два воспроизводимых нарушения управления фокусом.

Область сверена с SUMMARY 01–08 и `check evaluation-scope --phase 01 --raw`. Resolver вернул `degraded / no-task-commit-rows`, расширив область до `phase-range`; произвольный диапазон коммитов не выбирался. В отчёте перечислен точный проверенный source/config/test scope; планировочные артефакты, lockfile и поясняющие документы использованы как контекст, а не как исходный код приложения. Учтены AGENTS.md, domain skill, CONTEXT, UI-SPEC, human-confirmed D-10 amendment, QA и предшествующие аудиты. Structural pre-pass не предоставлен.

Отсутствие реальной генерации, глобального pantry и автоматического NEXT-10 соответствует границе фазы и не является замечанием. Исправленные presentation findings повторно не заявляются; уже зарегистрированное небольшое расхождение C1 выбора продукта не дублируется.

## Narrative Findings (AI reviewer)

## Critical Issues

### CR-01: Повтор после ошибки чтения без редактирования стирает восстановленный черновик

**Classification:** BLOCKER  
**File:** `D:/Projects/meal-plan/src/app/App.tsx:105-117`  
**Related:** `D:/Projects/meal-plan/src/app/App.tsx:45-46`, `D:/Projects/meal-plan/e2e/storage.spec.ts:54-67`

**Issue:** После исходной ошибки `load()` приложение оставляет в памяти `createDraft()`. В `retry()` успешный повторный `load()` проверяет только status: `result.draft` отбрасывается, затем `persist(currentDraft.current)` перезаписывает уже доступный валидный снимок. Если пользователь ещё ничего не менял, это скрытый сброс людей, шага, ограничений, исключений, продуктов и нормы на defaults. Даже восстановление доступа без пользовательского редактирования приводит к потере данных. Это нарушает D-06 о приоритете восстановленных значений и WIZ-02.

**Reproduction / evidence:** На реальном приложении в Chromium, с временно бросающим `Storage.prototype.getItem` для единственного draft key: сохранить валидный draft `people='8', step=3, restrictions=['no-fish'], exclusionIds=['egg']`; перезагрузить с ошибкой чтения; ничего не редактировать; восстановить чтение; нажать «Повторить сохранение». Реально прочитанный localStorage до/после: `8 / 3 / ['no-fish'] / ['egg']` → `2 / 1 / [] / []`, после чего UI сообщает «Сохранено на этом устройстве». Использован обычный App без `mountAppFixture`.

**Test gap:** Существующий recovery retry test заранее меняет людей в памяти и проверяет только сохранение этого нового значения. Случай успешного повторного чтения без изменений в памяти отсутствует.

**Fix:** Отслеживать изменения memory draft после неудачной гидратации. Если до успешного повторного чтения не было изменений, восстановить `result.draft` в `currentDraft`/state и соответствующий шаг; для `loaded` не выполнять запись defaults. Сохранить существующий контракт последних изменений, если пользователь действительно редактировал память, включая изменения во время `await load()`. Добавить regression: исходный снимок с ограничениями и исключениями остаётся побайтно неизменным при retry без редактирования; отдельно сохранить тест редактирования во время delayed retry.

## Warnings

### WR-01: «Далее» не фокусирует ошибку внутри свёрнутой нормы КБЖУ

**Classification:** WARNING  
**File:** `D:/Projects/meal-plan/src/features/wizard/Wizard.tsx:64-70`  
**Related:** `D:/Projects/meal-plan/src/features/wizard/NutritionFields.tsx:13-22`, `D:/Projects/meal-plan/src/features/wizard/Wizard.tsx:26-31`

**Issue:** `setErrors(found)` раскрывает поля нормы только при следующем React commit. Немедленный `focus()` выполняется, пока их родитель ещё `hidden`; браузер его игнорирует. Post-render effect уже существует, но `next()` не задаёт `pendingFocus.current`. В результате нарушен D-08: первый invalid field не получает фокус и прокрутку; на длинном шаге сообщение остаётся вне текущей области просмотра.

**Reproduction / evidence:** Chromium и WebKit, 390×800: открыть «Норма КБЖУ», ввести в калории `1,`, свернуть блок, нажать «Далее». `aria-expanded` становится `true`, шаг остаётся первым, но activeElement — «Далее» в Chromium и `main` в WebKit, а не `#calories`. Поведение проверено исполненным Playwright API сценарием в обоих движках.

**Test gap:** Имеющиеся nutrition tests отправляют форму с уже раскрытыми полями или после reload, который сразу раскрывает непустую норму. Закрытие перед ошибочной отправкой не проверяется.

**Fix:** До `setErrors(found)` записать ID первого invalid field в `pendingFocus.current`; фокусировать и прокручивать его в существующем effect после commit. Проверить свёрнутую partial/invalid норму клавиатурой и на 360px с увеличенным текстом, сохранив существующее раскрытие ошибок.

### WR-02: После успешного сброса на первом шаге фокус теряется на body

**Classification:** WARNING  
**File:** `D:/Projects/meal-plan/src/features/wizard/Wizard.tsx:83-86`  
**Related:** `D:/Projects/meal-plan/src/shared/ui.tsx:60-65`, `D:/Projects/meal-plan/src/features/wizard/Wizard.tsx:25`, `D:/Projects/meal-plan/src/app/App.tsx:130-134`

**Issue:** Успешный reset убирает recovery-состояние и его кнопку-инициатор. Cleanup диалога восстанавливает фокус только если инициатор ещё `isConnected`; fallback отсутствует. На первом шаге `draft.step` остаётся `1`, поэтому effect фокуса заголовка также не запускается. После удаления модального окна пользователь клавиатуры оказывается на `body` без видимого положения в восстановленной форме.

**Reproduction / evidence:** Chromium: записать `{broken` в draft key, открыть `/plan/new`, нажать «Сбросить черновик», подтвердить. После удаления диалога и восстановления defaults `document.activeElement` равен `BODY`; в DOM нет сфокусированного поля или заголовка. Сценарий реально выполнен на обычном приложении.

**Test gap:** Corruption/reset test проверяет initial cancel focus, default people и сохранность чужих ключей; после успешного подтверждения фокус не проверяется. Исправление WebKit returnFocus для отмены не покрывает исчезнувший initiator.

**Fix:** После успешного reset и закрытия диалога передать фокус на доступную точку продолжения, например `#wizard-title` или `#people`, после React commit. Сохранить возврат к инициатору для отмены и неуспешного reset. Добавить regression для успешного сброса с шага 1, когда номер шага не меняется.

## Verification and limits

В ходе ревью выполнены точечные read-only Playwright API сценарии: CR-01 и WR-02 в Chromium; WR-01 и touch selection результата поиска в Chromium/WebKit. Touch selection с `hasTouch=true` добавляет ровно выбранный продукт в обоих проверенных движках; дефект этого сценария не заявляется. Один первоначальный диагностический скрипт остановился на собственном чтении через намеренно заблокированный `getItem`; исправленный скрипт прочитал значения без этого override и завершил воспроизведение. Это не результат suite приложения.

Полный suite повторно не запускался; существующие 134 unit и результаты браузерных/quality проверок относятся к evidence `docs/qa/phase01.md`, а не к новым прогонам ревью. Новые findings воспроизведены поверх этой базы, поэтому прежний green suite их не опровергает. Исходники приложения и тесты не изменены, коммиты не создавались.

Настоящий iOS/клавиатура/safe-area, исторический Safari 15, screen reader/полный contrast, native zoom, финальное визуальное одобрение, LCP и two-tab UX остаются ранее зарегистрированными непроверенными ограничениями приёмки. Ревью не объявляет их пройденными.

---

_Reviewed: 2026-10-27T08:43:49Z_  
_Reviewer: gsd-code-reviewer_  
_Depth: standard_
