# Phase03 — итоговая проверка 03-12

Дата начала 08.11.2026, возобновление 09.11.2026. Checkout `D:/Projects/meal-plan`, branch `codex/phase01-execution`, исходный HEAD `5987aa9faae700d43b6e074a0bccfee6d95158e6`. Phase03.1 обязательна после приёмки Phase03 перед Phase04. CAT-01…05 остаются Pending.

## Область и различие доказательств

`e2e/phase03-acceptance.spec.ts` содержит настоящий длинный путь через production App/каталог/адаптеры: wizard с200г риса →3семантических варианта →выбор второго →редактирование budget черновика →append1 из прежних applied inputs →точный recipe/variant/instance →ингредиенты/4КБЖУ/состав/шаги →возврат →shopping →reload. Три цены сверяются по исходным `data/sources/food.snapshot.json` и `prices.snapshot.json`, без вызова production projection/nutrition/formatters как oracle. Эти данные подтверждают только текущие12profiles/52растительных рецепта, не полноценность питания/актуальность местных цен/кухонное качество.

Отдельный literal synthetic fixture:4×125г=500г, запас200г расходуется125+75+0+0, покупки0+50+125+125=300г; ingredient50/covered20/purchase30RUB; на порцию250ккал/Б12.5/Ж0/У37.5/6.25RUB. Это проверка арифметики на тестовых фактах, не продуктовый факт и не USDA oracle.

`phase03-variants.spec.ts` дополнен контролируемыми1/2-result ports: сначала настоящий source-backed поиск, затем только для UI-теста выдаётся подмножество реальных вариантов; exact shortage и reload проверяются без утверждения, что настоящий каталог имеет всего1/2решения. Реальная0/no-new/error ветка — `phase03-append.spec.ts#no new result preserves exact bytes and exposes persistent honest recovery`, typed errors/timeout — `generation.spec.ts`; кап12 — append/presentation; quota/late save/cancel — recovery/append/races. Контролируемые ports не подменяют обязательный реальный happy path.

## Текущие запуски

Исходный полный запуск `npm run test:e2e -- --workers=2` на snapshot `e15702b` завершён 08.11.2026, exit1, 960 cases, 889 passed, 71 unsuccessful, 0 skipped, 39.4min. Chromium299/320, Firefox298/320, WebKit292/320. Среди71 failures68 assertion failures и3 timeouts. Оригинальные XML и71 trace сохранены до следующих запусков в `.tmp/03-12-full-initial.xml` и `.tmp/03-12-full-initial-artifacts`. Полный набор после исправлений повторно не запускался. Ниже отдельно перечислены адресные повторные проверки.

Все команды выполнялись из корня checkout. Логи/trace в gitignored `.tmp`; нижеследующие значения зафиксированы здесь, чтобы ephemeral output не был единственным evidence.

| Команда | Результат | Evidence |
|---|---|---|
| `npm run test:e2e -- e2e/phase03-acceptance.spec.ts --workers=1` (первый вариант,2cases×3) | exit0,6/6,1.2min | `.tmp/03-12-acceptance-initial.log/.xml` |
| Та же команда после добавления default benchmark | exit1,8pass/1fail,1.9min | `.tmp/03-12-acceptance-final.log`, `03-12-acceptance-before-sync-fix.xml`; исторический fail не переименован в pass |
| `npm run test:unit -- --run` | exit0,478/478,20files,10.58s | `.tmp/03-12-unit.log`; оригинальные365 не удалялись |
| `npm run test:e2e -- e2e/phase03-acceptance.spec.ts e2e/phase03-variants.spec.ts --workers=1` | exit0,21/21,3.1min; все3engines | `.tmp/03-12-tracer.log/.xml`;3acceptance+4variants cases наengine |
| `npm run typecheck` | exit0 | `.tmp/03-12-typecheck.log`; также task1typecheck exit0 |
| `npm run lint` | exit0 | `.tmp/03-12-lint.log` |
| `npm run build` | exit0;145modules;754ms | `.tmp/03-12-build.log`; Safari15target, main514.08kB/gzip145.71kB,CSS16.84kB/gzip4.09kB |
| `node scripts/check-recipe-media.mjs --all` | exit0;checked52/fulltrue | `.tmp/03-12-media.log` |

В свежем build есть chunk>500kB warning (WINDOWS21). Исторический MODULE_LEVEL_DIRECTIVE warning (WINDOWS1) в этом запуске не выведен; история остаётся, выдуманный повтор warning не заявляется. Playwright выводит NO_COLOR/FORCE_COLOR warning — это tooling warning, не ошибка приложения.

## Findings до исправлений

Полный исходный960-case run обнаружил дефект `App.tsx`. Route-effect безусловно вызывал `controller.cancel()` при выходе из `/plan/generating`, даже после `succeeded`/saved ack. Notice ложно сообщал «Подбор отменён. Прежнее меню не изменено» после успешного первого запуска. Исходные `generation`/`no-fish` whole-page reload assertions записали этот текст до reload и его отсутствие после. Отдельный RED `affaa99` проверил корректное успешное сообщение и отсутствие отмены. Исправление `ff52a34` сохраняет succeeded при завершённой навигации. Первый GREEN6/6 all3engines включает реальный полный путь и changed-draft confirmation, exit0,1.5min, `.tmp/03-12-app-green.log/.xml`.

Changed-draft RED `.tmp/03-12-focus-red.log` показал неверный trigger после pointer-click в WebKit. `ff52a34` использует существующий стабильный initiator ID. В cap12 retry-save после удаления кнопки WebKit переводит focus в `section#variants`, поэтому прежнее условие `activeElement===body` не выполнялось. Тот же коммит убрал это условие. Повтор cap12 прошёл во всех3engines. Profile-modal smoke ожидает ready heading до keyboard activation, сохраняет все trap/cancel assertions.

Firefox nativeTab к четвёртой карточке действительно оставлял bottom742.8 ниже navtop718. Isolated60s test с5s geometry-poll всё равно упал, `.tmp/03-12-firefox-settled.log/.xml`. Диагностический RED `.tmp/03-12-firefox-scroll-red.log/.xml` зафиксировал CSS scroll-margin179px и неизменный bottom742.8 после ожидания. Экспериментальный explicit scroll после уже упавшей assertion переместил bottom в620.8. Исход теста остался failed. `30f8735` применяет этот существующий scroll-margin через bubbling onFocus только для клавиатуры, с сохранением pointer guard. Чистый GREEN1/1Firefox24.0s, `.tmp/03-12-firefox-scroll-green.log/.xml`. Диагностический эксперимент убран из теста, nativeTab и строгие проверки границ сохранены.

Firefox extended acceptance упал на строгом `[data-instance-id]`: URL уже `/recipe/...`, React ещё не заменил28старых menu articles. Trace/error-context показывают28старых cards, а не неверный рецепт/потерю saved bytes. Добавлено ожидание точного recipe h1 перед сохранённой строгой instance assertion. Production не менялся; numeric/ID assertions не ослаблены. Повторный tracer и полный набор регрессии должны быть записаны отдельно ниже.

## Native Tab: приложение и платформа разделены

После sync-fix повторный tracer21/21 прошёл. Исходный8/9 и завершённый960-case run сохранены в матрице выше.

Default benchmark final tracer (production adapter+save / отдельный bounded domain search): Chromium3725/3930.5ms,607transitions/512evaluations; Firefox6472/6206ms,621/512; WebKit6918/6592ms,607/512. Во всех3engines3варианта. Это два отдельных измерения, каждое с одним30sлимитом, не два срока одной production операции. Точные найденные планы зависят от seed; bounded512 не доказывает исчерпывающий оптимум.

Свежий `node .tmp/03-12-native-tab-audit.mjs` (exit0) создал чистый HTML без MealPlan/React/CSS/scripts: `<a href="#target">`, button, второйa, input. Обе ссылки имели `tabIndex:0`, `display:inline`, `visibility:visible`; pointer click во всех3engines даёт`#target`.

Фактические8nativeTab:

- Chromium: first,button,second,input,BODY,first,button,second.
- Firefox: first,button,second,input,input,input,input,input (первые оба anchor достижимы).
- WindowsWebKit: button,input,BODY,button,input,BODY,button,input; оба anchor пропущены.

Это независимо воспроизведённое поведение установленного WebKit вне приложения, а не автоматическое оправдание всех UI-fail средой. Конкретная настройка/реализация движка не установлена. Не использовались programmaticfocus, skip/xfail, системные настройки или private protocol preferences. App nativeTab gates WINDOWS15/16/24/25 сохраняются failed/unverified; nativeSafari15/AT не проверены. Context7 `/microsoft/playwright/v1.64.1` подтвердил native keyboard API, но не дал доказательства причины пропуска anchors; это не browser compatibility pass.

## Оставшиеся ворота

Production smoke фактически выполнен через Playwright MCP на собранном Vitepreview `127.0.0.1:4182`: quickstart3 →select2 →weekcard →recipe exactinstance+localdecodedhero →hardreload →menu →shopping →hardreload, те же три цены462.49/0/462.49RUB. Период08–14Nov, instance `set-573237984-2/2026-11-08/breakfast`. Никаких dev-module imports в этом smoke. Снимки `.tmp/03-12-preview-menu1280.png` и `03-12-preview-menu360.png` просмотрены: русский UI/варианты/дни/CTA без horizontal overflow. Desktop7dates/28cards; client/scroll1265/1265 приviewport1280, mobile345/345 приviewport360 (15px native scrollbar, не потерянная ширина). Это один MCP Chromium smoke, не три productionengine. Preview4182 остановлен по проверенному собственному PID/commandline;4180 не затронут. После любого productionfix нужен свежий build/smoke.

Текущий media gate проверяет неизменность52actualfiles/hash/IHDR/provenance. Предыдущие per-image визуальные verdicts из `phase03-media-review.md` — историческая авторская проверка; current full-media повторно подтверждает runtime decode/отсутствие remote URLs, а не новый human pass52фотографий.

Task03-12-02 фиксирует выполненный regression, production-preview smoke и scoped coverage/security audit. Human UAT, nativeSafari15/device/AT/реальный200%zoom/safearea и6descriptorless flagged-unverified prohibitions остаются непроверенными. Phase03 не принята, shared8requirements ожидают независимой проверки и приёмки.

## Выполненное сопоставление source audit

Номера EC ниже — именно canonical `03-EDGE-COVERAGE.json`; похожие EC-префиксы в исторических названиях browser tests иногда обозначают другой сценарий. Таблица использует поведение/имя, не делает вывод по одному номеру. Unit references относятся к fresh478pass. Browser references должны читаться с полной текущей матрицей и ограничениями ниже; отсутствие отдельной browser assertion не переименовывается в pass.

### 46 explicit edge contracts

| ID | Behavioral evidence (paths: `src/domain`, `src/features/generation`, `e2e`) | Ограничение |
|---|---|---|
|EC-01|controller.test.ts — identical select; activePlan.test.ts — same-version altered catalog|См. final command matrix; unit/domain доказательство не заменяет manual|
|EC-02|activePlan.test.ts — missing/empty/malformed/read; variants — actual Phase2 single|См. final command matrix; unit/domain доказательство не заменяет manual|
|EC-03|acceptance — real wizard/select/append/reload prior variants equality|См. final command matrix; unit/domain доказательство не заменяет manual|
|EC-04|controller.test.ts — retry selection without another generation; recovery quota select|См. final command matrix; unit/domain доказательство не заменяет manual|
|EC-05|controller.test.ts — disposal, external byte conflict, base reload, serialized late saves|См. final command matrix; unit/domain доказательство не заменяет manual|
|EC-06|generatePlan.test.ts — semantic alternatives parameterized1/2/3, empty; plan.test.ts cap12/13; controlled shortage browser|См. final command matrix; unit/domain доказательство не заменяет manual|
|EC-07|generatePlan.test.ts — normalized semantic fingerprint ignores IDs/order and detects portion changes|См. final command matrix; unit/domain доказательство не заменяет manual|
|EC-08|generatePlan.test.ts — no fake alternative empty slot; variants — legacy arrows+controlled1|См. final command matrix; unit/domain доказательство не заменяет manual|
|EC-09|generatePlan.test.ts — tied alternatives deterministically independent of recipe/food order|См. final command matrix; unit/domain доказательство не заменяет manual|
|EC-10|generatePlan.test.ts — exact budget equality and next fractional alternative; quantities.test.ts|См. final command matrix; unit/domain доказательство не заменяет manual|
|EC-11|generatePlan.test.ts — repeatable seed/options; variants semantic assignments independent oracle|См. final command matrix; unit/domain доказательство не заменяет manual|
|EC-12|generation.test.ts — one common deadline29999/30000/30001/stalled-yield; controller.test.ts late final guard|См. final command matrix; unit/domain доказательство не заменяет manual|
|EC-13|generatePlan.test.ts — excluded outputs keep search evaluation; append real new assignment|См. final command matrix; unit/domain доказательство не заменяет manual|
|EC-14|controller.test.ts — no active/full cap; append — no new result exact bytes|См. final command matrix; unit/domain доказательство не заменяет manual|
|EC-15|append — real saved inputs/alternatives preserved; recovery — pending append quota ack|См. final command matrix; unit/domain доказательство не заменяет manual|
|EC-16|controller.test.ts — deduplicates direct/append; recovery — quota retry same candidate/no search|См. final command matrix; unit/domain доказательство не заменяет manual|
|EC-17|controller.test.ts — selection supersedes append/base load; append — navigation final save|См. final command matrix; unit/domain доказательство не заменяет manual|
|EC-18|menuView.test.ts — actual periods/defaults; presentation — actual dates slots responsive grid|См. final command matrix; unit/domain доказательство не заменяет manual|
|EC-19|menuView.test.ts — selected distinct from today; presentation — manual day tabs|См. final command matrix; unit/domain доказательство не заменяет manual|
|EC-20|menuView.test.ts — no invented empty seven-day period; presentation — empty menu and1day; generation — missing skeleton|См. final command matrix; unit/domain доказательство не заменяет manual|
|EC-21|presentation — DOM day/slot order and native manual keys; recipes — real Tab/Enter/Space; LIMITED WindowsWebKit24/25 plus legacy15/16|WindowsWebKit native linkTab failed/unverified; nativeSafari/AT human-needed|
|EC-22|plan.test.ts — DST/leap/year/local date; menuView.test.ts — actual date-only query|См. final command matrix; unit/domain доказательство не заменяет manual|
|EC-23|presentation — exact saved day card/back mode/bytes; acceptance — select same dates|См. final command matrix; unit/domain доказательство не заменяет manual|
|EC-24|recipeView.test.ts — contextual return day must belong to period; menuView.test.ts foreign-date clamp; presentation — exact card focus|См. final command matrix; unit/domain доказательство не заменяет manual|
|EC-25|media auditor52; media — actual decode/fallback; presentation —4:3actualhero across360/768/1280|См. final command matrix; unit/domain доказательство не заменяет manual|
|EC-26|planProjection.test.ts/recipeView.test.ts canonical allocation; recipes — repeated full/partial/no stock; acceptance literal conservation|См. final command matrix; unit/domain доказательство не заменяет manual|
|EC-27|media — sample404 accessible fallback; presentation — compiled local image failure keeps working Link|См. final command matrix; unit/domain доказательство не заменяет manual|
|EC-28|presentation — long recipe facts and sources; synthetic malicious title rendered as text; recipeView bounded Unicode identity|См. final command matrix; unit/domain доказательство не заменяет manual|
|EC-29|acceptance — exacttriple and retained dates; recipeMedia.test.ts — sidecar version keys outside catalog|См. final command matrix; unit/domain доказательство не заменяет manual|
|EC-30|acceptance — independent USDA per-portion4metrics/price and comparison; presentation per-portion facts|См. final command matrix; unit/domain доказательство не заменяет manual|
|EC-31|recipeView.test.ts — selected1000/fractions and family3/base2; recipes direct/base/fullsteps|См. final command matrix; unit/domain доказательство не заменяет manual|
|EC-32|recipes — repeated full/partial/no stock; shopping unknown/incompatible cases; recipeView unknown direct|См. final command matrix; unit/domain доказательство не заменяет manual|
|EC-33|recipeView.test.ts — incomplete vs one ingredient/step; recipes — corrupt context, direct known/unknown/load|См. final command matrix; unit/domain доказательство не заменяет manual|
|EC-34|recipes — malformed duplicate oversized/external return; recipeView exact256 Unicode/257rejection|См. final command matrix; unit/domain доказательство не заменяет manual|
|EC-35|recipeView.test.ts — source-order ingredient composition; planProjection.test.ts canonical stock order; acceptance steps exact array|См. final command matrix; unit/domain доказательство не заменяет manual|
|EC-36|recipeView.test.ts — family3/base2 numeric oracle; acceptance independent source totals/ingredient quantities|См. final command matrix; unit/domain доказательство не заменяет manual|
|EC-37|recipeView.test.ts — no rebind repeated occurrence; recipes real variant switch makes old URL stale|См. final command matrix; unit/domain доказательство не заменяет manual|
|EC-38|recipeView.test.ts — four known-zero vs unknown; acceptance literal recipe headline and ingredient breakdown|См. final command matrix; unit/domain доказательство не заменяет manual|
|EC-39|recipeView.test.ts — exact composition before half-up display in source order|См. final command matrix; unit/domain доказательство не заменяет manual|
|EC-40|recipeView.test.ts — missing contextual facts error/direct unknown, complete single ingredient|См. final command matrix; unit/domain доказательство не заменяет manual|
|EC-41|acceptance exact four-metric order + steps; recipes composition disclosure/reload|См. final command matrix; unit/domain доказательство не заменяет manual|
|EC-42|recipeView.test.ts — family3/base2 exact once, quantities half-up tests; acceptance defaultfamily2 separate|См. final command matrix; unit/domain доказательство не заменяет manual|
|EC-43|recipes — direct known vs unknown exactID, adapter failure retry; recipeView empty route|См. final command matrix; unit/domain доказательство не заменяет manual|
|EC-44|recipes malformed percent/duplicate/oversized/external return; recipeView decode once/enum/date|См. final command matrix; unit/domain доказательство не заменяет manual|
|EC-45|recipes — unknown/stale reload/back exact bytes; incomplete context retry|См. final command matrix; unit/domain доказательство не заменяет manual|
|EC-46|recipes — delayed catalog retry then navigate away cannot replace new route; controller late load test|См. final command matrix; unit/domain доказательство не заменяет manual|

### 52 UI source pairs

E1 — исходные варианты; E2 — append; E3 — recreate/confirmation/wizard; E4 — даты/карточки/итоги; E5 — одна linkedcard/media; E6 — recipe/ingredients/disclosure; E7 — источники; E8 — memory-only/retry. Не все52пары являются отдельными52тестами: ниже перечислено конкретное покрытие каждой пары и недостающие backstops.

| Pair | Surface/state | Concrete evidence | Status/limit |
|---|---|---|
|UIC-01|E1/empty|variants legacy + generation NO_RECIPES/SEARCH_EXHAUSTED|AUTOMATED/SOURCE — interpret with final matrix, no human pass|
|UIC-02|E1/loading|recovery pending select announces requested row; append pending progress|AUTOMATED/SOURCE — interpret with final matrix, no human pass|
|UIC-03|E1/error|recovery real select quota/old bytes/retry|AUTOMATED/SOURCE — interpret with final matrix, no human pass|
|UIC-04|E1/populated|acceptance real distinct3 + comparison exact prices|AUTOMATED/SOURCE — interpret with final matrix, no human pass|
|UIC-05|E1/partial|variants controlled1/2 exact shortage|AUTOMATED/SOURCE — interpret with final matrix, no human pass|
|UIC-06|E1/overflow|presentation twelve alternatives wrap all8widths|AUTOMATED/SOURCE — interpret with final matrix, no human pass|
|UIC-07|E1/zero-one-many|generatePlan0/1/2/3 + variants1/2/3 + append12|AUTOMATED/SOURCE — interpret with final matrix, no human pass|
|UIC-08|E1/long-text|presentation twelve alternatives and long recipe facts|AUTOMATED/SOURCE — interpret with final matrix, no human pass|
|UIC-09|E2/loading|append pending progress/cancel + recovery inline append|AUTOMATED/SOURCE — interpret with final matrix, no human pass|
|UIC-10|E2/error|append no-new + recovery append quota/late save|AUTOMATED/SOURCE — interpret with final matrix, no human pass|
|UIC-11|E2/overflow|presentation short-height action flow/twelve modal|AUTOMATED/SOURCE — interpret with final matrix, no human pass|
|UIC-12|E2/long-text|presentation long labels/amounts + CSS min-width0; actual translated long error on360 not fully sampled|PARTIAL — dedicated/native check pending|
|UIC-13|E3/empty|append cap/recreate + changed draft cancel keeps original|AUTOMATED/SOURCE — interpret with final matrix, no human pass|
|UIC-14|E3/loading|append changed draft deferred save ack|AUTOMATED/SOURCE — interpret with final matrix, no human pass|
|UIC-15|E3/error|append cap12 failed write + recovery replace quota|AUTOMATED/SOURCE — interpret with final matrix, no human pass|
|UIC-16|E3/partial|generation incomplete-data recovery + controller missing facts|AUTOMATED/SOURCE — interpret with final matrix, no human pass|
|UIC-17|E3/overflow|presentation twelve modal trap/short height; append5width dialog|AUTOMATED/SOURCE — interpret with final matrix, no human pass|
|UIC-18|E3/long-text|presentation twelve modal responsive labels; arbitrary long confirmation text not separately injected|PARTIAL — dedicated/native check pending|
|UIC-19|E4/empty|presentation empty menu + menuView no empty period|AUTOMATED/SOURCE — interpret with final matrix, no human pass|
|UIC-20|E4/loading|generation initial hydration menu skeleton|AUTOMATED/SOURCE — interpret with final matrix, no human pass|
|UIC-21|E4/error|generation corrupt active/read recovery|AUTOMATED/SOURCE — interpret with final matrix, no human pass|
|UIC-22|E4/populated|presentation actual dates/slots grid; acceptance actual7days|AUTOMATED/SOURCE — interpret with final matrix, no human pass|
|UIC-23|E4/partial|recipeView incomplete snapshot + presentation stock absence|AUTOMATED/SOURCE — interpret with final matrix, no human pass|
|UIC-24|E4/overflow|presentation required widths and1279/1280 grid; native linkTab LIMITED|PARTIAL — dedicated/native check pending|
|UIC-25|E4/zero-one-many|menuView periods1…7; presentation1/3/7dates|AUTOMATED/SOURCE — interpret with final matrix, no human pass|
|UIC-26|E4/long-text|presentation long facts/200percent rem test; native zoom HUMAN|PARTIAL — dedicated/native check pending|
|UIC-27|E5/empty|media missing mapping/404 fallback; recipeView incomplete data rejection|AUTOMATED/SOURCE — interpret with final matrix, no human pass|
|UIC-28|E5/loading|RecipeImage width/height+lazy/eager unit and fullmedia decode|AUTOMATED/SOURCE — interpret with final matrix, no human pass|
|UIC-29|E5/error|presentation failed compiled media keeps working recipe Link|AUTOMATED/SOURCE — interpret with final matrix, no human pass|
|UIC-30|E5/populated|acceptance contextual card3IDs + actuallocalhero|AUTOMATED/SOURCE — interpret with final matrix, no human pass|
|UIC-31|E5/overflow|presentation actualhero4:3 and cardgrid atrequiredwidths|AUTOMATED/SOURCE — interpret with final matrix, no human pass|
|UIC-32|E5/long-text|presentation long unbroken title/facts without truncation|AUTOMATED/SOURCE — interpret with final matrix, no human pass|
|UIC-33|E6/empty|recipeView incomplete ingredients/steps vs1valid; recipes corrupt context|AUTOMATED/SOURCE — interpret with final matrix, no human pass|
|UIC-34|E6/loading|recipes catalog retry pending shared skeleton/late navigation|AUTOMATED/SOURCE — interpret with final matrix, no human pass|
|UIC-35|E6/error|recipes malformed/stale/notfound/load/corrupt retry|AUTOMATED/SOURCE — interpret with final matrix, no human pass|
|UIC-36|E6/populated|acceptance source familyingredients/4facts/composition/steps|AUTOMATED/SOURCE — interpret with final matrix, no human pass|
|UIC-37|E6/partial|recipes repeated partialstock + recipeView unknown direct|AUTOMATED/SOURCE — interpret with final matrix, no human pass|
|UIC-38|E6/overflow|presentation long recipe facts/equal hero columns allwidths|AUTOMATED/SOURCE — interpret with final matrix, no human pass|
|UIC-39|E6/zero-one-many|recipeView one ingredient/step vs empty; recipes repeated recipes across slots|AUTOMATED/SOURCE — interpret with final matrix, no human pass|
|UIC-40|E6/long-text|presentation long recipe facts/sourceURLs; real native200percent zoom HUMAN|PARTIAL — dedicated/native check pending|
|UIC-41|E7/empty|recipeView mandatory missing source/facts rejected; source gate never publishes empty sources|AUTOMATED/SOURCE — interpret with final matrix, no human pass|
|UIC-42|E7/loading|shared menu/recipe skeleton before validated sources (no independent source request)|AUTOMATED/SOURCE — interpret with final matrix, no human pass|
|UIC-43|E7/error|catalog/activePlan corrupted source gate + recipes recovery|AUTOMATED/SOURCE — interpret with final matrix, no human pass|
|UIC-44|E7/populated|PlanSummary sources disclosure + recipe sources; acceptance real trusted records|AUTOMATED/SOURCE — interpret with final matrix, no human pass|
|UIC-45|E7/partial|recipeView directunknown facts + sources preserved, not fabricated zero|AUTOMATED/SOURCE — interpret with final matrix, no human pass|
|UIC-46|E7/overflow|presentation long source URLs and equal hero columns|AUTOMATED/SOURCE — interpret with final matrix, no human pass|
|UIC-47|E7/zero-one-many|recipeView single ingredient/source and multiingredient acceptance|AUTOMATED/SOURCE — interpret with final matrix, no human pass|
|UIC-48|E7/long-text|presentation long sourceURLs and ingredients atallwidths|AUTOMATED/SOURCE — interpret with final matrix, no human pass|
|UIC-49|E8/loading|recovery select/append/replace quota retry, pending saves old active|AUTOMATED/SOURCE — interpret with final matrix, no human pass|
|UIC-50|E8/error|recovery external corrupt blocked candidate/keep-current|AUTOMATED/SOURCE — interpret with final matrix, no human pass|
|UIC-51|E8/overflow|presentation long facts and operation geometry; dedicated extreme memory-only alert long-text not injected|PARTIAL — dedicated/native check pending|
|UIC-52|E8/long-text|recovery real full messages+inline failures; arbitrary extreme memory-only translation not separately verified|PARTIAL — dedicated/native check pending|

### GOAL / 8REQ / 18decisions / research

| Scope | Concrete trace | Status |
|---|---|---|
|GOAL,SC1–SC5|real acceptance source oracle+select/append/recipe/shopping/reload; recovery+media+presentation|Automated coverage; independent verifier and human acceptance pending|
|DATA-04,GEN-06,GEN-07|acceptance, variants1/2/3, append12, controller/activePlan/plan/generatePlan unit|Current command matrix; no constraint weakening|
|MENU-02,MENU-03|menuView/recipeView/media units, presentation+real acceptance|Native keyboard/manual limits remain|
|REC-01,REC-02,REC-04|recipeView numeric/context cases, acceptance source+literal oracles, recipes direct/stale/recovery|Native return keyboard limit remains|
|D-01,D-02,D-03|semantic generatePlan unit; controlled1/2 and true3; saved ack selection/recovery|Covered automated|
|D-04,D-05,D-06|append sameinputs/cap12/recreate/changed-draft confirmation+cancel|Covered automated; legacy tests updated only after actual failure|
|D-07,D-08,D-09|trusted everyvariant validation, guarded writes/retry/oldbytes, legacyactual fixture|Covered unit+browser|
|D-10,D-11,D-12|actual dates/modes/tab semantics, instance facts/stock, shared threecosts/target/warnings|Automated plus native/AT/zoom human-needed|
|D-13,D-14,D-15|exact savedtriple, directbase/notfound/stale, familyvsportion composition|Automated with keyboard return limit|
|D-16|52actual local PNG/hash/provenance; fullmedia; fallback separately|Automated current52; final human image judgment pending|
|D-17,D-18|fresh gates, independent oracles, common30s, seed regression; WindowsWebKit separated from Safari15|Historical initial fails retained; no fabricated UAT|
|RESEARCH R01–R33|source/test mapping in securityT01…18/SC and above46edges; media52provenance; bounded defaultbenchmark|Source audit reviewed, no omitted new production integration; manuals/prohibitions flagged|

Все6descriptorless prohibitions остаются `flagged-unverified`; полный automatic prohibition sign-off не заявлен. UI safety gate historical degraded/no-task-commit-rows — неполное UI доказательство; текущая таблица не является его автоматическим восстановлением.

## Повторная проверка 09.11 после исправлений

Адресный повтор выбрал все27 уникальных названий из71 исходных неуспешных cases и выполнил каждое во всех3engines, всего81. Команда `npm run test:e2e -- --grep <union of exact escaped failed names> --workers=2`, exit1,70passed/11failed,7.4min. XML `.tmp/03-12-affected.xml`, log `.tmp/03-12-affected.log`,11failure traces `.tmp/03-12-affected-artifacts`. Из11failures6 относятся к двум прежним ожиданиям copy/routes,1к подтверждённому Firefox focus-scroll и4к сохранённым WebKit nativeTab anchor assertions. Последующие результаты записаны отдельно. Это не общий960-case pass.

Legacy fixtures теперь выполняют настоящее подтверждение перед заменой сохранённого меню. Сохранённый контент сравнивается до/после reload отдельно от transient live-status, при этом literal old bytes, applied dates, sources, nutrition и cost assertions сохранены. Initial success и отсутствие false cancellation проверяются acceptance, cancel/retry — recovery. Изолированный компонент получает настоящий Router. Skeleton проверяет один status внутри busy-контейнера. Текст incomplete-data проверяет отсутствие подмены неизвестных фактов нулём, `/recipe` безID проверяет целевой recipe not-found и рабочий возврат. NativeTab проверки сохранены.

Последние отдельные команды после `30f8735`-содержимого дали следующие результаты.

| Команда | Exit / результат | Evidence |
|---|---|---|
| `npm run test:unit -- --run` | 0,478/478,20files,13.12s | `.tmp/03-12-unit-final2.log` |
| `npm run typecheck` | 0 | `.tmp/03-12-typecheck-final2.log` |
| `npm run lint` | 0 | `.tmp/03-12-lint-final2.log` |
| `npm run build` | 0,145modules,3.36s | `.tmp/03-12-build-final2.log` |
| `node scripts/check-recipe-media.mjs --all` | 0,52/fulltrue | `.tmp/03-12-media-final.log`, повтор после latest build также52/fulltrue |
| `npm run test:e2e -- e2e/phase03-acceptance.spec.ts e2e/phase03-variants.spec.ts e2e/phase03-recovery.spec.ts e2e/seed-compatibility.spec.ts --workers=2` | 0,60/60,4.4min | `.tmp/03-12-critical-final.log/.xml` |

В final60 каждая из3 engines выполнила20cases. Acceptance9/9,variants12/12,recovery24/24,seed15/15. Latest default benchmark adapter+save / отдельный domain search вms — Chromium4119/4262.9,Firefox7208/7444,WebKit7384/6915. Каждая engine получила3варианта,621transitions/512evaluatedCandidates. Общий production30s deadline сохранён, bounded search не доказывает оптимальность.

Latest Safari15-target build имеет JS514.03kB/gzip145.69kB иCSS16.87kB/gzip4.09kB. Chunk advisory WINDOWS21 остаётся. MODULE_LEVEL_DIRECTIVE не выведен. В dev fixture процессе наблюдалось предупреждение React duplicate createRoot, которое относится к повторному dev-монтированию тестового App. Production smoke такой ошибки не показал. Зависимости, package lock, trusted catalog и domain facts не изменялись.

После последнего source fix Playwright MCP Chromium повторил собранный preview4182. Настоящий quickstart3 →select2 →exact recipe `semolina-smooth`, variant `set-1106526360-2`, instance date09Nov/breakfast →hardreload →menu →shopping →hardreload. Saved bytes строго одинаковы, три суммы461.93/0/461.93RUB. Hero decoded. Для360/768/1280 client=scroll345/753/1265. `.tmp/03-12-preview-final2-cards360.png` открыт visual tool после actual lazy-image decode. Первый smoke attempt09Nov ожидал quickstart на оставшемся `/menu` после очистки storage и timeout-нулся. После явного перехода `/` flow прошёл, затем полностью повторён на latest build. Собственный preview PID4916 остановлен после проверки commandline. Внешняя публикация не выполнялась.

Scope review проверил semantic links/buttons, native focus, sticky overlap, переносы, reduced-motion и52local media. Использован актуальный checklist, локальный контракт Safari15 сохранён. [Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md)

Финальный адресный command `npm run test:e2e -- e2e/generation-races.spec.ts e2e/navigation.spec.ts e2e/phase02-presentation.spec.ts e2e/phase03-presentation.spec.ts e2e/phase03-recipes.spec.ts --grep 'GENERATION_DATA_INCOMPLETE:|deep routes and neighboring|phase02 sequential|EC-23/24|EC-19/21|EC-20/25|real Tab Enter' --workers=2` дал exit1,19passed/5failed,2.2min. Chromium8/8,Firefox7/8,WebKit4/8. `.tmp/03-12-focus-legacy-final.log/.xml`,5traces в `.tmp/03-12-focus-legacy-final-artifacts`. Реальный native keyboard saved-screen Firefox прошёл23.4s, pointer-card и day-tab paths прошли во всех3engines после scroll fix. Route expectations прошли3/3.

Один Firefox failure — общий20s timeout теста incomplete-data с двумя настоящими генерациями и wizard confirmation, без упавшей content/byte assertion. Только test-local лимит этой группы увеличен до60s. Production timeout30s и все assertions сохранены. `npm run test:e2e -- e2e/generation-races.spec.ts --grep 'GENERATION_DATA_INCOMPLETE:' --workers=1` дал exit0,3/3,55.4s, `.tmp/03-12-incomplete-final.log/.xml`. Chromium12.1s,Firefox17.9s,WebKit18.9s. После этого все6 copy/route cases имеют фактический all-engine pass.

Четыре оставшихся WebKit failures сохранены с nativeTab.

- `phase02 sequential Tab ShiftTab Space and Enter traverse saved screens and navigation` пропускает navigation anchor, WINDOWS15.
- `phase02 sequential Tab ShiftTab and Enter traverse generation recovery` не фокусирует «К текущему меню», WINDOWS16. В финальном запуске общий20s timeout прервал уже ожидавшую5s anchor assertion, исходный affected81 показал тот же anchor fail.
- `EC-20/25 shopping action leaves final content and keyboard focus visible at all boundaries and short height` не достигает shopping anchor, WINDOWS24.
- `real Tab Enter and Space open composition and return focus to the exact day card` не достигает card anchor, WINDOWS25.

Нет skip/xfail, программной подмены nativeTab или изменений системных настроек. Отдельный clean-HTML audit воспроизводит пропуск anchors. В совокупности последние scoped результаты разрешают application regressions и сохраняют эти4платформенных gates. Полный960 после fixes не повторялся. Phase03 и P0 ожидают независимой проверки и human UAT, Phase03.1 обязательна перед04.
