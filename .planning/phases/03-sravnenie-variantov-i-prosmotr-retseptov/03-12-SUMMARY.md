---
phase: 03-sravnenie-variantov-i-prosmotr-retseptov
plan: "12"
subsystem: testing
tags: [playwright, regression, source-oracle, focus, security, safari15]
requires:
  - phase: 03-11
    provides: saved-operation recovery, recipe states and native keyboard evidence
provides:
  - Real saved multi-screen acceptance with independent source and literal numeric oracles
  - Initial full regression and separately measured affected reruns with preserved failures
  - Successful-save lifecycle and keyboard focus regression fixes
  - Traceable requirement, decision, edge, UI and security evidence with explicit human limits
affects: [phase03-verification, phase03-uat, phase03.1]
tech-stack:
  added: []
  patterns: [independent-test-numeric-oracles, stable-initiator-focus, keyboard-only-sticky-scroll]
key-files:
  created: [e2e/phase03-acceptance.spec.ts, docs/qa/phase03-security.md]
  modified: [docs/qa/phase03-final-validation.md, src/app/App.tsx, src/features/menu/MenuPage.tsx, e2e/phase02-presentation.spec.ts, .planning/phases/03-sravnenie-variantov-i-prosmotr-retseptov/03-VALIDATION.md]
key-decisions:
  - Preserve succeeded on acknowledged navigation and restore confirmation focus using the existing initiator ID
  - Apply existing sticky scroll margins explicitly for keyboard focus while preserving the pointer guard
  - Retain the initial full failure report and separate targeted passes, native failures and human-unverified gates
requirements-completed: []
requirements-covered: [DATA-04, GEN-06, GEN-07, MENU-02, MENU-03, REC-01, REC-02, REC-04]
actuals:
  tokens: 23370
  tasks: 2
  commits: 5
plan_head_before: 5987aa9faae700d43b6e074a0bccfee6d95158e6
plan_head_after: 1f55e91e77cc846782971b18f0fbe15edc613910
duration: "1510min retained wall window; active total unknown; resumed about25min"
completed: 2026-11-09
status: complete
coverage:
  - id: real-acceptance
    description: Real wizard, alternatives, select, append, exact recipe, shopping and reload with independent values
    verification:
      - kind: e2e
        ref: e2e/phase03-acceptance.spec.ts
        status: pass
    human_judgment: false
  - id: critical-regression
    description: Real quota, retry, cancellation, late response, cardinality and seed compatibility
    verification:
      - kind: e2e
        ref: docs/qa/phase03-final-validation.md#повторная-проверка-0911-после-исправлений
        status: pass
    human_judgment: false
  - id: native-keyboard-human
    description: Windows WebKit anchor traversal, native Safari15, physical-device and AT verification
    verification:
      - kind: e2e
        ref: e2e/phase03-recipes.spec.ts#real Tab Enter and Space open composition and return focus to the exact day card
        status: fail
    human_judgment: true
    rationale: Four native WebKit anchor gates remain failed and native Safari15/device/AT/UAT have no human pass
---

# Phase 3 Plan 12: Независимый полный путь и итоговая проверка Summary

Реальный путь меню проверен независимыми числовыми оракулами, исправлены ложная отмена и ошибки фокуса, исходный960-case отчёт сохранён отдельно от адресных повторов.

## Performance

Первый сохранённый acceptance log начат08.11 в06:55UTC. Итог записан09.11 около08:05UTC,1510min wall window включает overnight interruption. Total active time неизвестен, возобновлённая работа примерно25min. Выполнены2/2task,18изменённых paths до metadata commit. `actuals.tokens` = ceil(93478chars/4) по realized Git diff. Пять task/RED/fix commits измерены ledger-base→plan_head_after. Metadata commit в этот диапазон не входит.

## Accomplishments

- Настоящий production App/каталог проходит wizard с200г риса,3семантических варианта, выбор, append при изменённом draft, точный variant/instance recipe, ingredients/composition/steps, shopping и reload. Отдельный literal oracle проверяет500г required/200г stock/300г purchase без production projection в expected.
- Сохранён полный initial960-case run и71failure trace. После него выполнены адресные reruns. Последний critical60/60 включает acceptance9/9,variants12/12,recovery24/24,seed15/15 во всех3engines.
- Исправлены succeeded→idle false cancellation, changed-draft pointer initiator, cap12 replacement h1 focus и Firefox native focus под sticky navigation. Все исправления имеют наблюдавшиеся RED и адресные GREEN.
- QA сопоставляет GOAL/8REQ/18decisions/46edges/52UIpairs. Security audit охватывает T-03-01…18/SC. Partial UI/native и6descriptorless prohibitions указаны явно. Nyquist остаётся false, Phase03/P0 не приняты.

## Task Commits

1. **03-12-01 — real flow / independent oracles** — `e15702b`.
2. **03-12-02 — regression/security/evidence** — `affaa99` RED, `ff52a34` saved-success/trigger/h1 fixes, `30f8735` Firefox keyboard scroll fix, `1f55e91` reconciled browser fixtures and QA/security/validation.

## Verification

Команды, время, named failures, screenshots и benchmark output полностью записаны в `docs/qa/phase03-final-validation.md`.

- Initial full `npm run test:e2e -- --workers=2`, exit1,889pass/71unsuccessful из960,0skip,39.4min. Chromium299/320,Firefox298/320,WebKit292/320. Архив `.tmp/03-12-full-initial.xml` и `.tmp/03-12-full-initial-artifacts`. Полного post-fix960pass нет.
- Initial tracer21/21 all3engines после отдельной синхронизации route commit. Предшествующий8/9 сохранён. После нового success RED scoped6/6 all3engines,exit0,1.5min.
- Affected81cases,exit1,70pass/11fail,7.4min. Из11 шесть legacy copy/routes, один Firefox geometry, четыре nativeWebKit anchor gates. Исходный report и11traces сохранены.
- Firefox settled isolated RED, общий60s test deadline и5s geometry poll. Fourth-card bottom742.8 приnavtop718, CSS margin179px. Эксперимент после failed assertion показал explicit scroll bottom620.8. Следующий чистый GREEN1/1,exit0,24.0s. Диагностическая прокрутка удалена из теста.
- Final critical60/60,exit0,4.4min. Default benchmark adapter+save/domain ms Chromium4119/4262.9,Firefox7208/7444,WebKit7384/6915. Во всех3engine3variants и621transitions/512evaluations. Production30s неизменён.
- Final focus/legacy24,exit1,19pass/5fail,2.2min. Chromium8/8,Firefox7/8,WebKit4/8. Четыре native failures сохранены. Firefox incomplete-data упёрся в общий20s test timeout двух настоящих генераций. После test-local60s rerun3/3 allengines,exit0,55.4s. Native assertions не заменены программным focus.
- Latest unit478/478,20files,13.12s. Typecheck,lint,build,media52/fulltrue — каждый exit0 после последнего source fix. Unit/domain/catalog/package paths не менялись, исходные365unit assertions сохранены. Build Safari15 target145modules,3.36s,JS514.03kB/gzip145.69kB,CSS16.87kB/gzip4.09kB. Chunk advisory WINDOWS21 сохраняется.
- Latest built preview Playwright MCP Chromium прошёл quickstart3→select2→exact recipe→reload→shopping→reload. Literal saved bytes неизменны,461.93/0/461.93RUB. Widths360/768/1280 имеют client=scroll345/753/1265. Hero decoded и mobile screenshot открыт visual tool. Собственный preview4182 остановлен по проверенному PID/commandline.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Успешная навигация отменяла сохранённый результат.**

Task02, RED `affaa99` ожидает success notice и отсутствие false cancellation. Route-effect вApp вызывал cancel даже после ack. `ff52a34` сохраняет succeeded, real flow all3GREEN.

**2. [Rule 1 - Bug] WebKit pointer confirmation и removal fallback теряли ожидаемый focus.**

Task02, сохранённый RED `.tmp/03-12-focus-red.log`. Appstart использовал activeElement, pointer activation не обязана фокусировать кнопку. После cap12 retry удалённый trigger приводил кsection#variants, прежнее body-only условие блокировалоh1. `ff52a34`, scoped changed-draft6/6 иcap12all3GREEN.

**3. [Rule 1 - Bug] Firefox native focus игнорировал sticky reservation.**

Task02, два isolated RED сsettledpoll доказали устойчивое перекрытие. `30f8735` расширяет существующий MenuDays focus handler на клавиатурных потомков сblock nearest. Pointer guard сохранён. Firefox keyboard23.4s иall3pointer/daytabGREEN.

**4. [Rule 3 - Blocking] Legacy browser steps, isolated Router и test-local deadlines.**

Разрешённое оркестратором расширение ownership включает legacy e2e fixtures и два минимальных production paths. Добавлено реальное replacement confirmation, сравнение saved content отдельно от transient status, правильный Router, current recipe-notfound и incomplete-data смысл. Два multi-step сценария получили60s test-local deadline. Production30s и meaningful byte/ID/numeric/native assertions сохранены. `1f55e91` и `30f8735`.

## Decisions Made

Сохранён initial full failure report, далее запускались затронутые сценарии с отдельными reports. Full post-fix pass не заявлен. Существующие stable IDs и measured scroll margins переиспользованы. Packages, lockfile, domain food facts, P1/P2 и paid services не добавлялись. Shared requirements и whole phase acceptance остаются pending по orchestration scope.

## Known Stubs

Новых production stubs нет. Synthetic numeric fixture намеренно отделён от real source acceptance. Ранее запланированные Phase4–7/P1 функции и human checks не выдаются за реализованные этим планом.

## Deferred Issues / Human Verification

WINDOWS15/16/24/25 — четыре WindowsWebKit nativeTab anchor assertions реально failed. Точный список находится в final QA. Clean HTML вне MealPlan повторяет пропуск links, без изменения OS/private preferences. Эти failures сохраняются в существующем cross-phase ledger.

WINDOWS26 — nativeSafari15/physical device/AT/real200%zoom/safe-area/humanUAT не проверены. UIC12/18/24/26/40/51/52 имеют частичную или native/human evidence. Все6descriptorless prohibitions flagged-unverified. Новых unresolved high/critical threats scoped audit не обнаружил. Nyquist и независимый verifier sign-off остаются pending.

Первый preview attempt09Nov timeout-нулся из-за оставшегося `/menu` после очистки test storage. Переход на `/` исправил harness sequence, затем весь flow повторён после последнего source fix. Dev fixtures выводили existing duplicate-createRoot warning. Build сохраняет chunk advisory. Эти наблюдения не скрыты.

## Next Phase Readiness

12/12plans имеют execution summaries. Phase03 остаётся ожидающей независимой проверки и human acceptance,8requirements не помечены Complete. Phase03.1 обязательна перед04. Следующая фаза этим исполнителем не запускалась. Пользовательские untracked skills/cache/lock/milestone.lock/03.1gitkeep сохранены.

## Self-Check: PASSED

Созданные acceptance/security artifacts и оба QA/summary paths существуют. Все5измеренных commits являются предкамиHEAD. Tracked deletions отсутствуют. Native failures и human-unverified gates перечислены отдельно, self-check проверяет сохранность артефактов и истории.

Registered state.advance-plan вернул last_plan/ready_for_verification, roadmap.update-plan-progress записал12/12 иIn Progress. State metrics, decisions иsession записаны черезSDK. State.update-progress отказался менять prose из-за unscoped phase. Current position/progress/last activity синхронизированы вручную сфактическими12summaries, без объявления принятой фазы. Requirements completion handler намеренно не вызывался по explicit orchestration scope.
