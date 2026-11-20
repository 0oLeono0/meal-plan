# Phase 03 — UI Review

**Audited:** 2026-11-09
**Baseline:** утверждённый 03-UI-SPEC.md, решения 03-CONTEXT.md, планы и отчёты 03-01…03-12
**Screenshots:** captured — свежий Chromium CLI, desktop 1440×900, mobile 375×812, tablet 768×1024 и дополнительный 360×812
**Interaction captures:** off — workflow.ui_interaction_capture отсутствует, значение по умолчанию false

## Объём и доказательства

Проверены исходники, контракт и существующие QA-отчёты. При первом поиске серверы на 3000/5173/8080 отсутствовали. Для ограниченного визуального аудита запущен Vite на 127.0.0.1:5173. До снимков проверены все восемь ignore-паттернов в `.planning/ui-reviews/.gitignore`. Новые PNG находятся в `.planning/ui-reviews/03-20261109-audit/`, исключены из Git. Снимки сделаны CLI через установленный Playwright, после загрузки заголовка и decode настоящего изображения.

Свежая визуальная проверка охватывает direct recipe `/recipe/rice-sweet-porridge`. Во всех четырёх размерах document.scrollWidth равен innerWidth. Просмотрен свежий `contract360.png`. Дополнительно повторно просмотрен существующий `.tmp/phase03-qa/03-10-1280-menu.png` с недельной сеткой. Последний — повторно использованное evidence прежнего QA, не свежая проверка menu или интерактивного сценария. Full-page screenshot показывает fixed nav в позиции исходного viewport, поэтому его наложение на середину длинного PNG само по себе не доказывает перекрытие контента при прокрутке.

Unit, build и полный browser suite в этом аудите повторно не запускались. Прежние результаты из `docs/qa/phase03-final-validation.md` сохранены с их границами. Latest unit 478/478, typecheck/lint/build exit0, critical60/60 all3engines. Исходный полный960 завершился889passed/71unsuccessful. Полного post-fix960pass нет. Четыре native WebKit failures WINDOWS15/16/24/25 остаются открыты.

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 3/4 | Часть точных строк контракта сокращена, recovery в целом содержателен |
| 2. Visuals | 3/4 | Карточка повторяет калории и цену, увеличивая плотность недельной сетки |
| 3. Color | 2/4 | Все четыре meal badge расходятся с заданной палитрой, stock использует запрещённый accent |
| 4. Typography | 3/4 | Четыре размера и два веса сохранены, часть расчётных чисел без tabular-nums |
| 5. Spacing | 3/4 | Native dd сохраняет 40px отступ вне принятой шкалы |
| 6. Experience Design | 2/4 | Четыре клавиатурных platform gates и крайние состояния остаются непроверенными/неуспешными |

**Overall:** 16/24

## Top 3 Priority Fixes

1. **Подтвердить клавиатурный путь на целевой платформе.** Открытые WINDOWS15/16/24/25 не позволяют подписать весь путь до карточки, рецепта и покупок. Выполнить native Safari15/macOS/iOS keyboard/device/AT UAT, зафиксировать фактический Tab-порядок, focus/scroll и platform settings. Исправлять подтверждённую причину, сохраняя native links и assertions.
2. **Вернуть контрактные цвета meal/stock badges.** В `tokens.css` задать breakfast #FFF0CE, lunch #E5EFE8, dinner #E8E2F5, snack #E5ECF2. Stock сделать #172B21 на #E5EFE8. Это восстанавливает различение слотов и резервирование accent для действий/selection.
3. **Убрать лишний отступ чисел КБЖУ.** Сбросить native margin у dd в recipe nutrition/disclosure и проверить выравнивание на360/768. Применить существующие spacing tokens и повторить проверку больших значений.

## Detailed Findings

### Pillar 1 — Copywriting (3/4)

- **WARNING C1.** `src/features/menu/MenuPage.tsx:169–171` сокращает legacy-one до «В сохранённом наборе 1 вариант», убирая предусмотренное предложение про пересборку. Shortage и подпись семейной закупочной базы также заменены другими строками. Восстановить утверждённые формулировки Copywriting Contract, включая явную оценку дополнительных покупок на период. Потери данных этим не выявлено.
- **WARNING C2.** `src/features/recipe/RecipePage.tsx:37` показывает «К меню» вместо предусмотренного в Layout Contract «Назад к меню». В том же контракте error CTA действительно задан «К меню». Для успешного recipe state применить отдельную подпись возврата.
- Подтверждено по коду — notfound/stale/incomplete/error различимы, имеют следующий шаг, media содержит AI-caption, три factual warnings присутствуют. Это не human tone acceptance.

### Pillar 2 — Visuals (3/4)

- **WARNING V1.** `src/features/menu/MealCard.tsx:22–26` сначала выводит время/ккал и цену, затем повторяет ккал/цену в полном nutritional footer. Повтор виден на повторно использованном desktop screenshot и увеличивает высоту каждой из28карточек. Удалить повтор или вынести дополнительные БЖУ в согласованное раскрытие, сохранив контрактный состав карточки.
- **WARNING V2.** `src/shared/RecipeImage.tsx:14` задаёт hero `rounded-2xl` (16px), хотя Layout Contract задаёт image radius12px. Для card CSS radius переопределён12px, hero такого переопределения не имеет. Использовать общий radius-field.
- Свежий360 показывает реальную raster4:3, полный заголовок, последовательные секции и читаемый состав. Glyph-only arrows имеют aria-label в `MenuPage.tsx:173–174`.

### Pillar 3 — Color (2/4)

- **WARNING CO1.** `src/shared/styles/tokens.css:213–216` использует selected/canvas/disabled/surface для breakfast/lunch/dinner/snack. Это четыре отклонения от точных meal-badge значений контракта. На повторно просмотренной сетке слоты визуально почти одноцветны.
- **WARNING CO2.** `src/shared/styles/tokens.css:217` окрашивает «Использует запасы» accent. Контракт задаёт основной текст на selected background. При28слотах декоративный stock accent способен повторяться много раз вне разрешённых action/selection/progress элементов. Исправить правило stock-badge.
- Canvas/surface/accent/danger/text/muted/border tokens совпадают с контрактом (`tokens.css:4–13`). Количественный pixel-area60/30/10 не измерялся. Наличие правильных токенов не подтверждает распределение поверхностей. Фото исключены из этой пропорции согласно контракту.

### Pillar 4 — Typography (3/4)

- **WARNING T1.** `src/features/menu/MealCard.tsx:22–24` оставляет время/ккал и число семейных порций без tabular-nums. Цена и nutritional footer имеют класс. Контракт требует tabular-nums для всех расчётных чисел. Применить его к общей области числовых метаданных.
- Размеры tokens составляют14/16/24/32px, веса400/600. Свежий computed style ingredient h3 подтверждает16px/600 на всех четырёх ширинах. Уменьшения основного шрифта ради сетки и ellipsis в проверенных компонентах не обнаружено.

### Pillar 5 — Spacing (3/4)

- **WARNING S1.** `src/features/recipe/RecipePage.tsx:23,47–48` не сбрасывает margin-inline-start у dd. Свежий Chromium computed style во всех четырёх ширинах показывает40px. Значения заметно смещены от подписей на360. Это отсутствующий в шкале spacing, оставленный браузерным стилем. Добавить scoped margin0, сохранить gap16 и проверить длинные числа/unknown-data.
- Основной ритм использует4/8/16/24/32/48/64px. Gutter16/24/32, target44 и primary48 заданы в общих токенах. Arbitrary44px/960px/4:3 — контрактные размеры компонентов и пропорции, сами по себе дефектом не являются.

### Pillar 6 — Experience Design (2/4)

- **WARNING E1, release gate.** `docs/qa/phase03-final-validation.md:228–235`, `03-VALIDATION.md:124–128` сохраняют четыре неуспешных native WebKit keyboard сценария WINDOWS15/16/24/25. Clean-HTML audit указывает на platform anchor traversal, поэтому доказанного нового production defect здесь не объявляется. До целевой native проверки task completion с клавиатуры остаётся неподтверждённым для этой платформы. При воспроизведении на поддерживаемом устройстве это **BLOCKER**.
- **WARNING E2.** UIC12/18/51/52 остаются PARTIAL — длинная ошибка на360, произвольно длинный confirmation и extreme memory-only alert. Добавить адресную проверку этих четырёх состояний на360 и short-height с фокусом над sticky. Исторический обычный long-text pass их не закрывает.
- **WARNING E3.** `docs/qa/phase03-media-review.md` фиксирует52 оригинальных PNG суммарно118.11MiB, каждый примерно2–2.9MB. `RecipeImage.tsx:14` загружает исходник и для96×72card. Контракт допускает исходные PNG при отсутствии разрешённого encoder, поэтому это эксплуатационная рекомендация. При доступном encoder добавить локальные responsive derivatives/srcset, сохранить оригиналы/provenance и повторить media gate. Медленная сеть в свежем аудите не эмулировалась.
- **WARNING E4.** WINDOWS26, UIC24/26/40, human review52изображений и шесть descriptorless prohibitions остаются partial/flagged-unverified. Native Safari15, физические safe-area/touch/keyboard, AT и настоящий200%browserzoom требуют отдельного evidence. `needs_human_review: true`.
- По исходникам покрыты initial loading skeleton, persistent errors, retry-save без нового search, disabled pending mutations, cap12, destructive confirmation и recovery. Прежний critical60pass используется только как существующее evidence. Свежих interaction captures нет.

## Registry audit

`components.json` отсутствует. UI-SPEC задаёт Tool:none и registry:none. Условие проверки сторонних shadcn blocks не выполняется, сторонние blocks не загружались.

## Files Audited

- `AGENTS.md`, `.planning/config.json`
- Phase03 `03-01…03-12-PLAN.md` и `03-01…03-12-SUMMARY.md`
- `03-CONTEXT.md`, `03-UI-SPEC.md`, `03-VALIDATION.md`, `03-SECURITY.md`
- `docs/qa/phase03-final-validation.md`, `phase03-accessibility.md`, `phase03-media-review.md`
- `src/shared/styles/tokens.css`, `src/shared/ui.tsx`, `src/shared/RecipeImage.tsx`
- `src/features/menu/MenuPage.tsx`, `src/features/menu/MealCard.tsx`
- `src/features/recipe/RecipePage.tsx`, `src/features/plan/PlanLoading.tsx`, `src/features/plan/PlanSummary.tsx`
- Свежий `contract360.png`, повторно использованный `03-10-1280-menu.png`
- Актуальные Web Interface Guidelines получены09.11.2026 с `https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md`. Приоритет сохранён за проектным контрактом и Safari15 constraints.

## Итог и следующий шаг

Аудит выявил12 конкретных замечаний C1/C2/V1/V2/CO1/CO2/T1/S1/E1/E2/E3/E4. Три приоритета перечислены выше, остальные9 — дополнительные рекомендации и незакрытые проверки. Изменения приложения в рамках аудита не выполнялись. Фаза03, UAT и восемь shared requirements ожидают приёмки. Следующий шаг — устранить подтверждённые UI-отклонения и пройти адресные native/human gates, сохраняя обязательную Phase03.1 перед04.
