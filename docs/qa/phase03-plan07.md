# Проверка03-07 — 2026-11-07

Партия03 содержит12 отдельных native PNG1448×1086 и ledger docs/data/recipe-media-batches/03.json. Первые10 outputs сохранены из предыдущего выполнения; при возобновлении созданы только rice-carrot-dinner и millet-tomato-dinner, каждый отдельным встроенным image_gen вызовом с ingredients/steps исходного рецепта. Оба native output фактически просмотрены: рис с короткой морковной соломкой; влажное пшено с размягчёнными томатами. Посторонних garnishes нет. Пиксели не редактировались; файл скопирован в public/recipes, header/bytes/hash измерены из PNG.

## Реальные проверки

- Последняя группа: `node scripts/check-recipe-media.mjs --ledger docs/data/recipe-media-batches/03.json --ids beet-flour-pancakes,buckwheat-potato-mash,rice-carrot-dinner,millet-tomato-dinner`: checked4/fullfalse/exit0.
- `npm run test:e2e -- e2e/phase03-media.spec.ts --grep batch-03-03 --project=chromium --workers=1`: JUnit1test,0failures,0skipped,13.064s; testcase2.676s. Подтверждено также итоговым прогоном.
- Auditor с явным CSV всех12 recipeId из ledger03: checked12/fullfalse/exit0; PNG signature/IHDR,4:3 dimensions,containment,hash/unique hash,bytes,exactID/version/path,provenance+accepted review.
- `npm run test:e2e -- e2e/phase03-media.spec.ts --grep batch-03 --project=chromium --workers=1`: exit0,3/3,14.6s. batch-03-01:4.7s; batch-03-02:2.2s; batch-03-03:2.2s. Все12 local img видимы на реальных /recipe/:id с natural dimensions4:3; внешних запросов изображений нет.
- `npm run test:unit -- --run`: exit0,465/465,19files,12.75s.
- `npm run typecheck`: exit0; выполнен перед task03 commit и в общем regression gate.
- `npm run lint`: exit0.
- `npm run build`: exit0,143modules,1.86s. Существующее неблокирующее предупреждение JS505.94kB/gzip143.04kB не изменилось.
- Diff3e6e6f5..de8c7c1 для src/package.json/package-lock.json пуст. Другие ledgers и пользовательские untracked files не менялись.

## Коммиты и provenance

dae82fc — группа01; e5217ce — группа02;94a1877 — сохранение10готовых изображений после interruption;de8c7c1 — завершение группы03. Точные prompts, originalArtifact, invocation timestamps, terms URL/date, размеры,bytes,SHA256 и review notes находятся в ledger03. Первые10 не регенерировались. Последние вызовы:2026-11-07T09:23:40.359Z и09:24:33.829Z. В текущем возобновлении отказов/quota/auth не было. Платные API,CLI,ключи,прокси и auth changes не использовались.

## Границы проверки

Asset-only работа по утверждённому плану; TDD/RED неприменим. Иллюстрации не являются источником пищевых фактов. Reviewed=true означает фактический осмотр агентом, не human UAT. Full52/offline и тесты карточек меню, caption, nativeSafari, responsive не заявляются этим scoped прогоном.37 из52 PNG существуют; общие требования и вся фаза ещё не закрыты.

