---
phase: 01-gostevoy-start-i-sohranyaemye-nastroyki
plan: "06"
subsystem: ui
tags: [products, exclusions, pantry-draft, combobox, playwright, validation]
requires:
  - phase: 01-05
    provides: Persistent wizard with exact budget, time and variety
  - phase: 01-07
    provides: Human-confirmed manual P0 scope and deferred automatic calculator
provides:
  - Five dietary restrictions and persistent product-ID exclusions
  - Accessible local product search with stale-response protection and retry
  - Home-product draft with raw quantities, compatible units, expiry and undo
  - Four-step validation and truthful prepared-settings review
affects: [01-08, phase-02, phase-05]
tech-stack:
  added: []
  patterns: [names-only catalog port, raw quantity validation, latest-request guard, timed removal undo]
key-files:
  created: [src/adapters/products.ts, src/shared/ProductCombobox.tsx, src/features/wizard/ExclusionsStep.tsx, src/features/wizard/HomeProductsStep.tsx, e2e/products.spec.ts]
  modified: [src/domain/settings.ts, src/domain/settings.test.ts, src/features/wizard/Wizard.tsx]
key-decisions:
  - "Names-only catalog provides six stable IDs, explicit synonyms and supported input units; it provides no nutrition, price or allergy-safety claims."
  - "Blank quantity is unknown; full positive finite comma/dot decimals retain original text. Units are checked per product without conversion or summation."
  - "Review validates all steps and changes draft only; confirmed settings, global pantry and generation remain later-phase integrations."
requirements-completed: [WIZ-06, WIZ-07]
actuals:
  tokens: 12332
  tasks: 2
  commits: 4
plan_head_before: ada5636fa92c7f9933bc5019d6d1163e5c6d35f0
plan_head_after: eb65717bea96a1dbeba2a6665f181d28a86322a3
coverage:
  - id: D1
    description: Five restrictions, ID exclusions, keyboard search, stale requests, retry, removal and five-second undo
    requirement: WIZ-06
    verification:
      - {kind: e2e, ref: "e2e/products.spec.ts#exclusions (6 Chromium cases)", status: pass}
    human_judgment: false
  - id: D2
    description: Home quantities, unit compatibility, duplicates, expiry, ordering, reload, unsafe text and truthful review
    requirement: WIZ-07
    verification:
      - {kind: unit, ref: "src/domain/settings.test.ts (54 tests)", status: pass}
      - {kind: e2e, ref: "e2e/products.spec.ts#home-products (7 Chromium cases)", status: pass}
    human_judgment: false
duration: 12 min
completed: 2026-10-26
status: complete
---

# Phase 1 Plan 6: Ограничения, продукты дома и проверка настроек Summary

**Четыре шага сохраняют ограничения и домашние продукты по ID, проверяют дробные количества и показывают честную сводку без запуска меню.**

## Accomplishments

- Ровно пять ограничений PRD; теги исключений добавляются из выбранной подсказки Enter/запятой, неизвестный текст не создаёт продукт. Порядок и ID сохраняются после reload, duplicate фокусирует существующий тег.
- Общий combobox с label, listbox, active descendant, arrows/Enter/Escape, loading/empty/error/retry. Trim + NFC + ru lowercase, явные synonyms, без неявного ё/е folding. Последний запрос защищён token/cleanup; повторный Enter при loading не добавляет продукт.
- Шесть популярных продуктов используют каталожные IDs. Домашние строки хранят исходную quantity string, выбранную допустимую единицу и expiry; blank означает unknown, не ноль. Число должно быть полной положительной конечной десятичной записью; единицы не конвертируются. Duplicate фокусирует количество без суммирования.
- Удаление тегов/строк имеет окно undo 5 секунд, восстанавливает исходную позицию и фокус. Повторно добавленная домашняя строка сохраняет новые значения при undo старого удаления.
- «Проверить настройки» проверяет шаги 1–4 по порядку, переводит на первый ошибочный шаг и фокусирует поле. Успех показывает «Настройки подготовлены» и «Запуск меню будет доступен на следующем этапе», включая фактическое происхождение КБЖУ. Sentinel подтверждает неизменность confirmed/pantry.
- Использованы существующие UI tokens, Field/Button и draft actions, без новых зависимостей. Удалены оба оставшихся navigation placeholders; WINDOWS entry2 помечена fixed только после работающих шагов 3/4.

## Task Commits

1. Task01-06-01 RED `326d060`; GREEN `21d36f7`.
2. Task01-06-02 RED `ad9536f`; GREEN `eb65717`.

Actuals: scoped realized git diff = 49,328 characters / 4 = 12,332 tokens; measured task commits = 4. Metadata commit is separate from this measured interval.

## Verification

| Command | Actual result |
|---|---|
| `npm run test:e2e -- e2e/products.spec.ts --project=chromium --grep exclusions` | 6 passed, 7.9s |
| `npm run test:e2e -- e2e/products.spec.ts --project=chromium --grep home-products` | Initial four home cases passed, 6.8s; final suite below adds three cases |
| `npm run test:e2e -- e2e/products.spec.ts --project=chromium` | 13 passed, 12.1s, final source |
| `npm run test:unit -- --run src/domain/settings.test.ts` | 54 passed, 298ms |
| `npm run test:unit -- --run src/domain/settings.test.ts src/adapters/guestDraft.test.ts` | 65 passed, 284ms |
| `npm run test:e2e -- e2e/wizard.spec.ts e2e/storage.spec.ts --project=chromium` | 19 passed, 17.1s |
| `npm run typecheck` | exit0, after final source changes |
| `npm run lint` | exit0, after final source changes |
| `npm run build` | exit0,114 modules, Safari15 build target; dist/index.html exists |
| `git diff --check` | exit0 |

Browser tests actually exercised 360px home overflow/last control visibility, literal malicious long labels, duplicate focus, tag/row order and reload, retry/stale request retention, unknown-vs-zero, raw smallest positive decimal, all-step validation and untouched pantry/confirmed keys. Full browser/viewport release matrix is owned by01-08 and was not run here. Web Interface Guidelines source was reviewed for current components; focused controls, wrapping labels, native controls and inline errors use existing UI contracts.

## TDD Gate Compliance

- Task1 RED reached real step3, expected five checkboxes but received zero. JUnit record `.tmp/01-06-01-red.json` classified RED_EVIDENCE_OK before production changes. GREEN passes all six exclusions cases. Initial fixture errors (two roots after fixture replacement; overly broad query «я» matching a synonym) were corrected without changing search semantics.
- Task2 RED executed54 tests:51 passed/3 failed on product-specific units, whitespace unknown quantity and unknown catalog IDs/restrictions. Initial TAP object diagnostics were unsuitable; reran with genuine JUnit output before GREEN. `.tmp/01-06-02-red.json` classified RED_EVIDENCE_OK.
- Added provenance regression reproduced a constant manual label in the new review; `.tmp/01-06-provenance-red.json` classified RED_EVIDENCE_OK before its fix. Final browser suite passes this regression.
- Both tasks have explicit RED commits preceding GREEN. No refactor-only commit needed; tdd_mode runtime gate is disabled by config.

## Deviations from Plan

**1. [Rule2 - Missing critical validation] Validate restored product IDs and per-product units.** Structural draft loading deliberately accepts unfinished strings and arbitrary nonempty IDs. Readiness now rejects unknown restrictions/products and incompatible units with editable errors; it does not silently discard saved data. Files:settings.ts/ExclusionsStep.tsx; commit `eb65717`.

**2. [Rule1 - Bug] Preserve nutrition provenance in new review.** A fixed «Введено вручную» label misidentified previously saved calculated targets. The review now follows targetSource.kind, matching existing NutritionFields. Reproduced with a browser regression, fixed and verified; file:HomeProductsStep.tsx; commit `eb65717`.

## Issues and Limits

No blocking regression remains in this plan. Names-only local catalog has no nutrition, pricing or suitability data and does not establish allergy safety. Quantities are saved without conversion, pantry subtraction or purchase calculation; those integrations remain later phases. Shared WIZ-01/WIZ-02/UX-01 and manual WIZ-09 remain pending final01-08 acceptance. Automatic calculator NEXT-10 remains P1, formulas remain locked; the human scope amendment does not unlock calculation. Existing upstream build-warning WINDOWS record remains open; final builds here did not emit it. No new network/auth/file-access trust boundary was introduced.

## Next

01-08 is the only incomplete Phase1 plan (7/8 complete). This executor did not start01-08.

## Self-Check: PASSED

All five newly created source/test files exist; all four task commits are ancestors of HEAD. Eight scoped implementation/test paths measured from persisted ledger. No tracked files deleted, no new TODO/FIXME/placeholder, no additional dependency or paid service. Existing unrelated untracked skills and user sources preserved.
