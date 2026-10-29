# Phase 2 — UI Review

**Audited:** 2026-10-29
**Baseline:** approved `02-UI-SPEC.md`, `02-CONTEXT.md`; границы следующих фаз сохранены.
**Screenshots:** captured ранее в `.tmp/phase02-qa/`; повторно просмотрены Firefox 360 menu, 768 shopping, 1280 menu. Новый CLI-снимок изолированного pending-компонента: `.planning/ui-reviews/02-pending-component.png`.
**Interaction captures:** off — `workflow.ui_interaction_capture` отсутствует, default false. Chrome DevTools interaction driver не запускался.
**Result:** 0 подтверждённых BLOCKER, 7 WARNING. Есть незавершённая ручная/device-приёмка; этот отчёт не закрывает фазу.

## Evidence and Limits

Проверка использует фактический код, существующие QA-снимки и отдельный локальный Chromium CLI-probe. Порты 3000/5173/8080/4193 сначала не отвечали; для точечных измерений запущен собственный Vite 127.0.0.1:4193. Перед новой съёмкой создан/проверен `.planning/ui-reviews/.gitignore` со всеми восемью capture-patterns; `git check-ignore` подтверждает игнорирование PNG. Старые `.tmp`-снимки защищены корневым `.gitignore`. Автоматическая новая тройка root-first-paint не выдаётся за повторный полный адаптивный аудит: использованы доступные снимки неизменившегося production UI, как предписано scope этой проверки.

CLI `.tmp/phase02-ui-audit.mjs` выполнил настоящий quick-start → saved menu при 360×812, затем измерил computed styles. Отдельно отрисован настоящий GenerationPage с контролируемым pending snapshot; это проверка представления компонента, не доказательство полного async/cancel-сценария. Снимок действительно открыт через view_image. Результаты: h3 18.72px/600, margins 18.72px 0; budget dd margin-inline-start 40px; progressbar 328×0px, transparent, border 0; page scrollWidth=innerWidth=360. Скрипт exit0 после исправления ожидания появления dd; исходная попытка завершилась ошибкой ожидания UI после URL, не продуктовым дефектом.

Полная release-матрица здесь повторно не запускалась. По `02-10-SUMMARY.md`/`docs/qa/phase02.md`: Firefox 240/240; Chromium 240 case identities покрыты фактическими прогонами; Windows WebKit 238 passed/2 failed. `docs/qa/phase02-webkit-assessment.md` воспроизводит пропуск anchors на plain HTML. Поэтому два failed остаются failed/manual-unverified, но не классифицируются как доказанный CSS-дефект MealPlan. Safari15, реальные клавиатуры/устройства, screen reader и человеческая оценка не подтверждены.

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 3/4 | Recovery понятен, но budget error показывает product IDs, data error смешивает виды неизвестных данных |
| 2. Visuals | 3/4 | Бюджет — ясный focal point; pending progressbar физически невидим |
| 3. Color | 4/4 | Палитра и ограниченное назначение accent соблюдены; экранные цвета вынесены в tokens |
| 4. Typography | 3/4 | Native h3 добавляет пятый размер 18.72px вне контракта |
| 5. Spacing | 3/4 | Native dd 40px и h3 18.72px обходят утверждённую шкалу |
| 6. Experience Design | 3/4 | Recovery/cancel/save разделены; active-load показывает только строку вместо заданного skeleton |

**Overall: 19/24**

## Top 3 Priority Fixes

1. **V1: сделать pending indicator видимым** — ожидание сейчас выглядит статичным текстом — заменить пустой div на видимый indeterminate progress/indicator без выдуманных процентов, сохранить label/status, reduced-motion и доступную «Отмена».
2. **T1/S1/S2: нормализовать h3 и budget dl/dd** — системные browser defaults меняют иерархию и ритм — назначить h3 один из четырёх существующих rem-размеров, weight600 и token margins; сбросить dd indent и задать token gaps. Не вводить новые токены.
3. **C1: заменить IDs названиями в budget refusal** — пользователю трудно понять, какие исключения мешают подбору — resolve exclusionIds через валидированный каталог/snapshot names, сохраняя ID только в техническом provenance при необходимости.

## Detailed Findings

### Pillar 1: Copywriting (3/4)

- **WARNING C1**, `src/features/generation/GenerationPage.tsx:52`: `requestedSettings.exclusionIds.join(', ')` выводит внутренние идентификаторы в пользовательскую строку «Исключены». Названия ограничений рядом уже корректно разрешаются. Нужны человекочитаемые product names из того же validated каталога; данные/ограничения не менять. Code-derived, отдельно не снималось.
- **WARNING C2**, `src/features/generation/GenerationPage.tsx:47`: missing-data recovery всегда печатает «данные о цене / КБЖУ / выбранном ограничении», даже когда diagnostics указывает конкретный вид. Контракт требует показать, что именно не подтверждено для продукта. Сопоставить typed diagnostics с отдельными русскими причинами, не объявляя неизвестное безопасным или нулевым. Code-derived.
- Проверено: финальный CTA «Составить меню», сохранение skip-данных (`Wizard.tsx:104`), cancel/timeout/retry-save, ручная цель отсутствует/0 и предупреждение без медицинского обещания. Три стоимости, оценочность цены и реальные scope/date присутствуют (`PlanSummary.tsx:14`). Ограниченный растительный каталог прямо обозначен (`MenuPage.tsx:46`); это корректная оговорка, не доказательство полноценности рациона.

### Pillar 2: Visuals (3/4)

- **WARNING V1**, `src/features/generation/GenerationPage.tsx:23`: `<div role="progressbar" .../>` не имеет содержимого, размеров, border/background или связанного CSS. CLI подтвердил height0/transparent; новый pending-снимок показывает только заголовок, строку и cancel. Нарушено требование видимого indeterminate indicator. Текстовый feedback остаётся, поэтому задача не заблокирована и score1 не назначен.
- Снимки Firefox 360/1280 показывают крупную бюджетную сводку, светлый canvas, белые округлые группы и понятный текущий nav. Снимок768 shopping показывает доступный раскрытый stock block и visible focus над bottom nav. Статические блюда не притворяются кликабельными. Фото/графики/варианты/recipe actions намеренно относятся к следующей фазе.

### Pillar 3: Color (4/4)

- **PASS, конкретное основание:** `src/shared/styles/tokens.css:4`–`16` содержит точные canvas/surface/accent/text/muted/border/selected/hover/danger значения UI-SPEC. Новые четыре экранных TSX не вводят hex/rgb палитру; divider и progress используют CSS tokens. Accent добавлен для одного бюджетного progress (`PlanSummary.tsx:17`), текущего nav (`tokens.css:127`) и существующих selection/primary controls. Нет зелёной раскраски всех макросов/рецептов.
- По просмотренным снимкам сохраняется приблизительная 60/30/10 композиция: светлая основа, белые группы, небольшой зелёный акцент. Это качественная оценка, не выдуманный pixel census. Отсутствие новой критической цветовой проблемы не снижает score автоматически. Meaningful focus видим; статус/ошибки имеют текст, а не только цвет.

### Pillar 4: Typography (3/4)

- **WARNING T1**, `src/features/menu/MenuPage.tsx:52`, `:55`, `src/features/shopping/ShoppingPage.tsx:43`: h3 получает только `font-semibold`; `tokens.css:56`–`58` нормализует h1/h2, но не h3. Computed Chromium menu: **18.72px,600**. Вместе с tokens 14/16/24/32 это пятый размер, против «ровно4». Назначить role body16/600 или heading24/600 из существующего контракта по иерархии и проверить long labels. Не применять глобальный reset без проверки наследуемого wizard.
- Положительное: системный шрифт, 400/600 для нормализованных ролей, input16+, tabular-nums на деньгах/КБЖУ, dates/формы ru-RU. Новый размер обусловлен UA default, а не аргументом, что семантический h3 обязан отсутствовать.

### Pillar 5: Spacing (3/4)

- **WARNING S1**, `src/features/plan/PlanSummary.tsx:18`: dl/dd не нормализован. CLI budget dd: **40px margin-inline-start**, отчётливо виден и на1280 снимке; отсутствует в4/8/16/24/32/48/64 шкале. Применить margin0 и token gap либо аккуратную label/value композицию без отдельных карточек на каждый показатель. Сейчас nutrition dd использует m0 (`MenuPage.tsx:18`), что усиливает непоследовательность.
- **WARNING S2**, `MenuPage.tsx:52`/`:55`, `ShoppingPage.tsx:43`: h3 сохраняет native вертикальные margins; CLI18.72px сверху/снизу, не spacing token. В списках это повторяется для28 meal instances и строк покупок. Задать явные token margins вместе с T1; не уменьшать44px disclosure targets.
- Проверено: cards16/24, gutters16/24/32, sidebar240 при1200, одна колонка и max-width640/960 реализованы в `tokens.css:50`,`:101`,`:137`–`:147`. Новое фактическое360 menu не имеет page overflow. Существующие seven-width screenshots/tests — evidence адаптивности, не новая полная матрица в этом аудите.

### Pillar 6: Experience Design (3/4)

- **WARNING E1**, `src/app/App.tsx:195`, `src/features/menu/MenuPage.tsx:26`, `src/features/shopping/ShoppingPage.tsx:19`, `src/shared/ui.tsx:16`: active load pending возвращает один Status paragraph. UI-SPEC явно требует skeleton menu/shopping при hydration, а не только его loading copy. Добавить структуру skeleton с aria-hidden и одним существующим polite status; не озвучивать placeholder numbers как факты. Code-derived; отдельный loading screenshot не создавался.
- Состояния absent/error/corrupt/pending/save-failure/target0/fully-covered реально различены; memory-only не выдаёт старый active за новый и retry-save не переименован в повторную генерацию. Native details сохраняют sources по dated instance; shopping с тем же active snapshot, stock не списывается физически. Cancel/request ownership/read-only calculations проверены исходниками и прежним QA; новый CLI-probe не объявляется повторным race/cancel e2e.
- V1 относится также к waiting experience, но не подсчитан вторым самостоятельным дефектом. Два WebKit failed остаются отдельным verification gate, не скрытым pass и не доказанным task-completion blocker приложения.

## Human Review Pending

`needs_human_review: true`: восприятие плотности/тона, brand feel, удобство7 дневных секций; Safari15/macOS/iOS keyboard navigation и реальные mobile keyboard/safe-area. Текущий scope —12 plant food profiles/52 recipes; низкая фактическая энергия/жиры не переименованы в здоровое меню. Автоматическая медицинская норма P1 не добавляется по результатам этого аудита. Поздние recipe/photo/edit/PDF действия отсутствуют намеренно и не являются находками Phase2.

## Files Audited

- `AGENTS.md`, `.planning/config.json`; installed ui-review workflow, ui-brand, agent-skills bootstrap; configured auditor skills empty.
- `02-CONTEXT.md`, `02-UI-SPEC.md`, `02-01`…`02-10` PLAN/SUMMARY; `docs/qa/phase02.md`, `docs/qa/phase02-webkit-assessment.md`.
- `.agents/skills/ui-ux-pro-max/SKILL.md`, `.agents/skills/web-design-guidelines/SKILL.md`; [Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md), получены2026-10-29.
- `src/shared/styles/tokens.css`, `src/shared/ui.tsx`, `src/app/App.tsx`, `src/features/wizard/Wizard.tsx`.
- `src/features/generation/GenerationPage.tsx`, `controller.ts`, `src/features/menu/MenuPage.tsx`, `src/features/plan/PlanSummary.tsx`, `src/features/shopping/ShoppingPage.tsx`.
- `e2e/generation-fixtures.ts`, `e2e/plan-fixtures.ts`, существующие screenshot/QA artifacts; собственный ignored CLI-probe.

`components.json` отсутствует, UI-SPEC registries:none — registry safety audit неприменим, external blocks не запускались.

**Recommendation Count:** Priority fixes3 (V1; T1/S1/S2 одной нормализацией; C1); minor recommendations2 (C2,E1). Всего7 уникальных WARNING; рекомендации группируют связанные причины, не добавляют отдельные дефекты.
