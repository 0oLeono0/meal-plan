---
phase: 01-gostevoy-start-i-sohranyaemye-nastroyki
plan: "03"
subsystem: ui
tags: [localStorage, recovery, wizard, playwright, vitest, decision-gate]
requires:
  - phase: 01-02
    provides: Гостевой каркас, Wizard и доступный ConfirmDialog
provides:
  - Сохранение повреждённых raw bytes до явного exact-key reset
  - Memory editing и retry последней версии при read/write failures
  - Подтверждение выхода, границы шагов и защита от повторного перехода
  - Изолированные browser fixtures и строгий calculator decision validator
affects: [01-04, 01-05, 01-06, 01-07, 01-08]
actuals:
  tokens: 11916
  tasks: 2
  commits: 4
plan_head_before: f766bc928e8e78a294e0ca57d64dfc771418282a
plan_head_after: 404c2311966292174828c55812ab5e3f4cb809fe
tech-stack:
  added: []
  patterns: [exact-key reset after queued writes, latest revision guard, safe cancel dialogs, isolated port fixtures, pure decision schema validator]
key-files:
  created: [src/adapters/guestDraft.test.ts, src/domain/settings.test.ts, e2e/storage.spec.ts, e2e/fixtures.ts, scripts/verify-calculator-decision.mjs, README.md]
  modified: [src/adapters/guestDraft.ts, src/features/wizard/Wizard.tsx, src/app/App.tsx, package.json]
key-decisions:
  - "Reset waits for any started write, cancels obsolete queued writes, deletes only the draft key and retains memory on failure."
  - "Two tabs have independent memory snapshots; last successful write is observed on reload, with no synchronization guarantee."
  - "Calculator validator checks completeness only; factual human approval and source validity remain mandatory in 01-07."
requirements-completed: [WIZ-01, WIZ-02]
coverage:
  - id: D1
    description: "Raw partial recovery, corruption retention, exact-key reset and storage failures"
    verification:
      - {kind: unit, ref: "src/adapters/guestDraft.test.ts", status: pass}
      - {kind: unit, ref: "src/domain/settings.test.ts", status: pass}
      - {kind: e2e, ref: "e2e/storage.spec.ts#recovery", status: pass}
    human_judgment: false
  - id: D2
    description: "Safe exit, latest write, step bounds/progress and double Next"
    verification:
      - {kind: e2e, ref: "e2e/storage.spec.ts#exit", status: pass}
      - {kind: e2e, ref: "e2e/storage.spec.ts#step validation focuses first error and rapid double Next cannot skip; bounds are only 1–4", status: pass}
    human_judgment: false
  - id: D3
    description: "Calculator gate rejects missing/unconfirmed/incomplete records and requires amendment replan"
    verification:
      - {kind: unit, ref: "src/domain/settings.test.ts#calculator gate accepts only a complete confirmed keep-p0 record and rejects missing contracts", status: pass}
      - {kind: other, ref: ".tmp/phase01-03-validator-cli.json", status: pass}
    human_judgment: false
duration: 14 min
completed: 2026-10-26
status: complete
---

# Phase 1 Plan 3: Восстановление и безопасный выход Summary

**Повреждённый черновик сохраняется до явного сброса; ошибки хранения оставляют доступный ввод, повтор сохраняет последнюю версию, а выход не удаляет настройки и не обещает несостоявшееся сохранение.**

## Accomplishments

- Structural schema/reducer/storage tests проверяют raw partial values, точные шаги 1–4, enum/ID/provenance, идемпотентные load/save, read/write/access/remove exceptions и чужие ключи. Failed reset закрывает запись до успешного чтения или нового reset.
- Подтверждение reset начинает с «Оставить черновик», поддерживает Escape/focus return. При сбое исходные bytes и memory input остаются; успешный сброс не затрагивает sentinel, confirmed settings и pantry. Очередь не может записать старый draft после reset.
- Retry показывает реальное pending status, защищён от повторного запуска и использует текущие memory edits после delayed read. Сохранено появляется только после успешной записи/валидного чтения сохранённой записи.
- Выход с первого шага имеет безопасную отмену; подтверждение сохраняет draft. Pending/error copy честна. Назад/Далее сохраняют raw input; validation фокусирует первое поле, double Next не перескакивает, четвёртый шаг не создаёт шаг 5 или генерацию. Таймер перехода и reset callback очищаются/игнорируются при unmount.
- Calculator validator проверяет human response/source/time, scope/source/version, пять input contracts, coefficients/rounding/result/errors/use/absence, четыре UI states и минимум два разных независимых численных примера. Не выбирает бизнес-решение и не удостоверяет подлинность ответа. README описывает команды и ограничения.

## Task Commits

1. Task 01-03-01 RED — `5fef96c`: storage/domain tests и reset browser contract; устранена test discovery блокировка.
2. Task 01-03-01 GREEN — `98fb892`: exact-key reset, recovery/status и изолированные port fixtures.
3. Task 01-03-02 RED — `dffbe4b`: exit/navigation/concurrency и decision gate assertions.
4. Task 01-03-02 GREEN — `404c231`: safe exit, latest callbacks, validator и README.

Measured actuals: 47,663 realized git diff characters / 4, rounded up. Ledger base/after/count выше; metadata commits не включены в production measurement.

## TDD Evidence

- Unit RED: `guest draft storage > failed reset blocks subsequent writes until a successful read or reset` реально failed: expected blocked, actual saved. 27 executed, 26 pass/1 fail. `.tmp/phase01-03-unit-red.json`; GSD verdict `RED_EVIDENCE_OK`.
- Recovery browser RED: reset control absent, planned visibility assertion failed. `.tmp/phase01-03-browser-red.json`; `RED_EVIDENCE_OK`.
- Exit browser RED: named exit dialog absent, planned visibility assertion failed after immediate route exit. `.tmp/phase01-03-exit-red.json`; `RED_EVIDENCE_OK`.
- Semantic assessment: перечисленные targets реально выполнены и упали на planned assertions, без collection/setup fault. Первоначальный zero-test Vitest run и timeout на click не использовались как RED evidence. Подлинные JUnit reports сохранены в JSON records.
- Validator synthetic values проверяют только completeness gate; не являются формулой, пищевыми фактами или human approval. Дополнительный refactor commit не понадобился.

## Verification

| Команда | Реальный результат |
|---|---|
| `npm run test:unit -- --run src/domain/settings.test.ts src/adapters/guestDraft.test.ts` | 28/28 passed; 2 files; 290ms финальный запуск |
| `npm run test:unit -- --run` | 28/28 passed; до test-only удаления зависимости harness от Node typings |
| `npm run test:e2e -- e2e/storage.spec.ts --project=chromium` | 12/12 passed; 11.5s |
| `npm run test:e2e -- e2e/storage.spec.ts --project=chromium --grep exit` | 3/3 passed; 6.1s финальный запуск |
| Guest/navigation narrow grep: count survives, unknown snapshot, write/read failure, raw fields, double welcome, navigation does not clear, late presence, CSS owns | 9/9 passed; 8.2s |
| `npm run typecheck` | exit 0 после удаления Node API из unit harness |
| `npm run lint` | exit 0 |
| `npm run build` | exit 0; 105 modules; Safari15 target; dist generated |
| Validator CLI via stdin, five synthetic records | keep-p0 complete exit 0; missing/unconfirmed/incomplete exit 1; amendment exit 1 + REPLAN_REQUIRED |
| Validator CLI real missing decision path | expected exit 1, DECISION_UNAVAILABLE; gate remains closed |
| `git diff --check`, stub/security scan | exit 0; нет TODO/FIXME/placeholder/any/localStorage.clear/dangerouslySetInnerHTML в изменённых implementation files |

Recovery warning/reset проверены в потоке при 360px и удвоенном тексте, без horizontal overflow. Диалоги проверены на безопасный initial focus, Escape и возврат фокуса. Newest memory input после pending write, navigation away/return и позднего callback сохраняется. Автоматические browser tests запущены через установленный Playwright Chromium; другие движки и полный phase release suite здесь не запускались.

## Deviations from Plan

1. **[Rule 3 — Blocking]** Существующий storage lifecycle находится в `src/app/App.tsx`, а Wizard получает draft/onChange. Минимальная интеграция reset/saved/retry/revision в App необходима; маршруты и порты сохранены. Commits `98fb892`, `404c231`.
2. **[Rule 3 — Blocking]** `test:unit: vitest --dir src` вместе с config include `src/**/*.test.ts` не находил ни одного теста. Убран повторный `--dir src`, config сохраняет src-only include. `package.json`, commit `5fef96c`; реальные 28 unit tests подтверждены.
3. Shared fixtures созданы в Task 1 для storage failure doubles, затем использованы Task 2; новых production toggles и зависимостей нет.
4. **[Rule 3 — Blocking]** SDK `state.update-progress` снова вернул `phase scope is unscoped, not complete`; после успешных advance/metrics/session/roadmap обновлён только фактический прогресс этой фазы 3/8 (37.5%), без выдуманной готовности будущих фаз.

Временная typecheck ошибка тестового `node:child_process` устранена typed dynamic import чистого validator, без установки @types/node. Итоговые проверки успешны; production contract не менялся из-за harness.

## Scope and Remaining Verification

- Завершён только 01-03. Поля людей/дней/нормы и следующих шагов расширяются назначенными 01-04–01-06; scaffold navigation не объявлен полным мастером. Отсутствующие будущие поля не заменены заглушками данных. Новых блокирующих stubs, skipped tests и unrun plan verifies нет.
- WIZ-01/WIZ-02 shared ownership остаётся открытым до summaries остальных владельцев; allocation array frontmatter не является полным requirement acceptance.
- Two-tab backstop фактически показал независимые memory snapshots и последнюю успешную запись после reload. Межвкладочное слияние, conflict warnings и синхронизация не гарантированы, что явно отражено README. Это наблюдение, не новое правило синхронизации.
- C-04/Q-03 остаются blocking-human решением 01-07; decision record не создан, формула не выбрана, WIZ-09/Phase 1 не завершены. Синтетические validator fixtures не разрешают реализацию калькулятора.
- Historical Safari15, реальные iOS keyboard/safe-area, screen reader, native zoom и полный 3-engine QA относятся к последующей фактической проверке 01-08. Данный план подтвердил Chromium и удвоение текста.
- Предсуществующие untracked skills/skills-lock сохранены; новых неучтённых runtime files нет. Новых network/auth/file-access surfaces в приложении нет; CLI читает только явно переданный локальный decision record/stdin.

## User Setup Required

Нет секретов, платных сервисов, установки новых пакетов или публикации.

## Next Plan Readiness

Основа готова для 01-04; он не запускался в этом исполнении.

## Self-Check: PASSED

Все 10 application/test/tooling/documentation artifacts существуют. Все четыре task commits проверены предками HEAD, ledger count=4. Неожиданных удалений нет.
