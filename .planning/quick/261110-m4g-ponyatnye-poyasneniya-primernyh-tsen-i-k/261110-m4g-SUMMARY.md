---
phase: quick
plan: 261110-m4g
subsystem: ui
tags: [react, accessibility, estimates, nutrition, pricing]
requires:
  - phase: "03"
    provides: Shared saved menu and shopping projections and recipe views
provides:
  - Compact approximate calculation note on menu, shopping and recipes
  - User-approved estimate policy for CAT-02 and Phase03.1
affects: ["03", "03.1", "04", "06"]
tech-stack:
  added: []
  patterns: [Shared static CalculationNote with native details]
key-files:
  created:
    - src/shared/CalculationNote.tsx
    - e2e/calculation-note.spec.ts
    - docs/decisions/approximate-calculations-amendment.md
  modified:
    - src/features/plan/PlanSummary.tsx
    - src/features/recipe/RecipePage.tsx
    - reference/PRD.md
    - reference/OPEN_QUESTIONS.md
    - .planning/REQUIREMENTS.md
    - .planning/phases/03.1-raznoobraznyy-katalog-privychnyh-blyud/03.1-CONTEXT.md
key-decisions:
  - Prices and nutrition are approximate in the prototype, with documented basis and honest estimate labels
  - Future regional estimates target Saint Petersburg, historical observations preserve actual provenance
  - Technical provenance stays in data and docs, users see a compact plain-language disclosure
requirements-completed: []
actuals:
  tasks: 2
  commits: 1
commits: 1
plan_head_before: fbbd56b26d5994fffb2292193e5aa6f04dca2d54
plan_head_after: 90dccec9dd502736b2a37d1366ceb008383c5e0d
duration: 12min
completed: 2026-11-10
status: complete
---

# Quick 261110-m4g Summary

В меню, покупках и рецепте технический блок заменён сноской «Цены и КБЖУ примерные» и нативным раскрываемым пояснением «Как считаем».

## Выполнено

- Общий статический компонент использует текущие цвета и размеры. Раскрытие по умолчанию свёрнуто, доступно с клавиатуры, имеет44px область нажатия и видимый focus.
- RawID, версии, URL и география удалены из пользовательских пояснений. Исходные данные и сохранённые байты меню остаются доступными для проверки provenance.
- В существующих E2E обновлены только связанные assertions. Проверки трёх стоимостей, КБЖУ, запасов, instance contributions, сохранения, повреждённых данных и точного возврата фокуса продолжают выполняться.
- Решение пользователя10.11.2026 записано в новом decision, зависимых PRD/Q-14/Q-19/CAT-02/Phase03.1 и уточнении предыдущего решения о каталоге. Допускаются обоснованные явно размеченные оценки, поиск идеально точных цен/нутриентов не задерживает ассортимент. Санкт-Петербург применяется к будущей региональной оценке. Текущие наблюдения сохраняют фактическую географию.
- Сохранены записанные родительским агентом UAT1/2pass и feedback. Тест3 остаётся pending, CAT-01…05 остаются Pending. ROADMAP не изменён.

## Коммиты

1. Task1 — `90dccec` — `fix(quick-261110-m4g): simplify approximate price and nutrition notes`.
2. Task2 — metadata commit этого Quick через GSD SDK, включающий decision, требования, STATE, PLAN, SUMMARY и существующую UAT-запись.

Счётчикcommits измерен из сохранённого ledger до финального metadata commit, plan_head_after указывает на кодовый коммит.

## Проверки

- RED. `npx playwright test e2e/calculation-note.spec.ts --project=chromium -g '360px' --reporter=line` дал ожидаемый failure из-за отсутствия сноски в настоящем меню.
- GREEN. Первый прогон нового flow Chromium3/3 при360/768/1280. Сохранённые sourceSnapshots и USDA reference проверены в storage, байты сравниваются после раскрытия, переходов menu→shopping→recipe и настоящего reload.
- Адресный Chromium прогон шести существующих файлов menu/shopping/generation-storage/phase02-presentation/phase03-presentation/phase03-recipes дал87pass/1fail. Единственный failure обнаружил устаревшее ожидание Tab сразу к «Состав». Тест дополнен явной проверкой нового элемента до состава и обратного ShiftTab, остальные assertions сохранены.
- Финальный cross-browser прогон `npx playwright test e2e/calculation-note.spec.ts e2e/phase03-recipes.spec.ts -g 'plain calculation note|real Tab Enter and Space' --reporter=line` дал11pass/1fail. Все9 новых flow прошли наChromium/Firefox/WebKit при360/768/1280. Обновлённая последовательность Tab рецепта прошла наChromium иFirefox. Старый WindowsWebKit gate упал на достижении ссылки меню, строка139, до нового disclosure. Это существующее ограничениеWINDOWS15/16/24/25, оно сохранено в deferred-items.
- Снимки открытой сноски, меню, покупок и рецепта находятся в `.tmp/quick-estimates/`. Выполнен визуальный просмотр открытых блоков на трёх ширинах и полных экранов, перенос текста читаемый. Horizontal overflow проверен автоматически для всех9flows. В логах синтетических fixture-тестов встречались прежние createRoot/HMR сообщения при обновлении dev-модулей, тестовые assertions сохранены.
- `npm run test:unit -- --run` —480/480,20files.
- Финальные `npm run typecheck`, `npm run lint`, `npm run build` —exit0. Build предупреждает о512.32kB chunk, это существующийWINDOWS21.
- `git diff --check` —exit0. Проверены актуальные Web Interface Guidelines для изменённых компонентов, новых замечаний в области Quick нет. Источник рекомендаций — https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md.
- Stubscan изменённых компонентов не выявил заглушек. Новых network/auth/file/schema trust surfaces нет.

## Отклонения и ограничения

Добавлено обновление существующего keyboard-теста из-за нового доступного элемента в tab order. Полный960E2E не запускался. Фактические nativeSafari/устройства/AT/zoom в Quick не проверялись. Исторический verification report сохраняет прежние verdict/fingerprint и требует адресной перепроверки изменённой области. Общая приёмкаPhase03 остаётся открытой. Ближайшее действие — продолжить пользовательскую UAT с теста3.

## Self-Check PASSED

Проверены наличие общего компонента, нового E2E, decision, PLAN и SUMMARY. Коммит90dccec является предкомHEAD. Ledger даёт1кодовый коммит до metadata commit. `git diff --check` завершилсяexit0. Родительские UAT-ответы сохранены.
