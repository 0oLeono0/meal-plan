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
| Calculator | Human-confirmed C-04 scope-amendment 26.10.2026 | WIZ-09 optional manual target P0 Pending; automatic NEXT-10 and empty/loading/error/partial deferred P1, not implemented; Q-03 formula/averages/target hardness open |

All application names/symbols are FUTURE, explicitly enumerated under each plan's Artifacts this phase produces. Existing source references are tracked documentation; no runtime mirror is used. Version pins are candidates until the mandatory install preflight and actual lockfile verification; too-new flags are not evidence of maliciousness.

## Stack Touched in Phase 1

- [ ] Project scaffold, build/lint/unit/e2e scripts —01-01-02 creates CLI/browser tracer after authorization;01-02-02 adds strict/shared configs.
- [ ] Routing — / → /plan/new tracer; all P0 direct routes and truthful states —01-02-01.
- [ ] Real persistence — actual localStorage write AND reload read, browser tests; server DB is unnecessary for this approved guest scope.
- [ ] Interactive UI — people input → pure reducer → adapter → real device storage.
- [ ] Local full-path command — npm run dev; verification commands in PLAN/VALIDATION.
- [ ] Four-step expansion — parameters04/05, products06, docs-only amendment07, manual/P0 QA08; automatic calculator NEXT-10 deferred P1.

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

01-01 wave1 (install checkpoint→real save/reload) →01-02 wave2 (routes/tokens/quality) →01-03 wave3 (recovery/exit) →01-04 wave4 (people/manual) → {01-05 budget,01-07 docs-only scope amendment} wave5 →01-06 products wave6 (depends05) →01-08 QA wave7 (depends06,07). Amendment writes only the declared documentation/decision paths; no application source or packages. 01–05 historical evidence remains in SUMMARY; 01-07 dependency closes only after actual execution.

Readiness: development and pins already authorized; six plans executed including docs-only 01-07 (2/2 tasks). C-04 scope-amendment is human-confirmed; scoped replan verified and executed, 01-06 and final 01-08 QA pending. Four calculator states explicitly deferred P1/NEXT-10; formula/averages and target hardness Q-03 remain open. WIZ-09 manual remains Pending until QA. Historical Safari15, real iOS keyboard/safe-area, Q-17 performance methodology, two-tab backstop and flagged safety judgement need explicit evidence/disposition. Modern WebKit is not historical Safari15.

## Source/Probe Coverage

Whole-phase original audit lives in01-01-PLAN as historical baseline; scoped GOAL/REQ/RESEARCH/CONTEXT mapping now lives in docs/decisions/nutrition-calculator-amendment.md. Original aggregate counts are not a new acceptance audit: calculator layout and four states move to P1 by explicit human decision. Remaining applicable P0 rows and safety/backstop judgments retain their checks. Application entry src/app/App.tsx, configs and 3-browser release QA08 remain unchanged; only actual execution evidence in SUMMARY/QA can establish passes.

