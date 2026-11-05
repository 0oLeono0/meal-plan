---
phase: 03-sravnenie-variantov-i-prosmotr-retseptov
plan: "02"
subsystem: generation
tags: [append, deterministic-search, confirmation, guarded-persistence, deadlines, tdd]
requires:
  - phase: 03-01
    provides: semantic top3, bounded exclusions, twelve-variant envelope, guarded selection
provides:
  - One semantic alternative appended using the exact saved input snapshot
  - Explicit capped-set and changed-settings replacement confirmation
  - Idempotent operation ownership, elapsed deadline and guarded retry evidence
affects: [03-03, 03-10, 03-11, 03-12]
tech-stack:
  added: []
  patterns: [intent-owned operation, immutable validated bundle reuse, one elapsed deadline]
key-files:
  created: [e2e/phase03-append.spec.ts, docs/qa/phase03-plan02.md]
  modified: [src/adapters/generation.ts, src/features/generation/controller.ts, src/features/menu/MenuPage.tsx, src/app/App.tsx, src/adapters/generation.test.ts, src/features/generation/controller.test.ts, .planning/phases/03-sravnenie-variantov-i-prosmotr-retseptov/03-VALIDATION.md, .planning/WINDOWS.md]
key-decisions:
  - "Append retains exact saved settings/dates/catalog/pantry and all prior identities; only a saved acknowledgement installs its merged candidate."
  - "Reuse independently validated immutable bundles in the frozen controller snapshot; bounded metadata copying preserves trust limits at cap12."
requirements-supported: [GEN-07, DATA-04, GEN-06]
requirements-completed: []
coverage:
  - id: append
    description: Real append adds one unique alternative and preserves prior saved settings and variants through reload and failures
    requirement: GEN-07
    verification:
      - kind: e2e
        ref: e2e/phase03-append.spec.ts
        status: pass
      - kind: unit
        ref: src/features/generation/controller.test.ts
        status: pass
    human_judgment: false
  - id: replacement
    description: Cap12 and changed-settings replacement require confirmation and preserve old data until acknowledged save
    requirement: GEN-07
    verification:
      - kind: e2e
        ref: e2e/phase03-append.spec.ts#cap twelve confirms replacement and preserves old bytes through cancel and failed write
        status: pass
      - kind: e2e
        ref: e2e/phase03-append.spec.ts#changed draft launch needs confirmation and installs only after save acknowledgement
        status: pass
    human_judgment: false
  - id: ownership
    description: Deadline, cancellation, revision, duplicate and save-retry guards reject unwanted installs and writes
    requirement: DATA-04
    verification:
      - kind: unit
        ref: src/adapters/generation.test.ts and src/features/generation/controller.test.ts
        status: pass
      - kind: e2e
        ref: e2e/phase03-append.spec.ts#navigation cancels an append already waiting for its final save
        status: pass
    human_judgment: false
actuals:
  tokens: 19991
  tasks: 3
  commits: 6
commits: 6
plan_head_before: 83667ae7475bd74dc337943753e99e9269e17c4e
plan_head_after: c0371385f5c6d3a4e023ee610f6f41fef124756c
duration: "25 min observed; initial reads not timed"
completed: 2026-11-05
status: complete
---

# Phase 3 Plan 2: Добавление вариантов и подтверждённая замена Summary

**Один поиск добавляет один уникальный вариант с прежними applied inputs; подтверждённая замена и повтор записи сохраняют старый набор до saved ack, включая предел12 и поздние ответы.**

## Accomplishments

- `appendVariant(origin)` reuses immutable saved settings, dates, catalog and pantry, requests target1 with every saved semantic fingerprint excluded, namespaces only the new variant/instances and merges it last. Existing IDs, snapshots, order and active stay unchanged until saved. No-new is a persistent bounded-search explanation, not proof of impossibility.
- `recreateSet(origin)` requests target3 with saved inputs. Native actions disclosure exposes only recreate/settings. Cap12 disables append with a permanent explanation; no eviction. Existing ConfirmDialog handles Escape, initial cancel focus, return trigger and h1 fallback. Final wizard replacement confirms validated new settings and retains raw draft on cancel.
- One controller owns operation intent, base revision, write queue and memory-only candidate. Retry-save reuses exactly that candidate with zero extra searches; retry-generation retains the original operation and inputs. Identical pending starts are deduplicated. Cancel, navigation, dispose, select, reload, recreate and external byte conflicts cannot install a stale append.
- Adapter validates/detaches target1..3 and exclusions≤12 before awaiting catalog work. Null/malformed options fail before load. One30s deadline covers catalog/search/yields; controller checks elapsed time after awaits and before/finally guarding a write, including a delayed timer callback.
- Source-backed12-old-plus3-candidate quota regression passes without raising immutable-snapshot limits. Frozen snapshots reuse only independently detached/deep-frozen validated bundles, while metadata remains bounded-copied. All injected generation results still require trusted validation.

## Tasks and Commits

| Task | RED | GREEN | Evidence |
|---|---|---|---|
|03-02-01|8c7168a|5f2d7ec|Actual browser2 failures→2 pass; focused42/typecheck; tracer rerun2 pass|
|03-02-02|cc5c923|e6a29df|Cap/new-settings RED2→full5 browser pass; controller31/type/lint|
|03-02-03|197b777|c037138|Actual focused71:66 pass/5 fail→75 pass; final append7 browser pass|

All RED records used actual unchanged JUnit and passed official `check tdd-red-evidence` before their fixes. Additional pending-indicator RED also passed the official gate. Semantic assessment: each target reached the intended saved/pending operation and failed its planned assertion; no import, collection, fixture or empty-suite failure authorized implementation. Details and commands: `docs/qa/phase03-plan02.md`.

## Verification

- Full unit `npm run test:unit -- --run`:431/431 across17files,12.73s. Focused adapter/controller75/75. No skipped test introduced.
- `npm run typecheck`, `npm run lint`, `npm run build`: passed; production target Safari15,139modules. Actual build is not a native Safari browser test.
- Chromium append6+variants2:8 passed54.6s. After explicit indeterminate/cancel case, final append7/7 passed46.9s. Separate actual runs are recorded separately. Legacy single cardinality and real wizard/selection/shopping/reload passed in the8case regression.
- Widths360/390/430/768/1280: no document overflow. Actual Escape/cancel focus and successful h1 fallback asserted. Screenshots `.tmp/phase03-plan02-dialog360.png` and `.tmp/phase03-plan02-recreated1280.png` inspected visually.
- Every task acceptance clause and EC13–17 has named adapter/controller/browser evidence in QA and `03-VALIDATION.md`. All prior domain tests, including exclusion-transition and13-variant rejection, remain passing. No package install/update; catalog facts, schema and storage key unchanged.

## Decisions Made

Append preserves the saved request snapshot independently of editable draft. Candidate publication occurs only after saved acknowledgement. Reuse validated frozen bundle references to avoid combined old/candidate snapshot copying at cap12; do not widen generic trust limits.

## Deviations from Plan

1. **[Rule3 - Integration] App route callback wired in Task01.** The browser tracer needs the actual controller operation. App is within plan-wide ownership; only sequencing moved ahead of Task02.
2. **[Rule1 - Bug] Cap12 snapshot duplication.** Real browser found `SNAPSHOT_SIZE_LIMIT` while publishing old12 plus candidate3. Fixed in e6a29df by frozen validated-bundle reuse; source-backed unit and quota/cancel browser regression pass. WINDOWS19 is fixed.
3. **[Rule1 - Bug] Deadline/dedup/null boundary gaps.** Task03 RED exposed5 intended failures. Fixed in c037138 with elapsed checks/final write guard, identical-start deduplication and explicit undefined defaults.75 focused tests pass; WINDOWS20 is fixed. Production30s/evaluation limits unchanged.

Test-fixture corrections preserved product rules: changed-input submit uses valid whole-ruble raw01777; cap rationals are independently normalized. Invalid draft777.25 is deliberately retained during append/recreate and never applied. Focus fallback and indeterminate progress are planned accessibility requirements, verified after observed RED assertions.

## Known Stubs

No new stub prevents this plan's goal. Existing App recipe fallback belongs to03-03, pantry entry to its later phase and guest-profile explanation to P1; these unchanged routes were not advertised as implemented here. No TODO/FIXME, fake success, new endpoint, schema or file-access trust surface introduced.

## Limits and Next Plan

Human UAT/native Safari15/physical device/assistive-technology judgment was not performed here. Phase03 and GEN07/DATA04/GEN06 remain pending at phase level; this plan supports them without marking requirements complete. No unrelated pre-existing failure fixed and no user/untracked files removed. Ready for03-03; it was not started by this executor.

## Self-Check: PASSED

All10 changed artifacts exist; six recorded task commits are ancestors of HEAD. Summary existence is checked before its immediate metadata commit. Root pinned toD:/Projects/meal-plan and branchcodex/phase01-execution before writes/commits; no tracked deletion. Actuals measured from the persisted ledger and realized diff79962chars/4 rounded up, not harness tokens; observed duration begins2026-11-05T11:52:40Z, initial reads were not timed.
