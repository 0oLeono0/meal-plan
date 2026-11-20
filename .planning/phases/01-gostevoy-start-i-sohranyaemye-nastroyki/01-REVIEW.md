---
phase: 01-gostevoy-start-i-sohranyaemye-nastroyki
reviewed: 2026-10-30T13:22:21Z
depth: standard
reviewed_revision: 1789eea2fb7272cef0707bac751c413217890df2
scope_status: explicit
scope_reason: targeted-CR02-fix-independent-re-review
files_reviewed: 5
files_reviewed_list:
  - src/app/App.tsx
  - src/app/generationSeed.ts
  - src/app/generationSeed.test.ts
  - e2e/seed-compatibility.spec.ts
  - docs/qa/phase02-seed-compatibility-fix.md
findings:
  critical: 0
  warning: 0
  info: 0
  total: 0
status: clean
---

# Phase 1: Code Review Report

**Текущий результат 30.10.2026 после исправления `1789eea`: clean, 0 BLOCKER / 0 WARNING / 0 INFO.** CR-02 независимо перепроверен и закрыт; bounded scope текущего повторного ревью — четыре source/test файла и QA-документ в frontmatter. Предшествующее ревью 12 файлов, найденный CR-02 и его RED-воспроизведение сохранены ниже как история. CR-01, WR-01 и WR-02 также остаются исправленными; доказательства в `01-REVIEW-FIXES.md` и `01-REVIEW-DISPOSITION.md`.

**Reviewed:** 2026-10-27T08:43:49Z  
**Depth:** standard  
**Files Reviewed:** 38  
**Status:** issues_found

## Summary

Проверены исходники гостевого каркаса, четырёх шагов, адаптеров, доменной валидации, общих компонентов, конфигурации и тестов на ревизии `c899a1c`, включая presentation fix `6ebde75`. Найден один риск потери сохранённых настроек и два воспроизводимых нарушения управления фокусом.

Область сверена с SUMMARY 01–08 и `check evaluation-scope --phase 01 --raw`. Resolver вернул `degraded / no-task-commit-rows`, расширив область до `phase-range`; произвольный диапазон коммитов не выбирался. В отчёте перечислен точный проверенный source/config/test scope; планировочные артефакты, lockfile и поясняющие документы использованы как контекст, а не как исходный код приложения. Учтены AGENTS.md, domain skill, CONTEXT, UI-SPEC, human-confirmed D-10 amendment, QA и предшествующие аудиты. Structural pre-pass не предоставлен.

Отсутствие реальной генерации, глобального pantry и автоматического NEXT-10 соответствует границе фазы и не является замечанием. Исправленные presentation findings повторно не заявляются; уже зарегистрированное небольшое расхождение C1 выбора продукта не дублируется.

## Narrative Findings (AI reviewer)

## Critical Issues

### CR-01: Повтор после ошибки чтения без редактирования стирает восстановленный черновик

**Classification:** BLOCKER  
**File:** `D:/Projects/meal-plan/src/app/App.tsx:105-117`  
**Related:** `D:/Projects/meal-plan/src/app/App.tsx:45-46`, `D:/Projects/meal-plan/e2e/storage.spec.ts:54-67`

**Issue:** После исходной ошибки `load()` приложение оставляет в памяти `createDraft()`. В `retry()` успешный повторный `load()` проверяет только status: `result.draft` отбрасывается, затем `persist(currentDraft.current)` перезаписывает уже доступный валидный снимок. Если пользователь ещё ничего не менял, это скрытый сброс людей, шага, ограничений, исключений, продуктов и нормы на defaults. Даже восстановление доступа без пользовательского редактирования приводит к потере данных. Это нарушает D-06 о приоритете восстановленных значений и WIZ-02.

**Reproduction / evidence:** На реальном приложении в Chromium, с временно бросающим `Storage.prototype.getItem` для единственного draft key: сохранить валидный draft `people='8', step=3, restrictions=['no-fish'], exclusionIds=['egg']`; перезагрузить с ошибкой чтения; ничего не редактировать; восстановить чтение; нажать «Повторить сохранение». Реально прочитанный localStorage до/после: `8 / 3 / ['no-fish'] / ['egg']` → `2 / 1 / [] / []`, после чего UI сообщает «Сохранено на этом устройстве». Использован обычный App без `mountAppFixture`.

**Test gap:** Существующий recovery retry test заранее меняет людей в памяти и проверяет только сохранение этого нового значения. Случай успешного повторного чтения без изменений в памяти отсутствует.

**Fix:** Отслеживать изменения memory draft после неудачной гидратации. Если до успешного повторного чтения не было изменений, восстановить `result.draft` в `currentDraft`/state и соответствующий шаг; для `loaded` не выполнять запись defaults. Сохранить существующий контракт последних изменений, если пользователь действительно редактировал память, включая изменения во время `await load()`. Добавить regression: исходный снимок с ограничениями и исключениями остаётся побайтно неизменным при retry без редактирования; отдельно сохранить тест редактирования во время delayed retry.

## Warnings

### WR-01: «Далее» не фокусирует ошибку внутри свёрнутой нормы КБЖУ

**Classification:** WARNING  
**File:** `D:/Projects/meal-plan/src/features/wizard/Wizard.tsx:64-70`  
**Related:** `D:/Projects/meal-plan/src/features/wizard/NutritionFields.tsx:13-22`, `D:/Projects/meal-plan/src/features/wizard/Wizard.tsx:26-31`

**Issue:** `setErrors(found)` раскрывает поля нормы только при следующем React commit. Немедленный `focus()` выполняется, пока их родитель ещё `hidden`; браузер его игнорирует. Post-render effect уже существует, но `next()` не задаёт `pendingFocus.current`. В результате нарушен D-08: первый invalid field не получает фокус и прокрутку; на длинном шаге сообщение остаётся вне текущей области просмотра.

**Reproduction / evidence:** Chromium и WebKit, 390×800: открыть «Норма КБЖУ», ввести в калории `1,`, свернуть блок, нажать «Далее». `aria-expanded` становится `true`, шаг остаётся первым, но activeElement — «Далее» в Chromium и `main` в WebKit, а не `#calories`. Поведение проверено исполненным Playwright API сценарием в обоих движках.

**Test gap:** Имеющиеся nutrition tests отправляют форму с уже раскрытыми полями или после reload, который сразу раскрывает непустую норму. Закрытие перед ошибочной отправкой не проверяется.

**Fix:** До `setErrors(found)` записать ID первого invalid field в `pendingFocus.current`; фокусировать и прокручивать его в существующем effect после commit. Проверить свёрнутую partial/invalid норму клавиатурой и на 360px с увеличенным текстом, сохранив существующее раскрытие ошибок.

### WR-02: После успешного сброса на первом шаге фокус теряется на body

**Classification:** WARNING  
**File:** `D:/Projects/meal-plan/src/features/wizard/Wizard.tsx:83-86`  
**Related:** `D:/Projects/meal-plan/src/shared/ui.tsx:60-65`, `D:/Projects/meal-plan/src/features/wizard/Wizard.tsx:25`, `D:/Projects/meal-plan/src/app/App.tsx:130-134`

**Issue:** Успешный reset убирает recovery-состояние и его кнопку-инициатор. Cleanup диалога восстанавливает фокус только если инициатор ещё `isConnected`; fallback отсутствует. На первом шаге `draft.step` остаётся `1`, поэтому effect фокуса заголовка также не запускается. После удаления модального окна пользователь клавиатуры оказывается на `body` без видимого положения в восстановленной форме.

**Reproduction / evidence:** Chromium: записать `{broken` в draft key, открыть `/plan/new`, нажать «Сбросить черновик», подтвердить. После удаления диалога и восстановления defaults `document.activeElement` равен `BODY`; в DOM нет сфокусированного поля или заголовка. Сценарий реально выполнен на обычном приложении.

**Test gap:** Corruption/reset test проверяет initial cancel focus, default people и сохранность чужих ключей; после успешного подтверждения фокус не проверяется. Исправление WebKit returnFocus для отмены не покрывает исчезнувший initiator.

**Fix:** После успешного reset и закрытия диалога передать фокус на доступную точку продолжения, например `#wizard-title` или `#people`, после React commit. Сохранить возврат к инициатору для отмены и неуспешного reset. Добавить regression для успешного сброса с шага 1, когда номер шага не меняется.

## Verification and limits

В ходе ревью выполнены точечные read-only Playwright API сценарии: CR-01 и WR-02 в Chromium; WR-01 и touch selection результата поиска в Chromium/WebKit. Touch selection с `hasTouch=true` добавляет ровно выбранный продукт в обоих проверенных движках; дефект этого сценария не заявляется. Один первоначальный диагностический скрипт остановился на собственном чтении через намеренно заблокированный `getItem`; исправленный скрипт прочитал значения без этого override и завершил воспроизведение. Это не результат suite приложения.

Полный suite повторно не запускался; существующие 134 unit и результаты браузерных/quality проверок относятся к evidence `docs/qa/phase01.md`, а не к новым прогонам ревью. Новые findings воспроизведены поверх этой базы, поэтому прежний green suite их не опровергает. Исходники приложения и тесты не изменены, коммиты не создавались.

Настоящий iOS/клавиатура/safe-area, исторический Safari 15, screen reader/полный contrast, native zoom, финальное визуальное одобрение, LCP и two-tab UX остаются ранее зарегистрированными непроверенными ограничениями приёмки. Ревью не объявляет их пройденными.

---

_Reviewed: 2026-10-27T08:43:49Z_  
_Reviewer: gsd-code-reviewer_  
_Depth: standard_

## Повторное ревью после Phase 2 — 2026-10-30

**Revision:** `0b7f5058af4553ef2fb12bac518a6b7aa5a20f30`. **Depth:** standard. **Scope:** ровно 12 файлов из `files_reviewed_list`, изменившихся относительно прежнего Phase01 covered-input fingerprint. Каждый файл прочитан целиком; проверены вызванные guards и границы draft/applied/active. Новая генерация, меню и покупки соответствуют Phase02 и не считаются нарушением прежних пустых состояний. Отсутствующие варианты, полные рецепты и глобальный pantry относятся к дальнейшим фазам и не заявляются дефектами этого scope.

### CR-02: Запуск меню требует API, отсутствующий в поддерживаемом Safari 15.0–15.3

**Classification:** BLOCKER

**File:** `D:/Projects/meal-plan/src/app/App.tsx:237`
**Related:** `D:/Projects/meal-plan/src/app/App.tsx:256`

**Issue:** `start()` сначала переходит на `/plan/generating`, затем синхронно вызывает `crypto.randomUUID()` для seed без проверки наличия API. Тот же вызов используется после повторной загрузки каталога. В Safari 15.0–15.3 этот метод отсутствует, хотя проект явно поддерживает iOS Safari 15+. Вызов бросает TypeError до `controller.start()`: поиск не начинается, интерфейс оказывается в состоянии «Генерация прервана или не запущена», вместо меню или объяснимого штатного отказа. `build.target=safari15` преобразует синтаксис, но не добавляет Web API. Feature detection/fallback/polyfill в `src` и `index.html` не найден.

**Compatibility evidence:** первичный набор совместимости [MDN browser-compat-data, api/Crypto.json](https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/Crypto.json), раздел `randomUUID.__compat.support`: `safari.version_added=15.4`, `safari_ios=mirror`. В том же наборе `getRandomValues` поддерживается с Safari/iOS Safari 5. [Документация MDN randomUUID](https://developer.mozilla.org/en-US/docs/Web/API/Crypto/randomUUID) дополнительно указывает зависимость от secure context. Дефект воспроизведён именно в secure context, поэтому HTTPS сам по себе его не исправляет на старом Safari.

**Исполненное воспроизведение:** отдельный Chromium context через установленный `@playwright/test`, существующий production preview `http://127.0.0.1:4180/`, без изменения исходников и пользовательского хранилища. До загрузки страницы через `addInitScript` метод `Crypto.prototype.randomUUID` установлен в `undefined`; `getRandomValues` оставлен неизменным. После видимого welcome нажата настоящая кнопка «Меню за 1 клик». Результат реально выполненного запуска:

```json
{
  "url": "http://127.0.0.1:4180/plan/generating",
  "errors": ["crypto.randomUUID is not a function"],
  "api": {"secure": true, "randomUUID": "undefined", "getRandomValues": "function"},
  "headings": ["Генерация прервана или не запущена"],
  "planCount": 0
}
```

Это контролируемая проверка отсутствующего API в текущем Chromium, а не заявление об исполнении настоящего Safari 15.0. Соответствие условия Safari 15.0–15.3 основано отдельно на первичном compatibility dataset. Пользовательские ответы `pass` в UAT сохранены: точная версия Safari в них не указана, и они не устраняют детерминированно воспроизведённое отсутствие fallback.

**Воспроизводимая команда:**

```powershell
node --input-type=module -e 'import { chromium } from "@playwright/test"; const browser=await chromium.launch(); const ctx=await browser.newContext(); const page=await ctx.newPage(); const errors=[]; page.on("pageerror",e=>errors.push(e.message)); await page.addInitScript(()=>Object.defineProperty(Crypto.prototype,"randomUUID",{value:undefined,configurable:true})); await page.goto("http://127.0.0.1:4180/"); await page.getByRole("button",{name:"Меню за 1 клик",exact:true}).click(); await page.waitForTimeout(500); console.log(JSON.stringify({url:page.url(),errors,api:await page.evaluate(()=>({secure:window.isSecureContext,randomUUID:typeof crypto.randomUUID,getRandomValues:typeof crypto.getRandomValues})),headings:await page.getByRole("heading").allTextContents(),planCount:await page.locator("[data-plan-id]").count()},null,2)); await browser.close();'
```

**Fix:** централизовать генерацию seed с проверкой `typeof crypto.randomUUID === 'function'` и совместимым fallback на `crypto.getRandomValues`, доступным в Safari 15.0, без новой зависимости и без изменения пищевых расчётов. Использовать этот путь в обоих местах. Если источник случайности недоступен или бросает исключение, обработать это до перехода либо штатным recovery, сохранив текущее меню и черновик. Добавить regression на настоящий quickstart/submit с отсутствующим `randomUUID`, который проверяет успешное сохранённое меню, а не только отсутствие исключения. Версии поддерживаемого Safari самостоятельно не сужать.

### Остальные результаты и пределы повторного ревью

- Новых доказанных дефектов в остальных 11 scoped files не найдено. CR-01 сохраняет `memoryEdited`-проверку после await; WR-01 использует post-render `pendingFocus`; WR-02 передаёт `fallbackFocusId="wizard-title"`. Исторические три finding остаются исправленными.
- Изменённый no-fish journey сохраняет конкретные assertions raw полей, ID, ручного происхождения, пяти дат/20 вхождений, reload и побайтной неизменности active при последующем редактировании draft. Подмена отказа успешным созданием соответствует поддержанной diet classification, а не вымышленной аллергической гарантии.
- Численные данные тестов не генерируются системой под проверкой в этих scoped assertions; test-only ports остаются только программными harness-параметрами. В production нет тестовых URL или переключателей ошибок.
- Полные suites здесь повторно не запускались. Логи `phase02-final-unit.log` (359/359) и `phase02-prior-browser-coverage.json` (133 + 7 исправленных = 140 case passes, не единый full run) — предшествующее evidence; они не покрывают отсутствующий Web API. Новая исполненная проверка этого ревью — только приведённое воспроизведение.
- Текущий итог: **1 BLOCKER / 0 WARNING / 0 INFO**, `status: issues_found`. Исходники, тесты, UAT, Phase02 и глобальный проектный статус не изменялись. Коммит не создан.

## Независимый re-review исправления CR-02 — 2026-10-30

**Revision:** `1789eea2fb7272cef0707bac751c413217890df2`. **Результат:** CR-02 fixed; текущих BLOCKER/WARNING/INFO — 0. Предыдущий finding и исходное воспроизведение выше сохранены; они описывают состояние до исправления.

Перечитаны `App.tsx`, `generationSeed.ts`, полный unit-файл, пять browser-сценариев и QA evidence. В `App.tsx` импортирован один helper, который используется как при обычном/быстром запуске (строка 238), так и после повторной загрузки каталога (257). Неосторожные прямые вызовы из этих двух мест удалены. Другая логика App исправлением не затрагивалась.

Helper проверяет функцию UUID внутри try, затем пробует совместимый `getRandomValues`, а при полном отсутствии/отказе crypto выдаёт непустую ограниченную строку из времени и локального счётчика. Исключения отсутствующего объекта, метода или запрета API не выходят в UI. Используемые операции (`Uint32Array`, `Array.from`, `padStart`, `Date.now`, optional chaining после сборки) совместимы с заявленной базой Safari15. В fallback нет обещания криптографической стойкости. Проверен потребитель: seed передаётся через `createPlanInputs` и применяется в `generatePlan` для tie ordering; авторизация, секреты и идентификация пользователя от него не зависят. Независимое требование уникального постоянного идентификатора к нему не предъявляется.

**Достаточность тестов:** unit-проверки задают независимый ожидаемый native UUID и фиксированные четыре числа для entropy, проверяют точное строковое представление, отсутствие/исключение UUID, отсутствие/отказ crypto, два различных seed при одинаковых часах и предел длины. Browser-файл отключает API до загрузки приложения и проверяет настоящий quickstart в трёх режимах, настоящий submit и retry каталога. Проверка успешности требует 7 дат/28 вхождений, записанного active, того же ID после reload и побайтно прежних active/draft; она не ограничивается отсутствием ошибки или типом результата. Отказ каталога вводится только существующим программным портом; подбор и persistence остаются производственными. Циклических expected fixtures и замены production-поиска фиктивным успехом не найдено.

**Собственный исполненный spot-check:**

```text
node node_modules/vitest/vitest.mjs run src/app/generationSeed.test.ts -t 'falls back to random values when UUID is unavailable'
exit 0; 2 passed, 4 filtered/skipped by name; duration 239ms.
```

Прочитаны фактические логи исправления: RED 5 failed/1 passed unit, GREEN 365/365 unit в 17 файлах; targeted browser 15/15 (5 Chromium, 5 Firefox, 5 WebKit); typecheck/lint/build и production smoke 2/2. Это запуски исполнителя, не новые полные запуски этого reviewer; пути и пределы в `docs/qa/phase02-seed-compatibility-fix.md`. В собственном процессе дополнительно выполнен только named unit-check выше. Воспроизведение отсутствующего API на текущих движках не выдаётся за настоящий Safari15.0. Исторические WebKit keyboard ограничения и пользовательские ответы UAT не изменялись.

Открытых замечаний по исправлению не осталось. Исходники, тесты, другие отчёты и глобальное состояние проекта этим re-review не менялись. Коммит не создавался.
