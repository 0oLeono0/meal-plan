---
phase: 04-izmenenie-blyud-i-portsiy
plan: '04'
subsystem: meal-edits
tags: [typescript, react, persistence, routing, playwright]
requires:
  - phase: '04-03'
    provides: Управление семейными порциями в связанном рецепте
provides:
  - Замена блюда через общую панель из связанного рецепта
  - Согласованная предварительная модель меню, рецепта и покупок
  - Откат, повтор и защита от запоздалой записи или изменения сохранения
affects: [04-05]
actuals: {tokens: 14208, tasks: 2, commits: 4}
commits: 4
plan_head_before: b2a0dcde399be33f12876316160d954bea1cc2d3
plan_head_after: 728980b3d49f074aaf293309648d085f952d8774
tech-stack:
  added: []
  patterns: [route-visit-binding, abortable-save, guarded-storage-reload]
key-files:
  created: []
  modified: [src/app/App.tsx, src/domain/recipeView.ts, src/domain/recipeView.test.ts, src/features/generation/controller.ts, src/features/generation/controller.test.ts, src/features/menu/MealAlternatives.tsx, src/features/menu/MenuPage.tsx, src/features/recipe/RecipePage.tsx, src/adapters/activePlan.test.ts, e2e/meal-edits.spec.ts, e2e/generation-fixtures.ts]
key-decisions:
  - 'Временный показ нового рецепта разрешён только в посещении, инициировавшем замену, с совпадением варианта, дня, слота и вхождения.'
  - 'Каждое обновление прочитанных данных отзывает незавершённую ручную правку. Наблюдаемый конфликт переводит редактирование в ожидание обновления.'
requirements-completed: []
requirements-covered: [REC-03, MEAL-01, MEAL-03]
coverage:
  - id: D1
    description: 'Замена в связанном рецепте сохраняет порции и маршрут возврата, после подтверждения открывается новый рецепт.'
    requirement: REC-03
    verification:
      - {kind: e2e, ref: 'e2e/meal-edits.spec.ts#recipe-replace preserves the contextual route until save and never redirects from shopping', status: pass}
      - {kind: e2e, ref: 'e2e/meal-edits.spec.ts#recipe-replace cannot redirect a later visit to the same address', status: pass}
    human_judgment: false
  - id: D2
    description: 'Отказ возвращает подтверждённые данные, конфликт сохраняет исходную запись, а повтор применяет ровно ту же правку.'
    requirement: MEAL-03
    verification:
      - {kind: e2e, ref: 'e2e/meal-edits.spec.ts#rollback restores the recipe and its focus, then retries and announces the confirmed recipe once', status: pass}
      - {kind: e2e, ref: 'e2e/meal-edits.spec.ts#rollback shows identical optimistic totals on menu and shopping and restores both after failure', status: pass}
      - {kind: unit, ref: 'src/features/generation/controller.test.ts#phase04-edit detects new raw bytes, refuses duplicate and blocked retries, and reloads without writing', status: pass}
    human_judgment: false
duration: 14min
completed: 2026-11-20
status: complete
---

# Фаза 4, план 04 — замена из рецепта и восстановление

Связанный рецепт открывает тот же список альтернатив, что карточка меню. Во время записи видны новый рецепт и обновлённые итоги. Подтверждение меняет адрес только в исходном посещении. Если пользователь ушёл, его маршрут сохраняется.

При отказе запись и три экрана возвращаются к подтверждённому состоянию. Обычный сбой допускает повтор с проверкой исходной ревизии, а замеченная смена сохранённых данных требует обновить меню. Чтение нового, отсутствующего, повреждённого или недоступного значения прекращает прежнюю ожидающую правку.

## Коммиты задач

- `38bdbfc` и `398e7fa`. RED и GREEN замены из рецепта, затем повтор рабочего браузерного сценария.
- `830383e` и `728980b`. RED записи из устаревшего состояния и статуса подтверждения, затем GREEN отката и защиты от гонок.

## Отклонения и проверки

Тестовую оболочку разрешено запускать с сохранённого шага мастера. Фокус возврата из общей панели теперь имеет отдельный адрес для рецепта. Новых зависимостей и изменений формата хранения нет.

Финальный Chromium прошёл 13/13, Vitest 147/147. TypeScript, ESLint и сборка прошли. Известное предупреждение размера JS сохраняется. Итоговая межбраузерная проверка относится к плану 05. [Доказательства](04-04-QA.md)

## Self-Check: PASSED
