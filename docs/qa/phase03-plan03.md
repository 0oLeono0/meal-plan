# Phase 03 / Plan 03 — recipe and shared stock evidence

Executed 2026-11-05 in `D:/Projects/meal-plan`, branch `codex/phase01-execution`. Work began at 12:22:49Z after initial reads. Source-backed catalog facts, schema1, storage key, dependency pins and production30s generation deadline were preserved. No paid service, package installation or publication occurred.

Resume closeout on 2026-11-06: all six task commits already existed; no source/test changes were repeated. Fresh focused command `npm run test:e2e -- e2e/phase03-recipes.spec.ts --project=chromium --workers=1 -g 'malformed duplicate'` passed1/1 (15.0s runner,5.0s test), exit0, zero skipped. Vite emitted its malformed-segment warning while the client-router safety assertions passed. This does not change the hard-GET404 boundary documented below. Wall window includes the overnight interruption; active duration is unknown.

## Task evidence

| Task | RED | GREEN | Actual result |
|---|---|---|---|
|03-03-01|2c489af|5a2d61a|Real generation and direct recipe browser tests failed2/2 on missing rendered recipe/base basis. After implementation2/2 passed13.5s; tracer rerun2/2 passed12.7s. Typecheck/lint passed.|
|03-03-02|7317f18|e2d0496|Focused16:14 pass/2 fail on noncanonical instance order and absent instance allocation. GREEN16, expanded20 pass; focused domain/persistence/controller107 pass. Full440/440 passed15.64s after the cap12 copy fix and mutation guard.|
|03-03-03|f899d2a|5acd6c9|Unit RED7:5 pass/2 fail for exact256 Unicode identities and out-of-period return day. Focused42 passed. Browser retry RED found lost pending state; targeted source retry fixed it. Final source full461/461, static/build pass. Browser final8 initially7 pass/1 dev-server fixture boundary; corrected focused malformed test1/1 pass9.2s.|

Every primary task RED used an actual unchanged JUnit report and the official `check tdd-red-evidence`, yielding `RED_EVIDENCE_OK`, followed by semantic inspection. Additional Link and delayed-retry RED records passed the same classifier. Records are local ignored artifacts `.tmp/03-03-task01-red.json`, `03-03-task01-link-red.json`, `03-03-task02-red.json`, `03-03-task03-red.json`, `03-03-task03-retry-red.json`. They contain command, actual exit1, full report, exact target, expected/observed assertion and semantic assessment. Import/collection/fixture faults did not authorize production implementation. Primary commands:

- `npm run test:e2e -- e2e/phase03-recipes.spec.ts --project=chromium --workers=1`
- `npm run test:unit -- --run src/domain/planProjection.test.ts src/domain/recipeView.test.ts --reporter=junit --outputFile=.tmp/03-03-task02-red.xml`
- `npm run test:unit -- --run src/domain/recipeView.test.ts --reporter=junit --outputFile=.tmp/03-03-task03-red.xml`

## Numeric and trust evidence

`planProjection.test.ts` uses synthetic literal rice facts. Canonical date/slot ordering allocates first300g need→covered200/purchase100 and next200g need→covered0/purchase200, even when caller instances are reversed. Aggregate need500/covered200/purchase300 and costs100/40/60 RUB reconcile independently. Conservation runs across stock1/199/200/201/499/500/1000, reversed instances, source ingredient/profile priority and reversed food arrays. One0.2kg remainder covers only200g; unknown/incompatible units cover0 with a reason. Evidenced volume conversion, exact fractions, product rounding and hard budget regressions remain passing. An alternative receives the original stock separately.

`recipeView.test.ts` independently checks base2→family3 factor3/2 and per-portion factor1/2: family300g/60RUB, per-portion20RUB, nutrition123.5/7.25/0/11.5. Fractional1/3+2/3g source contributions sum before display rounding; half-up123.5→124 and7.25→7.3. Known fat0 remains known; missing direct facts remain unknown, contextual missing mandatory facts are incomplete. Selected1000 and positive1/3 accepted; zero and1000.001 rejected. Source ingredient order, one complete step, empty required collections, repeated recipe occurrences and active changes have explicit assertions.

The derived ledger enlarged the combined `immutableSnapshot({plan,projections})` beyond100000 nodes at cap12. Full439 tests yielded438 pass/1 `SNAPSHOT_SIZE_LIMIT` in the existing real twelve-variant quota/cancellation counterexample; the focused JUnit rerun reproduced it. `validateActivePlanEnvelope` already detaches/deep-freezes its returned plan (`plan.ts`), and every successful `projectPlan` detaches/deep-freezes its projection. `validateActiveBundle` now reuses ONLY those outputs in a frozen outer bundle/array. It still validates the complete envelope, trusted catalog, every alternative's safety/time/exclusion rules, projection and exact/displayed budget. Byte/final write guards and generic snapshot bounds are unchanged. A caller mutation test changes source recipe/food after validation and verifies the validated copy stays unchanged; attempted mutation of actual derived covered quantity and projection array fails. Existing cap12 quota/cancel regression passes.

## Browser results and the malformed-path server boundary

Final integrated command: `npm run test:e2e -- e2e/phase03-recipes.spec.ts e2e/phase03-variants.spec.ts --project=chromium --workers=1`.

Actual run:7/8 passed29.3s. Passed: real generate→menu Link→last saved instance→matching four nutrients/price/steps→reload→back; active selection makes the old URL stale; repeated recipe full/partial/none stock and shopping reconciliation; catalog error→real pending retry→navigate away→late result→new direct visit; direct/unknown/partial states; corrupt context retry with source bytes unchanged; actual Phase2 legacy one-variant load; real wizard/selection/shopping/reload. The sole failed case hard-navigated `/recipe/%QQ` and never loaded the SPA. Inspection of that run's Playwright trace `.network` reported:

`http://127.0.0.1:4173/recipe/%QQ?variant=generated-1&instance=2026-11-04%2Fbreakfast` → **HTTP404**.

This is Vite's response before application routing, not an application resolver failure or a passed hard-GET scenario. No server/system setting changed. The test now enters the raw malformed pathname through actual `history.pushState`/`popstate` client routing; all other invalid-query/direct/unknown hard navigations and the same stale/menu-link/byte assertions remain. Focused actual rerun `npm run test:e2e -- e2e/phase03-recipes.spec.ts --project=chromium --workers=1 -g 'malformed duplicate'`: **1/1 passed9.2s**. It verifies malformed path/query, duplicate IDs,257-character ID, invalid date/view, external return, reload and Back. Raw malformed-path hard GET remains outside the demonstrated app pass. The trace was inspected before the focused runner replaced its output directory; its extracted URL/status is retained here, not represented as a retained full trace file.

Earlier browser4/4 passed15.4s after retry routing fix. The first repeated-recipe fixture briefly asserted a strict single-element locator before navigation completed; waiting for the actual recipe URL fixed that test race without weakening coverage. The earlier retry failure was real: reloading both controller and catalog unmounted RecipePage and lost local pending state. The resolver now identifies `plan` versus `catalog` recovery, so only the failing source reloads.

## Acceptance predicates

| Predicates | Evidence |
|---|---|
|EC31,36,38,39,42|Recipe numeric/base/fraction/known-zero unit oracles; browser menu/recipe four facts and price equality; family quantities and per-portion composition. Media remains separately planned.|
|EC32,35|Canonical order/conservation/profile/unit tests; real full/partial/none repeated browser recipe→shopping500−200=300.|
|EC33,40|Empty ingredients/steps and missing mandatory contextual facts unit tests; complete single ingredient/step; corrupt saved-context browser retry.|
|EC34,44|Case-sensitive exact IDs, Unicode256/257, malformed percent/duplicates/partial/external return and actual period unit tests; corrected client-route malformed browser plus real hard invalid-query navigations.|
|EC37,46|Pure request derives from current saved active bundle; active-change stale unit and real browser; pending adapter result delivered after navigation does not mount old recipe.|
|EC41|Stable nutrient key order and ingredient order asserted in unit/browser native disclosure.|
|EC43,45|Missing/unknown ID distinct from catalog failure and stale context; safe menu recovery; direct/unknown/stale reload/Back and unchanged saved bytes.|

## Final checks and visual inspection

- `npm run test:unit -- --run`:461/461 across18 files,10.69s, exit0.
- `npm run typecheck`:exit0. `npm run lint`:exit0.
- `npm run build`:exit0; Safari15 target,141 modules. Main JS503.58kB/gzip142.07kB causes Vite's nonblocking500kB warning; WINDOWS21 tracks it.
- Actual Chromium recipe geometry at360/768/1280: no document overflow. Native disclosure via keyboard Enter shows all four contribution values; route/error h1 focus and retry target≥44px asserted.
- Dedicated isolated Chromium context on owned dev port4183 captured `.tmp/phase03-recipe-360.png` and `phase03-recipe-1280.png`; both viewed. Real bundled recipe, readable labels, numbered full steps,4:3 fallback and responsive header observed; scrollWidth360/1280 matched viewport. Owned preview terminated after inspection; no shared browser/storage modified.
- Context7 official React Router source/docs consulted for raw `useLocation().pathname` versus decoded parameters; raw pathname is decoded once in the pure resolver. No `URLSearchParams.size` dependency (Safari15); new packages were not introduced.

## Scope and remaining gates

Minimal MenuPage Link wiring was necessary to complete the actual click tracer and was explicitly authorized. Full card/day/week/return-card-focus design belongs to03-10. Neutral recipe photo fallback is intentional pending03-04–03-09 (WINDOWS22); no media, fake photo provenance, CC0 claim or recipe facts were generated. MENU03/REC01 photo scope and all phase requirements remain pending until the dependent plans and phase verification/UAT. Browser automation here is Chromium; native Safari15, physical devices, assistive technology and human UAT were not performed. No required automated command was skipped, no test skip introduced, and no new unmodeled endpoint/auth/schema/file-access surface appeared.
