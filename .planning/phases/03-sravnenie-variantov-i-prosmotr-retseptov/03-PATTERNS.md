# Phase 03: Сравнение вариантов и просмотр рецептов — Pattern Map

**Mapped:** 2026-11-04
**Scope:** DATA-04, GEN-06/07, MENU-02/03, REC-01/02/04. Карта расширений, не реализация.

## File Classification

Существующие пути ниже точные; новые пути помечены «proposed», окончательное разбиение выбирает planner. Для изменяемого файла лучший аналог обычно он сам. Все названные существующие аналоги проверены через `git -c safe.directory=D:/Projects/meal-plan ls-files -- <path>`; runtime mirrors не используются. Сгруппированные тесты означают отдельный файл для каждого перечисленного модуля.

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality / что переносить |
|---|---|---|---|---|
| `src/domain/plan.ts` | model | transform | этот же файл: 23–38,157–184,210–243 | exact: immutable envelope, полный validator, JSON rational boundary; совместимость legacy, предел 12, глобальные ID |
| `src/domain/generatePlan.ts` | service | batch | этот же файл: 10–33,155–219 | exact: bounded resumable search/ranking; расширить single best в unique top-K, не повторять три независимых поиска |
| `src/adapters/generation.ts` | service | request-response | этот же файл: 8–21 и существующий generate | exact: один deadline/cancel/yield для всего поиска; typed options передавать явно |
| `src/domain/planProjection.ts` | utility | transform | этот же файл: 20–26,61–146 | exact: family/per-portion bases, exact Rational, общий remainder stock |
| `src/domain/recipeProjection.ts` (proposed) | utility | transform | `src/domain/planProjection.ts`: 20–26,61–146 | role-match: pure result union; ingredient contributions и instance coverage из общего ledger |
| `src/domain/recipeContext.ts` (proposed) | utility | request-response | `src/domain/plan.ts`: 157–171 | partial: строгая identity validation; URL/direct/stale resolver ещё отсутствует |
| `src/domain/presentation.ts` | utility | transform | этот же файл: 9–36,58–81 | exact: ru formatters, четыре нутриента, три стоимости; добавить формы порций/вариантов |
| `src/adapters/activePlan.ts` | service | file-I/O | этот же файл: 18–51,64–91 | exact: общий load/save gate и guarded single-key write; не хранить derived totals |
| `src/adapters/trustedCatalogs.ts` | service | transform | этот же файл: 24–33 | exact: сохранить full snapshot trust equality; менять лишь если необходим контракт, не ради картинок |
| `src/features/generation/controller.ts` | controller | event-driven | этот же файл: 103–127,162–176 | exact: select/append/new-set в прежнем владельце active, сериализация записи и retry candidate |
| `src/features/generation/GenerationPage.tsx` | component | event-driven | `src/features/menu/MenuPage.tsx`: 24–30; shared `Status` | role-match: старый active доступен во время append; не уводить append в блокирующий initial-generation flow |
| `src/app/App.tsx` | route/provider | event-driven | этот же файл: 63–65,209–212,267–270 | exact: один controller и useSyncExternalStore; заменить recipe placeholder, сохранить injected ports |
| `src/features/menu/MenuPage.tsx` | component | event-driven | этот же файл: 24–30 + `src/features/plan/PlanSummary.tsx` | exact: saved bundle/load states; добавить actual-date day/week, comparison и recipe links |
| `src/features/menu/MealCard.tsx` (proposed) | component | transform | `src/features/menu/MenuPage.tsx` + `src/features/plan/PlanSummary.tsx` | role-match: semantic heading, shared formatters; новая карточка 4:3/instance Link |
| `src/features/menu/VariantSelector.tsx` (proposed) | component | event-driven | `src/shared/ui.tsx`: Button/Status/ConfirmDialog | role-match: доступные controls, pending/error, подтверждение смены набора |
| `src/features/recipe/RecipePage.tsx` (proposed) | component | request-response | `src/features/shopping/ShoppingPage.tsx`: 17–23,53–55; `src/features/plan/PlanSummary.tsx`: 22–29 | role-match: разные read states, native details, source disclosure; resolver отдельно от JSX |
| `src/features/plan/PlanSummary.tsx` | component | transform | этот же файл: 1–30 | exact: переиспользовать бюджет/источники, не копировать суммы в recipe/card |
| `src/features/plan/PlanLoading.tsx` | component | request-response | этот же файл: 1–8 | exact: расширить kind для recipe при необходимости; status и aria-hidden skeleton |
| `src/features/shopping/ShoppingPage.tsx` | component | transform | этот же файл: 17–23 | exact: всегда snapshot.active; интеграционные изменения лишь для общей выбранной проекции |
| `src/shared/ui.tsx` | component | event-driven | этот же файл: 16–25 и ConfirmDialog implementation | exact: Status, trap/Escape/return focus, Safari15 custom modal |
| `src/shared/styles/tokens.css` | config | transform | этот же файл | exact: расширить прежние tokens/layout, nav breakpoint1200 отдельно от menu-grid1280 |
| `src/shared/RecipeImage.tsx` (proposed) | component | request-response | нет media lifecycle аналога; shared UI только оформление | no analog: 4:3 reserved size, one-shot fallback, eager/lazy; RESEARCH/UI-SPEC |
| `src/data/recipeMedia.ts` (proposed) | model/config | transform | `src/data/catalog.ts`: 1–8,37 | role-match: compiled readonly sidecar, version+recipeId; НЕ добавлять media в bundledCatalog |
| `public/recipes/<recipeId>.png` ×52 | config/static asset | file-I/O | нет | no analog: production map RESEARCH §Local Media; каждый output отдельный |
| `docs/data/recipe-media.json` (proposed) | config/provenance | file-I/O | `src/data/catalog.ts`: 44–67 (только требования evidence) | partial: prompt/artifact/provider/terms/hash/dimensions/review; лицензии food не переносить на media |
| `docs/data/recipe-media.md` (proposed) | config/documentation | file-I/O | нет media-specific аналога | no analog: правила производства/обновления и disclosure |
| `src/domain/{plan,generatePlan,planProjection,presentation}.test.ts`; proposed `recipeProjection.test.ts`, `recipeContext.test.ts` | test | batch | существующие colocated suites этих модулей | exact/role-match: Vitest, независимые exact ожидания, legacy fixture |
| `src/adapters/{activePlan,generation}.test.ts`; `src/features/generation/controller.test.ts` | test | event-driven | существующие suites; controller tests 155–173,182–203 | exact: deferred ports/fake timers, late save/cancel/quota/retry без нового поиска |
| `e2e/phase03-variants.spec.ts`, `e2e/phase03-recipes.spec.ts`, `e2e/phase03-presentation.spec.ts` (proposed) | test | event-driven | `e2e/phase02-presentation.spec.ts`: 62–101,170–186; `e2e/generation-races.spec.ts` | role-match: real generation + injected failures, reload bytes, keyboard/geometry |
| `e2e/generation-fixtures.ts`, `e2e/plan-fixtures.ts` (если нужны новые scenarios) | test | transform | эти же tracked fixtures | exact: расширять injected ports; не обходить production trust gate |

## Pattern Assignments

Пять основных семейств ниже покрывают таблицу. Остальные существующие файлы — точки интеграции; нового независимого store/API не требуется.

### 1. Envelope / identity / search

**Source:** `src/domain/plan.ts` 23–38,210–224; `src/domain/generatePlan.ts` 25–33.
**Apply to:** plan, generator, options adapter, context resolver и соответствующие tests.

```ts
export interface PlanVariant { readonly id: string; readonly instances: readonly RecipeInstance[] }
export interface ActivePlanEnvelope {
  readonly schemaVersion: 1;
  readonly inputs: PlanInputs;
  readonly variants: readonly PlanVariant[];
  readonly activeVariantId: string;
}
```

Переиспользовать полную проверку каждого вхождения и всех ID, а не только active variant. Не копировать текущие ограничения `variants.length > 4`, `id: 'generated-1'` и instance ID только date/slot: это места изменения. Legacy ID оставить читаемыми, новым дать namespace. Fingerprint — canonical date/slot/recipe/normalized servings, без UUID/названия/seed. Append использует сохранённые inputs, исключает fingerprints из выдачи, а не из промежуточного поиска. Нехватка top-K — честный partial result, не доказательство невозможности.

### 2. Shared projection / ingredient basis

**Source:** `src/domain/planProjection.ts` 20–23,99–127.
**Apply to:** recipeProjection, menu cards, recipe ingredient composition, shopping consistency.

```ts
export interface InstanceProjection {
  readonly instance: RecipeInstance; readonly familyNutrition: Nutrition; readonly perPortionNutrition: Nutrition;
  readonly ingredientCost: Rational;
}
```

Текущий ledger распределяет pantry на aggregate rows. При расширении до ingredient/instance allocation сохранить один product remainder, deterministic date/slot/ingredient traversal; не запускать вычитание заново в каждой карточке. Из того же ledger получить totals и coverage. Пример существующего расходования (`planProjection.ts` 110–113):

```ts
const available = convertQuantity(remainder, required.unit, food, food.conversions);
coveredAmount = compare(available.amount, required.amount) > 0 ? required.amount : available.amount;
const consumed = convertQuantity({ amount: coveredAmount, unit: required.unit }, remainder.unit, food, food.conversions);
stock.set(food.productId, { ...remainder, amount: subtract(remainder.amount, consumed.amount) });
```

Не менять tagged unknown на ноль; не удваивать selectedServings/baseServings. Подписи family ingredients и per-portion КБЖУ/цена обязательны. Проверки:500−200=300, сумма coverage по instances равна aggregate, pantry не расходуется между альтернативами.

### 3. Guarded persistence / controller

**Source:** `src/features/generation/controller.ts` 110–122; `src/adapters/activePlan.ts` 18–51,86–91.
**Apply to:** select, append, replacement set, retries; все consumers active bundle.

```ts
return activePlan.save(candidate.plan, { isCurrent: () => owned(op) && writeAllowed });
```

После await проверяются ownership/result; active публикуется только в saved branch:

```ts
if (result.status === 'saved') {
  revision++; writeAllowed = true;
  publish({ status: 'succeeded', active: candidate, candidate: null, lastApplied: candidate.plan.inputs.appliedSettings,
    loadStatus: 'loaded', presence: { status: 'valid', planId: candidate.plan.activeVariantId }, saveError: null });
```

Сохранить очередь `writes`, старые bytes до подтверждения, retained candidate при memory-only и retrySave без поиска. Адаптер заново проверяет все варианты, trust/safety/budget, непосредственно перед setItem проверяет guard. Новая select/append операция также привязана к base revision. `src/adapters/trustedCatalogs.ts` 24–27:

```ts
const trusted = versions.get(catalog.version);
if (!trusted) return catalogError('UNSUPPORTED_CATALOG_VERSION', 'inputs.catalogVersion');
return sameSnapshot(catalog, trusted) ? { status: 'trusted' as const }
  : catalogError('UNTRUSTED_CATALOG_SNAPSHOT', 'inputs.catalog');
```

Media вне этого equality и вне localStorage envelope. Старый v1 ключ/снимок не перезаписывать при простом чтении.

### 4. React pages / shared summary / routing

**Source:** `src/app/App.tsx` 63–65; `src/features/menu/MenuPage.tsx` 24–30; `src/features/plan/PlanSummary.tsx` 1–8,18–26.
**Apply to:** MenuPage, RecipePage, variant/card components, ShoppingPage.

```ts
const controller = useMemo(() => createGenerationController({ generation: generationPort, activePlan: activePlanPort, trustedCatalogs }), [generationPort, activePlanPort, trustedCatalogs]);
const operation = useSyncExternalStore(controller.subscribe, controller.getSnapshot);
```

Imports convention: relative imports; type-only imports отдельно; domain arithmetic вне React. Пример `PlanSummary.tsx` 1–8:

```ts
import type { ActiveBundle } from '../../adapters/activePlan';
import type { PlanProjection } from '../../domain/planProjection';
import { decimal } from '../../domain/quantities';
import { formatCount, formatDateOnly, formatQuantity, selectPlanPresentation } from '../../domain/presentation';
```

Страницы начинают с `const bundle = snapshot.active;`, различают pending/error/corrupt/missing; не создают effect-копии projection. Переиспользовать PlanSummary и native details/summary. Рецепт получает all-three identity; прямой просмотр отдельной веткой, invalid query не превращается в direct. Day/mode и безопасный return URL — presentation state; recipe return должен восстановить focus/scroll, не unconditional history.back. App route269 сейчас placeholder, готовой recipe реализации нет.

### 5. Tests / UI primitives

**Source:** `src/features/generation/controller.test.ts` 155–173,182–203; `e2e/phase02-presentation.spec.ts` 62–101,170–186; `src/shared/ui.tsx`16–25.
**Apply to:** regression/acceptance suites и все новые controls.

Controller suite использует deferred save/load и fake timer advance: проверить pending active, затем late resolve и неизменные bytes. Existing browser check (`phase02-presentation.spec.ts` 182–186):

```ts
const searches = await page.evaluate(() => sessionStorage.getItem('fixture-search-count'));
await page.evaluate(() => sessionStorage.setItem('allow-plan-write', 'yes'));
await page.keyboard.press('Enter');
await expect(page).toHaveURL('/menu');
expect(await page.evaluate(() => sessionStorage.getItem('fixture-search-count'))).toBe(searches);
```

Расширить реальный generate→select→recipe→shopping→reload, не подменять generation готовым красивым plan во всех acceptance tests. Переиспользовать geometry/focus helpers и widths, добавить1199/1200/1279, day/week/return, media error и offline. Старое ожидание `img count=0` в synthetic suite относится к прежнему UI и требует пересмотра после image components. CR-02 seed compatibility suite сохранить.

## Shared Patterns

- **Auth/guards:** гостевое приложение; auth middleware не вводить. Guards здесь — identity, catalog trust, revision, owned operation, writeAllowed.
- **Errors:** tagged unions, постоянный recovery UI; Status только одно полное polite сообщение. `Status` (`src/shared/ui.tsx`16–18) возвращает `<p role="status">{children}</p>`; успех только после saved ack.
- **Validation:** reuse plan/catalog boundary, complete all-variant gates; URL size/shape/context отдельно. Нельзя обходить trust registry для browser fixtures или ради media.
- **Formatting:** `src/domain/presentation.ts`9–36,69–81 — общий ru-RU, RUB, date-only и exact rounding; новые labels расширяют этот модуль.
- **Accessibility/layout:** reuse ConfirmDialog (custom Safari15 modal), shared tokens/buttons, h1 tabindex=-1, skeleton aria-hidden. Одна и та же nav1200/menu1280 граница не подразумевается. Sticky reserve, safe-area и short-height fallback по UI-SPEC.
- **Media:** compiled sidecar и local paths; factual catalog, recipes/sourceSnapshots остаются прежними. Не наследовать CC0 food provenance для созданной иллюстрации. 52 уникальных проверенных ассета — отдельный gate; fallback покрывает только отказ отображения.

## No Analog Found

| File / responsibility | Role | Data Flow | Reason |
|---|---|---|---|
| `src/shared/RecipeImage.tsx` | component | request-response | Нет существующего image/error/lazy lifecycle; использовать UI-SPEC/RESEARCH |
| 52 `public/recipes/*.png` | config/static asset | file-I/O | Нет подходящего полного набора; production map задаёт отдельные изображения |
| media provenance README | config/documentation | file-I/O | Нет media-specific прав/ledger; source catalog даёт лишь evidence discipline |
| URL context/direct/stale resolver (часть proposed recipeContext) | utility | request-response | Plan identity validator — частичный аналог; routing contract новый |

## Metadata

**Analog search scope:** tracked `src/domain`, `src/adapters`, `src/features`, `src/app`, `src/shared`, `src/data`, `e2e`, `docs/data`; остановка после пяти основных семейств. Прочитаны CONTEXT, architecture/pitfalls/media responsibilities RESEARCH, UI-SPEC и project skill indexes. Новые dependencies, P1 и source edits вне карты.

**Files classified:** 30 строк/семейств (шаблоны tests/assets раскрываются planner, это не число физических файлов). **Coverage:** existing files имеют exact self-analogs; новые pure/UI модули — role/partial matches; четыре обязанности без полного аналога явно перечислены. Статистика не объявляет готовность реализации или выполненные тесты.

**Pattern extraction date:** 2026-11-04. В этой задаче проверены tracked paths и сформирован только данный документ; runtime/browser tests не запускались.
