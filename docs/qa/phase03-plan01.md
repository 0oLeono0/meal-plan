# Phase 03, plan 01 — генерация и сохранённый выбор

Фактическое выполнение 04–05.11.2026; продолжение после ограничения использования. Это проверка плана03-01, не приёмка всей Phase3. Фазовые DATA-04/GEN-06/MENU-03 остаются pending до остальных планов и независимой проверки.

## RED → GREEN

| Шаг | Фактический RED | GREEN |
|---|---|---|
|03-01-01|Настоящий wizard/default adapter: ожидались3 variants, получен1. JUnit1failed, `.tmp/phase03-01-task01-red.json`, commit`ba0ba36`|`525e985`: retained top3 + guarded select. Chromium1/1, затем итоговый browser2/2|
|03-01-02|68tests:59pass/9fail. Target `semantic alternative search > honors targetCount and excludes outputs without skipping their search evaluation`: ожидался1, получено3; также guard12 и invalid options. `.tmp/phase03-01-task02-red.json`, `14600c4`|`a6029d5`:68/68|
|03-01-03|70tests:68pass/2fail. Reload base revision: ожидалсяidle, полученоsaving; failed save: ожидался прежний count1, получено3. `.tmp/phase03-01-task03-red.json`, `71c85ec`|`0f3b8ef`:70/70|
|Legacy UI|Загруженный настоящий single не имел подписи сохранённого количества. JUnit1failed, `.tmp/phase03-01-legacy-ui-red.json`, `cbb68c1`|`3e3dab0`: подпись, обе стрелкиdisabled, нет выдуманного shortage; saved success status|

Для четырёх записей выполнен `check tdd-red-evidence ... --raw`: `RED_EVIDENCE_OK`. Target реально исполнялся и падал на указанном утверждении. Первоначально task02 classifier отклонил неполное имя target; до production изменения имя исправлено на classname#describe/test, повторный фактический JUnit принят. Legacy browser сначала не собрался из-за отсутствия JSON import attribute; добавлен `with { type: 'json' }`, и только последующий assertion failure использован как RED. Ошибки загрузки тестов не выдавались за RED. Новые пакеты и Node types не устанавливались.

## Итоговые выполненные проверки

| Команда | Результат05.11.2026 |
|---|---|
|`npm run test:unit -- --run src/domain/plan.test.ts src/domain/generatePlan.test.ts`|68/68,1.26s, exit0|
|`npm run test:unit -- --run src/adapters/activePlan.test.ts src/features/generation/controller.test.ts`|70/70,1.06s, exit0|
|`npm run test:unit -- --run`|397/397,17files,9.34s, exit0; прежние assertions, включая6seed fallback tests, сохранены|
|`npm run typecheck`|exit0 после каждой задачи и итогового browser|
|`npm run lint`|exit0|
|`npm run build`|exit0; Safari15 target,139modules,4.54s|
|`npm run test:e2e -- e2e/phase03-variants.spec.ts --project=chromium --workers=1`|2/2,12.9s, exit0|
|`git diff --check`|exit0|

Browser реально проходит мастер без подмены генератора или готового multi-plan:3 разных assignment fingerprints → выбор второго → одинаковые active ID/три стоимости menu/shopping → reload → исходные variants неизменны. Проверяется отсутствие горизонтального переполнения на360/390/430/768/1280. Второй тест загружает настоящий прежний single и проверяет обе disabled arrows и отсутствие строки о результате нового поиска. Браузерный контекст изолирован; пользовательские данные не редактировались.

Измеренное время default52-recipe corpus от финального submit до saved acknowledgement:3754ms в первом повторном GREEN и3457ms в последнем. Лимиты512evaluations/beam32/общий deadline30s не увеличивались; поиск запускается один раз. Это измерение конкретных запусков, не гарантия всех входов. Предупреждение runner о FORCE_COLOR/NO_COLOR не является ошибкой приложения.

## Независимые оракулы и сохранность

- EC-01/03/04: selection сохраняет порядок и assignments всех вариантов; identical/unknown ID не пишет; retrySave не вызывает generation. Три literal стоимости400/600/800RUB и calories480/720/960 пересчитываются независимо от active ID.
- EC-02: missing/key, corrupt/empty/null и реальный legacy покрыты adapter tests; read не вызывает setItem и не меняет bytes.
- EC-05/T-03-02: deferred ack, cancel/dispose, serialized writes, reloaded revision и external changed bytes сохраняют прежний active. Final adapter guard проверяется непосредственно перед setItem. Квота даёт memory-only с прежними bytes; retry пишет тот же candidate.
- EC-06/08: конечный каталог с разным breakfast и тремя фиксированными слотами даёт точное множество3/2/1/0 assignment solutions; zero→typed NO_RECIPES. Envelope12 принимается,13/global duplicate IDs/unknown active отклоняются.
- EC-07/09/11: normalized1=2/2, обратный порядок, opaque IDs и recipe input order не создают семантического отличия. Изменение recipe/servings создаёт отличие; tie comparator повторяем.
- EC-10: literal exact500RUB принимается,5000001/10000RUB отклоняется. Прежние safety/time/price/pantry/budget assertions остаются в полном unit наборе.
- EC-12: прежние adapter/controller deadline/cancel tests проходят в397unit; общий deadline не изменён. Исключения убирают результаты из retained set, но не evaluation/beam transitions; исключение всех допустимых решений даёт SEARCH_EXHAUSTED, а не ложное доказательство недостаточного бюджета.
- T-03-01: inactive budget/snapshot, same-version catalog facts и active membership tampering отклоняются без изменения исходной записи. Production adapter/trusted registry не менялись.

## Происхождение неизменённого legacy fixture

`src/test/fixtures/phase02-active-plan-v1.json` — точная копия `.tmp/phase03-legacy-active-plan.json`, снятого исходным single producer до production правок, Phase2 compatibility source commit`1789eea`. Это настоящий encoded envelope, не новый multi-plan, переименованный в old.

- UTF8 bytes:189175; SHA256:`f8aed6836ac1d28a27dcc9a187ec5e49a0b3ca7f928b45b550406532bc855b73`.
- Schema1; key`mealplan:guest:active-plan:v1`; catalog`mealplan-2026-10-28-1`.
- Active`generated-1`; seed`22cf714e-f1e2-4166-afaf-a853ba63b716`; даты2026-11-04…2026-11-10;28literal date/slot IDs.
- Unit импортирует исходный raw string, сравнивает encoded plan и повторный load без setItem. Файл содержит только проектные тестовые данные.

## Ограничения

Firefox/WebKit, nativeSafari15, устройства, screen readers и human UAT в этом плане заново не проверялись. Исторические15seed browser passes не выданы за новый запуск. Новых skipped tests/unrun task verifies нет; полная матрица Phase3 остаётся планам11–12/верификатору. Рецепты, изображения, day/week и append ещё не реализованы этим планом. Никаких новых endpoint/auth/schema trust surfaces, зависимостей, платных API или публикации. Новых blocking stubs не внесено; placeholders будущих маршрутов существовали до этой задачи.
