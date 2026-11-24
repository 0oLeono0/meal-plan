---
phase: 05-domashnie-zapasy-i-menyu-iz-ostatkov
plan: '01'
subsystem: pantry
tags: [typescript, react, exact-quantity, local-storage, playwright]
requires:
  - phase: '04'
    provides: Сохранённые варианты меню с ручными правками и общий расчёт покупок
provides:
  - Экран «Дома» с поиском продуктов и сохранением количества
  - Версионированное локальное хранилище домашних запасов
  - Единый пересчёт покрытия, покупок и бюджета каждого варианта меню
affects: [05-02, 05-03, 05-04, 05-05, 05-06]
actuals: {tokens: 16149, tasks: 2, commits: 4}
commits: 4
plan_head_before: c035e9b910d443f60a11932d3e4efb2e447b77a6
plan_head_after: 8500e0edbe050a2bb2e2a4856188d0c2a8be5dc5
tech-stack:
  added: []
  patterns: [strict-storage-envelope, confirmed-inventory, shared-plan-projection]
key-files:
  created: [src/adapters/pantryInventory.ts, src/adapters/pantryInventory.test.ts, src/features/pantry/PantryPage.tsx, e2e/pantry.spec.ts]
  modified: [src/app/App.tsx, src/features/generation/controller.ts, src/features/generation/controller.test.ts, src/features/plan/PlanSummary.tsx, src/features/shopping/ShoppingPage.tsx, src/shared/ProductCombobox.tsx, e2e/navigation.spec.ts, e2e/presentation.spec.ts]
key-decisions:
  - 'Домашние запасы используют отдельный ключ localStorage. При отказе записи сохраняется последний подтверждённый запас.'
  - 'Каждый вариант независимо применяет один подтверждённый снимок запасов к полной потребности. Количество в хранилище выражено введённой строкой.'
  - 'Повтор количества использует текущие поля редактора. После обнаруженного конфликта пользователь обновляет запасы перед новой правкой.'
requirements-completed: []
requirements-covered: [HOME-01, HOME-02, HOME-03]
requirements-note: 'Требования закрываются после следующих планов и итоговой приёмки фазы.'
coverage:
  - id: D1
    description: 'Из 500 г потребности сохранённые 200 г покрывают часть покупок. Остаток 300 г сохраняется после перезагрузки.'
    requirement: HOME-03
    verification:
      - {kind: e2e, ref: 'e2e/pantry.spec.ts#pantry-tracer saves 200 g of the 500 g requirement and buys 300 g after reload', status: pass}
    human_judgment: false
  - id: D2
    description: 'Запись сохраняет точное количество и отделяет ошибки хранения от актуального расчёта.'
    requirement: HOME-01
    verification:
      - {kind: unit, ref: 'src/adapters/pantryInventory.test.ts', status: pass}
      - {kind: e2e, ref: 'e2e/pantry.spec.ts#pantry-write-failure preserves confirmed stock and retries the visible quantity', status: pass}
    human_judgment: false
  - id: D3
    description: 'Два варианта независимо получают один и тот же запас. Ошибка чтения оставляет последнюю подтверждённую проекцию.'
    requirement: HOME-03
    verification:
      - {kind: unit, ref: 'src/features/generation/controller.test.ts#pantry-inventory projects every variant independently and keeps the last confirmation when reading fails', status: pass}
    human_judgment: false
duration: 14min
completed: 2026-11-24
status: complete
---

# Фаза 5, план 01 — Сохранение домашних запасов

**Подтверждённое количество на экране «Дома» обновляет список покупок и бюджет действующего меню.**

- Поиск и популярные продукты используют устойчивые идентификаторы каталога. Можно сохранить продукт с неизвестным количеством и потом ввести точную дробь через запятую или точку.
- Новое значение влияет на расчёт только после успешной записи. Каждый вариант рассчитывает покрытие по всему своему периоду. При ошибке чтения выводится последнее подтверждённое значение с предложением повторной загрузки.
- Сохранённый состав меню имеет свой ключ хранилища. Сквозные тесты сравнивают его байты до и после изменения запасов.

## Проверка и коммиты

Chromium прошёл 11 сценариев, Vitest прошёл 71 проверку, TypeScript, ESLint и продакшен-сборка завершились с кодом 0. Подробности, фактические RED и ограничения зафиксированы в [05-01-QA.md](05-01-QA.md).

| Задача | RED | GREEN |
| --- | --- | --- |
| Сохранение количества и обновление покупок | `7e126df` | `fa33def` |
| Отказ записи и согласованный повтор | `392ddb2` | `8500e0e` |

## Отклонения от плана

- Общий поиск дополнили сбросом предыдущего выбора при изменении запроса. Общие экраны покупок и бюджета показывают основу расчёта и сообщают о превышении лимита после изменения внешних условий. Навигационные проверки ожидают рабочий экран «Дома».
- Браузерный RED второй задачи выявил повтор устаревшего количества. Повтор направлен через ту же проверку текущей формы, что и обычное сохранение.

## Self-Check: PASSED

Проверены 12 путей исходников и тестов, наличие четырёх подтверждённых коммитов в истории и `git diff --check` для диапазона плана.
