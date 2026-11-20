# Phase 2: Первый допустимый план и рассчитанные покупки — Pattern Map

**Mapped:** 2026-10-27. **Scope:** 20 требований из 02-CONTEXT.md, D-01–D-20.
Пути NEW ниже — предложения планировщику, не существующие exports. Существующие analog paths подтверждены `git ls-files` в scout; mirrors не использованы.
RESEARCH/данные каталога ещё готовятся параллельно: эта карта не утверждает источники, числа или лицензии.

## File Classification

| Proposed new/modified file | Role / flow | Closest existing analog | Quality / responsibility |
|---|---|---|---|
| NEW `src/domain/appliedSettings.ts` | model / transform | `src/domain/settings.ts`, `src/domain/nutritionTarget.ts` | role-match; validate four steps → immutable numeric snapshot |
| NEW `src/domain/catalog.ts` | model / transform | `src/domain/settings.ts` | role-match; unknown-data validation, provenance/reference units/safety |
| NEW `src/domain/plan.ts` | model / transform | `src/domain/settings.ts` | role-match; variants + active ID, dates/instances/seed/catalog/pantry/applied snapshots |
| NEW `src/domain/quantities.ts` | utility / transform | none for arithmetic | new; g/kg, ml/l, compatible basis, no guessed density/piece mass |
| NEW `src/domain/planProjection.ts` | service / transform | `src/domain/nutritionTarget.ts` | role-match only; aggregate whole plan, single pantry allocation, nutrition and 3 costs |
| NEW `src/domain/generatePlan.ts` | service / batch | none | new bounded deterministic search, hard filters before soft ranking, honest failures |
| NEW `src/adapters/catalog.ts` | service / request-response | `src/adapters/products.ts` | role-match; typed local async catalog boundary, versioned validated records |
| NEW `src/data/catalog.ts` | config / transform | `src/adapters/products.ts` | partial; actual food/price/safety records depend on RESEARCH evidence |
| NEW `src/adapters/activePlan.ts` | service / file-I/O | `src/adapters/guestDraft.ts` | exact flow; separate versioned key, load/save results, preserve corrupt data |
| NEW `src/adapters/generation.ts` | service / request-response | `src/adapters/products.ts` | role-match only; typed operation + cancellation, no synchronous fake pending |
| NEW `src/features/generation/useGeneration.ts` | hook / event-driven | `src/app/App.tsx` | partial; request revision, mounted guard, cancel/30s timeout, atomic apply |
| NEW `src/features/generation/GenerationPage.tsx` | component / event-driven | `src/features/wizard/Wizard.tsx` | role-match; fullscreen states/actions, focus and stale callback discipline |
| NEW `src/features/menu/MenuPage.tsx` | component / transform | `src/features/wizard/HomeProductsStep.tsx` (`DraftReview`) | role-match; labelled summaries, actual day/slot instances |
| NEW `src/features/shopping/ShoppingPage.tsx` | component / transform | `src/features/wizard/HomeProductsStep.tsx` | role-match; categories/sources/coverage, shared projection |
| MODIFY `src/app/App.tsx` | provider / event-driven | same file | exact; single draft owner, active plan integration, quick-start and routes |
| MODIFY `src/features/wizard/Wizard.tsx` | component / event-driven | same file | exact; validate/apply/start and preserving skip 3/4 |
| MODIFY `src/features/wizard/HomeProductsStep.tsx` | component / transform | same file | exact; DraftReview launch messaging only when wired |
| NEW domain `*.test.ts`, adapter `*.test.ts` | test / transform, file-I/O | `src/domain/nutritionTarget.test.ts`, `src/adapters/guestDraft.test.ts` | exact test style; independent numeric and fault fixtures |
| NEW `e2e/generation.spec.ts` | test / event-driven | existing e2e storage suites (planner to select ranges) | role-match; wizard/quick-start→cancel/error/retry→menu/shopping→reload |

## Pattern Assignments

### Typed parsed models and readiness — appliedSettings/catalog/plan
**Source:** `src/domain/settings.ts:53–65,120–141`, `src/domain/nutritionTarget.ts:12–15,21–22`.
```ts
export type ManualTargetResult =
  | { status: 'absent' }
  | { status: 'invalid'; errors: NutritionErrors; message: string }
  | { status: 'valid'; target: ManualTarget };
```
Copy discriminated states and unknown guards; keep structural draft validity separate from readiness. `Wizard.tsx:47–57` already loops `validateStep(draft, step)` across 1–4 and focuses the first error. Use that gate before copying arrays/rows into applied snapshot; never apply mere raw draft edits. `parseManualTarget` supplies basis person-day, not food calculations or a physiological formula.

### Typed local ports — catalog/generation/activePlan
**Source:** `src/adapters/products.ts:4–5,20`; `src/adapters/guestDraft.ts:4–14`.
```ts
export interface ProductCatalogPort { search(query: string): Promise<readonly ProductName[]> }
export type DraftSaveResult = { status: 'saved' } | { status: 'blocked' } | { status: 'error' };
```
Copy injected async interfaces and explicit result unions. Define NEW catalog/generation/active-plan contracts; `GuestDraftPort` remains draft-only. Generation results need distinct invalid-data/no-candidate/search-limit/budget evidence/cancel semantics per D-15/16. No current generator producer exists.

### Guarded storage — activePlan
**Source:** `src/adapters/guestDraft.ts:18–36`.
```ts
let writable = false;
// Inside load(), after guarded getItem:
const envelope: unknown = JSON.parse(raw);
// Inside save():
if (!writable || !isSettingsDraft(draft)) return { status: 'blocked' };
```
Use a new key/schema and plan validator, not `isSettingsDraft` for plans. Copy guarded access/read/parse/write failure handling and block writes after corrupt load. Preserve the previous plan until full generation success; memory-only and save retry remain explicit. `PlanPresencePort` in `App.tsx:12–20` needs a real producer backed by validated active-plan load.

### Latest-request and dirty retry — controller/hook/App
**Source:** `src/app/App.tsx:84–94,105–132`.
```ts
const request = ++revision.current;
if (!mounted.current || resetting.current || request !== revision.current) return;
// After await draftPort.load(), retry checks revision AND memoryEdited:
if (!memoryEdited.current) {
  currentDraft.current = result.draft;
  setDraft(result.draft);
}
```
Reuse the discipline, not the draft revision counter for unrelated operations. Generation gets its own request ID/abort/timeout ownership; guard both response apply and queued persistence. Cancellation never installs late success. Keep CR-01: newer memory edits beat hydration/retry snapshots; retain save queue/reset serialization. A new generation must not overwrite editable draft or clear existing plan on failure.

### UI integration — Wizard, generation, menu and shopping
**Source:** `src/features/wizard/Wizard.tsx:1–8,47–57`; imports use relative modules and `import type`; existing `Button`/`ConfirmDialog` are shared UI.
Wire App's `/plan/generating`, `/menu`, `/shopping` placeholders only once real state producers exist. Retain fullscreen route handling, h1 focus, skip-link, Russian state text and shared tokens. `DraftReview` is a labelled `<dl>` summary analog, not a menu data producer. UI-SPEC owns actual layout. One active-plan projection supplies both screens; no calculations in components. Quick-start and preserving skip use the same apply/start gate.

### Test style
**Source:** `src/domain/nutritionTarget.test.ts:1–3,16–22`; `src/adapters/guestDraft.test.ts:1–11`.
```ts
import { expect, it } from 'vitest';
expect(parseManualTarget(raw)).toEqual({ status: 'valid', target: { calories: 1234.5, protein: 12.5, fat: 0, carbohydrates: 100, source: 'manual', basis: 'person-day' } });
```
Use explicit independently calculated expected results, raw-input immutability assertions, parameterized invalid cases, injected Map storage and read/write/remove faults. Add budget boundary/pantry-once/source instances and controlled late-operation tests; synthetic fixtures do not prove real catalog provenance.

## Shared Patterns / No Analog Found

- `parseBudget`/`budgetPeriodLabel` reuse exact period budget; `selectBudgetHint` is NOT cost/minimum; `formatRubles` rounds whole RUB and must NOT replace D-17 two-decimal display/half-up product-row money arithmetic.
- `Unit`/`parseHomeQuantity` reuse input contract; empty quantity stays unknown, never zero/infinite coverage. `allowedUnits` does NOT implement conversion.
- No existing food nutrient/cost engine, pantry subtraction, recipe scaling, bounded solver, provenance catalog or safety classifier exists. New business logic must follow CONTEXT + RESEARCH, not copy misleading UI hints.
- Apply D-17 precision before deciding strict budget, D-12 whole-plan aggregation before one coverage allocation, D-05 local dates and person-day summaries. No intermediate rounding or UTC date shifts.
- No auth requirement/guard is appropriate: accepted guest mode. Do not add calculator/P1, variants UI/Phase3, pantry CRUD/Phase5 or manual shopping/Phase6.

## Metadata
Search reused `.tmp/phase2-scout.md`; extraction used tracked `src/domain`, `src/adapters`, `src/app`, wizard files and two test analogs. No source edits, test runs, dependencies or commits. Source factual gate remains RESEARCH/VALIDATION; proposed paths may be consolidated by planner.
