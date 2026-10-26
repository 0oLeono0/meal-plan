---
schema_version: 1
open_count: 1
waived_count: 0
fixed_count: 0
total_count: 1
last_updated: 2026-10-26T16:04:55.085Z
---

# Broken Windows Ledger

> Cross-phase defect register. With `workflow.windows_enforce` enabled, `/gsd-ship` blocks while `open_count > 0`.
> Waive with `gsd-tools windows waive <id> "<reason>"` (reason required).
> Mark fixed with `gsd-tools windows fixed <id>`.

| id | phase | kind | file | line | description | status | reason | recorded_at | resolved_at |
|----|-------|------|------|------|-------------|--------|--------|-------------|-------------|
| 1 | 01 | lint-warning | package.json |  | Vite build succeeds but upstream react-router use-client directive produces MODULE_LEVEL_DIRECTIVE warning in client SPA | open |  | 2026-10-26T16:04:55.085Z |  |

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
  }
]
````
