---
phase: 02-pervyy-dopustimyy-plan-i-rasschitannye-pokupki
plan: "01"
subsystem: domain
tags: [exact-arithmetic, bigint, usda, catalog, offline, tdd]
status: complete
requires:
  - phase: 01
    provides: Stable names-only product IDs, strict TypeScript and unit infrastructure
provides:
  - Exact rational quantities, compatible units, rounding and bounded JSON codec
  - Source-aware food/recipe contracts and pure ingredient evaluation
  - Validated offline USDA ingredient tracer with explicit unknown price and safety
affects: [02-02, 02-03, 02-04, 02-05, 02-06]
tech-stack:
  added: []
  patterns: [normalized BigInt rationals, immutable validated local port, explicit unknown facts]
key-files:
  created:
    - src/domain/quantities.ts
    - src/domain/quantities.test.ts
    - src/domain/catalog.ts
    - src/adapters/catalog.ts
    - src/adapters/catalog.test.ts
    - src/data/foodSources.ts
  modified: []
key-decisions:
  - "Source decimal strings enter normalized BigInt rationals without Number conversion; repeating quantities remain exact fractions."
  - "Generic egg has no piece-to-mass conversion; documented large-egg conversion is tested only for its explicit profile."
  - "The real USDA tracer has unknown price/safety and no recipes; facts-present never asserts generation readiness."
requirements-completed: []
requirements-contributed: [DATA-01, DATA-02, DATA-03, CALC-01, CALC-07]
actuals:
  tokens: 9821
  tasks: 2
  commits: 4
plan_head_before: 811aa22a41ca92d1b64662f9f857c01413d32a60
plan_head_after: 1347a66d34afea62668ed772c6ae7402b84568ba
coverage:
  - id: D1
    description: Real USDA source through validated offline adapter to exact ingredient nutrition, preserving unknown facts
    verification:
      - kind: integration
        ref: "npm run test:unit -- --run src/adapters/catalog.test.ts (10 tests)"
        status: pass
    human_judgment: false
  - id: D2
    description: Exact fractions, compatible quantities, explicit conversions, half-up and bounded JSON round-trip
    verification:
      - kind: unit
        ref: "npm run test:unit -- --run src/domain/quantities.test.ts src/adapters/catalog.test.ts (40 tests)"
        status: pass
    human_judgment: false
duration: 6min
completed: 2026-10-27
---

# Phase 2 Plan 1: Exact quantities and verified ingredient boundary Summary

**USDA 171287 crosses a validated offline catalog boundary and produces exact nutrition while price and safety remain explicitly unknown.**

## Performance

- Duration: approximately 6 minutes from first persisted execution timestamp; initial context loading excluded.
- First persisted execution timestamp: 2026-10-27T18:32:52Z.
- Verification completed: 2026-10-27T18:37:30Z; close-out followed.
- Tasks: 2. Source/test files created: 6.
- Actual tokens: 39,282 realized diff characters / 4, rounded up to 9,821; not harness usage.
- Commit count: measured with the persisted `.git/gsd-plan-head-before-02-01` ledger before documentation commits.

## Accomplishments

- Defined shared source, edible reference, food/profile/state, price, safety, conversion, ingredient, recipe/baseServings and slot contracts. The adapter validates unknown input, bounds snapshot allocation, rejects duplicate IDs and invalid sources/references, and returns detached frozen snapshots.
- Real adapter evaluation returns 143/12.56/9.51/0.72 for 100 g and 214.5/18.84/14.265/1.08 for 150 g, independently asserted in kcal/P/F/C order. Unknown price/safety are incomplete, never zero or suitable by default.
- Added normalized exact arithmetic, comparison/clamping, g/kg and ml/l normalization, profile-scoped evidence-based conversion, draft-only comma parsing, half-up minor-unit rounding and bounded numerator/denominator JSON codec. Repeating decimals display as exact fractions.

## Task Commits

1. Task 02-01-01 RED: `28c7a50` — 10 tests collected and failed on absent real catalog boundary.
2. Task 02-01-01 GREEN: `b1099a4` — source, pure calculation, contracts and adapter; 10/10 passed. Tracer feedback rerun also 10/10 before expansion.
3. Task 02-01-02 RED: `2a9cf82` — 29 arithmetic tests failed on missing exact addition API while the 10 adapter tests passed.
4. Task 02-01-02 GREEN: `1347a66` — arithmetic/conversions/rounding/codec; added a signed-limit regression for 30 quantity tests, 40/40 targeted passed.

## Verification

- `npm run test:unit -- --run src/adapters/catalog.test.ts`: passed, 10 tests; final tracer rerun 319 ms runner duration.
- `npm run test:unit -- --run src/domain/quantities.test.ts src/adapters/catalog.test.ts`: passed, 40 tests; final targeted run 449 ms runner duration.
- `npm run test:unit -- --run`: passed, 174 tests across 6 files, including all 134 existing tests.
- `npm run typecheck`: passed.
- `npm run lint`: passed, exit 0.
- `npm run build`: passed for the existing Safari 15 target. Vite emitted a plugin timing notice, no build failure.
- `git diff --check`: passed; only Git's informational LF/CRLF normalization notices.
- Browser testing is outside this pure-module plan; no UI/browser claims are made. Browser flow acceptance remains in later Phase 2 plans.

## Source Provenance and Limits

Verified the actual cached ZIP bytes and read `food.csv`, `food_nutrient.csv` and `food_portion.csv` directly, not just the proof JSON. Archive: `https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_csv_2018-04.zip`; SHA256 `b80817294b8850530aaedf2e515c02593b1824f763a0ff356e5c2081643e6fd0`. FDC record 171287 is `Egg, whole, raw, fresh`, SR Legacy April 2018, publication date 2019-04-01, CC0-1.0. Nutrient rows: 1597626 (1008/kcal), 1597683 (1003/protein), 1597714 (1004/fat), 1597748 (1005/carbohydrates). Original decimal strings and 100 g edible basis are preserved in `foodSources.ts`.

The real source contains no asserted Russian price or safety certification. `recipes: []` truthfully describes this ingredient-only tracer; `conversions: []` prevents generic egg/piece assumptions. Neither array reaches UI, and neither is an unfinished implementation for this plan. The test-only conversion cites USDA `food_portion:88374`, large egg 50 g, and deliberately rejects generic/other profiles. Full food/price/safety mappings and 50+ recipes remain 02-06; Q-14/DATA-01 and production generation are not closed here. `requirements.ready-ids` returned no ready IDs because all five contributed requirements are shared with unfinished sibling plans.

## Files Created

- `src/domain/quantities.ts`, `src/domain/quantities.test.ts`: canonical exact numeric/quantity API and independent boundary cases.
- `src/domain/catalog.ts`: shared typed contracts and pure `evaluateIngredient`.
- `src/adapters/catalog.ts`, `src/adapters/catalog.test.ts`: bounded immutable validation, local load/lookup/evaluate port and actual-source integration cases.
- `src/data/foodSources.ts`: one traceable real USDA ingredient, explicitly incomplete for generation.

## Deviations from Plan

None — all implementation remains within the six declared files. No packages, runtime network, UI, downloads or paid services were introduced.

## Issues Encountered

TypeScript required a declared `never`-returning validation failure function to preserve unknown-value narrowing; corrected during Task 1 and typechecked. A Task 2 regression caught the maximum signed numerator's codec length excluding its minus sign; corrected the sign allowance and required own codec keys. The failing regression and subsequent 40-test pass were observed before the GREEN commit. No unresolved issue remains in this plan.

## Known Stubs

None. Unknown source facts and the explicitly scoped empty tracer recipe/conversion collections are intentional data states, not simulated completion.

## Next Plan Readiness

02-02 can import `Rational`, `Quantity`, `decimal`, `parseDraftQuantity`, `encodeRational`/`decodeRational` and catalog/recipe contracts. One recipe `baseServings` value is exact; food lookup requires a profile when a product has multiple profiles. Catalog `facts-present` is deliberately not a proof of dietary suitability or generation readiness. The 02-06 source gate remains mandatory.

## Self-Check: PASSED

All six created source/test files and this SUMMARY exist. All four listed commits are ancestors of HEAD. No tracked file deletion occurred. Caller-owned untracked skills/cache files were preserved.
