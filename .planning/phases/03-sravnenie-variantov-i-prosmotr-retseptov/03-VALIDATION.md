---
phase: "03"
slug: "sravnenie-variantov-i-prosmotr-retseptov"
status: validated
nyquist_compliant: false
wave_0_complete: true
created: "2026-11-04"
last_delta_audit: "2026-11-11"
---

# Phase 03 — Validation Strategy

## Актуализация после пользовательской приёмки 11.11.2026

Дельта аудита охватывает quick261110-m4g и завершённую `03-UAT.md`. Существующая карта 33 задач и восьми требований сохранена. Общий `CalculationNote` подключён в PlanSummary и RecipePage. Новая meaningful browser-проверка `e2e/calculation-note.spec.ts` проверяет меню, покупки, рецепт, раскрытие, неизменность сохранённых bytes и отсутствие горизонтального overflow. В quick SUMMARY зафиксированы 9/9 flow на Chromium/Firefox/WebKit при360/768/1280, unit480/480, typecheck/lint/build exit0. Старое keyboard-ожидание дополнено новым summary в tab order, адресные Chromium/Firefox проверки прошли. Новых пробелов покрытия в изменённой области не найдено.

`03-UAT.md` завершена с10/10 явно подтверждёнными пользователем pass, issues/pending/skipped/blocked0. UAT2 покрывает native Safari keyboard и WINDOWS15/16/24/25, UAT3 реальные устройства/AT/zoom/safe-area, UAT4 крайние длинные состояния UIC12/18/51/52, UAT5…10 шесть descriptorless prohibitions. Человеческие gates закрыты этими отдельными пользовательскими результатами. Автоматические WindowsWebKit failures сохранены в исторических строках карты и QA. Полный post-fix960 не запускался. `nyquist_compliant:false` сохраняет ограничение полной автоматической проверки, status validated отражает завершённый аудит покрытия с manual-only evidence.

Ранее приведённые pending/open утверждения относятся к датированным запускам09.11.2026. Для текущей пользовательской приёмки применяется завершённая UAT. Этот аудит не выполняет переход фазы и не меняет shared requirement statuses.

Свежая последовательность stale regeneration11.11.2026 выполнена до независимого verifier. verify:post рассмотрен в порядке Nyquist → security → UI. Существующий UIreview повторно использован по документированному auto/View пути. Независимый gsd-code-reviewer проверил12файлов дельтыec24f1b..b49dc88, новых findings0. Official code-review-disposition script подтвердил0open из2исторических findings, CR-01/WR-01fixed. Gap-closure step исключён section_manifest для целойPhase03. Regression manifest-gate собрал36prior-phase test references и выполнил нормализованную configured command `npm run test:unit -- --run` через official run-with-timeout600s. Результат480/480,20files,11.59s,exit0, log `.tmp/03-post-uat-regression.log`. Это unit regression gate. Свежие typecheck/lint/build exit0 записаны в `.tmp/03-post-uat-{typecheck,lint,build}.log`. Build сохраняет существующий advisory512.32kB chunk. Новых browser/media прогонов в этой актуализации нет.

Контракт обратной связи; фактические результаты заполняются при исполнении. Источник: 03-RESEARCH.md, Validation Architecture. Это не отчёт о пройденных тестах.

## Test Infrastructure

| Property | Value |
|---|---|
| Framework | Vitest5.0.5, Playwright1.64.1 |
| Config | vite.config.ts; playwright.config.ts |
| Quick run | `npm run test:unit -- --run src/domain/plan.test.ts src/domain/generatePlan.test.ts src/domain/planProjection.test.ts src/adapters/activePlan.test.ts src/features/generation/controller.test.ts` |
| Full suite | `npm run test:unit -- --run` |
| Browser | `npm run test:e2e -- --workers=2` |
| Static/build | `npm run typecheck`, `npm run lint`, `npm run build` |
| Runtime | Измерить при исполнении; 365 прежних unit прошли за10.52s, это не обещание для новых |

## Sampling Rate

После каждого task — профильные unit без watch и typecheck; после wave — полный unit, релевантные реальные браузерные сценарии, lint/build. Обратная связь профильного unit желательна <30s: при превышении делить по файлам. Browser generation tests получают подходящий локальный timeout; production deadline30s не ослабляется. RED должен быть зафиксирован до доменной правки, GREEN — после. Полный актуальный набор перед приёмкой.

## Per-Task Verification Map

Plan/task/wave и phase-unique threat IDs назначены конечными PLAN; статус всех задач pending до реального исполнения. Карта не означает пройденные tests.

| Task | Wave | Requirements | Threat Ref | Automated command | Status |
|---|---|---|---|---|---|
|03-01-01|1|DATA-04, GEN-06, MENU-03|T-03-01, T-03-02, T-03-SC|`npm run test:e2e -- e2e/phase03-variants.spec.ts --project=chromium --workers=1`|passed2026-11-05:2/2Chromium; real+legacy|
|03-01-02|1|DATA-04, GEN-06, MENU-03|T-03-01, T-03-02, T-03-SC|`npm run test:unit -- --run src/domain/plan.test.ts src/domain/generatePlan.test.ts`|passed2026-11-05:68/68|
|03-01-03|1|DATA-04, GEN-06, MENU-03|T-03-01, T-03-02, T-03-SC|`npm run test:unit -- --run src/adapters/activePlan.test.ts src/features/generation/controller.test.ts`|passed2026-11-05:70/70|
|03-02-01|2|GEN-07, DATA-04, GEN-06|T-03-03, T-03-04, T-03-SC|`npm run test:e2e -- e2e/phase03-append.spec.ts --project=chromium --workers=1`|PASS: actual append/no-new/reload; final7/7; QA plan02|
|03-02-02|2|GEN-07, DATA-04, GEN-06|T-03-03, T-03-04, T-03-SC|`npm run test:e2e -- e2e/phase03-append.spec.ts --project=chromium --workers=1`|PASS: cap11→12, confirm/cancel/focus/quota/draft/ack; final7/7; QA plan02|
|03-02-03|2|GEN-07, DATA-04, GEN-06|T-03-03, T-03-04, T-03-SC|`npm run test:unit -- --run src/adapters/generation.test.ts src/features/generation/controller.test.ts`|PASS:75/75; RED71/5fail→GREEN; QA plan02|
|03-03-01|3|DATA-04, REC-01, REC-02, REC-04, MENU-03|T-03-05, T-03-06, T-03-SC|`npm run test:e2e -- e2e/phase03-recipes.spec.ts --project=chromium --workers=1`|PASS: actual click saved triple/direct/error2/2 + tracer rerun2/2; QA plan03|
|03-03-02|3|DATA-04, REC-01, REC-02, REC-04, MENU-03|T-03-05, T-03-06, T-03-SC|`npm run test:unit -- --run src/domain/planProjection.test.ts src/domain/recipeView.test.ts`|PASS: focused42, final full461; canonical conservation/profile/unit/basis, cap12 reuse and mutation guard; QA plan03|
|03-03-03|3|DATA-04, REC-01, REC-02, REC-04, MENU-03|T-03-05, T-03-06, T-03-SC|`npm run test:e2e -- e2e/phase03-recipes.spec.ts --project=chromium --workers=1`|PASS app scope: final integrated7/8 plus corrected malformed client-route focused1/1; Vite hardGET malformed path HTTP404 limitation retained; QA plan03|
|03-04-01|4|MENU-03, REC-01, DATA-04|T-03-07, T-03-08, T-03-SC|`npm run test:e2e -- e2e/phase03-media.spec.ts --grep sample --project=chromium --workers=1`|PASS historical06Nov Chromium2/2 decode/disclosure/404 geometry, plan04 QA; existing evidence reused, no fresh browser run|
|03-04-02|4|MENU-03, REC-01, DATA-04|T-03-07, T-03-08, T-03-SC|`npm run test:unit -- --run src/data/recipeMedia.test.ts`|PASS historical focused4/4, expanded5 included in latest478/478; fresh09Nov media auditor52/fulltrue; no fresh unit run|
|03-05-01|5|MENU-03, REC-01|T-03-09, T-03-SC|`npm run test:e2e -- e2e/phase03-media.spec.ts --grep batch-01-01 --project=chromium --workers=1`|PASS:2026-11-06 Chromium batch01 all3/3;scoped audit12;QA plan05|
|03-05-02|5|MENU-03, REC-01|T-03-09, T-03-SC|`npm run test:e2e -- e2e/phase03-media.spec.ts --grep batch-01-02 --project=chromium --workers=1`|PASS:2026-11-06 Chromium batch01 all3/3;scoped audit12;QA plan05|
|03-05-03|5|MENU-03, REC-01|T-03-09, T-03-SC|`npm run test:e2e -- e2e/phase03-media.spec.ts --grep batch-01-03 --project=chromium --workers=1`|PASS:2026-11-06 Chromium batch01 all3/3;scoped audit12;QA plan05|
|03-06-01|5|MENU-03, REC-01|T-03-10, T-03-SC|`npm run test:e2e -- e2e/phase03-media.spec.ts --grep batch-02-01 --project=chromium --workers=1`|PASS:2026-11-06 Chromium batch02 all3/3;scoped audit12;QA plan06|
|03-06-02|5|MENU-03, REC-01|T-03-10, T-03-SC|`npm run test:e2e -- e2e/phase03-media.spec.ts --grep batch-02-02 --project=chromium --workers=1`|PASS:2026-11-06 Chromium batch02 all3/3;scoped audit12;QA plan06|
|03-06-03|5|MENU-03, REC-01|T-03-10, T-03-SC|`npm run test:e2e -- e2e/phase03-media.spec.ts --grep batch-02-03 --project=chromium --workers=1`|PASS:2026-11-06 Chromium batch02 all3/3;scoped audit12;QA plan06|
|03-07-01|5|MENU-03, REC-01|T-03-11, T-03-SC|`npm run test:e2e -- e2e/phase03-media.spec.ts --grep batch-03-01 --project=chromium --workers=1`|PASS:2026-11-07 Chromium batch03 all3/3;scoped audit12;QA plan07|
|03-07-02|5|MENU-03, REC-01|T-03-11, T-03-SC|`npm run test:e2e -- e2e/phase03-media.spec.ts --grep batch-03-02 --project=chromium --workers=1`|PASS:2026-11-07 Chromium batch03 all3/3;scoped audit12;QA plan07|
|03-07-03|5|MENU-03, REC-01|T-03-11, T-03-SC|`npm run test:e2e -- e2e/phase03-media.spec.ts --grep batch-03-03 --project=chromium --workers=1`|PASS:2026-11-07 focused1/1;final Chromium batch03 all3/3;scoped audit4+12;unit465;QA plan07|
|03-08-01|5|MENU-03, REC-01|T-03-12, T-03-SC|`npm run test:e2e -- e2e/phase03-media.spec.ts --grep batch-04-01 --project=chromium --workers=1`|PASS:2026-11-07 focused1/1+tracer1/1;final batch04 Chromium3/3;scoped audit4+12;typecheck;QA plan08|
|03-08-02|5|MENU-03, REC-01|T-03-12, T-03-SC|`npm run test:e2e -- e2e/phase03-media.spec.ts --grep batch-04-02 --project=chromium --workers=1`|PASS:2026-11-07 focused1/1;final batch04 Chromium3/3;scoped audit4+12;typecheck;QA plan08|
|03-08-03|5|MENU-03, REC-01|T-03-12, T-03-SC|`npm run test:e2e -- e2e/phase03-media.spec.ts --grep batch-04-03 --project=chromium --workers=1`|PASS:2026-11-07 focused1/1;final batch04 Chromium3/3;scoped audit4+12;unit465;typecheck/lint/build;QA plan08|
|03-09-01|6|MENU-03, REC-01, DATA-04|T-03-13, T-03-SC|`npm run test:e2e -- e2e/phase03-media.spec.ts --grep batch-05-01 --project=chromium --workers=1`|PASS2026-11-07:3native1448×1086 PNG+originalprompt/time/artifact/hash/review;scoped3;Chromiuminitial+tracer1/1;finalsample/group3/3;QA03-09|
|03-09-02|6|MENU-03, REC-01, DATA-04|T-03-13, T-03-SC|`npm run test:e2e -- e2e/phase03-media.spec.ts --grep full-media --project=chromium --workers=1`|PASS2026-11-07:52realheroes/52imageURLs,allnonlocalblocked,0fallback;exact52files/uniquehashes/provenance;unitmedia5/full478;type/lint/build;fullnetworkoffline unsupportedno-cache,notclaimed;QA03-09|
|03-09-03|6|MENU-03, REC-01, DATA-04|T-03-13, T-03-SC|`node scripts/check-recipe-media.mjs --all`|PASS2026-11-07:checked52/fulltrue,52perrecipevisualverdicts+5contactgroupsviewed;123844749bytes;humanUATpending;WINDOWS22fixed,23focusopen;QA03-09|
|03-10-01|5|MENU-02, MENU-03, DATA-04, REC-01|T-03-14, T-03-15, T-03-SC|`npm run test:e2e -- e2e/phase03-presentation.spec.ts --project=chromium --workers=1`|PASS affected5cases in final8/8;real7dates/images5widths;exactcontext/back;REDverified;QA plan10;media49/52pending03-09|
|03-10-02|5|MENU-02, MENU-03, DATA-04, REC-01|T-03-14, T-03-15, T-03-SC|`npm run test:unit -- --run src/domain/menuView.test.ts src/domain/presentation.test.ts`|PASS26focused;full477/type/lint/build0;final8/8affectedflows;baselinecancel-focusopenWINDOWS23;8paths excluded notverified|
|03-11-01|7|DATA-04, GEN-06, GEN-07, MENU-02, MENU-03, REC-01, REC-02, REC-04|T-03-16, T-03-17, T-03-SC|`npm run test:e2e -- e2e/phase03-recovery.spec.ts --project=chromium --workers=1`|PASS08Nov:8/8Chromium;final all3engines24/24;legacy8+recovery8=16/16;RED/GREEN QA accessibility;WINDOWS23fixed|
|03-11-02|7|DATA-04, GEN-06, GEN-07, MENU-02, MENU-03, REC-01, REC-02, REC-04|T-03-16, T-03-17, T-03-SC|`npm run test:e2e -- e2e/phase03-recipes.spec.ts --project=chromium --workers=1`|PASS08Nov:8/8Chromium+8/8Firefox;WebKit7/8,exact nativeTab failure retained WINDOWS25;QA accessibility|
|03-11-03|7|DATA-04, GEN-06, GEN-07, MENU-02, MENU-03, REC-01, REC-02, REC-04|T-03-16, T-03-17, T-03-SC|`npm run test:e2e -- e2e/phase03-presentation.spec.ts --workers=1`|LIMITED08Nov:21case16pass5fail before fixes;affected pointer/columns/key9/9all3;actualhero3/3all3;nativeTab EC20 stillfail WINDOWS24;unit478/type/lint/build0;seed15/15;native/AT/UAT unverified WINDOWS26|
|03-12-01|8|DATA-04, GEN-06, GEN-07, MENU-02, MENU-03, REC-01, REC-02, REC-04|T-03-18, T-03-SC|`npm run test:e2e -- e2e/phase03-acceptance.spec.ts --workers=1`|PASS: initial6/6; extended8/9 then sync-corrected tracer21/21; final acceptance9/9 inside critical60/60 all3 engines09Nov, independent source/literal oracles, benchmark3 variants each engine; final QA|
|03-12-02|8|DATA-04, GEN-06, GEN-07, MENU-02, MENU-03, REC-01, REC-02, REC-04|T-03-18, T-03-SC|`npm run test:unit -- --run`|EVIDENCE RECORDED WITH LIMITS: latest478/478 unit; type/lint/build/media52 exit0; initial960=889pass/71unsuccessful; affected81=70pass/11fail before final fixes; critical60/60; final focus/legacy matrix in QA; native WINDOW15/16/24/25 and human26 remain open|

### Requirement sampling



| Requirement | Secure behavior | Type | Command | File exists | Status |
|---|---|---|---|---|---|
| DATA-04 | Старый snapshot читается, trust сохраняется, запись/cancel/races честны | unit/integration | `npm run test:unit -- --run src/adapters/activePlan.test.ts src/features/generation/controller.test.ts` | Existing | COVERED automated scope, latest unit/critical evidence reused |
| GEN-06 | Семантически разные3/2/1/0 результатов, hard constraints и бюджет каждого | unit | `npm run test:unit -- --run src/domain/generatePlan.test.ts src/domain/plan.test.ts` | Existing | COVERED, real3 and controlled1/2 evidence reused |
| GEN-07 | Append1 использует прежние inputs, cap12 не удаляет, late response не применяется | unit/integration | `npm run test:unit -- --run src/features/generation/controller.test.ts src/adapters/generation.test.ts` | Existing | COVERED automated scope, saved inputs/bytes/cap12 evidence reused |
| MENU-02 | День/неделя и даты сохраняют корректный контекст | unit/browser | `npm run test:unit -- --run src/domain/menuView.test.ts` | Existing menuView/presentation specs | PARTIAL, native keyboard gates open |
| MENU-03 |4:3 local assets52mapping, реальные порции/stock | unit/browser | `npm run test:unit -- --run src/domain/recipeView.test.ts src/data/recipeMedia.test.ts` | Existing recipeView/media specs | PARTIAL UI/manual, fresh media auditor52/fulltrue |
| REC-01 | Recipe/variant/instance проверены, ingredient/stock ledger сохраняет количества | unit/browser | `npm run test:unit -- --run src/domain/recipeView.test.ts` | Existing recipeView/recipes specs | PARTIAL native keyboard/manual |
| REC-02 | Независимые точные ожидания4КБЖУ/ingredient на одной базе | unit | `npm run test:unit -- --run src/domain/recipeView.test.ts` | Existing recipeView/acceptance specs | COVERED arithmetic scope, source/literal oracle evidence reused |
| REC-04 | Direct/missing/stale/error различены, нет тихой привязки | unit/browser | `npm run test:e2e -- phase03-recipes.spec.ts --project=chromium --workers=1` | Existing phase03-recipes.spec.ts | PARTIAL native keyboard, incomplete-data final3/3 |

## Wave 0 Requirements

- Добавить meaningful tests menuView/recipeView/recipeMedia и phase03 browser specs; указать реальные пути в PLAN.
- Подготовить неизменённый настоящий одновариантный Phase2 fixture; независимые fixtures для1/2/3 альтернатив, quota/corrupt/races и pantry500−200=300g с двумя вхождениями.
- Проверить default corpus3variants и единый30sdeadline/cancel. При невозможности трёх не клонировать результат.
- Существующая инфраструктура достаточна; установка новых тестовых framework не нужна.
- Планировщик должен сопоставить каждую задачу с автоматической проверкой и угрозой либо обоснованным N/A. Не оставлять три подряд задачи без автоматической обратной связи.

## Manual-Only Verifications

| Behavior | Requirement | Why manual | Instructions |
|---|---|---|---|
| Восприятие вариантов/трёх стоимостей/нормы | GEN-06/07, MENU-02/03 | Человеческая оценка | Сравнить, выбрать, пересобрать, вернуться к прежнему, прочесть источник цены |
| Соответствие52изображений блюдам | MENU-03, REC-01 | Визуальная оценка | Просмотреть каждое с recipeId, составом, provenance; generated пометка; fallback не заменяет набор |
| Native Safari15/device/AT/zoom | Все UI | Эмуляция не реальное устройство | Проверить keyboard/фокус/озвучку/200%/safearea отдельно; не выдумывать pass |

## Required Browser Evidence

Real start→unique alternatives→select→shopping→reload; append with unsaved draft→same applied settings; no-result/cancel/error/quota/late response preserve bytes; retry save without search. Recreate confirmation+cancel restores focus. Contextual and direct recipe, repeated recipe across days, stale IDs, ingredient totals, pantry conservation. Widths360/390/430/768/1280 and1/3/7dates, desktop four meal types, no page overflow, bottomCTA access,4:3/404/offline local media. Preserve seed missing/throwingAPI tests. Historical WindowsWebKit keyboard limits remain explicit, never renamed passed.

## Validation Sign-Off

Plan03-01 evidence: `docs/qa/phase03-plan01.md`; full unit397/397, typecheck/lint/build exit0, real+legacy Chromium2/2. Остальные планы/фазовые требования и общий sign-off остаются pending. Historical seed browser results не являются новым запуском;6seed unit assertions выполнены в текущем полном наборе.

Plan03-02 evidence: `docs/qa/phase03-plan02.md`; full unit431/431, focused75/75, typecheck/lint/build passed. Actual Chromium append6+variants2=8passed, затем final append7/7 after explicit pending/cancel indicator assertion. All5 widths without overflow, screenshots inspected; human/native-device judgments remain separate. Only plans01–02 delivered; phase/requirements/manual sign-off remain pending.

- [x] All tasks mapped to actual automated checks
- [x] Wave0 references created
- [ ] No watch mode; feedback latency measured
- [ ] Full current tests/static/build and browser evidence reviewed
- [x] Manual observations recorded separately
- [ ] Set nyquist_compliant only from actual coverage audit

Plan03-03 evidence: `docs/qa/phase03-plan03.md`; source final461/461 unit, typecheck/lint/build exit0. Integrated Chromium7/8 initially, with one Vite hardGET malformed-path404 before SPA startup; corrected client-router case passed1/1 and fresh resume rerun on2026-11-06 passed1/1 (15.0s). All seven unchanged integrated cases passed in that original run. The server boundary remains explicit, not renamed a successful hard navigation. Plans01–03 delivered; media/full menu presentation and independent phase/manual sign-off remain pending.

**Approval:** independent audit and human verification pending.

## Независимый аудит покрытия 09.11.2026

gsd-nyquist-auditor сопоставил33 задачи и8требований с meaningful assertions. Две устаревшие task-строки и8sampling-строк синхронизированы. Новых tests и fresh unit/browser runs в этом аудите нет. XML прочитаны непосредственно. Critical60 прошли, focus24 содержат19pass/3assertionfail/2errors, incomplete3passed. Initial960 содержат889pass/68assertionfail/3errors. Один incomplete timeout закрыт отдельным rerun3, native recovery timeout остаётся одним из четырёх native gates. Полного post-fix960pass нет.

UIC12 — длинная ошибка на360px, UIC18 — произвольно длинный confirmation, UIC51/52 — extreme memory-only alert/text требуют отдельной проверки. UIC24 nativeTab иUIC26/40 realzoom, WINDOWS15/16/24/25/26, human UAT/оценка52изображений и6descriptorless prohibitions остаются partial/unverified. Эти gaps не подменяются успешными unit checks. Фаза и shared requirements ожидают приёмки.

Post-review09Nov после RED913cd3b/GREENec24f1b проверены controller48/48, repeatedcatalogretry6/6all3engines, type/lint/build exit0. Manifest regression gate по configured one-shot unit command с600stimeout дал480/480,20files,10.36s,exit0. Новых full browser claims нет. CR-01/WR-01 outcome и команды находятся в03-REVIEW-FIX/REVIEW-DISPOSITION.

Plan03-12 execution evidence consolidated09.11.2026 in `docs/qa/phase03-final-validation.md` and `phase03-security.md`. Latest critical60/60 all3engines passed. Focus/legacy24-case run19passed/5failed retains4nativeWebKit failures and one20s harness timeout, then incomplete-data rerun3/3 passed with test-local60s. Source audit mapped GOAL/8REQ/18decisions/46edges/52UIpairs to concrete named specs/domain cases. UIC12/18/24/26/40/51/52 retain explicit partial/native limits. Six descriptorless prohibitions retain flagged-unverified. Current coverage audit records these gaps, so nyquist_compliant remains false. Automated completion of this QA plan does not accept Phase03 or advance to Phase04. Phase03.1 remains mandatory before04.

## Validation Audit 2026-11-11

| Metric | Count |
|---|---|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |
