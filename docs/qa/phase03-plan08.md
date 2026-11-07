# Проверка 03-08 — 2026-11-07

Партия04: 12 отдельных native PNG1448×1086, 28214711bytes суммарно. Каждый создан отдельным встроенным image_gen вызовом из полного состава и шагов src/data/recipes.ts. Все12 native outputs фактически просмотрены агентом до копирования; пиксели не редактировались. Ledger docs/data/recipe-media-batches/04.json содержит exact prompts, invocation timestamps, original artifacts, terms URL/date, dimensions/bytes/SHA256 и индивидуальные visualReview. reviewedAt означает осмотр агентом, не human UAT; effectiveDate — дата invocation, не утверждение ревизии условий провайдера.

## Выполненные команды

- Для каждой группы по4: `node scripts/check-recipe-media.mjs --ledger docs/data/recipe-media-batches/04.json --ids <exact four IDs>` — checked4/fullfalse/exit0. Exact IDs групп соответствуют PLAN и статическим named browser groups.
- `npm run test:e2e -- e2e/phase03-media.spec.ts --grep batch-04-01 --project=chromium --workers=1` —1/1,7.6s,exit0. Tracer feedback gate повторён до расширения —1/1,7.3s,exit0.
- Аналогичный `--grep batch-04-02` —1/1,7.6s,exit0; `--grep batch-04-03` —1/1,7.4s,exit0.
- `npm run typecheck` — exit0 после каждой группы.
- `node scripts/check-recipe-media.mjs --ledger docs/data/recipe-media-batches/04.json --ids tomato-carrot-dumplings,cabbage-carrot-salad,tomato-cabbage-salad,carrot-tomato-salad,beet-carrot-raw-salad,carrot-sweet-ribbons,cabbage-beet-salad,tomato-carrot-cabbage-salad,carrot-semolina-pudding,rice-sweet-snack,semolina-small-flatbread,warm-tomato-carrot` — checked12/fullfalse/exit0. Проверены exactID/version/local path, PNG signature/IHDR,4:3,containment,measured dimensions/bytes/hash,уникальность12hashes и accepted provenance.
- `npm run test:e2e -- e2e/phase03-media.spec.ts --grep batch-04 --project=chromium --workers=1` —3/3,17.2s,exit0; testcase durations4.5/2.2/2.3s. Все12 exact img видимы на реальных /recipe/:id, имеют ненулевые natural dimensions4:3; внешних image requests нет.
- `npm run test:unit -- --run` —465/465,19files,13.32s,exit0.
- Итоговый `npm run typecheck` —exit0; `npm run lint` —exit0.
- `npm run build` —exit0,143modules,3.18s. Существующее предупреждение основного JS505.94kB/gzip143.04kB не изменилось; оно уже зарегистрировано в WINDOWS.md.
- Diff от5cc12f1 для src/package.json/package-lock.json пуст. Каталог пищевых фактов, runtime, другие ledger и прежние37 PNG не менялись. В ledger04 нет TODO/FIXME/placeholder. Asset-only scope: TDD/RED/GREEN неприменимы.

## Визуальные решения

Клёцки имеют ложечную форму в томатно-морковном соусе; салаты различаются exact набором сырых овощей и нарезкой. Морковная стружка длинная и тонкая, без широких лент. Морковно-манный перекус — густая мягкая масса без корки; рисовый — размятый крем, без подмены прежней кашей. Манные лепёшки — ровно две тонкие штуки на порцию, сухая поверхность; тёплые овощи сохраняют кусочки и короткие морковные полоски. Неучтённых гарниров, зелени, масла и молочных добавок не видно. Все12 приняты с первой генерации.

## Границы проверки

Built-in image_gen,12calls; без paid API/CLI/key, установки пакетов, proxy/auth изменений, quota failures или retry-loop. Generated output не объявлен CC0, исключительным или доказательством приготовления/КБЖУ. В проекте49/52PNG. Full52/offline, media карточек меню, responsive/nativeSafari и human UAT этим scoped прогоном не подтверждены. MENU-03/REC-01 и Phase03 остаются Pending. Планы03-09/10 не запускались.
