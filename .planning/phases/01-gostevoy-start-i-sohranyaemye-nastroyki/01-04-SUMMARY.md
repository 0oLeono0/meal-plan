---
phase: 01-gostevoy-start-i-sohranyaemye-nastroyki
plan: "04"
subsystem: ui
tags: [react, typescript, wizard, nutrition, playwright, raw-draft]
requires:
  - phase: 01-03
    provides: Versioned draft storage, recovery, exit confirmation and calculator gate validator
provides:
  - People/day steppers, goal selection and persistent four-step navigation
  - Explicit manual nutrition input with strict decimal parsing and source
affects: [01-05, 01-06, 01-07, 01-08, phase-02]
actuals:
  tokens: 9013
  tasks: 2
  commits: 4
plan_head_before: b6e0e2158464d4c65f0a8f6b351592bc6a717c1f
plan_head_after: e3cc3491997e13d3617a8c722e03cccda2dfdc0a
tech-stack:
  added: []
  patterns: [raw text numeric inputs, derived manual target, native radio fieldsets, measured sticky reserve]
key-files:
  created: [src/features/wizard/PeopleStep.tsx, src/features/wizard/NutritionFields.tsx, src/domain/nutritionTarget.ts, src/domain/nutritionTarget.test.ts, e2e/wizard.spec.ts, e2e/nutrition.spec.ts]
  modified: [src/features/wizard/Wizard.tsx, src/domain/settings.ts, src/domain/settings.test.ts]
key-decisions:
  - "Raw counts and nutrition use text/inputMode; no browser sanitizing, rounding or default reapplication."
  - "Manual target is derived from raw values with person-day basis; no second persisted result or formula."
requirements-completed: [WIZ-01, WIZ-02, WIZ-03, WIZ-09]
requirements-completion-scope: "PLAN declaration/contribution only; only WIZ-03 marked complete in REQUIREMENTS.md"
requirements-still-open: [WIZ-01, WIZ-02, WIZ-09]
coverage:
  - id: D1
    description: "People/days/goals, raw reload, step navigation and safe exit"
    verification:
      - {kind: unit, ref: "npm run test:unit -- --run src/domain/settings.test.ts", status: pass}
      - {kind: e2e, ref: "npm run test:e2e -- e2e/wizard.spec.ts --project=chromium", status: pass}
    human_judgment: false
  - id: D2
    description: "Manual nutrition absent/partial/valid, strict finite decimal parsing, source, clear and failed storage"
    verification:
      - {kind: unit, ref: "src/domain/nutritionTarget.test.ts", status: pass}
      - {kind: e2e, ref: "e2e/nutrition.spec.ts", status: pass}
    human_judgment: false
  - id: D3
    description: "360/768/1280 layout with doubled text, no overflow and focused controls above sticky footer"
    verification:
      - {kind: e2e, ref: "e2e/wizard.spec.ts#step1 overflow/long-text", status: pass}
      - {kind: e2e, ref: "e2e/nutrition.spec.ts#manual-nutrition overflow/long-text", status: pass}
    human_judgment: false
  - id: D4
    description: "WIZ-09 safety judgment and calculator priority/formula contract"
    verification: []
    human_judgment: true
    rationale: "Flagged safety prohibition remains unverified; C-04/Q-03 require separate blocking-human decision in 01-07. Manual input does not complete WIZ-09."
duration: 11 min
completed: 2026-10-26
status: complete
---

# Phase 1 Plan 4: Люди, дни, цель и ручная норма Summary

**Сохраняемый первый шаг с границами 1–10/1–7, целями и ручной нормой на человека в день без выдуманных пищевых фактов.**

## Accomplishments

- Нативные radio/fieldset, 4+ устанавливает 4, steppers отключены на границах. Пустые, дробные, незавершённые и nonfinite строки остаются raw, не становятся defaults; enum защищён runtime validation.
- Шаги 1–4, прогресс, Назад/Далее, validation и возврат фокуса на h1. Двойной Далее не пропускает шаг. Exit cancel/confirm сохраняет draft; генерация не имитируется.
- Ручные ккал/Б/Ж/У: все пустые (включая пробелы) означают отсутствие; partial не создаёт target. Полный finite набор требует kcal>0, macros≥0. Поддерживается одна запятая или точка; exponent/mixed/trailing/nonfinite/overflow отклоняются. Источник manual и база person-day явные, исходные строки не изменяются.
- Общие UI primitives/tokens переиспользованы. Высота sticky измеряется ResizeObserver, ошибочное поле прокручивается в центр. Screenshot `.tmp/01-04-nutrition-360.png` просмотрен; 768/1280 screenshots также созданы тестами.

## Task Commits

1. Task 01-04-01 RED — `a69dfa8`; GREEN — `e0a8999`.
2. Task 01-04-02 RED — `bb26b25`; GREEN — `e3cc349`.

Actuals: 36,050 realized scoped diff characters / 4, rounded up = 9,013; four production/test commits measured from persisted ledger. Nine implementation/test files. No new dependencies, worktrees or paid services.

## Verification

| Command | Result |
|---|---|
| `npm run test:unit -- --run src/domain/settings.test.ts` | 38 passed (Task 1) |
| `npm run test:unit -- --run src/domain/nutritionTarget.test.ts` | 2 passed (initial Task 2); subsequently expanded parser coverage |
| `npm run test:unit -- --run src/domain/settings.test.ts src/domain/nutritionTarget.test.ts src/adapters/guestDraft.test.ts` | 71 passed, 3 files, 324ms |
| `npm run test:e2e -- e2e/wizard.spec.ts e2e/nutrition.spec.ts --project=chromium` | 15 passed, 14.1s; wizard 7, nutrition 8 |
| `npm run test:e2e -- e2e/storage.spec.ts --project=chromium --grep 'hydrate before edits\|missing is a new draft\|write retry saves\|corrupt bytes'` | 3 passed, 5.7s; grep matched corruption/reset, hydrate/raw, absent snapshot (no claim that unmatched write-retry ran) |
| `npm run typecheck` | exit 0 |
| `npm run lint` | exit 0 |
| `npm run build` | exit 0, 108 modules, Safari15 target, dist/index.html generated |
| `git diff --check` | exit 0 |

No Firefox/WebKit or full phase release run here; 01-08 owns release verification. Exact Safari 15 and physical mobile keyboard remain unverified. No native browser Back/Forward confirmation guarantee is added: verified step navigation uses in-app buttons; existing route lifecycle remains.

## TDD Gate Compliance

- Task 1 RED: named invalid-goal test failed expected assertion (37 pass/1 fail); `.tmp/01-04-task1-red.json`, `RED_EVIDENCE_OK`. GREEN added runtime enum validation plus tested UI. Other count/default tests already described existing correct domain behavior.
- Task 2 RED: whitespace-only absence assertion failed (1 pass/1 fail). Initial TAP object diff was malformed and GSD returned INVALID_RED. In one batched call GREEN was mistakenly applied before inspecting that rejection. This sequencing violation is explicitly retained here.
- Recovery: reverted only our settings.ts change to pre-GREEN, reran compact assertion with TAP-flat against the actual prior implementation, received `RED_EVIDENCE_OK` in `.tmp/01-04-task2-red.json`, then restored integration and reran green checks. Semantic assessment: target executed and failed for intended absence behavior, no import/setup fault. Additional parser cases cover all fields and malformed numeric forms. WINDOWS entry 3 records the deviation and is fixed after actual RED recovery. No refactor commit required.

## Deviations from Plan

- **[Rule 3 — Blocking]** Task 2 also modifies settings.ts/Wizard.tsx to route validation through one parser and clear validation after explicit clear-all; these files are already plan-owned. No duplicate target storage.
- **[Rule 1 — Bug]** First browser run proved sticky footer overlap at doubled text. Centered invalid-field scrolling fixed it; final three-width assertions pass. Double-click moved physical pointer focus after layout change, so double-click asserts step retention; normal step navigation separately asserts h1 focus.
- **Process correction:** malformed TAP/rejected RED sequencing described above, not hidden as a passing gate.

## Known Stubs and Remaining Gates

- Steps 2–4 expose intentional navigation slots; budget controls belong to 01-05 and product/restriction controls to 01-06. `src/features/wizard/Wizard.tsx`; WINDOWS entry 2 is open until those plans replace the slots. This is explicitly required by 01-04, not completion of the full wizard.
- Calculator formula/mini-form/average defaults are not implemented; C-04/Q-03 and flagged safety judgment remain for 01-07. Manual input never completes WIZ-09 or the phase. Shared WIZ-01/WIZ-02/WIZ-09 stay open; ready-ids returns only WIZ-03.
- Existing upstream build-warning ledger entry was not independently closed; final build emitted no MODULE_LEVEL_DIRECTIVE warning. No skipped tests or unrun owned verify commands. No new network/auth/schema trust boundary.

## Next Readiness

Ready for 01-05, not executed here. No external setup required.

## Self-Check: PASSED

All nine owned implementation/test files exist; task commit hashes a69dfa8/e0a8999/bb26b25/e3cc349 verified as ancestors of HEAD. Production diff committed. Calculator gates and later-plan slots remain explicitly tracked.
