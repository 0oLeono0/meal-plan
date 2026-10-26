---
phase: "01"
slug: "gostevoy-start-i-sohranyaemye-nastroyki"
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-10-26"
---

# Phase 01 — Validation Strategy

Это контракт будущего исполнения, а не отчёт о прошедших тестах. В проекте ещё нет package.json, приложения и тестовых конфигураций. Привязка task-ID к окончательным планам уточняется планировщиком без изменения требований.

## Test Infrastructure

| Property | Value |
|---|---|
| Framework | Vitest (чистые функции), Playwright (DOM/браузер), TypeScript, ESLint |
| Config file | Нет — первое исполняемое задание создаёт конфигурации |
| Quick run command | `npm run test:unit -- --run` после создания инфраструктуры |
| Full suite command | `npm run typecheck` затем `npm run lint`, `npm run test:unit -- --run`, `npm run build`, `npm run test:e2e` |
| Estimated runtime | Не измерен: запусков приложения ещё не было |

Все команды — предлагаемый контракт scripts, который должен быть создан первым заданием и указан в его acceptance criteria. Нельзя утверждать, что эти команды уже существуют или успешно выполнялись.

## Sampling Rate

- После каждого изменения бизнес-валидации/сохранения: релевантные unit и typecheck.
- После UI/storage задания: релевантные e2e без watch, lint и build.
- После волны и перед приёмкой: полный набор; отдельно реальные screenshots/visual checks.
- Цель быстрого feedback — менее 60 секунд после установки; фактическое время сначала измерить, не представлять оценку как результат.

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---|---|---|---|---|---|---|---|---|---|
| Pending allocation | TBD | TBD | APP-01, APP-03 | Assigned in PLAN | Невалидный snapshot не создаёт план/redirect | unit/e2e | `npm run test:e2e -- guest.spec.ts` | No, Wave 0 | pending |
| Pending allocation | TBD | TBD | APP-02, UX-01 | Assigned in PLAN | Отображение текста без HTML injection | e2e | `npm run test:e2e -- navigation.spec.ts` | No, Wave 0 | pending |
| Pending allocation | TBD | TBD | WIZ-01, WIZ-02 | Assigned in PLAN | Ошибка storage видна; исходный повреждённый снимок не затёрт молча | unit/e2e | `npm run test:unit -- --run storage.test.ts`; `npm run test:e2e -- wizard.spec.ts` | No, Wave 0 | pending |
| Pending allocation | TBD | TBD | WIZ-03, WIZ-05 | Assigned in PLAN | Runtime-validation восстановленных данных | unit | `npm run test:unit -- --run settings.test.ts` | No, Wave 0 | pending |
| Pending allocation | TBD | TBD | WIZ-04 | Assigned in PLAN | Конечные безопасные целые; отсутствие молчаливого clamp | unit/e2e | `npm run test:unit -- --run budget.test.ts`; `npm run test:e2e -- wizard.spec.ts` | No, Wave 0 | pending |
| Pending allocation | TBD | TBD | WIZ-06, WIZ-07 | Assigned in PLAN | Исключения не теряются; productId; неизвестное количество не даёт вычета | unit/e2e | `npm run test:e2e -- products.spec.ts` | No, Wave 0 | pending |
| Pending allocation | TBD | TBD | WIZ-09 manual | Assigned in PLAN | Нет универсальных медицинских чисел, partial ≠ valid, missing ≠ zero | unit | `npm run test:unit -- --run nutrition-target.test.ts` | No, Wave 0 | pending |
| Decision checkpoint | TBD | TBD | WIZ-09 calculator | N/A until decision | Не подставлять формулу или медицинские данные без основания | blocked | Нет автоматической замены решения C-04/Q-03 | No | gated |

## Required Cases

- Гостевой deep link/reload всех P0-маршрутов; неизвестный рецепт; валидный plan-presence fixture для redirect, без фиктивной генерации.
- 4 шага, назад/выход/отмена, первый error focus, восстановление шага 3 с тегами и сырыми невалидными строками.
- Люди 1/10, чип 4+→4, дни 1/7; дефолты не перекрывают восстановленные значения.
- Бюджет 500/1000/1050/15000/20000, дробный/пустой/unsafe integer; отдельное доступное значение ползунка и точного поля, изменение дней меняет подсказку, не сумму.
- Read/write throws, повреждённый JSON, неизвестная версия, retry/reset только принадлежащего приложению ключа; режим памяти предупреждает о несохранении.
- Ограничения и product-ID теги Enter/запятая/удаление; lookup loading/empty/error; popular-чипы и повторный productId.
- Запасы без количества, известное положительное количество/единица, expiresSoon; черновик не расходует глобальный pantry.
- Норма: пустой/частичный/полный набор, отрицательные/nonfinite; происхождение manual; отсутствие не трактуется нулём или примером ТЗ.
- Размеры 360/390/430/768/1280, граница 1199/1200: overflow, фокус, touch targets, отсутствие перекрытий.

## Wave 0 Requirements

- [ ] Проверить доверенность/опубликованные версии, Node engines/peers; конфликт TS/typescript-eslint из RESEARCH не обходить force-флагом.
- [ ] Создать package/lock, strict TS, ESLint, Vitest и перечисленные scripts.
- [ ] Создать Playwright testDir/webServer и проекты Chromium/Firefox/WebKit; unit discovery не захватывает e2e.
- [ ] Создать именованные тестовые файлы/fixtures, проверяющие поведение, а не пустые stubs/fake-pass.
- [ ] Изолировать storage каждого теста, поддержать error doubles и names-only product fixture без выдуманных КБЖУ/цен.

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|---|---|---|---|
| Визуальное соответствие PDF | UX-01, APP-02 | DOM assertions не доказывают визуальное качество | Посмотреть screenshots всех размеров, макет, ошибки и sticky footer |
| Виртуальная клавиатура/safe area | APP-02, WIZ-01 | Desktop viewport не повторяет реальное устройство | Проверить реальный iOS при доступности; недоступность записать |
| Именно Safari 15 | Совместимость PRD | Современный Playwright WebKit — другой браузер | Проверить историческую версию отдельно или указать непроведённую проверку |
| C-04/Q-03 | WIZ-09 | Нет согласованной формулы/приоритета | Явное решение с основанием до зависимой реализации, затем обновить тестовые ожидания |

## Validation Sign-Off

- [ ] Все задачи имеют automated verify с fails_when либо явную Wave 0 dependency.
- [ ] Нет трёх последовательных исполняемых задач без автоматической проверки.
- [ ] Первое задание создаёт все необходимые scripts/config/fixtures; последующие команды используют эти пути.
- [ ] Нет watch-mode flags и проверок с нулём найденных тестов как успехом.
- [ ] Покрыты все 12 требований; ручная часть не закрывает калькулятор WIZ-09.
- [ ] Фактически выполненные проверки и ограничения записаны отдельно.
- [ ] `nyquist_compliant: true` устанавливается только после проверки контрактов; execution readiness не заявляется при открытом decision checkpoint.

**Approval:** pending. Все тесты/сборка ещё не выполнялись. Открытые C-04/Q-03 не замаскированы статусом планирования.
