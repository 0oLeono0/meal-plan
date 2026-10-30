---
phase: 02-pervyy-dopustimyy-plan-i-rasschitannye-pokupki
plan: "04"
subsystem: domain
tags: [deterministic-search, safety, budget-evidence, cancellation, cooperative-scheduling, tdd]
status: complete
requires:
  - phase: 02-03
    provides: Shared exact whole-period pantry, budget and nutrition projection
provides:
  - Resumable deterministic complete-period search with hard safety filters and honest typed refusal evidence
  - Injected local GenerationPort with real macrotask batches, cancellation and bounded catalog/search timeout
affects: [02-05, 02-06, 02-07, 02-10]
tech-stack:
  added: []
  patterns: [pure resumable generator, tiny exhaustive oracle, beam32 local substitutions, per-request cancellation race]
key-files:
  created: [src/domain/generatePlan.ts, src/domain/generatePlan.test.ts, src/adapters/generation.ts, src/adapters/generation.test.ts]
  modified: []
key-decisions:
  - "Use full enumeration only for spaces up to256; larger searches use a cheapest baseline and beam32 local substitutions, default512 evaluations with hard ceiling20000. Exhaustion never proves impossibility."
  - "Corrected by CR-01 (5160dee, 2026-10-30): reviewed no-fish restriction evidence covers fish and all seafood ingredients. A separately requested allergen key still requires its own suitability evidence; no allergen-free guarantee is inferred from diet classification. The original implementation incorrectly required both for no-fish."
  - "Value stock bounds through the same nutrition quantity basis as shared projection; missing mandatory alternatives prevent budget-impossibility claims."
requirements-completed: []
requirements-contributed: [DATA-02, DATA-03, GEN-01, GEN-02, GEN-03, GEN-04, GEN-05]
actuals:
  tokens: 12414
  tasks: 2
  commits: 5
plan_head_before: ee0e26728a0fb973093f762b0b0c45c8e1ba8c0d
plan_head_after: a09df41e42528507c9eaaf09f97b397b0025e027
coverage:
  - id: D1
    description: Complete reproducible periods, evidence-based hard filters, pantry-aware budget and honest search proofs
    verification:
      - kind: unit
        ref: "src/domain/generatePlan.test.ts (30 passing tests, independent16-combination oracle)"
        status: pass
    human_judgment: false
  - id: D2
    description: Real asynchronous generation with abort, timeout, catalog validation and event-loop yields
    verification:
      - kind: integration
        ref: "src/adapters/generation.test.ts (11 passing tests)"
        status: pass
      - kind: unit
        ref: "npm run test:unit -- --run (269/269 across12 files)"
        status: pass
    human_judgment: false
duration: 12min
completed: 2026-10-28
---

# Phase 2 Plan 4: Safe bounded generation and cancellable local execution Summary

**Immutable settings and a validated injected catalog now produce a deterministic complete plan or an evidence-backed typed refusal, with cooperative cancellation and a30s timeout.**

## Accomplishments

- Hard product exclusions, all five restrictions, explicit allergen evidence and15/30/60-minute per-recipe caps precede scoring. Unknown/conflicting facts remain data errors; confirmed incompatibility remains separate. Per-slot counts and search work are structured diagnostics.
- Shared projection scales servings once, spends pantry once across the whole period, and enforces both exact and canonical purchase budget limits. The solver does not own an alternative calculation ledger.
- Soft order is documented in code: capped actual first-two-day expiring stock usage, optional normalized target deviation (zero-safe), requested variety, purchase cost, seeded FNV tie then stable recipe IDs. An absent target contributes no target score.
- Fully enumerated tiny spaces can report an attained exact minimum. Otherwise only a proved conservative lower bound can justify a budget refusal; bounded exhaustion reports SEARCH_EXHAUSTED. Incomplete alternatives cannot supply a false impossibility proof.
- Adapter loads/revalidates the catalog and checks immutable snapshot identity, then runs actual search in128-transition batches. Abort and timeout race stalled catalog/scheduler waits and are checked after every await and before success. There is no animation delay or default production catalog.

## Task Commits

1. Task02-04-01 RED: `5698367`; GREEN: `811563d`.
2. Task02-04-02 RED: `a234a8b`; GREEN: `c31856f`.
3. Review correction with regression: `a09df41`.

The measured5 commits cover the persisted base through `plan_head_after`, before this summary metadata commit. Actual tokens are ceil(realized four-file Git diff characters/4), not harness usage.

## Verification

- Task1 GREEN29/29, followed by the required tracer rerun29/29; review regression raises the final domain count to30.
- Targeted domain/adapter verification initially40/40. Final complete suite: **269/269**,12 files,5.13s; no final skipped tests.
- `npm run typecheck`, `npm run lint`: exit0 after the review fix.
- `npm run build`: exit0;115 modules,523ms. No browser/UI completion is claimed; this plan exposes domain/adapter ports only.
- Independent review found one important bound-conversion issue, reproduced it, and verified the narrow correction/regression1/1. No remaining review findings.
- Synthetic60-recipe,7-day benchmark observation:581 transitions,512 complete evaluations; pure1958.33ms; adapter2053.35ms with4 macrotask yields. These are local observations, not device guarantees. The initial minimal reporter hid passing console output; a targeted documented `--disableConsoleIntercept --silent=false` run recovered the observation. Final full-suite verification subsequently ran every test.

## TDD Gate Compliance

Both task RED runs were captured as complete TAP and classified **RED_EVIDENCE_OK**. Valid fixtures reached the planned success assertion and observed the unimplemented error status. GREEN made the intended calculation and lifecycle assertions pass.

The review regression independently failed on error-vs-success for a fully pantry-covered plan. The first evidence submission had the wrong suite label in the temporary runner and was correctly rejected as INVALID_RED; correcting that runner and rerunning produced RED_EVIDENCE_OK before implementation changed. Final regression passed. No stub implementation remains.

## Deviations from Plan

**1. [Rule1 - Bug] Align stock lower-bound valuation with shared quantity basis**
- Found during independent review. A valid stock `ml→g` conversion and valid price `g→pcs` conversion were supported by projection, but the initial solver incorrectly required a direct `ml→pcs` conversion and could return a false budget refusal.
- Fixed valuation through nutrition reference basis. Regression: four100g meals,1000RUB/pcs,400ml stock, budget500; purchase0 and covered4000 must succeed.
- Files: `src/domain/generatePlan.ts`, `src/domain/generatePlan.test.ts`; commit `a09df41`.

Engineering limit: default512 evaluated complete candidates keeps the observed shared-projection workload short; caller-configurable bounds remain capped at20000 evaluations and200000 transitions. Beam width32 and actual128-step yields are retained. A bounded beam result is feasible rather than claimed globally optimal.

## Issues Encountered / Next Plan Readiness

No remaining implementation blockers, known stubs, skipped final tests, new endpoints or external services. Original documents, unrelated skills and source-research caches are preserved. No packages were installed.

Ready for02-05 operation/storage lifecycle integration. Source/catalog acceptance02-06, DATA/Q-14 and integrated generation UI remain open; synthetic safety/price/nutrition examples never enter production. Shared requirement IDs are contributions here and remain unchecked until their source/integration acceptance evidence exists, consistent with02-03.

Execution measurement window began2026-10-28T08:26:13Z; initial context reading preceded that persisted timestamp. Duration above records the measured implementation/verification window approximately.

## Self-Check: PASSED

All four created files exist; all five listed task/regression commits are ancestors of HEAD. No tracked deletion or unfinished source stub was introduced.
