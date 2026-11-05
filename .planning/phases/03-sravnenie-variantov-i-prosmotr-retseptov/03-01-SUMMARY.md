---
phase: 03-sravnenie-variantov-i-prosmotr-retseptov
plan: "01"
subsystem: generation
tags: [deterministic-search, variants, guarded-persistence, react, tdd]
requires:
  - phase: 02
    provides: exact projection, source-gated catalog, guarded active plan adapter
provides:
  - Retained semantic top3 and bounded target/exclusion options
  - Saved-ack-only selection shared by menu and shopping
  - Twelve-variant validation and immutable actual Phase2 legacy fixture
affects: [03-02, 03-03, 03-10, 03-11, 03-12]
tech-stack:
  added: []
  patterns: [canonical assignment fingerprint, retained top-K, base-revision-owned selection]
key-files:
  created: [e2e/phase03-variants.spec.ts, src/test/fixtures/phase02-active-plan-v1.json, docs/qa/phase03-plan01.md]
  modified: [src/domain/generatePlan.ts, src/domain/plan.ts, src/features/generation/controller.ts, src/features/menu/MenuPage.tsx, src/app/App.tsx, src/domain/plan.test.ts, src/domain/generatePlan.test.ts, src/adapters/activePlan.test.ts, src/features/generation/controller.test.ts]
key-decisions:
  - "Retain up to3 feasible canonical assignments within the existing single bounded search; exclusions filter output, not transitions."
  - "Only saved acknowledgement publishes active selection and search cardinality; loading a new base cancels revision-owned selection."
requirements-supported: [DATA-04, GEN-06, MENU-03]
requirements-completed: []
coverage:
  - id: variants
    description: Real wizard generates three semantic variants and chosen menu survives shopping and reload
    requirement: GEN-06
    verification:
      - kind: e2e
        ref: e2e/phase03-variants.spec.ts
        status: pass
    human_judgment: false
  - id: persistence
    description: Legacy bytes and all-alternative trust, budget, ownership and retry gates
    requirement: DATA-04
    verification:
      - kind: unit
        ref: src/adapters/activePlan.test.ts and src/features/generation/controller.test.ts
        status: pass
    human_judgment: false
actuals:
  tokens: 51547
  tasks: 3
  commits: 8
commits: 8
plan_head_before: e1ce49b38da584bd56881dd193daaa6f0d4a7a92
plan_head_after: 3e3dab04ea8b8a7fbc09f244b553c42b5b4119ef
duration: "1398min observed wall; active unknown due to usage-limit interruption"
completed: 2026-11-05
status: complete
---

# Phase 3 Plan 1: Семантические варианты и сохранённый выбор Summary

**Один ограниченный поиск возвращает до3 допустимых вариантов; подтверждённый выбор атомарно согласует меню, покупки и reload, сохраняя совместимость с Phase2.**

## Accomplishments

- `variantFingerprint` использует date/slot/recipeId и нормализованные Rational servings, исключая opaque IDs/названия/порядок. Retained top-K сохраняет прежний comparator и over-budget промежуточные beam states; final safety/time/exact+display budget gates не ослаблены.
- Optional `GenerationSelectionOptions`/`SearchOptions`: targetCount1..3, excludedFingerprints≤12/32768chars per fingerprint. Исключённые решения остаются поисковыми переходами; отсутствие нового допустимого результата не становится ложным BUDGET_TOO_LOW.
- `selectVariant` использует прежние очередь, trusted validation, ownership и base revision. До saved ack consumers читают старый bundle; quota/blocked/cancel/dispose/reload/external bytes не устанавливают поздний candidate; retry-save не повторяет генерацию.
- Menu показывает варианты/семейные закупки/активный выбор, named nonwrapping arrows, pending/recovery/success. Старый single показывает сохранённое количество без выдуманного нового shortage. Все прежние summaries/target/corpus warnings сохранены.
- Schema1/key не изменены; envelope принимает12, отклоняет13/global duplicate IDs. Production adapter/registry/catalog не менялись. Реальный legacy fixture сохранён исходными bytes.

## Task Commits

1. 03-01-01: RED`ba0ba36`; GREEN`525e985`.
2. 03-01-02: RED`14600c4`; GREEN`a6029d5`.
3. 03-01-03: RED`71c85ec`; GREEN`0f3b8ef`.
4. Дополнительный legacy UI regression в пределах того же контракта: RED`cbb68c1`; GREEN`3e3dab0`.

Восемь implementation/test commits измерены из сохранённого ledger, включая прежний RED, перед metadata commit. Actual tokens=floor(206189characters/4)=51547 по `git diff plan_head_before..plan_head_after`, с неизменённым legacy fixture. Это не harness tokens. Fixture189175UTF8bytes существенно влияет на actuals против estimate34000. Окно с RED2026-11-04T12:27Z до2026-11-05T11:45Z включает остановку по лимиту использования; активное время неизвестно.

## Verification and TDD Gate Compliance

- Task01 actual JUnit1failed: expected3variants/actual1; classifierRED_EVIDENCE_OK; fresh tracerGREEN1/1. Final browser suite2/2Chromium12.9s.
- Task02 actual JUnit68tests/9fail: expected target1/actual3, invalid options и count12. Qualified target принят classifierRED_EVIDENCE_OK до production правки; GREEN68/68.
- Task03 actual JUnit70tests/2fail: expectedidle/actualsaving после reload revision; expected savedcount1/actualunsaved3. ClassifierRED_EVIDENCE_OK; GREEN70/70.
- Legacy UI actual JUnit1failed на отсутствующей подписи, classifierRED_EVIDENCE_OK; final2/2. Первичная JSON import ошибка не считалась RED и исправлена до assertion run.
- Полный unit:397/397,17files,9.34s; typecheck/lint/build exit0; build139modules4.54s. Старые365 assertions и6seed unit сохранены. Production deadline30s/512evaluations/beam32 не увеличены.
- Реальный browser без multi-plan injection: wizard→3independent assignment fingerprints→select→menu/shopping three costs→reload. Widths360/390/430/768/1280 без horizontal overflow. Default generation+saved ack3754ms и3457ms на двух GREEN запусках.
- Подробные команды, независимые численные оракулы, EC-01–12/T-03-01/02 и ограничения: `docs/qa/phase03-plan01.md`. RED JSON/JUnit хранятся в `.tmp`; намеренные RED commits сохранены в истории.

## Legacy Evidence

Настоящий Phase2 single producer, compatibility source commit`1789eea`, captured до production правок. Fixture SHA256`f8aed6836ac1d28a27dcc9a187ec5e49a0b3ca7f928b45b550406532bc855b73`,189175UTF8bytes; catalog`mealplan-2026-10-28-1`, active`generated-1`,28literal IDs2026-11-04…10. Raw load twice не вызывает setItem, original encoded inputs/catalog/dates/IDs совпадают. Inactive budget/snapshot, same-version catalog и unknown active tampering отклоняются.

## Deviations from Plan

1. **[Rule1 - Bug]** Task03 regression потребовал исправить controller из task01: reload revision блокировал запись, но оставлял saving/timers; count нового поиска публиковался до saved ack. Исправлено`0f3b8ef`,70/70tests; WINDOWS18 записан и marked fixed. Область production не расширена за5файлов плана.
2. **[Rule2 - Missing critical UI]** Дополнительный browser RED выявил отсутствие явной подписи legacy single. Добавлены подпись и saved status в`3e3dab0`, final2/2. Возможность append не обещается до plan02.
3. **[Rule3 - Blocking test tooling]** Once-only capture node:fs/process удалены из browser spec после сохранённого fixture: они ломали строгий typecheck без Node types. Новых зависимостей нет. JSON fixture import использует явный type attribute. Неисправные classifier target/report attempts исправлены до GREEN.
4. **AGENTS.md Definition of Done / partial requirements:** `requirements.mark-complete` намеренно не применяется к полным фазовым DATA-04/GEN-06/MENU-03 после одного плана. Их поддержанные части перечислены выше; фото/карточка/остальные планы и phase acceptance pending. Это согласовано оркестратором; PLAN scope/source не менялся.

## Remaining Verification and Scope

Registered state handlers advanced Current Plan1→2, completed_plans18→19, recorded metric/decisions/session; ROADMAP handler recorded1/12. `state.update-progress` returned `updated:false` because execution phase scope is unscoped/not complete, so its existing29% display was preserved rather than manually fabricated. Оркестратору передано для phase-level reconciliation.

Все automated verify этого плана выполнены; новых skipped tests или blocking stubs нет. Auth gates отсутствуют. Установок, платных API, публикации, новой схемы или network/auth trust surfaces нет. Прежние route placeholders для будущих функций не созданы этим планом.

Firefox/WebKit/nativeSafari15, physical devices/screen readers и human UAT здесь заново не проверялись. Исторические15seed browser результатов не объявлены свежими. Полная Phase3 матрица и приёмка остаются последующим планам/верификатору. Следующий план03-02 ещё не запускался.

## Self-Check: PASSED

Все11 source/test paths, QA и SUMMARY существуют; восемь перечисленных commits являются предками HEAD. Git root pinnedD:/Projects/meal-plan, branchcodex/phase01-execution; tracked deletions отсутствуют. Чужие untracked skills/lock/research cache сохранены.
