# Phase03 — итоговая проверка 03-12

Дата: 08.11.2026. Checkout `D:/Projects/meal-plan`, branch `codex/phase01-execution`, исходный HEAD `5987aa9faae700d43b6e074a0bccfee6d95158e6`. Никаких новых веток, пакетов, платных API или изменений пищевого каталога. Phase03.1 обязательна после приёмки Phase03 перед Phase04; CAT-01…05 остаются Pending.

## Область и различие доказательств

`e2e/phase03-acceptance.spec.ts` содержит настоящий длинный путь через production App/каталог/адаптеры: wizard с200г риса →3семантических варианта →выбор второго →редактирование budget черновика →append1 из прежних applied inputs →точный recipe/variant/instance →ингредиенты/4КБЖУ/состав/шаги →возврат →shopping →reload. Три цены сверяются по исходным `data/sources/food.snapshot.json` и `prices.snapshot.json`, без вызова production projection/nutrition/formatters как oracle. Эти данные подтверждают только текущие12profiles/52растительных рецепта, не полноценность питания/актуальность местных цен/кухонное качество.

Отдельный literal synthetic fixture:4×125г=500г, запас200г расходуется125+75+0+0, покупки0+50+125+125=300г; ingredient50/covered20/purchase30RUB; на порцию250ккал/Б12.5/Ж0/У37.5/6.25RUB. Это проверка арифметики на тестовых фактах, не продуктовый факт и не USDA oracle.

`phase03-variants.spec.ts` дополнен контролируемыми1/2-result ports: сначала настоящий source-backed поиск, затем только для UI-теста выдаётся подмножество реальных вариантов; exact shortage и reload проверяются без утверждения, что настоящий каталог имеет всего1/2решения. Реальная0/no-new/error ветка — `phase03-append.spec.ts#no new result preserves exact bytes and exposes persistent honest recovery`, typed errors/timeout — `generation.spec.ts`; кап12 — append/presentation; quota/late save/cancel — recovery/append/races. Контролируемые ports не подменяют обязательный реальный happy path.

## Текущие запуски

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

## Разбор первого нового сбоя

Firefox extended acceptance упал на строгом `[data-instance-id]`: URL уже `/recipe/...`, React ещё не заменил28старых menu articles. Trace/error-context показывают28старых cards, а не неверный рецепт/потерю saved bytes. Добавлено ожидание точного recipe h1 перед сохранённой строгой instance assertion. Production не менялся; numeric/ID assertions не ослаблены. Повторный tracer и полный набор регрессии должны быть записаны отдельно ниже.

## Native Tab: приложение и платформа разделены

После sync-fix повторный tracer21/21 прошёл; исходный8/9 сохранён выше. Полный набор960tests/workers2 запущен после tracer; результаты будут записаны отдельно.

Default benchmark final tracer (production adapter+save / отдельный bounded domain search): Chromium3725/3930.5ms,607transitions/512evaluations; Firefox6472/6206ms,621/512; WebKit6918/6592ms,607/512. Во всех3engines3варианта. Это два отдельных измерения, каждое с одним30sлимитом, не два срока одной production операции. Точные найденные планы зависят от seed; bounded512 не доказывает исчерпывающий оптимум.

Свежий `node .tmp/03-12-native-tab-audit.mjs` (exit0) создал чистый HTML без MealPlan/React/CSS/scripts: `<a href="#target">`, button, второйa, input. Обе ссылки имели `tabIndex:0`, `display:inline`, `visibility:visible`; pointer click во всех3engines даёт`#target`.

Фактические8nativeTab:

- Chromium: first,button,second,input,BODY,first,button,second.
- Firefox: first,button,second,input,input,input,input,input (первые оба anchor достижимы).
- WindowsWebKit: button,input,BODY,button,input,BODY,button,input; оба anchor пропущены.

Это независимо воспроизведённое поведение установленного WebKit вне приложения, а не автоматическое оправдание всех UI-fail средой. Конкретная настройка/реализация движка не установлена. Не использовались programmaticfocus, skip/xfail, системные настройки или private protocol preferences. App nativeTab gates WINDOWS15/16/24/25 сохраняются failed/unverified; nativeSafari15/AT не проверены. Context7 `/microsoft/playwright/v1.64.1` подтвердил native keyboard API, но не дал доказательства причины пропуска anchors; это не browser compatibility pass.

## Оставшиеся ворота

Полный regression, production-preview smoke и предметный coverage/security audit выполняются в task03-12-02. До их записи нет sign-off. Human UAT, nativeSafari15/device/AT/реальный200%zoom/safearea и6descriptorless flagged-unverified prohibitions не закрыты автоматизацией. Phase03 не принята, shared8requirements не закрываются этим отчётом.
