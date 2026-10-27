---
phase: 01-gostevoy-start-i-sohranyaemye-nastroyki
plan: "05"
subsystem: ui
tags: [budget, react, typescript, playwright, native-radio, raw-draft]
requires:
  - phase: 01-04
    provides: Persistent wizard navigation, people/days, raw draft and manual nutrition
provides:
  - Exact whole-ruble budget with truthful projected slider and person-day allocation hint
  - Persistent cooking-time and variety native radio groups
affects: [01-06, 01-08, phase-02]
actuals:
  tokens: 5220
  tasks: 2
  commits: 4
plan_head_before: d760abd69a8d6dda705e205e0f2db387e7e60269
plan_head_after: 0c231d2d607988535da319ee976050a4a0d2dcf6
tech-stack:
  added: []
  patterns: [raw exact financial input, derived slider projection, native radio fieldsets]
key-files:
  created: [src/domain/budget.ts, src/domain/budget.test.ts, src/features/wizard/BudgetStep.tsx, e2e/budget.spec.ts]
  modified: [src/domain/settings.ts, src/features/wizard/Wizard.tsx]
key-decisions:
  - "Exact safe integer budget >=500 has no slider maximum; projection and rounded hint are derived only."
  - "Use existing draft actions and enum recovery; no duplicate cooking-time or variety state."
requirements-completed: [WIZ-04, WIZ-05]
coverage:
  - id: D1
    description: Exact budget parsing, projection, allocation hint and period preservation
    verification:
      - {kind: unit, ref: "src/domain/budget.test.ts (47 tests)", status: pass}
      - {kind: e2e, ref: "e2e/budget.spec.ts#budget", status: pass}
    human_judgment: false
  - id: D2
    description: Cooking-time/variety ordering, defaults, adjacency, idempotency, reload and corrupt-enum recovery
    verification:
      - {kind: e2e, ref: "e2e/budget.spec.ts#time-variety (5 tests)", status: pass}
    human_judgment: false
  - id: D3
    description: 360/768/1280px doubled text, no page overflow and full error visibility above footer
    verification:
      - {kind: e2e, ref: "e2e/budget.spec.ts#budget overflow/long-text", status: pass}
    human_judgment: false
duration: 9 min
completed: 2026-10-26
status: complete
---

# Phase 1 Plan 5: Точный бюджет, время и разнообразие Summary

**Ручные 500/1050/20000 ₽ сохраняются точно; бегунок отражает проекцию, а время и разнообразие переживают переходы и перезагрузку.**

## Accomplishments

- Trim + ASCII digit-only safe-integer parser rejects empty, signed, decimal, exponent, nonfinite and unsafe strings. No manual maximum of 15000. Raw invalid input is retained; no hint is calculated for it.
- Range 1000–15000/100 projects half-up and clamps its own thumb. Accessible value states its actual amount and, when different, the exact field amount. Range movement replaces raw budget and removes the manual note. Hint uses budget/people/days and rounds only its presentation; no food cost or financial-limit basis is invented.
- Native time 15/30/60/any and variety same/medium/max preserve DOM/keyboard order, independent selection and last saved values. New-draft defaults remain 30/medium; invalid restored enums show existing recovery notice without overwriting original bytes.
- Shared components/tokens reused; targets at least44px. Error-group scrolling keeps the full budget error above the sticky actions at200% text. Screenshots `.tmp/01-05-budget-{360,768,1280}.png` generated;360px viewed before/after the scroll fix.

## Task Commits

1. Task01-05-01 RED: `4ba5f13`; GREEN: `b0508d0`.
2. Task01-05-02 RED: `076f1bf`; GREEN: `0c231d2`.

Actuals:20877 realized scoped diff characters /4, rounded up=5220 tokens. Four measured task commits; six implementation/test files. No new dependencies.

## Verification

| Command | Actual result |
|---|---|
| `npm run test:unit -- --run src/domain/budget.test.ts` |47 passed |
| `npm run test:unit -- --run src/domain/budget.test.ts src/domain/settings.test.ts src/adapters/guestDraft.test.ts` |96 passed,3 files,326ms |
| `npm run test:e2e -- e2e/budget.spec.ts --project=chromium` |Task1:6 passed,9.4s; final suite includes11 budget/time-variety tests |
| `npm run test:e2e -- e2e/budget.spec.ts --project=chromium --grep time-variety` |5 passed,7.1s |
| `npm run test:e2e -- e2e/budget.spec.ts e2e/wizard.spec.ts e2e/storage.spec.ts --project=chromium` |30 passed,27.2s before final error-scroll fix |
| `npm run test:e2e -- e2e/budget.spec.ts e2e/wizard.spec.ts --project=chromium` |18 passed,17.7s after error-scroll fix |
| `npm run typecheck` |exit0, latest run after final changes |
| `npm run lint` |exit0, latest run after final changes |
| `npm run build` |exit0,110 modules, Safari15 target, dist/index.html exists |
| `git diff --check` |exit0 |

Final token-color styling was followed by typecheck/lint/build. Full Firefox/WebKit and release checks belong to01-08; this plan makes no claim of Safari15 runtime verification.

## TDD Gate Compliance

- Task1 RED: existing step validator rejects `' 1050 '`, target assertion expected true/received false;23 other cases passed. `.tmp/01-05-01-red.json` classified RED_EVIDENCE_OK. Initial TAP object diagnostics had malformed multiline YAML; reran a scalar assertion with unchanged intended behavior. Initial RED test commit preceded the accepted reporter rerun; production changes began only after acceptance.
- Task2 RED: real browser reached step2; time-radio count expected4/received0. JUnit record `.tmp/01-05-02-red.json` classified RED_EVIDENCE_OK; start timestamp comes from the actual reporter XML. GREEN added native groups through existing draft actions.
- No refactor-only commit needed. Browser test corrections respected the existing250ms double-next guard and existing recovery wording; no product semantics changed for those corrections.

## Deviations from Plan

**1. [Rule2 - Missing critical integration] Single budget validator for field and navigation.** Existing `settings.ts` rejected outer whitespace. Delegated its budget check to the new parser so navigation and rendered hint cannot disagree. File:src/domain/settings.ts. Verified by47 budget tests and browser trimmed-input case; commit `b0508d0`.

**2. [Rule1 - Bug] Long error was partly behind sticky actions.** Visual review at360px/200% exposed a missed error-text boundary. Added a failing bounding-box assertion; Wizard now centers the enclosing Field. Verified at360/768/1280 plus wizard regressions; commit `0c231d2`.

## Issues and Limits

No unresolved blocker introduced by this plan. Existing C-04/Q-03 gate remains for01-07; generation, finance basis and nutrition facts remain later-phase work. Existing placeholders for steps3/4 are owned by01-06 and were not expanded. Full phase acceptance remains01-08. Existing WINDOWS.md records and unrelated untracked skills preserved.

## Next

Ready for01-06. Only01-05 executed in this run.

## Self-Check: PASSED

All four created files exist; all four task commit hashes are ancestors of HEAD. Summary measured from persisted plan ledger; modified code contains no new placeholder/TODO/FIXME or additional network/auth/schema trust boundary.
