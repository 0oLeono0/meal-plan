---
phase: 02-pervyy-dopustimyy-plan-i-rasschitannye-pokupki
plan: "08"
subsystem: ui
tags: [react, shopping, nutrition, provenance, pantry, playwright, tdd]
status: complete
requires:
  - phase: 02-07
    provides: Guarded saved active menu and source-gated real generation
provides:
  - Shared canonical budget and source disclosure on menu and shopping
  - Missing purchases grouped by category with dated recipe-instance contributions
  - Separate capped stock coverage and explicit unknown or incompatible stock reasons
  - Independent literal browser fixtures separated from actual catalog acceptance
affects: [02-09, 02-10, phase-03, phase-05, phase-06]
tech-stack:
  added: []
  patterns: [shared-plan-summary, readonly-active-projection, test-only-encoded-envelopes, native-details]
key-files:
  created: [src/features/plan/PlanSummary.tsx, src/features/shopping/ShoppingPage.tsx, e2e/plan-fixtures.ts, e2e/menu.spec.ts, e2e/shopping.spec.ts]
  modified: [src/features/menu/MenuPage.tsx, src/app/App.tsx]
key-decisions:
  - "Menu and shopping render one saved active projection and shared PlanSummary; draft changes never enter these totals."
  - "Source scope remains literal; web-price caveat appears only when a used row has a web scope. Synthetic envelopes remain test-only."
  - "Unknown categories use a Map-backed fallback to Other, preserving rows even for inherited-property names."
requirements-completed: []
requirements-contributed: [CALC-03, CALC-04, CALC-05, CALC-06, CALC-07, MENU-01, MENU-04, SHOP-01, SHOP-04]
actuals:
  tokens: 10189
  tasks: 2
  commits: 6
plan_head_before: c7d27fd4d3ca89b79e37ab3fe27ca32be188eca8
plan_head_after: c4535d79a8f6660e95108c137477faade163719d
coverage:
  - id: D1
    description: Saved dated menu exposes person and family nutrition, exact target boundaries and canonical budget provenance
    verification:
      - kind: e2e
        ref: "e2e/menu.spec.ts: 5/5 Chromium, including real catalog and independent synthetic values"
        status: pass
    human_judgment: false
  - id: D2
    description: Shopping preserves active totals and displays missing amounts, instance sources and capped stock coverage
    verification:
      - kind: e2e
        ref: "e2e/shopping.spec.ts: 16/16 Chromium; real offline navigation and reload, 0/1/many rows, partial/unknown/incompatible/overstock"
        status: pass
      - kind: other
        ref: "Independent read-only review; inherited-category finding reproduced and confirmed fixed"
        status: pass
    human_judgment: false
  - id: D3
    description: Actual generated purchases remain readable at 360px with source and covered-stock disclosures
    verification:
      - kind: automated_ui
        ref: ".tmp/02-08-shopping-360-top.png, -sources.png, -covered.png; isolated Playwright Chromium; scrollWidth360=innerWidth360"
        status: pass
    human_judgment: true
    rationale: "Agent inspected three screenshots; full responsive and three-browser acceptance remains02-09/02-10."
duration: "10min observed from first RED commit; initial reads not separately timed"
completed: 2026-10-28
---

# Phase 2 Plan 8: Canonical menu and calculated purchases Summary

**Menu and shopping now share the saved plan's three reconciled costs, price provenance and quantitative pantry coverage, with sources retained for every dated meal instance.**

## Accomplishments

- Extracted PlanSummary: ingredient/covered/purchase totals, family-period purchase limit and remainder, textual budget percentage, actual regions and observation dates, and native source/record/reference disclosure. Source strings and URLs render as escaped text without external requests. Web context is never relabelled as a verified local price.
- Preserved dated four-slot menu, portion nutrition/cost, family portions, person-day averages and labelled family totals. Optional target stays absent or uses shared exact comparisons; exactly110% does not warn,1100.01 versus1000 does despite the rounded1100 display, and zero targets never divide by zero.
- Connected real menu→shopping→menu routes to the same active ID. Shopping shows nonzero missing rows in six ordered categories, each dated slot/recipe/quantity contribution, a separate initially collapsed stock block, and truthful all-covered/unknown/incompatible/load/error/corrupt recovery states. Stock is projected once across the whole period; no physical deduction or purchased status is claimed.
- Added test-only valid encoded synthetic envelopes with literal expectations independent of production selectors. Four125g family instances need500g;200g stock covers20RUB and leaves300g/30RUB purchases from50RUB ingredients. One/two/four instances, duplicate names with distinct IDs, six categories, overstock and long text are exercised. Real source-gated catalog paths remain separate.

## Task Commits

1. `60cc7f8` — Task1 RED: menu costs, nutrition and provenance.
2. `dbed85c` — Task1 GREEN: shared canonical summary and sources.
3. `2db288f` — Task2 RED: purchases, coverage, instance sources and load states.
4. `850f4c6` — Task2 GREEN: real shopping route and read-only list.
5. `69acedf` — Review regression RED: inherited category names retain purchases.
6. `c4535d7` — Review regression GREEN: Map-backed category fallback.

Measured6 production/test commits from the persisted ledger, excluding subsequent metadata. Tokens are ceil(40753 realized seven-file Git diff characters/4), matching the estimate scale. Observed first-RED→final-production window17:03:28–17:13:07UTC; initial context reads were not separately timed.

## Verification

- Final owning command `npm run test:e2e -- e2e/menu.spec.ts e2e/shopping.spec.ts --project=chromium`: **21/21**,25.9s (menu5, shopping16). Real menu→shopping→menu works offline after page load; reload of the local Vite application uses localhost again and preserves identical storage, active ID and three displayed totals. This does not claim service-worker offline boot.
- Standalone `npm run test:unit -- --run`: **325/325**,16files,7.05s. An earlier run concurrent with browser tests hit the existing60-recipe benchmark's5s timeout (324passed); isolated rerun passed without changing that test or domain code.
- Final typecheck/lint/build: exit0;136modules,651ms build. No package or registry install. No full release matrix run in this plan.
- Task1 tracer re-verification passed5/5 before task2 expansion. Independent read-only review found0blocking issues and one inherited-property category risk; three actual browser regressions reproduced it, the Map fix passed, and the reviewer confirmed it closed.
- Playwright MCP could not start its occupied profile (`Browser is already in use`). No browser/profile/process was killed. Fallback used a separate Chromium context for real quick-start→saved menu→shopping at360×800:8purchase rows, activeID generated-1, document scrollWidth360=viewport360. Three screenshots were inspected with view_image: budget, expanded dated contributions and covered-stock disclosure. Full responsive/historical Safari acceptance remains future verification.

## TDD Gate Compliance

- Menu RED: actual5-test Chromium run had2 planned assertion failures and3 existing target-boundary passes; missing textual budget percentage was the named target failure. Unchanged JUnit evidence `.tmp/02-08-menu-red.json` returned `RED_EVIDENCE_OK` before production changes.
- Shopping RED:10 actual tests failed while the saved active menu's shopping route still showed its old empty state. Named real offline navigation assertion failed on expected heading, not fixture setup. `.tmp/02-08-shopping-red.json` returned `RED_EVIDENCE_OK` before implementation.
- Review RED: all3 inherited category tests failed with missing rows after valid saved-plan load; `.tmp/02-08-review-red.json` returned `RED_EVIDENCE_OK`, followed by dedicated RED and fix commits.
- Test-development corrections: initial Node-side domain imports could not load JSON modules; fixture construction moved into browser-evaluated imports before valid RED evidence. The real catalog's randomized selection need not include web-priced products, so the test checks actual used source scope; synthetic scope cases assert the caveat directly. A grammar-specific development run overlapped an HMR edit and is not counted as RED evidence; the final clean owning run exercises all cases.

## Deviations from Plan

No architectural or file-scope expansion. Correctness fixes within task2:

- **[Rule1 - Bug]** The App hydration gate hid ShoppingPage's pending copy behind a generic settings status. A route-aware InitialLoadStatus now exposes the specified loading copy; the injected-port browser test covers pending→error→retry.
- **[Rule1 - Bug]** Object category lookup could resolve inherited properties and hide otherwise valid purchases. Replaced it with Map lookup; three browser regressions and independent follow-up review confirm the fix.

## Limits and Next Step

- No new blocking stub, skipped owning test, unrun automated verify, auth gate or additional threat surface remains. No later-phase checkboxes, edit controls, recipe links, filters or PDF actions were added. Existing untracked user skills/cache files remain untouched.
- Catalog acceptance remains02-06's limited12-profile/52-recipe plant-based corpus. Presentation fixtures do not prove source completeness, dietary adequacy or medical appropriateness; the explicit limitation copy remains visible.
- `requirements.ready-ids` with the nine contributed IDs returned ready[]: incomplete02-09/02-10 sibling plans still share them, so none are prematurely marked complete. Next02-09 preserves Phase1 regressions and checks new-screen accessibility/responsiveness;02-10 owns final release verification.

## Self-Check: PASSED

All five created artifacts exist; all six recorded task/test/fix commits are ancestors of HEAD. Ledger measurement is6commits across the planned seven source/test files; no unexpected tracked-file deletion.
