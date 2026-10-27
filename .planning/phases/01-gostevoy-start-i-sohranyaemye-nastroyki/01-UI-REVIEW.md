# Phase 1 — UI Review

**Audited:** 2026-10-27
**Baseline:** approved `01-UI-SPEC.md`, amended D-10/C-04; PDF pages 1/4/6 as supplementary references.
**Screenshots:** существующие CLI/QA captures фактически просмотрены; новые не сняты — localhost:3000/5173/8080 не ответили при проверке аудитором.
**Interaction captures:** off (workflow.ui_interaction_capture отсутствует). Существующие post-interaction QA screenshots использованы как отдельное evidence; CLI interaction-capture этим аудитом не запускался.

Scope: гостевой каркас и сохраняемый мастер Phase 1. Генерация, покупки, глобальный склад и калькулятор NEXT-10 не оцениваются как отсутствующие функции этой фазы. Системный шрифт разрешён контрактом. Аудит не является pixel-perfect или человеческой приёмкой.

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 3/4 | Понятные русские состояния; несколько подписей расходятся с утверждённым словарём |
| 2. Visuals | 2/4 | Бюджет не становится главным акцентом; подписи выбора смещены относительно controls |
| 3. Color | 3/4 | Семантическая палитра соблюдена, но шаг 1 сохраняет системные синие radio |
| 4. Typography | 2/4 | Display-токен не применяется к бюджету; label 600 вместо договорённых 400 |
| 5. Spacing | 2/4 | CSS specificity ломает плотность choice-строк; встречаются интервалы вне шкалы |
| 6. Experience Design | 3/4 | Основные состояния предусмотрены; mobile primary занимает половину footer |

**Overall: 15/24**

BLOCKER, доказанно прерывающий задачу текущей фазы, не найден. Все ниже — WARNING; результат не заменяет открытые human gates.

## Top 3 Priority Fixes

1. **Исправить общие стили choice-label** — radio/checkbox визуально оторваны от подписи, формы требуют лишней прокрутки — отделить обычные field labels от choice labels; последним явно задать flex, align-items:center, gap:8px, margin:0, сохранить target ≥44px и проверить шаги 1–4.
2. **Вернуть крупную точную сумму бюджета** — главное финансовое значение визуально слабее заголовка и пояснений — применить display 32px/600/tabular-nums к редактируемой сумме с видимым ₽, сохранив raw input, валидацию и правдивую связь slider/поле.
3. **Дать mobile primary полную ширину** — текущая двухколоночная панель сжимает «Проверить настройки» — на телефоне расположить основной CTA отдельной строкой полной ширины, вторичный «Назад» отдельно; сохранить измерение высоты footer и проверить фокус/200% текст.

## Detailed Findings

### Pillar 1: Copywriting (3/4)

- **WARNING C1:** `src/features/wizard/HomeProductsStep.tsx:21` использует «Добавить домашний продукт» вместо контрактного label «Найти продукт»; выбор результата добавляет сразу, отдельного «Добавить продукт» нет. Текущий сценарий работоспособен, но label не объясняет поиск так прямо. Согласовать одну модель и словарь в коде/контракте, предпочтительно вернуть «Найти продукт».
- **WARNING C2:** `src/features/wizard/PeopleStep.tsx:39` использует «Поддерживать вес / Снизить вес / Набрать вес», а сводка `HomeProductsStep.tsx:74` и контракт — «Поддержание веса / Похудение / Набор массы». Значения не потеряны, но названия одной настройки меняются между экраном и сводкой. Использовать общий словарь.
- Положительное evidence: `App.tsx:144–158,169–171` честно различает ошибку хранения, пустые/неизвестные маршруты; `NutritionFields.tsx:18–21` отличает отсутствие, ошибку и ручное происхождение. Техническая оговорка `HomeProductsStep.tsx:63` честна для этапа; перед полноценным запуском заменить термин «глобальные запасы» на пользовательское объяснение по scope будущей фазы.

### Pillar 2: Visuals (2/4)

- **WARNING V1:** `BudgetStep.tsx:17–18`, `tokens.css:64–65,103` — сумма 1050 показана обычным 16px input без видимого ₽ рядом. Контракт требует крупной точной суммы как focal point; PDF page-1 показывает отчётливый крупный бюджет. Подтверждено `chromium-360-step2.png` и `chromium-1280-step2.png`. Исправление — priority 2.
- **WARNING V2:** `tokens.css:102` имеет большую специфичность, чем utility `.flex`/`.m-0` в `BudgetStep.tsx:29,38`, `PeopleStep.tsx:28,39`, `HomeProductsStep.tsx:48`. Поэтому label остаётся block с нижним margin, а текст рисуется ниже radio/checkbox. Это видно на 390-step1, 360/1280-step2 и 768-step4. Исправление — priority 1. Вертикальный список сам по себе допустим; дефект — фактическое выравнивание и плотность, а не требование переделать всё в макетные чипы.
- Общая основа сохранена: спокойный canvas, белые округлые группы, зелёный основной CTA, один h1. PDF page-4/6 показывает будущие shopping/pantry; требовать их наполнения от Phase 1 некорректно.

### Pillar 3: Color (3/4)

- **WARNING CO1:** `PeopleStep.tsx:29,40` не задаёт accent-color; в реально просмотренном `chromium-390-step1.png` выбранные люди/цель синие. Остальные выборы используют зелёный accent (`BudgetStep.tsx:21,30,39`, `ExclusionsStep.tsx:13`, `HomeProductsStep.tsx:48`). Задать общий accent-color native controls через semantic token.
- `tokens.css:4–16` содержит согласованные canvas/surface/accent/danger/text/muted/border/selected/hover/pressed/disabled. По коду accent назначен действиям, навигации, progress и native выборам, декоративного массового overuse не обнаружено. На просмотренных кадрах доминируют светлый фон и белые поверхности; точное площадное 60/30/10 не измерялось и не объявляется выполненным. Полный contrast review остаётся human/backstop, не выдуманный pass.

### Pillar 4: Typography (2/4)

- **WARNING T1:** display 32px/600 определён (`tokens.css:27,57`), но применяется к h1, а бюджет остаётся body (`BudgetStep.tsx:18`). Нарушена роль Display / budget контракта, см. V1.
- **WARNING T2:** `tokens.css:102` задаёт всем label 14px/600, хотя контракт Label/helper = 14px/400. В результате почти весь текст вариантов полужирный, различие между подписью, вариантом и заголовком слабее. Разделить field label/choice text, использовать 400 по контракту.
- Проверка определений: четыре размера 14/16/24/32 и два явно заданных веса 400/600; новых шрифтов не загружается. Системный шрифт соответствует контракту и не является нарушением PDF. Browser-default bold/fieldset оформление следует нормализовать в рамках тех же токенов, не вводя новые размеры.

### Pillar 5: Spacing (2/4)

- **WARNING S1:** тот же specificity conflict `tokens.css:102` побеждает `.m-0` choice labels, добавляя 16px margin сверх `gap-2` и нарушая задуманный ритм 44px строк (`BudgetStep.tsx:28–40`). На 1280 шаг 2 вытянут примерно на 1700px full-page при коротком наборе настроек. Устранить источник и повторно оценить плотность, сохраняя читаемость и touch targets.
- **WARNING S2:** 12px spacing отсутствует в утверждённой шкале 4/8/16/24/32/48/64, но используется в `tokens.css:73,112,122,137` и `ProductCombobox.tsx:62` (`p-3`); `HomeProductsStep.tsx:79` добавляет `pl-5` (20px). Размер target 44px и radius 12px — разрешённые компонентные размеры, не эти интервалы. Привести padding к шкале либо явно документировать обоснованное компонентное исключение.
- Geometry max-width 640, gutters 16/24 и desktop breakpoint 1200 заданы в `tokens.css:50–54,129–139`; просмотренные 360/390/768/1280 кадры не показывают горизонтального расширения страницы. Full-page screenshot sticky-панели не доказывает постоянное перекрытие: из такого кадра blocker не выводится.

### Pillar 6: Experience Design (3/4)

- **WARNING E1:** `Wizard.tsx:96` безусловно использует `grid-cols-2`, поэтому mobile primary имеет половину ширины. Контракт требует mobile primary на всю ширину. Видно в 360-step2/390-step1; длинный финальный CTA особенно чувствителен к увеличению текста. Исправление — priority 3.
- Положительное code evidence: step/error focus (`Wizard.tsx:25–31,64–73`), фактическое измерение footer (`32–39`), сохранение raw draft и статусы (`App.tsx:82–117,145–147`), search loading/empty/error/retry (`ProductCombobox.tsx:65–66`), undo 5s (`71–82`), confirm trap/Escape/возврат (`shared/ui.tsx:39–74`), reduced motion (`tokens.css:142`). Наличие кода не объявляется полным screen-reader pass.
- Источник выполненных browser checks — `docs/qa/phase01.md` и существующие QA logs, не новый прогон аудитора: ранее Chromium/Firefox 112+112 до focus fix; после — 70 navigation/storage/accessibility; финальный WebKit 112. Наборы не суммируются в фиктивный полный повтор. Аудитор suites не перезапускал.
- Реальное iOS/клавиатура/safe-area, исторический Safari 15, native browser zoom, screen reader, полный contrast review, визуальное одобрение, двухвкладочный UX и LCP остаются непроверенными. CSS 200% text и desktop WebKit не подменяют эти проверки. Перенос NEXT-10 подтверждён; fake generation не требуется.

## Evidence and Capture Safety

Просмотрены через `view_image`: `.tmp/phase01-qa/chromium-360-step2.png`, `chromium-390-step1.png`, `chromium-768-step4.png`, `chromium-1280-step2.png`; `.tmp/reference-review/Планировщик_питания_—_ключевые_экраны/page-{1,4,6}.png`. `git check-ignore` подтвердил игнорирование существующего QA PNG. Аудит не создавал screenshots или interaction snapshots; поэтому capture gate не применялся к новым файлам. Ownership ограничен этим отчётом.

Registry audit: `components.json` отсутствует; shadcn/third-party registry audit неприменим.

Web Design Guidelines получены 2026-10-27 из [официального источника](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md); применены требования к label/focus/state/target. UI UX Pro Max использован как вспомогательная проверка согласованности; действующий контракт и scope имеют приоритет.

## Files Audited

- `AGENTS.md`, `.planning/config.json`
- `01-UI-SPEC.md`, `01-CONTEXT.md`, `01-08-SUMMARY.md`
- `docs/qa/phase01.md`
- `src/app/App.tsx`
- `src/shared/styles/tokens.css`, `src/shared/ui.tsx`, `src/shared/ProductCombobox.tsx`
- `src/features/wizard/{Wizard,PeopleStep,BudgetStep,ExclusionsStep,HomeProductsStep,NutritionFields}.tsx`
- Перечисленные выше фактически открытые QA/PDF PNG.

Recommendation count: 3 priority fixes; 5 дополнительных рекомендаций (C1, C2, CO1, T2, S2). V1/T1 и V2/S1 — разные аспекты тех же исправлений, не искусственно увеличенное число задач.

## Remediation — 2026-10-27

Исправление `6ebde75` выполнено после аудита. Исходные findings и 15/24 выше сохранены как историческая baseline; новые баллы не выставлялись. Это targeted remediation, не повтор всей приёмки фазы.

| Finding | Disposition | Реальное изменение / evidence |
|---|---|---|
| V2 / S1, priority 1 | fixed | Choice-label имеет явные flex/center/gap 8px/margin 0/min-height 44px; у целей добавлен gap 8px между строками. Browser computed styles проверены на шагах 1–4 при 360/390/768/1280. |
| V1 / T1, priority 2 | fixed | Редактируемое поле бюджета — 32px/600/tabular-nums, рядом виден ₽. Raw input и truthful slider aria не менялись; проверены пробелы, 1050→1100, длинное значение и невалидная частичная строка. |
| E1, priority 3 | fixed | До 768px CTA занимает отдельную полную строку; с 768px остаются две колонки. ResizeObserver сохраняет реальную высоту footer; блок поля теперь учитывает эту высоту в scroll-margin-bottom, чтобы ошибка не уходила за увеличенную панель. |
| CO1 | fixed | Общий semantic accent-color для native radio/checkbox/range; выбранные controls шага 1 зелёные в новых screenshots. Это не полный contrast pass. |
| T2 | fixed | Label/choice text 14px/400, legend 600; четыре размера и два веса сохранены. |
| S2 | fixed | Padding 12px заменён на интервалы шкалы 8/16px; listbox p-4, review list pl-4. Разрешённый radius 12px сохранён. Targets остаются ≥44px, primary ≥48px. |
| C2 | fixed | PeopleStep и DraftReview используют общий presentation-словарь goalLabels: «Поддержание веса / Похудение / Набор массы»; persisted IDs прежние. |
| C1 | partially fixed; interaction finding remains | Label возвращён к «Найти продукт». Выбор результата по-прежнему сразу добавляет product ID. Отдельная кнопка «Добавить продукт» не введена: это изменение interaction вне presentation fix. Контракт не переписан, waiver/принятие расхождения не заявлены. |

### Verification evidence

- RED до исправления: три browser tests 360px упали на фактических `block` вместо `flex`, 16px вместо 32px, CTA 144px вместо доступных 296px. После исправления эти три прошли; итоговый contract набор — 12 cases по четырём ширинам.
- Chromium broad targeted run: 69 cases, **68 passed / 1 failed**. Единственный failure — длинная ошибка бюджета на 360px при CSS text 200%: низ 640.39px за верхом footer 620px. Добавлен scroll-margin блока поля на измеренную высоту footer +16px. После этого затронутый набор **23/23 passed** (31.1s); результат не выдаётся за полный повтор всех 69.
- На окончательном коде WebKit 27.2: **47/47 passed** (1.6min): все presentation/accessibility, exact budget и overflow, критические wizard navigation/persistence cases. Chromium 156.0.8078.4. Полные три браузерных набора повторно не запускались; исходные проверки до remediation остаются отдельной историей.
- На окончательном коде unit **134/134**, typecheck/lint/build **exit 0**; git diff --check passed. Новых зависимостей, endpoints, финансовых/пищевых правил нет.
- Фактически открыты новые `.tmp/phase01-qa/chromium-{360-step2,390-step1,768-step4,1280-step2}.png` и PDF reference pages 1/6. Сумма стала визуальным акцентом, подписи идут рядом с controls, мобильные кнопки в отдельных полных строках. Системный шрифт, вертикальные списки и explanatory copy сохранены по scope. Pixel-perfect/визуальное одобрение человека не заявляются. PNG остаются gitignored, использованы только локальные тестовые данные.

Для смещений прокрутки сверена документация [MDN scroll-padding-bottom](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/scroll-padding-bottom); реализация использует уже измеренную высоту footer в scroll-margin блока, без новых API/состояния. Все прежние human_needed (реальные iOS keyboard/safe-area, исторический Safari15, native browser zoom, screen reader/полный contrast, визуальная приёмка, LCP и UX backstops) остаются открыты. Phase 1 не объявлена complete, Phase 2 не запускалась.
