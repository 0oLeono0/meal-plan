---
phase: 01-gostevoy-start-i-sohranyaemye-nastroyki
plan: "08"
subsystem: testing
tags: [playwright, accessibility, webkit, guest-wizard]
requires:
  - phase: 01-06
    provides: Restrictions, home products and validated draft review
  - phase: 01-07
    provides: Human-confirmed manual P0 scope amendment
provides:
  - Responsive guest acceptance and keyboard audit across three current browser engines
  - Factual release evidence and explicit pending human acceptance
affects: [phase-verification, phase-02]
tech-stack:
  added: []
  patterns: [explicit dialog initiator for focus restoration]
key-files:
  created: [e2e/presentation.spec.ts, e2e/accessibility.spec.ts, docs/qa/phase01.md]
  modified: [README.md, src/shared/styles/tokens.css, src/shared/ui.tsx, src/app/App.tsx, src/features/wizard/Wizard.tsx]
key-decisions:
  - "Only amended manual WIZ-09 is accepted; automatic NEXT-10 remains deferred P1."
  - "Automated coverage does not close mandatory human gates or mark Phase 1 complete."
requirements-completed: [WIZ-09]
requirements-automated-evidence: [APP-01, APP-02, APP-03, WIZ-01, WIZ-02, WIZ-09, UX-01]
actuals:
  tokens: 11186
  tasks: 2
  commits: 5
plan_head_before: 7e2bb2ce6de7c88358ec255eac3e62a2149b4ac7
plan_head_after: 280ccd4f94807d69264fcdc97f2c3cc560c69f87
duration: 877min
completed: 2026-10-27
status: complete
coverage:
  - id: D1
    description: "Manual optional nutrition target survives complete guest flow and reload."
    requirement: WIZ-09
    verification:
      - kind: e2e
        ref: "e2e/presentation.spec.ts; e2e/nutrition.spec.ts"
        status: pass
    human_judgment: false
  - id: D2
    description: "Phase 1 responsive and accessibility acceptance."
    verification:
      - kind: e2e
        ref: ".tmp/phase01-qa/release-webkit-final.xml"
        status: pass
      - kind: e2e
        ref: ".tmp/phase01-qa/focus-cross-browser-final.xml"
        status: pass
    human_judgment: true
    rationale: "Actual iOS/Safari15, screen reader/contrast, native zoom, final visuals, Q-17 LCP and judgement backstops remain pending."
---

# Phase 1 Plan 8: Guest flow acceptance Summary

**Семь ширин гостевого пути и keyboard audit проверены; исправлены reduced motion и возврат фокуса WebKit, обязательные human gates явно открыты.**

## Performance

- Tasks: 2/2; plan complete, **Phase 1 awaiting verification**.
- Recorded execution window: first task commit 2026-10-26T17:43:08Z → 2026-10-27T08:20:27.047515+00:00; 877 min wall time includes overnight usage-limit interruption. Exact original start and active working duration were not recovered; 877 min is not an active-work claim.
- Actual tokens: chars/4 of the realized committed diff at plan_head_after, including QA docs, excluding this metadata commit; not model token usage.
- Files in committed task diff: 8.

## Accomplishments

- 15 presentation scenarios: guest steps/review/reload, manual absence/partial/clear/full/provenance, raw values and IDs; 360/390/430/768/1199/1200/1280, truthful routes and 200% text.
- 11 accessibility scenarios: keyboard/trap/Escape/restore, invalid first focus, skip link, combobox, reduced motion, sticky fields and short viewport. Actual PDF/screenshot and Playwright MCP observations retained in docs/qa/phase01.md.
- Full original suites executed: unit 134 pass, Chromium 112 pass, Firefox 112 pass; original WebKit 110 pass/2 fail preserved. Final full WebKit **112 pass**, final focused Chromium+Firefox **70 pass**.
- WIZ-09 accepted only as amended optional manual P0. NEXT-10 automatic calculator and its states remain unimplemented deferred P1. Other six plan requirement IDs retain Pending for final verifier and mandatory human checks.

## Task Commits

1. Task 1 presentation audit — `0423f99`.
2. Task 2 accessibility RED — `c4ac329`; reduced-motion GREEN — `d557cb5`; WebKit focus GREEN — `96d1bf3`; final evidence/docs — `280ccd4`.
3. Plan metadata: separate final docs commit.

## Verification

| Executed command | Actual result |
|---|---|
| presentation Chromium --grep smoke | 1 passed, 7.0 s |
| presentation Chromium full | 15 passed, 27.6 s |
| accessibility Chromium --grep smoke | 1 passed, 4.6 s |
| accessibility Chromium full after motion fix | 11 passed, 16.1 s |
| npm run test:unit -- --run | 134 passed / 4 files; final rerun 1.17 s |
| npm run test:e2e -- --project=chromium | 112 passed, original wall 93.141 s |
| npm run test:e2e -- --project=firefox | 112 passed, original wall 124.531 s |
| npm run test:e2e -- --project=webkit | Original 110 pass/2 fail; final 112 passed / 154.689 s JUnit |
| navigation+storage WebKit --grep "profile is one\|exit cancel" | Reproduced RED 2 fail; unchanged assertions GREEN 2 pass / 6.3 s |
| navigation+storage+accessibility --project=chromium --project=firefox | Final 70 passed, 35/browser; 74.461 s JUnit |
| npm run typecheck | Initial TS2550 in QA filename helper; corrected, rerun exit 0 |
| npm run lint | Exit 0, including after app fix |
| npm run build | Exit 0; final 3.74 s, dist/index.html exists; known upstream warning retained |

Commands use `npm run test:e2e -- e2e/<spec>.spec.ts` for named focused specs; exact command lines, browser versions and output paths are in docs/qa/phase01.md and local unchanged logs. Full Chromium/Firefox counts precede the focus fix; only their affected navigation/storage/accessibility were rerun afterwards. No claim of a second full Chromium/Firefox run.

## Decisions Made

Optional manual target uses no averages or medical evaluation. Modern WebKit 27.2 is not historical Safari15. CSS text scaling and short desktop viewport are not native zoom or iOS keyboard evidence. Functional automation does not silently close broader human acceptance.

## Deviations from Plan

### Auto-fixed Issues

1. **[Rule 1/3 — Bug/blocking] Reduced-motion specificity**: accessibility assertion exposed 0.12s button transition under reduce; return to shared-style owner 01-02, minimal media-selector specificity fix in tokens.css, `d557cb5`. Actual JUnit RED 10 pass/1 fail validated RED_EVIDENCE_OK; 11/11 GREEN.
2. **[Rule 1/3 — Bug/blocking] WebKit dialog focus**: existing profile and exit tests failed after pointer opening because document.activeElement need not be clicked trigger. Actual repeated two-case RED validated RED_EVIDENCE_OK. Explicit initiating element captured by App/Wizard and used by ConfirmDialog; profile, exit and reset covered, `96d1bf3`. No test weakening; focused GREEN and full WebKit plus affected other-engine reruns passed.
3. **[Rule 3 — Blocking] Test-only TS lib incompatibility**: replaceAll used in screenshot filename helper failed typecheck; changed to equivalent regex replace in presentation.spec.ts, `280ccd4`, typecheck passed.

Original smoke authoring also corrected actual locator names, the intentional 250 ms double-next guard timing and the specific save-status selector. These were test-authoring errors against existing behavior, not production feature RED evidence. No architectural change, packages or new security surface.

## TDD Gate Compliance

Plan type is execute with TDD tasks. New QA inspects existing behavior; feature implementation credit is not claimed for initially green cases. Actual reduced-motion and focus regressions have original JUnit and machine RED_EVIDENCE_OK plus semantic inspection of intended assertions before GREEN. No refactor needed. TDD_MODE runtime gate inactive.

## Known Stubs

None introduced. Truthful menu/shopping/pantry/generating empty routes are intentional Phase 1 boundaries, with implementation assigned to later roadmap phases; no fake generation or calculator success.

## Deferred Issues / Human Acceptance

Real iOS keyboard/safe-area; historical Safari15; screen reader and full contrast; native browser zoom and visual approval; Q-17 LCP methodology/measurement; two-tab UX and flagged safety judgement backstops are **unverified/human_needed**. Recorded as six unrun-verify entries 4–9 in WINDOWS.md. Existing upstream react-router MODULE_LEVEL_DIRECTIVE warning stays open. No tests skipped, no automated verify omitted. These prevent declaring the phase accepted.

## User Setup Required

No credentials, paid services or external publication. Missing device/human evidence is retained explicitly.

## Next Phase Readiness

All eight plan executions are recorded. Next action is phase code/security review and goal verification, then required human acceptance. Do not start Phase 2 or mark Phase 1 complete from this summary alone.

## Self-Check: PASSED

Presentation/accessibility specs, QA report, production dist/index.html and summary exist. All five task commit hashes are ancestors of HEAD. No tracked deletions or introduced goal-blocking stubs found.

