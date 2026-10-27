---
phase: 01-gostevoy-start-i-sohranyaemye-nastroyki
verified: 2026-10-27T13:04:29Z
status: human_needed
score: 120/128 must-haves verified
covered_files: [".planning/REQUIREMENTS.md",".planning/ROADMAP.md",".planning/phases/01-gostevoy-start-i-sohranyaemye-nastroyki/01-01-PLAN.md",".planning/phases/01-gostevoy-start-i-sohranyaemye-nastroyki/01-01-SUMMARY.md",".planning/phases/01-gostevoy-start-i-sohranyaemye-nastroyki/01-02-PLAN.md",".planning/phases/01-gostevoy-start-i-sohranyaemye-nastroyki/01-02-SUMMARY.md",".planning/phases/01-gostevoy-start-i-sohranyaemye-nastroyki/01-03-PLAN.md",".planning/phases/01-gostevoy-start-i-sohranyaemye-nastroyki/01-03-SUMMARY.md",".planning/phases/01-gostevoy-start-i-sohranyaemye-nastroyki/01-04-PLAN.md",".planning/phases/01-gostevoy-start-i-sohranyaemye-nastroyki/01-04-SUMMARY.md",".planning/phases/01-gostevoy-start-i-sohranyaemye-nastroyki/01-05-PLAN.md",".planning/phases/01-gostevoy-start-i-sohranyaemye-nastroyki/01-05-SUMMARY.md",".planning/phases/01-gostevoy-start-i-sohranyaemye-nastroyki/01-06-PLAN.md",".planning/phases/01-gostevoy-start-i-sohranyaemye-nastroyki/01-06-SUMMARY.md",".planning/phases/01-gostevoy-start-i-sohranyaemye-nastroyki/01-07-PLAN.md",".planning/phases/01-gostevoy-start-i-sohranyaemye-nastroyki/01-07-SUMMARY.md",".planning/phases/01-gostevoy-start-i-sohranyaemye-nastroyki/01-08-PLAN.md",".planning/phases/01-gostevoy-start-i-sohranyaemye-nastroyki/01-08-SUMMARY.md",".planning/phases/01-gostevoy-start-i-sohranyaemye-nastroyki/01-CONTEXT.md",".planning/phases/01-gostevoy-start-i-sohranyaemye-nastroyki/01-REVIEW-DISPOSITION.md",".planning/phases/01-gostevoy-start-i-sohranyaemye-nastroyki/01-REVIEW-FIXES.md",".planning/phases/01-gostevoy-start-i-sohranyaemye-nastroyki/01-REVIEW.md",".planning/phases/01-gostevoy-start-i-sohranyaemye-nastroyki/01-SECURITY.md",".planning/phases/01-gostevoy-start-i-sohranyaemye-nastroyki/01-UI-REVIEW.md",".planning/phases/01-gostevoy-start-i-sohranyaemye-nastroyki/01-UI-SPEC.md",".planning/phases/01-gostevoy-start-i-sohranyaemye-nastroyki/01-VALIDATION.md",".tmp/phase01-qa/focus-cross-browser-final.xml",".tmp/phase01-qa/release-chromium.xml",".tmp/phase01-qa/release-firefox.xml",".tmp/phase01-qa/release-webkit-final.xml",".tmp/phase01-qa/review-firefox-final.xml",".tmp/phase01-qa/review-related-186.xml","README.md","docs/decisions/archive/01-07-calculator-before-amendment.md","docs/decisions/nutrition-calculator-amendment.md","docs/decisions/nutrition-calculator-proposal.md","docs/decisions/nutrition-calculator.json","docs/qa/phase01-install-preflight.json","docs/qa/phase01-install-preflight.md","docs/qa/phase01.md","e2e/accessibility.spec.ts","e2e/budget.spec.ts","e2e/fixtures.ts","e2e/guest.spec.ts","e2e/navigation.spec.ts","e2e/nutrition.spec.ts","e2e/presentation.spec.ts","e2e/products.spec.ts","e2e/storage-retry.spec.ts","e2e/storage.spec.ts","e2e/wizard.spec.ts","eslint.config.js","index.html","package-lock.json","package.json","playwright.config.ts","reference/OPEN_QUESTIONS.md","reference/PRD.md","scripts/verify-calculator-decision.mjs","src/adapters/guestDraft.test.ts","src/adapters/guestDraft.ts","src/adapters/products.ts","src/app/App.tsx","src/domain/budget.test.ts","src/domain/budget.ts","src/domain/nutritionTarget.test.ts","src/domain/nutritionTarget.ts","src/domain/settings.test.ts","src/domain/settings.ts","src/features/wizard/BudgetStep.tsx","src/features/wizard/ExclusionsStep.tsx","src/features/wizard/HomeProductsStep.tsx","src/features/wizard/NutritionFields.tsx","src/features/wizard/PeopleStep.tsx","src/features/wizard/Wizard.tsx","src/features/wizard/copy.ts","src/shared/ProductCombobox.tsx","src/shared/styles/tokens.css","src/shared/ui.tsx","tsconfig.json","vite.config.ts"]
covered_digest: "v3:sha256:03279bb4f5525a7c34e5a92eb03854c28c7e439d2b44063339f56203c6032fbc"
behavior_unverified: 0
overrides_applied: 0
decision_coverage:
  honored: 17
  total: 17
  not_honored: []
flagged_prohibitions: 2
prohibitions:
  - plan: 01-04
    requirement_id: WIZ-09
    statement: "Пользовательский ввод и цель не должны превращаться в непроверенное медицинское предписание или обещание результата питания."
    verification: judgment
    status: unverified
    flagged: true
    human_item: H7
  - plan: 01-06
    requirement_id: WIZ-06
    statement: "Names-only каталог не должен обещать безопасность при аллергии или пригодность продукта по его похожему названию."
    verification: judgment
    status: unverified
    flagged: true
    human_item: H8
human_verification:
  - test: "H1: Реальный iOS: клавиатура и safe area. На iPhone пройти четыре шага, открыть поиск и поля, повернуть экран с открытой клавиатурой."
    expected: "Каждое поле, ошибка и закреплённое действие достижимы; клавиатура, вырез и нижний индикатор их не закрывают."
    why_human: "Desktop viewport/390×400 и WebKit 27.2 не воспроизводят реальные keyboard/safe area."
  - test: "H2: Safari 15. В реальном Safari 15 пройти welcome → мастер → проверка настроек → reload; проверить диалоги и поиск."
    expected: "Путь и восстановление работают без ошибок, доступны отмена/возврат/ручная цель."
    why_human: "Build target safari15 и современный WebKit не являются выполнением Safari 15."
  - test: "H3: Screen reader и полный контраст. Пройти поля, поиск/listbox, ошибки, recovery и диалоги со screen reader; измерить контраст normal/hover/focus/error/disabled."
    expected: "Названия, состояния и ошибки объявляются понятно и однократно; текст/индикаторы удовлетворяют принятому AA-контракту."
    why_human: "ARIA/focus/geometry assertions не проверяют реальные объявления и весь контраст."
  - test: "H4: Native zoom и визуальная приёмка. Включить настоящий browser zoom 200%, пройти все шаги/ошибки/route states и сравнить с PDF-макетами."
    expected: "Текст и действия целиком читаемы, поля/ошибки не перекрыты, общая композиция согласована."
    why_human: "Тесты меняют CSS font-size; они не доказывают native zoom или человеческое принятие вида."
  - test: "H5: Q-17: методика и LCP. Зафиксировать устройство, сеть и cold/warm cache для Q-17; измерить LCP по согласованной методике."
    expected: "Есть воспроизводимый замер относительно согласованного критерия."
    why_human: "Методика и фактический замер отсутствуют; скорость локального build не доказывает LCP."
  - test: "H6: Конфликт двух вкладок. Открыть мастер в двух вкладках, поочерёдно изменить ввод и перезагрузить одну; оценить понятность поведения."
    expected: "Пользователь понимает независимую память вкладок и последнюю успешную локальную запись; отсутствует обещание синхронизации."
    why_human: "Named backstop непосредственно проверяет last-write поведение, но не принимает UX конфликта."
  - test: "H7: Judgment prohibition: медицинские обещания. Просмотреть ручную норму, ошибки и сводку; принять или вернуть на исправление prohibition 01-04."
    expected: "Ввод/цель не превращаются в непроверенное медицинское предписание или обещание результата питания."
    why_human: "Содержательный safety judgement требует явного человеческого решения; отсутствие формулы — только техническое evidence."
  - test: "H8: Judgment prohibition: аллергия. Просмотреть ограничения, поиск и продуктовые подписи; принять или вернуть на исправление prohibition 01-06."
    expected: "Names-only каталог не обещает безопасность при аллергии или пригодность по похожему названию."
    why_human: "Проверка текста и IDs не является человеческой оценкой пищевых деклараций."
  - test: "H9: C1: модель добавления домашнего продукта. Оценить шаг 4: выбор результата сразу добавляет продукт; выбрать принятие этого поведения с обновлением контракта либо восстановление отдельной кнопки «Добавить продукт»."
    expected: "Реализация и UI-SPEC §Interaction contract имеют одну явно принятую модель."
    why_human: "Кнопка из UI-SPEC отсутствует наблюдаемо; рабочее добавление/ID доказаны. Это открытое WARNING UI review, разрешение на waiver не получено."
---

# Phase 1: Гостевой старт и сохраняемые настройки — Verification

**Phase Goal:** As a гость, I want to открыть P0-разделы и сохранить валидные параметры питания в четырёхшаговом мастере, so that я могу подготовить меню без регистрации и повторного ввода.
**Verified:** 2026-10-27T13:04:29Z
**Status:** human_needed
**Re-verification:** No — initial verification; прерванная проверка продолжена, предыдущего VERIFICATION.md не было.
**Source revision:** `8cd5872` (app), документация `3da6984`, текущее форматирование Goal не меняет scope.

## User Flow Coverage

User story проверена `query user-story.validate --pick valid`: true. Пользовательский результат — сохраняемые настройки гостя; реальное меню доставляет Phase 2.

| Шаг пользователя | Ожидается | Evidence в коде и исполненных проверках | Статус |
|---|---|---|---|
| Открыть приложение без регистрации | Welcome, объяснение пути и доступ к P0-разделам | App.tsx:WelcomePage/Routes/AppLayout; guest/navigation actual R1/R2/R3 | VERIFIED |
| Начать мастер и выбрать людей/дни/цель | Четыре шага, значения 1–10/1–7, понятные ошибки | Wizard/PeopleStep/settings.validateStep; wizard.spec.ts; R1/R3 | VERIFIED |
| Указать бюджет/время/разнообразие | Точная сумма и честная проекция slider, hint на человека/день | BudgetStep/budget.ts; budget.spec.ts; S2; R1/R3/R4 | VERIFIED |
| Добавить ограничения, домашние продукты и необязательную ручную норму | ID сохраняются; unknown quantity отличается от 0; partial manual требует исправления | ExclusionsStep/HomeProductsStep/NutritionFields; products/nutrition; R1/R2/R3 | VERIFIED; C1 и safety judgement отдельно H7–H9 |
| Проверить настройки и перезагрузить | Тот же шаг/raw draft/происхождение, без confirmed/pantry mutations | App.change → adapter.save/load → Wizard/DraftReview; presentation/storage/storage-retry; R1–R4 | VERIFIED |
| Получить результат user story | Настройки подготовлены и доступны повторно без регистрации/повторного ввода | Реальный localStorage draft key и typed reducer; семь ширин complete journey R1/R4 | VERIFIED в автоматизированном пользовательском пути; H1–H9 не приняты |

Пользовательский путь имеет реальное browser evidence, а не вывод из unit-тестов. Human UAT из MVP-mode и PLAN 01-08 остаётся pending, поэтому фаза не объявлена завершённой.

## Goal Achievement

### Observable Truths — roadmap contract

| # | Truth | Статус | Evidence |
|---|---|---|---|
| SC1 | Пользователь открывает P0-маршруты гостем, видит приветствие и переход в мастер; существующий план ведёт с `/` на `/menu`. Нижняя навигация телефона и боковая от 1200 px следуют решённому C-06, мастер полноэкранный. | VERIFIED | App.tsx:parsePresence/Routes/AppLayout; navigation deep routes/exact boundary/fullscreen; guest valid/invalid presence R1/R2/R3. noPlan default честно absent; реальный plan producer принадлежит Phase 2. |
| SC2 | Пользователь проходит четыре шага с прогрессом, возвращается назад и восстанавливает черновик после перезагрузки; выход с первого заполненного шага требует подтверждения. | VERIFIED | Wizard.next/review/exit, settings reducer, App persistence; wizard/storage/presentation R1–R4; CR-01 exact snapshot regression R2/R3. |
| SC3 | Пользователь выбирает 1–10 человек, 1–7 дней на шаге 1, цель, время и разнообразие; поле и слайдер бюджета синхронны, подсказка на человека в день и крайние значения соответствуют решениям Q-01/Q-02. | VERIFIED | PeopleStep/BudgetStep; strict settings/budget parsers; 500/1050/20000 projection and no silent clamp; budget/wizard R1/R3/R4, own S2. |
| SC4 | Пользователь вводит ограничения/теги, ищет домашние продукты, задаёт необязательные количества/expiry; ручная цель на человека в день имеет manual origin; пустая допустима, partial требует исправления/очистки, средние нормы не подставляются. Автокалькулятор/четыре состояния перенесены в P1/NEXT-10 по подтверждённому C-04; вычислительного кредита нет. | VERIFIED | products.ts ID catalogue + controlled rows + parseManualTarget; products/nutrition/presentation R1/R2/R3/R4; decision JSON human response+amendment; own S3. Safety judgment H7/H8 остаётся unverified. |
| SC5 | На этих экранах пользователь видит единый русский интерфейс, RUB, согласованные единицы и конфигурируемое название/логотип. | VERIFIED | index.html lang=ru; appConfig.brand/brand props + текстовый logo fallback; formatRubles, shared copy/unit labels, tokens.css; hostile brand and geometry tests R1/R3. Внешний bitmap-logo не обязателен по UI-SPEC, реальный вид/контраст H3/H4. |

Roadmap wording SC4 развернуто без изменения требований; все его части сохранены. Ни один PLAN не уменьшает roadmap scope.

### Observable Truths — дополнительные PLAN truths и edges

Реестр включает каждую из 127 записей truths восьми планов: 3 дословных повтора D-13/D-14/D-06 объединены; 01-08.3 целиком включена в SC4. Остаются 123 самостоятельные PLAN truths + 5 roadmap truths = **128**, VERIFIED **120**, UNCERTAIN/WARNING **8**, FAILED **0**. Восемь uncertainty ниже не получают verified-score. Поведенческие переходы подкреплены выполненными named cases в actual JUnit; `behavior_unverified=0` не означает закрытия native zoom/SR/device judgement.

| ID source plan.truth | Truth | Статус | Evidence / ограничение |
|---|---|---|---|
| 01-01.1 | D-01: гость видит русский welcome, Настройки → Меню → Покупки и переход в мастер; только валидный plan-presence ведёт с / на /menu. | VERIFIED | App.tsx:parsePresence/load/change; guest.spec.ts:invalid presence, reload, late presence, double CTA; R1/R2/R3 |
| 01-01.2 | D-13: raw draft и текущий шаг отделены от confirmed settings и global pantry; перезагрузка не превращает редактирование в применение. | VERIFIED | App.tsx:parsePresence/load/change; guest.spec.ts:invalid presence, reload, late presence, double CTA; R1/R2/R3 |
| 01-01.3 | D-14: версия и структура snapshot проверяются до autosave; corruption не перезаписывается до явного reset; read/write failure оставляет memory draft и повтор текущей записи. | VERIFIED | App.tsx:parsePresence/load/change; guest.spec.ts:invalid presence, reload, late presence, double CTA; R1/R2/R3 |
| 01-01.4 | EDGE APP-03/empty: missing/invalid plan-presence оставляет welcome, а не redirect по truthy object. | VERIFIED | App.tsx:parsePresence/load/change; guest.spec.ts:invalid presence, reload, late presence, double CTA; R1/R2/R3 |
| 01-01.5 | EDGE APP-03/encoding: длинная кириллическая марка и символы ₽ выводятся текстом, не HTML, и переносятся. | VERIFIED | App.tsx:parsePresence/load/change; guest.spec.ts:invalid presence, reload, late presence, double CTA; R1/R2/R3 |
| 01-01.6 | EDGE APP-03/idempotency: двойной CTA приводит к одному экземпляру мастера с тем же draft. | VERIFIED | App.tsx:parsePresence/load/change; guest.spec.ts:invalid presence, reload, late presence, double CTA; R1/R2/R3 |
| 01-01.7 | EDGE APP-03/concurrency: пока presence проверяется, welcome не мигает ложным меню; устаревший результат игнорируется. | VERIFIED | App.tsx:parsePresence/load/change; guest.spec.ts:invalid presence, reload, late presence, double CTA; R1/R2/R3 |
| 01-01.8 | UI welcome/loading: до draft/presence load показано Восстанавливаем настройки, без ложного пустого меню. | VERIFIED | App.tsx:parsePresence/load/change; guest.spec.ts:invalid presence, reload, late presence, double CTA; R1/R2/R3 |
| 01-01.9 | UI welcome/error: read failure/recovery сохраняет путь в мастер и не изображает успех. | VERIFIED | App.tsx:parsePresence/load/change; guest.spec.ts:invalid presence, reload, late presence, double CTA; R1/R2/R3 |
| 01-01.10 | UI welcome/overflow: длинная марка переносится, 360px страница не расширяется. | VERIFIED | App.tsx:parsePresence/load/change; guest.spec.ts:invalid presence, reload, late presence, double CTA; R1/R2/R3 |
| 01-01.11 | UI welcome/long-text: 200% zoom увеличивает высоту текста/CTA, без обрезки. | UNCERTAIN — WARNING | App.tsx:parsePresence/load/change; guest.spec.ts:invalid presence, reload, late presence, double CTA; R1/R2/R3; H4: CSS text 200% не native browser zoom |
| 01-02.1 | D-02: четыре вкладки включают доступное гостевое пояснение Профиль с закрытием и возвратом к меню. | VERIFIED | App.tsx:Routes/AppLayout; ui.tsx:ConfirmDialog; tokens.css; navigation.spec.ts; accessibility.spec.ts; R1/R2/R3/R4 |
| 01-02.2 | D-03: нижняя навигация сменяется боковой точно на 1200 px; мастер/генерация полноэкранны; будущие разделы, рецепт и неизвестный URL имеют честные состояния и выход. | VERIFIED | App.tsx:Routes/AppLayout; ui.tsx:ConfirmDialog; tokens.css; navigation.spec.ts; accessibility.spec.ts; R1/R2/R3/R4 |
| 01-02.3 | D-15: конфигурируемая марка, кириллический system font и единые светлые зелёные токены применяются ко всем экранам. | VERIFIED | App.tsx:Routes/AppLayout; ui.tsx:ConfirmDialog; tokens.css; navigation.spec.ts; accessibility.spec.ts; R1/R2/R3/R4 |
| 01-02.4 | D-16: 360/390/430/768/1280 и 1199/1200 px, видимый фокус, цели 44×44, primary 48 px и безопасная sticky-панель проверяются уже в фазе 1. | VERIFIED | App.tsx:Routes/AppLayout; ui.tsx:ConfirmDialog; tokens.css; navigation.spec.ts; accessibility.spec.ts; R1/R2/R3/R4 |
| 01-02.5 | EDGE APP-01/adjacency: /menu и /recipe/:id разрешаются независимо, похожие/неизвестные пути не попадают в соседний route. | VERIFIED | App.tsx:Routes/AppLayout; ui.tsx:ConfirmDialog; tokens.css; navigation.spec.ts; accessibility.spec.ts; R1/R2/R3/R4 |
| 01-02.6 | EDGE APP-01/empty: пустой URL открывает welcome; отсутствующее меню, неизвестный рецепт и отсутствие генерации дают свои честные состояния. | VERIFIED | App.tsx:Routes/AppLayout; ui.tsx:ConfirmDialog; tokens.css; navigation.spec.ts; accessibility.spec.ts; R1/R2/R3/R4 |
| 01-02.7 | EDGE APP-01/ordering: route matching не зависит от порядка переходов; back/forward возвращает соответствующий экран. | VERIFIED | App.tsx:Routes/AppLayout; ui.tsx:ConfirmDialog; tokens.css; navigation.spec.ts; accessibility.spec.ts; R1/R2/R3/R4 |
| 01-02.8 | EDGE APP-01/idempotency: повторное открытие/deep reload одного route не создаёт меню и не очищает draft. | VERIFIED | App.tsx:Routes/AppLayout; ui.tsx:ConfirmDialog; tokens.css; navigation.spec.ts; accessibility.spec.ts; R1/R2/R3/R4 |
| 01-02.9 | EDGE APP-01/concurrency: завершившийся после ухода load не перенаправляет пользователя с нового route. | VERIFIED | App.tsx:Routes/AppLayout; ui.tsx:ConfirmDialog; tokens.css; navigation.spec.ts; accessibility.spec.ts; R1/R2/R3/R4 |
| 01-02.10 | EDGE APP-02/boundary: 1199 px показывает bottom-nav, 1200 px side-nav; fullscreen routes скрывают обе. | VERIFIED | App.tsx:Routes/AppLayout; ui.tsx:ConfirmDialog; tokens.css; navigation.spec.ts; accessibility.spec.ts; R1/R2/R3/R4 |
| 01-02.11 | EDGE APP-02/adjacency: footer/nav имеют непересекающиеся 44px цели, последний focusable элемент полностью виден. | VERIFIED | App.tsx:Routes/AppLayout; ui.tsx:ConfirmDialog; tokens.css; navigation.spec.ts; accessibility.spec.ts; R1/R2/R3/R4 |
| 01-02.12 | EDGE APP-02/empty: без плана все четыре вкладки и Новое меню остаются достижимыми с поясняющими состояниями. | VERIFIED | App.tsx:Routes/AppLayout; ui.tsx:ConfirmDialog; tokens.css; navigation.spec.ts; accessibility.spec.ts; R1/R2/R3/R4 |
| 01-02.13 | EDGE APP-02/ordering: DOM/focus порядок Меню, Покупки, Дома, Профиль стабилен при смене ширины. | VERIFIED | App.tsx:Routes/AppLayout; ui.tsx:ConfirmDialog; tokens.css; navigation.spec.ts; accessibility.spec.ts; R1/R2/R3/R4 |
| 01-02.14 | EDGE APP-02/precision: при дробном CSS viewport около 1200 решение принимает CSS media query, панели не дублируются. | VERIFIED | App.tsx:Routes/AppLayout; ui.tsx:ConfirmDialog; tokens.css; navigation.spec.ts; accessibility.spec.ts; R1/R2/R3/R4 |
| 01-02.15 | EDGE APP-02/idempotency: повторное нажатие Профиль не создаёт вложенные диалоги. | VERIFIED | App.tsx:Routes/AppLayout; ui.tsx:ConfirmDialog; tokens.css; navigation.spec.ts; accessibility.spec.ts; R1/R2/R3/R4 |
| 01-02.16 | EDGE APP-02/concurrency: resize при открытом диалоге сохраняет один trap и возвращает фокус доступному инициатору. | VERIFIED | App.tsx:Routes/AppLayout; ui.tsx:ConfirmDialog; tokens.css; navigation.spec.ts; accessibility.spec.ts; R1/R2/R3/R4 |
| 01-02.17 | EDGE UX-01/empty: отсутствие внешнего logo использует конфигурируемое текстовое название; неизвестное число не форматируется как 0. | VERIFIED | App.tsx:Routes/AppLayout; ui.tsx:ConfirmDialog; tokens.css; navigation.spec.ts; accessibility.spec.ts; R1/R2/R3/R4 |
| 01-02.18 | EDGE UX-01/encoding: единый ru-RU formatter показывает ₽, пробел тысяч и г/кг/мл/л/шт без повреждения кириллицы. | VERIFIED | App.tsx:Routes/AppLayout; ui.tsx:ConfirmDialog; tokens.css; navigation.spec.ts; accessibility.spec.ts; R1/R2/R3/R4 |
| 01-02.19 | UI navigation/loading: локальный переход не получает вымышленный spinner, pending restore явно обозначен. | VERIFIED | App.tsx:Routes/AppLayout; ui.tsx:ConfirmDialog; tokens.css; navigation.spec.ts; accessibility.spec.ts; R1/R2/R3/R4 |
| 01-02.20 | UI navigation/error: guest-profile закрывается/возвращает к меню, ссылка не становится тупиком. | VERIFIED | App.tsx:Routes/AppLayout; ui.tsx:ConfirmDialog; tokens.css; navigation.spec.ts; accessibility.spec.ts; R1/R2/R3/R4 |
| 01-02.21 | UI navigation/overflow: четыре равных пункта min-width:0 и безопасные отступы не дают page overflow. | VERIFIED | App.tsx:Routes/AppLayout; ui.tsx:ConfirmDialog; tokens.css; navigation.spec.ts; accessibility.spec.ts; R1/R2/R3/R4 |
| 01-02.22 | UI navigation/long-text: подписи переносятся при 200% zoom, цели растут по высоте. | UNCERTAIN — WARNING | App.tsx:Routes/AppLayout; ui.tsx:ConfirmDialog; tokens.css; navigation.spec.ts; accessibility.spec.ts; R1/R2/R3/R4; H4: CSS text 200% не native browser zoom |
| 01-02.23 | UI route-states/loading: прямой /plan/generating сообщает Генерация не запущена. | VERIFIED | App.tsx:Routes/AppLayout; ui.tsx:ConfirmDialog; tokens.css; navigation.spec.ts; accessibility.spec.ts; R1/R2/R3/R4 |
| 01-02.24 | UI route-states/error: unknown route/recipe содержат понятный текст и рабочий возврат. | VERIFIED | App.tsx:Routes/AppLayout; ui.tsx:ConfirmDialog; tokens.css; navigation.spec.ts; accessibility.spec.ts; R1/R2/R3/R4 |
| 01-02.25 | UI route-states/overflow: длинное пояснение растёт в потоке, не закрывает действия. | VERIFIED | App.tsx:Routes/AppLayout; ui.tsx:ConfirmDialog; tokens.css; navigation.spec.ts; accessibility.spec.ts; R1/R2/R3/R4 |
| 01-02.26 | UI route-states/long-text: состояния читаются целиком при zoom, без ellipsis. | UNCERTAIN — WARNING | App.tsx:Routes/AppLayout; ui.tsx:ConfirmDialog; tokens.css; navigation.spec.ts; accessibility.spec.ts; R1/R2/R3/R4; H4: CSS text 200% не native browser zoom |
| 01-03.1 | D-08: невалидный шаг не продвигается, фокус получает первая ошибка; отмена выхода сохраняет ввод, подтверждение не удаляет draft. | VERIFIED | guestDraft.ts:load/save/reset; App.tsx:retry/persist/resetDraft; storage.spec.ts; storage-retry.spec.ts; R2/R3/S1 |
| 01-03.4 | EDGE WIZ-01/boundary: шаги только 1–4; назад на 1 открывает подтверждение, Далее на 4 не создаёт шаг 5/генерацию. | VERIFIED | guestDraft.ts:load/save/reset; App.tsx:retry/persist/resetDraft; storage.spec.ts; storage-retry.spec.ts; R2/R3/S1 |
| 01-03.5 | EDGE WIZ-01/precision: прогресс ровно N из 4 и N выделенных сегментов; дробный/посторонний step не восстанавливается. | VERIFIED | guestDraft.ts:load/save/reset; App.tsx:retry/persist/resetDraft; storage.spec.ts; storage-retry.spec.ts; R2/R3/S1 |
| 01-03.6 | EDGE WIZ-01/idempotency: быстрый двойной Далее не пропускает шаг и не обходит его validation. | VERIFIED | guestDraft.ts:load/save/reset; App.tsx:retry/persist/resetDraft; storage.spec.ts; storage-retry.spec.ts; R2/R3/S1 |
| 01-03.7 | EDGE WIZ-01/concurrency: уход/возврат во время записи сохраняет актуальный memory draft; поздний callback не затирает более новый ввод. | VERIFIED | guestDraft.ts:load/save/reset; App.tsx:retry/persist/resetDraft; storage.spec.ts; storage-retry.spec.ts; R2/R3/S1 |
| 01-03.8 | EDGE WIZ-02/idempotency: hydrate и повторный save одного draft не меняют поля/шаг и чужие storage keys. | VERIFIED | guestDraft.ts:load/save/reset; App.tsx:retry/persist/resetDraft; storage.spec.ts; storage-retry.spec.ts; R2/R3/S1 |
| 01-03.9 | EDGE WIZ-02/concurrency: поведение одновременного изменения в двух вкладках не согласовано; проверить, что одна вкладка не выдаёт межвкладочную синхронизацию за гарантию, и записать наблюдение. | VERIFIED | guestDraft.ts:load/save/reset; App.tsx:retry/persist/resetDraft; storage.spec.ts; storage-retry.spec.ts; R2/R3/S1; named two-tab test непосредственно проверяет независимую память/last write; H6 принимает только UX, не меняет результат теста |
| 01-03.10 | UI draft-recovery/empty: missing snapshot создаёт новый draft, а не corruption. | VERIFIED | guestDraft.ts:load/save/reset; App.tsx:retry/persist/resetDraft; storage.spec.ts; storage-retry.spec.ts; R2/R3/S1 |
| 01-03.11 | UI draft-recovery/loading: до hydrate controls не пишут defaults; retry имеет status на время реальной записи. | VERIFIED | guestDraft.ts:load/save/reset; App.tsx:retry/persist/resetDraft; storage.spec.ts; storage-retry.spec.ts; R2/R3/S1 |
| 01-03.12 | UI draft-recovery/error: failure оставляет текущий ввод, warning и retry; saved появляется только после setItem success. | VERIFIED | guestDraft.ts:load/save/reset; App.tsx:retry/persist/resetDraft; storage.spec.ts; storage-retry.spec.ts; R2/R3/S1 |
| 01-03.13 | UI draft-recovery/partial: raw строки и step round-trip; malformed envelope/unknown version не перезаписываются. | VERIFIED | guestDraft.ts:load/save/reset; App.tsx:retry/persist/resetDraft; storage.spec.ts; storage-retry.spec.ts; R2/R3/S1 |
| 01-03.14 | UI draft-recovery/overflow: recovery banner в потоке не перекрывает первое поле и sticky footer. | VERIFIED | guestDraft.ts:load/save/reset; App.tsx:retry/persist/resetDraft; storage.spec.ts; storage-retry.spec.ts; R2/R3/S1 |
| 01-03.15 | UI draft-recovery/long-text: warning/reset/exit copy переносится и объявляется один раз. | UNCERTAIN — WARNING | guestDraft.ts:load/save/reset; App.tsx:retry/persist/resetDraft; storage.spec.ts; storage-retry.spec.ts; R2/R3/S1; H3: announcements/SR не проверены |
| 01-04.1 | D-04: четыре шага в порядке люди/цель/дни → бюджет/время/разнообразие → ограничения → продукты; прогресс и назад сохраняют raw ввод. | VERIFIED | settings.ts:validateStep; PeopleStep/NutritionFields/Wizard; wizard.spec.ts; nutrition.spec.ts; R1/R2/R3/S3 |
| 01-04.2 | D-06: новый draft =2 человека,7 дней,3000₽,maintain,30min,medium,пустые ограничения; 4+ выбирает4, restored значения приоритетнее defaults. | VERIFIED | settings.ts:validateStep; PeopleStep/NutritionFields/Wizard; wizard.spec.ts; nutrition.spec.ts; R1/R2/R3/S3 |
| 01-04.3 | D-08: Далее проверяет текущий шаг и фокусирует первую ошибку, частичные строки переживают назад/reload. | VERIFIED | settings.ts:validateStep; PeopleStep/NutritionFields/Wizard; wizard.spec.ts; nutrition.spec.ts; R1/R2/R3/S3 |
| 01-04.4 | D-09: ручная норма на человека в день принимает полный конечный набор kcal>0 и macros≥0 с origin manual; пустая отсутствует, partial не становится нулями. | VERIFIED | settings.ts:validateStep; PeopleStep/NutritionFields/Wizard; wizard.spec.ts; nutrition.spec.ts; R1/R2/R3/S3 |
| 01-04.5 | D-10: ручная часть не закрывает калькулятор/WIZ-09/фазу; до отдельного решения нет формулы, средних норм и медицинской оценки. | VERIFIED | settings.ts:validateStep; PeopleStep/NutritionFields/Wizard; wizard.spec.ts; nutrition.spec.ts; R1/R2/R3/S3; хронология Pending до QA сохранена, WIZ-09 Complete относится только к amended manual; вычислительного кредита нет |
| 01-04.6 | EDGE WIZ-03/boundary: люди0/1/10/11 и дни0/1/7/8 проверяются; controls disabled на1/10 и1/7. | VERIFIED | settings.ts:validateStep; PeopleStep/NutritionFields/Wizard; wizard.spec.ts; nutrition.spec.ts; R1/R2/R3/S3 |
| 01-04.7 | EDGE WIZ-03/precision: дробные/nonfinite люди/дни и неверные enum не принимаются, step/count остаются целыми. | VERIFIED | settings.ts:validateStep; PeopleStep/NutritionFields/Wizard; wizard.spec.ts; nutrition.spec.ts; R1/R2/R3/S3 |
| 01-04.8 | EDGE WIZ-09/boundary: пусто/partial/полный, kcal0, negative macro, nonfinite проверены; medical thresholds калькулятора остаются за gate04. | VERIFIED | settings.ts:validateStep; PeopleStep/NutritionFields/Wizard; wizard.spec.ts; nutrition.spec.ts; R1/R2/R3/S3 |
| 01-04.9 | EDGE WIZ-09/precision: числовая строка ручной нормы разбирается полностью, запятая/точка имеют единое правило; Infinity/NaN и переполнение не дают норму. | VERIFIED | settings.ts:validateStep; PeopleStep/NutritionFields/Wizard; wizard.spec.ts; nutrition.spec.ts; R1/R2/R3/S3 |
| 01-04.10 | UI step1/empty: только новый draft получает defaults; очищенное поле остаётся raw пустым до исправления. | VERIFIED | settings.ts:validateStep; PeopleStep/NutritionFields/Wizard; wizard.spec.ts; nutrition.spec.ts; R1/R2/R3/S3 |
| 01-04.11 | UI step1/loading: до hydrate ввод недоступен; синхронный выбор не показывает spinner. | VERIFIED | settings.ts:validateStep; PeopleStep/NutritionFields/Wizard; wizard.spec.ts; nutrition.spec.ts; R1/R2/R3/S3 |
| 01-04.12 | UI step1/error: границы и enum проверяются при Далее, текст ошибки связан с полем, фокус на первом. | VERIFIED | settings.ts:validateStep; PeopleStep/NutritionFields/Wizard; wizard.spec.ts; nutrition.spec.ts; R1/R2/R3/S3 |
| 01-04.13 | UI step1/partial: незавершённый ввод сохраняется при back/reload без округления в допустимый count. | VERIFIED | settings.ts:validateStep; PeopleStep/NutritionFields/Wizard; wizard.spec.ts; nutrition.spec.ts; R1/R2/R3/S3 |
| 01-04.14 | UI step1/overflow: fieldset и controls в одну колонку на360, sticky не перекрывает поле. | VERIFIED | settings.ts:validateStep; PeopleStep/NutritionFields/Wizard; wizard.spec.ts; nutrition.spec.ts; R1/R2/R3/S3 |
| 01-04.15 | UI step1/long-text: цели целиком переносятся при200%zoom без ellipsis. | UNCERTAIN — WARNING | settings.ts:validateStep; PeopleStep/NutritionFields/Wizard; wizard.spec.ts; nutrition.spec.ts; R1/R2/R3/S3; H4: CSS text 200% не native browser zoom |
| 01-04.16 | UI manual-nutrition/empty: все4 пустые = Норма не задана, отсутствует сравнение с0. | VERIFIED | settings.ts:validateStep; PeopleStep/NutritionFields/Wizard; wizard.spec.ts; nutrition.spec.ts; R1/R2/R3/S3 |
| 01-04.17 | UI manual-nutrition/loading: ручная правка синхронна и не изображает калькулятор. | VERIFIED | settings.ts:validateStep; PeopleStep/NutritionFields/Wizard; wizard.spec.ts; nutrition.spec.ts; R1/R2/R3/S3 |
| 01-04.18 | UI manual-nutrition/error: partial/nonfinite/negative показывают text error без медицинской рекомендации. | VERIFIED | settings.ts:validateStep; PeopleStep/NutritionFields/Wizard; wizard.spec.ts; nutrition.spec.ts; R1/R2/R3/S3 |
| 01-04.19 | UI manual-nutrition/partial: отдельные сырые поля round-trip, partial не преобразуется в заполненный результат. | VERIFIED | settings.ts:validateStep; PeopleStep/NutritionFields/Wizard; wizard.spec.ts; nutrition.spec.ts; R1/R2/R3/S3 |
| 01-04.20 | UI manual-nutrition/overflow: раскрытие и4 поля одной колонкой в360, footer не закрывает error. | VERIFIED | settings.ts:validateStep; PeopleStep/NutritionFields/Wizard; wizard.spec.ts; nutrition.spec.ts; R1/R2/R3/S3 |
| 01-04.21 | UI manual-nutrition/long-text: база/происхождение/disclaimer читаются целиком при200%zoom. | UNCERTAIN — WARNING | settings.ts:validateStep; PeopleStep/NutritionFields/Wizard; wizard.spec.ts; nutrition.spec.ts; R1/R2/R3/S3; H4: CSS text 200% не native browser zoom |
| 01-05.1 | D-05: бюджет выбранного периода не меняется при смене дней; подпись неделю/N дней и hint budget/people/days производны. | VERIFIED | budget.ts; BudgetStep.tsx; budget.test.ts; budget.spec.ts; R1/R3/R4/S2 |
| 01-05.3 | D-07: ручной бюджет safe integer≥500 без максимума15000; slider1000–15000/100 отражает собственную проекцию и не обрезает ручное поле. | VERIFIED | budget.ts; BudgetStep.tsx; budget.test.ts; budget.spec.ts; R1/R3/R4/S2 |
| 01-05.4 | EDGE WIZ-04/boundary: 499 invalid;500,1000,1050,15000,20000 valid; empty/negative/decimal/unsafe integer invalid. | VERIFIED | budget.ts; BudgetStep.tsx; budget.test.ts; budget.spec.ts; R1/R3/R4/S2 |
| 01-05.5 | EDGE WIZ-04/precision: digit-only safe parse; 1050→thumb1100 half-up,500→1000,20000→15000; hint округляется только для отображения, raw неизменен. | VERIFIED | budget.ts; BudgetStep.tsx; budget.test.ts; budget.spec.ts; R1/R3/R4/S2 |
| 01-05.6 | EDGE WIZ-05/adjacency: radio варианты времени и разнообразия различимы, ни одно граничное нажатие не выбирает две опции. | VERIFIED | budget.ts; BudgetStep.tsx; budget.test.ts; budget.spec.ts; R1/R3/R4/S2 |
| 01-05.7 | EDGE WIZ-05/empty: missing snapshot получает30min/medium; неизвестный восстановленный enum вызывает recovery, не скрытый default. | VERIFIED | budget.ts; BudgetStep.tsx; budget.test.ts; budget.spec.ts; R1/R3/R4/S2 |
| 01-05.8 | EDGE WIZ-05/ordering: время15/30/60/любое и same/medium/max имеют стабильный DOM/keyboard порядок. | VERIFIED | budget.ts; BudgetStep.tsx; budget.test.ts; budget.spec.ts; R1/R3/R4/S2 |
| 01-05.9 | EDGE WIZ-05/idempotency: повторный выбор той же опции не очищает другие настройки и не создаёт duplicate state. | VERIFIED | budget.ts; BudgetStep.tsx; budget.test.ts; budget.spec.ts; R1/R3/R4/S2 |
| 01-05.10 | EDGE WIZ-05/concurrency: быстрый выбор времени/variety с переходом назад сохраняет последний выбранный вариант после reload. | VERIFIED | budget.ts; BudgetStep.tsx; budget.test.ts; budget.spec.ts; R1/R3/R4/S2 |
| 01-05.11 | UI budget/empty: очищенное поле не становится0 и не получает рассчитанный hint. | VERIFIED | budget.ts; BudgetStep.tsx; budget.test.ts; budget.spec.ts; R1/R3/R4/S2 |
| 01-05.12 | UI budget/loading: ввод/hint синхронны, отсутствует вымышленная операция расчёта. | VERIFIED | budget.ts; BudgetStep.tsx; budget.test.ts; budget.spec.ts; R1/R3/R4/S2 |
| 01-05.13 | UI budget/error: invalid budget получает утверждённую copy, не округляется и не проходит Далее. | VERIFIED | budget.ts; BudgetStep.tsx; budget.test.ts; budget.spec.ts; R1/R3/R4/S2 |
| 01-05.14 | UI budget/partial: raw строка сохраняется; range описывает собственное значение при несовпадении с полем. | VERIFIED | budget.ts; BudgetStep.tsx; budget.test.ts; budget.spec.ts; R1/R3/R4/S2 |
| 01-05.15 | UI budget/overflow: длинное число прокручивается внутри input, не расширяет страницу. | VERIFIED | budget.ts; BudgetStep.tsx; budget.test.ts; budget.spec.ts; R1/R3/R4/S2 |
| 01-05.16 | UI budget/long-text: ручная пометка/ошибка/variety подписи переносятся и доступны screen reader. | UNCERTAIN — WARNING | budget.ts; BudgetStep.tsx; budget.test.ts; budget.spec.ts; R1/R3/R4/S2; H3: announcements/SR не проверены |
| 01-06.1 | D-11: ровно5 ограничений PRD и product-ID теги Не люблю добавляются Enter/запятой и удаляются, не теряются по навигации/reload. | VERIFIED | products.ts; ProductCombobox/ExclusionsStep/HomeProductsStep; settings.ts:validateHomeRow; products.spec.ts; R1/R3/R4 |
| 01-06.2 | D-12: количество неизвестно отдельно от0; known>0 finite с совместимой единицей; duplicate productId фокусирует строку без скрытого суммирования. | VERIFIED | products.ts; ProductCombobox/ExclusionsStep/HomeProductsStep; settings.ts:validateHomeRow; products.spec.ts; R1/R3/R4 |
| 01-06.3 | D-13: шаг4 и Проверить настройки изменяют только draft, не confirmed settings/global pantry; пропуск/запуск принадлежат Phase2. | VERIFIED | products.ts; ProductCombobox/ExclusionsStep/HomeProductsStep; settings.ts:validateHomeRow; products.spec.ts; R1/R3/R4 |
| 01-06.4 | D-17: поиск различает loading/empty/error/retry, popular chips имеют каталожные IDs; неизвестный текст не создаёт продукт и пищевые факты. | VERIFIED | products.ts; ProductCombobox/ExclusionsStep/HomeProductsStep; settings.ts:validateHomeRow; products.spec.ts; R1/R3/R4 |
| 01-06.5 | EDGE WIZ-06/adjacency: повтор одного productId не добавляет тег, разные ID с похожими названиями остаются разными. | VERIFIED | products.ts; ProductCombobox/ExclusionsStep/HomeProductsStep; settings.ts:validateHomeRow; products.spec.ts; R1/R3/R4 |
| 01-06.6 | EDGE WIZ-06/empty: нет tags/query/result — три понятных состояния; empty result не равно catalog failure. | VERIFIED | products.ts; ProductCombobox/ExclusionsStep/HomeProductsStep; settings.ts:validateHomeRow; products.spec.ts; R1/R3/R4 |
| 01-06.7 | EDGE WIZ-06/encoding: запрос trim+NFC+ru lowercase ищет названия/синонимы, ID не выводится из текста; ё и е не склеиваются без явного synonym. | VERIFIED | products.ts; ProductCombobox/ExclusionsStep/HomeProductsStep; settings.ts:validateHomeRow; products.spec.ts; R1/R3/R4 |
| 01-06.8 | EDGE WIZ-06/ordering: порядок выбранных тегов соответствует добавлению и стабилен после reload; удаление/undo восстанавливает прежнее место. | VERIFIED | products.ts; ProductCombobox/ExclusionsStep/HomeProductsStep; settings.ts:validateHomeRow; products.spec.ts; R1/R3/R4 |
| 01-06.9 | EDGE WIZ-07/boundary: blank amount=unknown;0/negative/nonfinite invalid; smallest positive decimal remains positive after parse. | VERIFIED | products.ts; ProductCombobox/ExclusionsStep/HomeProductsStep; settings.ts:validateHomeRow; products.spec.ts; R1/R3/R4 |
| 01-06.10 | EDGE WIZ-07/adjacency: duplicate chip/search selection фокусирует existing row; сходные names разных ID не сливаются. | VERIFIED | products.ts; ProductCombobox/ExclusionsStep/HomeProductsStep; settings.ts:validateHomeRow; products.spec.ts; R1/R3/R4 |
| 01-06.11 | EDGE WIZ-07/empty: 0rows оставляет поиск/chips; строка без количества явно Количество не указано, не скрытый0. | VERIFIED | products.ts; ProductCombobox/ExclusionsStep/HomeProductsStep; settings.ts:validateHomeRow; products.spec.ts; R1/R3/R4 |
| 01-06.12 | EDGE WIZ-07/ordering: rows insertion order стабилен после edits/reload; undo возвращает row/quantity/unit/flag на своё место. | VERIFIED | products.ts; ProductCombobox/ExclusionsStep/HomeProductsStep; settings.ts:validateHomeRow; products.spec.ts; R1/R3/R4 |
| 01-06.13 | EDGE WIZ-07/precision: полная decimal comma/dot строка finite>0; единицы g/kg/ml/l/pc не конвертируются между размерностями без базы. | VERIFIED | products.ts; ProductCombobox/ExclusionsStep/HomeProductsStep; settings.ts:validateHomeRow; products.spec.ts; R1/R3/R4 |
| 01-06.14 | EDGE WIZ-07/concurrency: stale search response не заменяет новый query/result; repeated Enter during loading не добавляет два ID. | VERIFIED | products.ts; ProductCombobox/ExclusionsStep/HomeProductsStep; settings.ts:validateHomeRow; products.spec.ts; R1/R3/R4 |
| 01-06.15 | UI exclusions/empty: пустые tags имеют доступный поиск, empty query и no results различаются. | VERIFIED | products.ts; ProductCombobox/ExclusionsStep/HomeProductsStep; settings.ts:validateHomeRow; products.spec.ts; R1/R3/R4 |
| 01-06.16 | UI exclusions/loading: listbox aria-busy и Ищем продукты сохраняют текущие выбранные IDs. | VERIFIED | products.ts; ProductCombobox/ExclusionsStep/HomeProductsStep; settings.ts:validateHomeRow; products.spec.ts; R1/R3/R4 |
| 01-06.17 | UI exclusions/error: search failure+retry сохраняет query/tags, неизвестный токен не добавляется. | VERIFIED | products.ts; ProductCombobox/ExclusionsStep/HomeProductsStep; settings.ts:validateHomeRow; products.spec.ts; R1/R3/R4 |
| 01-06.18 | UI exclusions/populated: listbox highlighted option, named remove и5 checkbox restrictions доступны клавиатурой. | VERIFIED | products.ts; ProductCombobox/ExclusionsStep/HomeProductsStep; settings.ts:validateHomeRow; products.spec.ts; R1/R3/R4 |
| 01-06.19 | UI exclusions/partial: незавершённый query не превращается в tag, reload не теряет IDs. | VERIFIED | products.ts; ProductCombobox/ExclusionsStep/HomeProductsStep; settings.ts:validateHomeRow; products.spec.ts; R1/R3/R4 |
| 01-06.20 | UI exclusions/overflow: tags wrap, listbox vertical scroll max240px, последний tag виден над footer. | VERIFIED | products.ts; ProductCombobox/ExclusionsStep/HomeProductsStep; settings.ts:validateHomeRow; products.spec.ts; R1/R3/R4 |
| 01-06.21 | UI exclusions/zero-one-many:0/1/many tags и1↔0 remove/undo не дают пустой недостижимый row. | VERIFIED | products.ts; ProductCombobox/ExclusionsStep/HomeProductsStep; settings.ts:validateHomeRow; products.spec.ts; R1/R3/R4 |
| 01-06.22 | UI exclusions/long-text: длинное имя переносится, remove44px отдельно, tooltip не единственный текст. | VERIFIED | products.ts; ProductCombobox/ExclusionsStep/HomeProductsStep; settings.ts:validateHomeRow; products.spec.ts; R1/R3/R4 |
| 01-06.23 | UI home-products/empty:0rows показывает copy и поиск/chips; отсутствие quantity текстом. | VERIFIED | products.ts; ProductCombobox/ExclusionsStep/HomeProductsStep; settings.ts:validateHomeRow; products.spec.ts; R1/R3/R4 |
| 01-06.24 | UI home-products/loading: search pending не сбрасывает rows, популярные chips доступны при загруженном каталоге. | VERIFIED | products.ts; ProductCombobox/ExclusionsStep/HomeProductsStep; settings.ts:validateHomeRow; products.spec.ts; R1/R3/R4 |
| 01-06.25 | UI home-products/error: quantity inline/focus, catalog error+retry; недоступный справочник не называется пустым. | VERIFIED | products.ts; ProductCombobox/ExclusionsStep/HomeProductsStep; settings.ts:validateHomeRow; products.spec.ts; R1/R3/R4 |
| 01-06.26 | UI home-products/populated: row содержит product label, quantity-or-unknown, unit, expiry checkbox и named remove. | VERIFIED | products.ts; ProductCombobox/ExclusionsStep/HomeProductsStep; settings.ts:validateHomeRow; products.spec.ts; R1/R3/R4 |
| 01-06.27 | UI home-products/partial: invalid quantity raw остаётся для исправления; неизвестное количество сохраняет отдельный статус. | VERIFIED | products.ts; ProductCombobox/ExclusionsStep/HomeProductsStep; settings.ts:validateHomeRow; products.spec.ts; R1/R3/R4 |
| 01-06.28 | UI home-products/overflow: fields rows stack на360, chip wrap, список растёт в потоке без перекрытия sticky. | VERIFIED | products.ts; ProductCombobox/ExclusionsStep/HomeProductsStep; settings.ts:validateHomeRow; products.spec.ts; R1/R3/R4 |
| 01-06.29 | UI home-products/zero-one-many:0/1/many rows достижимы; remove последней строки и undo возвращают все значения. | VERIFIED | products.ts; ProductCombobox/ExclusionsStep/HomeProductsStep; settings.ts:validateHomeRow; products.spec.ts; R1/R3/R4 |
| 01-06.30 | UI home-products/long-text: product name overflow-wrap:anywhere, label/unit не пропадают, remove44px. | VERIFIED | products.ts; ProductCombobox/ExclusionsStep/HomeProductsStep; settings.ts:validateHomeRow; products.spec.ts; R1/R3/R4 |
| 01-07.1 | D-10: человеческий выбор scope-amendment и его точное происхождение сохранены; повторное согласие не требуется. | VERIFIED | nutrition-calculator.json + amendment + archive; REQUIREMENTS NEXT-10; verify-calculator-decision.mjs |
| 01-07.2 | D-09/D-10: WIZ-09 сохраняет ID как P0 manual target и остаётся Pending до фактической приёмки; прежнее вычисление отдельно NEXT-10 P1, не выполнено. | VERIFIED | nutrition-calculator.json + amendment + archive; REQUIREMENTS NEXT-10; verify-calculator-decision.mjs; хронология Pending до QA сохранена, WIZ-09 Complete относится только к amended manual; вычислительного кредита нет |
| 01-07.3 | D-10: empty/loading/error/partial калькулятора явно deferred P1; формулы/средние нормы и жёсткость nutrition targets остаются открытым Q-03. | VERIFIED | nutrition-calculator.json + amendment + archive; REQUIREMENTS NEXT-10; verify-calculator-decision.mjs |
| 01-07.4 | Расчёты ингредиентов, рецептов, порций, меню, бюджета/покупок и жёсткие пищевые ограничения сохраняют P0. | VERIFIED | nutrition-calculator.json + amendment + archive; REQUIREMENTS NEXT-10; verify-calculator-decision.mjs |
| 01-07.5 | Валидатор продолжает fail-closed REPLAN_REQUIRED для scope-amendment; это не разрешение вычисления. | VERIFIED | nutrition-calculator.json + amendment + archive; REQUIREMENTS NEXT-10; verify-calculator-decision.mjs |
| 01-08.1 | D-16: каждый маршрут и шаг проходит focused keyboard/viewport smoke и полную фактическую проверку без неподтверждённых Safari15/LCP claims. | UNCERTAIN — WARNING | presentation.spec.ts; accessibility.spec.ts; actual JUnit R1–R4; VALIDATION/QA explicit pending evidence; H1–H6: полная приёмка ещё не доказана |
| 01-08.2 | Применимые P0 требования/решения/UI/edges имеют фактическое evidence либо явный QA gap; прежние counts не используются как новый аудит. | VERIFIED | presentation.spec.ts; accessibility.spec.ts; actual JUnit R1–R4; VALIDATION/QA explicit pending evidence |

**Score:** 120/128 truths verified; 8 UNCERTAIN (WARNING), 0 present-but-behavior-unverified, 0 overrides.

### Required Artifacts

Предыдущая часть этой же прерванной проверки получила CLI `verify.artifacts`: **10/10** записей passed. Нынешний verifier независимо прочитал реализацию и связи; это результат уровня exists/substantive, не автоматическое доказательство поведения.

| Artifact / owning plan | L1 exists | L2 substantive | L3 wired / L4 flow | Статус |
|---|---|---|---|---|
| src/app/App.tsx — 01/02 | yes | Реальные Routes, состояние, очередь записи/retry/reset | index.html entry → createRoot(App); Wizard и layout используются; port/storage данные возвращаются в render | VERIFIED |
| src/adapters/guestDraft.ts — 03 | yes | Version/shape check, blocked/error/saved, exact-key reset | App default createGuestDraftAdapter; save/load/reset реально вызываются | VERIFIED |
| src/features/wizard/Wizard.tsx — 04/06 | yes | Четыре экрана, current-step/all-step validation, фокус и review | App передаёт живой draft/onChange; шаги вызывают reducer через App | VERIFIED |
| src/features/wizard/BudgetStep.tsx — 05 | yes | Controlled raw input/range, hint/time/variety | Wizard step 2 → domain parsers/selectors → rendered amount/aria/errors | VERIFIED |
| docs/decisions/nutrition-calculator.json — 07 | yes | human-confirmed ответ, timestamp/source, explicit scope | Amendment/REQUIREMENTS/PRD/UI-SPEC/QA используют этот record; вычисление заблокировано | VERIFIED |
| docs/decisions/nutrition-calculator-amendment.md — 07 | yes | Старый и новый scope, сохранённый archive | Активные требования WIZ-09 manual + NEXT-10 P1 согласованы | VERIFIED |
| .planning/REQUIREMENTS.md — 07 | yes | Все 12 Phase 1 IDs и отложенный NEXT-10 | Roadmap/plans/actual manual implementation используют тот же контракт | VERIFIED; хвост старой общей статистики требует cleanup |
| e2e/presentation.spec.ts — 08 | yes | Полный путь/сводка/raw reload + семь ширин/route states | playwright.config.ts testDir=e2e; реальные page.goto/actions/assertions; R1/R4 | VERIFIED |

10 declarations выше включают повторные владельцы одного артефакта; уникальных путей — 8. Дополнительно прочитаны settings/budget/nutritionTarget/products, все шаги, shared UI/combobox и требуемые tests.

### Key Link Verification

CLI `verify.key-links` ранее вернул negative для **8/8** деклараций. Причина зафиксирована: планы записали source → test и даже self-link 01-08 с `via: observable user behavior assertions`; это отношения доказательства, а не production imports. Нельзя объявлять, будто App импортирует spec. Метаданные планов не исправлялись verifier; WARNING к форме key_links, фактические связи проверены вручную:

| From | To | Via / evidence | Статус |
|---|---|---|---|
| index.html | src/app/App.tsx | module script, createRoot(App) | WIRED |
| App | Wizard → People/Budget/Exclusions/HomeProducts | props draft/onChange, conditional current step | WIRED |
| UI fields | draftReducer → currentDraft/setDraft → persist | controlled callbacks, ref синхронно обновлён до async queue | WIRED |
| persist/load/reset | createGuestDraftAdapter → localStorage draft key | await guarded methods; save success только после setItem | WIRED |
| Wizard validation | validateStep → parsers/product IDs → errors/pendingFocus | post-commit focus; WR-01/WR-02 regression R2/R3 | WIRED |
| ProductCombobox | localProductCatalog.search → items → onSelect → ID arrays | query/retry/token/active guards; real local names adapter | WIRED |
| 01-01 / 02 source → guest/navigation specs | App imported/mounted by fixtures or real page entry | Assertions observe real routes/state/geometry; reverse test→App direction explicit | EVIDENCE LINK VERIFIED |
| 01-03 / 04 / 05 / 06 source → unit/e2e | Tests import actual adapter/domain; browser mounts actual UI | Not a production import of tests; strong value/behavior assertions | EVIDENCE LINK VERIFIED |
| decision JSON → amendment/requirements | explicit record/mapping references | Text/data contract, не JS import | EVIDENCE LINK VERIFIED |
| presentation spec self-link 01-08 | playwright runner → actual App in browser | Self-link не runtime wiring; runner/config/actions проверены | METADATA WARNING; actual runner WIRED |

### Data-Flow Trace (Level 4)

| Rendered artifact/value | Реальный источник | Цепочка | Статус |
|---|---|---|---|
| People/days/goal/budget/manual fields | user input или version-validated localStorage | UI → App.change/currentDraft/reducer → adapter.save; hydrate/retry → setDraft → controlled props | FLOWING |
| Progress/current step | validated draft.step | next/back → step reducer → persistence → Wizard progress/title | FLOWING |
| Budget hint/range | raw budget + people + days | parseBudget/selectBudgetHint/projectSlider → BudgetStep text/aria | FLOWING; это allocation hint, не food price |
| Restriction/exclusion/home rows | IDs из локального names-only каталога + пользовательское quantity/unit/expiry | search promise → listbox → onSelect → draft → rows/review/storage | FLOWING; no invented nutrition/price/allergy facts |
| DraftReview | current user draft после validate всех четырёх шагов | Wizard.review → reviewed → DraftReview | FLOWING; не confirmed/global pantry |
| Welcome/route states/plan presence | config text + injected validated PlanPresencePort | default absent; tests exercise valid/invalid/error/late; production не читает несуществующий plan repository | INTENTIONAL Phase 1 contract; real plan Phase 2 |

DB/API в этой локальной фазе не требуются. Начальные пустые arrays получают данные от UI/load, поэтому это не stub. Names-only seed и default absent не объявлены достоверной базой питания или реальным меню.

### Behavioral Spot-Checks

Собственные проверки возобновлённого verifier: каждая завершилась exit 0 менее 10s wall (~7.1s запуск процесса, ~0.76s Vitest); без серверов и полного suite. Не выбранные `-t` cases не являются disabled tests.

| ID | Команда | Фактический результат |
|---|---|---|
| S1 | `node node_modules/vitest/vitest.mjs run src/adapters/guestDraft.test.ts -t 'retry saves the supplied newest raw value after a failed write'` | 1 passed / 10 filtered, exit 0; newest raw сохраняется после write failure |
| S2 | `node node_modules/vitest/vitest.mjs run src/domain/budget.test.ts -t 'budget hint preserves unrounded per-person-day allocation'` | 1 passed / 46 filtered, exit 0; exact person-day math |
| S3 | `node node_modules/vitest/vitest.mjs run src/domain/nutritionTarget.test.ts -t 'manual parser returns explicit source and person-day basis without mutating raw'` | 1 passed / 21 filtered, exit 0; manual source/person-day/raw неизменны |

### Executed Browser / Release Evidence

Сохранённые XML прочитаны независимо; source/tests assertions проверены, SUMMARY narration не использовалась как доказательство. Повторный full suite verifier не запускал.

| Evidence ID | Actual executed command / artifact | Результат и предел |
|---|---|---|
| R1 | `npm run test:e2e -- --project=chromium`; отдельно firefox; финальный webkit. release-chromium.xml, release-firefox.xml, release-webkit-final.xml | По 112 passed, 0 failures/errors/skipped; Chromium/Firefox до focus fix, final WebKit после. Не current full suite после всех fixes. |
| R1b | focus-cross-browser-final.xml | 70 passed; affected navigation/storage/accessibility Chromium/Firefox после focus fix. |
| R2 | `npx playwright test e2e/storage-retry.spec.ts e2e/storage.spec.ts e2e/nutrition.spec.ts e2e/guest.spec.ts e2e/accessibility.spec.ts --project=chromium --project=webkit --project=firefox`; review-related-186.xml | 186 tests, 185 passed, 1 Firefox context teardown error; Chromium/WebKit 62 each passed. Не 186 green. |
| R3 | Те же пять spec, отдельный Firefox rerun; review-firefox-final.xml/.json/.log | 62 passed, failures=0/errors=0/skipped=0; 63.200s JUnit / 64.172s process. Между этими запусками app/tests не менялись. |
| R4 | UI remediation 6ebde75: docs/qa/phase01.md + UI-REVIEW addendum | Chromium affected 23/23; WebKit targeted 47/47. Предыдущий broad Chromium 68/69 с overflow failure сохранён; targeted repeat не выдан за полный 69. |
| R5 | review-fix own `npm run test:unit -- --run`, typecheck/lint/build | 134 unit /4 files; TypeScript/ESLint/build exit 0, final source 8cd5872; исходные команды/результаты в FIXES/QA, исторический unit-final.log 1.17s не выдаётся за новый fix run. |

R1–R5 — composite coverage: budget/products/presentation не объявлены повторно выполненными после каждого state fix. Исходный Firefox `browserContext.close: Protocol error ... _maybeDontRestoreTabs` и ошибочный isolated rerun сохранены. Позже без code change прошли 1/1, 3/3 и R3; причина нестабильности не доказана и не названа исправлением приложения. Старый release-results.json/первый failing WebKit/первый TS2550 — исторические неуспехи, не финальные агрегаты.

### Independent CR-01 / WR Verification

App.change синхронно обновляет dirty/currentDraft; retry проверяет dirty **после await**, до применения проверяет mounted/revision/resetting. Untouched loaded восстанавливает полный snapshot без save; untouched missing остаётся idle. Edited branch пишет latest currentDraft. reset инвалидирует revision, ждёт очередь, удаляет exact key, сбрасывает dirty только при success. Шесть regression cases проверяют raw bytes, held read edits до/во время, missing, corrupt и failed-write/latest retry. Fixture действительно вызывает App и real adapter, а hold Promise управляет нужным interleaving. Проверка CR-01 теперь independently reviewed в REVIEW-DISPOSITION; generic ручная проверка внутренней логики не остаётся отдельным gate.

WR-01: pendingFocus задаётся до setErrors; effect после React commit фокусирует раскрытый invalid field. WR-02: cleanup ConfirmDialog сначала снимает listeners/aria-hidden/scroll lock, затем выбирает живой initiator либо wizard-title fallback. Reset dialog единственный передаёт fallback; cancelled/failed reset сохраняют initiator/state. Named keyboard/reset cases присутствуют в R2/R3. Исходный REVIEW сохранён; fixed не означает Phase 1 complete.

### Probe Execution

N/A: фаза не migration/tooling, probe-*.sh в scripts нет и планы их не объявляют. `scripts/verify-calculator-decision.mjs` — decision gate, а не замена probe. Его fail-closed `REPLAN_REQUIRED` для scope-amendment сохранён намеренно; это не calculator pass и не runtime defect.

### Requirements Coverage

| Requirement | Source plans | Реальная поддержка | Статус |
|---|---|---|---|
| APP-01 | 01/02/08 | Все P0 guest routes, exact routing/deep reload/error states; App/navigation/guest | SATISFIED automated; реальные функции routes — в назначенных следующих фазах |
| APP-02 | 02/08 | Одна nav DOM, exact 1200 breakpoint/fullscreen, geometry | NEEDS HUMAN H1/H4 для полной приёмки |
| APP-03 | 01/02/08 | Welcome/CTA/config brand + validated presence port | SATISFIED automated; actual plan integration Phase 2 |
| WIZ-01 | 03/04/06/08 | Четыре шага, progress/back/validation/review/focus | SATISFIED automated; H1/H3/H4 accessibility acceptance |
| WIZ-02 | 01/03/04/06/08 | Versioned snapshot/raw reload, safe errors/reset, newest retry | SATISFIED automated; H6 UX decision |
| WIZ-03 | 04 | 1–10 people, 1–7 days, goals/defaults/bounds | SATISFIED |
| WIZ-04 | 05 | safe integer≥500, raw exact, range projection/hint | SATISFIED |
| WIZ-05 | 05 | Time/variety native radios, stable choices/defaults/reload | SATISFIED |
| WIZ-06 | 06 | Five restrictions/product IDs, duplicates, search/undo/stale guards | SATISFIED behavior; prohibition H8 UNVERIFIED |
| WIZ-07 | 06 | Search/popular ID rows, unknown/quantity/unit/expiry, no pantry mutation | SATISFIED behavior; C1 contract WARNING H9 |
| WIZ-09 | 04/07/08 | Amended optional manual target/source/partial-clear/reload; calculator NEXT-10 deferred | SATISFIED amended manual behavior; prohibition H7 UNVERIFIED |
| UX-01 | 01/02/06/08 | Russian/RUB/units/tokens/focus/layout/ARIA | NEEDS HUMAN H3/H4; complete visual/accessibility not proved |

Все **12/12** Phase 1 IDs найдены в PLAN allocation и REQUIREMENTS traceability; ORPHANED=0. REQUIREMENTS tail всё ещё говорит «64 Pending / реализовано 0», хотя таблица пометила шесть IDs Complete: это устаревшая общая статистика, WARNING документации. Verifier не меняет её и не принимает phase на основании этой статистики.

### Decision Coverage

`query check.decision-coverage-verify` фактически выполнен: **17/17**, not_honored=[], blocking=false. Message: “All trackable CONTEXT.md decisions are honored by shipped artifacts.” Это warning-only heuristic; собственный просмотр source/tests выше не заменён этим счётчиком.

### Test Quality Audit

| Test group | Linked requirements | Active/disabled | Circularity / assertion strength | Verdict |
|---|---|---|---|---|
| settings/guestDraft/nutritionTarget/budget unit | WIZ-01/02/03/04/06/07/09 | 134 executed; disabled markers не найдены | Independent literal edge values, exact objects/raw/key isolation; не SUT-generated fixtures | Sufficient |
| guest/navigation/storage/wizard | APP-01/02/03, WIZ-01/02/03 | Active cases R1/R2/R3 | Real actions/reload/history/whole storage bytes; value + multi-step behavioral assertions | Sufficient; H6 остаётся judgement |
| budget/nutrition/products | WIZ-04/05/06/07/09 | Active R1/R2/R3/R4 | Exact inputs/IDs/source/queue/error outcomes; data fixtures задают вход, expected не генерируется SUT | Sufficient |
| presentation/accessibility | UX-01 + guest flow | Active R1/R2/R3/R4 | Actual browser geometry/focus/sticky conditions and seven-width complete user journey | Sufficient for automation, H1–H5 not covered |
| storage-retry CR-01 | WIZ-02 | Six cases, all 3 browsers executed | Full raw string equality and full latest expected draft; explicit controlled await | Sufficient; independent review completed |

Disabled linked tests: **0**. Circular expected generators: **0**. Insufficient assertions for claimed automated predicates: **0**; presence/type-only tests не использовались для runtime acceptance. `page.screenshot` writes только QA artifacts, expected не извлекается из SUT. Fixture seed и noPlan отсутствующего меню соответствуют declared phase boundary; undeclared-precondition/incidental-ordering/fixture-only reliance для VERIFIED claims не выявлены. Реальный production plan-producer этим evidence не заявлен.

### Anti-Patterns Found

| File / source | Pattern | Severity | Impact |
|---|---|---|---|
| src/e2e/scripts scan | Нет нереференсированных TBD/FIXME/XXX, TODO/HACK/PLACEHOLDER stubs, localStorage.clear, dangerouslySetInnerHTML или console-only handlers | Info | Blocker debt markers=0 |
| HomeProductsStep.tsx:22; UI-SPEC:76 | Выбор результата сразу добавляет ID; отдельной «Добавить продукт» нет | WARNING C1 | Функциональное добавление wired/tested; несогласованная interaction model требует H9, waiver отсутствует |
| PLAN key_links all 8 | Source→test/self-link обозначены как proof relations | WARNING metadata | CLI pattern negatives не доказывают отсутствие production wiring; реальные связи разобраны выше |
| REQUIREMENTS final Coverage paragraph | Старая общая статистика против Complete rows | WARNING docs | Не меняет mapping 12/12 и не служит evidence завершения |
| Firefox saved JUnit | Teardown protocol error в R2, последующие pass без code change | WARNING infrastructure history | Не скрыт; текущие affected cases доказаны R3, causal fix не объявлен |
| SECURITY original audit + later CR-01 | Первоначальный аудит пропустил контрпример retry untouched | Info + correction | Security addendum и независимый CR-01 review дают последующее evidence; прежнему аудиту это не приписано |

Security: все 13 planned threat entries имеют dispositions (12 mitigation +1 planned low-risk accept), threats_open=0 на high threshold. Это bounded ASVS1, не penetration test. Judgment prohibitions **2 flagged, unverified-prohibition — human review recommended**; в PLAN отсутствует verification tier, поэтому трактуются консервативно как judgment. Применён human-needed soft gate; автоматический PASS запрещён. Ни test-tier enforcement, ни human approval не выдуманы.

### Deferred Items / Later-Phase Filter

Сверено со всей ROADMAP: generation/APP-04/WIZ-08, real plan data, menu nutrition/purchases — Phase 2; recipes/variants — 3; global pantry — 5; final cross-P0 — 7. Они не являются отсутствующими must-haves этой фазы. NEXT-10 — подтверждённый P1 amendment за границами v1 phase roadmap, не молчаливое снятие scope. Открытые H1–H9 не перенесены в Phase 7: D-16 прямо требует приёмки текущих экранов. Реальных BLOCKER/gaps, которые можно было бы скрыть поздней фазой, не обнаружено.

### Human Verification Required

#### H1. Реальный iOS: клавиатура и safe area

**Test:** На iPhone пройти четыре шага, открыть поиск и поля, повернуть экран с открытой клавиатурой.

**Expected:** Каждое поле, ошибка и закреплённое действие достижимы; клавиатура, вырез и нижний индикатор их не закрывают.

**Why human:** Desktop viewport/390×400 и WebKit 27.2 не воспроизводят реальные keyboard/safe area.

#### H2. Safari 15

**Test:** В реальном Safari 15 пройти welcome → мастер → проверка настроек → reload; проверить диалоги и поиск.

**Expected:** Путь и восстановление работают без ошибок, доступны отмена/возврат/ручная цель.

**Why human:** Build target safari15 и современный WebKit не являются выполнением Safari 15.

#### H3. Screen reader и полный контраст

**Test:** Пройти поля, поиск/listbox, ошибки, recovery и диалоги со screen reader; измерить контраст normal/hover/focus/error/disabled.

**Expected:** Названия, состояния и ошибки объявляются понятно и однократно; текст/индикаторы удовлетворяют принятому AA-контракту.

**Why human:** ARIA/focus/geometry assertions не проверяют реальные объявления и весь контраст.

#### H4. Native zoom и визуальная приёмка

**Test:** Включить настоящий browser zoom 200%, пройти все шаги/ошибки/route states и сравнить с PDF-макетами.

**Expected:** Текст и действия целиком читаемы, поля/ошибки не перекрыты, общая композиция согласована.

**Why human:** Тесты меняют CSS font-size; они не доказывают native zoom или человеческое принятие вида.

#### H5. Q-17: методика и LCP

**Test:** Зафиксировать устройство, сеть и cold/warm cache для Q-17; измерить LCP по согласованной методике.

**Expected:** Есть воспроизводимый замер относительно согласованного критерия.

**Why human:** Методика и фактический замер отсутствуют; скорость локального build не доказывает LCP.

#### H6. Конфликт двух вкладок

**Test:** Открыть мастер в двух вкладках, поочерёдно изменить ввод и перезагрузить одну; оценить понятность поведения.

**Expected:** Пользователь понимает независимую память вкладок и последнюю успешную локальную запись; отсутствует обещание синхронизации.

**Why human:** Named backstop непосредственно проверяет last-write поведение, но не принимает UX конфликта.

#### H7. Judgment prohibition: медицинские обещания

**Test:** Просмотреть ручную норму, ошибки и сводку; принять или вернуть на исправление prohibition 01-04.

**Expected:** Ввод/цель не превращаются в непроверенное медицинское предписание или обещание результата питания.

**Why human:** Содержательный safety judgement требует явного человеческого решения; отсутствие формулы — только техническое evidence.

#### H8. Judgment prohibition: аллергия

**Test:** Просмотреть ограничения, поиск и продуктовые подписи; принять или вернуть на исправление prohibition 01-06.

**Expected:** Names-only каталог не обещает безопасность при аллергии или пригодность по похожему названию.

**Why human:** Проверка текста и IDs не является человеческой оценкой пищевых деклараций.

#### H9. C1: модель добавления домашнего продукта

**Test:** Оценить шаг 4: выбор результата сразу добавляет продукт; выбрать принятие этого поведения с обновлением контракта либо восстановление отдельной кнопки «Добавить продукт».

**Expected:** Реализация и UI-SPEC §Interaction contract имеют одну явно принятую модель.

**Why human:** Кнопка из UI-SPEC отсутствует наблюдаемо; рабочее добавление/ID доказаны. Это открытое WARNING UI review, разрешение на waiver не получено.

PLAN 01-08 `<human-check>` (PDF screenshots, keyboard/SR/contrast, iOS, Safari15, judgment/two-tab) собран сюда и дедуплицирован с VALIDATION M-01…M-06. H7/H8 требуют отдельных явных решений по каждому prohibition. Для H9 недостаточно смены label: отсутствие кнопки известно, нужно согласовать модель либо исправить реализацию.

### Gaps Summary / Verdict

**BLOCKER: 0. WARNING / human verification: 9 групп**, включая 8 UNCERTAIN plan truths и 2 отдельно flagged prohibitions. Автоматизированный гостевой путь, persistence и расчёт allocation hint доказаны; CR-01/WR-01/WR-02 закрыты кодом, реальными regressions и независимым просмотром. Все обязательные device/visual/accessibility/judgement gates ещё не закрыты. По ordered decision tree это **human_needed**, а не passed; Phase 1 не завершена и готовность перейти к Phase 2 не заявлена.

Приложение, STATE/ROADMAP/REQUIREMENTS verifier не менял. Созданы этот report и независимый addendum REVIEW-DISPOSITION. Коммит не выполнялся; fingerprint получен verbatim через `query verification.fingerprint`, статус проверяется owner query после записи.

---

_Verified: 2026-10-27T13:04:29Z_  
_Verifier: the agent (gsd-verifier)_

