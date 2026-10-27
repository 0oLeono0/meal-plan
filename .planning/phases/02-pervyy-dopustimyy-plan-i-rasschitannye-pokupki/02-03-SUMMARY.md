---
phase: 02-pervyy-dopustimyy-plan-i-rasschitannye-pokupki
plan: "03"
subsystem: domain
tags: [exact-arithmetic, nutrition, pantry, purchases, budget, presentation, tdd]
status: complete
requires:
  - phase: 02-01
    provides: Exact rationals and source-based ingredient evaluation
  - phase: 02-02
    provides: Immutable applied settings, dated instances and canonical plan contracts
provides:
  - Pure whole-period nutrient, pantry and purchase projection with reconciled exact and canonical costs
  - Shared Russian presentation, source metadata and optional unrounded person-day target comparison
affects: [02-04, 02-05, 02-07, 02-08, 02-09, 02-10]
tech-stack:
  added: []
  patterns: [whole-period stock ledger, canonical product-row kopecks, pure shared selectors]
key-files:
  created:
    - src/domain/planProjection.ts
    - src/domain/planProjection.test.ts
    - src/domain/presentation.ts
    - src/domain/presentation.test.ts
  modified: []
key-decisions:
  - "Project each candidate from canonical PlanInputs and PlanVariant; eligibility and impossibility proofs remain solver responsibilities."
  - "Apply stock once per product across all instances and profiles, retaining exact family and person-day nutrition independently."
  - "Displayed period and day ingredient totals each sum their own rounded product rows; never arbitrarily distribute purchase or rounding residuals among days."
requirements-completed: []
requirements-contributed: [CALC-01, CALC-03, CALC-04, CALC-05, CALC-06, CALC-07, MENU-01, MENU-04, SHOP-01, SHOP-04]
actuals:
  tokens: 9908
  tasks: 2
  commits: 5
plan_head_before: 218e73c60bba9e1c9b35856a37c1d254edaf88ce
plan_head_after: b6916b463907eabe05755adcbbdef6bf76c8e26f
coverage:
  - id: D1
    description: Exact scaling, nutrition, aggregate stock allocation, source instances and three reconciled costs
    verification:
      - kind: unit
        ref: "npm run test:unit -- --run src/domain/planProjection.test.ts (12 tests)"
        status: pass
    human_judgment: false
  - id: D2
    description: Shared canonical Russian output, raw/displayed budget gates and optional exact target boundaries
    verification:
      - kind: unit
        ref: "npm run test:unit -- --run src/domain/presentation.test.ts src/domain/planProjection.test.ts (26 tests)"
        status: pass
      - kind: unit
        ref: "npm run test:unit -- --run (228 tests across 10 files)"
        status: pass
    human_judgment: false
duration: 10min
completed: 2026-10-27
---

# Phase 2 Plan 3: Exact whole-plan calculation and canonical presentation Summary

**Whole-period requirements consume pantry once, preserve exact source nutrition and expose reconciled ingredient, purchase and covered values through one shared Russian selector.**

## Performance

- Approximate execution window: 18:54–19:04 UTC on 2026-10-27, including context reading, TDD and independent review. First numerical RED run was at 18:56 UTC; start was not separately persisted.
- Tasks: 2; source/test files: 4. No dependency changes.
- Actual tokens: 39,629 realized source/test diff characters / 4, rounded up = 9,908. This uses the plan estimate scale, not harness usage.
- Actual commits: 5, measured from `.git/gsd-plan-head-before-02-03` to the final implementation HEAD before documentation commits.

## Accomplishments

- `projectPlan(inputs, variant)` validates input/catalog integrity and instance references, then scales selected/base servings exactly once. Compatible requirements aggregate over the entire period by product/profile/basis. Every contributing date, slot, recipe and instance remains traceable. Incomplete candidate slot sets support search and later removal; projection does not assert dietary eligibility or prove impossibility.
- One product stock remainder spans every instance/profile. Unknown quantities grant no coverage; incompatible units produce explicit diagnostics; validated product conversions permit cross-unit coverage. Excess stock caps purchases at zero, and input snapshots remain immutable. Exact nutrition is independent of stock coverage.
- Exact family/portion/day/person-day/period-average nutrients and family day ingredient costs remain rational. Ingredient = purchase + covered for exact values and canonical kopecks. Product ingredient/purchase rows round half-up separately; covered display is their difference. Both exact purchase and canonical row-sum purchase must fit the limit. Rejection has no unsupported minimum-budget claim.
- `selectPlanPresentation` supplies menu/shopping consumers with the same costs, categories, positive-row item count, independent instance count, actual price sources/region/date and covered rows. Russian currency, quantities, date-only labels and plurals share one formatter path. Day display also sums canonical product rows; independently rounded days need not sum to the separately aggregated period total.
- Manual person-day targets remain optional. Ratios/deltas use exact actual values; warnings occur strictly above 110 percent per metric. Zero target distinguishes zero actual from positive actual without division. No medical norm is inferred.

## Task Commits

1. Task 02-03-01 RED: `afaf806` — independent whole-period stock and nutrition oracles.
2. Task 02-03-01 GREEN: `e85552f` — exact whole-period projection.
3. Task 02-03-02 RED: `4a87e9e` — presentation and target boundaries.
4. Task 02-03-02 GREEN: `11b8697` — shared Russian formatting and selectors.
5. Review corrections: `b6916b4` — canonical daily product-row rounding and strict source IDs.

## Verification

- Task 1 tracer feedback rerun: 12/12 projection tests passed before expanding presentation.
- Final targeted suite after review fixes: 26/26 tests across both files, exit 0.
- Final full unit suite after review fixes: 228/228 tests across 10 files, exit 0; reported Vitest duration 606 ms.
- `npm run typecheck`: exit 0 after review fixes.
- Scoped ESLint over the four owned files: exit 0 after review fixes.
- `npm run build`: exit 0 after review fixes; Safari 15 target, reported Vite build 467 ms.
- Independent read-only review found one blocking display defect and one minor ID boundary issue. Both were corrected; final follow-up review reported **0 blocking findings and no new findings**.
- Browser tests were not needed for this pure domain slice and were not executed. Integrated browser acceptance remains with later plans; no menu/shopping UI readiness is claimed here.

## TDD Gate Compliance

- RED assertions execute against valid synthetic inputs, not import failures. Persisted local records `.tmp/02-03-planProjection-red.json` and `.tmp/02-03-presentation-red.json` each received `RED_EVIDENCE_OK` from the SDK classifier before implementation. The latter used a targeted TAP rerun because multiline assertion output from the full reporter was not valid TAP for the classifier.
- Projection RED: expected `projected`, observed `invalid` from the initial unimplemented boundary. GREEN satisfies explicit 500/200/300 g and 100/40/60 RUB oracles, scale2→3, conversions, cross-profile one-time coverage, missing facts and exact fractions.
- Presentation RED: expected `1 234,56 ₽`, observed empty output. GREEN verifies exact500 acceptance versus500.0001 rejection; row0.005+0.005→0.02; exact500 with displayed500.01 rejected at500 limit; strict110% thresholds, absent and zero targets.
- Review regressions were observed failing before correction: a one-day display0.01 versus canonical0.02; numeric IDs accepted as projected. Both pass after correction.
- Temporary reporter `-t` filters are not skipped product tests; the final complete suite has no skips. No separate refactor was required.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Canonical daily cost display**
- Found during independent review after Task 2. Day cost rounded the combined raw amount, disagreeing with the canonical product-row sum even for a single-day plan.
- Added `DayProjection.ingredientKopecks` from rounded per-day product rows and made presentation consume it. Exact day costs remain untouched.
- Files: projection/presentation modules and presentation regression test. Commit: `b6916b4`.

**2. [Rule 2 - Missing critical validation] Canonical string instance IDs**
- Review showed numeric truthy variant/instance IDs bypassed the callable projection boundary.
- Added string/trim/length checks matching canonical ID contracts, with runtime regression assertions. Files: projection module/test. Commit: `b6916b4`.

## Issues Encountered

No remaining implementation blockers. Whole-ruble applied-budget policy is preserved: the conservative display oracle uses250.005+249.995 RUB against500 RUB. Synthetic provenance and arithmetic fixtures remain test-only. DATA-01/02 and Q-14 source/licensing/catalog gates are not closed, and shared requirements remain contributed rather than marked complete before integrated evidence.

## Next Plan Readiness

Ready for 02-04. Solver consumers import `PlanInputs`, `PlanVariant` and recipe instances from `plan.ts`, call the shared projection, and inspect its budget check after independent eligibility filtering. No new packages or paid services are needed.

## Self-Check: PASSED

All four created files exist. Every listed implementation/TDD commit is an ancestor of HEAD. No tracked deletions, unfinished source stubs or skipped final verification were introduced.
