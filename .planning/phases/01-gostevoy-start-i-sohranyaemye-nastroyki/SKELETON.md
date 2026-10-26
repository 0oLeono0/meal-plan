# Walking Skeleton — MealPlan

**Phase:** 1 · **Generated:** 2026-10-26 · **Status:** planned; not implemented or verified.

## Capability Proven End-to-End

Будущий tracer01-01-02: гость открывает мастер, меняет число людей, получает реальное подтверждение локальной записи и видит то же значение после перезагрузки. Сейчас этот путь не реализован, тесты не запускались.

## Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Framework | React + strict TypeScript + Vite, Router SPA | Preferred project stack; no server is needed for guest draft |
| Data layer | Versioned localStorage through GuestDraftPort, schemaVersion1 and mealplan:guest:draft:v1 | Real browser read/write; runtime validation, hydrate-before-save, replaceable adapter, corruption recovery |
| Auth | Guest; no account/session/crypto | P0 works without registration; auth is P1 |
| Deployment target | Local dev via npm run dev, production npm run build | Local free run exercises complete browser/UI/domain/storage path; no publication authorized |
| Directory layout | src/app, features/wizard, domain, adapters, shared; e2e | Pure calculations outside React; explicit storage/catalog boundaries |
| UI | Native controls + shared tokens/Tailwind3.4, system Cyrillic font | PDF reference and Safari15 requirement; no new component/icon package |
| State | Raw SettingsDraft + pure reducer; derived parsed values/selectors | Partial strings survive reload; no duplicate hint/range/target state |
| Contracts | Draft ≠ confirmed settings ≠ global pantry | Editing/review is not generation or inventory consumption |
| Catalog | Local stable IDs/names/synonyms/allowed unit groups only | UI search works without fabricated nutrition/prices or Q-14 safety claims |
| Calculator | C-04/Q-03 remains blocking decision | Manual input does not finish WIZ-09; source-backed P0 contract or explicit P1 scope amendment |

All application names/symbols are FUTURE, explicitly enumerated under each plan's Artifacts this phase produces. Existing source references are tracked documentation; no runtime mirror is used. Version pins are candidates until the mandatory install preflight and actual lockfile verification; too-new flags are not evidence of maliciousness.

## Stack Touched in Phase 1

- [ ] Project scaffold, build/lint/unit/e2e scripts —01-01-02 creates CLI/browser tracer after authorization;01-02-02 adds strict/shared configs.
- [ ] Routing — / → /plan/new tracer; all P0 direct routes and truthful states —01-02-01.
- [ ] Real persistence — actual localStorage write AND reload read, browser tests; server DB is unnecessary for this approved guest scope.
- [ ] Interactive UI — people input → pure reducer → adapter → real device storage.
- [ ] Local full-path command — npm run dev; verification commands in PLAN/VALIDATION.
- [ ] Four-step expansion — parameters04/05, products06, gated calculator07, QA08.

These unchecked boxes are future acceptance criteria, not completed architecture claims.

## Out of Scope (Deferred to Later Slices)

Phase2 owns actual generation, quick start, applying/skipping confirmed settings, financial-limit base, dates/slots and calculated purchases. Phase3 owns variants/recipes; Phase5 global pantry editing. Profile/auth/PNG/cooking/history are P1, P2 requires request. No deployment, paid LLM/backend/cloud or medical formula is inferred. Calculator remains a decision gate, not silently deferred.

## Subsequent Slice Plan

Phase2: first valid deterministic meal plan and calculated purchases.
Phase3: variants and recipes.
Phase4: modifying meals and portions with consistent recalculation.
Phase5: quantitative pantry changes.
Phase6: shopping interactions and PDF.
Phase7: complete P0 integration/quality acceptance. Earlier phases retain their own QA responsibilities.

## Execution Graph and Readiness

01-01 wave1 (install checkpoint→real save/reload) →01-02 wave2 (routes/tokens/quality) →01-03 wave3 (recovery/exit) →01-04 wave4 (people/manual) → {01-05 budget,01-07 calculator gate} wave5 in parallel →01-06 products wave6 (depends05) →01-08 QA wave7 (depends06,07). Same-wave05/07 have no shared file writes. Each plan declares at most9 exact files; each task≤8 and first tracer is8 files. No hidden generated/config writes.

Readiness is conditional: current authorization is planning only; installs/code remain prohibited. Install gate is blocking-human; C-04/Q-03 is checkpoint:decision; unresolved four calculator UI states follow it. Scope amendment triggers scoped replan, never automatic completion. Historical Safari15, real iOS keyboard/safe-area, Q-17 performance methodology, two-tab backstop and flagged safety judgement need explicit evidence/disposition. Modern WebKit is not historical Safari15.

## Source/Probe Coverage

Whole-phase GOAL/REQ/RESEARCH/CONTEXT audit lives in01-01-PLAN. All12REQ and17D are allocated.54 explicit UI truths:01=4,02=8,03=6,04=12,05=6,06=16,07=2;4 unresolved calculator assumptions remain07.45 edges:01=4,02=14,03=6,04=4,05=7,06=10, with44 explicit+1 structured backstop;none dismissed. Two descriptor-less safety prohibitions remain04/06. Initial Vite CLI supports real tracer before config expansion; Tailwind/PostCSS options reside in vite.config.ts, not hidden generated files. Application entry remains src/app/App.tsx (no src/main.tsx/config.ts). Full release3-browser suite remains08 after each QA task's substantive focused smoke. No prior app/history/working commands; no implementation/tests run during planning.

