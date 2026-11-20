---
schema_version: 1
open_count: 8
waived_count: 0
fixed_count: 22
total_count: 30
last_updated: 2026-11-17T09:55:22.264Z
---

# Broken Windows Ledger

> Cross-phase defect register. With `workflow.windows_enforce` enabled, `/gsd-ship` blocks while `open_count > 0`.
> Waive with `gsd-tools windows waive <id> "<reason>"` (reason required).
> Mark fixed with `gsd-tools windows fixed <id>`.

| id | phase | kind | file | line | description | status | reason | recorded_at | resolved_at |
|----|-------|------|------|------|-------------|--------|--------|-------------|-------------|
| 1 | 01 | lint-warning | package.json |  | Vite build succeeds but upstream react-router use-client directive produces MODULE_LEVEL_DIRECTIVE warning in client SPA | open |  | 2026-10-26T16:04:55.085Z |  |
| 2 | 01 | stub | src/features/wizard/Wizard.tsx |  | Steps 2-4 expose intentional navigation slots; budget controls belong to 01-05 and product/restriction controls to 01-06 | fixed |  | 2026-10-26T16:47:42.892Z | 2026-10-26T17:33:50.510Z |
| 3 | 01 | deviation | src/domain/nutritionTarget.test.ts |  | Task 2 GREEN was briefly applied before malformed TAP rejection was inspected; own settings change reverted, actual TAP-flat RED validated, then GREEN restored | fixed |  | 2026-10-26T16:47:43.528Z | 2026-10-26T16:48:52.249Z |
| 4 | 01 | unrun-verify | docs/qa/phase01.md |  | Phase 1: real iOS keyboard and safe-area acceptance remains unverified | fixed |  | 2026-10-27T08:18:57.861Z | 2026-10-27T14:01:34.367Z |
| 5 | 01 | unrun-verify | docs/qa/phase01.md |  | Phase 1: historical Safari 15 acceptance remains unverified | fixed |  | 2026-10-27T08:18:58.757Z | 2026-10-27T14:01:35.072Z |
| 6 | 01 | unrun-verify | docs/qa/phase01.md |  | Phase 1: screen reader and full contrast review remain unverified | fixed |  | 2026-10-27T08:18:59.612Z | 2026-10-27T14:01:35.685Z |
| 7 | 01 | unrun-verify | docs/qa/phase01.md |  | Phase 1: native browser zoom and final visual approval remain unverified | fixed |  | 2026-10-27T08:19:00.379Z | 2026-10-27T14:01:36.288Z |
| 8 | 01 | unrun-verify | docs/qa/phase01.md |  | Phase 1: Q-17 LCP methodology and measurement remain pending | fixed |  | 2026-10-27T08:19:01.309Z | 2026-10-27T14:01:36.868Z |
| 9 | 01 | unrun-verify | docs/qa/phase01.md |  | Phase 1: two-tab UX and flagged safety judgment backstops remain human_needed | fixed |  | 2026-10-27T08:19:02.252Z | 2026-10-27T14:01:37.462Z |
| 10 | 02 | deviation | src/domain/generatePlan.ts |  | Closed during 02-04: pantry budget bound now follows nutrition basis; regression and independent re-review passed. | fixed |  | 2026-10-28T08:37:26.371Z | 2026-10-28T08:38:21.271Z |
| 11 | 02 | deviation | src/features/generation/controller.ts |  | Resolved in7461e7d: overlapping generation start abandoned load bookkeeping; revision now advances only on active installation. | fixed |  | 2026-10-28T08:53:08.359Z | 2026-10-28T08:53:53.182Z |
| 12 | 02 | deviation | src/adapters/generation.test.ts |  | Resolved in614e4b6: combined sequential benchmark exceeded default5s; separate bounded domain and yielding adapter measurements preserve all assertions and product30s deadline. | fixed |  | 2026-10-28T17:47:09.921Z | 2026-10-28T17:48:14.030Z |
| 13 | 02 | deviation | e2e/budget.spec.ts |  | Resolved: legacy static createDraft import loaded source JSON through Node ESM during browser collection; browser dynamic import preserves exact unknown-field recovery assertions. | fixed |  | 2026-10-28T17:47:10.714Z | 2026-10-28T17:48:14.927Z |
| 14 | 02 | unrun-verify | docs/qa/phase02.md |  | Phase2 end-of-phase human observations for new menu/shopping/recovery and physical-device/Safari15/screen-reader/native-zoom/LCP evidence remain pending; Phase1 UAT does not certify new screens. | open |  | 2026-10-28T17:49:05.698Z |  |
| 15 | 02 | unmet-truth | e2e/phase02-presentation.spec.ts | 222 | Windows WebKit native Tab and Alt+Tab omit semantic navigation links; saved-screen sequential keyboard case remains failed/unverified. Actual Chromium and Firefox sequence passes; supported native Safari/environment verification is pending. | open |  | 2026-10-29T16:28:42.422Z |  |
| 16 | 02 | unmet-truth | e2e/phase02-presentation.spec.ts | 263 | Windows WebKit native Tab and Alt+Tab omit the current-menu anchor during generation recovery; required sequential keyboard case remains failed/unverified. No fake focus, skipped test or system preference workaround is applied. | open |  | 2026-10-29T16:28:43.085Z |  |
| 17 | 02 | deviation | e2e/phase02-presentation.spec.ts |  | Resolved test-only Firefox focus/subpixel/DOM/async harness mismatches and native WebKit End geometry without CSS, timeout, dependency or production changes; the two native WebKit linkTab gates remain separate open entries15/16. | fixed |  | 2026-10-29T16:29:51.775Z | 2026-10-29T16:30:14.130Z |
| 18 | 03 | deviation | src/features/generation/controller.ts |  | Plan03-01 reload of a selection base left saving state and count published before save acknowledgement; regression tests and fix0f3b8ef resolve both | fixed |  | 2026-11-05T11:44:51.062Z | 2026-11-05T11:44:58.489Z |
| 19 | 03 | deviation | src/features/generation/controller.ts |  | Resolved cap12 old-plus-candidate snapshot duplication without increasing trust limits; source-backed quota/cancel regression passes | fixed |  | 2026-11-05T12:15:44.824Z | 2026-11-05T12:16:17.896Z |
| 20 | 03 | deviation | src/features/generation/controller.ts |  | Resolved delayed timer deadline bypass, repeated identical pending start and null selection options; actual RED5 failures and GREEN75 focused tests | fixed |  | 2026-11-05T12:16:18.657Z | 2026-11-05T12:16:19.481Z |
| 21 | 03 | lint-warning | src/app/App.tsx |  | Production build passes; primary chunk503.58kB exceeds Vite500kB warning threshold (gzip142.07kB); code splitting not required for plan03-03 | open |  | 2026-11-05T12:45:27.695Z |  |
| 22 | 03 | stub | src/features/recipe/RecipePage.tsx |  | Intentional neutral recipe photo fallback; real52asset map belongs to dependent plans03-04 through03-09 and does not close MENU03 or REC01 photo scope | fixed |  | 2026-11-05T12:45:28.268Z | 2026-11-07T10:49:39.087Z |
| 23 | 03 | unmet-truth | src/app/App.tsx | 226 | Pending generation cancellation does not restore generate-menu focus at360px on baseline50b2a30; retained failing test; repair and verify in03-11 recovery/a11y | fixed |  | 2026-11-07T10:08:59.058Z | 2026-11-08T06:36:10.154Z |
| 24 | 03 | unmet-truth | e2e/phase03-presentation.spec.ts |  | Windows WebKit EC-20 sequential Tab omits shopping anchor; assertion retained and failed08Nov; native Safari15 and AT remain unverified, related WINDOWS15/16 | open |  | 2026-11-08T06:44:04.010Z |  |
| 25 | 03 | unmet-truth | e2e/phase03-recipes.spec.ts |  | Windows WebKit real Tab recipe path omits exact meal-card anchor; retained assertion failed08Nov before recipe entry; native Safari15 keyboard and AT remain unverified, related WINDOWS15/16 | open |  | 2026-11-08T06:46:35.389Z |  |
| 26 | 03 | unrun-verify | docs/qa/phase03-accessibility.md |  | Phase03 native Safari15/device/AT, real safe-area and browser200percent zoom human checks remain unverified; automated text enlargement and Windows WebKit are not substitutes | open |  | 2026-11-08T06:46:58.550Z |  |
| 27 | 03.1 | deviation | src/domain/generatePlan.test.ts |  | Versioned regression fixtures preserve issued56 exact goldens and validate current68 diversity; resolved in plan02 | fixed |  | 2026-11-12T12:46:31.899Z | 2026-11-12T12:47:12.952Z |
| 28 | 03.1 | deviation | src/features/shopping/ShoppingPage.tsx | 13 | Lunch release adds store category aliases for meat poultry and dry pasta; independent browser category assertions verified after meaningful RED | fixed |  | 2026-11-13T08:19:23.077Z | 2026-11-13T08:19:32.994Z |
| 29 | 03.1 | deviation | src/features/shopping/ShoppingPage.tsx | 15 | Final dinner purchases require the legumes source category alias; browser RED reproduced fallback Other before the grocery category fix | fixed |  | 2026-11-13T08:38:35.756Z | 2026-11-13T08:39:22.474Z |
| 30 | 03.1 | deviation | e2e/catalog-media-expansion.spec.ts |  | Required media-batch-02/03/full-media groups absent at start of07; added and verified with real82hero decode. | fixed |  | 2026-11-17T09:54:53.654Z | 2026-11-17T09:55:22.264Z |

````json
[
  {
    "id": 1,
    "kind": "lint-warning",
    "phase": "01",
    "file": "package.json",
    "line": null,
    "description": "Vite build succeeds but upstream react-router use-client directive produces MODULE_LEVEL_DIRECTIVE warning in client SPA",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-10-26T16:04:55.085Z",
    "resolved_at": null,
    "milestone": "v1.0"
  },
  {
    "id": 2,
    "kind": "stub",
    "phase": "01",
    "file": "src/features/wizard/Wizard.tsx",
    "line": null,
    "description": "Steps 2-4 expose intentional navigation slots; budget controls belong to 01-05 and product/restriction controls to 01-06",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-10-26T16:47:42.892Z",
    "resolved_at": "2026-10-26T17:33:50.510Z",
    "milestone": "v1.0"
  },
  {
    "id": 3,
    "kind": "deviation",
    "phase": "01",
    "file": "src/domain/nutritionTarget.test.ts",
    "line": null,
    "description": "Task 2 GREEN was briefly applied before malformed TAP rejection was inspected; own settings change reverted, actual TAP-flat RED validated, then GREEN restored",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-10-26T16:47:43.528Z",
    "resolved_at": "2026-10-26T16:48:52.249Z",
    "milestone": "v1.0"
  },
  {
    "id": 4,
    "kind": "unrun-verify",
    "phase": "01",
    "file": "docs/qa/phase01.md",
    "line": null,
    "description": "Phase 1: real iOS keyboard and safe-area acceptance remains unverified",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-10-27T08:18:57.861Z",
    "resolved_at": "2026-10-27T14:01:34.367Z",
    "milestone": "v1.0"
  },
  {
    "id": 5,
    "kind": "unrun-verify",
    "phase": "01",
    "file": "docs/qa/phase01.md",
    "line": null,
    "description": "Phase 1: historical Safari 15 acceptance remains unverified",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-10-27T08:18:58.757Z",
    "resolved_at": "2026-10-27T14:01:35.072Z",
    "milestone": "v1.0"
  },
  {
    "id": 6,
    "kind": "unrun-verify",
    "phase": "01",
    "file": "docs/qa/phase01.md",
    "line": null,
    "description": "Phase 1: screen reader and full contrast review remain unverified",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-10-27T08:18:59.612Z",
    "resolved_at": "2026-10-27T14:01:35.685Z",
    "milestone": "v1.0"
  },
  {
    "id": 7,
    "kind": "unrun-verify",
    "phase": "01",
    "file": "docs/qa/phase01.md",
    "line": null,
    "description": "Phase 1: native browser zoom and final visual approval remain unverified",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-10-27T08:19:00.379Z",
    "resolved_at": "2026-10-27T14:01:36.288Z",
    "milestone": "v1.0"
  },
  {
    "id": 8,
    "kind": "unrun-verify",
    "phase": "01",
    "file": "docs/qa/phase01.md",
    "line": null,
    "description": "Phase 1: Q-17 LCP methodology and measurement remain pending",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-10-27T08:19:01.309Z",
    "resolved_at": "2026-10-27T14:01:36.868Z",
    "milestone": "v1.0"
  },
  {
    "id": 9,
    "kind": "unrun-verify",
    "phase": "01",
    "file": "docs/qa/phase01.md",
    "line": null,
    "description": "Phase 1: two-tab UX and flagged safety judgment backstops remain human_needed",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-10-27T08:19:02.252Z",
    "resolved_at": "2026-10-27T14:01:37.462Z",
    "milestone": "v1.0"
  },
  {
    "id": 10,
    "kind": "deviation",
    "phase": "02",
    "file": "src/domain/generatePlan.ts",
    "line": null,
    "description": "Closed during 02-04: pantry budget bound now follows nutrition basis; regression and independent re-review passed.",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-10-28T08:37:26.371Z",
    "resolved_at": "2026-10-28T08:38:21.271Z",
    "milestone": "v1.0"
  },
  {
    "id": 11,
    "kind": "deviation",
    "phase": "02",
    "file": "src/features/generation/controller.ts",
    "line": null,
    "description": "Resolved in7461e7d: overlapping generation start abandoned load bookkeeping; revision now advances only on active installation.",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-10-28T08:53:08.359Z",
    "resolved_at": "2026-10-28T08:53:53.182Z",
    "milestone": "v1.0"
  },
  {
    "id": 12,
    "kind": "deviation",
    "phase": "02",
    "file": "src/adapters/generation.test.ts",
    "line": null,
    "description": "Resolved in614e4b6: combined sequential benchmark exceeded default5s; separate bounded domain and yielding adapter measurements preserve all assertions and product30s deadline.",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-10-28T17:47:09.921Z",
    "resolved_at": "2026-10-28T17:48:14.030Z",
    "milestone": "v1.0"
  },
  {
    "id": 13,
    "kind": "deviation",
    "phase": "02",
    "file": "e2e/budget.spec.ts",
    "line": null,
    "description": "Resolved: legacy static createDraft import loaded source JSON through Node ESM during browser collection; browser dynamic import preserves exact unknown-field recovery assertions.",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-10-28T17:47:10.714Z",
    "resolved_at": "2026-10-28T17:48:14.927Z",
    "milestone": "v1.0"
  },
  {
    "id": 14,
    "kind": "unrun-verify",
    "phase": "02",
    "file": "docs/qa/phase02.md",
    "line": null,
    "description": "Phase2 end-of-phase human observations for new menu/shopping/recovery and physical-device/Safari15/screen-reader/native-zoom/LCP evidence remain pending; Phase1 UAT does not certify new screens.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-10-28T17:49:05.698Z",
    "resolved_at": null,
    "milestone": "v1.0"
  },
  {
    "id": 15,
    "kind": "unmet-truth",
    "phase": "02",
    "file": "e2e/phase02-presentation.spec.ts",
    "line": 222,
    "description": "Windows WebKit native Tab and Alt+Tab omit semantic navigation links; saved-screen sequential keyboard case remains failed/unverified. Actual Chromium and Firefox sequence passes; supported native Safari/environment verification is pending.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-10-29T16:28:42.422Z",
    "resolved_at": null,
    "milestone": "v1.0"
  },
  {
    "id": 16,
    "kind": "unmet-truth",
    "phase": "02",
    "file": "e2e/phase02-presentation.spec.ts",
    "line": 263,
    "description": "Windows WebKit native Tab and Alt+Tab omit the current-menu anchor during generation recovery; required sequential keyboard case remains failed/unverified. No fake focus, skipped test or system preference workaround is applied.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-10-29T16:28:43.085Z",
    "resolved_at": null,
    "milestone": "v1.0"
  },
  {
    "id": 17,
    "kind": "deviation",
    "phase": "02",
    "file": "e2e/phase02-presentation.spec.ts",
    "line": null,
    "description": "Resolved test-only Firefox focus/subpixel/DOM/async harness mismatches and native WebKit End geometry without CSS, timeout, dependency or production changes; the two native WebKit linkTab gates remain separate open entries15/16.",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-10-29T16:29:51.775Z",
    "resolved_at": "2026-10-29T16:30:14.130Z",
    "milestone": "v1.0"
  },
  {
    "id": 18,
    "kind": "deviation",
    "phase": "03",
    "file": "src/features/generation/controller.ts",
    "line": null,
    "description": "Plan03-01 reload of a selection base left saving state and count published before save acknowledgement; regression tests and fix0f3b8ef resolve both",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-11-05T11:44:51.062Z",
    "resolved_at": "2026-11-05T11:44:58.489Z",
    "milestone": "v1.0"
  },
  {
    "id": 19,
    "kind": "deviation",
    "phase": "03",
    "file": "src/features/generation/controller.ts",
    "line": null,
    "description": "Resolved cap12 old-plus-candidate snapshot duplication without increasing trust limits; source-backed quota/cancel regression passes",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-11-05T12:15:44.824Z",
    "resolved_at": "2026-11-05T12:16:17.896Z",
    "milestone": "v1.0"
  },
  {
    "id": 20,
    "kind": "deviation",
    "phase": "03",
    "file": "src/features/generation/controller.ts",
    "line": null,
    "description": "Resolved delayed timer deadline bypass, repeated identical pending start and null selection options; actual RED5 failures and GREEN75 focused tests",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-11-05T12:16:18.657Z",
    "resolved_at": "2026-11-05T12:16:19.481Z",
    "milestone": "v1.0"
  },
  {
    "id": 21,
    "kind": "lint-warning",
    "phase": "03",
    "file": "src/app/App.tsx",
    "line": null,
    "description": "Production build passes; primary chunk503.58kB exceeds Vite500kB warning threshold (gzip142.07kB); code splitting not required for plan03-03",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-11-05T12:45:27.695Z",
    "resolved_at": null,
    "milestone": "v1.0"
  },
  {
    "id": 22,
    "kind": "stub",
    "phase": "03",
    "file": "src/features/recipe/RecipePage.tsx",
    "line": null,
    "description": "Intentional neutral recipe photo fallback; real52asset map belongs to dependent plans03-04 through03-09 and does not close MENU03 or REC01 photo scope",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-11-05T12:45:28.268Z",
    "resolved_at": "2026-11-07T10:49:39.087Z",
    "milestone": "v1.0"
  },
  {
    "id": 23,
    "kind": "unmet-truth",
    "phase": "03",
    "file": "src/app/App.tsx",
    "line": 226,
    "description": "Pending generation cancellation does not restore generate-menu focus at360px on baseline50b2a30; retained failing test; repair and verify in03-11 recovery/a11y",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-11-07T10:08:59.058Z",
    "resolved_at": "2026-11-08T06:36:10.154Z",
    "milestone": "v1.0"
  },
  {
    "id": 24,
    "kind": "unmet-truth",
    "phase": "03",
    "file": "e2e/phase03-presentation.spec.ts",
    "line": null,
    "description": "Windows WebKit EC-20 sequential Tab omits shopping anchor; assertion retained and failed08Nov; native Safari15 and AT remain unverified, related WINDOWS15/16",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-11-08T06:44:04.010Z",
    "resolved_at": null,
    "milestone": "v1.0"
  },
  {
    "id": 25,
    "kind": "unmet-truth",
    "phase": "03",
    "file": "e2e/phase03-recipes.spec.ts",
    "line": null,
    "description": "Windows WebKit real Tab recipe path omits exact meal-card anchor; retained assertion failed08Nov before recipe entry; native Safari15 keyboard and AT remain unverified, related WINDOWS15/16",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-11-08T06:46:35.389Z",
    "resolved_at": null,
    "milestone": "v1.0"
  },
  {
    "id": 26,
    "kind": "unrun-verify",
    "phase": "03",
    "file": "docs/qa/phase03-accessibility.md",
    "line": null,
    "description": "Phase03 native Safari15/device/AT, real safe-area and browser200percent zoom human checks remain unverified; automated text enlargement and Windows WebKit are not substitutes",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-11-08T06:46:58.550Z",
    "resolved_at": null,
    "milestone": "v1.0"
  },
  {
    "id": 27,
    "kind": "deviation",
    "phase": "03.1",
    "file": "src/domain/generatePlan.test.ts",
    "line": null,
    "description": "Versioned regression fixtures preserve issued56 exact goldens and validate current68 diversity; resolved in plan02",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-11-12T12:46:31.899Z",
    "resolved_at": "2026-11-12T12:47:12.952Z",
    "milestone": "v1.0"
  },
  {
    "id": 28,
    "kind": "deviation",
    "phase": "03.1",
    "file": "src/features/shopping/ShoppingPage.tsx",
    "line": 13,
    "description": "Lunch release adds store category aliases for meat poultry and dry pasta; independent browser category assertions verified after meaningful RED",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-11-13T08:19:23.077Z",
    "resolved_at": "2026-11-13T08:19:32.994Z",
    "milestone": "v1.0"
  },
  {
    "id": 29,
    "kind": "deviation",
    "phase": "03.1",
    "file": "src/features/shopping/ShoppingPage.tsx",
    "line": 15,
    "description": "Final dinner purchases require the legumes source category alias; browser RED reproduced fallback Other before the grocery category fix",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-11-13T08:38:35.756Z",
    "resolved_at": "2026-11-13T08:39:22.474Z",
    "milestone": "v1.0"
  },
  {
    "id": 30,
    "kind": "deviation",
    "phase": "03.1",
    "file": "e2e/catalog-media-expansion.spec.ts",
    "line": null,
    "description": "Required media-batch-02/03/full-media groups absent at start of07; added and verified with real82hero decode.",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-11-17T09:54:53.654Z",
    "resolved_at": "2026-11-17T09:55:22.264Z",
    "milestone": "v1.0"
  }
]
````
