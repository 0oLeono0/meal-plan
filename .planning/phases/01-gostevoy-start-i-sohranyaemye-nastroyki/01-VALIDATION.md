---
phase: "01"
slug: "gostevoy-start-i-sohranyaemye-nastroyki"
status: validated
nyquist_compliant: true
wave_0_complete: true
created: "2026-10-26"
validated: "2026-10-27"
---

# Phase 01 — Validation

Фактический аудит покрытия после 8/8 исполненных планов. `validated` означает проверенную карту evidence, а не принятую фазу. Автоматизированные случаи имеют наблюдаемые assertions и выполненные прогоны; на момент аудита обязательные human/device проверки ниже оставались pending; теперь они закрыты пользовательской UAT 9/9, см. дополнение. Реализация и тесты этим аудитом не изменялись; повторный полный прогон без изменений не запускался.

Scope: APP-01/02/03, WIZ-01…07, amended WIZ-09 manual, UX-01 в границах гостевого старта. APP-04/WIZ-08, настоящая генерация, меню, склад и покупки относятся к следующим фазам. Их честные пустые маршруты не доказывают будущую функциональность. Подтверждённая поправка C-04/D-10 переносит автоматический калькулятор и empty/loading/error/partial/overflow/long-text в NEXT-10 P1. Он не реализован и не получает вычислительного кредита; оставшаяся Q-03 открыта. Ручной WIZ-09 принят по QA 01-08.

## Test Infrastructure

| Property | Actual value |
|---|---|
| Framework | Vitest 5.0.5, Playwright 1.64.1, strict TypeScript, ESLint |
| Config | package.json, vite.config.ts, playwright.config.ts, tsconfig.json, eslint.config.js существуют |
| Quick unit | `npm run test:unit -- --run` — 134 tests / 4 files, 1.17 s финальный журнал |
| Quick browser | `npm run test:e2e -- e2e/accessibility.spec.ts --project=chromium --grep smoke` — 1 passed, 4.6 s в QA |
| Release | `npm run typecheck`; `npm run lint`; `npm run test:unit -- --run`; `npm run build`; `npm run test:e2e -- --project=chromium` (и отдельно firefox/webkit) |
| Browser limits | Chromium 156.0.8078.4, Firefox 157.0, WebKit 27.2: desktop projects, viewport emulation; не iOS/Safari 15 |

## Executed Evidence

| Evidence | Actual outcome | Qualification |
|---|---|---|
| `.tmp/phase01-qa/unit-final.log` | 134 passed, 4 files | После исправления фокуса |
| `release-chromium.log/xml` | 112 passed, exit 0; 93.141 s wall | Полный исходный прогон до узкого focus fix |
| `release-firefox.log/xml` | 112 passed, exit 0; 124.531 s wall | Полный исходный прогон до узкого focus fix |
| `release-webkit-final.log/xml` | 112 passed; 154.689 s JUnit | Финальный полный прогон после focus fix |
| `focus-cross-browser-final.log/xml` | 70 passed, 35/browser; 74.461 s JUnit | После fix: все navigation/storage/accessibility Chromium + Firefox |
| `focus-red.log/xml/json` → `focus-green.log/xml` | 2 failed → 2 passed, 6.3 s | Profile/exit return-focus; исходные assertions сохранены |
| `reduced-motion-red.xml/json` | 10 passed / 1 failed → focused 11 passed | Ошибка specificity исправлена в 01-08; фактический RED сохранён |
| `docs/qa/phase01.md`, 01-08-SUMMARY | typecheck/lint/build exit 0; final build 3.74 s, dist/index.html | Начальный TS2550 в release-typecheck.log исправлен; release-results.json содержит исторический неуспех и не является финальным агрегатом |

Локальные `.tmp` журналы просмотрены при аудите; долговременный tracked отчёт — `docs/qa/phase01.md` и неизменённые SUMMARY. Ни 70 повторных кейсов, ни старый release-results.json не обозначают второй полный Chromium/Firefox прогон.

## Per-Task Verification Map

Все команды выполняются из корня проекта. `green` относится только к указанному автоматизированному поведению; file exists = yes у всех перечисленных specs. Неуспех, No tests found и ноль выполненных тестов не считаются успехом.

| Task ID | Requirement | Type | Automated command / file | Observable test ID or behavior | Status |
|---|---|---|---|---|---|
| 01-01-01 | APP-01 install gate | record | node assertion из 01-01-PLAN; docs/qa/phase01-install-preflight.json | Human approval/pins/peers; исполнение записано в 01-01-SUMMARY | record verified; не runtime test |
| 01-01-02 | APP-01, APP-03, WIZ-02, UX-01 | e2e | `npm run test:e2e -- e2e/guest.spec.ts --project=webkit` | guest people count survives a real reload; only validated plan presence redirects the root; late/error/invalid presence, literal brand, double CTA | green |
| 01-02-01 | APP-01/02/03, UX-01 | e2e | `npm run test:e2e -- e2e/navigation.spec.ts --project=webkit` | deep routes and neighboring paths; exact 1199 to 1200 boundary; profile trap/Escape/resize; late presence | green; visual/device pending |
| 01-02-02 | APP-01/02, UX-01 | e2e/build | `npm run typecheck`; `npm run lint`; `npm run build`; navigation.spec.ts | Shared type scale, targets, route states; safari15 build target | green; build target не доказательство Safari 15 |
| 01-03-01 | WIZ-01/02 | unit/e2e | `npm run test:unit -- --run src/domain/settings.test.ts src/adapters/guestDraft.test.ts`; `npm run test:e2e -- e2e/storage.spec.ts --project=webkit` | corrupt bytes explicit safe reset; hydrate before edits; raw partial strings; read/write/remove throws; newest retry | green |
| 01-03-02 | WIZ-01/02 | unit/e2e | `npm run test:e2e -- e2e/storage.spec.ts --project=webkit --grep exit`; guestDraft.test.ts unit command above | exit cancel retains raw and focus; pending/memory copy honest; late callbacks keep newest draft | green |
| 01-04-01 | WIZ-01/02/03 | unit/e2e | `npm run test:unit -- --run src/domain/settings.test.ts`; `npm run test:e2e -- e2e/wizard.spec.ts --project=webkit` | WIZ-03 boundary people/days, 4+, goals; raw reload, first invalid focus; double Next cannot skip | green |
| 01-04-02 | WIZ-09 manual | unit/e2e | `npm run test:unit -- --run src/domain/nutritionTarget.test.ts`; `npm run test:e2e -- e2e/nutrition.spec.ts --project=webkit` | absent whitespace, partial/clear, full finite values, zero kcal/negative/nonfinite errors, source/person-day and raw reload | green, amended manual only |
| 01-05-01 | WIZ-04 | unit/e2e | `npm run test:unit -- --run src/domain/budget.test.ts`; `npm run test:e2e -- e2e/budget.spec.ts --project=webkit` | exact field and truthful range projection: 500/1000/1050/15000/20000; unsafe/partial input; people/days affect hint only | green |
| 01-05-02 | WIZ-05 | e2e | `npm run test:e2e -- e2e/budget.spec.ts --project=webkit --grep time-variety` | defaults/order, keyboard/idempotency, latest choices/back/reload, invalid stored enums | green |
| 01-06-01 | WIZ-06 | e2e | `npm run test:e2e -- e2e/products.spec.ts --project=webkit --grep exclusions` | five restrictions, resolved ID tags Enter/comma, duplicate/undo order/5 s expiry; latest request/loading/error/retry; hostile literal labels | green |
| 01-06-02 | WIZ-01/02/07, UX-01 | unit/e2e | `npm run test:unit -- --run src/domain/settings.test.ts`; `npm run test:e2e -- e2e/products.spec.ts --project=webkit --grep home-products` | six popular IDs; unknown ≠ zero; positive quantity/compatible unit; expiry/duplicate focus/undo/raw reload; no confirmed/pantry mutation; provenance | green |
| 01-07-01 | WIZ-09 scope / NEXT-10 | record | exact node assertion из 01-07-PLAN, 01-07-SUMMARY | human amendment/source/time/archive; validator expected exit 1 REPLAN_REQUIRED | docs verified; calculator locked |
| 01-07-02 | WIZ-09 manual / NEXT-10 | docs | exact node assertion из 01-07-PLAN; git diff --check | manual P0 / calculator P1 mapping; no invented formula | docs verified; не calculator pass |
| 01-08-01 | APP-01/02/03, WIZ-01/02/09, UX-01 | e2e | `npm run test:e2e -- e2e/presentation.spec.ts --project=webkit` | 15 cases: seven-width complete guest journey/raw IDs/manual origin; absence/partial correction; six truthful route states at 200% CSS text | green; visual/native zoom pending |
| 01-08-02 | WIZ-01/02/09, UX-01 | e2e/release | `npm run test:e2e -- e2e/accessibility.spec.ts --project=webkit` | 11 cases: keyboard trap/cancel/restore/first error; skip link/current nav/targets/reduce; combobox; seven-width sticky errors; short viewport | green; human accessibility pending |

Named focused commands above select cases actually included in the full final WebKit run; they are repeatable commands, not a claim that every filtered command was separately rerun during this audit. Requirements APP-01/02/03, WIZ-01/02, UX-01 retain final-verifier/human acceptance status independently of automated green. WIZ-03…07 and amended manual WIZ-09 have recorded completion in current REQUIREMENTS.

## Predicate Allocation and Remaining Gaps

| Group | Coverage and limit | Resolution |
|---|---|---|
| welcome/navigation/routes | guest/navigation: pending/error/empty/encoding/history/late response/1199–1200/current nav; presentation seven-width route reflow | FILLED automated |
| raw draft/recovery/navigation | settings/guestDraft + storage/wizard: structural validity vs readiness, hydrate, latest retry, exact-key reset, safe exit, reload | FILLED automated |
| people/budget/manual target | settings/budget/nutritionTarget + wizard/budget/nutrition/presentation; actual input and saved-state assertions | FILLED automated |
| exclusions/home products | products: empty/loading/error/retry/stale/partial/populated/zero-one-many/long literal labels, IDs, unknown quantity, compatible units, undo | FILLED automated |
| layout/keyboard | presentation/accessibility geometry, CSS text 200%, focus, targets and short viewport | WARNING: partial; human cases below pending |
| two tabs | storage test `two-tab backstop observes independent memory and last successful local write without claiming sync` | WARNING: tested last-write behavior, user conflict judgement pending |
| calculator | NEXT-10 P1, confirmed D-10 | explicit justified SKIP from P0; не implementation gap и не выполненное требование |

Новых критических пропусков автоматизированного поведения в пределах проверенного гостевого среза не выявлено. Новые тесты не создавались: существующие проверки включены в реальные зелёные прогоны. Это не снимает следующие непроверенные обязательные случаи и не подтверждает все будущие P0 функции. Исторические 54/45 counts не используются как количество принятых predicates.

## Manual-Only Verifications — pending / human_needed

| Gap | Requirement / owner | Why existing automation is insufficient | Required evidence |
|---|---|---|---|
| M-01 iOS keyboard/safe area | APP-02, WIZ-01, UI D-16 | desktop 390×400 проверяет поток, не virtual keyboard/safe area | Реальное iOS: все поля/поиск/footer достижимы при клавиатуре, portrait/rotation и safe-area |
| M-02 historical Safari 15 | PRD compatibility | WebKit 27.2 и safari15 build target не исполняют Safari 15 | Реальный Safari 15: guest/reload/dialogs/search/manual target либо явное согласованное изменение совместимости |
| M-03 screen reader / full contrast | UX-01, UI accessibility | ARIA/focus/geometry не доказывают announcements и AA всех состояний | Screen reader walkthrough labels/status/errors/dialog/listbox; измерение контраста normal/hover/focus/error/disabled |
| M-04 native zoom / final visuals | UX-01, APP-02, D-15/16 | font-size 200% не browser zoom; выборочный просмотр PNG не человеческое одобрение всех экранов | Native 200% zoom и оценка читаемости/перекрытий всех шагов/ошибок; сравнение с предоставленными PDF |
| M-05 Q-17 LCP | quality/Q-17 | нет согласованной методики и фактического измерения | Согласованный device/network/cache метод и реальное измерение LCP |
| M-06 concurrency / safety judgement | WIZ-02, WIZ-09, WIZ-06/07 | two-tab backstop не принимает UX конфликтов; flagged prohibitions 04/06 не получают общий pass | Оценка конфликтов двух вкладок и отсутствие ложных медицинских/пищевых деклараций; remaining Q-03 для будущей генерации отдельно |

Все шесть — WARNING / unverified requirement, не green и не заполненные gaps. Они эскалированы итоговому verifier; недоступность среды не заменяет результат. Учёт ограничений: docs/qa/phase01.md и .planning/WINDOWS.md entries 4–9. Известный MODULE_LEVEL_DIRECTIVE остаётся в WINDOWS и не скрывается аудитом.

## Sampling and Sign-Off

- [x] Nyquist включён в .planning/config.json; все 8 PLAN/SUMMARY учтены.
- [x] Wave 0 инфраструктура, содержательные unit/e2e и реальные scripts существуют; команды не watch и не passWithNoTests.
- [x] У каждой исполняемой задачи есть automated verify/fails_when либо проверенный human decision record; трёх задач без автоматической проверки нет.
- [x] Actual evidence отделено от исторического RED и будущей функциональности; amendment не выдаётся за реализованный калькулятор.
- [x] Достаточно unit/focused feedback; длительный release suite не обещается менее 60 секунд.
- [ ] Все обязательные human/device/judgement cases подтверждены.
- [ ] Phase 1 принята итоговым verifier и человеком; nyquist_compliant=true.

**Approval:** pending human verification. Итог этого hook — PARTIAL: автоматизированное покрытие подтверждено существующими выполненными тестами, 6 групп обязательных проверок остаются human_needed. Приложение, весь P0 и Phase 1 этим документом не объявляются завершёнными. Следующий шаг — итоговый verifier с открытыми M-01…M-06; новые тесты/commits аудитом не создавались.

## Validation Audit 2026-10-27

| Metric | Count |
|---|---|
| Gaps found | 6 |
| Resolved | 0 |
| Escalated | 6 |


## Человеческая приёмка 2026-10-27

Пользователь ответил «pass» на каждый отдельный пункт H1–H9 в `01-UAT.md`: 9 passed, 0 issues, 0 pending. Это пользовательские результаты; они не приписываются автоматизации или агенту. Исторические pending/device/judgement строки выше отражают состояние до UAT и закрыты этими ответами для Phase 1. Численные LCP-значения, модель устройства и сеть в чате не сообщены: новые измерения или методика не выдумываются; исходный Q-17 остаётся журналом неизвестных деталей будущей воспроизводимости.

H9 принимает текущее добавление домашнего продукта выбором результата без отдельной кнопки. Соответствующая поправка внесена в `01-UI-SPEC.md`; источник решения — `docs/decisions/home-product-addition.json`. C1 больше не является непринятым расхождением; исходная оценка UI-аудита и история замечания сохраняются. Результаты автоматизированных прогонов выше не изменяются и не выдаются за новые прогоны. Завершение фазы определяется итоговым VERIFICATION и GSD completion gate.
