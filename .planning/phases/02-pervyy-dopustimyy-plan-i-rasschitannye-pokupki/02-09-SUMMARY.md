---
phase: 02-pervyy-dopustimyy-plan-i-rasschitannye-pokupki
plan: "09"
subsystem: testing
tags: [playwright, accessibility, responsive, regression, keyboard, tdd]
status: complete
requires:
  - phase: 02-08
    provides: Saved canonical menu and calculated shopping with native disclosures
provides:
  - Preserved Phase1 raw input, validation, storage, C1 add/undo and footer regressions through real submit
  - Explicit legacy presence contracts separated from validated production active-plan restoration
  - Seven-width Phase2 geometry, long data, actual Tab order and operation recovery coverage
  - Native disclosure focus clearance above bottom navigation
affects: [02-10, phase-03, phase-07]
tech-stack:
  added: []
  patterns: [test-only-port-injection, native-summary-scroll-margin, sequential-keyboard-geometry]
key-files:
  created: [e2e/phase02-presentation.spec.ts]
  modified: [e2e/products.spec.ts, e2e/accessibility.spec.ts, e2e/presentation.spec.ts, e2e/navigation.spec.ts, e2e/fixtures.ts, e2e/plan-fixtures.ts, src/shared/styles/tokens.css]
key-decisions:
  - "Legacy review expectations become real generation outcomes; raw inputs, first-error focus, storage bytes, undo and measured footer/navigation contracts remain asserted."
  - "Default fixture presence uses the real producer; explicit legacy presence stubs prove only their redirect contract. All operation, loading and synthetic data injection remains in test modules."
  - "Native summary shares existing navigation scroll margins; keyboard proof includes actual Tab/ShiftTab and Space/Enter without programmatic focus or scrolling."
requirements-completed: []
requirements-contributed: [APP-04, WIZ-08, GEN-03, GEN-04, MENU-01, MENU-04, SHOP-01, SHOP-04]
actuals:
  tokens: 12377
  tasks: 3
  commits: 4
plan_head_before: 7238061a14b2c2834b7880728a27f0668c03db86
plan_head_after: 4260172f1a37e5789e120fd50c1479f53702dc40
coverage:
  - id: D1
    description: Phase1 numerical, raw input, focus, C1 and storage guarantees survive real final submission
    verification:
      - kind: e2e
        ref: "Chromium products/accessibility/presentation/navigation: 71/71; unchanged storage/storage-retry: 18/18"
        status: pass
    human_judgment: false
  - id: D2
    description: New populated, covered, pending, error and retry screens fit and remain keyboard reachable
    verification:
      - kind: e2e
        ref: "e2e/phase02-presentation.spec.ts: 26/26 Chromium; seven widths, long data/text200, CSS zoom, short height and sequential Tab"
        status: pass
      - kind: other
        ref: "Independent read-only review: Tab coverage finding resolved and re-reviewed; no blockers"
        status: pass
    human_judgment: false
duration: "17min observed from first baseline run; initial reads not separately timed"
completed: 2026-10-28
---

# Phase 2 Plan 9: Preserved regressions and accessible responsive states Summary

**115 distinct Chromium cases preserve accepted wizard/storage behavior and prove the new menu, shopping and generation states; native disclosures retain visible focus above navigation.**

## Accomplishments

- Kept all 51 products/accessibility/presentation cases and their raw decimal, exact budget, manual provenance, first-error, C1 search/add/undo, enlarged-text and measured footer checks. Only final review semantics changed to actual success or explicit corpus-data refusal. Existing restrictions remain intact when generation refuses them.
- Navigation now has 20 cases, including absent/error/pending/malformed legacy presence, real generated active restoration from root, a malformed full envelope, sentinel retention, history, skip/h1 focus, profile trap/return and 1199/1200 navigation boundary.
- Added 26 Phase2 cases: real 28-slot menu/shopping/reload at 360/390/430/768/1199/1200/1280; long literal names/URLs and large amounts with 200% text; all-covered stock; native details; pending/cancel/error/retry/save failure at each width; CSS zoom 200% at 768/1280, 390x400 footer flow, active load recovery, actual sequential Tab/ShiftTab/Space/Enter.
- Extended synthetic fixtures only in test modules. Real production generation separately proves saved navigation. No new dependency, runtime flag, fabricated production data or overflow hiding was added.

## Task Commits

| Task | Commits | Outcome |
|---|---|---|
| 02-09-01 | `1a02c2d` | Preserve wizard regressions through real generation |
| 02-09-02 | `5b18c5a` | Preserve navigation and injected storage contracts |
| 02-09-03 | `617d06f`, `4260172` | Add responsive/keyboard regressions and correct disclosure focus clearance |

## Verification

| Check | Actual result |
|---|---|
| Task1 targeted Chromium group | 51/51, 1.9min |
| Post-commit tracer plus navigation | 71/71, 119.726890s; `.tmp/02-09-tracer-navigation-green.xml` |
| Phase2 matrix plus unchanged storage guards | 44/44, 117.946298s; 26 new +18 storage; `.tmp/02-09-presentation-storage-green.xml` |
| Standalone unit suite | 325/325, 16 files, 6.85s; no concurrent browser run |
| TypeScript / ESLint / production build | All exit0; build target safari15 |
| Independent review | No remaining blockers; actual sequential keyboard coverage re-reviewed after addition |
| Git safety | Protected-branch checks before commits, individual file staging, no deletions; pre-existing untracked skills/cache preserved |

Commands: `npm run test:e2e -- e2e/products.spec.ts e2e/accessibility.spec.ts e2e/presentation.spec.ts --project=chromium`; tracer rerun additionally included `e2e/navigation.spec.ts`. Final new-state command included `e2e/phase02-presentation.spec.ts e2e/storage.spec.ts e2e/storage-retry.spec.ts --project=chromium`. Quality commands: `npm run test:unit -- --run`, `npm run typecheck`, `npm run lint`, `npm run build`.

Broad groups honestly exceeded60s. Substantive named scenario groups remain separately selectable in the specs: real28-slot navigation (7), long/text200 (7), operation recovery (7), CSS zoom/short height (2), active loading (1), saved-screen sequential keyboard (1), generation sequential keyboard (1). Nothing was skipped. The combined keyboard case actually reached20.6s and was partitioned into two complete scenarios, retaining the standard20s timeout; final timings9.0s and13.4s. No performance budget was increased.

Screenshots `.tmp/phase02-qa/chromium-{width}-menu.png`, `-shopping.png`, `-long-text200.png` were produced by the tests. Agent visually compared the360px menu/shopping results with PDF key-screen renders pages2/4: inherited light canvas, rounded white groups, green emphasis and budget hierarchy remain. Future phase controls shown in the PDF remain outside this scope. Geometry includes first/last slots and last disclosed content, without hiding overflow.

## TDD Gate Compliance

- Task1 baseline actually failed because it referenced the removed review button; test-only adaptation retained all input/validation checks. Task2 is also test-only. These did not add production behavior.
- Task3 RED: `phase02 360px real 28 slots menu shopping return and exact navigation boundary` executed and failed on geometry: focused disclosure bottom746.546875px versus navigation top718px. Original JUnit and semantic assessment are preserved in `.tmp/02-09-matrix-red.xml` and `.tmp/02-09-summary-focus-red.json`; GSD classifier returned `RED_EVIDENCE_OK`.
- GREEN: add `summary` to the two existing scroll-margin selectors, inheriting mobile navigation reserve and desktop spacing. Six focused cases passed23.6s, then all26 final cases passed.
- Test refinements waited for observable native keyboard scroll completion and respected navigation's existing DOM position. Review added genuine sequential key traversal; helpers never force focus or scrolling in those two tests. No additional production refactor was needed.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Native disclosures could receive focus beneath bottom navigation.**
- Found during task3's actual360px geometry case; `summary` was absent from inherited focus scroll margins.
- Fixed only the existing token selectors; all previous footer/nav reserves remain unchanged.
- Files: `src/shared/styles/tokens.css`; regression in `e2e/phase02-presentation.spec.ts`. Commit: `4260172`.

**2. [Rule 3 - Blocking] Reusable fixture readiness incorrectly assumed restored wizard step1.**
- Repeated test mounts restored step4, so waiting for its absent people field blocked operation scenarios.
- The fixture now waits for the real wizard progressbar, independent of saved step. No storage scenario or production load behavior was changed. Commit: `5b18c5a`.

**3. [Rule 2 - Missing verification] Expand the existing synthetic fixture named in the task action.**
- `files_modified` omitted `e2e/plan-fixtures.ts`, although task3 explicitly requires its use. Its former long mode covered only product names.
- Extended test-only recipe/source strings, amounts and optional day count; preserved original numerical defaults and independent literal expectations. Commit: `617d06f`.

## Remaining Scope

No known blocking regression, unfinished stub, skipped test or unrun required Chromium verification remains for02-09. `e2e/storage.spec.ts` and `e2e/storage-retry.spec.ts` are byte-for-byte unchanged from the starting commit and pass18/18. Shared requirement IDs stay open until02-10's phase-wide acceptance. Full Firefox/WebKit regression belongs to02-10; these Chromium emulations, CSS zoom and screenshots do not prove physical mobile keyboards, real safe-area hardware or historical Safari15.

## Self-Check: PASSED

All8 changed files exist. All4 task commits are ancestors of HEAD. The measured ledger window contains4 commits, and `plan_head_after` names its final task commit. No tracked file was deleted; unrelated pre-existing untracked content remains untouched.
