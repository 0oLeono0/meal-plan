---
phase: 03-sravnenie-variantov-i-prosmotr-retseptov
plan: "11"
subsystem: ui
tags: [react, recovery, focus, keyboard, safari15, playwright]
requires:
  - phase: 03-02
    provides: guarded append and replacement operations
  - phase: 03-03
    provides: validated recipe resolver and shared ingredient ledger
  - phase: 03-09
    provides: 52 audited local illustrations
  - phase: 03-10
    provides: actual-date day/week presentation and cards
provides:
  - Route-aware cancellation focus and exact inline operation notices
  - Real adapter quota/retry/late-response browser evidence without replacing saved active
  - Shared busy recipe skeleton and actual keyboard return coverage
  - Pointer-safe tabpanel focus and equal four-to-three recipe hero geometry
affects: [03-12, phase03-uat, phase03.1]
tech-stack:
  added: []
  patterns: [external-store-derived-row-status, route-bound-return-focus, input-modality-focus-scroll]
key-files:
  created: [e2e/phase03-recovery.spec.ts, docs/qa/phase03-accessibility.md]
  modified: [src/app/App.tsx, src/features/menu/MenuPage.tsx, src/features/recipe/RecipePage.tsx, src/features/plan/PlanLoading.tsx, src/shared/styles/tokens.css, e2e/phase03-recipes.spec.ts, e2e/phase03-presentation.spec.ts, e2e/phase02-presentation.spec.ts]
key-decisions:
  - Keep cancellation origin until its destination pathname commits; external-store updates may precede Router transition
  - Scroll tabpanel on keyboard focus only; WebKit pointer focus must not move the target between down and up
  - Preserve failing Windows WebKit native-link Tab assertions separately from successful application recovery and pointer navigation
requirements-completed: []
requirements-covered: [DATA-04, GEN-06, GEN-07, MENU-02, MENU-03, REC-01, REC-02, REC-04]
actuals:
  tokens: 12011
  tasks: 3
  commits: 11
plan_head_before: f2ab89fd96761c00a1c9710829e9d407214cead0
plan_head_after: 22b9886b9800d1c1e7e7d99bd6003c6d8dae91d1
duration: "1194min retained wall window; total active time unknown; resumed about27min"
completed: 2026-11-08
status: complete
coverage:
  - id: recovery
    description: Failed select/append/newset preserve saved bytes and retry the same candidate without search
    verification:
      - kind: e2e
        ref: e2e/phase03-recovery.spec.ts
        status: pass
    human_judgment: false
  - id: recipe-states
    description: Loading, error, corrupt, stale, direct and exact occurrence recipe states with safe return
    verification:
      - kind: e2e
        ref: e2e/phase03-recipes.spec.ts#direct known recipe has base servings while unknown and invalid contexts have distinct recovery
        status: pass
      - kind: e2e
        ref: e2e/phase03-recipes.spec.ts#catalog adapter failure retries with real pending feedback and a late read cannot replace a new route
        status: pass
    human_judgment: false
  - id: keyboard-native
    description: Native Safari15/device/AT and Windows WebKit sequential link navigation
    verification:
      - kind: e2e
        ref: e2e/phase03-recipes.spec.ts#real Tab Enter and Space open composition and return focus to the exact day card
        status: fail
    human_judgment: true
    rationale: Windows WebKit omits native links from Tab; no native Safari or AT result is available
---

# Phase 3 Plan 11: Recovery и доступный возврат к меню Summary

**Отмена возвращает фокус после commit маршрута; реальные quota/retry сохраняют старое меню, WebKit pointer-click больше не сдвигает карточку, recipe hero остаётся4:3.**

## Performance

Самый ранний сохранённый RED —07.11.2026T10:56:05Z. Завершение08.11 около06:50Z:1194min wall window включает overnight usage-limit interruption; total active time не восстанавливается. Возобновлённая работа примерно27min. Выполнены3/3task;10implementation/test/QA paths. `actuals.tokens`=ceil(chars/4) по realized Git diff ledger-base→plan_head_after, не harness usage.11коммитов измерены `rev-list`; metadata commit в измерение не входит.

## Accomplishments

- Настоящие select/append/replace failures сохраняют literal старые bytes и saved active до ack; retry не генерирует заново, duplicate click не создаёт вторую запись, reload восстанавливает новый acknowledged ID.
- Requested row получает один полный pending status; append/cancel/memory-only имеют явные постоянные recovery notices. Corrupt/external changes не перезаписываются; поздний результат после cancel/navigation не пишет и не редиректит.
- PlanLoading recipe kind объединяет initial/retry busy + aria-hidden skeleton. Direct/base/unknown/stale/incomplete/corrupt/error/media states различимы. Реальные Tab/Enter/Space проходят composition и возвращают exact card в Chromium/Firefox.
- WebKit pointerdown→focus(tabpanel) больше не запускает scroll до pointerup; keyboard panel scroll сохранён. Hero figure без default80px отступов; настоящий PNG получил height:auto, все3engines подтвердили4:3 на360/768/1280.
- WINDOWS23 закрыт после всех8legacy cancellation paths; новые ограничения24/25/26 честно зарегистрированы. NativeSafari/AT/UAT не объявлены passed. Phase3 имеет11/12plan; следующий03-12, Phase03.1 обязательна перед4.

## Task Commits

1. **03-11-01 — реальный failed save/retry/cancel:** `033e5aa` RED (предыдущая сессия); `5af0bb8` hostile row/late response tests; `b490011` route-bound focus/operation notices; `304cf9d` cancellation status RED; `f43ebf2` persistent notice GREEN.
2. **03-11-02 — recipe read/recovery/keyboard:** `a9bd3d2` RED skeleton + keyboard; `33318ff` shared recipe busy/skeleton и acknowledged retry coverage.
3. **03-11-03 — geometry/focus/compatibility:** `866f942` twelve variants/modal/columns; `2b70ba8` pointer scroll guard/figure margins; `18e637f` actual PNG ratio RED; `22b9886` height:auto + QA.

## TDD и verification

Полные commands, ошибки, interpretation и screenshot paths — `docs/qa/phase03-accessibility.md`.

- RED `.tmp/03-11-01-red.json`: реально после Tab/Enter отмены launch inactive; classifier RED_EVIDENCE_OK. Root cause: external-store notification потреблял origin до route commit. GREEN8recovery+8legacy=16/16 Chromium,exit0,58.6s; ни одна из8веток не исключена.
- `.tmp/03-11-row-red.json` и `03-11-cancel-notice-red.json`: assertion failures на отсутствующем row/cancel status; classifier OK; затем recovery8/8 Chromium,45.4s,exit0.
- `.tmp/03-11-02-red.json`: настоящий delayed retry без skeleton; classifier OK. Recipes8/8 Chromium,22.7s. Дополнительный acknowledged retry был existing GREEN после исправления неверного тестового ожидаемого названия; это не заявлено как RED.
- `.tmp/03-11-03-red.json`: isolated EC-41 width difference80px; classifier OK. Первая попытка классификации общего report с одноимёнными multi-engine cases была INVALID_RED; production fix дождался isolated RED.
- `.tmp/03-11-pointer-red.json`: WebKit trusted down/up попадали на разные cards вследствие panel scroll, URL оставался/menu; classifier OK. После fix affected EC-23/41/19 all3engines9/9,48.5s,exit0.
- `.tmp/03-11-hero-red.json`: actual PNG ratio0.302 вместо4/3, classifier OK; RED запущен на отдельном локальном4175 server, пока независимый63-case gate продолжался на4173, production CSS не менялся до его окончания. После CSS fix EC-42 all3engines3/3,14.6s,exit0; финальные3screenshots действительно открыты visual tool.
- Final scoped browser command: `npm run test:e2e -- e2e/seed-compatibility.spec.ts e2e/phase03-recovery.spec.ts e2e/phase03-recipes.spec.ts --workers=1`:62pass/1fail,exit1,6.1min. Recovery24/24; seed15/15; recipes23/24. Единственный fail — Windows WebKit nativeTab exact meal-card link (WINDOWS25). Report `.tmp/03-11-browser-final.xml`, log `.tmp/03-11-browser.log`. Это не all-green.
- Presentation full18-case run14pass/4fail; subsequent21-case run16pass/5fail до fixes. После адресных fixes9/9 и3/3 выше; EC-20 nativeTab-to-shopping остаётся failed WINDOWS24. Полная presentation suite после последней CSS строки не повторялась; scoped affected verification достаточна для CSS fix, не подменяет общий21-case pass.
- `npm run test:unit -- --run`:478/478,20files,13.22s после последних logic changes; последний height:auto только CSS. Final `npm run typecheck`, `npm run lint`, `npm run build`:exit0. Safari15 build145modules, CSS16.84kB, JS514.08kB/gzip145.71kB; прежнее advisory chunk warning WINDOWS21 сохранено.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] WebKit pointer focus двигал карточку во время клика.**
Found during task03; trusted event diagnostics локализовали onFocus scroll в MenuDays, без отнесения реального app bug к OS. Минимальный modality ref; файл MenuPage указан в plan-level ownership, хотя первоначальный task03 list его не включал. `2b70ba8`, all3 affected GREEN.

**2. [Rule 1 - Bug] Default figure margins и intrinsic image height нарушали hero contract.**
Found during task03 geometry и actual visual inspection. CSS/RecipePage адресно исправлены, их plan ownership сохранён. Не менялись catalog/media components/assets. `2b70ba8`/`22b9886`; literal80px и real-image ratio RED→GREEN.

**3. [Rule 3 - Blocking] Устаревший legacy replacement шаг и browser fixture timing.**
Минимально затронут разрешённый оркестратором `e2e/phase02-presentation.spec.ts`: после ранее сохранённого результата требуется реальное подтверждение замены Tab/Enter. Все прежние assertions сохранены. Presentation lazy request ждёт actual viewport scroll; strict recipe assertions — route commit. Не добавлены sleeps, skip или fake focus для новых keyboard cases.

## Decisions Made

Один immutable controller snapshot остаётся владельцем saved/candidate; numeric logic, schema, trusted catalog и guard не изменялись. Pending selection derives from candidate ID. Input modality хранится в ref и не дублирует domain state. Return URL по-прежнему строится из validated enum/date; arbitrary return не применяется. Requirement completion остаётся Pending по явному orchestration scope:03-12 ещё не выполнен.

## Known Stubs

Новых stubs нет. Прежнее пояснение гостевого профиля о будущей P1-функции не менялось и не объявляется реализованным. Пищевой каталог и52готовыхasset не затрагивались; расширение03.1 здесь не начиналось.

## Deferred Issues / Human Verification

WINDOWS24 — Windows WebKit EC-20 nativeTab-to-shopping; WINDOWS25 — nativeTab-to-card. Тесты реально failed и сохранены. Связаны с прежними WINDOWS15/16, не выдаются за nativeSafari результат. WINDOWS26 — native Safari15, physical device/safe-area/keyboard, AT, реальный browser200%zoom и human UAT не проверены. Automated200% text enlargement и geometry не закрывают их. Security high/critical новых unresolved app surfaces не найдено; deps/paid/auth/proxy не добавлялись.

## Next Phase Readiness

Следующий только03-12: независимая финальная проверка и консолидация Phase3. Ни одна shared requirement не помечена Complete. Фаза/P0 не приняты;03.1 остаётся отдельной обязательной фазой перед4. Чужие untracked skills/cache/lock/milestone.lock/03.1 .gitkeep сохранены.

## Self-Check: PASSED

Оба созданных task artifacts и SUMMARY существуют. Все11измеренных task commits являются предками HEAD. Diff whitespace check пройден; неожиданных tracked deletions нет. Фактические failed/unverified browser/native items перечислены отдельно и не скрыты этим self-check.
