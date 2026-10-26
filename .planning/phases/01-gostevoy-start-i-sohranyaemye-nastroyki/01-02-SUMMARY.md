---
phase: 01-gostevoy-start-i-sohranyaemye-nastroyki
plan: "02"
subsystem: ui
tags: [react-router, navigation, accessibility, tokens, vite, eslint, typescript]
requires:
  - phase: 01-01
    provides: Гостевой черновик, welcome, storage и browser harness
provides:
  - Гостевые маршруты с честными empty/error состояниями и выходом
  - Единая навигация с CSS breakpoint 1200px и доступным пояснением профиля
  - Общие UI primitives, семантические токены и строгие quality-команды
affects: [01-03, 01-04, 01-05, 01-06, 01-08]
actuals:
  tokens: 9679
  tasks: 2
  commits: 4
plan_head_before: 5d974a769df910b8a98922a56da1bf0cdb215fed
plan_head_after: 429fc401773e92c7d259763b4581a5b9c2870edd
tech-stack:
  added: []
  patterns: [single navigation DOM with CSS breakpoint, measured nav reserve, accessible custom modal fallback, shared semantic CSS variables, inline PostCSS configuration]
key-files:
  created: [src/features/wizard/Wizard.tsx, src/shared/ui.tsx, src/shared/styles/tokens.css, vite.config.ts, eslint.config.js, tsconfig.json, e2e/navigation.spec.ts]
  modified: [src/app/App.tsx, package.json]
key-decisions:
  - "Один DOM навигации меняет положение CSS media query при 1200px; ResizeObserver резервирует её фактическую высоту при переносах."
  - "Профиль остаётся поясняющим диалогом гостевого режима; custom modal не требует showModal/inert, отсутствующих в Safari 15.0."
  - "Семантические стили переопределяют исходный index fallback без изменения index.html; новые зависимости не добавлены."
requirements-completed: [APP-01, APP-02, APP-03, UX-01]
coverage:
  - id: D1
    description: "Deep-link, reload, browser history, честные состояния разделов и отсутствие stale redirect"
    verification:
      - {kind: e2e, ref: "e2e/navigation.spec.ts#deep routes and neighboring paths have truthful distinct states on reload", status: pass}
      - {kind: e2e, ref: "e2e/navigation.spec.ts#all guest sections are reachable without a plan and preserve browser history", status: pass}
      - {kind: e2e, ref: "e2e/navigation.spec.ts#late presence completion cannot pull the user away from a new route", status: pass}
      - {kind: e2e, ref: "e2e/navigation.spec.ts#navigation does not clear the saved draft or create a plan", status: pass}
    human_judgment: false
  - id: D2
    description: "Адаптивная навигация, fullscreen routes, профиль, trap/Escape/return focus"
    verification:
      - {kind: e2e, ref: "e2e/navigation.spec.ts#CSS owns the exact 1199 to 1200 navigation boundary and fullscreen routes", status: pass}
      - {kind: e2e, ref: "e2e/navigation.spec.ts#profile is one accessible dialog with keyboard trap, Escape and menu return across resize", status: pass}
    human_judgment: false
  - id: D3
    description: "Общие токены, пять ширин, увеличенный текст, literal brand и quality-команды"
    verification:
      - {kind: e2e, ref: "npm run test:e2e -- e2e/navigation.spec.ts --project=chromium", status: pass}
      - {kind: other, ref: "npm run typecheck", status: pass}
      - {kind: other, ref: "npm run lint", status: pass}
      - {kind: other, ref: "npm run build", status: pass}
    human_judgment: false
duration: 13 min
completed: 2026-10-26
status: complete
---

# Phase 1 Plan 2: Гостевые маршруты и общие UI-токены Summary

**Все гостевые разделы доступны через одну адаптивную навигацию; профиль объясняет гостевой режим, а отсутствующие меню, покупки, рецепт и генерация имеют честные состояния и рабочий выход.**

## Performance

- Started: 2026-10-26T16:08:34Z; completed: 2026-10-26T16:21:12Z.
- Tasks: 2/2; application/config/test files: 9.
- Actual tokens: ceil(38,713 realized diff characters / 4), без harness token count. Четыре коммита измерены ledger до отдельного metadata commit.

## Accomplishments

- Маршруты `/`, `/menu`, `/shopping`, `/pantry`, `/plan/new`, `/plan/generating`, `/recipe/:id`, unknown route. Exact matching, deep reload, browser back/forward, сохранение draft и отсутствие ложной генерации подтверждены. Завершение загрузки наличия плана не уводит пользователя с нового route.
- Четыре пункта «Меню», «Покупки», «Дома», «Профиль», отдельное «Новое меню», SVG и aria-current. До 1200px используется нижняя панель, от 1200px — боковая 240px; wizard/generating полноэкранны. Один DOM сохраняет порядок фокуса при resize.
- Диалог имеет title/description, безопасный initial focus, Tab/Shift+Tab trap, Escape, восстановление фокуса и возврат к меню. Фон исключается из accessibility tree на время диалога; cleanup возвращает исходные атрибуты/scroll state.
- Wizard вынесен в feature module. Button/Field/Status/ConfirmDialog доступны для следующих задач. Общие токены следуют светлой зелёной PDF-палитре; rem-шкала поддерживает увеличение текста, ResizeObserver измеряет реальную высоту navigation reserve.
- Inline Tailwind 3.4/PostCSS/autoprefixer, React plugin, Safari 15 build target, Vitest node/include без e2e, strict TypeScript для src/config/e2e и flat ESLint. Ни одной новой зависимости; package-lock не менялся.

## Task Commits

1. **01-02-01 RED** — `799c5e4`: guest routes/navigation behavioral contract.
2. **01-02-01 GREEN** — `4aeea22`: routes, shell, profile, shared primitives и Wizard extraction.
3. **01-02-02 RED** — `c5784e9`: navigation label text scaling.
4. **01-02-02 GREEN** — `429fc40`: semantic tokens и strict project tooling.

## TDD Evidence

- Task 1: `all guest sections are reachable without a plan and preserve browser history` реально выполнился и failed на planned assertion: expected три nav links, actual `[]`. JUnit и semanticAssessment в `.tmp/phase01-02-red.json`; GSD `check tdd-red-evidence` → `RED_EVIDENCE_OK`.
- Task 2: `shared type scale lets navigation labels grow with the user text size` failed на planned assertion: expected 28px, actual 14px. Неизменённый JUnit и semanticAssessment в `.tmp/phase01-02-tokens-red.json`; GSD → `RED_EVIDENCE_OK`. Общая rem-шкала исправила поведение.
- Первый navigation run обнаружил ошибку самого теста: Tab после последнего элемента уходил в browser chrome, поэтому visible focus был вне DOM. Проверка изменена на Shift+Tab к предыдущему контролу. Существующий guest regression обнаружил дублирование бренда welcome/header; повтор убран, тест сохранён.
- Дополнительный REFACTOR commit не требовался: extraction входил в Task 1.

## Verification

| Команда/проверка | Реальный результат |
|---|---|
| `npm run test:e2e -- e2e/navigation.spec.ts e2e/guest.spec.ts --project=chromium` после токенов | 35/35 passed, 21.3s: 12 navigation + 23 guest |
| `npm run test:e2e -- e2e/navigation.spec.ts --project=chromium` после test-only расширения literal header brand | 12/12 passed, 11.5s |
| `npm run typecheck` | exit 0; финальный повтор после изменения test-only case тоже exit 0 |
| `npm run lint` | exit 0; финальный повтор тоже exit 0 |
| `npm run build` | exit 0; 105 modules; `dist/index.html` и generated CSS существуют |
| Production preview через установленный Playwright Chromium | overflow=false, фон rgb(244,246,241), h1=32px, generated CSS реально подключён |
| Responsive/targets/focus/text scale | 360/390/430/768/1280, 1199/1200; 44px цели, 48px primary, увеличенный текст, доступность последнего действия |
| Production screenshots | `.tmp/phase01-02-menu-360.png`, `.tmp/phase01-02-profile-360.png`, `.tmp/phase01-02-menu-1280.png`; визуально просмотрены |
| Supplied mockups | Просмотрены reference-review pages 1 и 6: фон, зелёные действия, карточки, нижняя панель |
| `git diff --check`, stub/security scan | exit 0; TODO/FIXME/placeholder/any/dangerouslySetInnerHTML отсутствуют в изменённом коде |

Playwright MCP не запустился: существующий Chrome profile занят. Его процессы не прерывались; visual verification выполнена отдельным Chromium через установленный Playwright API (`node .tmp/phase01-02-visual.cjs`).

## Deviations from Plan

1. **[Rule 1 — Bug]** Guest regression после добавления shell выявил двойной brand на welcome. Повтор в header убран, один источник `appConfig`/prop сохранён. Found during Task 1; `src/app/App.tsx`; verification: guest long brand/XSS test pass; commit `4aeea22`.
2. **[Rule 3 — Blocking]** SDK `state.update-progress` отказался считать unscoped будущие фазы. После успешного SDK advance/metrics/session и roadmap sync явно обновлён только доказанный прогресс текущей фазы: 2/8 (25%). Готовность остальных фаз не выдумывалась.

## Scope and Remaining Verification

- Завершён только 01-02. Полные шаги мастера, formatter денежных/пищевых величин и соответствующие numeric edge checks принадлежат следующим планам; этот shell не вычисляет и не подставляет суммы/пищевые факты. Будущие разделы имеют намеренные честные состояния по плану, без mock success.
- Все обязательные `<verify>` выполнены. Unit tests пока не создавались/не запускались (назначены следующим планам); Vitest настроен для них. Firefox/WebKit не прогонялись в этом плане; текущий результат относится к Chromium. Браузерный нативный zoom 200%, исторический Safari 15, реальные iOS keyboard/safe areas и screen reader не подтверждены; проверено удвоение размера текста.
- Sticky actions CSS подготовлен; будущие wizard footer/virtual keyboard проверки выполняются с реальными controls в следующих планах. Навигационный reserve измерен и проверен уже здесь.
- Shared requirements не закрыты в REQUIREMENTS: `requirements.ready-ids` вернул ready=[], blocked=[APP-01, APP-02, APP-03, UX-01] до остальных owner summaries. Frontmatter сохраняет allocation array плана.
- Upstream React Router warning остаётся зарегистрированным в WINDOWS; в последней сборке с React plugin warning не выводился, его причина не объявлена исправленной.
- C-04/Q-03 и QA 01-08 остаются воротами; полная Phase 1 не завершена. Предсуществующие untracked skills и skills-lock.json сохранены.

## User Setup Required

Нет внешних сервисов, секретов, платных API или публикации.

## Next Plan Readiness

Готова основа для 01-03; он не выполнялся в этом запуске.

## Self-Check: PASSED

Все 9 application/config/test artifacts существуют. Коммиты 799c5e4, 4aeea22, c5784e9 и 429fc40 проверены предками HEAD; ledger count=4. Неожиданных удалений нет.
