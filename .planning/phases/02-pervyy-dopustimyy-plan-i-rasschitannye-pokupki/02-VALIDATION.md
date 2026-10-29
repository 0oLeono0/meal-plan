---
phase: "02"
slug: "pervyy-dopustimyy-plan-i-rasschitannye-pokupki"
status: validated
nyquist_compliant: false
wave_0_complete: true
created: "2026-10-27"
---

# Phase 2 — Validation Strategy

Карта22 задач в10 планах/9волнах сохранена. Все10 планов исполнены; независимая приёмка ожидается.02-10: Firefox full240/240, Chromium240-case coverage; WebKit full226passed/14failed и owning38passed/2failed дают238passed/2failed из240. Две linkTab последовательности остаются failed/manual-unverified (WINDOWS15/16). Независимый plain-HTML эксперимент45777d6 воспроизвёл ограничение без приложения; orchestrator auto-mode разрешил только продолжение независимых проверок, не пользовательский pass. История halt сохранена вSUMMARY. Nyquist остаётсяfalse: два ручных подтверждения отсутствуют. Phase2 не завершена; требования открыты до независимого verifier.

## Test Infrastructure

| Property | Value |
|---|---|
| Framework | Установленные Vitest 5.0.5 / Playwright 1.64.1; новые пакеты не требуются |
| Config | package.json, playwright.config.ts, tsconfig.json, eslint.config.js |
| Quick task feedback | Реальный targeted spec из соответствующей задачи; никакого passWithNoTests/проверки только наличия файла |
| Unit release | `npm run test:unit -- --run` |
| Browser release | `npm run test:e2e -- --project=chromium`, отдельно firefox/webkit |
| Quality | `npm run typecheck`, `npm run lint`, `npm run build` |
| Runtime | Unit326/326:8.56s; races14:49.87s; storage8:46.3s. Полная matrix регистрируется отдельно в QA |

## Sampling Rate

- После задачи — её substantive targeted unit/browser cases; после нового исправления — связанные regressions.
- После волны — полный unit и необходимые затронутые browser paths; не повторять всю неизменённую матрицу без основания.
- Перед приёмкой — production build/type/lint/full unit и полный фактический браузерный путь во всех трёх проектах. Числа, время, retries и ограничения записываются честно.

## Per-Task Verification Map

Каждый spec создан substantive owning задачей. Команды выполняются из корня с существующим package.json; фактические targeted результаты находятся в SUMMARY01–10 и QA. Nonzero exit,0 collected tests, skip обязательного сценария или отсутствие ожидаемых поведенческих assertions означает failure. Каждый automated в PLAN имеет соседний fails_when; промежуточные failures сохранены и не объявляются GREEN.

| Task | Req IDs | Exact test file / root command | Threat Ref | Status |
|---|---|---|---|---|
|02-01-01|DATA-01/02/03|`npm run test:unit -- --run src/adapters/catalog.test.ts` — real USDA port/evaluator and unknown facts|T-02-01,T-02-02|passed|
|02-01-02|CALC-01/07|`npm run test:unit -- --run src/domain/quantities.test.ts src/adapters/catalog.test.ts` — exact fractions/units/codec/half-up|T-02-02|passed|
|02-02-01|APP-04,WIZ-08,DATA-03|`npm run test:unit -- --run src/domain/appliedSettings.test.ts` — precedence, first error, skip, immutable copies|T-02-03|passed|
|02-02-02|DATA-01/02,GEN-01,MENU-01|`npm run test:unit -- --run src/domain/plan.test.ts src/domain/appliedSettings.test.ts` — local dates/DST,4/28slots, unique instances|T-02-04|passed|
|02-03-01|CALC-01/03/04/05/06,SHOP-01/04|`npm run test:unit -- --run src/domain/planProjection.test.ts` — independent scale/nutrition/whole-period stock/three costs|T-02-05|passed|
|02-03-02|CALC-05/07,MENU-01/04|`npm run test:unit -- --run src/domain/presentation.test.ts src/domain/planProjection.test.ts` — raw budget bound,canonical sums,target absent/zero/>10%|T-02-06|passed|
|02-04-01|GEN-01/02/05,DATA-02|`npm run test:unit -- --run src/domain/generatePlan.test.ts` — seeded hard filters,soft preferences,independent tiny exhaustive oracle|T-02-07,T-02-09|passed|
|02-04-02|DATA-03,GEN-03/04|`npm run test:unit -- --run src/adapters/generation.test.ts src/domain/generatePlan.test.ts` — real work/event-loop yield/cancel|T-02-08|passed|
|02-05-01|DATA-02/03,MENU-01|`npm run test:unit -- --run src/adapters/activePlan.test.ts` — version/source/projected integrity,roundtrip,corrupt/write guards|T-02-10,T-02-12|passed|
|02-05-02|APP-04,GEN-03/04/05|`npm run test:unit -- --run src/features/generation/controller.test.ts src/adapters/activePlan.test.ts` — 30s,2s,races,save-before-promotion,retry-save|T-02-11|passed|
|02-06-01|DATA-01/02|`npm run test:unit -- --run src/data/sources.test.ts` — actual captured original evidence,hash,bases,scope,rights|T-02-13,T-02-14,T-02-15|passed|
|02-06-02|DATA-01/02/03,GEN-01/02|`npm run test:unit -- --run src/data/catalog.test.ts src/data/sources.test.ts` —50+ distinct full recipes,source matching,real default feasibility|T-02-13,T-02-14|passed|
|02-07-01|WIZ-08,DATA-03,GEN-01/03/04/05,MENU-01|`npm run test:e2e -- e2e/generation.spec.ts --project=chromium` — real sourced submit→save→dated menu→reload|T-02-16,T-02-17,T-02-18|passed|
|02-07-02|APP-04,WIZ-08|`npm run test:e2e -- e2e/entry-policies.spec.ts --project=chromium` — last-applied/default/invalid draft,skip preservation|T-02-16|passed|
|02-08-01|CALC-03/04/05/07,MENU-01/04|`npm run test:e2e -- e2e/menu.spec.ts --project=chromium` — dates/basis/manual bounds/provenance|T-02-19,T-02-20|passed|
|02-08-02|CALC-04/06/07,SHOP-01/04|`npm run test:e2e -- e2e/shopping.spec.ts --project=chromium` — shared totals,0/1/many,source instances,covered/partial/unknown|T-02-19,T-02-20|passed|
|02-09-01|WIZ-08,GEN-03,MENU-01|`npm run test:e2e -- e2e/products.spec.ts e2e/accessibility.spec.ts e2e/presentation.spec.ts --project=chromium` — retain Phase1 input/focus/geometry guarantees|T-02-21|passed|
|02-09-02|APP-04,GEN-04,MENU-01,SHOP-01|`npm run test:e2e -- e2e/navigation.spec.ts --project=chromium` — no-plan/presence/navigation/focus and compatible test ports|T-02-21|passed|
|02-09-03|GEN-03/04,MENU-01/04,SHOP-01/04|`npm run test:e2e -- e2e/phase02-presentation.spec.ts --project=chromium` —360/390/430/768/1199/1200/1280,keyboard,200%,long text|T-02-22|passed|
|02-10-01|APP-04,WIZ-08,GEN-03/04/05|`npm run test:e2e -- e2e/generation-races.spec.ts --project=chromium` — actual pending/cancel/late/error/30s/retry browser interactions|T-02-23|passed|
|02-10-02|DATA-02,GEN-03/04,MENU-01|`npm run test:e2e -- e2e/generation-storage.spec.ts --project=chromium` — old bytes/active/memory-only/retry-save/corrupt/dirty retry|T-02-23|passed|
|02-10-03|all20 phase IDs|`npm run test:unit -- --run`; `npm run typecheck`; `npm run lint`; `npm run build`; `npm run test:e2e -- --project=chromium`; then firefox/webkit separately|T-02-24; all mitigations|executed; 2 native WebKit cases retained failed/manual-unverified for independent phase verification|

The last row denotes separate invocations, each with its own fails_when in02-10. Фактический быстрый feedback: unit326 —8.56s, races14 —49.87s, storage8 —46.3s. Широкие02-09 группы71/44 заняли119.726890/117.946298s и не удовлетворили цели60s; полные release suites также дольше60s. Это не основание пропускать случаи или объявлять всю матрицу быстрой. Полная матрица повторно в этом документальном аудите не запускалась.

## Executed Requirement Coverage — Nyquist Audit 2026-10-29

Проверен активный `verify:post` hook `validate-phase`, state A; configured agent skills пусты. Карта ниже заменяет прежнюю плановую трактовку COVERED для двадцати phase REQ. **COVERED** означает существующий поведенческий assertion и фактически зелёный отчёт, **PARTIAL** — неполный/неуспешный тест нужного поведения, **MISSING** — тест не найден. Это покрытие назначенного фазе поведения, а не самостоятельное закрытие shared REQ во всём P0. Например, экспорт CALC-07 относится к будущей фазе. Ручные crosscutting критерии перечислены отдельно; их отсутствие не превращает проверенную арифметику MENU-04 в PARTIAL.

Корневые команды: `npm run test:unit -- --run <file>` для unit/integration файлов и `npm run test:e2e -- <file> --project=<chromium|firefox|webkit> --workers=1` для browser. Все перечисленные unit-файлы входят в фактический326/326 release; все browser-файлы — в case-identity coverage240. В остальных колонках указаны реальные имена тестов или их уникальные начала и проверяемый результат; наличие файла само по себе не считается evidence.

| Requirement | Task IDs | Test file / behavioral assertion | Status |
|---|---|---|---|
| APP-04 |02-02-01,02-07-02|`src/domain/appliedSettings.test.ts` — `quick start prioritizes only valid last applied settings...`; `e2e/entry-policies.spec.ts` — `quick start prefers last applied settings while preserving the changed draft`, `quick start opens the first invalid step...`: saved applied raw unchanged, draft bytes retained, invalid field focused|COVERED|
| WIZ-08 |02-02-01,02-07-02|`src/domain/appliedSettings.test.ts` — `skip keeps restrictions and unknown home quantity...`; `e2e/entry-policies.spec.ts` — `skip retains restrictions exclusions home quantities and global pantry`, partial home/manual cases: stored restrictions/home exact, sentinel preserved, invalid input blocks start|COVERED|
| DATA-01 |02-01-01,02-02-02,02-06-01/02|`src/adapters/catalog.test.ts` — `calculates independently asserted USDA 171287 values...` (150g→214.5/18.84/14.265/1.08); `src/data/sources.test.ts` — literal USDA/price rows; `src/data/catalog.test.ts` — fifty complete distinct recipes, references and source bases; `src/domain/plan.test.ts` — separate repeated instances|COVERED|
| DATA-02 |02-01-01,02-04-01,02-05-01,02-06|`src/domain/planProjection.test.ts` — `reports missing price and nutrient facts instead of inventing zero`; `src/data/catalog.test.ts` — nine independent source corruptions and unknown restriction failures; `src/adapters/activePlan.test.ts` — unsafe/overbudget/corrupt rejection before write|COVERED|
| DATA-03 |02-01,02-04-02,02-07,02-10-01|`src/adapters/generation.test.ts` — actual local search/macrotask abort; `e2e/generation-races.spec.ts` — `real source-backed menu and shopping run with every external runtime provider blocked`: external requests=[], same saved bytes/ID after reload|COVERED|
| CALC-01 |02-01-02,02-03-01|`src/domain/quantities.test.ts` — exact thirds/JSON, compatible normalization, explicit large-egg conversion only; `src/adapters/catalog.test.ts` — unsupported g/ml/pieces diagnosed; `src/domain/planProjection.test.ts` — kg stock and evidenced conversion|COVERED|
| CALC-03 |02-03-01,02-08-01|`src/domain/planProjection.test.ts` — `scales base2 to selected3 once...`:300g,360/30/12/33 family,120/10/4/11 portion,90kcal average over actual two-day period; `e2e/menu.spec.ts` — `synthetic independent nutrition costs and family basis...`:1000person-day/2000family literals|COVERED|
| CALC-04 |02-03-01,02-08|`src/domain/planProjection.test.ts` — aggregate500/cover200/purchase300g→100/40/60RUB; `e2e/menu.spec.ts`, `e2e/shopping.spec.ts` — independent50/20/30RUB visible and equal through real route navigation|COVERED|
| CALC-05 |02-03-02,02-04-01,02-08-01|`src/domain/presentation.test.ts` — exact500 accepted/500.0001 rejected despite equal display; raw500/canonical500.01 rejected; `src/domain/generatePlan.test.ts` — shared ledger budget gate; `e2e/menu.spec.ts` — remaining2970RUB/progress1% literals|COVERED|
| CALC-06 |02-03-01,02-08-02|`src/domain/planProjection.test.ts` — `aggregates 200+300g before spending pantry 200g once...`, cross-profile stock once; `e2e/shopping.spec.ts` — `synthetic partial stock...`, all/over/unknown/incompatible/none: capped500g coverage or full500g purchase|COVERED|
| CALC-07 |02-01-02,02-03-02,02-08|`src/domain/quantities.test.ts` — half-up cases; `src/domain/presentation.test.ts` — two0.005 rows→0.02RUB and daily canonical amount; `e2e/shopping.spec.ts` — real menu→shopping→menu→reload retains identical three totals. Export is outside this phase|COVERED|
| GEN-01 |02-02-02,02-04-01,02-06-02,02-07|`src/domain/generatePlan.test.ts` — reproducibility/catalog-order independence, target/variety/expiring-stock preferences; `src/data/catalog.test.ts` — `generates all real default slots...`:28slots,2people,exact461.9293627901234552RUB, explicit nutrient oracle; real wizard browser path saves/reloads|COVERED|
| GEN-02 |02-04-01,02-06|`src/domain/generatePlan.test.ts` — restriction/allergen/time table cases, no-fish requires seafood evidence, product exclusion before metadata; `src/data/catalog.test.ts` — unknown gluten/lactose/halal→GENERATION_DATA_INCOMPLETE, never safe|COVERED|
| GEN-03 |02-04-02,02-05-02,02-07-01,02-10-01|`src/adapters/generation.test.ts` — real macrotask abort stops transitions; `src/features/generation/controller.test.ts` —2000ms, supersession/deferred saves; `e2e/generation-races.spec.ts` — actual pending text/cancel/navigation/late result/newer success: old route/bytes/active preserved|COVERED|
| GEN-04 |02-05-02,02-07-01,02-10|`src/features/generation/controller.test.ts` — timeout exactly30000ms even ignoring abort; `e2e/generation-races.spec.ts` — `30s timeout stays pending at 29s...`, typed error/retry scenarios: actual actions, focus/settings and subsequent real save|COVERED|
| GEN-05 |02-04-01,02-07-01,02-10-01|`src/domain/generatePlan.test.ts` — independent tiny exhaustive oracle/attained minimum, lower-bound proof, exhaustion distinct; `e2e/generation-races.spec.ts` — complete/incomplete proof labels and unproved refusal opens budget step without minimum claim|COVERED|
| MENU-01 |02-02-02,02-03-02,02-08-01|`src/domain/plan.test.ts` — local midnight/DST/calendar/unique slots; `e2e/menu.spec.ts` — `real saved catalog menu has dated ordered slots and truthful provenance`:7dates/28slots and saved ID; independent synthetic date/person/budget/absent norm/source basis assertions|COVERED|
| MENU-04 |02-03-02,02-08-01|`src/domain/presentation.test.ts` — all four metrics exact110% no warning,110%+epsilon warning, absent/zero safe; `e2e/menu.spec.ts` — `synthetic target exact-ten/above-ten/zero-positive...`, visible textual warning count and family day nutrition/cost literals|COVERED|
| SHOP-01 |02-03-01,02-08-02|`src/domain/planProjection.test.ts` — compatible aggregation and separate date/slot instance contributions; `e2e/shopping.spec.ts` —500−200=300g, four dated125g sources,1/2/4source grammar, duplicate names preserved by ID, six categories|COVERED|
| SHOP-04 |02-03-01,02-08-02|`e2e/shopping.spec.ts` — `synthetic partial stock...`: initially collapsed native details then200g/20RUB; all/over cover capped500g/50RUB; unknown/incompatible reasons without invented coverage; `src/domain/planProjection.test.ts` asserts same capped exact costs|COVERED|

Итог по назначенным phase REQ:20 COVERED,0 PARTIAL,0 MISSING. Новых отсутствующих автоматических тестов аудит не выявил, новые tests/fixtures не создавались. Обязательные crosscutting keyboard predicates ниже остаются PARTIAL/manual-unverified; поэтому `nyquist_compliant:false` сохраняется. Ни один REQ checkbox в REQUIREMENTS этим аудитом не изменён.

### Evidence Integrity and Run Boundaries

Аудитор повторно прочитал raw JUnit и сверил SHA256 всех8 файлов из `.tmp/02-10-release-evidence.json`:8/8 совпали. Это документальный recheck существующих выполненных команд, не новый запуск suites. Исходный unit log подтверждает326passed/16files/8.56s. Case overlays сверены с именами текущих тестов; не складываются как новые уникальные случаи.

| Report | Actual observed result | Seconds |
|---|---|---|
| `.tmp/02-10-release-chromium-final.xml` |225passed,0failed,0skipped; исходная коллекция|395.760903|
| `.tmp/02-10-chromium-affected-final.xml` |132passed; вместе с108unchanged покрывает текущие240,missing0/unexpected0|247.765827|
| `.tmp/02-10-release-firefox-final.xml` |240passed,0failed,0skipped; full,1worker|986.799644|
| `.tmp/02-10-release-webkit-final.xml` |226passed/14failed,0skipped; исходный full240|1081.932577|
| `.tmp/02-10-webkit-presentation-final.xml` |38passed/2failed,0skipped; owning40; overlay200+40=238passed/2failed|292.281763|

Предыдущий Firefox225case run198passed/27failed также сохранён и hash-verified, не назван успешным. Final End smoke Chromium2/2 —18.858061s, Firefox2/2 —27.674407s. Утверждения о full240 Chromium single run или WebKit240/240 pass отсутствуют.

### Source Assertions versus Synthetic Oracles

Source evidence: `src/data/sources.test.ts` независимо задаёт48 nutrient values и12 фактических RUB observations, проверяет захваченные excerpts/hashes/reference/scope; `src/data/catalog.test.ts` проверяет девять раздельных corruptions,50+ полный corpus и настоящий adapter generation. Приведённые tests не доказывают online актуальность цены, открытую лицензию price database или кухонную пригодность; original acquisition/review и ограничения зафиксированы в02-06-SUMMARY и `docs/data/phase02-sources.md`. Archived excerpt hash не является проверкой наличия полного ZIP/XLS в runtime.

Synthetic evidence: `planProjection.test.ts`, `presentation.test.ts` и `e2e/plan-fixtures.ts` задают независимые численные крайние случаи; они доказывают алгоритм и отображение, не происхождение production facts. Настоящие browser generation/reload/external-provider-block paths перечислены отдельно. Ни числовой fixture, ни structurally distinct recipe fingerprint не заменяет исходный52/52 content review. Ограниченный12-profile plant corpus и низкая энергия/жиры не объявляются полноценным рационом.

## Data and Numerical Oracles

- USDA original ZIP реально получен в research; его hash/52 extracted observations — source evidence, не готовый российский food/price/safety catalog.
- Синтетические fixture prices/nutrients допустимы для независимых численных тестов с явной маркировкой. Они не попадают в production catalog и не закрывают DATA-01/02.
- Price snapshot требует фактических source values/reference unit/region-or-explicit-web-scope/date. TLS/403 не обходятся. До получения доказательства допускаются безопасные независимые работы, но не успешная приёмка неподтверждённого каталога.
- Обязательны примеры без pantry/с частичным/избыточным/unknown/incompatible запасом, повтор recipeId в разных instances, дробные единицы и деньги у границы лимита, отсутствие/частичная/полная manual norm, incomplete safety/price/nutrients.
- Ни один эвристический результат не называется глобальным минимумом или доказательством невозможности без соответствующего основания.

## Wave 0 Requirements

- Существующая инфраструктура есть; substantive Phase 2 specs/fixtures создаются owning задачами, не пустыми заглушками.
- Planner обязан назначить создание каждого будущего тестового файла раньше первого запуска и исключить лишние новые dependencies.
- Сохранить Phase 1 storage/retry/focus/skip-link/regression contracts, а намеренно изменившиеся placeholder states обновить адресно.

## Manual-Only / External Evidence

| Behavior | Requirement | Why separate | Instructions |
|---|---|---|---|
| Provenance/meaning of curated food/price/safety records | DATA-01/02 | Source acquisition/content review выполнены отдельно02-06, а не synthetic spec | Evidence закрыто в ограниченном scope12profiles/52recipes; медицинская/кухонная оценка не заявляется |
| New menu/shopping usability and real-device presentation | MENU-01/04, SHOP-01/04 | Phase 1 user UAT не является будущей Phase 2 приёмкой | Проверять новые экраны после реализации; не переписывать прежние результаты |
| LCP / historical Safari / screen-reader limits | Applicable UI criteria | Фактическая среда/методика должны быть названы | Не выдавать emulation/build target за реальное устройство/браузер; численные результаты не выдумывать |
| Native sequential Tab/ShiftTab through saved screen navigation |02-09-03 /02-10-03; crosscutting keyboard predicate, WINDOWS15 | **PARTIAL / ESCALATED environmental gate:** `phase02 sequential Tab ShiftTab Space and Enter traverse saved screens and navigation` failed at nav anchor «Дома» | Запустить этот неизменённый тест/реальную последовательность на подходящем WebKit/Safari c полным обходом ссылок; подтвердить Tab/ShiftTab/Space/Enter, видимый фокус и отсутствие перекрытий |
| Native sequential Tab/ShiftTab through generation recovery |02-09-03 /02-10-03; crosscutting keyboard predicate, WINDOWS16 | **PARTIAL / ESCALATED environmental gate:** `phase02 sequential Tab ShiftTab and Enter traverse generation recovery` failed reaching «К текущему меню» | Подтвердить настоящий клавиатурный обход error/recovery ссылок в подходящей среде; `.focus()` не заменяет Tab |

Два failed теста не SKIP и не FILLED. BLOCKER для автоматического sign-off полной матрицы; дефект приложения не установлен: отдельный plain HTML воспроизводит пропуск anchors без MealPlan (assessment и raw JSON). Chromium/Firefox фактический обход пройден. Новых debug iterations в этом документальном аудите0; повторять уже диагностированное ограничение среды три раза не даёт нового evidence. Требуются подходящая среда/наблюдение, без изменений реализации или ослабления assertions. WINDOWS14 (новая UAT/устройства/Safari15/screen-reader/native zoom/LCP) также остаётся открытым; generic human checks не используются для искусственного PARTIAL арифметических REQ.

## Validation Sign-Off

- [x] Точная карта22 задач/20 REQ и secure behaviors заполнена, первые21 owning проверки подтверждены.
- [x] Реальные проверки и source evidence выполнены; coverage-only tests не объявляются продуктовым RED.
- [x] Production catalog12profiles/52recipes проверен в указанном ограниченном scope; unknown не подменён фактами.
- [x] Браузеры/type/lint/build фактически запускались; failures и ограничения названы.
- [ ] Две обязательные native linkTab последовательности подтверждены в подходящей WebKit/Safari среде.
- [ ] Независимая приёмка фазы выполнена.

## Dependency / Ownership Allocation

| Wave | Plans | Needs → creates |
|---|---|---|
|1|02-01|verified USDA proof + installed stack → exact/source-aware ingredient adapter trace|
|2|02-02|01 contracts → immutable applied inputs/date/instances/shared operation types|
|3|02-03|02 inputs → one projection and canonical presentation|
|4|02-04,02-05|03 evaluator → bounded cooperative solver; independently guarded storage/controller|
|5|02-06|04 real evaluator/search → acquired provenance +50+ reviewed corpus + actual feasibility|
|6|02-07|05 lifecycle +06 passed data gate → real submit/save/menu flow|
|7|02-08|07 active UI → complete shared menu/shopping states|
|8|02-09|08 screens → retained Phase1 regressions and responsive/accessibility checks|
|9|02-10|09 UI → controlled browser faults and actual release evidence|

Only wave4 is parallel;04 modifies generatePlan/generation files and05 modifies activePlan/controller files, with no overlap. All other shared-file edits are in strictly later waves. Global pantry/recipe-edit/PDF/variants UI remain in their assigned later phases. No branch/worktree mutation is part of these plans. No external runtime API/SDK/service integration is introduced: adapters are local, source acquisition is offline build-time curation. No ORM/live database or schema-push gate applies. Existing16 approved installed pins require no new package checkpoint.

### Canonical Interface Allocation

-01 owns `CatalogPort`/source-aware contracts; `load()` gives ready/incomplete/error, `lookup(profileId)` can return nutrient evidence with explicitly unknown other fields. It cannot certify generation readiness from lookup success.
-02 `src/domain/plan.ts` owns `GenerationRequest {requestId,inputs:PlanInputs}`, `GenerationError`, `GenerationResult` and `GenerationPort.generate(request,signal):Promise<GenerationResult>`.04 and05 import these common types; no competing local definitions. Result statuses success/error/cancelled; errors preserve data/no-recipes/exhaustion/budget/timeout/failure distinctions and budget proof kind.
-05 owns `ActivePlanPort.load()` missing/loaded/corrupt/error and `save(plan,{isCurrent})` saved/blocked/error/cancelled. Mutation checks ownership immediately before write. `createGenerationController` exposes subscribe/getSnapshot/load/retryLoad/start/cancel/retryGeneration/retrySave/dispose.07 uses these; test modules inject the same contracts.
-03 owns the sole whole-plan projection and formatting contracts consumed by04/05/07/08. All snapshots preserve exact inputs/source references; derived cached totals never become authority.

## Multi-Source Coverage Audit

Ниже сохранена историческая multi-source allocation карта PLAN/CONTEXT/RESEARCH: её COVERED означает назначение задачи, а не самостоятельное выполненное доказательство. Авторитетная текущая карта20 REQ с фактическими assertions находится в `Executed Requirement Coverage` выше. Для дополнительных context/research строк эта таблица не утверждает новый test pass. No deferred idea is promoted.

|SOURCE|ID|Feature / constraint|Plan / task|Status|
|---|---|---|---|---|
|GOAL|Phase2|Допустимое меню выбранного периода и проверяемые расчёты меню/закупки через local adapters|01–10; production path07/08|COVERED|
|REQ|APP-04|One-click last-applied/current/default and first invalid step|02-02-01,02-07-02|COVERED|
|REQ|WIZ-08|Skip retains constraints/home and starts valid snapshot|02-02-01,02-07-02|COVERED|
|REQ|DATA-01|Stable IDs/reference units/source/yield|02-01-01,02-06-01/02|COVERED|
|REQ|DATA-02|Unknown not zero/safe; validated boundaries|02-01-01,02-04-01,02-05-01,02-06|COVERED|
|REQ|DATA-03|Local real computation without paid runtime API|02-01,02-04-02,02-07|COVERED|
|REQ|CALC-01|Dimension-safe exact quantities|02-01-02,02-03-01|COVERED|
|REQ|CALC-03|Nutrition portion/family/day/actual-period mean|02-03-01,02-08-01|COVERED|
|REQ|CALC-04|Ingredient/stock/purchase costs|02-03-01,02-08|COVERED|
|REQ|CALC-05|Exact hard family-period purchase budget/remainder|02-03-02,02-04-01,02-08-01|COVERED|
|REQ|CALC-06|Aggregate period,subtract stock once,nonnegative|02-03-01,02-08-02|COVERED|
|REQ|CALC-07|Canonical rows/half-up/shared display|02-01-02,02-03-02,02-08|COVERED|
|REQ|GEN-01|Reproducible settings/catalog/seed,all preferences|02-04-01,02-06-02,02-07-01|COVERED|
|REQ|GEN-02|Hard safety/exclusions/allergens,unknown blocked|02-04-01,02-06|COVERED|
|REQ|GEN-03|Actual pending/cancel/no late apply|02-04-02,02-05-02,02-07-01,02-10-01|COVERED|
|REQ|GEN-04|30s timeout/errors/retry/settings|02-05-02,02-07-01,02-10|COVERED|
|REQ|GEN-05|Budget action/proved minimum/honest exhaustion|02-04-01,02-07-01,02-10-01|COVERED|
|REQ|MENU-01|Date/budget/remainder/mean/estimate/source scope|02-02-02,02-08-01|COVERED|
|REQ|MENU-04|Day nutrition/cost/strict>10% textual warning|02-03-02,02-08-01|COVERED|
|REQ|SHOP-01|Compatible product rows and date/slot instance sources|02-03-01,02-08-02|COVERED|
|REQ|SHOP-04|Collapsed covered stock quantity/value|02-03-01,02-08-02|COVERED|
|CONTEXT|D-01|Immutable apply/draft separation|02-02-01,02-07|COVERED|
|CONTEXT|D-02|Quick-start precedence/old active preservation|02-02-01,02-05,02-07-02|COVERED|
|CONTEXT|D-03|Preserving skip|02-02-01,02-07-02|COVERED|
|CONTEXT|D-04|Family-period purchase limit/three sums|02-03,02-08|COVERED|
|CONTEXT|D-05|Local dates/four slots/person-day/family basis|02-02-02,02-03,02-08-01|COVERED|
|CONTEXT|D-06|Optional soft manual target/no averages/>10%/zero|02-03-02,02-04-01,02-08-01|COVERED|
|CONTEXT|D-07|Offline versioned source/reference validation|02-01-01,02-06,02-05-01|COVERED|
|CONTEXT|D-08|Actual free primary evidence/no invented facts|02-01-01,02-06-01|COVERED|
|CONTEXT|D-09|BaseServings/scaling/50+original corpus|02-02-02,02-03-01,02-06-02|COVERED|
|CONTEXT|D-10|Five restrictions/allergens/exclusions/evidence|02-04-01,02-06|COVERED|
|CONTEXT|D-11|Hard per-recipe time/soft early expiresSoon|02-04-01,02-06-02|COVERED|
|CONTEXT|D-12|Period stock once/unknown/incompatible/not consumed|02-01-02,02-03-01,02-08-02|COVERED|
|CONTEXT|D-13|Settings/catalog/seed determinism/stable ties|02-04-01/02|COVERED|
|CONTEXT|D-14|Three soft variety policies/future variants-ready|02-02-02,02-04-01|COVERED|
|CONTEXT|D-15|Truthful budget proof/lower bound/exhaustion|02-04-01,02-07-01,02-10-01|COVERED|
|CONTEXT|D-16|Request/cancel/30s/2s/current save/deep reload|02-04-02,02-05-02,02-07-01,02-10|COVERED|
|CONTEXT|D-17|Exact precision/codec/half-up/canonical ledger|02-01,02-03|COVERED|
|CONTEXT|D-18|Versioned full snapshots/real presence/memory-only/retry|02-02-02,02-05,02-07,02-10-02|COVERED|
|CONTEXT|D-19|One projection,basic real menu/shopping,source instances|02-03,02-08|COVERED|
|CONTEXT|D-20|Independent numeric/source/browser/regression evidence|all tasks,02-09/10 release|COVERED|
|RESEARCH|R-01|Existing stack/no new packages/typed local ports|01–10; shared interfaces above|COVERED|
|RESEARCH|R-02|Real USDA archive/CC0/FDC nutrient IDs/edible reference|02-01-01,02-06-01|COVERED|
|RESEARCH|R-03|Rosstat TLS failures not bypassed/repeated as guaranteed success; alternate actual primaries|02-06-01|COVERED|
|RESEARCH|R-04|Price provenance/actual scope/date/units/reuse; retailer403 limits|02-06-01,02-08|COVERED|
|RESEARCH|R-05|Identity/raw/cooked/cut/egg/volume mappings not guessed|02-01,02-06|COVERED|
|RESEARCH|R-06|50+distinct original full recipes and four-slot coverage|02-06-02|COVERED|
|RESEARCH|R-07|Source-specific safety; no blanket halal/gluten/lactose classification|02-04-01,02-06|COVERED|
|RESEARCH|R-08|Rational BigInt/string codec and resource bounds|02-01-02,02-05-01|COVERED|
|RESEARCH|R-09|Whole-period ledger and raw+canonical budget boundary|02-03|COVERED|
|RESEARCH|R-10|Bounded beam/work/yield,stable tie,proof vs exhaustion,benchmark|02-04|COVERED|
|RESEARCH|R-11|Save-before-promotion,serialized writes/current guards,CR-01 preservation|02-05,02-07,02-10-02|COVERED|
|RESEARCH|R-12|Exact-version immutable source snapshot/recompute on load|02-02-02,02-05-01|COVERED|
|RESEARCH|R-13|Independent unit oracles and real offline/browser path|01–10|COVERED|
|RESEARCH|R-14|Trust boundaries/ASVS1/unique STRIDE IDs|every PLAN; T-02-01…24 plus reservedSC|COVERED|
|RESEARCH|R-15|Material source blocker cannot be passed by synthetic tests|02-06,02-10-03|COVERED|

## Approved UI Predicate Allocation

| Predicate group | Owning implementation / evidence |
|---|---|
|Valid final submit/quick-start/invalid first step/preserving skip/dirty draft|02-07 plus02-02 tests;02-09 preserves old input assertions|
|Pending/2s/no duplicate submit/cancel/focus/30s/no-current deep reload|02-05 controller,02-07 UI,02-10-01 actual browser|
|Data/no-recipes/search/budget errors and correct actions/proof labels|02-04,02-07,02-10-01|
|Saved success/old active/memory-only/retry-save/load pending/corrupt/error|02-05,02-07,02-10-02|
|Actual1–7dates/four slots/people/portion/family/day/mean basis|02-02,02-03,02-07/08|
|Three sums/raw hard limit/canonical rows/remainder/0–100%budget|02-03,02-08|
|Manual absent/exact+10%/above/zero macros/nonnumeric target error|02-02/03,02-08-01|
|Estimated prices/actual regions-periods/reference records/longURLs|02-06 provenance,02-08 views,02-09 geometry|
|Purchase categories/missing/partial/instance sources/covered details|02-03,02-08-02|
|Unknown/incompatible stock/all-covered0 and0/1/many nouns|02-03,02-08-02|
|Empty/loading/error/populated/partial/overflow/zero-one-many/long-text|02-07/08/09,02-10 faults|
|360/390/430/768/1199/1200/1280,44px/48px,200%,keyboard,sticky reserves|02-09-03 and release02-10-03|

## Data Gate Semantics

02-01 is a production-quality ingredient calculation through actual USDA evidence, without claiming price/safety/catalog readiness.02-02…05 are useful independently testable domain/adapter capabilities.02-06 acquisition and50+corpus are substantive mandatory tasks. If lawful free source-ready data cannot be obtained, record precise material/attempted alternatives and stop dependent production acceptance; do not mark the task complete, lower the corpus target, bypass TLS/403, replace facts with fixtures or treat a blocked result as success.02-07 depends on02-06 explicitly. This planned gate is not hypothetical human approval and is not an automatic source certification.

## Validation Audit 2026-10-29

| Metric | Count |
|---|---|
| Gaps found | 2 |
| Resolved | 0 |
| Escalated | 2 |
