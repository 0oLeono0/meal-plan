---
schema_version: 1
open_count: 1
waived_count: 0
fixed_count: 8
total_count: 9
last_updated: 2026-10-27T14:01:37.462Z
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
  }
]
````
