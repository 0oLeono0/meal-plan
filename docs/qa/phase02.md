# Phase 2 — фактическая проверка

> Этот отчёт сохраняет историю release-матрицы и ограничений до post-audit исправлений. Актуальная совместная проверка30.10.2026 (359unit, текущие type/lint/build,140case prior-phase regression coverage и production smoke) — в `phase02-final-validation.md`. Исправления источников доверия, UI, no-fish и optionalunit имеют отдельные phase02-*-fix.md. Прежние full-browser результаты не выдаются за новый full-run текущегоHEAD.

Проверка 28–29.10.2026, основной checkout `D:/Projects/meal-plan`, ветка
`codex/phase01-execution`, Node24.12.0, установленные Vitest5.0.5 и Playwright1.64.1.
Новые зависимости, платные API, runtime-флаги и публикация не вводились.
Это evidence выполнения планов; независимые security/code-review/regression/verifier
ворота и пользовательская приёмка фазы оформляются оркестратором отдельно.
Исторические результаты Phase1 в `phase01.md` не изменены.

Статус29.10: все три задачи исполнения02-10 выполнены; ожидается независимая
приёмка фазы. Два Windows WebKit linkTab cases остаются failed/manual-unverified.
Оркестратор воспроизвёл пропуск ссылок на простой HTML-странице без приложения
(`phase02-webkit-assessment.md`,45777d6) и технически разрешил продолжение по
действующему auto-mode. Это не ответ пользователя/ручнойpass и не WebKit240/240.
История halt, все ошибки и WINDOWS14/15/16 сохранены; Phase2 не завершена.

## Проверки 02-10 до release

| Запуск | Фактический результат | Артефакт |
|---|---|---|
| Первый races trial | 7 passed / 2 failed,49.0s; неверное ожидание RAF-focus при замороженных часах и невидимой nav в fullscreen | `.tmp/02-10-races-initial.xml`, `.tmp/02-10-races-initial-results/` |
| Расширенный races | 14/14 Chromium,49.872602s | `.tmp/02-10-races-green.xml` |
| Tracer повтор + storage | 22/22 Chromium,14+8 | `.tmp/02-10-tracer-storage-green.xml` |
| Storage с усиленным source oracle | 8/8 Chromium,46.3s | `.tmp/02-10-storage-green.xml` |
| Изменённый late-response + external-blocked | 2/2 Chromium,18.9s | `.tmp/02-10-offline-late-green.xml` |
| Разделённый benchmark | 12/12 unit,4.75s | `.tmp/02-10-benchmark-split-green.log` |
| Legacy budget browser-loader correction | 11/11 Chromium,16.8s | `.tmp/02-10-budget-loader-green.xml` |

Первые два races failures были ошибками тестового сценария: замороженный
`requestAnimationFrame` требовал возобновления часов перед проверкой возврата
фокуса; полноэкранная генерация намеренно не имеет основной навигации, поэтому
уход проверяется настоящим browser Back. Они не выдаются за продуктовый RED.
Уже реализованное07/08 поведение проверено coverage-only GREEN при TDD_MODE=false.

Test-only порты подключаются через существующие props `App`. Успех после release
всегда делегируется `createLocalGeneration(bundledCatalogPort)`. Чтобы проверить
защиту от враждебно позднего результата, фикстура намеренно игнорирует исходный
AbortSignal; финальное сохранение делегируется настоящему adapter с `isCurrent`.
Счётчики позволяют различить search retry и retry-save. Никакой фикстуры в
production imports или переключателе URL/localStorage нет.

Браузерные assertions наблюдают реальный submit/quick-start/cancel/retry,
отсутствие повторного submit,2s status rotation, pending в29s и timeout после30s,
возврат фокуса, уход назад, старый ответ после нового успеха, deep reload без
операции, data/no-recipes/search/failed/budget причины. Полный/неполный synthetic
proof проверяет только подпись доказательства, а не источник цены или реальный
минимум. Нет доказательства — нет X/«минимума»; budget action открывает шаг2.

Storage assertions сохраняют точные старые bytes и active ID, pantry/sentinel,
различают несохранённый candidate и старый active, подтверждают отсутствие нового
поиска при retry-save. Corrupt/unknown schema/read denial блокируют запись;
повтор загрузки не сбрасывает данные. Отложенные save после cancel/timeout/new
request проверяют guard непосредственно перед настоящей записью. Реальная
перезагрузка сохраняет даты и раскрытые источники с IDs/100g/1kg/catalogVersion.
Новые edits во время draft-read retry имеют приоритет; прежние CR-01/WR-01/WR-02
сценарии остаются отдельными неизменёнными регрессиями в полной матрице.

## Release matrix

| Корневая команда | Фактический результат | Артефакт |
|---|---|---|
| `npm run test:unit -- --run` | 326/326,16files,8.56s,exit0 после описанного исправления benchmark | `.tmp/02-10-release-unit-final.log` |
| `npm run typecheck` | exit0; повтор после browser-loader correction также exit0 | `.tmp/02-10-release-typecheck.log`, `-after-loader.log` |
| `npm run lint` | exit0; повтор после browser-loader correction также exit0 | `.tmp/02-10-release-lint.log`, `-after-loader.log` |
| `npm run build` | exit0,Vite8.3.5,136modules,974ms; target safari15 | `.tmp/02-10-release-build.log` |
| `npm run test:e2e -- --project=chromium` | 225/225,6.6min,0failed/0skipped; завершён28.10 | `.tmp/02-10-release-chromium-final.log`, `-final.xml` |
| `npm run test:e2e -- e2e/generation-races.spec.ts e2e/generation-storage.spec.ts e2e/phase02-presentation.spec.ts e2e/presentation.spec.ts e2e/menu.spec.ts e2e/navigation.spec.ts e2e/shopping.spec.ts --project=chromium` | 132/132,247.765827s,0failed/0skipped,exit0 после всех harness fixes | `.tmp/02-10-chromium-affected-final.log`, `-final.xml` |
| `npm run test:e2e -- --project=firefox` | Первый полный запуск:198passed/27failed,225cases,615.002718s,exit1 | `.tmp/02-10-release-firefox.log`, `-firefox.xml` |
| `npm run test:e2e -- --project=firefox --workers=1` | 240/240,986.799644s,0failed/0skipped,exit0; полный последовательный запуск после исправлений | `.tmp/02-10-release-firefox-final.log`, `-final.xml` |
| `npm run test:e2e -- --project=webkit --workers=1` | 226passed/14failed,240cases,18.0min,0skipped,exit1; не успешная приёмка | `.tmp/02-10-release-webkit-final.log`, `-final.xml` |
| `npm run test:e2e -- e2e/phase02-presentation.spec.ts --project=webkit --workers=1` | 38passed/2failed,40cases,292.281763s,0skipped,exit1 после native End; две linkTab gate остаются | `.tmp/02-10-webkit-presentation-final.log`, `-final.xml` |
| Native End regression smoke: `e2e/phase02-presentation.spec.ts --grep '360px long names\|sequential Tab ShiftTab Space'` через `npm run test:e2e --`, отдельно chromium/firefox | Chromium2/2,18.858061s; Firefox2/2,27.674407s; exit0; Firefox1worker | `.tmp/02-10-end-chromium-smoke.xml`, `-firefox-smoke.xml` |
| `npm run typecheck`; `npm run lint` после native End | Обе корневые команды exit0 | `.tmp/02-10-end-typecheck.log`, `-lint.log` |

Production assets действительно созданы: `dist/index.html`, CSS11.39kB,
JS476.64kB/gzip135.37kB. Это сборка для Safari15, не запуск исторического Safari15.
Прежний upstream-warning из WINDOWS сохранён как история; в этом выводе сборки
он не появился. Browser projects запускаются последовательно, каждый через
свой Playwright-owned Vite4173; пользовательский4180 не используется.
Обязательные случаи не skip/fixme; browser auto-retries не настроены. Конфигурация
сохраняет2workers; финальный Firefox явно запускается с CLI `--workers=1` после
воспроизведённых ограничений одновременных CPU-сценариев. Успешный результат
этого запуска не будет заявлен доказательством прохождения2workers.

Первый release unit:324/325,8.72s; combined benchmark превысил стандартный5s
timeout. Отдельный исходный adapter suite прошёл11/11,4.66s, однако full повтор
снова дал324/325,9.00s. Зафиксированы581transitions/512candidates,
domain2487.28ms+adapter3472.01ms/4yields. Два последовательных измерения разделены
на два самостоятельных substantive tests; прежние work bounds и yields assertions,
продуктовые30s и все таймауты сохранены. Причина внешней загрузки не выдумывается.
Оба failure logs сохранены: `.tmp/02-10-release-unit.log`, `-unit-rerun.log`.

Первый full Chromium остановился до collection с Node ESM `food.snapshot.json
needs an import attribute of type:json`. Путь: старый статический импорт
`createDraft` в `budget.spec.ts` → settings → products → source catalog. Подготовка
тех же данных перенесена в браузерный dynamic import; production не менялся,
unknown cookingTime/variety recovery и exact raw assertions сохранены. Failure:
`.tmp/02-10-release-chromium.log`; это не успешный browser run.

Первый Firefox release:198passed/27failed,225cases,615.002718s,0skipped.
Три race/storage failure воспроизведены без изменений:0/3,39.315455s.
Полные raw XML/log и traces сохранены отдельно в
`.tmp/02-10-release-firefox-failures/`, повтор — `-firefox-reproduce*`.
Распределение27:14 outline после программного focus/Enter,3 race/storage timing,
7 составных recovery timing по ширинам,1 sequential recovery timing,2 legacy
choices ошибки (субпиксельная величина и преждевременный пустой DOM).
Protocol transient или внешняя загрузка по этим данным не утверждаются.

Диагностический Firefox probe с настоящим `generateRealPlan` дал:
после `focus()` и Enter `:focus-visible=false`, outline=none; после настоящего
ShiftTab/Tab `:focus-visible=true`, outline=solid. Изменён только тестовый helper:
рамка по-прежнему обязательна, но проверяется после реального Tab. CSS не менялся.
Legacy choices ждёт видимый DOM после шага; строгий CSS min-height44px дополнен
допуском0.01px к bounding-box (Firefox сообщил43.99993896484375).

Recovery разделён на pending, generation-error/retry и save-failure/retry по семи
ширинам. Составной nav/newer/older разделён на сохранение старого active после
ухода и сохранение нового success после старого response с shopping/reload.
Все прежние действия и assertions распределены между этими случаями: всего
240cases вместо225. Для узких operation cases применены настоящие1–2day inputs;
самостоятельные стандартные7day/28slot пути не изменены. Новый helper проверяет
точный заголовок и4×days экземпляров, включая прежние28 по умолчанию.

Controlled `release` теперь дожидается фактического результата generation port
через приватное test-only событие, подписываясь до освобождения. После него
остаются прежние5s status/bytes/route assertions. Source generation ждёт реального
перехода `/menu`, затем проверяет DOM. Общий20s deadline теста, assertion5s,
production30s и конфигурация workers/retries не менялись. Save-release не менялся.
Frozen clock не являлся причиной: в соответствующих случаях часы либо не
устанавливались, либо `resume()` выполнялся перед настоящим подбором.

Промежуточная affected90 диагностическая попытка остановлена после выявления
неверного недельного селектора для коротких меню; она не успешный прогон и её
неполный вывод не закрывает проверки. Последующая малая группа сначала дала
3/4 (оставшийся тройной подбор вышел за20s), после разделения —5/5 Firefox,
46.7s (`.tmp/02-10-firefox-boundary-final.xml`). Сырые failures сохранены.
Focused responsive/legacy12:11passed/1failed, общий20s предел первого360px
default28slot journey. В trace: cold browser/page1.9s, click4.375s и настоящая
генерация/navigation6.929s; до финальной reload существенные UI/assertions
выполнены. Тот же неизменённый случай отдельно прошёл14.5s (19.8s соstartup).
Это наблюдение о запуске, не доказательство конкретной внешней нагрузки.
Пробный grep с лишним начальным якорем выбрал0tests и исправлен; его лог
`-responsive-selection-error.log` не считаетсяpass. Typecheck/lint после всех
test-only исправлений дали exit0 (`.tmp/02-10-crossbrowser-*.log`).
Независимый повторный статический review выявил и закрыл неверные недельные
селекторы для1–2day; итог0remaining findings. Исправления зафиксированы7f31ff0.
Полный исправленный Firefox прошёл240/240,986.799644s,0failed/0skipped. Это
один фактически выполненный запуск с1worker; прежний225case/2worker failure
сохранён отдельно. Артефакт `.tmp/02-10-release-evidence.json` производен от
исходных JUnit XML, содержит их SHA256 и не выдаётся за native JSON reporter.
Chromium affected прошёл132/132,247.765827s. Выбраны все семь потребителей
изменённых helpers: races/storage/menu/navigation/phase02-presentation/presentation/
shopping. Сопоставление `(classname,name)` с текущей240case коллекцией Firefox
подтвердило132current+108неизменённых baseline,missing0/unexpected0:
`.tmp/02-10-chromium-coverage.json`. Новый единый full240 Chromium не запускался;
225/225 исходного full и132/132 affected не складываются в357 разных случаев.
Полный WebKit:226passed/14failed,240cases,0skipped. Все14 failures в
`phase02-presentation.spec.ts`:12 end-scroll и2 sequential linkTab. Остальные
200 случаев других файлов прошли, вместе с26 случаями этого файла.
Точное время полного запуска1081.932577s. После End-fix owning40 дал38passed/
2failed,292.281763s. Case-identity overlay200неизменённых+40перепроверенных даёт
238passed/2failed из240,0skipped,missing0/unexpected0,12 исходных failures закрыты
(`.tmp/02-10-webkit-coverage.json`). Это составное evidence, не новый единый
успешный full240 WebKit. Новый полный запуск не требуется для неизменённых200
случаев; две оставшиеся проверки не объявляютсяуспешными.

Новая native diagnostic (`.tmp/02-10-webkit-native-probe-initial.log`):
ControlEnd оставляет scrollTop2347 при max2501; End достигает2501 и clearance
−87.59375px. Вtext200 ControlEnd оставляет15722 при max20162; End достигает20162
и clearance−104.4375px. Два scroll probes прошли. Исправлена только test-only
ветка WebKit на native End; ControlEnd для Chromium/Firefox, CSS, порог≤1px,
реальная клавиатура и все assertions сохранены.

Tab diagnostic не подтвердил Option/AltTab как решение. На Windows platformWin32
с SafariUA обе последовательности ShiftTab иAltShiftTab проходят H1→Профиль→BODY
(document.hasFocus=false), затемsummary; forwardTab/AltTab проходятsummary,
пропускаяссылки. Расширенная36-key последовательность без `.focus()` между
клавишами подтверждена `.tmp/02-10-webkit-tab-sequence.log`. Это диагноз
наблюдаемой среды, не доказательство поведения физического Safari15. Доступный
public browser/context API и installed WebKit initialization не выявили
поддерживаемой настройки полного linkTab; OS preferences/tabindex/CSS не менялись.
Две последовательности остаются failed/unverified для этой среды; их не skip,
не заменяют программнымfocus и не называютpassed. Фактический Tab/ShiftTab по
этим ссылкам в Chromium иFirefox уже прошёл. Независимый verifier определит
manual/environment gate; автоматического закрытия этого ограничения нет.
Open ledger WINDOWS15/16 фиксирует обе проверки отдельно. WINDOWS14 о новых
человеческих наблюдениях сохранён open, Phase1 UAT не используется вместо них.
End-only исправление2a8d74a прошло smoke2/2 Chromium и2/2 Firefox, последнюю
проверку TypeScript/ESLint и независимый статический review без замечаний.

## Источники и настоящий corpus gate

`02-06-SUMMARY.md`, `docs/data/phase02-sources.md`, `sources.test.ts` и
`catalog.test.ts` содержат самостоятельное source evidence. Версия2026-10-28-1:
12 точно сопоставленных пищевых профилей,48 исходных USDA nutrient observations,
12 source-price observations,52 содержательно проверенных авторских рецепта.
Original ZIP/XLS/HTML проверены при acquisition/review; runtime проверяет hashes
архивированных минимальных excerpts, а не выдумывает присутствие полного архива.

USDA SR Legacy2018/CC0 даёт composition per100g edible; городской мониторинг
Смоленска21.10.2026 и отдельная ВкусВилл web-витрина28.10.2026 имеют разный scope.
Открытая лицензия этих price databases не установлена; ограниченное цитирование
числовых фактов с атрибуцией не объявляется лицензией издателя. Полные foreign
архивы, фото и описания в bundle не копируются. Продуктовые identity/state/yield
не переносятся на очищенный/варёный/обрезанный аналог без отдельных фактов.

Независимая численная default proof на настоящем source-backed каталоге:
2people/7days/28slots,≤30min/recipe,3000RUB limit,без pantry/targets/constraints.
Покупки461.9293627901234552RUB,display461.93;covered0. Среднее на человека в день:
1009.68kcal,protein26.51g,fat2.38g,carbohydrates219.2096g. Это ограниченный
растительный corpus с повторами и низкой энергией/жирами, **не подтверждение
полноценности рациона**. Ручная цель не заменена выдуманной медицинской нормой.
Это фиксированный численный proof. Каждый новый UI-запуск получает сохранённый
`crypto.randomUUID()` seed, поэтому независимые браузерные снимки могут иметь
другие допустимые суммы; reload обязан сохранять конкретный результат и seed.
Gluten/lactose/halal и неподтверждённые аллергены fail closed; неизвестное не safe.

Отдельный browser test блокирует все внешние HTTP providers, разрешает только
локальные Vite resources и выполняет настоящие generation→menu→shopping→reload.
External requests=0,bytes/ID сохранены. Это отсутствие внешней runtime API
зависимости, не обещание service worker/offline-доступа к ещё не загруженным assets.

## Карта20 требований и угроз

Все указанные test files фактически входят в итоговые команды выше; окончательное
решение о закрытии shared requirements остаётся независимому phase verifier.

| Requirement | Независимый численный/source oracle и browser evidence |
|---|---|
| APP-04 | appliedSettings/controller; entry-policies, generation-races |
| WIZ-08 | appliedSettings; entry-policies, products, presentation |
| DATA-01 | catalog/sources/data-catalog/plan; generation, menu source details |
| DATA-02 | malformed/unknown/source hash/safety unit gates; generation-storage |
| DATA-03 | real cooperative adapter/unit; real generation и external-blocked path |
| CALC-01 | quantities fractions/codec/compatible units; projection |
| CALC-03 | scaling/projection/person-day/mean; menu independent synthetic literal rows |
| CALC-04 | three distinct exact costs; menu/shopping shared canonical totals |
| CALC-05 | raw and displayed hard budget/lower bound; budget, menu |
| CALC-06 | whole-period pantry once/unknown/incompatible/nonnegative; shopping |
| CALC-07 | independent half-up/canonical ledger; menu/shopping consistent rows |
| GEN-01 | seeded solver/oracle/real52corpus; generation, entry-policies |
| GEN-02 | hard filters/safety unknown/time/exclusions; source and generator unit |
| GEN-03 | macrotask/abort/controller; actual2s/cancel/late DOM/route/bytes |
| GEN-04 | controller29999+1ms; browser30s/errors/retry/storage guard |
| GEN-05 | exhaustive oracle/proof vs bounded exhaustion; browser error/action/proof labels |
| MENU-01 | date/DST/instance contracts; real dated menu/reload/provenance/responsive |
| MENU-04 | exact+10% vs strictly above/zero/no target; menu/browser canonical values |
| SHOP-01 | aggregation/source-instance/dimension projection; shopping0/1/many/partial |
| SHOP-04 | covered quantity/value/details; all/over/none stock and keyboard disclosure |

T-02-01…24 распределены по `02-VALIDATION.md`: unit source/validation/quantities,
generator bounds/cooperation, immutable inputs, active recomputation/guarded writes,
UI no-late-promote и фактические QA reports. T-02-23 дополнительно доказан real
late-success/late-save browser invariants; T-02-24 разделяет numerical fixtures и
source facts. T-02-SC: package/lock pins не менялись и install не запускался.
Новых endpoints/auth/file-system trust-boundary/schema surfaces в02-10 нет.

## UI и оставшиеся человеческие наблюдения

Фактические26responsive/keyboard cases02-09 плюс сохранённые регрессии входят в
release suites:360/390/430/768/1199/1200/1280,44px/48px,длинные названия/URL/суммы,
200%text/CSSzoom,short viewport,sticky clearance,реальные Tab/ShiftTab/Space/Enter.
28.10 агент просмотрел существующие PNG `.tmp/phase02-qa/`:360menu,390menu,
430shopping,768shopping,1199long-text200,1200menu,1280menu. Суммы и длинные строки
переносятся, focus-ring видим, native disclosure расположен над нижней навигацией;
на1200 sidebar заменяет нижнюю nav. Дополнительный отдельный прогон этих же ширин
ради скриншотов не выдаётся за новую проверку. Latest Web Design Guidelines
проверены28.10; UI code в02-10 не изменялся.
29.10 после всех harness fixes агент дополнительно просмотрел новые Firefox PNG
360menu,768shopping,1280menu: суммы переносятся на360, focus-ring видим, покрытие
запасами доступно над нижней навигацией, на1280 отображается sidebar. Это
визуальный осмотр агента; новая пользовательская UAT и физическое устройство
этим не подтверждены.
После native End агент также просмотрел WebKit360menu,768shopping,1280menu:
переносы, видимый focus и очистка нижней навигации сохранены. Это viewport/DPR
эмуляция текущего WebKit, не запуск физического устройства или Safari15.

Read-only independent review:0Critical,1Important source-disclosure oracle gap
исправлен и перепроверен,0Important осталось. Последующие split-benchmark и
browser-loader corrections отдельно просмотрены без замечаний. Reviewer не
запускал suites; их результаты относятся к исполнителю.

Остаются human-check фазы: удобство новых menu/shopping/recovery, физическая
мобильная клавиатура/safe-area, исторический Safari15, screen-reader observations,
native zoom/визуальная оценка и воспроизводимая методика/измерение LCP.
Пользовательский pass Phase1 H1–H9 не подменяет эти новые наблюдения. Full WebKit
не равен Safari15; CSSzoom/viewport emulation не равны физическому устройству.
Численные LCP, медицинская оценка, кухонная апробация52рецептов и новая UAT
не заявляются. Весь P0 и последующие фазы03–07 ещё не приняты.
