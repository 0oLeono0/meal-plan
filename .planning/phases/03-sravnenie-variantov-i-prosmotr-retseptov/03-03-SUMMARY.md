---
phase: 03-sravnenie-variantov-i-prosmotr-retseptov
plan: "03"
subsystem: recipes
tags: [react, typescript, rational, pantry, routing, playwright]
requires:
  - phase: "03-02"
    provides: "Guarded immutable saved alternatives and append controller"
provides:
  - "Exact saved variant/instance recipe routing and independent direct recipe view"
  - "Canonical per-instance ingredient stock allocation shared with aggregate purchases"
  - "Explicit nutrition basis, composition and distinct load/stale/incomplete recovery"
affects: ["03-04", "03-10", "03-11", "03-12", shopping]
tech-stack:
  added: []
  patterns: ["Pure tagged recipe read model", "Canonical once-only pantry ledger", "Source-specific retry ownership"]
key-files:
  created: [src/domain/recipeView.ts, src/domain/recipeView.test.ts, src/features/recipe/RecipePage.tsx, e2e/phase03-recipes.spec.ts]
  modified: [src/domain/planProjection.ts, src/domain/planProjection.test.ts, src/adapters/activePlan.ts, src/app/App.tsx, src/features/menu/MenuPage.tsx]
key-decisions:
  - "Recipe context requires the exact active variant/instance/recipe triple; direct routes use catalog base servings without pantry."
  - "Canonical date/slot/source-ingredient allocation feeds both recipe coverage and aggregate purchases."
  - "Reuse only independently validated detached deeply frozen plan/projection outputs without widening cap12 trust or snapshot limits."
requirements-completed: []
requirements-supported: [DATA-04, REC-01, REC-02, REC-04, MENU-03]
actuals:
  tokens: 16819
  tasks: 3
  commits: 6
commits: 6
plan_head_before: 6f091983b50d57a58d737a279723c2fcc2a82f19
plan_head_after: 5acd6c942dd770013518725583d9a60301b24f56
coverage:
  - id: D1
    description: "Saved-instance and direct recipe routes with safe recovery"
    requirement: REC-04
    verification:
      - kind: e2e
        ref: "e2e/phase03-recipes.spec.ts; initial integrated7/8 and corrected focused1/1; fresh resume focused1/1"
        status: pass
    human_judgment: false
  - id: D2
    description: "Exact family ingredients, per-portion four nutrients and conserved stock"
    requirement: REC-02
    verification:
      - kind: unit
        ref: "src/domain/planProjection.test.ts and src/domain/recipeView.test.ts; focused42 and final full461/461"
        status: pass
    human_judgment: false
  - id: D3
    description: "Recipe readability and source/basis clarity"
    verification: []
    human_judgment: true
    rationale: "Human/native-device UAT belongs to end-of-phase acceptance; browser geometry is not human approval."
duration: "1324min observed wall to closeout verification; active unknown"
completed: 2026-11-06
status: complete
---

# Phase 03 Plan 03: Routed recipes and conserved stock Summary

**Recipes resolve the exact saved meal instance, show exact per-portion nutrition and family ingredients, and share one stock ledger with purchases.**

## Performance

- Started: 2026-11-05T12:22:49Z after initial reads; closeout verification: 2026-11-06T10:27Z.
- Observed wall window1324min includes an overnight usage-limit interruption. Active duration is unknown and must not be used as an active-time velocity sample.
- Tasks3/3; realized source/test diff9 files,668 insertions/29 deletions.
- Actual tokens16819 = ceiling(67273 diff characters/4), measured over the bounded base→task HEAD diff. Six task commits measured from the persisted ledger; metadata commits are outside this range.

## Accomplishments

- Real menu Link opens the selected saved occurrence; direct known recipe uses baseServings with no pantry. Unknown, pending, adapter error, stale identity and incomplete facts have distinct states and menu recovery.
- Family scale applies once. Ingredient contributions and headline use the same one-portion basis; exact sums precede rounding and confirmed zero remains distinct from unknown.
- Canonical date/slot/source-ingredient ledger conserves product stock across instances and food profiles; alternatives start independently. Literal need500g−stock200g=purchase300g reconciles with purchases and costs100/40/60 RUB.
- Exact bounded case-sensitive IDs, Unicode256/257, malformed/partial/duplicate queries, actual-period day/view and safe return are tested. Changing active state cannot silently rebind old URLs; late catalog results do not mount a prior route.

## Task Commits

1. 03-03-01: RED `2c489af`; GREEN `5a2d61a` — routed saved/direct recipe and actual menu Link.
2. 03-03-02: RED `7317f18`; GREEN `e2d0496` — canonical allocation, exact ingredient composition, immutable cap12 reuse.
3. 03-03-03: RED `f899d2a`; GREEN `5acd6c9` — encoded identity bounds, actual return period and retry ownership.

## Verification and TDD Gate Compliance

Primary task RED reports passed official `check tdd-red-evidence` (`RED_EVIDENCE_OK`) plus semantic inspection; reports and independent expected literals are documented in `docs/qa/phase03-plan03.md`. Task01 browser RED2/2→GREEN2/2 plus tracer rerun2/2. Task02 RED14pass/2fail→GREEN16, expanded20, domain/adapter/controller107. Task03 unit RED5pass/2fail→focused42; delayed retry browser RED found an actual ownership defect and passed after correction. No retrospective RED is invented on resume; the six existing commits were preserved.

- Final source full unit:461/461 across18 files,10.69s, exit0. Typecheck, lint and Safari15-target production build exit0.
- Integrated Chromium recipes+variants:7/8 passed29.3s. The sole failure hard-requested `/recipe/%QQ`; Vite returned HTTP404 before SPA routing. Test now exercises raw malformed pathname through real client history/popstate. Corrected focused1/1 passed9.2s; fresh resume rerun1/1 passed15.0s (test5.0s), exit0, zero skipped. Other known/unknown hard URLs and invalid-query navigations remain covered. This is not a passing malformed-path hard GET.
- Geometry360/768/1280, keyboard native composition disclosure, route/error heading focus and retry target≥44px were checked. Dedicated isolated Chromium360/1280 screenshots were viewed; no page overflow. No human UAT, physical-device/nativeSafari15 or assistive-technology pass is claimed.
- Existing real Phase2 legacy load, wizard/selection/shopping/reload and cap12 quota/cancel regressions passed. No dependency, source food fact, schema/storage key, generation deadline or trust limit was changed.

## Decisions Made

Recipe model remains pure; React renders one controller snapshot. Raw path is decoded once; Safari15-incompatible URLSearchParams.size is avoided. Retry reloads only the failing plan or catalog source. Requirement IDs remain supported, not completed: mandatory media and full menu presentation depend on later plans and end-of-phase acceptance.

## Deviations from Plan

1. **[Rule2 — Missing integration] Minimal real menu recipe Link.** Required for the actual click tracer; modified `src/features/menu/MenuPage.tsx` in `5a2d61a`. Full card/day/week presentation remains03-10. Authorized by orchestrator.
2. **[Rule3 — Blocking] Avoid repeated deep copies at cap12.** Enlarged derived allocation crossed generic snapshot bounds when copied again. `src/adapters/activePlan.ts` reuses only independently validated detached deeply frozen plan/projection outputs inside a frozen bundle. Full envelope/catalog/safety/time/exclusion/budget checks and final guarded write remain. Caller/derived mutation guards and cap12 regression pass; `e2d0496`. Authorized by orchestrator.
3. **[Rule1 — Bug] Preserve retry pending ownership.** Reloading both sources unmounted RecipePage and lost its pending state. Source-specific recovery fixes actual browser RED; `5acd6c9`.
4. **Test fixture correction.** Malformed hard path never reached the SPA; client routing now tests resolver behavior, preserving explicit server limitation and other hard-navigation cases. No server settings changed; `5acd6c9`.

## Known Stubs and Deferred Issues

| File | Reason / resolution |
|---|---|
| src/features/recipe/RecipePage.tsx:37 | Intentional neutral4:3 photo fallback; real52asset mapping belongs to03-04–03-09. It does not satisfy MENU-03/REC-01 photo scope (WINDOWS22). |

Build main JS503.58kB/gzip142.07kB exceeds Vite500kB warning threshold, nonblocking (WINDOWS21). Historical WindowsWebKit keyboard limitations remain documented separately. No test was skipped or required automated verification omitted. No new network/auth/schema/file-access threat surface beyond the plan's modeled route and stock boundaries was introduced. No authentication gates or user setup required.

## Next Plan Readiness

03-04 can build local media on this recipe view. Full menu layout/focus and phase acceptance remain later work; all phase requirements and manual sign-off stay pending. Limited plant-based catalog nutrition is not a medical or adequacy claim; no photo provenance/license claim was made.

## Self-Check: PASSED

All nine source/test files exist; the six task commits are ancestors of the recorded task HEAD. Bounded ledger range contains six commits and no tracked file deletions. Detailed QA and validation evidence are on disk; subsequent metadata commits record closeout separately.
