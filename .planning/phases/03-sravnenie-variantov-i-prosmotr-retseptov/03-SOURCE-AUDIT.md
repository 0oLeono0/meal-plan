# Phase03 — Multi-source planning audit

Status: planned coverage, **not execution/verification pass**. 12 plans /8 waves /33 tasks. Every task≤5 modified paths; each plan2–3 tasks and starts tracer. Mandatory static outputs split into4-photo+1batch-ledger tasks to respect file cap. Code/product scope unchanged.

**As a** гость, **I want to** сравнивать варианты меню, сохранять предыдущие при пересборке и изучать рецепты из согласованного состояния приложения, **so that** я могу выбрать подходящее меню и понимать его состав, стоимость и покупки без потери предыдущего результата.

MVP framing approved by orchestrator explicit--auto on2026-11-04, equivalent to original ROADMAP goal/success criteria; not a new human answer. ROADMAP Goal remains original wording. CONTEXT locked D-01–18 authoritative; deferred Phase4/5/6/7/P1/P2 untouched.

## Four-source audit

| SOURCE | ID | Feature/constraint | Plans | Status | Evidence contract |
|---|---|---|---|---|---|
| GOAL | G03 | Пользователь сравнивает меню, сохраняет предыдущие варианты и изучает рецепты из согласованного состояния приложения. |01–12|COVERED|Real full flow03-12-01|
| GOAL | SC1 |3target variants/partial policy/comparison/shopping|01,12|COVERED|variant/controller/real browser|
| GOAL | SC2 |append same settings/keep previous/confirm loss|02,11,12|COVERED|append/cap/recreate/old-bytes|
| GOAL | SC3 |day/week/today/desktop/card/context|04–10,11,12|COVERED|actual-date/browser/media|
| GOAL | SC4 |recipe/ingredients/price/stock/steps/4metrics/notfound|03,04–09,11,12|COVERED|numeric/context/browser|
| GOAL | SC5 |validated saved reload/corrupt/save failure|01,02,11,12|COVERED|legacy/trust/guard/retry|
|REQ|DATA-04|Одна валидированная модель и честный save|01,02,03,11,12|COVERED|03-01-01, 03-01-02, 03-01-03, 03-02-01, 03-02-02, 03-02-03, 03-03-01, 03-03-02, 03-03-03, 03-04-01, 03-04-02, 03-09-01, 03-09-02, 03-09-03, 03-10-01, 03-10-02, 03-11-01, 03-11-02, 03-11-03, 03-12-01, 03-12-02|
|REQ|GEN-06|3 целевых допустимых уникальных варианта, выбор/partial|01,02,12|COVERED|03-01-01, 03-01-02, 03-01-03, 03-02-01, 03-02-02, 03-02-03, 03-11-01, 03-11-02, 03-11-03, 03-12-01, 03-12-02|
|REQ|GEN-07|Append1, прежние applied inputs, подтверждение new-set/cap|02,11,12|COVERED|03-02-01, 03-02-02, 03-02-03, 03-11-01, 03-11-02, 03-11-03, 03-12-01, 03-12-02|
|REQ|MENU-02|Actual1–7 dates, mobile day/week, desktop4 slots|10,11,12|COVERED|03-10-01, 03-10-02, 03-11-01, 03-11-02, 03-11-03, 03-12-01, 03-12-02|
|REQ|MENU-03|4:3photo/card/facts/stock/exact recipe Link|03,04–10,11,12|COVERED|03-01-01, 03-01-02, 03-01-03, 03-03-01, 03-03-02, 03-03-03, 03-04-01, 03-04-02, 03-05-01, 03-05-02, 03-05-03, 03-06-01, 03-06-02, 03-06-03, 03-07-01, 03-07-02, 03-07-03, 03-08-01, 03-08-02, 03-08-03, 03-09-01, 03-09-02, 03-09-03, 03-10-01, 03-10-02, 03-11-01, 03-11-02, 03-11-03, 03-12-01, 03-12-02|
|REQ|REC-01|Recipe image/ingredients/cost/stock/numbered steps|03,04–09,11,12|COVERED|03-03-01, 03-03-02, 03-03-03, 03-04-01, 03-04-02, 03-05-01, 03-05-02, 03-05-03, 03-06-01, 03-06-02, 03-06-03, 03-07-01, 03-07-02, 03-07-03, 03-08-01, 03-08-02, 03-08-03, 03-09-01, 03-09-02, 03-09-03, 03-10-01, 03-10-02, 03-11-01, 03-11-02, 03-11-03, 03-12-01, 03-12-02|
|REQ|REC-02|4perPortion facts and ingredient composition|03,11,12|COVERED|03-03-01, 03-03-02, 03-03-03, 03-11-01, 03-11-02, 03-11-03, 03-12-01, 03-12-02|
|REQ|REC-04|Unknown vs error/stale/direct and safe menu return|03,11,12|COVERED|03-03-01, 03-03-02, 03-03-03, 03-11-01, 03-11-02, 03-11-03, 03-12-01, 03-12-02|
|RESEARCH|R01|Existing pins/no packages/store/backend/Firebase/paid keys|01–12|COVERED|T-03-SC|
|RESEARCH|R02|retained feasible top-K, canonical fingerprints not seeds|01|COVERED|T-03-01|
|RESEARCH|R03|bounded ranking/ties/over-budget intermediate beam; strict final gates|01,02|COVERED|T-03-01/04|
|RESEARCH|R04|Scoped new variant/instance IDs, old IDs unchanged|01,02|COVERED|T-03-01/02|
|RESEARCH|R05|schema1/key/4_000_000 JS-character bound retained; quota separate|01,02,11|COVERED|T-03-01/16|
|RESEARCH|R06|all-variant trust/catalog equality/safety/budget recomputation|01,03,11|COVERED|T-03-01/06|
|RESEARCH|R07|same saved inputs for append; exclude outputs not search transitions|02|COVERED|T-03-03|
|RESEARCH|R08|one shared30s catalog/search/yield deadline/cancel; no3×30s|02|COVERED|T-03-04|
|RESEARCH|R09|owned op/base revision/serialized write guard/ack-only install/retry without search|01,02,11|COVERED|T-03-02/03/16|
|RESEARCH|R10|12variants no eviction/old kept until confirmed new set saved|02|COVERED|T-03-03|
|RESEARCH|R11|one canonical date/slot/ingredient product ledger through profiles|03,10|COVERED|T-03-06|
|RESEARCH|R12|exact family factor selected/base once; headline and composition perPortion|03,10|COVERED|T-03-06|
|RESEARCH|R13|unknown nutrients/prices/stock explicit, not0; compatible conversions only|03,11|COVERED|T-03-06|
|RESEARCH|R14|direct/context/nonactive/stale/malformed/error resolver with safe return|03,11|COVERED|T-03-05/17|
|RESEARCH|R15|URL view/day, today/default/clamp, manual APG tabs and semantic day-first DOM|10,11|COVERED|T-03-14/17|
|RESEARCH|R16|menu1280 vs nav1200;1–7 columns×4 aligned rows; no small fonts/overflow|10,11|COVERED|T-03-14|
|RESEARCH|R17|sticky measured CTA/nav reserve, one safe-area, height<500 flow fallback|10,11|COVERED|T-03-17|
|RESEARCH|R18|52exact mapping, original included image calls, per-image source steps/texture|04–09|COVERED|T-03-08…13|
|RESEARCH|R19|Original sample hash/1448×1086 only rice-sweet-porridge, not rice-sweet-snack|04|COVERED|T-03-08|
|RESEARCH|R20|Own exact prompt/artifact/time/provider/terms/effective date/hash/dimensions/visual review|04–09|COVERED|T-03-08…13|
|RESEARCH|R21|Generated disclosure, no CC0/exclusive/prepared-food claim; no facts from photos|04–09,10,11|COVERED|T-03-08…13|
|RESEARCH|R22|52different hashes/local headers4:3/full visual review/offline card+hero; fallback separate|04–09,10,12|COVERED|T-03-07…13|
|RESEARCH|R23|compiled version+recipe sidecar outside factual catalog/trust/persistence|04,09|COVERED|T-03-07/08/13|
|RESEARCH|R24|eager hero/first card, lazy others, intrinsic size/one-shot fallback; measure native PNG weight|04,09,10|COVERED|T-03-07|
|RESEARCH|R25|No optional Pillow/install/image SDK; stdlib auditor|04,09|COVERED|T-03-SC|
|RESEARCH|R26|Independent500−200=300, overlap conservation, base2→selected3 fixture|03,12|COVERED|T-03-06/18|
|RESEARCH|R27|Real source-catalog flow vs literal test fixtures; old-single captured before modification|01,12|COVERED|T-03-18|
|RESEARCH|R28|CR02 entropy/randomUUID missing/throwing/browser regression; source target not polyfill|02,11,12|COVERED|T-03-18|
|RESEARCH|R29|Actual widths and keyboard/focus/zoom/safe-area/404/offline; WindowsWebKit limits distinct|10,11,12|COVERED|T-03-17/18|
|RESEARCH|R30|ASVS5 scoped level1 STRIDE; no false auth/token/server control|01–12|COVERED|T-03-01…18/SC|
|RESEARCH|R31|A1 tool quota assumption: durable ledger and real blocker; no paid fallback|04–09|COVERED|T-03-08…13|
|RESEARCH|R32|A2 default top3 benchmark measured, partial honest/no evaluation inflation|01,12|COVERED|T-03-04/18|
|RESEARCH|R33|No runtime external integration/API; stable installed Router declarations only|03,10,11|COVERED|T-03-05/17|
|CONTEXT|D-01|3семантических варианта/safety/per-alternative stock|01,02|COVERED|task actions cite D-01|
|CONTEXT|D-02|1/2/0 honest shortage without clones|01,12|COVERED|task actions cite D-02|
|CONTEXT|D-03|Сравнение/стрелки/purchase/active atomic|01,11|COVERED|task actions cite D-03|
|CONTEXT|D-04|Append1 saved inputs/30s/cancel|02,11|COVERED|task actions cite D-04|
|CONTEXT|D-05|Cap12/new-set confirmation/no eviction|02|COVERED|task actions cite D-05|
|CONTEXT|D-06|Recreate/wizard/draft/confirmation/focus|02,11|COVERED|task actions cite D-06|
|CONTEXT|D-07|One owner/atomic guard/retry/late result|01,02,11|COVERED|task actions cite D-07|
|CONTEXT|D-08|Legacy single/trust/version/bytes/no rewrite|01,03,04,11|COVERED|task actions cite D-08|
|CONTEXT|D-09|Stable identity/reversible schema/no shopping-P1 state|01,02,03|COVERED|task actions cite D-09|
|CONTEXT|D-10|Actual dates/today/day/week/grid1280|10,11|COVERED|task actions cite D-10|
|CONTEXT|D-11|Card4:3/portion/positive instance stock/ledger|03,10|COVERED|task actions cite D-11|
|CONTEXT|D-12|Reuse summary/3costs/target/warnings/sticky|10,11|COVERED|task actions cite D-12|
|CONTEXT|D-13|Triple context/safe back/day/focus/stale|03,10,11|COVERED|task actions cite D-13|
|CONTEXT|D-14|Direct/base/no stock/unknown/error|03,11|COVERED|task actions cite D-14|
|CONTEXT|D-15|Family ingredients/perPortion4facts/composition/steps|03,11|COVERED|task actions cite D-15|
|CONTEXT|D-16|52local real raster/origin/rights/included tool/fallback|04–09|COVERED|task actions cite D-16|
|CONTEXT|D-17|Real tracer/TDD/independent oracles/races|01–12|COVERED|task actions cite D-17|
|CONTEXT|D-18|Safari15/CR02/widths/keyboard/fact-only evidence|01,02,10,11,12|COVERED|task actions cite D-18|

Exclusions (not gaps): replacement/removal/add/×multipliers Phase4, global pantry5, manual shopping6, PDF7; PNG/cooking/favorites/profile/history/auth P1. Human kitchen/medical/nativeSafari15/device/AT judgments remain explicit unverified. No placeholders count toward photo scope. Requirements are exact assigned8 from REQUIREMENTS, trace text also in03-CONTEXT/RESEARCH; no new requirement IDs invented.

## Dependency and ownership graph

| Plan | Wave | Needs | Creates/user capability | Tasks | Estimate raw=calibrated |
|---|---|---|---|---|---|
|03-01|1|Phase2 accepted source/ports|Пользователь получает до3 семантически различных допустимых вариантов, сравнивает покупки и сохраняет выбор в общем menu/shopping bundle per D-01,D-02,D-03,D-07,D-08,D-09,D-17.|3|34000|
|03-02|2|03-01|Добавить ровно один новый вариант с прежними applied inputs и подтверждаемое создание нового набора per D-04,D-05,D-06,D-07,D-09.|3|32000|
|03-03|3|03-02|Контекстный и прямой рецепт со структурированными фактами, точной базой порций и единым stock allocation per D-11,D-13,D-14,D-15,D-17.|3|34000|
|03-04|4|03-03|Включить локальную4:3 фотоиллюстрацию в реальный рецепт и создать проверяемый media/provenance путь per D-08,D-16,D-17.|2|20000|
|03-05|5|03-04|Произвести12 настоящих local4:3 иллюстраций exact batch01 per D-16 без изменения пищевого каталога.|3|18000|
|03-06|5|03-04|Произвести12 настоящих local4:3 иллюстраций exact batch02 per D-16 без изменения пищевого каталога.|3|18000|
|03-07|5|03-04|Произвести12 настоящих local4:3 иллюстраций exact batch03 per D-16 без изменения пищевого каталога.|3|18000|
|03-08|5|03-04|Произвести12 настоящих local4:3 иллюстраций exact batch04 per D-16 без изменения пищевого каталога.|3|18000|
|03-09|6|03-05, 03-06, 03-07, 03-08|Завершить последние3 иллюстрации и закрыть обязательный52-file/provenance/offline gate per D-16/D-17.|3|20000|
|03-10|5|03-03, 03-04|Фактические1–7 дней, mobile day/week, desktop date×4-slot grid и полная recipe card per D-10,D-11,D-12,D-13,D-18.|2|28000|
|03-11|7|03-02, 03-03, 03-09, 03-10|Завершить recovery/focus/keyboard/error states всех поверхностей и Safari15 regressions per D-07,D-12,D-13,D-17,D-18.|3|30000|
|03-12|8|03-11|Проверить целый Phase3 path и все8requirements/18решений/46edges/52UIpairs с фактической evidence per D-17/D-18.|2|23000|

Wave5 parallel:03-05/06/07/08/10. Each image plan owns distinct PNGs and batch ledger;10 reads map but owns menu/layout tests. No same-wave files overlap. Shared App/controller/menu/RecipePage/sidecar edits force earlier sequential waves. Final09 aggregates ledgers after all4 parallel producers;11 consumes full media+menu,12 validates all. Same-wave code/ledger audit is in03-PLAN-INDEX.json; external state coupling is only scoped image-tool availability, no concurrent writes to same artifact allowed. Image calls may serialize if tool quota requires, without changing ownership.

## Mandatory artifacts/symbol inventory

Exact modified paths per task and new symbols are in03-PLAN-INDEX.json. All new files below are produced by a named task; existing paths were grounded by git ls-files. New test paths are Wave0/RED of their owning task, not pre-existing runner claims.

| Producer | Required artifact | Contract |
|---|---|---|
|03-01|src/domain/generatePlan.ts|variantFingerprint; retained unique top-K; target/exclusion options; namespaced new IDs|
|03-01|src/features/generation/controller.ts|guarded selectVariant operation and current revision owner|
|03-01|e2e/phase03-variants.spec.ts|real generation/select/shopping/reload acceptance|
|03-01|src/test/fixtures/phase02-active-plan-v1.json|immutable actual legacy encoded envelope fixture|
|03-02|src/adapters/generation.ts|explicit validated request target/exclusions, shared deadline|
|03-02|src/features/generation/controller.ts|appendVariant, recreateSet with base-revision operation intent|
|03-02|e2e/phase03-append.spec.ts|actual append, recreate, cap, changed-draft confirmation|
|03-03|src/domain/recipeView.ts|resolveRecipeContext, projectRecipeView: direct/context/stale/notfound/error/incomplete tagged union|
|03-03|src/domain/planProjection.ts|per-instance ingredient allocation with shared product remainder|
|03-03|src/features/recipe/RecipePage.tsx|routed recipe details, basis-labelled4metrics, ingredients, composition, numbered steps|
|03-03|src/domain/recipeView.test.ts|independent exact numeric/context oracles|
|03-03|e2e/phase03-recipes.spec.ts|actual direct/context/unknown/stale route flows|
|03-04|public/recipes/rice-sweet-porridge.png|actual4:3 included-tool illustration with truthful original or regenerated invocation evidence|
|03-04|src/data/recipeMedia.ts|readonly52 recipeId/catalogVersion local path mapping|
|03-04|src/shared/RecipeImage.tsx|4:3 intrinsic image, eager/lazy and one-shot accessible fallback|
|03-04|docs/data/recipe-media.json|original sample provenance; final aggregate assembled in03-09|
|03-04|scripts/check-recipe-media.mjs|stdlib PNG/header/hash/local path/provenance auditor|
|03-04|e2e/phase03-media.spec.ts|sample/batch-group and full offline browser image gates|
|03-04|src/data/recipeMedia.test.ts|mapping/external-path/trust-separation tests|
|03-04|docs/data/recipe-media.md|production/disclosure/resumable review instructions|
|03-05|public/recipes/millet-sweet-porridge.png|actual original4:3 illustration for millet-sweet-porridge|
|03-05|public/recipes/semolina-smooth.png|actual original4:3 illustration for semolina-smooth|
|03-05|public/recipes/buckwheat-carrot-breakfast.png|actual original4:3 illustration for buckwheat-carrot-breakfast|
|03-05|public/recipes/rice-carrot-porridge.png|actual original4:3 illustration for rice-carrot-porridge|
|03-05|public/recipes/millet-carrot-mash.png|actual original4:3 illustration for millet-carrot-mash|
|03-05|public/recipes/semolina-carrot.png|actual original4:3 illustration for semolina-carrot|
|03-05|public/recipes/buckwheat-tomato-breakfast.png|actual original4:3 illustration for buckwheat-tomato-breakfast|
|03-05|public/recipes/flour-dry-flatbread.png|actual original4:3 illustration for flour-dry-flatbread|
|03-05|public/recipes/carrot-water-pancakes.png|actual original4:3 illustration for carrot-water-pancakes|
|03-05|public/recipes/potato-rice-breakfast.png|actual original4:3 illustration for potato-rice-breakfast|
|03-05|public/recipes/rice-millet-mix.png|actual original4:3 illustration for rice-millet-mix|
|03-05|public/recipes/potato-carrot-soup.png|actual original4:3 illustration for potato-carrot-soup|
|03-05|docs/data/recipe-media-batches/01.json|12 exact prompts/artifacts/timestamps/terms/dimensions/hashes/visual decisions|
|03-06|public/recipes/cabbage-rice-soup.png|actual original4:3 illustration for cabbage-rice-soup|
|03-06|public/recipes/beet-potato-soup.png|actual original4:3 illustration for beet-potato-soup|
|03-06|public/recipes/tomato-rice-soup.png|actual original4:3 illustration for tomato-rice-soup|
|03-06|public/recipes/buckwheat-potato-soup.png|actual original4:3 illustration for buckwheat-potato-soup|
|03-06|public/recipes/millet-cabbage-soup.png|actual original4:3 illustration for millet-cabbage-soup|
|03-06|public/recipes/potato-dumpling-soup.png|actual original4:3 illustration for potato-dumpling-soup|
|03-06|public/recipes/carrot-semolina-soup.png|actual original4:3 illustration for carrot-semolina-soup|
|03-06|public/recipes/beet-rice-pot.png|actual original4:3 illustration for beet-rice-pot|
|03-06|public/recipes/buckwheat-tomato-stew.png|actual original4:3 illustration for buckwheat-tomato-stew|
|03-06|public/recipes/millet-potato-stew.png|actual original4:3 illustration for millet-potato-stew|
|03-06|public/recipes/cabbage-potato-braise.png|actual original4:3 illustration for cabbage-potato-braise|
|03-06|public/recipes/carrot-potato-puree.png|actual original4:3 illustration for carrot-potato-puree|
|03-06|docs/data/recipe-media-batches/02.json|12 exact prompts/artifacts/timestamps/terms/dimensions/hashes/visual decisions|
|03-07|public/recipes/cabbage-buckwheat-pot.png|actual original4:3 illustration for cabbage-buckwheat-pot|
|03-07|public/recipes/rice-cabbage-pan.png|actual original4:3 illustration for rice-cabbage-pan|
|03-07|public/recipes/millet-beet-pot.png|actual original4:3 illustration for millet-beet-pot|
|03-07|public/recipes/potato-tomato-braise.png|actual original4:3 illustration for potato-tomato-braise|
|03-07|public/recipes/beet-cabbage-braise.png|actual original4:3 illustration for beet-cabbage-braise|
|03-07|public/recipes/potato-flour-cakes.png|actual original4:3 illustration for potato-flour-cakes|
|03-07|public/recipes/cabbage-flour-pancakes.png|actual original4:3 illustration for cabbage-flour-pancakes|
|03-07|public/recipes/carrot-semolina-cutlets.png|actual original4:3 illustration for carrot-semolina-cutlets|
|03-07|public/recipes/beet-flour-pancakes.png|actual original4:3 illustration for beet-flour-pancakes|
|03-07|public/recipes/buckwheat-potato-mash.png|actual original4:3 illustration for buckwheat-potato-mash|
|03-07|public/recipes/rice-carrot-dinner.png|actual original4:3 illustration for rice-carrot-dinner|
|03-07|public/recipes/millet-tomato-dinner.png|actual original4:3 illustration for millet-tomato-dinner|
|03-07|docs/data/recipe-media-batches/03.json|12 exact prompts/artifacts/timestamps/terms/dimensions/hashes/visual decisions|
|03-08|public/recipes/tomato-carrot-dumplings.png|actual original4:3 illustration for tomato-carrot-dumplings|
|03-08|public/recipes/cabbage-carrot-salad.png|actual original4:3 illustration for cabbage-carrot-salad|
|03-08|public/recipes/tomato-cabbage-salad.png|actual original4:3 illustration for tomato-cabbage-salad|
|03-08|public/recipes/carrot-tomato-salad.png|actual original4:3 illustration for carrot-tomato-salad|
|03-08|public/recipes/beet-carrot-raw-salad.png|actual original4:3 illustration for beet-carrot-raw-salad|
|03-08|public/recipes/carrot-sweet-ribbons.png|actual original4:3 illustration for carrot-sweet-ribbons|
|03-08|public/recipes/cabbage-beet-salad.png|actual original4:3 illustration for cabbage-beet-salad|
|03-08|public/recipes/tomato-carrot-cabbage-salad.png|actual original4:3 illustration for tomato-carrot-cabbage-salad|
|03-08|public/recipes/carrot-semolina-pudding.png|actual original4:3 illustration for carrot-semolina-pudding|
|03-08|public/recipes/rice-sweet-snack.png|actual original4:3 illustration for rice-sweet-snack|
|03-08|public/recipes/semolina-small-flatbread.png|actual original4:3 illustration for semolina-small-flatbread|
|03-08|public/recipes/warm-tomato-carrot.png|actual original4:3 illustration for warm-tomato-carrot|
|03-08|docs/data/recipe-media-batches/04.json|12 exact prompts/artifacts/timestamps/terms/dimensions/hashes/visual decisions|
|03-09|public/recipes/beet-sweet-warm.png|actual unique final-batch illustration|
|03-09|public/recipes/potato-cabbage-mash.png|actual unique final-batch illustration|
|03-09|public/recipes/beet-tomato-rice.png|actual unique final-batch illustration|
|03-09|docs/data/recipe-media-batches/05.json|3 final original output records|
|03-09|docs/data/recipe-media.json|complete52-entry aggregate provenance|
|03-09|docs/qa/phase03-media-review.md|52 per-recipe visual verdicts and image performance/offline evidence|
|03-09|docs/qa/phase03-media-contact-sheet.html|local labelled52-image review sheet|
|03-10|src/domain/menuView.ts|validated view/day query, actual-date default/clamp and safe return state|
|03-10|src/domain/menuView.test.ts|1..7/date/DST/same-period selection fixtures|
|03-10|src/features/menu/MealCard.tsx|single accessible instance Link with RecipeImage and shared projection facts|
|03-10|e2e/phase03-presentation.spec.ts|actual responsive day/week/card/return/geometry tests|
|03-11|e2e/phase03-recovery.spec.ts|real adapter save failure/retry/cancel/late response/reload flows|
|03-11|src/features/plan/PlanLoading.tsx|recipe loading/busy/skeleton variant|
|03-11|docs/qa/phase03-accessibility.md|actual keyboard/responsive/native limitations evidence|
|03-12|e2e/phase03-acceptance.spec.ts|one complete real multi-screen acceptance flow and numeric consistency assertions|
|03-12|docs/qa/phase03-final-validation.md|actual commands/results/timings/browser matrix and limitations|
|03-12|docs/qa/phase03-security.md|phase-unique STRIDE mitigation evidence at ASVS5 level1|
|03-12|.planning/phases/03-sravnenie-variantov-i-prosmotr-retseptov/03-VALIDATION.md|actual per-task status/evidence without fabricated Nyquist pass|

## Spec-less edge fallback —46/46 explicit predicates

03-SPEC absent; EDGE_ABSENT=true, PROHIB_ABSENT=true. Deterministic input: .tmp/phase03-edge-reqs.json, report .tmp/phase03-edge-coverage.json. No unclassified or auto-dismissals. Every row below is a plain must_haves.truths EC-ID in its owning plan, complete predicate in03-EDGE-COVERAGE.json. Actual tests/evidence filled at execution, not inferred from this table.

| Edge ID | Exact requirement/category | PLAN truth | Verification |
|---|---|---|---|
|EC-01|DATA-04/adjacency|03-01:EC-01|explicit; 03-01-01, 03-01-02, 03-01-03|
|EC-02|DATA-04/empty|03-01:EC-02|explicit; 03-01-01, 03-01-02, 03-01-03|
|EC-03|DATA-04/ordering|03-01:EC-03|explicit; 03-01-01, 03-01-02, 03-01-03|
|EC-04|DATA-04/idempotency|03-01:EC-04|explicit; 03-01-01, 03-01-02, 03-01-03|
|EC-05|DATA-04/concurrency|03-01:EC-05|explicit; 03-01-01, 03-01-02, 03-01-03|
|EC-06|GEN-06/boundary|03-01:EC-06|explicit; 03-01-01, 03-01-02, 03-01-03|
|EC-07|GEN-06/adjacency|03-01:EC-07|explicit; 03-01-01, 03-01-02, 03-01-03|
|EC-08|GEN-06/empty|03-01:EC-08|explicit; 03-01-01, 03-01-02, 03-01-03|
|EC-09|GEN-06/ordering|03-01:EC-09|explicit; 03-01-01, 03-01-02, 03-01-03|
|EC-10|GEN-06/precision|03-01:EC-10|explicit; 03-01-01, 03-01-02, 03-01-03|
|EC-11|GEN-06/idempotency|03-01:EC-11|explicit; 03-01-01, 03-01-02, 03-01-03|
|EC-12|GEN-06/concurrency|03-01:EC-12|explicit; 03-01-01, 03-01-02, 03-01-03|
|EC-13|GEN-07/adjacency|03-02:EC-13|explicit; 03-02-01, 03-02-02, 03-02-03|
|EC-14|GEN-07/empty|03-02:EC-14|explicit; 03-02-01, 03-02-02, 03-02-03|
|EC-15|GEN-07/ordering|03-02:EC-15|explicit; 03-02-01, 03-02-02, 03-02-03|
|EC-16|GEN-07/idempotency|03-02:EC-16|explicit; 03-02-01, 03-02-02, 03-02-03|
|EC-17|GEN-07/concurrency|03-02:EC-17|explicit; 03-02-01, 03-02-02, 03-02-03|
|EC-18|MENU-02/boundary|03-10:EC-18|explicit; 03-10-01, 03-10-02|
|EC-19|MENU-02/adjacency|03-10:EC-19|explicit; 03-10-01, 03-10-02|
|EC-20|MENU-02/empty|03-10:EC-20|explicit; 03-10-01, 03-10-02|
|EC-21|MENU-02/ordering|03-10:EC-21|explicit; 03-10-01, 03-10-02|
|EC-22|MENU-02/precision|03-10:EC-22|explicit; 03-10-01, 03-10-02|
|EC-23|MENU-02/idempotency|03-10:EC-23|explicit; 03-10-01, 03-10-02|
|EC-24|MENU-02/concurrency|03-10:EC-24|explicit; 03-10-01, 03-10-02|
|EC-25|MENU-03/boundary|03-10:EC-25|explicit; 03-10-01, 03-10-02|
|EC-26|MENU-03/adjacency|03-10:EC-26|explicit; 03-10-01, 03-10-02|
|EC-27|MENU-03/empty|03-10:EC-27|explicit; 03-10-01, 03-10-02|
|EC-28|MENU-03/encoding|03-10:EC-28|explicit; 03-10-01, 03-10-02|
|EC-29|MENU-03/ordering|03-10:EC-29|explicit; 03-10-01, 03-10-02|
|EC-30|MENU-03/precision|03-10:EC-30|explicit; 03-10-01, 03-10-02|
|EC-31|REC-01/boundary|03-03:EC-31|explicit; 03-03-01, 03-03-02, 03-03-03|
|EC-32|REC-01/adjacency|03-03:EC-32|explicit; 03-03-01, 03-03-02, 03-03-03|
|EC-33|REC-01/empty|03-03:EC-33|explicit; 03-03-01, 03-03-02, 03-03-03|
|EC-34|REC-01/encoding|03-03:EC-34|explicit; 03-03-01, 03-03-02, 03-03-03|
|EC-35|REC-01/ordering|03-03:EC-35|explicit; 03-03-01, 03-03-02, 03-03-03|
|EC-36|REC-01/precision|03-03:EC-36|explicit; 03-03-01, 03-03-02, 03-03-03|
|EC-37|REC-01/concurrency|03-03:EC-37|explicit; 03-03-01, 03-03-02, 03-03-03|
|EC-38|REC-02/boundary|03-03:EC-38|explicit; 03-03-01, 03-03-02, 03-03-03|
|EC-39|REC-02/adjacency|03-03:EC-39|explicit; 03-03-01, 03-03-02, 03-03-03|
|EC-40|REC-02/empty|03-03:EC-40|explicit; 03-03-01, 03-03-02, 03-03-03|
|EC-41|REC-02/ordering|03-03:EC-41|explicit; 03-03-01, 03-03-02, 03-03-03|
|EC-42|REC-02/precision|03-03:EC-42|explicit; 03-03-01, 03-03-02, 03-03-03|
|EC-43|REC-04/empty|03-03:EC-43|explicit; 03-03-01, 03-03-02, 03-03-03|
|EC-44|REC-04/encoding|03-03:EC-44|explicit; 03-03-01, 03-03-02, 03-03-03|
|EC-45|REC-04/idempotency|03-03:EC-45|explicit; 03-03-01, 03-03-02, 03-03-03|
|EC-46|REC-04/concurrency|03-03:EC-46|explicit; 03-03-01, 03-03-02, 03-03-03|

## UI consideration lift —8 categories /52 exact state pairs

The8 nonduplicated UI-01…08 must_haves.truths are in03-12; owning implementation tasks reference approved03-UI-SPEC layout/interaction/Copywriting.03-UI-COVERAGE.json preserves all52 original explicit resolutions. Same category predicate is shared, no pair silently omitted; no invented browser pass.

| Pair | Source surface/state | Shared truth | Implementation | Final gate |
|---|---|---|---|---|
|UIC-01|E1/empty|03-12:UI-01|03-01|03-12|
|UIC-02|E1/loading|03-12:UI-02|03-01|03-12|
|UIC-03|E1/error|03-12:UI-03|03-01|03-12|
|UIC-04|E1/populated|03-12:UI-04|03-01|03-12|
|UIC-05|E1/partial|03-12:UI-05|03-01|03-12|
|UIC-06|E1/overflow|03-12:UI-06|03-01|03-12|
|UIC-07|E1/zero-one-many|03-12:UI-07|03-01|03-12|
|UIC-08|E1/long-text|03-12:UI-08|03-01|03-12|
|UIC-09|E2/loading|03-12:UI-02|03-02|03-12|
|UIC-10|E2/error|03-12:UI-03|03-02|03-12|
|UIC-11|E2/overflow|03-12:UI-06|03-02|03-12|
|UIC-12|E2/long-text|03-12:UI-08|03-02|03-12|
|UIC-13|E3/empty|03-12:UI-01|03-02|03-12|
|UIC-14|E3/loading|03-12:UI-02|03-02|03-12|
|UIC-15|E3/error|03-12:UI-03|03-02|03-12|
|UIC-16|E3/partial|03-12:UI-05|03-02|03-12|
|UIC-17|E3/overflow|03-12:UI-06|03-02|03-12|
|UIC-18|E3/long-text|03-12:UI-08|03-02|03-12|
|UIC-19|E4/empty|03-12:UI-01|03-10|03-12|
|UIC-20|E4/loading|03-12:UI-02|03-10|03-12|
|UIC-21|E4/error|03-12:UI-03|03-10|03-12|
|UIC-22|E4/populated|03-12:UI-04|03-10|03-12|
|UIC-23|E4/partial|03-12:UI-05|03-10|03-12|
|UIC-24|E4/overflow|03-12:UI-06|03-10|03-12|
|UIC-25|E4/zero-one-many|03-12:UI-07|03-10|03-12|
|UIC-26|E4/long-text|03-12:UI-08|03-10|03-12|
|UIC-27|E5/empty|03-12:UI-01|03-10|03-12|
|UIC-28|E5/loading|03-12:UI-02|03-10|03-12|
|UIC-29|E5/error|03-12:UI-03|03-10|03-12|
|UIC-30|E5/populated|03-12:UI-04|03-10|03-12|
|UIC-31|E5/overflow|03-12:UI-06|03-10|03-12|
|UIC-32|E5/long-text|03-12:UI-08|03-10|03-12|
|UIC-33|E6/empty|03-12:UI-01|03-03/11|03-12|
|UIC-34|E6/loading|03-12:UI-02|03-03/11|03-12|
|UIC-35|E6/error|03-12:UI-03|03-03/11|03-12|
|UIC-36|E6/populated|03-12:UI-04|03-03/11|03-12|
|UIC-37|E6/partial|03-12:UI-05|03-03/11|03-12|
|UIC-38|E6/overflow|03-12:UI-06|03-03/11|03-12|
|UIC-39|E6/zero-one-many|03-12:UI-07|03-03/11|03-12|
|UIC-40|E6/long-text|03-12:UI-08|03-03/11|03-12|
|UIC-41|E7/empty|03-12:UI-01|03-03/11|03-12|
|UIC-42|E7/loading|03-12:UI-02|03-03/11|03-12|
|UIC-43|E7/error|03-12:UI-03|03-03/11|03-12|
|UIC-44|E7/populated|03-12:UI-04|03-03/11|03-12|
|UIC-45|E7/partial|03-12:UI-05|03-03/11|03-12|
|UIC-46|E7/overflow|03-12:UI-06|03-03/11|03-12|
|UIC-47|E7/zero-one-many|03-12:UI-07|03-03/11|03-12|
|UIC-48|E7/long-text|03-12:UI-08|03-03/11|03-12|
|UIC-49|E8/loading|03-12:UI-02|03-11|03-12|
|UIC-50|E8/error|03-12:UI-03|03-11|03-12|
|UIC-51|E8/overflow|03-12:UI-06|03-11|03-12|
|UIC-52|E8/long-text|03-12:UI-08|03-11|03-12|

## Prohibition recall / precision

Ran adversarial recall independently for all8 assigned requirements. Candidate families per requirement: persistence claims, alternatives guarantees, destructive loss framing, health claims, photographic origin, recipe rights, fact source, paid external dependency, hidden history, misleading recovery. Precision dropped routine correctness (duplicates/null/order/rounding/races/focus/path syntax) to EC tests; OWASP injection/path traversal/prototype pollution/security canonical items referred to ASVS5 threat models, not minted as bespoke prohibition. Kept6 product transparency/safety constraints. MENU-02 kept0 (date/tab correctness belongs EC; medical assertion already REC-02); REC-04 kept0 (notfound/retry/return correctness belongs EC). No auto-dismissed kept item.

03-PROHIBITIONS.json records all6 as unresolved→flagged-unverified in auto fallback. Exact installed projectProhibitions serializer used, no check_* descriptors. Projected items live in must_haves.prohibitions (not hidden negative truths), owners01/02/03/10. Independent verifier must surface these unverified flags; no automatic pass fabricated.

## Contribution rails (consumed in activeHooks array order)

1. ai-integration/API coverage: current runtime integrates no external service; included image_gen only produces checked local build assets. COVERAGE.md carries reasoned declaration if detector flags product words. No AI-SPEC: phase builds no runtime AI system.
2. assumption-delta scan3 returned detected:false; no skipped payload misread. Identity decision nevertheless explicit: primary noun is variant within current envelope; select activeVariantId references it. Existing plural representation retained, no parallel store or legacy ID rewrite.
3. schema-gate: scanned phase/research/context/files; no ORM/liveDB schema paths, no database push task invented.
4. security: ASVS5 level1/security_block_on=high; every PLAN has trust boundaries/STRIDE, phase unique T-03-01…18 and reserved T-03-SC. No installs; if scope changes legitimacy gate remains mandatory.

## Discovery / history / reversibility

Discovery Level1 satisfied by current03-RESEARCH: installed React/router declarations, Context7/official references and source patterns; no new library choice/install. PATTERNS assigns tier boundaries; pure calculations/resolver in domain, I/O/timeouts in adapters/controller, JSX only read models. Global agent-skills skills-only empty, graphify disabled. Local MealPlan Domain, approvedUI UX Pro Max and Vercel derived-state/localStorage rules used. GSD is canonical planning system; no duplicate superpowers plan directory.

Legacy schema1/key/trust retained; no mandatory persisted fields, deletion or one-way migration. Shared typed/projection interfaces rated costly where introduced, not incorrectly one-way. Newly proposed irreversible migration is outside these plans and must checkpoint before change. All pending user/human setup is zero: no credentials/subscription/service setup. Image tool availability/quotas are runtime assumptions, not declared guaranteed.

Estimate calibration actually returned factor1/sample_count0/confidence low; no subjective confidence. Code slices18–34k raw tokens, bounded media18k; no fake execution metrics. Tracer plan01 first path uses real adapters and storage; each later tracer extends a reachable user path, media batches serve actual new recipe heroes. All tasks≤5 modified paths,2–3/plan,33tasks total.

## Planned checks and evidence honesty

npm run test:unit -- --run (watch forbidden); root package scripts typecheck/lint/build confirmed. Browser tests are actual actions/data/bytes, not headings/presence. New test paths created RED by named task, profile command after each, full unit/static/build after wave, relevant browser gates. Full browser and image production can exceed60s; interactive updates/waits remain bounded. Existing365unit/15seed browser from prior acceptance are historical, must be rerun and preserved; WindowsWebKit nativeTab limits recorded by name, never Safari15 pass. Current planner ran no implementation/app/browser tests.

Pending acceptance flags:6 descriptorless product prohibitions; humanUAT/nativeSafari15/physical devices/AT/kitchen/medical evaluation; actual52image production and default solver capacity measured only in execution. These are explicit future evidence gates, no planned source item is MISSING.

