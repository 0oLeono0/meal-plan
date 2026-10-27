---
phase: 01-gostevoy-start-i-sohranyaemye-nastroyki
plan: "07"
subsystem: planning
tags: [scope-amendment, nutrition, manual-target, documentation]
requires:
  - phase: 01-04
    provides: Manual person-day target and explicit absence/partial/provenance contract
provides:
  - Verified human-confirmed C-04 scope amendment and preserved historical calculator plan
  - Consistent manual P0 WIZ-09 and deferred P1 NEXT-10 requirements/UI/acceptance mapping
affects: [01-06, 01-08, generation, nutrition, NEXT-10]
tech-stack:
  added: []
  patterns: [human response provenance, fail-closed calculator decision validation]
key-files:
  created:
    - docs/decisions/nutrition-calculator.json
    - docs/decisions/nutrition-calculator-amendment.md
    - docs/decisions/archive/01-07-calculator-before-amendment.md
  modified:
    - docs/decisions/nutrition-calculator-proposal.md
    - reference/PRD.md
    - reference/OPEN_QUESTIONS.md
    - .planning/PROJECT.md
    - .planning/REQUIREMENTS.md
    - .planning/ROADMAP.md
    - .planning/STATE.md
    - .planning/phases/01-gostevoy-start-i-sohranyaemye-nastroyki/01-07-PLAN.md
    - .planning/phases/01-gostevoy-start-i-sohranyaemye-nastroyki/01-08-PLAN.md
    - .planning/phases/01-gostevoy-start-i-sohranyaemye-nastroyki/01-CONTEXT.md
    - .planning/phases/01-gostevoy-start-i-sohranyaemye-nastroyki/01-UI-SPEC.md
    - .planning/phases/01-gostevoy-start-i-sohranyaemye-nastroyki/01-VALIDATION.md
    - .planning/phases/01-gostevoy-start-i-sohranyaemye-nastroyki/01-PATTERNS.md
    - .planning/phases/01-gostevoy-start-i-sohranyaemye-nastroyki/01-RESEARCH.md
    - .planning/phases/01-gostevoy-start-i-sohranyaemye-nastroyki/SKELETON.md
key-decisions:
  - "Human-confirmed C-04: optional manual WIZ-09 remains P0/Pending; automatic calculator NEXT-10 and four states deferred P1 after P0 acceptance."
  - "Scope amendment does not approve formulas, averages or nutrition-target hardness; Q-03 remains partially open."
requirements-completed: []
actuals:
  tokens: 28545
  tasks: 2
  commits: 2
plan_head_before: e85cc57ebedee8330f9916a1477ca111fc9f52d4
plan_head_after: fd14d622011ad4d592e45c574689de7768d4e8fe
duration: 5min
completed: 2026-10-26
status: complete
---

# Phase 1 Plan 7: Подтверждённая поправка приоритета калькулятора Summary

**Человеческий выбор второго варианта сохранён и проверен: ручная цель КБЖУ остаётся в P0, автокалькулятор и четыре его состояния перенесены в P1/NEXT-10.**

## Accomplishments

- Выполнены 2/2 документальные задачи: проверена запись «тогда выбираем второй» с источником и timestamp, сохранены proposal и точный архив прежнего плана.
- Согласованы требования, дорожная карта, решения, UI и приёмка. WIZ-09 сохраняет ID и Pending до фактической QA 01-08; NEXT-10 не реализован. `replanStatus` изменён на `executed` только после успешных проверок; фактические поля ответа не изменялись.
- Ручная цель необязательна: empty означает отсутствие, partial требует исправления/очистки, полный конечный набор ккал > 0 и Б/Ж/У ≥ 0 имеет manual origin. Средние нормы и медицинские оценки не добавлены.
- Расчёты рецептов/порций/меню/бюджета/покупок и жёсткие пищевые ограничения сохраняют P0. Q-03 о формулах и роли целей в генерации остаётся частично открытым.

## Task Commits

1. **Проверить решение и сохранить трассировку scope** — `0154b94` (docs).
2. **Согласовать ручную цель P0 и приёмку** — `fd14d62` (docs).

## Verification

- Точный `<automated>` node-check задачи 01-07-01: exit 0, `confirmed amendment; calculator remains locked`. Повторён после первого коммита как tracer gate и после изменения execution status.
- Внутри этой проверки существующий `node scripts/verify-calculator-decision.mjs docs/decisions/nutrition-calculator.json` вернул ожидаемые **exit 1 / REPLAN_REQUIRED**. Это доказательство сохранённого запрета формулы, а не успешная проверка вычислительного контракта.
- Точный `<automated>` node-check задачи 01-07-02: exit 0, `manual P0; calculator P1; acceptance mapping consistent`.
- `git diff --check` до scoped commits: exit 0, whitespace errors отсутствуют. Git сообщил только о преобразовании LF/CRLF.
- `python -X utf8 .tmp/gsd_invoke.py query verify.plan-structure <01-07-PLAN.md>`: valid true, errors []; предупреждение R6 о bare diff относится к намеренной проверке незакоммиченного amendment, что явно записано в плане.
- Та же структурная проверка 01-08: valid true, errors [], warnings []; dependency на 01-06/07 сохранён.
- Affected-path review: diff ограничен 18 объявленными document/decision paths. Архив дословно совпадает с прежним 01-07 с нормализацией CRLF/LF. `git diff --exit-code HEAD --` для source, validator, четырёх исходных PDF/DOCX, 01-06 и SUMMARY 01–05: exit 0. Фактические поля human decision сравнены до/после: равны.
- `actuals.tokens` = floor(114182 символа realized task diff / 4); commits измерены по сохранённому ledger: 2. Metadata commits в этот snapshot не включены.
- Проверки приложения, браузер и build здесь не запускались: план меняет только документацию и не заявляет завершение приложения или фазы. Все предусмотренные планом проверки выполнены.

## Deviations from Plan

None — исполнен обновлённый docs-only план. Единая согласованная поправка охватывает перечисленные документы по явно предусмотренному исключению без дробления workflow. WIZ-09 намеренно не отмечен выполненным: этот план проверяет scope, а не принимает пользовательское поведение.

## Issues Encountered

Новых блокирующих проблем нет. Нереализованный NEXT-10 — явно отложенный P1, не заглушка приложения. Проверка изменённых документов не выявила новых application stubs или новых trust boundaries. Сторонние untracked skills/skills-lock сохранены без изменений и не включены в коммиты.

SDK `state.update-progress` сообщил `phase scope is unscoped, not complete` и оставил строку Progress без изменения. После штатных state/roadmap handlers строка согласована с шестью существующими SUMMARY (6/8, 75%); указатель возвращён на первый незавершённый 01-06, поскольку 01-07 исполнен раньше него. Требование WIZ-09 не передавалось в mark-complete согласно явному контракту плана.

## Next Phase Readiness

Phase 1: 6/8 планов после 01-07; следующий — 01-06. Затем 01-08 проверяет применимые P0-критерии и manual WIZ-09. Phase 1 и WIZ-09 не закрыты. NEXT-10 и его empty/loading/error/partial ожидают P1 после приёмки P0; формула и средние нормы не утверждены. Этот исполнитель не запускал 01-06 или 01-08.

## Self-Check: PASSED

Все созданные decision/archive/SUMMARY файлы существуют; `0154b94` и `fd14d62` найдены в истории текущей ветки. Результаты проверок соответствуют утверждениям выше.
