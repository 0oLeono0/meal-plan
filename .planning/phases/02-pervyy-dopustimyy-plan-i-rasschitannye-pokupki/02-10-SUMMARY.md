---
phase: 02-pervyy-dopustimyy-plan-i-rasschitannye-pokupki
plan: "10"
subsystem: testing
tags: [playwright, vitest, storage, races, source-evidence, accessibility]
status: halted
requires:
  - phase: 02-09
    provides: Source-backed saved screens and preserved responsive/storage regressions
provides:
  - Real controlled cancellation, timeout, late-response and error-retry browser evidence
  - Exact old-envelope preservation and genuine retry-save/source reload evidence
  - Auditable release reports with an unresolved native Windows WebKit keyboard gate
affects: [phase-verification, phase-03, phase-07]
tech-stack:
  added: []
  patterns: [test-only-port-injection, actual-keyboard-focus, guarded-final-write]
key-files:
  created: [e2e/generation-fixtures.ts, e2e/generation-races.spec.ts, e2e/generation-storage.spec.ts, docs/qa/phase02.md]
  modified: [e2e/budget.spec.ts, e2e/plan-fixtures.ts, e2e/phase02-presentation.spec.ts, e2e/presentation.spec.ts, src/adapters/generation.test.ts, .planning/WINDOWS.md, .planning/phases/02-pervyy-dopustimyy-plan-i-rasschitannye-pokupki/02-VALIDATION.md]
key-decisions:
  - "Keep actual source/corpus evidence separate from numerical fixtures; limited plant-based recipes do not establish nutritional adequacy."
  - "Preserve all assertions and deadlines; use real Tab modality and controlled port completion instead of fake UI success."
  - "Use the verified native End command in WebKit. Do not apply the unconfirmed Alt-Tab workaround, CSS/tabindex changes or system preferences."
  - "Two required Windows WebKit linkTab cases remain failed/unverified; 02-10 and Phase2 are not complete."
requirements-completed: []
requirements-contributed: [APP-04, WIZ-08, DATA-01, DATA-02, DATA-03, CALC-01, CALC-03, CALC-04, CALC-05, CALC-06, CALC-07, GEN-01, GEN-02, GEN-03, GEN-04, GEN-05, MENU-01, MENU-04, SHOP-01, SHOP-04]
actuals:
  tokens: 19680
  tasks: 2
  commits: 8
plan_head_before: ba6497f5e3d1298ae1acebf42901f29534713448
plan_head_after: 7de703a46b7825d28c032b149e2ba7fb5ba0ac25
coverage:
  - id: D1
    description: Controlled pending/cancel/timeout/late/error operations preserve route and storage ownership
    verification:
      - kind: e2e
        ref: "e2e/generation-races.spec.ts; final Chromium affected, Firefox full, WebKit full"
        status: pass
    human_judgment: false
  - id: D2
    description: Failed and deferred writes preserve the old active snapshot and retry-save does not repeat search
    verification:
      - kind: e2e
        ref: "e2e/generation-storage.spec.ts; all three browser reports"
        status: pass
    human_judgment: false
  - id: D3
    description: Release acceptance including native WebKit sequential link navigation
    verification:
      - kind: e2e
        ref: "WebKit owning40:38passed/2failed; .tmp/02-10-webkit-presentation-final.xml"
        status: fail
    human_judgment: true
    rationale: "Windows WebKit Tab and Alt-Tab omit anchors; independent verifier must assess the environment/manual gate."
duration: "1373min observed wall since first recorded trial; overnight/resumption gaps included; active time unknown"
completed: 2026-10-29
---

# Phase 2 Plan 10: Controlled browser faults and blocked release gate Summary

**Настоящие отмена, таймаут, поздние ответы и ошибки хранения проверены; приёмка остановлена на двух последовательностях Tab по ссылкам Windows WebKit.**

## Task Commits

| Task | Commits | Outcome |
|---|---|---|
| 02-10-01 | `16ace70`, `7511560`, `7f31ff0` | Complete: реальные операции, offline-provider block и защита от старого ответа |
| 02-10-02 | `7da6901`, `7f31ff0` | Complete: bytes/active/pantry, corrupt/read/write, retry-save и dirty draft |
| 02-10-03 | `614e4b6`, `92d85b0`, `7f31ff0`, `2a8d74a`, `7de703a` | Executed but blocked: два обязательных native linkTab cases не подтверждены |

## Verification

| Check | Actual evidence |
|---|---|
| Unit | 326/326,16 files,8.56s; `.tmp/02-10-release-unit-final.log` |
| TypeScript / ESLint | Root scripts exit0, including final End correction; `.tmp/02-10-end-typecheck.log`, `-lint.log` |
| Build | Root build exit0,Vite136modules,974ms,target safari15; production source unchanged in02-10 |
| Chromium | Original full225/225,395.760903s; current affected132/132,247.765827s; identity proof132+108unchanged=240,missing0; final End/sequential smoke2/2,18.858061s |
| Firefox | Final full240/240,986.799644s,workers1; final smoke2/2,27.674407s; no2worker full pass is claimed |
| WebKit | Full240:226passed/14failed,1081.932577s,workers1. Owning40 after End:38passed/2failed,292.281763s. Overlay200unchanged+40owning=238passed/2failed,0skipped; not a new full pass |
| Source | Version2026-10-28-1:12food profiles,48USDA nutrient observations,12price observations,52original reviewed recipes; separate source06 evidence |
| Visual review | Existing seven-width evidence plus current Firefox/WebKit360menu,768shopping,1280menu viewed; physical devices/Safari15/UAT/LCP not certified |
| Independent review | Test-only corrections reviewed; final End-only diff has no remaining findings; reviewer did not execute tests |

Canonical detail: `docs/qa/phase02.md`. Raw reports/logs are in `.tmp/02-10-*`; derived JSON retains original XML hashes. Chromium and WebKit coverage JSON compare actual `(classname,name)` identities without converting failures into passes.

## Deviations from Plan

- **[Rule 3 — Blocking]** Combined sequential benchmark exceeded its existing5s limit. `614e4b6` separates two substantive measurements, retaining bounds/yields and production30s; final unit326/326.
- **[Rule 3 — Blocking]** Legacy static `createDraft` import reached JSON through Node ESM before browser collection. `92d85b0` moves preparation through browser dynamic import, retaining exact recovery assertions.
- **[Rule 3 — Blocking]** Firefox distinguishes programmatic focus from actual keyboard modality. `7f31ff0` reaches summary with real Tab before retaining the outline assertion; waits for visible choices and verifies CSS44px with0.01px numeric tolerance. Controlled generation completion remains bounded by the original20s test deadline; assertions5s and production30s are unchanged. Long scenarios were partitioned with every original action/assertion retained, yielding240 cases.
- **[Rule 3 — Blocking]** Verified Windows WebKit native End replaces ineffective ControlEnd only in that engine (`2a8d74a`). Actual probes reach maximum scroll and clearance−87.59/−104.44px; all12 original scroll failures close. No CSS or product change.

## TDD Gate Compliance

TDD_MODE=false; tasks1–2 add coverage for existing07/08 behavior. Initial9case trial had2 harness failures (frozen RAF focus and nonexistent fullscreen navigation), not product RED. Historical failures remain recorded. No fake RED or production implementation claim is made.

## Remaining Gate

**Task3 remains incomplete.** `phase02 sequential Tab ShiftTab Space and Enter traverse saved screens and navigation` and `phase02 sequential Tab ShiftTab and Enter traverse generation recovery` fail to reach semantic anchors in this Win32 WebKit port. Both plain and Alt traversal log H1→Profile→BODY/document.hasFocus=false and skip anchors over36 real key events. Alt-Tab is not applied as a fix; no supported public browser/context preference was located. CSS, tabindex and system settings are untouched; tests are neither skipped nor weakened.

Chromium/Firefox actual sequential navigation passes. Root independent verification must decide the appropriate environment/manual evidence; no human answer is fabricated. WINDOWS15/16 remain open for the two cases, WINDOWS14 for new human/device observations. Requirements stay open and Phase2 is not complete.

## Source and Scope Limits

Independent fixed default proof:28slots/2people/7days,461.9293627901234552RUB purchases,1009.68kcal/P26.51/F2.38/C219.2096 per person/day. This limited plant corpus is **not evidence of nutritional adequacy**. Prices have explicit differing scopes; unknown safety fails closed. New UI runs use saved UUID seeds, so their valid amounts can differ from the fixed numerical proof.

No new production stubs, dependencies, endpoints, auth or schema trust boundaries were introduced. No authentication gate occurred. Original documents, unrelated untracked skills/cache and user work are preserved.

## Actuals and Continuation

Measured realized diff before this metadata:78719characters/4→19680tokens,11files,8commits from the persisted ledger. Two tasks complete; release task blocked. Observed window starts at the first recorded trial2026-10-28T17:37:48.944Z; active time and paused gaps were not separately measured.

Resume at02-10-03 with the above evidence and independent verifier decision. Do not rerun unchanged green suites or claim a successful full WebKit matrix.

## Self-Check: PASSED

All five created/canonical files exist; all eight recorded task/QA commits are ancestors of HEAD. This validates the report's artifacts, not the unresolved acceptance gate.
