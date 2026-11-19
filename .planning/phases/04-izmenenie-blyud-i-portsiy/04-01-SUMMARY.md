---
phase: 04-izmenenie-blyud-i-portsiy
plan: '01'
subsystem: meal-edits
tags: [typescript, react, exact-budget, persistence, playwright]
requires:
  - phase: '03.1'
    provides: Версионный каталог, режимы меню, связанные рецепты и расчёт покупок
provides:
  - Замена одного блюда на допустимую альтернативу из меню
  - Прежний формат сохранения, согласованный предварительный расчёт и откат после отказа
  - Общий допуск рецепта и отменяемый подбор по снимку плана
affects: [04-02, 04-03, 04-04, 04-05]
actuals: {tokens: 19911, tasks: 2, commits: 4}
commits: 4
plan_head_before: 0b1f62a20e71429d4e15f1403aa3289631a7ac8d
plan_head_after: c3c3aaca7577d6251a3ca34409d439f90ce2e5a5
tech-stack:
  added: []
  patterns: [exact-projection, guarded-local-save, abortable-batches, shared-modal-focus]
key-files:
  created: [src/domain/mealEdits.ts, src/domain/mealEdits.test.ts, src/domain/recipeEligibility.ts, src/features/menu/MealAlternatives.tsx, e2e/meal-edits.spec.ts]
  modified: [src/adapters/activePlan.ts, src/app/App.tsx, src/domain/generatePlan.ts, src/features/generation/controller.ts, src/features/generation/controller.test.ts, src/features/menu/MealCard.tsx, src/features/menu/MenuPage.tsx, src/shared/ui.tsx]
key-decisions:
  - 'Замена сохраняет существующее вхождение и его масштаб. Выбор заново проверяется по сохранённому каталогу и ревизии.'
  - 'Ранжирование использует точную разницу закупки всего периода. Интерфейс показывает разницу итоговых копеек и семейные калории приёма.'
  - 'Один предварительный набор данных доступен только во время охраняемой записи; ошибка возвращает последний подтверждённый результат.'
requirements-completed: []
requirements-covered: [MEAL-01, MEAL-03]
requirements-note: 'Общие требования остаются открытыми до следующих планов и итоговой приёмки фазы.'
coverage:
  - id: D1
    description: 'Замена обеда из созданного меню сохраняется и согласована с рецептом и покупками после перезагрузки.'
    requirement: MEAL-01
    verification:
      - {kind: e2e, ref: 'e2e/meal-edits.spec.ts#tracer replaces a generated lunch and keeps recipe and shopping after reload', status: pass}
    human_judgment: false
  - id: D2
    description: 'Допуск, бюджет и точность семейных дельт проверены. Отказ записи восстанавливает предыдущее состояние.'
    requirement: MEAL-03
    verification:
      - {kind: unit, ref: 'src/domain/mealEdits.test.ts', status: pass}
      - {kind: unit, ref: 'src/features/generation/controller.test.ts#phase04-edit previews one candidate, restores the confirmed ledger on refusal, and retries the same edit', status: pass}
    human_judgment: false
duration: 19min
completed: 2026-11-19
status: complete
---

# Фаза 4, план 01 — Замена из меню

**Одно блюдо меняется в активном варианте, а карточка, рецепт и покупки получают согласованный пересчёт.**

## Результаты

- Панель показывает до пяти допустимых альтернатив из каталога сохранённого плана. Команда проверяет место, рецепт, действующие ограничения, время и точный бюджет.
- Закупочная дельта включает общий запас семьи за выбранный период. Калорийная дельта относится к конкретному приёму.
- При сохранении меню, рецепт и покупки читают один предварительный снимок. Отказ записи восстанавливает прежние значения, а повтор использует тот же проверенный кандидат.
- Закрытие панели отменяет поиск между группами кандидатов. Клавиатурный фокус возвращается к действию.

## Проверка и коммиты

Два проверенных RED и два GREEN закоммичены соответственно `3102969`, `bd9d664`, `fc62152`, `c3c3aac`. В итоговом Chromium прошли 3 из 3 сценариев. Vitest прошёл 108 проверок логики, адаптера и контроллера, затем семь затронутых проверок выполнены повторно на финальном коде. TypeScript, ESLint и продакшен-сборка прошли. Известное предупреждение размера сборки сохраняется. Подробные результаты и первоначальные сбои подготовки записаны в [04-01-QA.md](04-01-QA.md).

## Отклонения

В срез включены два дополнительных существующих компонента. Кнопка действий размещена рядом со ссылкой внутри `MealCard`, а панель переиспользует логику фокуса и защиты фона из `shared/ui`. Формат записи и зависимости остались прежними.

## Self-Check: PASSED
