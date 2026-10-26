---
phase: "01"
slug: "gostevoy-start-i-sohranyaemye-nastroyki"
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-10-26"
---

# Phase 01 — Validation Strategy

Это контракт проверки, а не отчёт о прошедших тестах. Историческая исходная точка была без приложения; планы 01–05 уже исполнены и их фактические результаты находятся в неизменённых SUMMARY. Разработка разрешена. Поправка человека C-04/D-10 от 26.10.2026: автоматический калькулятор NEXT-10 и его четыре состояния deferred P1; P0/WIZ-09 — необязательная ручная цель. Ни подготовка replan, ни строки таблицы ниже не доказывают приёмку 01-07/08.

## Test Infrastructure

| Property | Value |
|---|---|
| Framework | Vitest (чистые функции), Playwright (DOM/браузер), TypeScript, ESLint |
| Config file | FUTURE playwright.config.ts создаётся tracer01-01-02; vite.config.ts/Vitest, strict tsconfig и ESLint создаются01-02-02 |
| Quick run command | `npm run test:unit -- --run` после substantive unit specs в01-03-01 |
| Full suite command | `npm run typecheck`, затем `npm run lint`, `npm run test:unit -- --run`, `npm run build`, `npm run test:e2e` |
| Estimated runtime | Не измерен: запусков приложения ещё не было |

Все команды — предлагаемый контракт scripts, который должен быть создан первым заданием и указан в его acceptance criteria. Нельзя утверждать, что эти команды уже существуют или успешно выполнялись.

## Sampling Rate

- После каждого изменения бизнес-валидации/сохранения: релевантные unit и typecheck.
- После UI/storage задания: релевантные e2e без watch, lint и build.
- После волны и перед приёмкой: полный набор; отдельно реальные screenshots/visual checks.
- Цель быстрого feedback — менее 60 секунд после установки; фактическое время сначала измерить, не представлять оценку как результат.

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---|---|---|---|---|---|---|---|---|---|
|01-01-01|01-01|1|APP-01|T-01-SC|Human SUS/pins/peers before install|record gate|node -e install record check from PLAN|No, human record|gated|
|01-01-02|01-01|1|APP-01,APP-03,WIZ-02,UX-01|T-01-01,T-01-02|Real save/reload, no false saved|e2e|npm run test:e2e -- e2e/guest.spec.ts --project=chromium|No, created here|pending|
|01-02-01|01-02|2|APP-01,APP-02,APP-03,UX-01|T-01-03|Literal labels, safe routes/dialog/presence|e2e|npm run test:e2e -- e2e/navigation.spec.ts --project=chromium|No, created here|pending|
|01-02-02|01-02|2|APP-01,APP-02,UX-01|T-01-03|Shared tokens, strict quality and Safari15 build target|e2e/build|navigation.spec; npm run typecheck; npm run lint; npm run build|No, config created here|pending|
|01-03-01|01-03|3|WIZ-01,WIZ-02|T-01-11|Corrupt raw untouched;exact-key reset;throw/retry|unit/e2e|npm run test:unit -- --run src/domain/settings.test.ts src/adapters/guestDraft.test.ts; npm run test:e2e -- e2e/storage.spec.ts --project=chromium|No, created here|pending|
|01-03-02|01-03|3|WIZ-01,WIZ-02|T-01-11|Exit/cancel/newest value;decision validator fail closed|unit/e2e|npm run test:e2e -- e2e/storage.spec.ts --project=chromium --grep exit; npm run test:unit -- --run src/adapters/guestDraft.test.ts|No, expanded here|pending|
|01-04-01|01-04|4|WIZ-01,WIZ-02,WIZ-03|T-01-11|Full integer counts;no step skipping|unit/e2e|npm run test:unit -- --run src/domain/settings.test.ts; npm run test:e2e -- e2e/wizard.spec.ts --project=chromium|No, created/expanded here|pending|
|01-04-02|01-04|4|WIZ-09 manual|T-01-05|Missing≠0;partial invalid;explicit manual origin|unit/e2e|npm run test:unit -- --run src/domain/nutritionTarget.test.ts; npm run test:e2e -- e2e/nutrition.spec.ts --project=chromium|No, created here|pending|
|01-05-01|01-05|5|WIZ-04|T-01-04|Exact safe budget;truthful thumb aria|unit/e2e|npm run test:unit -- --run src/domain/budget.test.ts; npm run test:e2e -- e2e/budget.spec.ts --project=chromium|No, created here|pending|
|01-05-02|01-05|5|WIZ-05|T-01-04|Latest time/variety preserves budget/raw|e2e|npm run test:e2e -- e2e/budget.spec.ts --project=chromium --grep time-variety|No, expanded here|pending|
|01-06-01|01-06|6|WIZ-06|T-01-06,T-01-07,T-01-08|Literal labels/IDs/stale response|e2e|npm run test:e2e -- e2e/products.spec.ts --project=chromium --grep exclusions|No, created here|pending|
|01-06-02|01-06|6|WIZ-01,WIZ-02,WIZ-07,UX-01|T-01-07,T-01-08|Unknown quantity≠0;global sentinel unchanged|unit/e2e|npm run test:unit -- --run src/domain/settings.test.ts; npm run test:e2e -- e2e/products.spec.ts --project=chromium --grep home-products|No, expanded here|pending|
|01-07-01|01-07|5|WIZ-09 scope / NEXT-10 deferred|T-01-09|Exact human response/source/timestamp;validator exit 1 with REPLAN_REQUIRED retained|record/docs|01-07 task01 automated node assertion: human-confirmed scope-amendment plus expected fail-closed validator|Yes, record/archive verified; tracer recheck passed|passed docs-only 26.10.2026; no formula approval|
|01-07-02|01-07|5|WIZ-09 manual / NEXT-10 deferred|T-01-09,T-01-10|Manual Pending;calculator and four states P1;no invented norms;Q-03 partial|docs|01-07 task02 automated node assertion plus git diff --check; amendment affected-path review|Yes, scope documents checked; no calculator source changed|passed docs-only 26.10.2026; WIZ-09 Pending QA|
|01-08-01|01-08|7|APP-01,APP-02,APP-03,WIZ-01,WIZ-02,UX-01|T-01-12|Responsive real flow;honest evidence|smoke/e2e|npm run test:e2e -- e2e/presentation.spec.ts --project=chromium --grep smoke; then full focused spec|No, created here|gated|
|01-08-02|01-08|7|WIZ-01,WIZ-02,WIZ-09,UX-01|T-01-12|Keyboard/aria/focus;no fabricated acceptance|smoke/e2e/release|npm run test:e2e -- e2e/accessibility.spec.ts --project=chromium --grep smoke; then full focused spec and release commands below|No, created here|gated|

Every runnable automated command has immediate fails_when in PLAN; nonzero/No tests found/zero tests fail. Commands run in repository root; package.json is a FUTURE artifact of01-01-02, not a manifest created during planning. No prefix/cd representation points the probe at an absent current manifest. Native tracer runs with Vite CLI before optional shared configuration is added in02; unit specs begin03. Missing/unconfirmed calculator decision is nonzero; scope amendment emits REPLAN_REQUIRED.

## Predicate Allocation

|Source|Plan/task owner|Test evidence|
|---|---|---|
|4 welcome UI +4 APP-03 edges|01-01-02|guest.spec|
|8 nav/routes UI +14 routes/nav/UX edges|01-02-01/02|navigation.spec|
|6 recovery UI +6 wizard/storage edges|01-03-01/02|storage.spec,settings/guestDraft unit|
|12 people/manual UI +4 count/norm edges|01-04-01/02|wizard/nutrition specs,settings/nutritionTarget unit|
|6 budget UI +7 financial/options edges|01-05-01/02|budget.spec,budget unit|
|16 products UI +10 exclusion/home edges|01-06-01/02|products.spec,settings unit|
|Historical 2 calculator layout UI +4 calculator assumptions|NEXT-10 P1 by human-confirmed D-10|All six rows deferred; not implemented and excluded from P0 formula/UI tests|
|Applicable P0 requirement/decision/UI/edge evidence|01-08-01/02|presentation/accessibility smoke,matrix,actual QA record; WIZ-09 manual only|

Historical baseline before amendment: 45 edges=44 explicit +1 flat backstop(WIZ-02/concurrency two tabs). No new aggregate count is claimed without a fresh audit; applicable named P0 criteria retain coverage. Calculator empty/loading/error/partial and overflow/long-text explicitly deferred P1/NEXT-10 by D-10, not passed or implemented. Safety prohibitions04/06 remain flagged-unverified without fabricated check descriptors.

## Release Verification

After each meaningful focused smoke/spec passes,01-08 runs all: npm run test:unit -- --run; npm run test:e2e -- --project=chromium; separately --project=firefox and --project=webkit; npm run typecheck; npm run lint; npm run build. Immediate fails_when statements remain in01-08 release block. Full suite is not presented as measured quick feedback; timings still unmeasured.

## Required Cases

- Гостевой deep link/reload всех P0-маршрутов; неизвестный рецепт; валидный plan-presence fixture для redirect, без фиктивной генерации.
- 4 шага, назад/выход/отмена, первый error focus, восстановление шага 3 с тегами и сырыми невалидными строками.
- Люди 1/10, чип 4+→4, дни 1/7; дефолты не перекрывают восстановленные значения.
- Бюджет 500/1000/1050/15000/20000, дробный/пустой/unsafe integer; отдельное доступное значение ползунка и точного поля, изменение дней меняет подсказку, не сумму.
- Read/write throws, повреждённый JSON, неизвестная версия, retry/reset только принадлежащего приложению ключа; режим памяти предупреждает о несохранении.
- Ограничения и product-ID теги Enter/запятая/удаление; lookup loading/empty/error; popular-чипы и повторный productId.
- Запасы без количества, известное положительное количество/единица, expiresSoon; черновик не расходует глобальный pantry.
- Норма: пустой/частичный/полный набор, отрицательные/nonfinite; происхождение manual; отсутствие не трактуется нулём или примером ТЗ.
- Размеры 360/390/430/768/1280, граница 1199/1200: overflow, фокус, touch targets, отсутствие перекрытий.

## Infrastructure Allocation

- [ ]01-01-01: human package legitimacy/pin/engine/peer approval before install; TypeScript peer conflict is not bypassed.
- [ ]01-01-02:8-file real save/reload tracer with package/lock/index/App/domain/storage/Playwright config+guest browser spec; Vite CLI explicit Safari15 target.
- [ ]01-02-02: inline Tailwind3.4/PostCSS in vite.config.ts, strict tsconfig and ESLint, shared tokens; no unlisted config files.
- [ ]01-03: substantive unit/storage specs and isolated fixtures; strict calculator decision validator; no empty/fake-pass tests.
- [ ]Each feature task creates focused specs RED before implementation; future scripts/files are never claimed present today.

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|---|---|---|---|
| Визуальное соответствие PDF | UX-01, APP-02 | DOM assertions не доказывают визуальное качество | Посмотреть screenshots всех размеров, макет, ошибки и sticky footer |
| Виртуальная клавиатура/safe area | APP-02, WIZ-01 | Desktop viewport не повторяет реальное устройство | Проверить реальный iOS при доступности; недоступность записать |
| Именно Safari 15 | Совместимость PRD | Современный Playwright WebKit — другой браузер | Проверить историческую версию отдельно или указать непроведённую проверку |
| C-04/Q-03 | WIZ-09 manual / NEXT-10 P1 | Приоритет подтверждён человеком; формулы/средние нормы и жёсткость nutrition targets не определены | 01-07 проверяет docs-only amendment; 01-08 принимает manual WIZ-09. Автокалькулятор/четыре состояния deferred P1; Q-03 остаётся частично открытым для будущего контракта и генерации |

## Validation Sign-Off

- [ ] Все задачи имеют automated verify с fails_when либо явную Wave 0 dependency.
- [ ] Нет трёх последовательных исполняемых задач без автоматической проверки.
- [ ] Tracer создаёт scripts/Playwright;02 добавляет strict/shared configs,03 unit fixtures; последующие команды используют реально созданные ранее пути.
- [ ] Нет watch-mode flags и проверок с нулём найденных тестов как успехом.
- [ ] Применимые требования P0 подтверждены; WIZ-09 принят только по обновлённому manual-контракту. Прежнее вычисление отдельно NEXT-10 P1 и не выполнено.
- [ ] Фактически выполненные проверки и ограничения записаны отдельно.
- [ ] `nyquist_compliant: true` устанавливается только после проверки контрактов; execution readiness не заявляется при открытом decision checkpoint.

**Approval:** pending. Фактические тесты/сборка планов 01–05 записаны в их исторических SUMMARY; docs-only 01-07 проверен и исполнен, приёмка 01-08 ещё не выполнена. C-04 закрыт по приоритету human-confirmed amendment, Q-03 в оставшемся объёме открыт. Документальное исполнение не означает принятую WIZ-09 или завершённую фазу.
