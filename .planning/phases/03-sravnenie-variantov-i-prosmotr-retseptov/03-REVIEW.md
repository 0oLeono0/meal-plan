---
phase: 03-sravnenie-variantov-i-prosmotr-retseptov
reviewed: 2026-11-09T08:30:00Z
depth: standard
delta_reviewed: 2026-11-11
delta_base: ec24f1b
delta_head: b49dc88
delta_status: clean
delta_files_reviewed: 12
delta_files_reviewed_list:
  - src/features/plan/PlanSummary.tsx
  - src/features/recipe/RecipePage.tsx
  - src/shared/CalculationNote.tsx
  - e2e/calculation-note.spec.ts
  - e2e/generation-storage.spec.ts
  - e2e/menu.spec.ts
  - e2e/phase02-presentation.spec.ts
  - e2e/phase03-presentation.spec.ts
  - e2e/phase03-recipes.spec.ts
  - e2e/shopping.spec.ts
  - reference/PRD.md
  - reference/OPEN_QUESTIONS.md
delta_findings: {critical: 0, warning: 0, info: 0, total: 0}
files_reviewed: 122
files_reviewed_list:
  - docs/data/recipe-media-batches/01.json
  - docs/data/recipe-media-batches/02.json
  - docs/data/recipe-media-batches/03.json
  - docs/data/recipe-media-batches/04.json
  - docs/data/recipe-media-batches/05.json
  - docs/data/recipe-media.json
  - docs/data/recipe-media.md
  - docs/decisions/varied-recipe-catalog-amendment.md
  - docs/qa/phase03-accessibility.md
  - docs/qa/phase03-final-validation.md
  - docs/qa/phase03-media-contact-sheet.html
  - docs/qa/phase03-media-review.md
  - docs/qa/phase03-plan01.md
  - docs/qa/phase03-plan02.md
  - docs/qa/phase03-plan03.md
  - docs/qa/phase03-plan04.md
  - docs/qa/phase03-plan05.md
  - docs/qa/phase03-plan06.md
  - docs/qa/phase03-plan07.md
  - docs/qa/phase03-plan08.md
  - docs/qa/phase03-plan10.md
  - docs/qa/phase03-security.md
  - e2e/accessibility.spec.ts
  - e2e/entry-policies.spec.ts
  - e2e/generation-fixtures.ts
  - e2e/generation-races.spec.ts
  - e2e/generation-storage.spec.ts
  - e2e/generation.spec.ts
  - e2e/navigation.spec.ts
  - e2e/no-fish.spec.ts
  - e2e/phase02-presentation.spec.ts
  - e2e/phase03-acceptance.spec.ts
  - e2e/phase03-append.spec.ts
  - e2e/phase03-media.spec.ts
  - e2e/phase03-presentation.spec.ts
  - e2e/phase03-recipes.spec.ts
  - e2e/phase03-recovery.spec.ts
  - e2e/phase03-variants.spec.ts
  - e2e/plan-fixtures.ts
  - public/recipes/beet-cabbage-braise.png
  - public/recipes/beet-carrot-raw-salad.png
  - public/recipes/beet-flour-pancakes.png
  - public/recipes/beet-potato-soup.png
  - public/recipes/beet-rice-pot.png
  - public/recipes/beet-sweet-warm.png
  - public/recipes/beet-tomato-rice.png
  - public/recipes/buckwheat-carrot-breakfast.png
  - public/recipes/buckwheat-potato-mash.png
  - public/recipes/buckwheat-potato-soup.png
  - public/recipes/buckwheat-tomato-breakfast.png
  - public/recipes/buckwheat-tomato-stew.png
  - public/recipes/cabbage-beet-salad.png
  - public/recipes/cabbage-buckwheat-pot.png
  - public/recipes/cabbage-carrot-salad.png
  - public/recipes/cabbage-flour-pancakes.png
  - public/recipes/cabbage-potato-braise.png
  - public/recipes/cabbage-rice-soup.png
  - public/recipes/carrot-potato-puree.png
  - public/recipes/carrot-semolina-cutlets.png
  - public/recipes/carrot-semolina-pudding.png
  - public/recipes/carrot-semolina-soup.png
  - public/recipes/carrot-sweet-ribbons.png
  - public/recipes/carrot-tomato-salad.png
  - public/recipes/carrot-water-pancakes.png
  - public/recipes/flour-dry-flatbread.png
  - public/recipes/millet-beet-pot.png
  - public/recipes/millet-cabbage-soup.png
  - public/recipes/millet-carrot-mash.png
  - public/recipes/millet-potato-stew.png
  - public/recipes/millet-sweet-porridge.png
  - public/recipes/millet-tomato-dinner.png
  - public/recipes/potato-cabbage-mash.png
  - public/recipes/potato-carrot-soup.png
  - public/recipes/potato-dumpling-soup.png
  - public/recipes/potato-flour-cakes.png
  - public/recipes/potato-rice-breakfast.png
  - public/recipes/potato-tomato-braise.png
  - public/recipes/rice-cabbage-pan.png
  - public/recipes/rice-carrot-dinner.png
  - public/recipes/rice-carrot-porridge.png
  - public/recipes/rice-millet-mix.png
  - public/recipes/rice-sweet-porridge.png
  - public/recipes/rice-sweet-snack.png
  - public/recipes/semolina-carrot.png
  - public/recipes/semolina-small-flatbread.png
  - public/recipes/semolina-smooth.png
  - public/recipes/tomato-cabbage-salad.png
  - public/recipes/tomato-carrot-cabbage-salad.png
  - public/recipes/tomato-carrot-dumplings.png
  - public/recipes/tomato-rice-soup.png
  - public/recipes/warm-tomato-carrot.png
  - reference/OPEN_QUESTIONS.md
  - reference/PRD.md
  - scripts/check-recipe-media.mjs
  - src/adapters/activePlan.test.ts
  - src/adapters/activePlan.ts
  - src/adapters/generation.test.ts
  - src/adapters/generation.ts
  - src/app/App.tsx
  - src/data/recipeMedia.test.ts
  - src/data/recipeMedia.ts
  - src/domain/generatePlan.test.ts
  - src/domain/generatePlan.ts
  - src/domain/menuView.test.ts
  - src/domain/menuView.ts
  - src/domain/plan.test.ts
  - src/domain/plan.ts
  - src/domain/planProjection.test.ts
  - src/domain/planProjection.ts
  - src/domain/presentation.test.ts
  - src/domain/presentation.ts
  - src/domain/recipeView.test.ts
  - src/domain/recipeView.ts
  - src/features/generation/controller.test.ts
  - src/features/generation/controller.ts
  - src/features/menu/MealCard.tsx
  - src/features/menu/MenuPage.tsx
  - src/features/plan/PlanLoading.tsx
  - src/features/recipe/RecipePage.tsx
  - src/shared/RecipeImage.tsx
  - src/shared/styles/tokens.css
  - src/test/fixtures/phase02-active-plan-v1.json
findings:
  critical: 1
  warning: 1
  info: 0
  total: 2
status: issues_found
---

# Phase 03 Code Review Report

## Независимый incremental review 11.11.2026

Дельта `ec24f1b..b49dc88` проверена на standard depth в перечисленных12файлах. Рассмотрены текущие компоненты, изменённые assertions и их fixtures, нативные details/summary, shared focus/scroll CSS и поправка пользователя о приблизительных расчётах. Новых BLOCKER или WARNING в этой области не обнаружено. Исторические CR-01 и WR-01 ниже сохраняются с исходным описанием и классификацией, их исправления подтверждены в `03-REVIEW-FIX.md`, disposition fixed записан отдельно.

### Обоснование текущего результата

- `src/shared/CalculationNote.tsx` содержит статический текст, именованный region и нативное раскрытие. Enter/Space обеспечиваются HTML summary. Новый компонент использует существующие токены, минимальную высоту44px и общий `:focus-visible`/scroll-margin. Новых внешних данных, HTML injection или обработчиков записи нет.
- `PlanSummary.tsx` и `RecipePage.tsx` подключают единое пояснение. Три стоимости, КБЖУ, порционные/семейные базисы, запасы, предупреждение о медицинской полноценности и растительном ассортименте сохраняются. Удаление техническихID/URL/географии из UI соответствует явной поправке пользователя10.11.2026. Расчётные функции, sourceSnapshots и сохранённые факты не изменены.
- Новый `e2e/calculation-note.spec.ts` проходит обычный вход генерации настоящего меню, переходы menu→shopping→recipe, reload, проверяет текст disclosure, его Enter/Space и неизменность saved bytes на360/768/1280. Его `summary.focus()` проверяет активацию конкретного disclosure. Реальное последовательное достижение и обратный ShiftTab дополнительно сохранены в обновлённом `phase03-recipes.spec.ts` и existing phase02 keyboard flow.
- Изменения шести существующих E2E заменяют удалённый UI provenance на новое пояснение и проверки сохранённых источников. Assertions независимых сумм, КБЖУ, pantry500−200=300, dated contributions, corrupt/trust/retry guards и точного возврата к карточке сохраняются. Keyboard-тест добавляет новый summary в реальную последовательность и проверяет его состояние без программного focus.
- PRD/Q-14/Q-19 ссылаются на документированное решение. Санкт-Петербург относится к будущим региональным оценкам. Фактические исторические данные сохраняют своё происхождение. Жёсткие аллергии, единицы, бюджет и детерминированные расчёты продолжают действовать.
- Применены локальные React/UX правила и актуальные Web Interface Guidelines. Правила семантики, видимого фокуса, long-content reflow и keyboard controls проверены в изменённой области. [Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md)

### Доказательства и границы

В этом code review выполнены чтение исходников и diff, проверка imports/callers и `git diff --check` с exit0. Новый browser/unit прогон здесь не выполнялся. Quick SUMMARY фиксирует unit480/480, type/lint/build exit0, новые cross-browser flow9/9 и адресные keyboard passes Chromium/Firefox. WindowsWebKit failed gate сохранён как автоматический failure. Исходный полный960=889passed/71unsuccessful и отсутствие полного post-fix960 остаются фактическими границами автоматизации.

Завершённая03-UAT фиксирует пользовательские10/10pass, включая native/device и descriptorless judgments. Это отдельное human evidence. Source/tests в этом review не изменены, коммит не создан. Следующий шаг принадлежит независимой goal verification и workflow владельцу фазы.

Далее сохранён исторический отчёт09.11.2026.

Reviewed 2026-11-09T08:30:00Z. Standard depth. Source HEAD `3209f0fb6f75793652aed5bd2f22167a399df330`.

## Summary

Проверка охватывает 46 файлов кода, тестов и fixture, 24 файла требований, provenance и QA, а также техническую целостность 52 PNG. Основные цепочки включают генерацию → controller → guarded save → active bundle → меню/покупки/контекстный рецепт, ограничения, распределение запасов и нормализацию порций.

Область получена командой `python -X utf8 .tmp/gsd_invoke.py check evaluation-scope --phase 03 --raw`. Resolver вернул `degraded`, причину `no-task-commit-rows` и `rangeBase=e19b6c5036cee80655ddb50d266ecb80a4bd0f4f`. Все существующие пути из key-files 12 SUMMARY сопоставлены с resolver. Дополнительных файлов за пределами его 122 путей не обнаружено. Это расширенная область фазы, восстановленная resolver.

Найдены один BLOCKER восстановления операции выбора и один WARNING доступности повторной ошибки рецепта. Оба сценария отдельно воспроизведены в свежем Chromium через CLI Playwright с фактическими production-модулями. Сценарии используют контролируемые асинхронные порты для доставки отказа и задержки, аналогично существующим adversarial fixtures.

## Narrative Findings (AI reviewer)

## Critical Issues

### CR-01: Повтор после тайм-аута выбора запускает прежний подбор и может заменить набор без подтверждения

**Classification** BLOCKER

**File** `D:/Projects/meal-plan/src/features/generation/controller.ts:237-238`

**Related files** `D:/Projects/meal-plan/src/features/generation/controller.ts:41`, `D:/Projects/meal-plan/src/features/generation/controller.ts:73-76`, `D:/Projects/meal-plan/src/features/generation/controller.ts:220-232`, `D:/Projects/meal-plan/src/features/menu/MenuPage.tsx:190`.

**Issue**

`lastRequest` хранит только append/replace и обновляется внутри `run`. `selectVariant` оставляет прежний request. При тайм-ауте сохранения выбора `timeOut` сбрасывает candidate и переводит snapshot в error с intent select. Общая кнопка «Повторить» вызывает `retryGeneration`, который использует прежнюю операцию append/replace.

После первоначальной генерации `lastRequest.baseRevision` отсутствует, поэтому повтор запускает старый replace. Полученный набор сохраняется поверх прежних вариантов без нового подтверждения. После загрузки существующего меню `lastRequest` может быть null, тогда та же видимая кнопка ничего не делает. При stale baseRevision она также ничего не делает.

**Observed reproduction**

1. Загрузить missing, выполнить успешный initial start и сохранить набор минимум из двух вариантов.
2. При выборе второго варианта задержать второй вызов `ActivePlanPort.save`. Порт сохраняет проверку `guard.isCurrent()` непосредственно перед финальным write.
3. Перевести controller clock в 30000ms и вызвать его deadline callback. Выбор завершается TIMEOUT.
4. Освободить задержанный save. Guard возвращает cancelled.
5. Вызвать обработчик кнопки повтора `retryGeneration()`.

Свежий Chromium с trusted каталогом неизменённого legacy fixture выдал следующие значения.

```text
failed   status=error      intent=select  active=generated-1  generationCalls=1  saveCalls=2
retried  status=succeeded  intent=replace active=generated-1  generationCalls=2  saveCalls=3
```

У синхронного текущего localStorage-порта задержка обычно отсутствует. Асинхронные порты являются явно поддержанным контрактом ActivePlanPort и уже используются в тестах controller/recovery. Сбой относится к этой поддержанной ветке.

**Fix**

Сохранить отдельный retry descriptor текущей операции выбора с variantId и base revision. После selection timeout кнопка повтора должна повторять только сохранение/выбор этого variantId при неизменном active base. Маршрутизировать retry по intent. Очистить или заменить устаревший generation descriptor при выборе. Сохранить guard, отмену просроченной записи и проверку текущей revision.

**Regression**

Добавить controller fake-clock/fake-scheduler тест для initial start → deferred select save → 30000ms timeout → cancelled late write → retry. Проверить unchanged variants/inputs, выбранный целевой variantId, прежнее число generation calls и одну успешную повторную запись. Отдельно проверить тот же retry после load, когда предыдущего generation request нет.

## Warnings

### WR-01: Повторная ошибка каталога оставляет фокус на body после восстановления error screen

**Classification** WARNING

**File** `D:/Projects/meal-plan/src/features/recipe/RecipePage.tsx:29-33`

**Issue**

Retry выставляет `retrying=true` и заменяет error screen на PlanLoading, удаляя сфокусированную кнопку и heading ref. После повторного invalid/rejected результата каталог остаётся в error. `retrying` возвращается в false, заголовок монтируется заново, но effect фокуса зависит только от pathname/search/view.status. Все три значения совпадают с предыдущим render. Фокус остаётся на body, а повторная ошибка не получает ожидаемого focus announcement. При изменении страницы/статуса эффект работает, поэтому существующий positive retry-to-success case этот пробел не ловит.

**Observed reproduction**

На `/recipe/rice-sweet-porridge` подключить CatalogPort, который сначала возвращает invalid. Следующую load задержать до отдельного release event и снова вернуть invalid. Выполнить реальное нажатие «Повторить загрузку», дождаться видимого loading status, освободить второй invalid и дождаться error heading.

```text
initial           activeElement=H1    text=Не удалось загрузить рецепт
afterFailedRetry  activeElement=BODY
nextTab           activeElement=BUTTON text=Повторить загрузку
```

**Fix**

Учитывать `retrying` в effect и выполнять фокусировку при восстановленном экране после завершения retry. Например, добавить `retrying` в dependencies и вызывать `heading.current?.focus()` только при `!retrying`. Сохранить отмену/изоляцию результата после ухода со страницы.

**Regression**

В existing catalog retry browser case добавить вторую неуспешную загрузку, дождаться завершения реального pending и проверить `toBeFocused()` у error h1. Затем подтвердить сохранение рабочего последующего retry-to-success.

## Verification and limitations

- В этой проверке заново выполнены два адресных Chromium repro. Первый подтвердил focus loss, второй подтвердил intent select → replace и повторный вызов генератора. Первый запуск второго inline repro завершился SyntaxError в проверочном скрипте. Исправленный скрипт выполнен отдельно и дал указанный результат.
- Свежая команда `node scripts/check-recipe-media.mjs --all` завершилась exit0, `checked=52, full=true`. Это проверка ledger/path/hash/IHDR/physical set. Новая человеческая визуальная оценка всех изображений не выполнялась.
- Существующее evidence сохранено в прежних границах. Latest unit478/478, typecheck/lint/build exit0, critical60/60 в трёх движках. Полный initial960 дал889passed/71unsuccessful, затем были отдельные адресные повторные проверки. Полного post-fix960pass нет. Массовый browser/unit suite в этом code review заново не запускался.
- Четыре WINDOWS15/16/24/25 native WebKit anchor failures сохраняются. Их clean-HTML воспроизведение учитывается. Новым дефектом приложения эти platform failures здесь не классифицированы.
- WINDOWS26, native Safari15/device/AT/настоящий200%zoom/safe-area, human UAT и шесть descriptorless prohibitions остаются открытыми. Независимый verifier и приёмка фазы ещё необходимы.
- Отдельный UI review содержит точные отклонения meal/stock colors, native dd margin40px, radius, tabular numerals, copy и повтор фактов в карточке. Исходники этих строк сопоставлены с UI report. В пределах code-review они не дают дополнительно доказанного нарушения расчётов/безопасности или отказа пользовательского действия. Их disposition остаётся в `03-UI-REVIEW.md` и не превращён в дублирующие code warnings.
- Проверка source snapshots и security register учтена как существующее evidence. CR-01 выявляет дополнительную ошибку последовательности recovery и требует исправления независимо от прежнего threat-register sign-off.
- Исходники и тесты в рамках этого review не изменялись. Коммит не создавался.

_Reviewer gsd-code-reviewer. Depth standard._

