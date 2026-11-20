# Phase03 Plan10 — фактическая QA

Проверяется утверждённый03-10, Wave5 перед03-09. Каталог, trust registry, цены, зависимости и49готовых медиа не менялись. Фазовые требования DATA-04/MENU-02/MENU-03/REC-01 остаются Pending; полнота52медиа и независимая приёмка здесь не объявляются.

## TDD

| Цикл | Фактический RED | GREEN |
|---|---|---|
|03-10-01|Chromium2failed: реальные saved fixtures загрузились, day tabs отсутствовали; real target ожидал visible последнийtab, synthetic ожидал3, получил0. `.tmp/03-10-01-red.json`, JUnit classifier RED_EVIDENCE_OK|Day/week, exact recipe triple и return focus;2/2, затем повтор tracer2/2 перед расширением|
|03-10-02 unit|26tests,25passed/1failed: реальный formatter бросал TypeError на новом count kind; assertion not.toThrow. `.tmp/03-10-02-red.json`, TAP-flat RED_EVIDENCE_OK|26/26; calendar dates, invalid/clamped query, plural variants/servings|
|03-10-02 browser|После исправления тестового clock/setup —2assertion failures: Right не переводит focus, shopping bar отсутствует. `.tmp/03-10-02-browser-red.json`, JUnit RED_EVIDENCE_OK|4/4: manual keyboard tabs, today≠selected, resize/mode, geometry/zoom/short height|
|Visual regression|Реальная image geometry дала0.08839779005524862 вместо4/3. `.tmp/03-10-image-red.json`, JUnit RED_EVIDENCE_OK после полного повторного RED|`height:auto` отменяет исходный HTML height при CSS width; actual images4:3 на всех5ширинах|
|Panel focus regression|После замены невозможного full-panel-fit ожидания actual Tab сфокусировал panel, но header.y=-410.046875. `.tmp/03-10-panel-red.json`, JUnit RED_EVIDENCE_OK|onFocus только самого panel прокручивает к его началу; реальный sequential Tab показывает заголовок и далее проходит4карточки→summary→shopping|

Первый clock-before-fixture запуск не наблюдал React resource entries и был INVALID fixture evidence; затем clock установлен после fixture и через client navigation проверен today default. При image RED первоначально неверно определён config-relative XML path; classifier вернул INVALID_RED/unreadable_record. Однострочный CSS fix был снят, реальный RED повторён, точный XML `.tmp/.tmp/03-10-image-red.xml` валидирован, затем fix восстановлен. Эти setup/gate ошибки не выдаются за успешный RED.

## Реализованные контракты и evidence

| EC / угроза | Исполняемый тест / проверка |
|---|---|
|EC-18/21/25/26/27/30|`actual dates slots per-portion facts allocation and responsive grid`:3реальные даты,12слотов date→slot; positive allocation125/75/0g;250kcal/6.25RUB/2servings; fallback4:3; widths360/390/430/768/1199/1200/1279/1280|
|EC-23/24/28/29,T-03-14|`real saved day card opens exact occurrence...`: actual saved generation→последний day→exact recipe/variant/instance→Link return и Browser Back focus; same-period variant/day, unchanged plan bytes;7дней и aligned4rows; actual image4:3|
|EC-19/21/23|`manual day tabs...`: today отдельно, ArrowRight/Home/End только focus, Enter/Space activation, Tab panel;4+3wrap,desktop controls исключены из focus tree, прежний mobilemode возвращается|
|EC-20/25|`shopping action...`: no saved menu recovery;1дата;последнийsummary иTab→shopping ≥48px на8границах,длинныеимена/крупныесуммы,shortheight400px,in-flow action,200%textzoom,no page overflow|
|EC-18/19/20/22/23/24|`src/domain/menuView.test.ts`:1/3/7dates, todayin/out, emptyperiod,month/DST dates,foreignperiod clamp, duplicate/malformed/oversized/external query; datesнепереписываются|
|EC-27,T-03-15|`failed compiled local image...`: реальный local request abort→4:3fallback→рабочая exactrecipe link. Fallback не засчитывается в52готовыхассета|
|EC-30|Старые independent half-up presentation tests плюс card/recipe perportion facts и synthetic literal price/kcal; pantry не расходуется повторно|

Видимая подпись ИИ-иллюстраций сохранена; они не объявлены фотографиями приготовленной еды или источником КБЖУ. React text/compiled local src без rawHTML/external image URLs; новых trust boundaries нет. T-03-SC: packages/lockfile не менялись.

## Проверки

- `npm run test:unit -- --run`:477/477 в20files,18.18s,exit0 после последнего panel fix.
- `npm run typecheck`:exit0.
- `npm run lint`:exit0.
- `npm run build`:exit0,145modules,8.39s; CSS16.78kB, JS513.15kB/gzip145.49kB. Предупреждение chunk>500kB остаётся; прежний03-08JS505.94kB также превышал этот advisory threshold. Разбиение bundle не входит в03-10.
- `npm run test:e2e -- e2e/phase03-presentation.spec.ts e2e/phase03-recipes.spec.ts e2e/phase02-presentation.spec.ts --project=chromium --workers=1 --grep-invert 'pending cancellation|traverse generation recovery'`:42/43passed,exit1,3.6min. Единственный fail —новый oversized APG panel focus visibility, затем исправлен с отдельным RED.
- После последнего source fix: `npm run test:e2e -- e2e/phase03-presentation.spec.ts e2e/phase03-recipes.spec.ts e2e/phase02-presentation.spec.ts --project=chromium --workers=1 -g 'EC-|traverse saved screens|exact saved recipe|repeated recipe'`:8/8passed,exit0,50.2s. Это fresh affected-flow pass, а не повторный полный43-case или полный browser regression pass. Остальные31legacy и4recipe/error cases прошли в предыдущем43-case прогоне; после локального panel-focus изменения их не повторяли.

Снимки `.tmp/phase03-qa/03-10-{360,390,430,768,1280}-menu.png` фактически открыты visual tool. Первый просмотр выявил растянутые изображения; после fix все5просмотрены повторно с корректными4:3 и полным переносом текста. Снимки viewport обрезают страницу по высоте обычным скроллом; assertions проверяют доступность последнего summary/focus над action/nav.

## Корректировки старых сценариев

`e2e/phase02-presentation.spec.ts` и `e2e/phase03-recipes.spec.ts` минимально обновлены с разрешения оркестратора: пользователь выбирает «Вся неделя» вместо прежнего defaultweek; Link ищется внутри точного instance, так как accessible name теперь включает дату/слот; существующий new-set dialog подтверждается; последовательный Tab проходит все actual variant/mode/day/panel/card controls перед shopping. Прежние recipe facts/allocations/bytes/stalecontext/navigation/keyboard assertions сохранены.

Промежуточный33-caselegacy run:31passed,2failed —obsolete saved Tab order и generation cancellation focus. Последний зарегистрирован как существующий дефект, failing test сохранён. Один промежуточный shared-serverrun дал5own passes, затем6recipe failures ERR_CONNECTION_REFUSED, когда владелец Vite закончил suite; этот запуск не является regression verdict. Финальные команды используют собственный обычный server lifecycle и фиксированный набор.

## Известный дефект и границы приёмки

Baseline50b2a30 подтверждён только фактически запущенным360px cancellation reproducer из `.tmp/03-10-baseline`:

`npm run test:e2e -- e2e/phase02-presentation.spec.ts --project=chromium --workers=1 -g '360px pending cancellation'`

Exit1: после Enter по «Отмена» `expect(submit).toBeFocused()` получает inactive. WINDOWS#23open; подробности и план исправления03-11 — `.planning/phases/03-sravnenie-variantov-i-prosmotr-retseptov/deferred-items.md`. В финальном прогоне8cancellation paths исключены, не проверены этим прогоном и не объявлены прошедшими. Только один baseline path действительно запускался. Полный browser regression pass не заявлен.

NativeSafari15/реальные устройства/AT/физическая клавиатура и safe-area/нативный browserzoom остаются отдельной ручной оценкой. Chromium CSStextzoom и shortheight assertions не подменяют её. Изображения49/52;03-09следующий. Phase3не завершена.
