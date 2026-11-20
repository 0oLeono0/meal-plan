---
phase: 03-sravnenie-variantov-i-prosmotr-retseptov
plan: "10"
subsystem: menu-presentation
tags: [react, date-only, accessible-tabs, exact-projection, playwright]
requires:
  - phase: "03-03"
    provides: Exact recipe context and immutable saved instance allocations
  - phase: "03-04"
    provides: Compiled local RecipeImage with honest failure fallback
provides:
  - Validated actual-date day/week presentation and seven-column desktop composition
  - Exact contextual meal cards with per-portion facts and allocated pantry badges
  - Manual keyboard tabs, return focus and measured shopping action reserve
affects: ["03-09", "03-11", "03-12"]
tech-stack:
  added: []
  patterns: [URL-derived presentation, semantic date-first DOM, measured shared grid rows, guarded local focus origin]
key-files:
  created: [src/domain/menuView.ts, src/domain/menuView.test.ts, src/features/menu/MealCard.tsx, e2e/phase03-presentation.spec.ts, docs/qa/phase03-plan10.md]
  modified: [src/features/menu/MenuPage.tsx, src/domain/presentation.ts, src/domain/presentation.test.ts, src/shared/styles/tokens.css, e2e/phase02-presentation.spec.ts, e2e/phase03-recipes.spec.ts, .planning/phases/03-sravnenie-variantov-i-prosmotr-retseptov/03-VALIDATION.md, .planning/WINDOWS.md]
key-decisions:
  - Derive validated day and mode from URL and current applied dates without persisting presentation or recalculating food facts in React.
  - Keep native date-first semantics and1280 menu grid independent from1200 navigation; measure row and action heights without new dependencies.
  - Preserve failing baseline cancellation-focus tests and register WINDOWS23 for03-11; do not claim complete browser regression acceptance.
requirements-completed: []
requirements-supported: [MENU-02, MENU-03, DATA-04, REC-01]
coverage:
  - id: menu-presentation
    description: Actual dates, exact recipe cards, manual keyboard and unobscured shopping action
    verification:
      - kind: e2e
        ref: e2e/phase03-presentation.spec.ts
        status: pass
      - kind: unit
        ref: src/domain/menuView.test.ts
        status: pass
    human_judgment: false
actuals:
  tokens: 11915
  tasks: 2
  commits: 8
commits: 8
plan_head_before: 50b2a304c7175b2a980a6d9359322f5b98ab5f4c
plan_head_after: 707ce2a64898269742cce76efcaa10765372c165
duration: 28min observed from first RED commit; initial reads not separately timed; user interruption included
completed: 2026-11-07
status: complete
---

# Phase 03 Plan 10: Actual-date menu and exact meal cards Summary

Сохранённое меню показывает фактические1–7дат в дневном/недельном виде, точные карточки и доступный возврат из рецепта;1280grid и закреплённые покупки сохраняют порядок и читаемость.

## Выполненная работа

- 03-10-01: `resolveMenuView`, `menuSearch`, `presentMealCard`, `MealCard`, `MenuDays` используют current saved projection. Один native Link передаёт recipe/variant/instance и проверенные day/mode; модифицированный клик не перехватывается. Per-portion price/nutrition не масштабируются повторно, pantry badge требует positive allocation этого instance.
- 03-10-02: actual dates и query guard, today отдельно от selected, manual Left/Right/Home/End→Enter/Space→Tab panel,4+3mobilewrap, прежний mobilemode после resize; русские формы variants/servings через shared formatter. `ShoppingAction` измеряет bar, учитывает nav один раз и уходит в поток при shortheight/keyboard overlap. Сводки трёх стоимостей, нормы и ограничений сохранены.
- Native day sections и DOM date→breakfast/lunch/dinner/snack→totals сохранены; нет display:contents, ARIAgrid, положительных tabindex или глобального overflow:hidden.1280grid использует measured row heights; nav breakpoint1200 независим. Реальные img4:3 с HTML intrinsic dimensions корректируются height:auto.

## Task Commits

1. Task01 RED — `b0c6c28`.
2. Task01 GREEN — `3b78986`.
3. Task02 RED — `be549f4`.
4. Task02 GREEN — `a7fec05`.
5. Actual-image geometry RED — `1b80115`.
6. Actual-image GREEN и прежний recipe regression contract — `2d93c96`.
7. Actual sequential Tab/panel visibility RED — `0301a36`.
8. Panel visible start GREEN — `707ce2a`.

## Проверка

Последний source: unit477/477 в20files,18.18s; typecheck/lint/build exit0. Build145modules,8.39s, JS513.15kB/gzip145.49kB; advisory chunk>500kB остаётся, как и до этого плана.

Browser: первые2tracer cases прошли и повторены до расширения. Полный выбранный43-case run дал42passed/1failed (oversized panel focus geometry), после подтверждённого RED и исправления fresh affected8/8 прошли за50.2s: все5presentation cases, real recipe, repeated-allocation recipe и sequential saved Tab. Остальные31legacy и4recipe/error cases прошли в предыдущем прогоне, после локального panel onFocus их не повторяли. Полный browser regression pass не заявлен.

Widths360/390/430/768/1280 плюс1199/1200/1279,1/3/7dates, actual image/fallback geometry, stock125/75/0g, literal250kcal/6.25RUB, saved bytes, exact IDs, keyboard/CTA/200%textzoom/shortheight реально проверены. Все5viewport screenshots открыты visual tool. Полные команды, EC mapping, source/threat details и промежуточные результаты: `docs/qa/phase03-plan10.md`.

## TDD Gate Compliance

Task01: real saved generation и synthetic setup исполнились; отсутствующие tab assertions дали реальный RED2failed, JUnit `.tmp/03-10-01-red.json` принят classifier RED_EVIDENCE_OK. GREEN2/2 и повтор tracer2/2.

Task02: TAP-flat26tests/25pass/1formatter assertion fail, `.tmp/03-10-02-red.json`, RED_EVIDENCE_OK. Browser keyboard/shopping assertions `.tmp/03-10-02-browser-red.json` также приняты после исправления clock/setup. GREEN26unit и4browser.

Visual QA нашла отличие actual image от fallback: rendered ratio0.0884, а не4/3; `.tmp/03-10-image-red.json` подтвердил RED. Первоначальный lookup XML использовал неверный config-relative путь, classifier вернул INVALID_RED; временный однострочный fix снят, реальный RED повторён, правильный XML принят, fix восстановлен. Ошибка не скрыта и не считается успешным gate. Panel RED `.tmp/03-10-panel-red.json`: focus дошёл до panel, header.y=-410.046875; после onFocus start scroll реальный sequential Tab прошёл. Отдельный refactor не требовался.

## Deviations from Plan

1. **[Rule1 — Bug] Actual image height.** Найдено при visual QA; CSS aspect-ratio без height:auto сохранял исходный HTML height, тогда как fallback был корректен. Добавлена независимая geometry assertion настоящего img на5widths, исправлен размер. Commits1b80115/2d93c96.
2. **[Rule1 — Bug] Oversized panel focus.** Native Tab выравнивал низ высокой panel и скрывал её заголовок. Проверка не требует уместить весь многокарточный контейнер; отдельный RED требует видимый labelled start, затем реальный Tab по карточкам. Исправлен onFocus только самого panel. Commits0301a36/707ce2a.
3. **[Rule3 — Blocking verification] Старые browser expectations.** С разрешения оркестратора минимально обновлены два прежних e2e файла: explicit week selection вместо defaultweek, scope Link точным instance, existing confirmation и новый полный Tab order. Числа, bytes, stale identity, stock и навигация не ослаблены.

## Deferred Issues

Существующий cancellation-focus defect доказан на baseline50b2a30 только фактически запущенным360px reproducer, exit1. `expect(submit).toBeFocused()` получает inactive после Enter по «Отмена». Exact command из `.tmp/03-10-baseline`: `npm run test:e2e -- e2e/phase02-presentation.spec.ts --project=chromium --workers=1 -g '360px pending cancellation'`. XML сохранён в baseline `.tmp/phase01-playwright.xml`.

Все failing tests сохранены.8cancellation paths исключены только из финального выбранного43-case прогона; они непроверены этим прогоном, не объявлены прошедшими, baseline проверен только для одного reproducer. WINDOWS23open и `deferred-items.md` передают исправление/все8проверок в03-11. Это не новая регрессия03-10.

## Ограничения и следующий шаг

Нет новых stubs, пакетов, endpoints, trust boundaries, каталоговых/ценовых изменений или auth gates. ИИ disclosure видим; картинки не объявляются фотографиями приготовленных блюд или пищевыми фактами. Existing fallback не засчитывается в полноту media;49/52assets, следующий03-09. NativeSafari15/устройства/AT/нативныйzoom остаются отдельной приёмкой. Shared requirements Pending; Phase3 не завершена.

## Метрики

От первого RED commit09:48:31UTC до записи результата10:16UTC — около28min; начальные чтения отдельно не измерены, пользовательское прерывание включено в wallwindow. Persisted ledger `.git/gsd-plan-head-before-03-10` даёт8commits до707ce2a, diff47659символов, ceil(chars/4)=11915tokens на масштабе оценки; harness tokens не использовались.10source/test files, документационные commits отдельно.

## Self-Check: PASSED

Все7проверенных новых артефактов существуют; все8task commits найдены предками HEAD. Измеренный ledger count8, до50b2a30/после707ce2a; code/test changes закоммичены, diff check без ошибок. User untracked skills/lock/cache и milestone.lock не изменены.
