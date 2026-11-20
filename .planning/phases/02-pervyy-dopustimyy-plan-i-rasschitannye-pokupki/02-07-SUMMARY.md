---
phase: 02-pervyy-dopustimyy-plan-i-rasschitannye-pokupki
plan: "07"
subsystem: ui
tags: [react, generation, active-plan, wizard, accessibility, playwright, tdd]
status: complete
requires:
  - phase: 02-05
    provides: Validated active storage and cancellable generation controller
  - phase: 02-06
    provides: Source-gated real twelve-profile fifty-two-recipe catalog
provides:
  - Real wizard and quick-start generation into a guarded persisted dated menu
  - Truthful pending cancellation timeout error and memory-only save recovery
  - Complete four-slot daily overview with shared costs nutrition and source labels
  - Applied-settings precedence and skip retention without global pantry mutation
affects: [02-08, 02-09, 02-10, phase-03]
tech-stack:
  added: []
  patterns: [controller-useSyncExternalStore, immutable-apply-gate, canonical-plan-presentation, request-origin-focus]
key-files:
  created: [src/features/generation/GenerationPage.tsx, src/features/menu/MenuPage.tsx, e2e/generation.spec.ts, e2e/entry-policies.spec.ts]
  modified: [src/app/App.tsx, src/features/wizard/Wizard.tsx, src/features/wizard/HomeProductsStep.tsx, src/features/wizard/ExclusionsStep.tsx]
key-decisions:
  - "Default presence derives from validated active load; legacy injected PlanPresencePort remains compatible. Draft persistence guards remain independent."
  - "Use one immutable apply gate, a controller subscription and shared projections; only guarded whole-plan save promotes active settings and routes to menu."
  - "Current source corpus is limited and plant-based; display actual nutrition without claiming adequacy or inventing a medical target."
requirements-completed: []
requirements-contributed: [APP-04, WIZ-08, DATA-03, GEN-01, GEN-03, GEN-04, GEN-05, MENU-01]
actuals:
  tokens: 14359
  tasks: 2
  commits: 4
plan_head_before: ce82f99b0af31fd3a6170538d2b0d4ee2eee0823
plan_head_after: ce321adcf3b86bca24190c97e57dae160c9ecfe7
coverage:
  - id: D1
    description: Real catalog wizard submission saves all dates and slots and reloads identical active values
    verification:
      - kind: e2e
        ref: "e2e/generation.spec.ts#real catalog wizard saves every dated slot and reloads the same active menu"
        status: pass
    human_judgment: false
  - id: D2
    description: Cancellation timeout retries save failure and corrupt-load recovery retain intended state
    verification:
      - kind: e2e
        ref: "npm run test:e2e -- e2e/generation.spec.ts --project=chromium (9/9 final)"
        status: pass
      - kind: other
        ref: "Independent static review; skip-origin focus finding fixed and rechecked"
        status: pass
    human_judgment: false
  - id: D3
    description: Quick-start precedence skip preservation invalid input focus and draft isolation
    verification:
      - kind: e2e
        ref: "e2e/entry-policies.spec.ts (6/6 in final combined owning-spec run)"
        status: pass
    human_judgment: false
  - id: D4
    description: Mobile menu visual sanity and basic geometry at360px
    verification:
      - kind: automated_ui
        ref: ".tmp/02-07-menu-360.png; actual Playwright MCP quick-start with7dates/28slots, scrollWidth345 <= innerWidth360"
        status: pass
    human_judgment: true
    rationale: "Agent inspected one viewport screenshot; complete responsive and three-browser release acceptance remains02-10."
duration: "13min observed from first RED commit; initial reads not separately timed"
completed: 2026-10-28
---

# Phase 2 Plan 7: Real generation and persisted menu Summary

**Four-step settings and quick start now produce a real saved dated menu through the source-gated catalog, with transparent calculations and recoverable operation states.**

## Accomplishments

- App owns the editable draft and one controller. `useSyncExternalStore` reads immutable controller snapshots; default presence comes from validated active load. Existing CR-01 `memoryEdited`, revision, serialized draft saves and reset guards remain intact. Legacy presence injection is retained, with optional test-module operation/active/catalog ports and no URL/runtime test flags.
- Final wizard submission validates all steps, applies a detached snapshot, starts a local real operation and promotes the whole result only after a successful guarded save. Cancellation/navigation invalidate late results. Retry-save uses the candidate without repeating search. Active error/corrupt/missing states remain explicit; corrupt storage is not overwritten automatically.
- Fullscreen generation shows real pending status, four rotating strings, cancellation,30s timeout and typed errors. Budget recovery opens step2. Menu shows all saved dates and four named slots, family portions, per-portion KБЖУ/estimated cost, whole-period three costs/limit/remainder, person-day nutrition/manual comparison and actual provenance. There are no fake recipe/edit/variant controls.
- Quick start prefers the last valid applied settings, otherwise validates the current/default draft. Skip3 navigates to4 without clearing restrictions; skip4 runs the same complete gate. Partial home quantities/manual targets cannot bypass validation. Draft edits leave active storage/calculations and global pantry unchanged. No-fish copy includes seafood.

## Task Commits

1. Task1 RED: `e0954bf` — actual wizard and reload behavior.
2. Task1 GREEN: `943f201` — controller, guarded storage, real generation and dated overview.
3. Task2 RED: `b4406ea` — skip retention, applied precedence and first-error focus.
4. Task2 GREEN: `ce321ad` — retained skip semantics, focus recovery and source/target presentation.

Measured4 implementation/test commits from the persisted per-plan ledger through `plan_head_after`; metadata commits are excluded. Tokens are ceil(realized eight-file Git diff characters/4), matching the estimate scale. The observed first-RED-to-production-completion window is16:45:16–16:58:02UTC; initial context reading was not separately timed.

## Verification

- Final generation owning command: **9/9 Chromium**,29.9s. It exercises actual default bundled catalog→wizard→save→menu→reload, all7dates/28slots, exact canonical cost/nutrition presentation, default presence redirect, cancellation/late result/primary and skip focus, timeout, error retry, budget-step recovery, retry-save without repeated search, old-active preservation and corrupt storage.
- Final entry-policy results: **6/6 Chromium** in the combined owning-spec run: constraints/exclusions/known stock retained through both skips, unknown global pantry untouched, partial quantity/manual target blocked, invalid quick-start input focused, changed draft isolated and last-applied precedence preserved. After that run only the generation test's numeric expectation changed; all6 entry tests already passed on the final production source.
- Complete unit suite: **325/325**,16files,6.65s. Final `npm run typecheck`, `npm run lint`, `npm run build`: exit0; final build134modules,681ms. No dependency install.
- Required tracer re-verification passed9/9 before task2 implementation. Independent read-only review found no blockers and one minor skip-cancel origin-focus issue; fixed with a regression assertion and independently statically confirmed closed.
- Actual Playwright MCP at360×800 ran quick-start→real saved menu. Screenshot `.tmp/02-07-menu-360.png` inspected: clear three-cost card, wrapped sums, bottom navigation and focused h1;7dates/28slots; document scrollWidth345 <= viewport360. MCP console reported0errors/0warnings. This is one viewport sanity check, not the deferred full responsive matrix or historical iOS Safari verification.

## TDD Gate Compliance

- Task1 reached the real fourth step and intentionally failed because the final generation CTA was absent. Unchanged JUnit report `.tmp/02-07-red.json` returned `RED_EVIDENCE_OK` before implementation; separate RED commit exists.
- Task2 restored step3 and intentionally failed its exact skip-preservation copy assertion. `.tmp/02-07-task2-red.json` returned `RED_EVIDENCE_OK`; an additional test exposed route h1 focus overriding the first invalid field. A deferred field-focus frame fixes the actual ordering issue.
- Test-development issues were corrected without changing product requirements: collapsed-details text needed `useInnerText`, an invalid fixture exclusion ID was replaced with a real catalog ID, virtual clock installation followed module discovery, and one intermediate run was interrupted by development-server HMR during a review edit. A fixed-price expectation incorrectly assumed the randomized seed always selected the same candidate; final browser proof compares the actual saved canonical projection rather than introducing a test-only runtime seed. Domain source arithmetic retains independent numeric assertions in02-06.
- Final relevant tests pass. No refactor-only commit was necessary.

## Deviations from Plan

None outside the planned eight-file scope. First-error and skip-origin focus corrections implement the explicit accessibility contract; the independent-review fix and final presentation assertions are included in task2's focused commit.

## Limits and Next Step

- Source corpus remains the limited twelve-profile plant-based set accepted in02-06. Actual values are shown without claiming a balanced or nutritionally complete diet. Missing manual target stays absent; no medical minimum or paid API was introduced.
- The shopping route still has its pre-existing honest empty state until02-08 implements the shared calculated list. Old assertion updates belong to02-09; the complete three-browser/viewport release matrix belongs to02-10. No skipped required owning verification or new blocking stub remains in this plan.
- `requirements.ready-ids` returned no ready IDs: all eight contributed requirements remain shared with incomplete sibling plans. They were not prematurely marked complete. Phase2 remains in progress; next02-08.
- No new endpoint, auth path, dependency or trust boundary beyond the plan threat model; source/error strings are React text, and food preferences stay local. No user setup or authentication was required. Existing untracked user skill/cache files were preserved.

## Self-Check: PASSED

All four created artifacts exist and all four recorded task commits are ancestors of HEAD. Ledger measurement reports4commits and all eight planned files. No unexpected tracked-file deletion.
