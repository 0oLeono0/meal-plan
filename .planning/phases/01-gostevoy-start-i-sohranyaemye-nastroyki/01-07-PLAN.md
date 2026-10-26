---
phase: 01-gostevoy-start-i-sohranyaemye-nastroyki
plan: "07"
type: execute
wave: 5
depends_on: ["01-04"]
files_modified:
  - docs/decisions/nutrition-calculator.json
  - src/features/wizard/PeopleStep.tsx
  - src/features/wizard/CalculatorFields.tsx
  - src/domain/nutritionCalculator.ts
  - src/domain/nutritionCalculator.test.ts
  - e2e/calculator.spec.ts
autonomous: false
requirements: [WIZ-09]
estimate: {tokens: 18000, raw_tokens: 18000, tasks: 2, confidence: low}
must_haves:
  truths:
    - "D-10: C-04/Q-03 разрешается только явным решением человека с source-backed formula+contract либо явной поправкой scope; manual input не завершает WIZ-09/фазу."
    - "D-09: Использовать переносит только подтверждённый результат с происхождением; ручной target не затирается до явного действия."
    - "D-16: все шаги/route states проверяются на360/390/430/768/1280 и1199/1200, keyboard/zoom/target/sticky без page overflow."
    - "UI calculator/overflow: после решения раскрытие и мини-форма растут вертикально на360/200%zoom без горизонтального скролла."
    - "UI calculator/long-text: название/источник/ошибки переносятся, disclosure keyboard accessible и цели≥44px."
    - "Фаза не принимается по modern WebKit как доказательству Safari15; исторический браузер и реальные iOS keyboard/safe-area evidence явно pending до фактической проверки."
  assumptions:
    - id: UI-calculator-empty
      status: unresolved
      statement: "C-04/Q-03: начальная модель sex/age/height/weight/activity и default/absence semantics должны быть подтверждены перед implementation."
    - id: UI-calculator-loading
      status: unresolved
      statement: "C-04/Q-03: local operation/loading semantics не определены; сервис/spinner не изобретаются."
    - id: UI-calculator-error
      status: unresolved
      statement: "C-04/Q-03: formula/coefficient/ranges/error contract требуют source-backed решения."
    - id: UI-calculator-partial
      status: unresolved
      statement: "C-04/Q-03: partial/result/Использовать и происхождение не считаются определёнными ручной нормой."
  artifacts:
    - path: src/features/wizard/PeopleStep.tsx
      provides: "Явное решение C-04/Q-03 и только подтверждённый калькулятор"
  key_links:
    - from: src/features/wizard/PeopleStep.tsx
      to: src/domain/nutritionCalculator.test.ts
      via: "observable user behavior assertions"
---

<objective>
Явное решение C-04/Q-03 и только подтверждённый калькулятор. Только планирование разрешено сейчас; install/code требуют отдельного разрешения. Никаких fake generation, платных API или неподтверждённых фактов.
</objective>
<execution_context>
@C:/Users/Lyonya/.codex/gsd-core/workflows/execute-plan.md
@C:/Users/Lyonya/.codex/gsd-core/templates/summary.md
</execution_context>
<context>
@AGENTS.md
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/REQUIREMENTS.md
@.planning/phases/01-gostevoy-start-i-sohranyaemye-nastroyki/01-CONTEXT.md
@.planning/phases/01-gostevoy-start-i-sohranyaemye-nastroyki/01-RESEARCH.md
@.planning/phases/01-gostevoy-start-i-sohranyaemye-nastroyki/01-UI-SPEC.md
@reference/PRD.md
@reference/OPEN_QUESTIONS.md
</context>

## Artifacts this phase produces

FUTURE gated: docs/decisions/nutrition-calculator.json; CalculatorFields.tsx(CalculatorFields); domain/nutritionCalculator.ts(CalculatorInput,CalculatorResult,calculateNutritionTarget); nutritionCalculator.test.ts; e2e/calculator.spec.ts. Modify PeopleStep.tsx. Exactly6 paths. Validator is produced by01-03. Scope-amendment creates no fictitious calculator files and returns REPLAN_REQUIRED for explicit scoped replan.

<tasks>
<task type="checkpoint:decision" gate="blocking-human" id="01-07-01">
  <name>Явно разрешить противоречие приоритета и контракт расчёта нормы</name>
  <files>docs/decisions/nutrition-calculator.json</files>
  <read_first>01-CONTEXT D-10;PRD5.2 and P1 boundary;OPEN_QUESTIONS C-04/Q-03;01-UI-SPEC four unresolved calculator states.</read_first>
  <decision>Мини-калькулятор остаётся P0 с обоснованным контрактом или переносится в P1 явной поправкой объёма?</decision>
  <context>Подробный мастер содержит мини-форму, сводный приоритет относит расчёт к P1. Нет формулы, коэффициентов, диапазонов, средних норм и условий Использовать. Планировщик не вправе заполнить этот пробел средними значениями/медицинским алгоритмом или считать ручную норму заменой.</context>
  <options>
    <option id="keep-p0"><name>Подтвердить калькулятор в P0</name><pros>Сохраняет вычислительный путь подробного мастера.</pros><cons>До реализации требуется проверяемый источник формулы/коэффициентов, полей/единиц/диапазонов, ошибок, rounding, result/Use/provenance и независимых численных examples; никаких платных сервисов.</cons></option>
    <option id="scope-amendment"><name>Явно перенести расчёт в P1</name><pros>Разрешает продолжить P0 с manual norm после осознанного изменения требований.</pros><cons>Это изменение scope: требуется фактическое подтверждение человека и согласованная правка REQUIREMENTS/ROADMAP/CONTEXT/UI/VALIDATION; текущие планы не могут сами считать калькулятор выполненным.</cons></option>
  </options>
  <action>Подготовить конкретный reviewable decision record, явно перечислив все4 unresolved UI states. Ничего не выбирать/утверждать автоматически. После человеческого ответа агент фиксирует decision=keep-p0 либо scope-amendment, status=human-confirmed, humanConfirmedAt, scopeReferences. Для keep-p0 нужны sourceReferences[], formulaVersion, inputContract (пол/возраст/рост/вес/активность, единицы, допустимость и default/absence), coefficients, rounding, resultContract, errors, useSemantics, absencePolicy и independentExamples минимум2 с expected numeric values. Если это локальный расчёт, synchronous=no artificial loading; если человек не подтвердил основание/безопасный бесплатный контракт, остановиться, не создавать заменяющий алгоритм. Scope-amendment требует amendmentReferences и остановки на scoped replan orchestrator; task02 и phase completion не выполняются по старому контракту. Валидатор из01-03 проверяет перечисленные ключи, заполненность и два разных результата; не приравнивает schema-valid к human-approved без фактического ответа. Формулу выбирает только подтверждённое решение, не шаблон плана.</action>
  <acceptance_criteria>Фактическое решение и основание записаны; keep-p0 разрешает task02 только при полном контракте; amendment требует replan и не выдаётся за реализацию.</acceptance_criteria>
  <verify><automated>node scripts/verify-calculator-decision.mjs docs/decisions/nutrition-calculator.json</automated><fails_when>non-zero exit, missing/unconfirmed/incomplete record; scope-amendment returns nonzero with REPLAN_REQUIRED and never unlocks calculator implementation.</fails_when></verify>
  <resume-signal>Явный ответ человека плюс заполненный контракт keep-p0; для amendment вернуть оркестратору scoped replan.</resume-signal>
  <done>C-04/Q-03 имеют решение с основанием либо workflow остаётся на checkpoint; отсутствие ответа не approval.</done>
</task>

<task type="auto" tdd="true" id="01-07-02">
  <name>Реализовать только подтверждённый расчёт и явное применение результата</name>
  <reversibility rating="costly">FormulaVersion/provenance записываются в target; смена контракта позже затронет сохранённые draft и ожидаемые результаты.</reversibility>
  <files>src/features/wizard/PeopleStep.tsx, src/features/wizard/CalculatorFields.tsx, src/domain/nutritionCalculator.ts, src/domain/nutritionCalculator.test.ts, e2e/calculator.spec.ts</files>
  <read_first>Human-confirmed calculator decision from task01; manual target/domain/settings contract;01-UI-SPEC calculator layout and all4 resolved-by-decision state expectations.</read_first>
  <behavior>RED independent examples produce exactly confirmed outputs under confirmed rounding. Boundary/partial/invalid input gives specified errors; target unchanged until Использовать. Applying result persists source/formulaVersion; manual edit changes provenance to manual; missing target remains absent.</behavior>
  <action>Assert decision validator first; on REPLAN_REQUIRED or missing source stop. Encode the approved deterministic formula and coefficients outside React, with source/version comments, no extrapolation outside confirmed admissibility and no nutrition facts guessed. Write numeric/boundary/error tests from independentExamples before implementation. Add accessible disclosure/fields/validation/result/Use exactly per confirmed contract. Resolve empty/loading/error/partial states from decision, retaining two explicit UI overflow/long-text truths. If operation synchronous do not fabricate spinner; if operation depends on unapproved remote/paid service return blocker instead. Keep medical demographic input ephemeral unless confirmed contract requires persisted fields; save only target/provenance needed for planning. Result does not overwrite manual draft until explicit Use; errors keep existing target. Do not add averages unless absencePolicy explicitly source-backed and confirmed. Tests cover source changes, no silent target overwrite, reload of applied provenance and keyboard/zoom.</action>
  <acceptance_criteria>Confirmed formula examples, validation, state transitions and Use pass; no fabricated facts/service/default; WIZ-09 can be considered only against actual resolved contract.</acceptance_criteria>
  <verify><automated>node scripts/verify-calculator-decision.mjs docs/decisions/nutrition-calculator.json</automated><fails_when>non-zero exit or REPLAN_REQUIRED; calculation work must stop.</fails_when><automated>npm run test:unit -- --run src/domain/nutritionCalculator.test.ts</automated><fails_when>non-zero exit, zero tests, No test files found or independent expected values disagree.</fails_when><automated>npm run test:e2e -- e2e/calculator.spec.ts --project=chromium</automated><fails_when>non-zero exit, zero tests, target changes before Use or missing origin after reload.</fails_when></verify>
  <done>Пользователь получает подтверждённый расчёт и явно применяет результат с происхождением.</done>
</task>
</tasks>

<threat_model>
## Trust Boundaries
Browser input/storage/catalog → validated domain → text UI/draft. ASVS1, blocking threshold high; no account/session/crypto/remote database.
| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|---|---|---|---|---|---|
| T-01-09 | Tampering | formula/Use | high | mitigate | source-backed human decision; independent numeric fixtures; before-Use immutability and provenance |
| T-01-10 | Information disclosure | demographics | medium | mitigate | ephemeral unless confirmed; stored snapshot excludes unapproved demographic fields |
| T-01-SC | Tampering | npm packages | high | mitigate |01-01 blocking-human install preflight, compatible pins/peers/lockfile; no extra packages implicitly |
</threat_model>

<verification>
Все команды предполагают cwd=корень checkout. Root-cwd npm run намеренно не использует prefix: manifest создаётся tracer, его отсутствие сейчас не скрывается. Quick feedback ниже в каждой задаче; длительность ещё не измерена, цель менее60s, при превышении разбить batches без удаления cases. Full release проверка находится в01-08.

</verification>

<success_criteria>
Явное решение C-04/Q-03 и только подтверждённый калькулятор. Все собственные truths подтверждаются реальными тестами либо остаются явно pending/backstop; WIZ-09 и Phase1 не complete без C-04/Q-03 и обязательных фактических QA evidence.
</success_criteria>
<output>
Create .planning/phases/01-gostevoy-start-i-sohranyaemye-nastroyki/01-07-SUMMARY.md with actual commands/results, unresolved gates and duration; no unexecuted pass claims.
</output>
