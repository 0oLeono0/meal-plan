---
phase: "03"
slug: "sravnenie-variantov-i-prosmotr-retseptov"
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-11-04"
---

# Phase 03 — Validation Strategy

Контракт обратной связи; фактические результаты заполняются при исполнении. Источник: 03-RESEARCH.md, Validation Architecture. Это не отчёт о пройденных тестах.

## Test Infrastructure

| Property | Value |
|---|---|
| Framework | Vitest5.0.5, Playwright1.64.1 |
| Config | vite.config.ts; playwright.config.ts |
| Quick run | `npm run test:unit -- --run src/domain/plan.test.ts src/domain/generatePlan.test.ts src/domain/planProjection.test.ts src/adapters/activePlan.test.ts src/features/generation/controller.test.ts` |
| Full suite | `npm run test:unit -- --run` |
| Browser | `npm run test:e2e -- --workers=2` |
| Static/build | `npm run typecheck`, `npm run lint`, `npm run build` |
| Runtime | Измерить при исполнении; 365 прежних unit прошли за10.52s, это не обещание для новых |

## Sampling Rate

После каждого task — профильные unit без watch и typecheck; после wave — полный unit, релевантные реальные браузерные сценарии, lint/build. Обратная связь профильного unit желательна <30s: при превышении делить по файлам. Browser generation tests получают подходящий локальный timeout; production deadline30s не ослабляется. RED должен быть зафиксирован до доменной правки, GREEN — после. Полный актуальный набор перед приёмкой.

## Per-Task Verification Map

Plan/task/wave и phase-unique threat IDs заполняются планировщиком из конечных PLAN; требования ниже не могут потеряться.

| Requirement | Secure behavior | Type | Command | File exists | Status |
|---|---|---|---|---|---|
| DATA-04 | Старый snapshot читается, trust сохраняется, запись/cancel/races честны | unit/integration | `npm run test:unit -- --run src/adapters/activePlan.test.ts src/features/generation/controller.test.ts` | Existing, extend | pending |
| GEN-06 | Семантически разные3/2/1/0 результатов, hard constraints и бюджет каждого | unit | `npm run test:unit -- --run src/domain/generatePlan.test.ts src/domain/plan.test.ts` | Existing, extend | pending |
| GEN-07 | Append1 использует прежние inputs, cap12 не удаляет, late response не применяется | unit/integration | `npm run test:unit -- --run src/features/generation/controller.test.ts src/adapters/generation.test.ts` | Existing, extend | pending |
| MENU-02 | День/неделя и даты сохраняют корректный контекст | unit/browser | `npm run test:unit -- --run src/domain/menuView.test.ts` | Wave0 new | pending |
| MENU-03 |4:3 local assets52mapping, реальные порции/stock | unit/browser | `npm run test:unit -- --run src/domain/recipeView.test.ts src/data/recipeMedia.test.ts` | Wave0 new | pending |
| REC-01 | Recipe/variant/instance проверены, ingredient/stock ledger сохраняет количества | unit/browser | `npm run test:unit -- --run src/domain/recipeView.test.ts` | Wave0 new | pending |
| REC-02 | Независимые точные ожидания4КБЖУ/ingredient на одной базе | unit | `npm run test:unit -- --run src/domain/recipeView.test.ts` | Wave0 new | pending |
| REC-04 | Direct/missing/stale/error различены, нет тихой привязки | unit/browser | `npm run test:e2e -- phase03-recipes.spec.ts --project=chromium --workers=1` | Wave0 new | pending |

## Wave 0 Requirements

- Добавить meaningful tests menuView/recipeView/recipeMedia и phase03 browser specs; указать реальные пути в PLAN.
- Подготовить неизменённый настоящий одновариантный Phase2 fixture; независимые fixtures для1/2/3 альтернатив, quota/corrupt/races и pantry500−200=300g с двумя вхождениями.
- Проверить default corpus3variants и единый30sdeadline/cancel. При невозможности трёх не клонировать результат.
- Существующая инфраструктура достаточна; установка новых тестовых framework не нужна.
- Планировщик должен сопоставить каждую задачу с автоматической проверкой и угрозой либо обоснованным N/A. Не оставлять три подряд задачи без автоматической обратной связи.

## Manual-Only Verifications

| Behavior | Requirement | Why manual | Instructions |
|---|---|---|---|
| Восприятие вариантов/трёх стоимостей/нормы | GEN-06/07, MENU-02/03 | Человеческая оценка | Сравнить, выбрать, пересобрать, вернуться к прежнему, прочесть источник цены |
| Соответствие52изображений блюдам | MENU-03, REC-01 | Визуальная оценка | Просмотреть каждое с recipeId, составом, provenance; generated пометка; fallback не заменяет набор |
| Native Safari15/device/AT/zoom | Все UI | Эмуляция не реальное устройство | Проверить keyboard/фокус/озвучку/200%/safearea отдельно; не выдумывать pass |

## Required Browser Evidence

Real start→unique alternatives→select→shopping→reload; append with unsaved draft→same applied settings; no-result/cancel/error/quota/late response preserve bytes; retry save without search. Recreate confirmation+cancel restores focus. Contextual and direct recipe, repeated recipe across days, stale IDs, ingredient totals, pantry conservation. Widths360/390/430/768/1280 and1/3/7dates, desktop four meal types, no page overflow, bottomCTA access,4:3/404/offline local media. Preserve seed missing/throwingAPI tests. Historical WindowsWebKit keyboard limits remain explicit, never renamed passed.

## Validation Sign-Off

- [ ] All tasks mapped to actual automated checks
- [ ] Wave0 references created
- [ ] No watch mode; feedback latency measured
- [ ] Full current tests/static/build and browser evidence reviewed
- [ ] Manual observations recorded separately
- [ ] Set nyquist_compliant only from actual coverage audit

**Approval:** pending execution and independent audit.
