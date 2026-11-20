---
phase: 02-pervyy-dopustimyy-plan-i-rasschitannye-pokupki
plan: "02"
subsystem: domain
tags: [applied-settings, snapshots, calendar, integrity, generation-contracts, tdd]
status: complete
requires:
  - phase: 02-01
    provides: Exact rationals, catalog/recipe/source contracts and catalog validation
provides:
  - Shared four-step apply/quick-start gate with exact raw values and immutable snapshots
  - Local date-only PlanInputs, separate recipe instances, variants and validated active envelopes
  - Canonical generation port/result/error contracts and bounded JSON rational persistence codec
affects: [02-03, 02-04, 02-05, 02-07, 02-08, 02-09, 02-10]
tech-stack:
  added: []
  patterns: [detached frozen snapshots, fail-closed integrity validation, date-only calendar arithmetic]
key-files:
  created:
    - src/domain/appliedSettings.ts
    - src/domain/appliedSettings.test.ts
    - src/domain/plan.ts
    - src/domain/plan.test.ts
  modified: []
key-decisions:
  - "Applied values are derived from validated raw strings; the older Number parser never supplies exact arithmetic values."
  - "Local launch date is captured once; stored date-only values advance by calendar fields, independent of DST elapsed hours."
  - "Envelope validation checks shape/integrity and rejects persisted totals; full cost/safety projection remains a separate later load gate."
requirements-completed: []
requirements-contributed: [APP-04, WIZ-08, DATA-01, DATA-02, DATA-03, GEN-01, MENU-01]
actuals:
  tokens: 10010
  tasks: 2
  commits: 5
plan_head_before: f48d32b4d55e020da5a42e60e4817fb1b558b2a7
plan_head_after: 9473f6ee0c5ef2f2e04791bd98e7d25df76a6010
coverage:
  - id: D1
    description: First-error four-step apply gate, quick-start priority, skip preservation, exact values and detached immutable settings
    verification:
      - kind: unit
        ref: "npm run test:unit -- --run src/domain/appliedSettings.test.ts src/domain/plan.test.ts (28 tests)"
        status: pass
    human_judgment: false
  - id: D2
    description: Local calendar, unique date/slot instances, immutable provenance, corrupt bundle rejection and exact JSON round-trip
    verification:
      - kind: unit
        ref: "TZ=America/New_York npm run test:unit -- --run src/domain/plan.test.ts src/domain/appliedSettings.test.ts (28 tests)"
        status: pass
      - kind: unit
        ref: "TZ=Europe/Moscow npm run test:unit -- --run (202 tests across 8 files)"
        status: pass
    human_judgment: false
duration: 8min
completed: 2026-10-27
---

# Phase 2 Plan 2: Immutable applied settings and dated plan contracts Summary

**Validated guest input becomes exact frozen settings, and dated recipe instances round-trip through a bounded versioned envelope without trusting persisted totals.**

## Performance

- First persisted execution timestamp: 2026-10-27T18:45:12Z; context loading preceded this timestamp.
- Final automated verification: approximately 2026-10-27T18:51:32Z; independent static review and close-out followed.
- Duration: approximately 8 minutes through close-out; 2 tasks, 4 source/test files.
- Actual tokens: 40,040 realized source/test diff characters / 4 = 10,010, measured from the persisted plan base through the final implementation commit.
- Actual commits: 5, measured with `git rev-list --count` from `.git/gsd-plan-head-before-02-02` before the separate documentation commit.

## Accomplishments

- `buildAppliedSettings` validates all four steps in order, preserving the first failing step. Exact budget/manual/home values consume the original decimal strings. An absent target and unknown stock remain explicit states. Snapshot copies include raw input, nested rows, restrictions, exclusions and target provenance; editing or navigating the draft cannot mutate an applied snapshot.
- `selectQuickStartInput` revalidates the last applied snapshot against its raw source, otherwise uses the current draft, or calls `createDraft` once only when no draft was supplied. An invalid draft is returned for correction, not silently reset. Skip has no deletion/apply side effect.
- `PlanInputs` stores local start/date-only basis, all dates, seed/catalog version, immutable catalog/source and independent pantry snapshots. Four ordered slots per day produce 4–28 distinct instances; repeated recipe IDs retain their own instance/date/slot origin and source recipe snapshot. Family servings and base yield are separate and unscaled for the later projection.
- Active envelopes validate versions, exact shape, counts, dates, slots, IDs, source pool, catalog/recipe identity and rational bounds. All variant instance IDs are globally unique. JSON codecs preserve numerator/denominator strings. Added canonical `GenerationRequest`, `GenerationError`, `GenerationResult`, `GenerationPort` and budget proof contracts for later consumers.

## Task Commits

1. `e5ffdb9` — Task 1 RED: specify immutable applied settings gate with a fail-closed baseline.
2. `9cc9a9a` — Task 1 GREEN: exact raw parsing, frozen snapshots and shared apply/quick-start policy; 12 tests passed and tracer rerun passed before expansion.
3. `1aaac32` — Task 2 RED: dated plan/source/codec/corrupt-input specifications with a fail-closed date baseline.
4. `8a684d6` — Task 1 regression correction: duplicate restrictions/home rows report steps 3/4 instead of structural step 1; observed regression RED followed by GREEN.
5. `9473f6e` — Task 2 GREEN: calendar, instances, envelope validation, JSON codec and canonical generation contracts.

## TDD Evidence

- Task 1 first full run collected 12 tests, 7 failed on missing behavior. The initial TAP record was rejected as `INVALID_RED` because Vitest emitted multiline non-TAP diagnostics. Before GREEN, reran the named valid-draft status assertion in isolation: `RED_EVIDENCE_OK`, expected `applied`, actual `invalid`. Actual report and semantic assessment are preserved in ignored local `.tmp/02-02-red1.json`.
- Task 2 named local-date assertion executed and failed: expected `2026-10-27`, actual empty date. The actual TAP record was classified `RED_EVIDENCE_OK` before GREEN; record is `.tmp/02-02-red2.json`.
- Both baseline implementations were replaced. No production stub remains. No refactor-only commit was needed.

## Verification

- Targeted final run: 28/28 tests passed, 425 ms Vitest duration. Task 1 tracer rerun after its first GREEN: 12/12 passed, 266 ms.
- Actual isolated `TZ=America/New_York` process: 28/28 passed, 373 ms. Tests assert local 03:55 UTC is the previous calendar date, actual spring offsets change 300→240 minutes, and dates remain consecutive across the 23-hour day. Calendar cases also cover fall DST, leap day and year boundary.
- Actual isolated `TZ=Europe/Moscow` process: full suite 202/202 passed across 8 files, 551 ms. Moscow near-midnight UTC mismatch is independently asserted.
- `npm run typecheck`: passed. `npm run lint`: passed. `npm run build`: passed, Safari 15 target, 766 ms Vite duration.
- `git diff --check`: passed; Git printed informational LF/CRLF notices only.
- Independent read-only Superpowers review: no blocking findings for snapshot, precision, calendar, identity, codec or generation contracts. Reviewer did not rerun tests; execution evidence above is from the executor.
- Browser tests were not run: this plan creates pure modules and no browser flow. Browser acceptance remains in later Phase 2 plans.

## Decisions and Integration Notes

- Downstream modules import generation types from `src/domain/plan.ts`; no second result/request schema is needed. `GenerationPort.generate(request, signal)` returns success/plan, error/error or cancelled. Budget evidence distinguishes lower-bound/exhaustive-minimum and carries an exact amount and proof metadata.
- `createPlanInputs(settings, catalog, { seed, now?, pantrySnapshot? })` captures immutable inputs. The pantry defaults to applied home rows; an explicit separate snapshot prepares the later pantry integration without consuming global stock.
- `createRecipeInstances(inputs, recipeIds, idFactory)` creates ordered date/slot instances. IDs must differ across variants as well as dates/slots. `buildActivePlanEnvelope`, `validateActivePlanEnvelope`, `validatePlanInputs` and `encodePlanEnvelope` provide the shared boundary.
- The existing pure `validateCatalog` boundary is reused from `adapters/catalog.ts`, avoiding a weaker duplicate catalog schema. No React/browser/runtime network API is used by these operations.
- Integrity validity does not prove full price, safety or budget suitability. Test-only recipes are explicitly synthetic; the real USDA tracer retains unknown price/safety. Production catalog/source gate 02-06, shared projection 02-03, solver and UI integration remain unfinished.

## Deviations from Plan

None — changes stay within the four declared source/test files. The additional duplicate-input regression corrects the planned first-error policy. No dependencies, global Git settings, user documents or external publication were changed.

## Issues Encountered

The ES2020 target lacks `Object.hasOwn`; used `Object.prototype.hasOwnProperty.call` without changing compiler/browser targets. Existing storage structural validation rejects duplicate rows before step validation; the apply gate now checks their shape without dropping duplicates, then passes the original rows to the ordered step validators. Both issues are resolved and tested.

GSD `state.update-progress` returned its explicit unscoped-phase guard instead of updating the prose bar. `state.advance-plan` correctly updated current plan to 3 and completed count to 10; the verified Phase 2 count 2/10 and next plan 02-03 were then written through registered `state.update Progress`. `roadmap.update-plan-progress` independently reported 2 summaries / 10 plans, In Progress.

## Known Stubs

None. Unknown target/stock/source facts are deliberate data states. Generation types are contracts for later plans and contain no simulated implementation.

## Next Plan Readiness

Ready for 02-03: the shared projection can consume exact applied values, unscaled recipe instances, family selected servings, a single pantry snapshot and stable source instance identities. `requirements.ready-ids` returned no ready IDs: all seven contributed requirements are shared with unfinished sibling plans, so none is prematurely marked complete.

## Self-Check: PASSED

All four source/test files and this SUMMARY exist. All five listed implementation commits are ancestors of HEAD. No tracked file deletion occurred; caller-owned untracked skills/cache were preserved. Stub/threat-surface scan found no unfinished implementation or additional endpoint/auth/file/schema trust boundary outside the plan's declared editable-input/persisted-JSON boundary.
