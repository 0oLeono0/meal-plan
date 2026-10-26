---
phase: "1"
slug: "gostevoy-start-i-sohranyaemye-nastroyki"
status: approved
reviewed_at: "2026-10-26T06:32:59Z"
shadcn_initialized: false
preset: none
created: "2026-10-26"
---

# Phase 1 — UI Design Contract

Контракт гостевого каркаса и сохраняемого мастера; реализация приложения не начата. Основание: REQUIREMENTS (12 ID Phase 1), ROADMAP Phase 1, 01-CONTEXT D-01…D-17, 01-RESEARCH и PRD §4–5.2/12. Первичен подробный frontend-источник; дни на шаге 1, несмотря на PDF-макет. Все новые значения ниже — обратимые **auto-предложения**, а не утверждённые исходником токены или новый бренд.
Визуально просмотрены `.tmp/reference-review/Планировщик_питания_—_ключевые_экраны/page-{1,4,6}.png`: тёплый светлый фон, белые округлые карточки, зелёные действия, крупный бюджет, спокойная иерархия. Персонаж, собственный продукт и рекомендации из макета не входят в эту фазу. Использован ui-ux-pro-max; локальный поиск `python .agents/skills/ui-ux-pro-max/scripts/search.py 'focus not obscured' --domain ux` подтвердил применимость смещений sticky UI; новые библиотеки/API не исследовались.

## Design System

| Property | Value |
|----------|-------|
| Tool | none; ручные общие токены и native HTML, Tailwind 3.4 по RESEARCH |
| Preset | not applicable; shadcn не выбран, инициализация запрещена рамками preflight |
| Component library | none; переиспользуемые проектные компоненты будут созданы при исполнении |
| Icon library | none; согласованные простые SVG 24×24, stroke 2, рядом с текстом aria-hidden; emoji не использовать |
| Font | auto: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; кириллица, без загрузки шрифта |

Проверено `rg --files -g components.json -g 'tailwind.config.*' -g 'postcss.config.*' -g '*.css' -g '*.tsx' -g package.json`: соответствующих файлов нет. Установленного design system нет; Component Inventory неприменим. Ничего не устанавливать. Предлагаемые примитивы: Button, Field+Hint+Error, Stepper, Range, ChoiceGroup, Tag, ProductCombobox, PantryDraftRow, Progress, Card, Status, EmptyState, ConfirmDialog, BottomNav/SideNav. Это план, не заявление о существующих exports.

## Spacing Scale

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | иконка/короткая подпись |
| sm | 8px | чипы, связанные действия |
| md | 16px | поля, mobile gutter и padding карточки |
| lg | 24px | секции, tablet gutter/padding |
| xl | 32px | desktop gutter, блоки |
| 2xl | 48px | основные разрывы секций |
| 3xl | 64px | крупные внешние интервалы |

Исключения: нет дополнительных spacing-токенов; размеры целей 44×44 и primary height 48 — компонентные размеры. Auto: radius field/button 12, card 20, pill 9999; border 1px; shadow card none, overlay `0 8px 24px #172B2126`. Не оборачивать каждый текст отдельной карточкой: карточки группируют бюджет, время/разнообразие, данные пользователя.

## Typography

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Label / helper | 14px | 400 | 1.5 |
| Body / input / button | 16px | 400 / 600 | 1.5 |
| Heading / section | 24px | 600 | 1.2 |
| Display / budget | 32px | 600 | 1.2 |

Ровно 4 размера и 2 веса (400, 600); не добавлять 500/700. Все поля минимум 16px, label постоянный, бюджет tabular-nums. Heading уровня h1 один на экран, порядок заголовков последовательный. Цены через ru-RU formatter: `3 000 ₽`; единицы г/кг/мл/л/шт. В длинных суммах input прокручивает собственное значение, страница не расширяется.

## Color

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | #F4F6F1 | спокойный фон страницы |
| Secondary (30%) | #FFFFFF | карточки, нижняя/боковая панель, поля |
| Accent (10%) | #1C7C50 | primary CTA, выбранные чипы/сегменты, текущая вкладка, заполненный прогресс и range, включённый переключатель |
| Destructive | #B42318 | подтверждаемое удаление/сброс; тот же semantic danger для текста ошибки, без декоративного красного |

Accent reserved for: перечисленные шесть ролей; обычные тексты/вторичные кнопки нейтральные. Auto: text #172B21, muted #53665B, control-border #718277, selected-tint #E5EFE8, hover #16633F, pressed #124F33, disabled-bg #E1E7E2 + disabled-text #53665B. White на accent и текстовые пары должны проходить AA 4.5:1; границы/индикаторы 3:1. Выбор отмечать также check/pressed-state, ошибку — текстом. Focus outline 2px #1C7C50 с белым offset 2px; в зелёной зоне тёмный outline #172B21. Значения задаются CSS variables и theme.extend, без Tailwind 4 @theme.

## Layout and Interaction Contract

Auto geometry: одна колонка 360/390/430; до 767 padding 16; 768–1199 padding 24, мастер max-width 640 по центру; ≥1200 sidebar 240 и content max-width 960, мастер остаётся отдельным fullscreen max-width 640. Проверять также 1199/1200. На 768 сохраняется нижняя навигация; источник меняет её только на 1200.
Навигация: «Меню», «Покупки», «Дома», «Профиль», SVG+подпись, текущая aria-current=page; отдельное «+ Новое меню». Auto профиль — доступный поясняющий диалог: возврат в меню явной кнопкой и закрытие обратно к инициатору. В мастере и `/plan/generating` нижней/боковой панели нет. `/` redirect только при валидном существующем плане через контракт RESEARCH.
Все target ≥44×44, между отдельными целями 8px, mobile primary ≥48px и на всю ширину. Footer sticky с padding 16 + env(safe-area-inset-bottom); высота учитывает перенос текста. Контент резервирует фактическую высоту footer/nav +16; scroll-padding/scroll-margin сохраняют целиком поле, ошибку и focus видимыми. При виртуальной клавиатуре action-панель переходит в поток, если иначе закрывает ввод; 100vh fallback и safe-area, без обязательной зависимости от dvh/inert. Нельзя скрывать overflow страницы для маскировки дефекта.
Шаги: «Для кого» → «Бюджет и время» → «Ограничения» → «Что есть дома»; «Шаг N из 4» + 4 сегмента и текстовое accessible progress. «Назад» сохраняет ввод; «Далее» валидирует только текущий шаг, фокусирует первое неверное поле, aria-invalid и aria-describedby ссылаются на его ошибку. Route/step change фокусирует h1; повтор ошибки не очищает ввод. Не вызывать submit при добавлении тега Enter.
Шаг 1: люди 1–10 (1/2/4+, 4+→4 и далее +), дни 1–7, цели «Поддержание веса»/«Похудение»/«Набор массы». Дефолты D-06: 2/7/поддержание; восстановленный draft приоритетнее. Группы оформлять fieldset/legend с native radio, ограничения — checkbox; стрелки/Space работают нативно. Степперы имеют имена «Уменьшить число людей»/«Увеличить число людей» и аналогично дням, на границах disabled.
Шаг 2: бюджет D-07 целые безопасные рубли ≥500, ручного максимума 15 000 нет. Native range min=1000 max=15000 step=100; auto projection = ближайшая сотня с округлением половины вверх и clamp к диапазону. Поле 500→thumb 1000, 1050→1100, 20000→15000; ручное поле остаётся 500/1050/20000, подпись «Точная сумма введена вручную». aria-valuenow/value — реальное thumb-значение; aria-valuetext «Ползунок: 1 100 рублей. Точная сумма в поле: 1 050 рублей». При точном совпадении лишнюю оговорку убрать. Движение range выбирает его сумму, снимает пометку; клавиатурные стрелки меняют на 100. При невалидном поле пометить его ошибкой, подсказку не считать, range явно описать как отдельный выбор суммы, не объявлять невалидный ввод суммой.
Подпись D-05: 7 дней «Бюджет на неделю», иначе «Бюджет на N дней» (для 1: «Бюджет на 1 день»); подсказка `≈ round(budget / people / days) ₽ на человека в день` только для валидных аргументов. Auto rounding подсказки до целого ₽ — представление, исходную сумму не округляет. Смена дней/людей сумму не меняет. Время «до 15 мин»/«до 30 мин»/«до 60 мин»/«любое»; разнообразие `same/medium/max` с полными подписями PRD; medium — auto-дефолт CONTEXT, не факт исходника.
Ручная норма на шаге 1: раскрытие «Норма КБЖУ», постоянная база «На человека в день»; ккал, «Белки, г», «Жиры, г», «Углеводы, г». Все пустые = нормы нет; полный набор: ккал>0, Б/Ж/У≥0, конечные значения, origin «Введено вручную»; partial остаётся draft и требует заполнить набор либо очистить его явным действием. Не подставлять 2100/105/70/260, не сравнивать отсутствие с нулём и не выводить медицинских оценок.
**Поправка D-10/C-04, human-confirmed 26.10.2026:** автоматический персональный калькулятор и раскрытие «Рассчитать норму», мини-форма пола/возраста/роста/веса/активности, вычислительный результат/«Использовать» перенесены в P1/NEXT-10. Они не входят в P0-экран и не заменяются фиктивным UI. P0/WIZ-09 — только необязательная ручная цель по абзацу выше; её фактическая приёмка остаётся 01-08. Empty/loading/error/partial калькулятора явно отложены в P1, как и его overflow/long-text. Формулы/средние нормы/medical-input и жёсткость nutrition targets генерации остаются открытой частью Q-03. Record: docs/decisions/nutrition-calculator.json; mapping: nutrition-calculator-amendment.md. Перенос не является выполнением прежней вычислительной части WIZ-09.
Шаг 3: ровно пять ограничений PRD; «Не люблю» — searchable product-ID теги. Combobox: постоянный label, aria-expanded/controls/activedescendant, ↑/↓, Enter выбрать, Escape закрыть; запятая добавляет только распознанный ID. Неизвестный текст не создаёт продукт. Удаление «Удалить [название] из исключений», фокус после удаления на соседний тег/поле. Популярные/результаты не теряют выбранные IDs при переходе.
Шаг 4: label «Найти продукт», кнопка «Добавить продукт», каталожные чипы яйца/курица/помидоры/творог/рис/картофель; строки productId, необязательное количество, совместимая единица, checkbox «Скоро испортится», удаление. Пустое количество = «Количество не указано», никогда 0; известное >0 finite. Дубликат фокусирует существующую строку. На 360 поля/кнопки строки переносятся вертикально; global pantry не изменяется, вычет не имитируется. Удаление строки/тега обратимо тостом «Продукт удалён»/«Исключение удалено», кнопка «Отменить» 5 секунд; фокус и восстановленные значения сохраняются.
Завершение безопасного среза — auto-действие «Проверить настройки» на шаге 4: проверяет все поля и показывает сводку draft с текстом «Настройки подготовлены»; это не применение/генерация. Сохранение обозначать только после реального успеха storage. «Составить меню»/«Пропустить» как запуск WIZ-08 остаются явной точкой интеграции Phase 2; не запускать fake progress и не очищать ограничения/запасы.
Главный визуальный акцент: приветствие — заголовок и CTA «Составить меню»; шаг 1 — выбор людей и дней; шаг 2 — крупная точная сумма бюджета; шаг 3 — группа ограничений; шаг 4 — поиск и список домашних продуктов. Остальные элементы подчинены этим акцентам; один основной CTA на экран.
Storage: до hydrate не включать autosave; исходные частичные строки и шаг восстанавливаются. Recovery запрещает перезапись повреждённого снимка без явного сброса только draft key. Ошибка записи оставляет работающий memory draft и повтор пишет текущую версию. ConfirmDialog: именованный title/description, focus trap, initial focus безопасная отмена, Escape=отмена, возврат инициатору; fallback совместим с Safari 15. Focus order соответствует DOM, skip-link к main; motion 120ms opacity/color, prefers-reduced-motion отключает. Поиск status role=status; error объявлять один раз, без дублирующих live regions.

## Copywriting Contract

| Element | Copy |
|---------|------|
| Welcome / Primary CTA | auto-заголовок «Меню с учётом ваших привычек»; «Выберите бюджет, ограничения и продукты дома»; «Настройки → Меню → Покупки»; CTA «Составить меню» открывает мастер |
| Wizard CTA | «Далее», «Назад»; auto финальный «Проверить настройки» → «Настройки подготовлены» + «Запуск меню будет доступен на следующем этапе» |
| Empty menu / shopping | «Меню пока нет» / «Сначала составьте меню»; тело «Начните с настроек питания»; CTA «Составить меню» |
| Empty pantry shell / step 4 | «Добавьте, что есть дома, и мы не купим лишнего»; shell CTA «Указать продукты в мастере»; на шаге 4 доступен поиск |
| No recipe / generation / unknown route | «Такого рецепта нет» + «Вернуться к меню» / «Генерация не запущена» + «К настройкам» / «Страница не найдена» + «На главную» |
| Guest profile | «Вы пользуетесь гостевым режимом. Профиль появится позже»; «Вернуться к меню», «Закрыть пояснение» |
| Search empty / loading / error | «Начните вводить название» / «Ищем продукты…» / «Ничего не найдено. Попробуйте другое название» / «Не удалось найти продукты. Повторите поиск» + «Повторить поиск» |
| Budget error | «Введите целое число рублей от 500»; unsafe integer: «Сумма слишком велика. Укажите меньшее целое число рублей» |
| Nutrition absent / partial / invalid | «Норма не задана» / «Заполните все поля нормы или очистите их» / «Калории должны быть больше 0, Б/Ж/У — не меньше 0. Введите конечные числа»; «Планирование питания не является медицинской рекомендацией» |
| Quantity error | «Укажите количество больше 0 и подходящую единицу или оставьте количество пустым» |
| Storage loading / failure / success | «Восстанавливаем настройки…» / «Не удалось сохранить на этом устройстве. Изменения доступны до закрытия страницы» + «Повторить сохранение» / «Сохранено на этом устройстве» только после успешной записи |
| Corrupt / unknown snapshot | «Не удалось восстановить настройки. Сохранённые данные повреждены или имеют другую версию»; «На главную» / «Сбросить черновик» |
| Destructive confirmation | «Сбросить черновик?»; «Настройки мастера на этом устройстве будут удалены»; «Оставить черновик» / «Сбросить черновик». «Оставить черновик» только закрывает подтверждение, не сохраняет и не сообщает об успехе. Другие ключи/запасы не удаляются |
| Exit confirmation | «Выйти из мастера?»; «Черновик останется на этом устройстве» только при подтверждённом сохранении, иначе «Изменения не сохранены на этом устройстве»; «Продолжить настройку» / «Выйти из мастера» |

## UI Considerations

Прежняя инвентаризация **54 covered, 0 backstop, 4 unresolved** сохранена как историческая база до поправки D-10; `.tmp/phase1-ui-elements.json` не подтверждает актуальную приёмку. После amendment применимость определяется строками ниже: все calculator-строки отложены в P1/NEXT-10, а не реализованы. Остальные строки сохраняют P0-контракт. Новый общий count без повторного аудита не заявляется; covered не означает пройденный тест.

| Category | Element(s) | Status | Resolution / Reason |
|----------|------------|--------|---------------------|
| loading | welcome, navigation, route-states | ✅ covered | До чтения draft/plan-presence показывать Storage loading, не мигать ложным пустым меню; обычный локальный переход без fake spinner; generation route не имитирует операцию |
| error | welcome, navigation, route-states | ✅ covered | Сбой чтения → Storage failure/recovery; неизвестный маршрут/рецепт/нет операции → соответствующий No recipe/generation/unknown route; профиль закрывается/возвращает к меню |
| overflow | welcome, navigation, route-states | ✅ covered | Текст карточки переносится; 4 навигационных пункта равной ширины min-width:0; длинная конфигурируемая марка переносится без сдвига кнопки; страницы не получают horizontal scroll |
| long-text | welcome, navigation, route-states | ✅ covered | При 200% zoom заголовок и описание растут по высоте, подписи nav переносятся; кнопки min-height, не fixed-height, остаются читаемыми на 360 |
| empty | step1, budget, manual-nutrition, draft-recovery | ✅ covered | Новый draft: D-06; бюджет после очистки остаётся пустым с ошибкой при Далее; manual все пустые = отсутствующая норма; отсутствие snapshot создаёт новый draft, не recovery |
| loading | step1, budget, manual-nutrition, draft-recovery | ✅ covered | Перед hydrate controls не редактируют пустой draft; Storage loading. Изменение чисел/ручной нормы синхронное, не показывает вымышленный расчёт; retry имеет disabled+status на время реальной операции |
| error | step1, budget, manual-nutrition, draft-recovery | ✅ covered | Границы/числа/partial валидируются при Далее, first invalid focus; Budget/Nutrition/Storage copy; при read/write failure текущий ввод не теряется и не объявляется сохранённым |
| partial | step1, budget, manual-nutrition, draft-recovery | ✅ covered | Сырые строки и шаг переживают назад/reload; hint бюджета скрыт при невалидности; partial nutrition не нули; частично валидный snapshot сохраняется как draft, повреждённый envelope требует явного reset |
| overflow | step1, budget, manual-nutrition, draft-recovery | ✅ covered | Формы одна колонка на 360, длинный budget внутри input; footer резервирует свою высоту; баннер recovery раздвигает поток, не перекрывает первое поле |
| long-text | step1, budget, manual-nutrition, draft-recovery | ✅ covered | Полные цели/variety/ошибки переносятся без ellipsis; fieldset не растягивает grid; длинные safe integers не расширяют страницу; source нормы доступен текстом |
| empty | exclusions, home-products | ✅ covered | Пустые exclusions означают отсутствие тегов с доступным search; 0 pantry rows → Empty pantry step 4; пустой запрос → Search empty; запрос без совпадений → Search no results |
| loading | exclusions, home-products | ✅ covered | Search loading сохраняет выбранные теги/строки; listbox aria-busy, не добавлять продукт повторным Enter при загрузке; популярные чипы остаются доступны при загруженном каталоге |
| error | exclusions, home-products | ✅ covered | Search error+«Повторить поиск» не очищает query/выбранные IDs; неверная quantity inline с фокусом; неизвестный токен не добавляется; недоступный каталог не объявляется пустым результатом |
| populated | exclusions, home-products | ✅ covered | Результаты listbox с выделенным вариантом; теги с named remove; pantry row содержит label/quantity-or-absent/unit/expiry/remove; дубликат фокусирует строку, а не суммирует |
| partial | exclusions, home-products | ✅ covered | Незавершённый query не становится тегом; product без quantity имеет отдельное отсутствие; невалидная строка сохраняется для исправления; загруженные теги не пропадают при сбое другой выдачи |
| overflow | exclusions, home-products | ✅ covered | Теги и popular chips wrap, название строки min-width:0; listbox max-height 240 с вертикальным scroll; длинный выбранный список растёт в общем потоке, sticky не закрывает последнюю строку |
| zero-one-many | exclusions, home-products | ✅ covered | 0 — copy/поиск; 1 — полноценная строка/тег без лишнего пустого ряда; много — тот же вертикальный список и wrap, все значения достижимы; remove/undo корректны при переходе 1↔0 |
| long-text | exclusions, home-products | ✅ covered | Длинное название переносится с overflow-wrap:anywhere, remove имеет отдельную 44px цель; label количества/единицы не пропадает; tooltip не единственный способ прочитать название |
| overflow | calculator | deferred P1 | NEXT-10 по D-10: будущая мини-форма должна пройти 360/200% zoom без горизонтального скролла; в P0 не реализуется |
| long-text | calculator | deferred P1 | NEXT-10 по D-10: будущие источник/ошибки переносятся, disclosure keyboard accessible, цели ≥44px; в P0 не реализуется |
| empty | calculator | deferred P1 | Human-confirmed scope-amendment D-10; начальная модель/absence пол/возраст/рост/вес/активность остаётся открытым контрактом NEXT-10/Q-03, средние нормы не подставляются |
| loading | calculator | deferred P1 | Human-confirmed scope-amendment D-10; операция NEXT-10 не определена, сервис/spinner/промежуточный успех не изобретаются |
| error | calculator | deferred P1 | Human-confirmed scope-amendment D-10; формула/коэффициенты/допустимость/ошибки NEXT-10 остаются Q-03; manual validation P0 сохранена |
| partial | calculator | deferred P1 | Human-confirmed scope-amendment D-10; результат/«Использовать»/provenance NEXT-10 требуют будущего контракта; перенос не означает выполнения калькулятора |

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| none | none | not applicable — Tool:none, внешние блоки не объявлены и не загружались |

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS
- [ ] Dimension 7 Inventory Provenance: PASS

**Approval:** pending. Финальная приёмка 01-08 ещё не выполнена: проверить P0 implementation на 360/390/430/768/1280 и 1199/1200, keyboard/dialog/focus/zoom, точные 500/1050/20000 и арию range, storage failure/corruption, catalog loading/empty/error и ручную цель WIZ-09. Результаты уже исполненных планов находятся в их неизменённых SUMMARY. Калькулятор NEXT-10 и четыре состояния deferred P1 не входят в QA P0. Playwright WebKit не доказывает исторический Safari 15; ограничения Q-17 фиксируются явно. C-04 подтверждён по приоритету, оставшаяся часть Q-03 не закрыта.
