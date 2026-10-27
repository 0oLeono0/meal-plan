# Фаза 01: фактическая QA гостевого мастера

Дата: 26–27.10.2026. Статус: автоматизированная QA 01-08; полная фаза ожидает отдельной верификации и человеческих проверок ниже. Источник scope — 01-08-PLAN, D-01…D-17 и подтверждённая человеком поправка C-04/D-10. Автоматический калькулятор NEXT-10 и его empty/loading/error/partial/overflow/long-text — deferred P1, без реализации или вычислительного кредита.

## Выполненная проверка презентации

Добавлены 15 сценариев `e2e/presentation.spec.ts`: полный гостевой путь на 360/390/430/768/1199/1200/1280×800; отдельный manual absence/partial/clear/reload; честные состояния шести маршрутов с текстом 200% на каждой ширине. UI ведёт welcome → шаги 1–4 → проверка draft → reload. Проверяются raw ` 1800,5 ` и ` 1,25 `, manual origin, product IDs, единицы, expiry, ограничения, неизвестное количество, точные 1050 ₽ и отсутствие confirmed/pantry/plan writes. Средняя норма не подставляется, кнопки генерации/автокалькулятора и demographic-поля отсутствуют.

| Команда | Фактический результат | Время Playwright |
|---|---|---|
| `npm run test:e2e -- e2e/presentation.spec.ts --project=chromium --grep smoke` | 1 passed; Chromium 156.0.8078.4 | 7.0 s |
| `npm run test:e2e -- e2e/presentation.spec.ts --project=chromium` | 15 passed | 27.6 s |
| `npm run test:e2e -- e2e/accessibility.spec.ts --project=chromium --grep smoke` | 1 passed | 4.6 s |
| `npm run test:e2e -- e2e/accessibility.spec.ts --project=chromium` | После исправления reduced motion: 11 passed | 16.1 s |

Первоначальные запуски нового smoke падали из-за предположенных локаторов («Любое время» вместо «любое»), тестового темпа быстрее намеренного 250 ms double-next guard и неоднозначного общего `role=status` после появления поиска. Тест исправлен по фактическому интерфейсу: реальные названия каталога (Помидоры, Яйца), явный темп 260 ms между переходами и адресная проверка save-status. Это QA существующей реализации: assertion RED для новой функции и новая GREEN-реализация не заявляются.

Найдена отдельная реальная регрессия общего стиля 01-02: `.app-shell button` имел большую специфичность, чем reduced-motion `.app-shell *`, поэтому оставался `transitionDuration=0.12s` вместо `0s`. Сохранён JUnit RED (10 passed/1 failed, 16.7 s), `check tdd-red-evidence .tmp/phase01-qa/reduced-motion-red.json --raw` вернул `RED_EVIDENCE_OK`. После test commit `c4ac329` выполнено узкое исправление `d557cb5` (Rule 1/3, возврат владельцу 01-02): повысить специфичность единственного media-rule через `:is(*, button)`. Полный focused accessibility повторно прошёл 11/11; нет новых зависимостей, роутов, API или изменений бизнес-логики. Никакой рефакторинг ради QA не выполнялся.

## Применимые требования, решения и состояния

Это новый поимённый аудит применимости. Исторические counts инвентаризации не используются как число проверенных элементов. `passed` здесь означает проверенное указанным тестом поведение, а не человеческую оценку качества или завершение будущих фаз.

| P0 ID Phase 1 | Фактическое evidence |
|---|---|
| APP-01 | guest/navigation: deep-link/reload всех гостевых маршрутов; generating/menu/shopping/pantry пока честные состояния; неизвестный recipe и произвольный route имеют безопасный возврат. Генерации/аутентификации нет |
| APP-02 | navigation: единственный nav DOM, current state, 1199→1200 CSS breakpoint, fullscreen master/generating; presentation: вся матрица |
| APP-03 | guest: welcome, валидируемый plan-presence fixture и root redirect, late/error/invalid presence, double CTA; реальный generated plan не заявляется |
| WIZ-01 | wizard/storage/accessibility: 1–4, прогресс, назад/выход/cancel, trap и restore focus, первый invalid field и sticky reserve |
| WIZ-02 | storage/presentation: исходные строки и IDs, шаг/ограничения/норма, real reload, memory/retry/corrupt reset; автоматизированный двухвкладочный backstop существует, UX-конфликты остаются human_needed |
| WIZ-03 | wizard + settings unit: люди 1/10, чип 4+→4, дни 1/7, три цели, restored values вместо defaults |
| WIZ-04 | budget + budget unit: 500/1000/1050/15000/20000, небезопасные/дробные/пустые, точное поле и отдельно truthful slider aria; hint зависит от людей и дней |
| WIZ-05 | budget time-variety: четыре времени и три разновидности, сохранение budget/raw при возврате и reload |
| WIZ-06 | products: пять ограничений, Enter/запятая/удаление/undo, IDs, literal hostile/long labels, latest response и сохранённые ограничения |
| WIZ-07 | products + settings unit: шесть names-only популярных IDs, unknown ≠ zero, finite positive quantity, совместимые единицы без конверсии, expiry, duplicate focus, undo, без изменения global pantry |
| WIZ-09 | nutrition/presentation: необязательная ручная цель на человека/день; пустая/partial/full/invalid, clear, raw reload, manual source, без средних норм/medical assessment. Только amended manual P0; автоматический NEXT-10 не выполнен |
| UX-01 | guest/navigation/presentation: русский UI, ₽/единицы, configured brand остаётся literal text, длинная кириллица/200% text, общие токены |

| Решение | Проверяемое поведение и предел |
|---|---|
| D-01…D-03 | guest/navigation/presentation: гостевой welcome/секции, профиль только пояснение, menu redirect только через валидный fixture, никакой fake generation |
| D-04…D-08 | wizard/budget/storage/accessibility: порядок шагов, сырые значения, период, границы/дефолты, точный budget vs thumb, validation и первый error focus |
| D-09 | nutrition/presentation: manual optional target, provenance и отсутствие медицинских выводов; safety-judgment запреты не получают общий автоматический pass |
| D-10 | человеческий record/mapping 01-07 и presentation: calculator UI отсутствует; шесть calculator UI/edge-строк явно deferred P1, формулы и remaining Q-03 открыты |
| D-11…D-14 | products/storage: catalog IDs, неизвестное количество отдельно, skip не реализует generation, exact-key recovery, latest write и память; confirmed/pantry не меняются |
| D-15…D-16 | screenshot inspection + presentation/accessibility: общий визуальный язык, все заданные ширины, 200% CSS text, error focus/sticky/targets; финальный visual judgment, native zoom и реальное устройство pending |
| D-17 | products: search loading/no results/error/retry/stale response, популярные IDs; отсутствуют выдуманные нутриенты/цены/декларация allergy safety |

| UI/edge group | Выполненное наблюдаемое покрытие |
|---|---|
| welcome/nav/routes | empty, pending/error presence, unknown route/recipe, profile dialog, long brand, 200% text и overflow; desktop/mobile breakpoint |
| people/budget/manual/recovery | empty/default/restored, loading hydrate, inline error и first focus, partial raw, recovery warnings, retry/reset, long-text/overflow |
| exclusions/home | empty/loading/error/retry/populated/partial, latest request, zero-one-many, duplicate product, long literal labels, pending undo и expiry |
| calculator NEXT-10 | empty/loading/error/partial/overflow/long-text: deferred P1; не реализованы и не проверены как P0 |
| concurrency / judgement | storage two-tab автоматизированный backstop проверяет независимую память/последнюю запись; пользовательское ожидание конфликтов и flagged safety prohibitions 04/06 остаются human_needed |

## Визуальные evidence

Артефакты создаются локально в `.tmp/phase01-qa/`, вне git: `{project}-{width}-{welcome|step1|step2|step3|step4|review}.png`, шесть `{route}-text200.png` и `wizard-text200.png` на ширину. Full-page screenshot закреплённой панели показывает её в текущем viewport внутри длинного документа; это не доказывает наложение при каждом положении прокрутки. Отдельные geometry assertions проверяют, что invalid field целиком выше footer после фокусирования на каждом шаге с полем; при высоте 400 px действия переходят в поток. Это desktop short-height test, не реальная клавиатура.

Фактически открыты изображения PDF-макета `reference-review/Планировщик_питания_—_ключевые_экраны/page-1.png`, `page-4.png`, `page-6.png` и screenshots Chromium: `360-step2`, `360-review`, `360-welcome`, `390-step1`, `430-step3`, `768-step4`, `1199-_menu-text200`, `1200-_menu-text200`, `1280-step2`, `360-wizard-text200`. Это явный просмотр хотя бы одного кадра каждой ширины, а не заявление о ручном просмотре каждого созданного PNG. Сохранены светлый фон, белые скруглённые группы, зелёные действия и четыре позиции навигации. Есть видимые отличия: системный шрифт вместо макетного, вертикальные radio-списки времени/разнообразия вместо компактных чипов, обычный input бюджета вместо крупной типографики, расширенный explanatory copy. При 200% на 360 длинные слова footer переносятся; читаемость и финальное визуальное качество требуют human judgment. Дни на шаге 1 соответствуют подробному ТЗ, а не PDF; отсутствие калькулятора — подтверждённая D-10 поправка. Shopping/pantry пока честные empty routes: макетные покупки/склад/рекомендации не реализованы этой фазой. Полное pixel-fidelity или человеческое одобрение визуального качества не заявляется.

Playwright MCP также реально использован на отдельном локальном Vite `127.0.0.1:4180`: welcome→четыре шага→review, 390×800, 4 человека/7 дней/500 ₽, Без рыбы, исключение Рис, Курица 200 г, reload сохраняет шаг 4 и количество. `overflow=false`, console errors 0 на момент проверки. Скриншоты `mcp-390-step1.png` (название историческое: это welcome), `mcp-390-step2.png`, `mcp-390-review.png`; последний открыт для просмотра отдельно. Один предварительный MCP-вызов ожидал шаг 4 после слишком быстрого перехода и получил timeout на отсутствии popular group; snapshot подтвердил шаг 3, повторное обычное «Далее» завершило сценарий. Это не скрыто и не выдано за приложение, пропустившее шаг. Порт 4173 первого MCP-вызова не был запущен (ERR_CONNECTION_REFUSED), браузер пользователя не завершался.

## Остающиеся проверки

### Дополнение оркестратора 2026-10-27: повтор Firefox после review fixes

Исторический teardown error `Browser.removeBrowserContext / _maybeDontRestoreTabs` не скрыт. На неизменённых исходниках проблемный skip-link case затем прошёл 1/1 с одним worker и 3/3 с обычными двумя workers; полный затронутый Firefox-набор guest/storage/storage-retry/nutrition/accessibility прошёл **62/62**, exit 0, 64.172s. Логи/XML/JSON: `.tmp/phase01-qa/review-firefox-final.*`. Причинность настройки workers не установлена, код и browser preferences не менялись. Результаты всех затронутых областей теперь green по отдельным запускам Chromium/WebKit/Firefox, не один фиктивный full-suite. Прежние human/device gates остаются открытыми до независимой приёмки.

Human/backstop: настоящий iOS с клавиатурой и safe-area, исторический Safari 15, screen reader/полный contrast review, browser zoom, визуальное одобрение всех экранов, двухвкладочный UX и методика LCP Q-17. Desktop emulation не заменяет эти проверки. Upstream react-router MODULE_LEVEL_DIRECTIVE остаётся открытым в WINDOWS.md. Проверка PDF здесь означает просмотр предоставленных макетов; экспорт списка покупок относится к Phase 7 и не заявляется.

## Release suite и исправления по фактическим сбоям

Первый полный запуск 26.10: Vitest 134 passed, Chromium 112 passed (93.141 s wall), Firefox 112 passed (124.531 s wall), WebKit 110 passed / 2 failed (151.859 s wall). Полные неизменённые логи/JUnit сохранены в `.tmp/phase01-qa/release-*`; `release-results.json` хранит exit codes и время. Chromium 156.0.8078.4, Firefox 157.0 и WebKit 27.2 — версии из выполненных запусков. Это desktop проекты с заданными viewport, не реальные мобильные устройства.

Typecheck первоначально вернул TS2550: тест использовал `String.replaceAll` вне выбранной TS lib. В `e2e/presentation.spec.ts` заменён только способ построения имени screenshot на `replace(/\//g, '_')`; тестовые assertions сохранены. Повторный typecheck прошёл. Lint/build первого запуска прошли; MODULE_LEVEL_DIRECTIVE не скрыт.

Оба WebKit сбоя — `navigation.spec.ts` profile Escape/resize и `storage.spec.ts` exit cancel — воспроизведены отдельно 27.10: **2 failed**, сохранены `focus-red.log/xml/json`; `check tdd-red-evidence .tmp/phase01-qa/focus-red.json --raw` дал **RED_EVIDENCE_OK**. Семантическая проверка: диалог открывался, trap работал, Escape закрывал его; падало именно `toBeFocused()` на инициаторе. `ConfirmDialog` запоминал `document.activeElement`, но pointer activation WebKit не обязана фокусировать clicked button/link. Исправление владельца общего UI 01-02/выхода 01-03: сохранять явный инициатор в момент открытия и передавать `returnFocus`; fallback остаётся для программного открытия. Все три места (профиль, выход, сброс) используют этот контракт. Это Rule 1/3 исправление регрессии, commit `96d1bf3`; assertions не ослаблены. Повтор исходных двух кейсов: **2 passed, 6.3 s** (`focus-green.log/xml`).

После изменения UI повторены: Vitest **134 passed / 4 files, 1.17 s**, typecheck **exit 0**, lint **exit 0**, production build **exit 0 / 3.74 s**, `dist/index.html` создан. Нет новых зависимостей, сетевых endpoints, изменения пищевых/денежных правил или опубликованных артефактов.

| Финальная проверка после исправления фокуса | Результат |
|---|---|
| `npm run test:e2e -- --project=webkit` | **112 passed**, 154.689 s JUnit, exit 0; `release-webkit-final.log/xml` |
| `npm run test:e2e -- e2e/navigation.spec.ts e2e/storage.spec.ts e2e/accessibility.spec.ts --project=chromium --project=firefox` | **70 passed**, по 35 на браузер, 1.2 min Playwright, exit 0; `focus-cross-browser-final.log/xml` |

Полные Chromium/Firefox 112+112 относятся к запуску до узкого исправления фокуса; после него повторены все navigation/storage/accessibility этих браузеров. Остальные неизменённые сценарии не выдаются за повторный полный прогон. Полный финальный WebKit проверяет все 112 кейсов после исправления.

WIZ-09 принимается только как фактически проверенный amended manual P0: optional absence, partial/correction/clear, full values/raw reload/manual origin. Остальные общие IDs плана сохраняют Pending до итогового verifier и обязательных human gates; перечисленный выше automated coverage не равен полной приёмке. Всего выполнено 8/8 планов, но **Phase 1 awaiting verification**, приложение и весь P0 ещё не приняты. Шесть групп непроведённых проверок также записаны в `.planning/WINDOWS.md` (entries 4–9).

## UI contract remediation — 2026-10-27

Commit `6ebde75` устраняет три priority findings из `01-UI-REVIEW.md`: общие choice-label теперь flex/center/gap8/margin0 и ≥44px; бюджет 32px/600 с видимым ₽, raw value/slider aria сохранены; mobile footer до 768px имеет отдельные полные строки. Footer по-прежнему измеряется ResizeObserver. Дополнительный scroll-margin всего field учитывает его высоту и сохраняет ошибку над панелью при 200% CSS text. Общий accent, label400, spacing8/16 и общий словарь целей также выровнены с контрактом. Подпись поиска — «Найти продукт»; отдельная кнопка «Добавить продукт» остаётся открытым C1 interaction finding, выбор результата сразу добавляет ID.

| Выполненный запуск | Фактический результат |
|---|---|
| `npx playwright test e2e/presentation.spec.ts --project=chromium --grep 'contract 360px' --reporter=list` до исправления | **3 failed**, ожидаемые RED: block/16px/CTA144px вместо296px |
| Та же команда после исходного исправления | **3 passed** |
| `npx playwright test e2e/presentation.spec.ts e2e/accessibility.spec.ts e2e/wizard.spec.ts e2e/budget.spec.ts e2e/products.spec.ts --project=chromium --reporter=list` | **68 passed / 1 failed**; ошибка бюджета 360px/200% перекрывалась новой высокой панелью, затем исправлена scroll-margin |
| `npx playwright test e2e/budget.spec.ts e2e/accessibility.spec.ts e2e/presentation.spec.ts --project=chromium --grep 'overflow/long-text\|contract\|sticky errors' --reporter=list` после последнего CSS fix | **23 passed**, 31.1s; 12 contract cases, 7 all-step200% cases, 3 budget overflow и manual journey |
| `npx playwright test e2e/presentation.spec.ts e2e/accessibility.spec.ts e2e/budget.spec.ts e2e/wizard.spec.ts --project=webkit --grep 'presentation\|accessibility\|overflow/long-text\|WIZ-03 boundary\|D-04 navigation\|budget exact field' --reporter=list` на окончательном коде | **47 passed**, 1.6min; вся presentation/accessibility, бюджет 500/1050/20000, overflow, критические navigation/persistence cases |
| `npm run test:unit -- --run`, `npm run typecheck`, `npm run lint`, `npm run build` на окончательном коде | **134 passed / 4 files**, остальные **exit 0**; build 561ms |

Browser versions: Chromium 156.0.8078.4, WebKit 27.2. Исходные 112-case браузерные проверки выше не повторены целиком и не суммируются с этими targeted runs как новый full-suite pass. Устаревшее визуальное замечание выше об обычном input бюджета относится к кадрам до remediation.

Фактически просмотрены обновлённые screenshots `.tmp/phase01-qa/chromium-360-step2.png`, `chromium-390-step1.png`, `chromium-768-step4.png`, `chromium-1280-step2.png`; сопоставлены PDF reference pages 1/6. Виден крупный бюджет/₽, выровненные подписи, зелёный выбор и полная мобильная ширина primary. Full-page положение sticky не используется как доказательство постоянного перекрытия; видимость поля/ошибки подтверждают geometry assertions. Артефакты локальны и gitignored, production data не использовались. Ни новые баллы UI-аудита, ни human acceptance не объявлялись.

Открытые проверки real iOS/keyboard/safe-area, Safari15, native zoom, screen reader/полный contrast, визуальное одобрение, LCP и judgement backstops сохраняются. Phase 1 всё ещё awaiting verification/acceptance; Phase 2 не запускалась.

## Code review remediation — 2026-10-27

Ревью `01-REVIEW.md` на `c899a1c` выявило три прежде не покрытых сценария. Исходный отчёт сохранён. Исправления: `8811b0f` CR-01 — успешный read retry восстанавливает нетронутую память из снимка без записи defaults; edits до/во время await сохраняют приоритет. `a82e308` WR-01 — invalid field фокусируется после раскрытия nutrition, через существующий post-commit effect. `8cd5872` WR-02 — при удалённом reset-инициаторе диалог возвращает focus на heading; cancellation/failed reset сохраняют живой инициатор. Полные точные titles/изменённые файлы/коммиты — в `01-REVIEW-FIXES.md` и `01-REVIEW-DISPOSITION.md`.

Новые `storage-retry` проверяют полный snapshot, ID/ограничения/quantity/unit/expiry/manual source и byte-for-byte неизменность реального localStorage при retry без редактирования; контролируемый Promise второго чтения проверяет latest memory edits во время await. Покрыты missing/corrupt/retry-write-failure. Nutrition-регрессии используют клавиатуру при 390px и 360px/200% CSS text с проверкой первого invalid focus и положения field/error выше footer. Reset-регрессии проверяют сохранность чужих ключей, возвращение heading на том же шаге 1, focus trap после неуспеха и возврат инициатору после отмены.

| Команда / этап | Фактический результат |
|---|---|
| `npx playwright test e2e/storage-retry.spec.ts --project=chromium --project=webkit --grep 'without edits\|missing read'` до fix | **4 failed**, ожидаемый RED на стирании полного снимка / unsolicited default write |
| `npx playwright test e2e/storage-retry.spec.ts --project=chromium --project=webkit` после fix | **12 passed**, 12.4s |
| `npx playwright test e2e/nutrition.spec.ts --grep WR-01 --project=chromium --project=webkit --project=firefox` | **6 failed** до fix → **6 passed**, 12.0s после |
| `npx playwright test e2e/storage.spec.ts --grep 'corrupt bytes' --project=chromium --project=webkit --project=firefox` до fix | **3 failed**, heading не фокусировался после reset |
| `npx playwright test e2e/storage.spec.ts --grep 'corrupt bytes\|reset failure' --project=chromium --project=webkit --project=firefox` после fix | **6 passed**, 13.4s |
| `npx playwright test e2e/storage-retry.spec.ts e2e/storage.spec.ts e2e/nutrition.spec.ts e2e/guest.spec.ts e2e/accessibility.spec.ts --project=chromium --project=webkit --project=firefox` на `8cd5872` | **185 passed / 1 error**, exit 1, 167.640s JUnit; Chromium 62 passed, WebKit 62 passed, Firefox 61 passed + context teardown error |
| `npx playwright test e2e/accessibility.spec.ts --grep 'skip link visible focus target sizes' --project=firefox` | **1 error**, повтор той же ошибки закрытия контекста, 6.364s JUnit, exit 1 |
| `npm run test:unit -- --run`, `npm run typecheck`, `npm run lint`, `npm run build` | **134 passed / 4 files**, остальные exit 0; build safari15 1.12s |

Все три findings имеют успешные регрессии во всех трёх браузерах. Единственная ошибка связанного запуска — `accessibility skip link visible focus target sizes navigation current state and reduced motion`: `browserContext.close: Protocol error (Browser.removeBrowserContext): can't access property "_maybeDontRestoreTabs", this[#windows][aWindow.__SSi] is undefined`. Она возникает при teardown после проверок страницы и воспроизводится отдельно. Инфраструктурная причина ещё не установлена и не объявлена pre-existing; source/тест не изменялись ради обхода. Запуск **не считается 186 green**. Evidence: `.tmp/phase01-qa/review-related-186.xml`, `review-related-firefox-teardown.md/zip`, `review-firefox-teardown-rerun.xml`.

Все gates выполнены в основном checkout `D:/Projects/meal-plan`, ветка `codex/phase01-execution`, без worktree согласно config. Исходники заморожены на время итогового browser run. Ранний storage trial содержал 34 passed/2 selector errors из-за двух status на восстановленном шаге 3; save-status уточнён по notice, затем 12 регрессий прошли. В reset trial устранено неверное предположение pointer-focus WebKit; containment и возврат живого инициатора сохранены. Чистый RED успешного reset отдельно подтверждён all 3. Это уточнения тестовых предположений, а не ослабление требований хранения/фокуса.

Это **composite coverage** с прежними full runs выше: новый полный suite после этих трёх исправлений не запускался. Прежние budget/products/presentation не выдаются за повторно проверенные. Code review fixed не означает phase complete: независимая проверка логики CR-01, расследование Firefox teardown и прежние human/device/visual gates остаются; Phase 2 не начата.


## Человеческая приёмка 2026-10-27

Пользователь ответил «pass» на каждый отдельный пункт H1–H9 в `01-UAT.md`: 9 passed, 0 issues, 0 pending. Это пользовательские результаты; они не приписываются автоматизации или агенту. Исторические pending/device/judgement строки выше отражают состояние до UAT и закрыты этими ответами для Phase 1. Численные LCP-значения, модель устройства и сеть в чате не сообщены: новые измерения или методика не выдумываются; исходный Q-17 остаётся журналом неизвестных деталей будущей воспроизводимости.

H9 принимает текущее добавление домашнего продукта выбором результата без отдельной кнопки. Соответствующая поправка внесена в `01-UI-SPEC.md`; источник решения — `docs/decisions/home-product-addition.json`. C1 больше не является непринятым расхождением; исходная оценка UI-аудита и история замечания сохраняются. Результаты автоматизированных прогонов выше не изменяются и не выдаются за новые прогоны. Завершение фазы определяется итоговым VERIFICATION и GSD completion gate.
