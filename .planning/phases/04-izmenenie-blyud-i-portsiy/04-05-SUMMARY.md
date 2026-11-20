---
phase: 04-izmenenie-blyud-i-portsiy
plan: "05"
subsystem: meal-edits
tags: [typescript, react, accessibility, responsive, playwright]
requires:
  - phase: "04-04"
    provides: Замена из рецепта, подтверждение и откат правок
provides:
  - Адаптивная панель замен с управлением с клавиатуры
  - Сохранение фокуса при изменении порций
  - Фактические результаты проверок трёх движков и полного Vitest
affects: []
tech-stack:
  added: []
  patterns: [scrollable-dialog-content, guarded-focus-restoration]
actuals: {tokens: 5287, tasks: 2, commits: 4}
commits: 4
plan_head_before: 377ed897cb4457f68e862b6d3223b2a7e90106ac
plan_head_after: bc3aa1d132452a40a039142bbb469797401ac945
key-files:
  created: [docs/qa/phase04-meal-edits.md]
  modified: [e2e/meal-edits.spec.ts, src/features/menu/MealAlternatives.tsx, src/features/recipe/RecipePage.tsx]
key-decisions:
  - Диалог использует оболочку без бокового отступа и одну область прокрутки под заголовком.
  - Выбранная кнопка порций получает фокус при действии клавиатурой или указателем.
requirements-completed: []
requirements-covered: [CALC-02, MEAL-01, MEAL-02, MEAL-03, REC-03]
coverage:
  - id: D1
    description: Панель замен открывается с клавиатуры и показывает читаемые варианты на пяти ширинах.
    requirement: MEAL-01
    verification:
      - {kind: e2e, ref: 'e2e/meal-edits.spec.ts#keyboard-responsive selects a weekly replacement and keeps the dialog usable at five widths', status: pass}
      - {kind: e2e, ref: 'e2e/meal-edits.spec.ts#keyboard-responsive wraps long text and keeps controls visible at an effective 200% reflow width', status: pass}
    human_judgment: false
  - id: D2
    description: Изменение множителя сохраняет фокус, применяет исходную семейную базу и обновляет покупки.
    requirement: CALC-02
    verification:
      - {kind: e2e, ref: 'e2e/meal-edits.spec.ts#portions-cycle changes only one repeated recipe and keeps purchasing totals after reload', status: pass}
    human_judgment: false
duration: 23min
completed: 2026-11-20
status: complete
---

# Фаза 4, план 05 — проверка редактирования

Подтверждены полный сценарий редактирования на трёх движках и адаптивная панель настоящего меню. Исправлены сужение панели на десктопе и фокус множителя в WebKit.

## Коммиты задач

- `85d1b7a` — браузерный RED ширины диалога при 1280 px.
- `71f8737` — центрирование диалога, разделение заголовка и прокручиваемого содержания, целевой Chromium GREEN.
- `ce989bc` — точечная правка фокуса после реального клика в WebKit, исходное падение подтверждено JUnit.
- `bc3aa1d` — отчёт фактических проверок с исходным и повторным WebKit.

## Проверки

Полные Chromium 15/15 и Firefox 15/15. После исправления фокуса полный WebKit прошёл 15/15, затронутые сценарии были повторены в Chromium и Firefox по 2/2. Полный Vitest прошёл 611/611, TypeScript, ESLint и сборка завершились с кодом 0. Задокументированы известное предупреждение о размере JS, методика проверки раскладки при 200%, границы наблюдения и проверки сохранений. [Фактические результаты](../../../docs/qa/phase04-meal-edits.md)

## Отклонения

[Правило 1 — дефекты] Ширина диалога на десктопе уменьшалась до 320 px из-за отступа боковой навигации. Заголовок и кнопка закрытия перекрывали текст при прокрутке. В WebKit указатель менял множитель, а фокус оставался на заголовке. Исправления относятся к текущему UI-контракту и подкреплены браузерными прогонами.

## Self-Check: PASSED
