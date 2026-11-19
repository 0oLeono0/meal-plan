---
phase: 4
slug: izmenenie-blyud-i-portsiy
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-11-19
---

# Фаза 4 — План проверок

## Test Infrastructure

| Свойство | Значение |
| --- | --- |
| Unit | Vitest из package.json, `npm run test:unit -- --run` |
| Browser | Playwright, проекты chromium, firefox, webkit |
| Быстрая сквозная проверка | `npm run test:e2e -- e2e/meal-edits.spec.ts --grep tracer --project=chromium --workers=1` |
| Сборка | `npm run typecheck`, `npm run lint`, `npm run build` |
| Доказательства | Реальные RED и GREEN, JUnit и скриншоты в локальной папке проверок, перенос результатов и ограничений в `docs/qa/phase04-meal-edits.md` |

## Sampling Rate

В начале каждой задачи с изменяемым поведением добавить наблюдаемый тест и зафиксировать осмысленное падение. После изменения повторить тот же сценарий. На границе плана повторить трассировку замены, выполнить проверки затронутых модулей, TypeScript, ESLint и сборку. В финале выполнить все команды матрицы и указанную межбраузерную регрессию последовательно. Целевой короткий сценарий — не более 60 секунд на обычном локальном окружении. Фиксировать фактическое время, таймауты и пропуски.

## Per-Task Verification Map

| Задача | План | Волна | Требования | Угрозы | Тип | Команда | Статус |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 04-01-01 | 01 | 1 | MEAL-01, MEAL-03 | T-04-01/02 | e2e | `npm run test:e2e -- e2e/meal-edits.spec.ts --grep tracer --project=chromium --workers=1` | pending |
| 04-01-02 | 01 | 1 | MEAL-01, MEAL-03 | T-04-01/02/03 | unit + e2e | `npm run test:unit -- run src/domain/mealEdits.test.ts`; `npm run test:e2e -- e2e/meal-edits.spec.ts --grep alternatives --project=chromium --workers=1` | pending |
| 04-02-01 | 02 | 2 | MEAL-02, MEAL-03 | T-04-04/05/06 | unit + e2e | `npm run test:unit -- run src/domain/plan.test.ts src/domain/menuView.test.ts`; `npm run test:unit -- run src/adapters/activePlan.test.ts src/features/generation/controller.test.ts -t phase04-remove`; `npm run test:e2e -- e2e/meal-edits.spec.ts --grep remove-slot --project=chromium --workers=1` | pending |
| 04-02-02 | 02 | 2 | MEAL-02, MEAL-03 | T-04-04/05/06 | unit + e2e | `npm run test:unit -- run src/domain/mealEdits.test.ts`; `npm run test:unit -- run src/adapters/activePlan.test.ts src/features/generation/controller.test.ts -t phase04-add`; `npm run test:e2e -- e2e/meal-edits.spec.ts --grep add-slot --project=chromium --workers=1` | pending |
| 04-03-01 | 03 | 3 | CALC-02, REC-03, MEAL-03 | T-04-07/08 | e2e | `npm run test:e2e -- e2e/meal-edits.spec.ts --grep portions-cycle --project=chromium --workers=1` | pending |
| 04-03-02 | 03 | 3 | CALC-02, REC-03, MEAL-03 | T-04-07/08 | unit + e2e | `npm run test:unit -- run src/domain/mealEdits.test.ts src/domain/recipeView.test.ts`; `npm run test:e2e -- e2e/meal-edits.spec.ts --grep portions-guards --project=chromium --workers=1` | pending |
| 04-04-01 | 04 | 4 | REC-03, MEAL-01, MEAL-03 | T-04-09/10 | e2e | `npm run test:e2e -- e2e/meal-edits.spec.ts --grep recipe-replace --project=chromium --workers=1` | pending |
| 04-04-02 | 04 | 4 | REC-03, MEAL-03 | T-04-09/10/11 | unit + e2e | `npm run test:unit -- run src/domain/recipeView.test.ts src/features/generation/controller.test.ts src/adapters/activePlan.test.ts -t phase04-edit`; `npm run test:e2e -- e2e/meal-edits.spec.ts --grep rollback --project=chromium --workers=1` | pending |
| 04-05-01 | 05 | 5 | MEAL-01, MEAL-02, REC-03 | T-04-12 | e2e | `npm run test:e2e -- e2e/meal-edits.spec.ts --grep keyboard-responsive --project=chromium --workers=1` | pending |
| 04-05-02 | 05 | 5 | все пять | T-04-12/13 | build + full | `npm run typecheck`, `npm run lint`, `npm run build`, `npm run test:unit -- --run`, полный `e2e/meal-edits.spec.ts` отдельно в chromium/firefox/webkit | pending |

## Wave 0 Requirements

- [ ] Новый `e2e/meal-edits.spec.ts` с действующим мастером/генерацией и реальным локальным адаптером создаётся первым действием 04-01-01. До изменения кода браузерная проверка должна дойти до отсутствующего действия.
- [ ] Новый `src/domain/mealEdits.test.ts` создаётся при первой дополнительной проверке вариантов. Контрольные количества, нутриенты и покупки рассчитываются отдельно от функций приложения.
- [ ] Для отказов и гонок дополнить действующие механизмы `e2e/generation-fixtures.ts`. Серийные отложенные тесты используют настоящие порты и меняют только проверяемую инъекцию задержки или отказа.

## Manual-Only Verifications

| Сценарий | Требования | Граница автоматизации | Действия |
| --- | --- | --- | --- |
| Понятность вариантов, шкалы порций и обновлений | MEAL-01, CALC-02, REC-03, MEAL-03 | Пользовательская оценка формулировок и ожиданий | В меню заменить блюдо по подписанным дельтам, открыть рецепт, изменить порции и проверить покупки и возврат. |
| Компоновка и фокус | MEAL-01, MEAL-02, REC-03 | Скриншоты и браузерные assertions дополняют друг друга | На 360/768/1280 посмотреть панель, длинные названия, пустую ячейку и положение фокуса. Вынести непроверенные физические устройства и системные средства доступности отдельно. |

## Multi-Source Coverage Audit

| Источник | ID | Содержание | Планы | Статус планирования |
| --- | --- | --- | --- | --- |
| GOAL | Phase 4 | Меню, КБЖУ, бюджет и покупки согласованы после адресной правки | 01–05 | covered |
| REQ | MEAL-01 | Общая панель, допустимые альтернативы, дельты, причины отсутствия | 01, 02, 04, 05 | covered |
| REQ | MEAL-02 | Удаление и добавление в сохранённый пустой слот | 02, 05 | covered |
| REQ | MEAL-03 | Немедленный расчёт, подтверждение, откат | 01–05 | covered |
| REQ | CALC-02 | Точный семейный множитель без умножения результата | 03, 05 | covered |
| REQ | REC-03 | Порции выбранного вхождения и замена из рецепта | 03–05 | covered |
| RESEARCH | Координаты и хранение | Строгая старая схема, явные пустые места новой, пятиверсионная совместимость, сохранение UTF-8 и cap12 | 01–02 | covered |
| RESEARCH | Допуск и производительность | Общие жёсткие фильтры, точная и видимая цена, порядок запасов, стабильный список, короткие отменяемые пакеты | 01, 02, 05 | covered |
| RESEARCH | Отказ записи и навигация | Один контроллер и видимый bundle, защита ревизии и raw, согласованная временная подстановка рецепта | 01, 03–04 | covered |
| CONTEXT | D-01/D-02 | Вариант, дата, слот, вхождение, меню/рецепт, частичный или пустой список | 01–05 | covered |
| CONTEXT | D-03/D-04 | Допуск, точный и отображаемый бюджет, дельты, правила абсолютных порций | 01–05 | covered |
| CONTEXT | D-05/D-06 | Привязанный рецепт, общий проектор, пустой вклад, покупки | 01–05 | covered |
| CONTEXT | D-07/D-08 | Актуальность, запись, сбой, исторические планы, append/cap12 | 01–05 | covered |
| CONTEXT | D-09 | Реальная трасса, бюджет, откат, клавиатура, ширины | 01, 05 | covered |
| UI | UI Considerations | Пусто, загрузка, ошибка, заполнено, частично, переполнение, количество, длинные строки | 01–05 | covered |

## Validation Sign-Off

- [x] Все пять требований перечислены в планах.
- [x] Для каждой задачи указан локальный исполняемый тест или команда проверки, отсутствующие тесты входят в соответствующие задачи.
- [ ] Фактические проверки и доказательства записаны.
- [ ] Независимая проверка готовности и пользовательская приёмка.
