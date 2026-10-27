---
phase: "01"
review: 01-REVIEW.md
findings:
  - id: CR-01
    severity: critical
    disposition: fixed
    commit: 8811b0f
  - id: WR-01
    severity: warning
    disposition: fixed
    commit: a82e308
  - id: WR-02
    severity: warning
    disposition: fixed
    commit: 8cd5872
open: 0
total: 3
---

# Phase 1: Code Review Disposition

| Finding / exact source title | Severity | Disposition | Commit / evidence |
|---------|----------|-------------|--------|
| CR-01: Повтор после ошибки чтения без редактирования стирает восстановленный черновик | critical | fixed; independently reviewed | `8811b0f`; six `storage-retry.spec.ts` cases passed all 3 browsers; независимая проверка App/адаптера/полных assertions — addendum ниже |
| WR-01: «Далее» не фокусирует ошибку внутри свёрнутой нормы КБЖУ | warning | fixed | `a82e308`; two collapsed-error keyboard cases passed all 3 browsers, 390px and 360px/200% text |
| WR-02: После успешного сброса на первом шаге фокус теряется на body | warning | fixed | `8cd5872`; successful reset heading focus, cancellation and failed-reset trigger preservation passed all 3 browsers |

Источник — неизменённый `01-REVIEW.md` на `c899a1c`; детали исправлений — `01-REVIEW-FIXES.md`. Все три замечания исправлены, waived нет. Итоговый связанный запуск: **185 passed / 1 Firefox context teardown error**, изолированный повтор этого error также не прошёл. Это не полный новый suite и не 186 green. Unit 134/typecheck/lint/build passed. Статус fixed относится к замечаниям, а не к завершению проверки фазы; причина Firefox не доказана, человеческая приёмка остаётся. Независимый review логики завершён в addendum ниже.

Последующее evidence оркестратора: без изменений кода проблемный Firefox case прошёл 1/1 и затем 3/3; весь связанный Firefox-набор повторно **62/62 passed**, exit 0, 64.172s (`.tmp/phase01-qa/review-firefox-final.xml`). Исходный сбой остаётся историей нестабильности инфраструктуры, его корневая причина не доказана. Затронутые сценарии теперь проверены во всех трёх браузерах отдельными запусками. Человеческая приёмка не подменяется этим повтором.

## Independent verification — 2026-10-27

gsd-verifier независимо перечитал `src/app/App.tsx` (`change`, `retry`, `persist`, `resetDraft`), `src/adapters/guestDraft.ts`, управляемый Promise в `e2e/fixtures.ts` и все шесть сценариев `e2e/storage-retry.spec.ts`. Вывод ограничен исправлением CR-01:

- `memoryEdited` устанавливается синхронно вместе с `currentDraft`; проверка после `await draftPort.load()` учитывает ввод во время чтения. Эта ветвь передаёт в `persist` текущий ref, а не захваченный до чтения draft.
- Без редактирования `loaded` восстанавливает `result.draft` и шаг без `save`; `missing` оставляет idle без unsolicited write. Исходные форматированные байты проверяются через `toBe(raw)`, а не через частичное совпадение полей.
- Mounted/revision/resetting проверяются до применения результата; reset инвалидирует revision, дожидается очереди и удаляет только draft key. Гидратация и успешный reset очищают dirty ref. Corrupt/read/write ошибки не дают ложного успеха; тест failed-write сравнивает старый полный snapshot и затем полную последнюю memory-версию.
- Сохранённые JUnit прочитаны независимо: исходный связанный запуск — 186 tests, 0 failures, 1 error; окончательный Firefox — 62 tests, 0 failures, 0 errors, 0 skipped. Это composite evidence, без заявления о новом полном прогоне.

Дополнительный собственный spot-check: `node node_modules/vitest/vitest.mjs run src/adapters/guestDraft.test.ts -t 'retry saves the supplied newest raw value after a failed write'` — exit 0, 1 passed (10 невыбранных случаев). Полный suite не повторялся. Обязательные реальные устройства, screen reader/contrast, native zoom/визуальная приёмка, LCP, two-tab UX и safety judgement остаются в `01-VERIFICATION.md`; отдельная ручная проверка внутренней логики CR-01 больше не требуется.

## Acceptance delta review — 2026-10-27

**Результат:** REVIEW DELTA OK; новых BLOCKER/WARNING в этой документальной дельте не выявлено. Это ограниченная проверка после UAT, а не повтор исходного ревью 38 файлов.

Сверены `01-UAT.md` (H1–H9, 9/9, каждый `source: user`), текущая поправка шага 4 в `01-UI-SPEC.md`, `docs/decisions/home-product-addition.json`, дополнения QA/UI-REVIEW/VALIDATION и закрытие шести human-verify записей WINDOWS. H9 явно принимает существующее немедленное добавление при выборе результата и отменяет только требование отдельной кнопки. Это соответствует `HomeProductsStep.tsx:13-15,22-23` и `ProductCombobox.tsx:36-40,55-64`: выбранный ID передаётся в `add`, популярный продукт использует тот же путь, дубликат фокусирует существующую строку без перезаписи количества. Граница черновика, единицы, запасы и остальные бизнес-правила не расширены.

`git log 8cd5872..HEAD -- src e2e scripts package.json playwright.config.ts vite.config.ts tsconfig.json eslint.config.js index.html` и diff тех же путей от `8cd5872` до рабочего состояния пусты. Новых изменений приложения, тестов или конфигурации после трёх исправлений нет; самостоятельная повторная проверка их реализации здесь не заявляется. Исходные findings и история исправлений выше сохранены.

Принятие H1–H9 зафиксировано как пользовательские сообщения «pass». Агент не проводил дополнительные device/LCP/контраст/zoom проверки, не добавлял измерения, сведения об устройствах или новые результаты автоматизации; Q-17 детали воспроизводимости не выдумываются. Тесты в этом delta review не запускались. Итоговый verifier должен обновить покрытие по принятому UI-контракту и источнику human UAT; этот addendum сам по себе не объявляет фазу завершённой.
