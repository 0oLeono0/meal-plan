---
phase: "3"
slug: "sravnenie-variantov-i-prosmotr-retseptov"
status: draft
shadcn_initialized: false
preset: none
created: "2026-11-04"
---

# Phase 3 — UI Design Contract

Контракт сравнения вариантов и просмотра рецептов для DATA-04, GEN-06, GEN-07, MENU-02, MENU-03, REC-01, REC-02, REC-04. Предписывает будущую реализацию; не является отчётом о выполненных тестах или готовых фото.

Источники: `03-CONTEXT.md` D-01–D-18, релевантные разделы `03-RESEARCH.md`, REQUIREMENTS/ROADMAP Phase 3, первичный frontend PDF §§5.4–5.5/12.1. Визуально просмотрены рендеры макетов с.2–3 в `.tmp/reference-review/Планировщик_питания_—_ключевые_экраны/`; примерные числа не являются данными. Новые решения — auto-defaults по explicit --auto, не ответы человека.

Наследовать `01-UI-SPEC.md`, `02-UI-SPEC.md`, tokens.css, shared/ui.tsx, PlanSummary/PlanLoading и seed fix CR-02. Границы будущих фаз — `03-CONTEXT.md` Phase Boundary: их controls из макетов не переносить.

## Design System

| Property | Value |
|----------|-------|
| Tool | none; существующие ручные CSS tokens, native HTML и Tailwind 3.4.19 |
| Preset | not applicable; принятый выбор Phase 1/2 сохраняется |
| Component library | none; локальные Button, Status, ConfirmDialog, общие PlanSummary/PlanLoading |
| Icon library | none; существующий стиль inline SVG 24×24, stroke 2; без emoji |
| Font | system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; без внешних шрифтов |

Scout2026-11-04: `Test-Path components.json` → False; `Get-ChildItem src/shared -Filter '*.tsx'` → ProductCombobox.tsx, ui.tsx. Прочитаны tokens.css, MenuPage.tsx, ui.tsx, package.json. Gate shadcn: принятую Tool:none сохраняем без повторного опроса/инициализации. Пакетного Component Inventory нет; registry/install не нужны.

## Spacing Scale

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | подпись/значение, внутренний gap badge |
| sm | 8px | метаданные, gap целей, компактная desktop карточка |
| md | 16px | mobile gutter, padding карточки, расстояние карточек |
| lg | 24px | секции, tablet gutter, recipe groups |
| xl | 32px | desktop gutter, разрывы крупных блоков |
| 2xl | 48px | верхний отступ tablet, крупные секции |
| 3xl | 64px | внешние интервалы |

Дополнительных spacing-токенов нет. Размеры компонентов: min target 44×44px, primary min-height 48px, sidebar 240px, radius control 12px/card 20px/pill 9999px, border 1px. Карточки без тени; только modal/popover shadow `0 8px 24px #172B2126`. Кнопки имеют min-height, а не фиксированную высоту: длинный текст увеличивает их высоту.

## Typography

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Label / helper / badge | 14px | 400; badge 600 | 1.5 |
| Body / card title / button / input | 16px | 400; title/button 600 | 1.5 |
| Heading / section | 24px | 600 | 1.2 |
| Display / page title / budget | 32px | 600 | 1.2 |

Ровно4 размера,2 веса400/600, прежние rem-токены. Одна h1, далее h2 день/раздел, h3 слот. Все расчётные числа tabular-nums; ru-RU/RUB/прежние единицы. Полные названия/суммы/шаги переносятся без ellipsis; шрифт ради сетки не уменьшается.

## Color

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | #F4F6F1 | фон приложения |
| Secondary (30%) | #FFFFFF | карточки, disclosure, navigation, action bar |
| Accent (10%) | #1C7C50 | главный CTA покупок, выбранный вариант/день/режим, текущая nav, заполнение бюджетного/target progress |
| Destructive / danger | #B42318 | подтверждение замены набора, текст ошибки/превышения с причиной |

Accent reserved for: главный CTA, выбранный variant/day/mode, текущая nav, заполненные progress. «Пересобрать», настройки и назад — вторичные белые controls. Фото — контент вне60/30/10 UI-поверхностей.

Наследовать text #172B21, muted #53665B, border #718277, selected #E5EFE8, hover #16633F, pressed #124F33, disabled #E1E7E2. Focus2px accent+2px offset, на primary тёмный. Текст≥4.5:1, индикаторы≥3:1; selection/error также текстом/семантикой, disabled также атрибутом.

Meal badges: «Завтрак» #FFF0CE, «Обед» #E5EFE8, «Ужин» #E8E2F5, «Перекус» #E5ECF2; текст #172B21. Это светлые компонентные поверхности, не цвета действий. «Использует запасы» — #172B21 на #E5EFE8.

## Layout and Interaction Contract

### Общая композиция и адаптация

Порядок `/menu`: h1/сохранённые даты/люди → действия → сравнение вариантов → PlanSummary → средние КБЖУ/цель/warnings → режим/дни → блюда/дневные итоги. Один главный sticky CTA покупок. Ошибка операции рядом с инициатором, старый план читаем.

360/390/430: колонка, gutter/gap16px, main max640px. 768–1199: gutter24px/main640px/bottom nav. От1200 sidebar240px; 1200–1279 дневные секции/main960px/gutter32px. Только menu от1280 расширяется на доступную ширину до max1600px с gutter32px; recipe сохраняет960px.

От1280: 1–7 колонок фактических дат×4 строки слотов Завтрак/Обед/Ужин/Перекус, под ними дневные итоги. Строка вмещает самое высокое содержимое, без обрезки; сохранять семантические day sections и day-first DOM. Shared row heights допустимо вычислять батчем после layout, без нового API/dependency; CSS subgrid не требуется. Не терять семантику через display:contents. Это не интерактивный ARIA-grid. На1280 доступно976px после sidebar/gutters: при7 датах/gap8 колонка≈132px, padding8/image сверху/text16/14 с полным переносом. Ни page horizontal scroll, ни scale/shrink font.

DOM/Tab: дата →4 слота→итоги→следующая дата; без положительных tabindex/CSS reorder. При200% zoom сужение viewport возвращает mobile layout. Shrinkable children min-width:0/overflow-wrap:anywhere; высота растёт, overflow не маскируется глобальным hidden.

### Варианты, цена и пересборка

| Состояние / действие | Контракт |
|---------------------|----------|
| Начальный набор | Цель3 действительно различных допустимых вариантов; один активный. Отличие определяется назначениями recipeId/порций по дате/слоту, а не заголовком, картинкой или seed. Различимость проверяет domain, UI не создаёт фиктивные варианты |
| Сравнение | Заголовок «Вариант {activeIndex} из {count}». Ниже все варианты доступны сразу вертикальным compact list: «Вариант N», «Купить: ≈ {purchase}», один период/семья. На768+ list может быть2–3 колонки, с переносом. Активный имеет текст «Выбран» и aria-pressed=true на кнопке выбора. Стоимости ингредиентов/запасов активного остаются в PlanSummary; подпись сравнения явно определяет семейную закупочную базу |
| Стрелки | Named buttons «Предыдущий вариант»/«Следующий вариант», min44. Переход выбирает и сохраняет соседний вариант; в начале/конце соответствующая стрелка disabled, без циклического перехода. При одном варианте обе disabled, карточка единственного остаётся полноценной |
| Выбор варианта | До подтверждения адаптера прежние menu/shopping/recipe и «Выбран» остаются прежними. Requested row имеет status «Сохраняем выбор…», повторное изменение набора disabled на время сохранения. После успешной записи атомарно сменить активный вариант и связанные расчёты; оставить выбранные day/mode при том же периоде. Фокус остаётся инициатору, success объявляется одной полной status-фразой |
| Мало вариантов | При1–2 реальных вариантах точная строка «Найдено N из 3 вариантов» и пояснение Copywriting. Старое сохранение Phase2 с одним вариантом само по себе не означает новый поиск с нехваткой: «В сохранённом наборе 1 вариант» без выдуманного результата поиска |
| «Пересобрать» | Использует applied settings и даты текущего набора. Добавляет ровно1 новый уникальный вариант, сохраняет все предыдущие; после успешной записи новый становится активным (auto-default). Не применяется несохранённый draft. На протяжении поиска старый menu читается, actions изменяющие набор disabled, «Отмена» доступна |
| Pending | Inline notice с indeterminate indicator, aria-busy у области операции; без процентов/таймера обратного отсчёта и выдуманного количества проверок. Deadline30s для всей операции. Не заменять старый menu skeleton: skeleton только при первоначальной загрузке |
| Нет нового результата | Copywriting «Новый вариант не найден»; прежний набор и active неизменны. Нельзя утверждать отсутствие решений только по окончанию bounded search |
| Достигнуто12 | «Пересобрать» disabled с постоянным объяснением и рядом действующая «Создать новый набор». Никакого eviction, фоновой очистки или незаметного сброса. Все12 вариантов доступны и сравнимы |
| «Составить заново» | В раскрытии «Действия с меню» доступны только «Составить заново» и «Изменить настройки». Первое открывает ConfirmDialog; после подтверждения создаёт новый целевой набор с прежними applied settings. Старый набор удаляется из active лишь после успешной записи нового |
| Новые параметры | «Изменить настройки» открывает существующий wizard и сохранный draft без удаления меню. Финальный запуск, который заменит существующий набор, требует того же явного подтверждения; отмена оставляет draft и active. Не подставлять defaults вместо applied/restored значений |

Действия — native details/summary «Действия с меню», без role=menu; раздвигает поток. Навигация Link, операции button.

Прежний guarded controller — единственный active owner. Memory-only candidate отделён persistent notice от saved menu/shopping/recipe. Retry-save не search; quota/error сохраняют bytes/варианты. Cancel/timeout/navigation away исключают позднюю установку/редирект. Старый одновариантный snapshot совместим.

### День, неделя, карточка и расчёты

<1280: группа «Вид меню», buttons aria-pressed «Текущий день»/«Вся неделя»; day=выбранная дата/4 слота, week=все дневные секции вертикально. От1280 полная недельная сетка с подписью «Вся неделя»; прежний mobile mode восстанавливается при сужении, скрытые controls не фокусируются.

Day view: tablist «Дни меню», tabs min44/gap8, на360 wrap4+3; day abbreviation+дата, полное имя с годом. Default сегодня внутри периода, иначе первый. selected=aria-selected/фон; today отдельно «Сегодня»/aria-current=date. Roving Left/Right/Home/End, manual Enter/Space activation; Up/Down скроллят, Tab выходит в labelled panel. Week view не использует tablist, потому что видимы все дни. Основание: [WAI APG Tabs](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/), прочитано2026-11-04.

Presentation query `/menu?view=day|week&day=YYYY-MM-DD` валидируется; invalid→default без изменения applied периода. Возврат восстанавливает mode/day/scroll/card focus; смена варианта того же периода сохраняет день.

Карточка — один Link, без вложенных controls/⋯, accessible name=название/дата/слот. Mobile image96×72px слева, shrinkable content справа; desktop-week image сверху на ширину карточки. Всегда4:3, object-fit:cover/radius12/width+height; карточка растёт, focus-ring вокруг ссылки.

Состав карточки: badge→название→«{minutes} мин · {kcal} ккал»→«≈ {cost} за порцию»→«Порций для семьи: N»→«Использует запасы» только при instance allocated covered>0. Общая подпись «Ккал и стоимость — на одну порцию. Цена ингредиентов до вычета запасов». Hover selected/underline, press прежняя поверхность; ссылка различима без hover.

PlanSummary сохраняет три стоимости, покупки/лимит/остаток, период/семью и provenance. Между альтернативами stock не расходуется; внутри варианта единый ledger date/slot/ingredient order, без двойного покрытия.

Среднее/дневные КБЖУ/семейное disclosure/стоимость дня и target absent/0/строго>+10% наследуются из `02-UI-SPEC.md` §Базовый menu и показатели. Сохраняются все три factual warnings Copywriting; изображения не источник цифр.

### Рецепт, контекст и ингредиенты

URL `/recipe/:recipeId?variant=:variantId&instance=:instanceId&view=day|week&day=YYYY-MM-DD`. Context resolver проверяет три identity вместе по trusted saved active snapshot. Partial/invalid/nonactive/stale identity→context error, без silent direct fallback/variant select. Return принимает только собственные enum/date и `/menu`, без внешнего URL.

Без identity query известный ID→исходный trusted recipe/baseServings, без pantry/menu claims. Unknown ID→notfound; adapter failure→error/retry; pending→skeleton. Не смешивать эти состояния.

Recipe mobile: Link «Назад к меню» в потоке→hero4:3/caption→h1/время/цена/порции→4 КБЖУ→Состав→ингредиенты→ol шагов→источники. От768 header фото/текст=2 равные колонки; от1200 max960. Back44 на белой поверхности, без overlay на фото и будущих controls.

Context: дата/слот, selectedServings семьи; ингредиенты/их цены на все эти порции. Direct: baseServings/исходные ингредиенты. В обоих headline4КБЖУ/цена на одну порцию до вычета stock; явные базы Copywriting. Scaling выполняется ровно один раз.

КБЖУ grid2×2 на360/4колонки когда помещается: Калории/Белки/Жиры/Углеводы с единицами. Native details summary44 «Состав — КБЖУ каждого ингредиента на одну порцию» раскрывает все4 вклада каждого ингредиента на той же базе; mobile rows вертикальны. Enter/Space без переноса фокуса. Pure factual selectors; unknown «Нет подтверждённых данных», не0; missing обязательный факт contextual plan→integrity error.

Ingredient row: полное имя/«Нужно {quantity}»/«Стоимость ингредиента: ≈ {cost}» на подписанное число порций. Context: full→«Есть дома: {covered}», partial→оба covered/purchase и «Частично из запасов», zero→без badge. Unknown/incompatible stock явно не вычтен; direct без pantry. Цена строки полная до вычета, coverage тот же instance ledger, единицы общим formatter без выдуманных conversions.

Шаги trusted snapshot/catalog — ol1…N,16px/1.5/gap16, полный текст. Missing обязательные ingredients/steps→incomplete error. Step photos необязательны, вне52hero scope. В конце фактические sources/catalogVersion и предупреждения.

### Фото и производительность

Обязательны52 разные локальные raster-иллюстрации по production map `03-RESEARCH.md` §Local Media. Included built-in image_gen, отдельный original prompt по составу/шагам каждого рецепта; без runtime API/paid fallback. Sample только rice-sweet-porridge; остальные outputs ещё требуется произвести. Реальная quota/tool failure→сохранить ledger/сообщить blocker, не считать placeholders выполнением.

Paths/manifest: `03-RESEARCH.md` §Execution method; proposed `public/recipes/<recipeId>.png`, compiled sidecar, `docs/data/recipe-media.json`. Key catalogVersion+recipeId, вне factual catalog/trust equality/localStorage. Ledger сохраняет prompt/artifact/time/provider/terms/dimensions/hash/visual review. Не заявлять CC0/исключительность/реальную фотографию блюда.

Подпись Media из Copywriting у карточек и под hero. Hero alt «Фотоиллюстрация: {recipeName}», card alt="" с соседним названием/подписью. Без hotlinks, remote photos и пищевых фактов из картинки.

Loading/error/missing mapping сохраняют4:3. onError один раз даёт нейтральный SVG+«Фото недоступно», без retry loop и потери Link. Это recovery, не закрытие52-asset gate.

Hero/первая видимая card eager, остальные lazy/decoding async, intrinsic width/height. Не загружать52hero сразу. Если доступен разрешённый encoder: WebP320/640/1280 srcset/sizes+PNG fallback; иначе исходные PNG и измерение реального веса/загрузки, без image SDK. Текст/факты доступны независимо от media. Projections derive из одного bundle, без effect-копий сумм/new store/виртуализации28slots.

### Фокус, sticky и доступность

Targets44/gap8/primary48. Link поддерживает Ctrl/Cmd-click. Route→h1 tabindex=-1; возврат→исходная card/scroll/mode/day, если нет→menu h1. Direct back→`/menu`, не unconditional history.back. Browser Back восстанавливает представление.

ConfirmDialog наследует trap/Escape/title-description/возврат фокуса. Initial focus «Оставить варианты»; cancel без записи/удаления. Если инициатор исчез после нового набора→h1.

Shopping sticky над bottom nav(<1200), внизу main desktop; white/border-top/padding16/safe-area, Link `/shopping`48px. Reserve bottom padding/scroll margins = измеренные bar+nav heights+16, safe-area один раз; последняя строка/focus целиком видимы. При height<500/клавиатуре/zoom-перекрытии bar в поток. Слои0content/9shopping/10nav/100modal/110skip-link.

Один polite status с полной фразой, без фокусирования/дублей. Error persistent с recovery/однократным announcement. Skeleton aria-hidden+busy контейнер. Disabled имеет постоянное объяснение; summary scroll-margin сохраняет прежнее исправление native focus.

Сохранить100vh fallback/safe-area/reduced-motion, transition120ms color/background/opacity. Без inert/showModal/subgrid/toSorted/new WebAPI без Safari15 проверки; randomUUID с прежним fallback. Build target не полифил. Windows WebKit не доказывает nativeSafari15/AT/touch.

## Copywriting Contract

Все подстановки — данные подтверждённого snapshot/операции; ₽ formatter не дублируется. Формы «1 вариант / 2 варианта / 5 вариантов», «1 товар / 2 товара / 5 товаров», «1 порция / 2 порции / 5 порций» общим ru formatter.

| Element / условие | Copy / действия |
|------------------|-----------------|
| Primary CTA | «Список покупок · {itemCountLabel}» |
| Menu header | «Меню на неделю» для7, иначе «Меню на {periodLabel}»; даты и «На {peopleLabel}» |
| Compare | «Вариант {N} из {M}»; «Купить: ≈ {purchase}»; «Оценка дополнительных покупок для всей семьи на {periodLabel}»; active «Выбран» |
| Shortage | «Найдено N из 3 вариантов»; «Показаны найденные допустимые варианты. Ограниченный поиск не доказывает, что других вариантов нет» |
| Legacy one | «В сохранённом наборе 1 вариант. Пересоберите меню, чтобы найти ещё один» |
| Append / pending | «Пересобрать» → «Ищем новый вариант…»; «Используем применённые настройки и даты этого меню»; «Отмена» |
| Saving / saved | «Сохраняем выбор…» / «Сохраняем новый вариант…»; после подтверждения «Выбран вариант N из M» / «Новый вариант добавлен и выбран. В наборе M вариантов» |
| No new unique | «Новый вариант не найден»; «За отведённый поиск не удалось найти ещё один допустимый вариант. Прежние варианты сохранены»; «Повторить» / «Изменить настройки» |
| Cap12 | «В наборе 12 вариантов — это предел хранения на этом устройстве. Чтобы продолжить подбор, создайте новый набор»; «Создать новый набор» |
| New-set destructive confirmation | «Создать новый набор меню?»; «После успешного сохранения нового набора прежние {countLabel} будут заменены. До этого текущее меню останется доступным»; «Оставить варианты» / «Создать новый набор» |
| Changed-parameters confirmation | «Составить меню с новыми настройками?»; «После успешного сохранения новое меню заменит прежний набор вариантов. Черновик настроек сохранится» только при подтверждённом draft save, иначе без последнего предложения; «Оставить варианты» / «Составить меню» |
| Select save failure | «Не удалось сохранить выбор варианта»; «Активным осталось прежнее меню. Повторите сохранение»; «Повторить сохранение» / «Оставить текущее меню» |
| Candidate memory-only | «Новый вариант рассчитан, но не сохранён» (new-set: «Новый набор рассчитан, но не сохранён»); «Результат доступен только до закрытия страницы. Прежнее меню не изменено»; «Повторить сохранение» / «Оставить текущее меню» |
| Timeout | «Не удалось найти новый вариант за 30 секунд. Прежнее меню не изменено»; «Повторить» / «Изменить настройки» |
| Cancel | «Подбор отменён. Прежнее меню не изменено» |
| Other operation errors | «Не получилось пересобрать меню»; «Прежнее меню не изменено. Повторите подбор или измените настройки»; «Повторить» / «Изменить настройки». Proven budget/data/safety/search причины сохраняют конкретные тексты02-UI-SPEC, не скрываются общей ошибкой |
| Empty menu | «Меню пока нет»; «Начните с настроек питания»; «Составить меню» |
| Menu load / corruption | «Загружаем меню…»; «Не удалось загрузить меню» либо «Сохранённое меню повреждено или несовместимо с текущей версией»; «Исходная запись не изменена. Повторите загрузку или составьте новое меню»; «Повторить загрузку» / «К настройкам» |
| Recipe load / error | «Загружаем рецепт…»; «Не удалось загрузить рецепт. Повторите загрузку или вернитесь к меню»; «Повторить загрузку» / «К меню» |
| Recipe notfound | «Такого рецепта нет»; «Проверьте ссылку или выберите блюдо в меню»; «К меню» |
| Recipe stale / invalid identity | «Этот рецепт больше не связан с текущим меню»; «Вариант или блюдо по этой ссылке недоступны. Откройте рецепт из актуального меню»; «К актуальному меню» |
| Recipe incomplete | «Не удалось показать состав рецепта»; «В данных рецепта не хватает обязательной информации. Повторите загрузку или вернитесь к меню»; «Повторить загрузку» / «К меню» |
| Recipe basis | Context: «Порций для семьи: N»; direct: «Исходный рецепт · {servingsLabel}»; «Ингредиенты указаны на {servingsLabel}. КБЖУ и цена — на одну порцию» |
| Stock partial / full | «Частично из запасов»; «Нужно {required} · Из запасов {covered} · Докупить {purchase}» / «Есть дома: {covered}» |
| Stock unknown | «Количество запаса не указано — запас не вычтен» / «Единицы запаса и потребности несовместимы — запас не вычтен» |
| Media | «Фотоиллюстрация создана с помощью ИИ; внешний вид блюда может отличаться»; fallback «Фото недоступно» |
| Persistent factual warnings | «Цены ориентировочные, проверяйте в магазине»; «Текущий каталог ограничен растительными рецептами. Расчёт не подтверждает полноценность рациона»; «КБЖУ рассчитаны по составу продуктов и не являются медицинской рекомендацией» |

Все failure notices постоянны до recovery/dismiss и не исчезают таймером. «Прежнее меню не изменено» показывается только когда оно существует. Успех/сохранность заявлять только после подтверждения адаптера. Изменение day/mode не требует сохранения набора и не даёт сообщения «Меню сохранено».

## UI Considerations

Applicable state considerations resolved: 8 категорий, 0 backstop, 0 unresolved; explicit contract ниже покрывает применимые элементы. «covered» означает определённое поведение, не выполненную проверку.

| Category | Element(s) | Status | Resolution / Reason |
|----------|------------|--------|---------------------|
| empty | variant list, menu list, media | ✅ covered | Нет плана → Empty menu;0 найденных не заменяет старый план, сохраняет typed failure; отсутствующее media → Media fallback, production gate отдельно.0 обязательных ingredient/steps → Recipe incomplete, не пустой рецепт |
| loading | variants, recipe, media, nav, interactive-control | ✅ covered | Первое чтение → skeleton+busy/status; append/select/save отдельны, старый saved menu доступен; duplicate mutation disabled, cancel доступен для поиска; media резервирует4:3. Локальные day/mode переходы без fake loading |
| error | variant operations, menu/recipe load, media, controls | ✅ covered | Ошибка чтения/записи/30s/corrupt/stale/notfound различима и имеет конкретный recovery из Copywriting. Old bytes/active не подменяются, retry-save не search; media failure не закрывает текст/Link |
| populated | variant/day/meal/ingredient lists, media | ✅ covered |3 целевых варианта,1–7 дат×4 слота, полная карточка, recipe ingredients/четыре метрики/steps,52 local media согласно production mapping |
| partial | variants, ingredient list, snapshot | ✅ covered |1–2 найденных имеют точный shortage; partial stock показывает covered+purchase по instance, unknown не0. Неполный identity → stale/error; неполные обязательные факты → invalid, не незаметный direct fallback |
| overflow | variants, nav, day cards, static-content | ✅ covered |12 вариантов доступны wrap/vertical list;4+3 day tabs на360; desktop actual dates не расширяют страницу; reserved action/nav heights сохраняют последнюю строку и focus. Нет clipped totals/steps/ingredients |
| zero-one-many | variant/day/ingredient lists | ✅ covered |0/1/2/3/12 вариантов,1/7 дат, repeated recipe instances различаются по date/slot;1 вариант не циклическая стрелка,12 без eviction; единичный ингредиент/шаг полноценен, пустой обязательный набор → incomplete |
| long-text | controls, recipe/card titles, ingredients, static-content, nav | ✅ covered |Полные русские названия/ошибки/источники/крупные суммы переносятся; min-width0, без ellipsis и мелкого font. Buttons растут; на200% zoom и всех target widths доступен весь контент/focus |

### Проверяемые точки приёмки

1. Реальный start→3 уникальных допустимых варианта; выдача2/1/0 без клонов/ослабления gates; legacy single совместим; comparison/menu/shopping цены совпадают.
2. Select→ack→menu/shopping/recipe→reload сохраняет набор/active. До ack и при quota/error старые bytes/цифры; memory-only retry без search; late/cancel/races не применяются.
3. Append+1 сохраняет прежние; no-result/30s/cancel без потери. Cap12 без eviction; confirm cancel/failure сохраняют12, success заменяет после save. Draft editing не меняет active.
4. 360/390/430/768/1280 и границы1199/1200/1279: фактические1–7 дат, today/selected,4слота, day/week/back, длинные тексты/суммы/200% zoom без page overflow.
5. Повторённый recipeId→правильный instance. Direct/base, unknown, partial/invalid/stale/nonactive/error различимы; back focus/scroll восстанавливаются.
6. Независимые numeric oracles family quantities/cost и per-portion4nutrients/composition/stock:500required−200stock=300purchase, те же200 не обещаны следующему instance. Unknown не0; прежние three-cost/target/warnings сохранны.
7. 52IDs→52 уникальных local raster4:3, provenance/hash/visual review всех52/offline loads. Missing/error src→fallback без loop/CLS/потери Link. Fallback не закрывает media gate.
8. Keyboard/day arrows/Home/End/details/modal trap-Escape-return/status/outline и последняя строка над sticky при small-height/safe-area/zoom. Automated geometry/ARIA отдельно от nativeSafari15/AT/touch/human UAT.

Execution: relevant Vitest/Playwright, typecheck/lint/build и CR-02 regression; результаты ещё не заявлены. Применены локальные UI UX Pro Max/Vercel derived-state-storage rules и [Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md), прочитанные2026-11-04, с приоритетом project/Safari15 constraints.

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| none | none | not applicable — Tool:none, third-party registry/blocks не объявлены и не загружались |

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS
- [ ] Dimension 7 Inventory Provenance: PASS

**Approval:** pending; draft до checker. Pre-populated:18 auto-context решений,8 requirements, прежние01/02 tokens/components; новых ответов пользователя0.52-media production/права/human UAT/nativeSafari15/AT проверяются отдельно в execution.
