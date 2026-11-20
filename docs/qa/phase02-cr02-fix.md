# Phase 02 — CR-02: очищенная единица домашнего продукта

Дата: 2026-10-30. Finding: `02-REVIEW.md`, CR-02.

Статус: `fixed: requires human verification` (изменение логики; автоматические проверки ниже выполнены, итоговый независимый review проводит оркестратор).

`HomeDraftRow` допускает собственное optional-поле `unit: undefined`. Apply gate теперь представляет только это поле отсутствующим свойством до строгого снимка. Та же канонизация применяется к `AppliedSettings.raw` при повторной проверке и быстром запуске. Исходный черновик не изменяется; пустое количество сохраняется как unknown, вместе с `expiresSoon`, без количественного вычета запасов. Числовое количество без единицы возвращает ошибку `unit-rice` на шаге 4.

Общий `immutableSnapshot` не изменён. Остальные поля сохраняются для строгой проверки: unexpected undefined, NaN, циклы, неплоские объекты, недопустимые единицы и превышения лимитов остаются отклонёнными. Лимит 100 ключей строки проверяется до удаления optional-поля, лимит 5000 домашних строк — до обхода. Используется совместимый с Safari 15 `hasOwnProperty.call`.

## Проверка

Все команды выполнены в основном checkout `D:/Projects/meal-plan`, на ветке `codex/phase01-execution`, согласно `workflow.use_worktrees: false`. Изолированный локальный Vite для собственных browser-тестов: порт **4195**, один worker; пользовательский браузер и порт 4173 не использовались.

- RED: `npm run test:unit -- run src/domain/appliedSettings.test.ts` — 18 passed, 2 ожидаемых failed: own `unit: undefined` ошибочно давал `invalid / step: 1` вместо applied либо ошибки шага 4.
- RED: `npx playwright test e2e/entry-policies.spec.ts --config .tmp/cr02.playwright.config.ts --project chromium --grep 'cleared optional home unit'` — 2 ожидаемых failed. Реальное действие «г → Не выбрана» при пустом количестве показывало ошибку «Сохранённые настройки повреждены» для «Составить меню» и «Пропустить».
- GREEN после исправления: `npm run test:unit -- run src/domain/appliedSettings.test.ts` — **20/20 passed**. Проверены канонический raw, detached/frozen данные, сохранение/reload черновика, повторная проверка applied, приоритет last-applied в quick start, отсутствие санитизации недопустимого ввода и строгий общий снимок.
- GREEN: `npx playwright test e2e/entry-policies.spec.ts --config .tmp/cr02.playwright.config.ts --grep 'cleared.*home unit'` — **12/12 passed** (4 сценария × Chromium / Firefox / WebKit). Пустое количество: обе кнопки → реальная генерация → валидное сохранение → reload с тем же raw без unit. Числовое количество: обе кнопки остаются на шаге 4 и фокусируют единицу, активный план не записывается.
- `npm run typecheck` — exit 0.
- `npx eslint src/domain/appliedSettings.ts src/domain/appliedSettings.test.ts e2e/entry-policies.spec.ts` — exit 0.
- `git diff --check -- src/domain/appliedSettings.ts src/domain/appliedSettings.test.ts e2e/entry-policies.spec.ts` — exit 0.

Полная unit-матрица, production build и общая регрессия фазы выполняются оркестратором после обоих параллельных исправлений. Этот отчёт не приписывает их результаты данной проверке. Временная Playwright-конфигурация и результаты находятся в игнорируемой `.tmp/`; зависимости не добавлены.
