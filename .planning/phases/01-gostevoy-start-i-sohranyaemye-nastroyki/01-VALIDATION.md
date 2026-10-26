---
phase: "01"
slug: "gostevoy-start-i-sohranyaemye-nastroyki"
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-10-26"
---

# Phase 01 — Validation Strategy

Это контракт будущего исполнения, а не отчёт о прошедших тестах. В проекте ещё нет package.json, приложения и тестовых конфигураций. Task-ID распределены по восьми планам; разработка пока не разрешена. Все строки pending/gated, ни одна не доказывает прохождение приложения.

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
|01-07-01|01-07|5|WIZ-09 calculator|T-01-09|Human source-backed decision;amendment→replan|decision|node scripts/verify-calculator-decision.mjs docs/decisions/nutrition-calculator.json|No, validator03/record here|gated|
|01-07-02|01-07|5|WIZ-09 calculator|T-01-09,T-01-10|Independent expected values;explicit Use;no unapproved demographics|unit/e2e|npm run test:unit -- --run src/domain/nutritionCalculator.test.ts; npm run test:e2e -- e2e/calculator.spec.ts --project=chromium|No, conditional keep-p0|gated|
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
|2 calculator layout UI +4 unresolved calculator assumptions|01-07-01/02|human record then calculator.spec/unit|
|All12REQ/17D/54UI/45edges evidence|01-08-01/02|presentation/accessibility smoke,matrix,actual QA record|

45 edges=44 explicit +1 flat backstop(WIZ-02/concurrency two tabs); no dismissals. Four calculator states remain unresolved until actual decision. Safety prohibitions04/06 remain flagged-unverified without fabricated check descriptors.

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
| C-04/Q-03 | WIZ-09 | Нет согласованной формулы/приоритета | Явное решение с основанием до зависимой реализации, затем обновить тестовые ожидания |

## Validation Sign-Off

- [ ] Все задачи имеют automated verify с fails_when либо явную Wave 0 dependency.
- [ ] Нет трёх последовательных исполняемых задач без автоматической проверки.
- [ ] Tracer создаёт scripts/Playwright;02 добавляет strict/shared configs,03 unit fixtures; последующие команды используют реально созданные ранее пути.
- [ ] Нет watch-mode flags и проверок с нулём найденных тестов как успехом.
- [ ] Покрыты все 12 требований; ручная часть не закрывает калькулятор WIZ-09.
- [ ] Фактически выполненные проверки и ограничения записаны отдельно.
- [ ] `nyquist_compliant: true` устанавливается только после проверки контрактов; execution readiness не заявляется при открытом decision checkpoint.

**Approval:** pending. Все тесты/сборка ещё не выполнялись. Открытые C-04/Q-03 не замаскированы статусом планирования.
