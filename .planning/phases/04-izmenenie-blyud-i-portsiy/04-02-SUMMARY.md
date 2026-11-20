---
phase: 04-izmenenie-blyud-i-portsiy
plan: '02'
subsystem: meal-edits
tags: [typescript, react, shopping, persistence, playwright]
requires:
  - phase: '04-01'
    provides: Подбор вариантов, охраняемая запись, согласованное отображение и откат
provides:
  - Удаление и заполнение конкретного места с пересчётом покупок
  - Внутренний конверт с явными пустыми координатами и совместимый читатель
  - Сохранение ручных вариантов при пересборке
affects: [04-03, 04-04, 04-05]
actuals: {tokens: 21947, tasks: 2, commits: 5}
commits: 5
plan_head_before: 8cc6b34a1f79386021a64c9e96b10b805aa8d22d
plan_head_after: 0393c848747a8e60f55443eb35c5673d58e69654
tech-stack:
  added: []
  patterns: [explicit-meal-coordinates, versioned-local-envelope, shared-plan-projection]
key-files:
  created: []
  modified: [src/domain/plan.ts, src/domain/mealEdits.ts, src/domain/menuView.ts, src/domain/generatePlan.ts, src/features/generation/controller.ts, src/features/menu/MenuPage.tsx, src/features/menu/MealAlternatives.tsx, src/features/shopping/ShoppingPage.tsx, src/app/App.tsx, e2e/meal-edits.spec.ts]
key-decisions:
  - 'Внутренняя схема 2 хранит полное покрытие даты и типа приёма занятыми и явными пустыми координатами. Подбор нового плана выдаёт полный конверт схемы 1.'
  - 'Заполнение начинает с семейных порций и выдаёт новый сохранённый ID. Подбор и применение проверяют ожидаемую пустоту и согласованный бюджет.'
  - 'Пересборка использует дедуплицированные отпечатки, учитывающие пустоты. Полные варианты сохраняют прежнюю форму отпечатка.'
requirements-completed: []
requirements-covered: [MEAL-02, MEAL-03]
requirements-note: 'Итоговая приёмка требований относится ко всей фазе 4.'
coverage:
  - id: D1
    description: 'Удаление из созданного меню освобождает место, обновляет покупки и сохраняет пустоту при перезагрузке.'
    requirement: MEAL-02
    verification:
      - {kind: e2e, ref: 'e2e/meal-edits.spec.ts#remove-slot confirms a generated meal removal and restores its empty slot after reload', status: pass}
      - {kind: e2e, ref: 'e2e/meal-edits.spec.ts#remove-slot keeps all four add actions when no meals remain and explains zero purchases', status: pass}
    human_judgment: false
  - id: D2
    description: 'Новое заполнение переживает перезагрузку, обновляет рецепт и покупки и не оживляет старую ссылку.'
    requirement: MEAL-03
    verification:
      - {kind: e2e, ref: 'e2e/meal-edits.spec.ts#add-slot fills a persisted empty meal with a new identity and updated purchases', status: pass}
      - {kind: unit, ref: 'src/adapters/activePlan.test.ts', status: pass}
      - {kind: unit, ref: 'src/features/generation/controller.test.ts#phase04-add append deduplicates exclusions, rejects duplicates, and preserves all manual variants', status: pass}
    human_judgment: false
duration: 19min
completed: 2026-11-19
status: complete
---

# Фаза 4, план 02 — Удаление и заполнение места

**Пользователь освобождает конкретное место и заполняет его допустимым блюдом. Рецепт, меню и покупки согласованы после записи и перезагрузки.**

## Результаты

- Отмена удаления оставляет прежнее меню. Подтверждённое удаление сохраняет пустое место и пересчитывает семейный день, бюджет и потребности.
- Панель добавления использует прежние жёсткие фильтры и точный пересчёт. Добавление начинается с исходных семейных порций и получает новый сохранённый идентификатор.
- Любой сохранённый день показывает четыре места. Если удалены все блюда, покупки объясняют нулевую потребность и сохраняют переход к меню.
- Исходные записи пяти выпусков проходят проверку доверия и читаются без записи. Пустоты сохраняются в редакции 2 внутри прежнего ключа и контейнера. Для открытия такого сохранения требуется версия приложения с поддержкой редакции 2.
- Пересборка сохраняет ручные варианты, отклоняет дубликат выдачи и принимает только полный результат действующего генератора.

## Проверка и коммиты

Проверены RED удаления `0f66fec`, добавления `94fa4cf` и состояния покупок `0534cee`. Реализация подтверждена коммитами `625131a` и `0393c84`. Chromium прошёл 6 из 6 сценариев, целевой Vitest — 175 из 175. TypeScript, ESLint и продакшен-сборка прошли. Полная проверка в Firefox и WebKit относится к плану 05. [Подробности](04-02-QA.md)

## Отклонения

Прямой сквозной сценарий удаления потребовал раньше подключить `App.tsx` и сузить тип тестовой записи рецепта до прежней схемы в `src/domain/recipeView.test.ts`. На 1280 px проверка всех четырёх действий обнаружила перекрытие соседней карточкой. Высота строки теперь учитывает карточку целиком. В покупках добавлено отдельное пояснение для целиком пустого меню. Пакеты и исходные записи каталога сохранены.

## Self-Check: PASSED
