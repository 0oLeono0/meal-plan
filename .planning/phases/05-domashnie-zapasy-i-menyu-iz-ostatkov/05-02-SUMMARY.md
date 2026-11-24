---
phase: 05-domashnie-zapasy-i-menyu-iz-ostatkov
plan: "02"
subsystem: pantry
tags: [pantry, shopping, storage, react, playwright]
requires:
  - phase: "05-01"
    provides: Отдельное хранилище запасов и живой пересчёт по сохранённым блюдам
provides:
  - Отметка «Скоро испортится», удаление с подтверждением и уточнение съедобного веса
  - Синхронизация холодильника в открытых вкладках с сохранением неподтверждённого ввода
  - Явное восстановление после повреждения, пропажи или конфликта записи
affects: ["05-03", "05-04", "05-05", "05-06"]
actuals:
  tokens: 8924
  tasks: 2
  commits: 4
commits: 4
plan_head_before: 78ab390189dd814338d98a985b133045af810629
plan_head_after: 480ae7b637f8bc28d9932d3ace74de87eb8d042e
tech-stack:
  added: []
  patterns: [confirmed-stock, storage-event, revision-guard, shared-modal-focus]
key-files:
  created: []
  modified: [src/features/pantry/PantryPage.tsx, src/app/App.tsx, src/features/generation/controller.ts, src/features/generation/controller.test.ts, src/adapters/pantryInventory.test.ts, e2e/pantry.spec.ts]
key-decisions:
  - "Владелец подтверждённого запаса обрабатывает фоновое чтение и отзывает старую попытку записи."
  - "Явно сохранённые пустые запасы приоритетнее исторической подсказки. В открытой вкладке исчезновение уже прочитанного ключа считается ошибкой."
  - "Введённое количество переживает обновление, пока продукт существует. Отметка срока берётся из актуальной строки при подтверждении количества."
requirements-completed: []
requirements-covered: [HOME-01, HOME-02, HOME-03]
coverage:
  - id: D1
    description: "Удаление и отметка срока сохраняются независимо. Пустой список переживает перезагрузку."
    requirement: HOME-01
    verification:
      - kind: e2e
        ref: "e2e/pantry.spec.ts#pantry-crud edits a stock flag and quantity and removes the last confirmed row"
        status: pass
    human_judgment: false
  - id: D2
    description: "Вторая вкладка пересчитывает покупки, повреждённая запись показывает понятный путь восстановления."
    requirement: HOME-03
    verification:
      - kind: e2e
        ref: "e2e/pantry.spec.ts#pantry-recovery follows storage events and preserves the last confirmed calculation during recovery"
        status: pass
      - kind: unit
        ref: "src/features/generation/controller.test.ts#pantry-recovery revokes an in-flight save when a newer stock record is read"
        status: pass
    human_judgment: false
duration: 11min
completed: 2026-11-24
status: complete
---

# Фаза 5, план 02. Редактирование и восстановление запасов

Экран «Дома» сохраняет отметку времени, количество и удаление. Изменение из второй вкладки обновляет расчёт и оставляет готовый к повторному подтверждению ввод. Ранее подтверждённые покупки при ошибке остаются с видимым предупреждением.

## Коммиты задач

| Задача | RED | GREEN |
| --- | --- | --- |
| Отметка и удаление | `0b485b0` | `42cbdf3` |
| Синхронизация и восстановление | `76c409c` | `480ae7b` |

## Проверки

Холодильник прошёл 4/4 браузерных сценария в Chromium, мастер — 3/3. Адаптер и контроллер прошли 74/74 модульных теста. TypeScript, ESLint и production build прошли. Есть предупреждение Vite о размере чанка. Детали и фактические доказательства приведены в [отчёте QA](05-02-QA.md).

## Решения при реализации

- Существующий общий поиск уже поддерживал подтверждение и повторный выбор. Строка холодильника сохранила действующее место в `PantryPage.tsx`, общие компоненты и контракт адаптера переиспользованы.
- Уведомление об обновлённом вводе появляется перед следующим подтверждением количества. Действие из устаревшего отображения отвергается отдельно от проверки актуальных байтов адаптером.
- Изменение записей между вкладками обнаруживается через события `storage`. Запланированные операции используют проверенные редакции. Транзакция между вкладками не входит в контракт текущего хранилища.

## Следующий этап

План 05-03 проверяет превышение бюджета при уменьшении запасов и совместимость правок меню с актуальной проекцией. Полная межбраузерная проверка предусмотрена планом 05-06. Внешние сервисы не требуются.

## Self-Check: PASSED

Четыре коммита задач найдены в текущей ветке. Все шесть изменённых рабочих файлов и оба отчёта на месте.
