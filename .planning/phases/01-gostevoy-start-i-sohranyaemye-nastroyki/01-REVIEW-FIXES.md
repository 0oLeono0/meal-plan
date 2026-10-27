---
phase: "01"
fixed_at: "2026-10-27T08:57:33Z"
review_path: .planning/phases/01-gostevoy-start-i-sohranyaemye-nastroyki/01-REVIEW.md
reviewed_revision: c899a1caea6564461b815fce1966923bc35c5bcd
verified_source_revision: 8cd5872
iteration: 1
findings_in_scope: 3
fixed: 3
skipped: 0
status: all_fixed
---

# Phase 1: Code Review Fix Report

**Fixed at:** 2026-10-27T08:57:33Z  
**Source review:** 01-REVIEW.md, revision `c899a1c`  
**Iteration:** 1

**Summary:**

- Findings in scope: 3 (CR-01, WR-01, WR-02).
- Fixed: 3, отдельный коммит для каждого замечания.
- Skipped: 0.

## Fixed Issues

### CR-01: Повтор после ошибки чтения без редактирования стирает восстановленный черновик

**Files modified:** `src/app/App.tsx`, `e2e/fixtures.ts`, новый `e2e/storage-retry.spec.ts`  
**Commit:** `8811b0f`  
**Status:** fixed: requires human verification  
**Applied fix:** App отмечает реальные изменения memory draft. После успешного повторного чтения нетронутая память восстанавливается из `result.draft`, включая шаг, без записи в storage. `missing` остаётся новым несохранённым черновиком. Если пользователь редактировал память, в том числе во время await, сохраняется её последняя версия. Проверка revision/mounted/resetting отбрасывает устаревший результат чтения. Dirty flag сбрасывается при новой гидратации и успешном явном reset. Адаптер и схема хранения не изменены.

Шесть новых тестов проверяют полный снимок со всеми полями, ограничениями, ID исключения, домашним продуктом/сырой дробной quantity/unit/expiry и manual source. Обычный App с отказом реального Storage.getItem восстанавливает step 3 и сохраняет исходные форматированные байты без перезаписи. Отдельный управляемый Promise на втором чтении проверяет edits до retry и только во время retry; ожидание не зависит от скорости браузера. Остальные ветви: missing без записи, corrupt без перезаписи и потерянных memory edits, failed write после read retry с успешной записью последней версии при следующем повторе. Это исправление логики состояния; пометка требует независимого просмотра логики, даже при успешных автоматизированных регрессиях.

### WR-01: «Далее» не фокусирует ошибку внутри свёрнутой нормы КБЖУ

**Files modified:** `src/features/wizard/Wizard.tsx`, `e2e/nutrition.spec.ts`  
**Commit:** `a82e308`  
**Status:** fixed  
**Applied fix:** `next()` задаёт ID первой ошибки в существующий `pendingFocus` до `setErrors`. Существующий effect фокусирует поле и прокручивает его после React commit, когда NutritionFields уже раскрыт. Немедленный focus скрытого поля удалён.

Два новых сценария полностью используют клавиатуру для раскрытия, сворачивания и «Далее»: invalid calories на 390px и partial с первым invalid protein на 360px/200% CSS text. Проверены focus, раскрытие, inline aria/error, отсутствие перехода шага, горизонтального overflow и перекрытия поля/ошибки footer.

### WR-02: После успешного сброса на первом шаге фокус теряется на body

**Files modified:** `src/shared/ui.tsx`, `src/features/wizard/Wizard.tsx`, `e2e/storage.spec.ts`  
**Commit:** `8cd5872`  
**Status:** fixed  
**Applied fix:** ConfirmDialog принимает необязательный ID fallback-фокуса. При cleanup после снятия trap и aria-hidden он возвращается к живому инициатору; если инициатор удалён, фокусируется заданный доступный элемент. Только reset-диалог передаёт `wizard-title`. Это работает и при неизменном шаге 1. Отмена и failed reset сохраняют исходный initiator.

Расширены реальные corrupt/reset и failed-reset сценарии: после успешного сброса focus на heading; Escape/cancel возвращают живую reset-кнопку; failed reset оставляет focus внутри диалога, исходные байты и memory edit; чужие ключи не меняются. Предположение, что pointer click обязательно фокусирует confirm в WebKit, не используется.

## Verification

Все команды выполнены в **основном checkout** `D:/Projects/meal-plan`, существующая ветка `codex/phase01-execution`. `workflow.use_worktrees=false` соблюдён; worktree/ветки/зависимости/сервисы не создавались. Исходные разделы изменённых файлов перечитаны после правок; TypeScript проверен перед каждым коммитом. Последний исходный revision — `8cd5872`.

| Команда / этап | Фактический результат |
|---|---|
| `npx playwright test e2e/storage-retry.spec.ts --project=chromium --project=webkit --grep 'without edits\|missing read'` до CR-01 fix | 4 failed: defaults перезаписывали полный snapshot; missing получал unsolicited save |
| `npx playwright test e2e/storage-retry.spec.ts --project=chromium --project=webkit` после fix | 12 passed, 12.4s |
| `npx playwright test e2e/nutrition.spec.ts --grep WR-01 --project=chromium --project=webkit --project=firefox` | RED: 6 failed на missing focus → GREEN: 6 passed, 12.0s |
| `npx playwright test e2e/storage.spec.ts --grep 'corrupt bytes' --project=chromium --project=webkit --project=firefox` до WR-02 fix | 3 failed на missing heading focus после reset |
| `npx playwright test e2e/storage.spec.ts --grep 'corrupt bytes\|reset failure' --project=chromium --project=webkit --project=firefox` после fix | 6 passed, 13.4s |
| `npx playwright test e2e/storage-retry.spec.ts e2e/storage.spec.ts e2e/nutrition.spec.ts e2e/guest.spec.ts e2e/accessibility.spec.ts --project=chromium --project=webkit --project=firefox` | **185 passed / 1 error**, 167.640s JUnit, exit 1. Chromium 62 passed, WebKit 62 passed, Firefox 61 passed + 1 context teardown error |
| `npx playwright test e2e/accessibility.spec.ts --grep 'skip link visible focus target sizes' --project=firefox` | 1 error повторно, 6.364s JUnit, exit 1; та же ошибка закрытия контекста |
| `npm run test:unit -- --run` | 134 passed, 4 files, 641ms Vitest |
| `npm run typecheck`, `npm run lint`, `npm run build` | Все exit 0; build target safari15, 1.12s |

Все регрессии трёх findings прошли в Chromium, Firefox и WebKit в итоговом связанном запуске. Его единственная ошибка — `accessibility skip link visible focus target sizes navigation current state and reduced motion`: после проверок страницы Firefox сообщает `browserContext.close: Protocol error (Browser.removeBrowserContext): can't access property "_maybeDontRestoreTabs", this[#windows][aWindow.__SSi] is undefined`. Изолированный повтор воспроизводит её. Причина инфраструктуры ещё не установлена; она не объявлена исправленной или доказанно pre-existing. Тест и проверки не ослаблены. Это **не 186 green**.

Evidence сохранено локально: `.tmp/phase01-qa/review-related-186.xml`, `review-related-firefox-teardown.md`, `review-related-firefox-teardown.zip`, `review-firefox-teardown-rerun.xml`. В промежуточном storage запуске после fix было 34 passed/2 failed из-за неоднозначного `role=status` на восстановленном шаге 3; локатор уточнён до save notice. В первичном reset диагностическом запуске ожидание pointer-focus в WebKit заменено на корректное containment focus; чистый RED успешного reset затем отдельно подтверждён во всех трёх движках. Во время одного раннего диагностического запуска правка другого участка Wizard вызвала Vite HMR warning; итоговый связанный запуск выполнен без source edits и этого warning.

Старые full-suite результаты и предыдущая UI remediation описаны в `docs/qa/phase01.md`. Новый полный suite не запускался: нынешние результаты составляют **composite coverage**, а неизменённые бюджет/products/presentation не выдаются за повторно проверенные после этих исправлений. Ограничения real iOS/keyboard/safe-area, Safari 15, native zoom, screen reader/contrast, human visual acceptance, LCP и two-tab UX остаются. Phase 1 всё ещё awaiting independent verification/acceptance; Phase 2 не начата. REVIEW.md сохранён как исходная история замечаний.

---

_Fixed: 2026-10-27T08:57:33Z_  
_Fixer: the agent (gsd-code-fixer)_  
_Iteration: 1_

## Orchestrator follow-up — Firefox teardown, 2026-10-27

Без изменения исходников, тестов, зависимостей или настроек Firefox проблемный skip-link/reduced-motion case прошёл одиночно с `--workers=1` (1/1, 7.4s), затем с обычными двумя workers и `--repeat-each=3` (3/3, 13.2s). Причина прежнего сбоя протокола SessionStore не доказана; это не заявляется как исправленная ошибка приложения или подтверждённая причинность параллелизма. Ошибка и исходные trace/XML сохранены.

После этих диагностических повторов весь связанный Firefox-набор guest/storage/storage-retry/nutrition/accessibility на неизменённой ревизии прошёл **62/62** (64.172s процесса, exit 0). Evidence: `.tmp/phase01-qa/review-firefox-final.{json,log,xml}`. В предыдущем запуске Chromium и WebKit прошли по 62; текущий Firefox закрывает повторную проверку затронутых областей отдельным запуском. Не выдаётся за один новый full-suite 186/186. Независимый verifier ещё должен проверить логику CR-01 и оставшиеся критерии приёмки.
