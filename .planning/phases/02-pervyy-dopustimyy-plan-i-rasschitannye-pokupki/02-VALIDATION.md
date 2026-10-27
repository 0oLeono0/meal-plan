---
phase: "02"
slug: "pervyy-dopustimyy-plan-i-rasschitannye-pokupki"
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-10-27"
---

# Phase 2 — Validation Strategy

Это требования к будущей проверке, не отчёт о выполненных тестах. Исходные 134 unit и браузерные проверки Phase 1 не доказывают генератор Phase 2. Точные task IDs/файлы/команды заполняет planner одновременно с PLAN; здесь зафиксирована обязательная архитектура проверки из RESEARCH.

## Test Infrastructure

| Property | Value |
|---|---|
| Framework | Установленные Vitest 5.0.5 / Playwright 1.64.1; новые пакеты не требуются |
| Config | package.json, playwright.config.ts, tsconfig.json, eslint.config.js |
| Quick task feedback | Реальный targeted spec из соответствующей задачи; никакого passWithNoTests/проверки только наличия файла |
| Unit release | `npm run test:unit -- --run` |
| Browser release | `npm run test:e2e -- --project=chromium`, отдельно firefox/webkit |
| Quality | `npm run typecheck`, `npm run lint`, `npm run build` |
| Runtime | Будущие тесты ещё не измерены; целевой быстрый feedback <60s, измерить первый запуск и дробить по реальным сценариям |

## Sampling Rate

- После задачи — её substantive targeted unit/browser cases; после нового исправления — связанные regressions.
- После волны — полный unit и необходимые затронутые browser paths; не повторять всю неизменённую матрицу без основания.
- Перед приёмкой — production build/type/lint/full unit и полный фактический браузерный путь во всех трёх проектах. Числа, время, retries и ограничения записываются честно.

## Per-Task Verification Map

Planner заменяет эту предварительную карту точной task-allocation таблицей, сохраняет все строки покрытия и добавляет threat refs из уникального Phase 2 реестра.

| Requirement | Required evidence | Test type | Status |
|---|---|---|---|
| APP-04, WIZ-08 | quick-start/applied vs raw draft; skip не очищает ограничения/домашние строки; invalid draft не исправляется молча | domain + e2e | pending |
| DATA-01/02/03 | Source ID/hash/reference units; unknown ≠ zero/safe; local adapter делает настоящие вычисления | source validation + unit + e2e | pending; Q-14 source gate |
| CALC-01/03/04/05/06/07 | Независимые expected tables: units/scaling/nutrients/person-day/three costs/rounding/budget/pantry once | unit | pending |
| GEN-01/02 | Reproducible seed/catalog/settings; hard restrictions/budget/time; unknown safety excluded; soft target/variety | unit/property-style deterministic cases | pending |
| GEN-03/04/05 | Реальный pending/cancel/late success/no persistence, 30s timeout, retry, structured no-recipes/data/search/budget errors; minimum never guessed | unit fake timers + deferred browser adapter | pending |
| MENU-01/04 | Dates/actual days, person/family basis, >10% warning/absent target, purchase budget vs ingredient value, old-plan preservation/reload | e2e | pending |
| SHOP-01/04 | Aggregate by product+compatible basis, 500−200=300, stock used once, instance sources, covered block and consistent totals | unit + e2e | pending |

## Data and Numerical Oracles

- USDA original ZIP реально получен в research; его hash/52 extracted observations — source evidence, не готовый российский food/price/safety catalog.
- Синтетические fixture prices/nutrients допустимы для независимых численных тестов с явной маркировкой. Они не попадают в production catalog и не закрывают DATA-01/02.
- Price snapshot требует фактических source values/reference unit/region-or-explicit-web-scope/date. TLS/403 не обходятся. До получения доказательства допускаются безопасные независимые работы, но не успешная приёмка неподтверждённого каталога.
- Обязательны примеры без pantry/с частичным/избыточным/unknown/incompatible запасом, повтор recipeId в разных instances, дробные единицы и деньги у границы лимита, отсутствие/частичная/полная manual norm, incomplete safety/price/nutrients.
- Ни один эвристический результат не называется глобальным минимумом или доказательством невозможности без соответствующего основания.

## Wave 0 Requirements

- Существующая инфраструктура есть; substantive Phase 2 specs/fixtures создаются owning задачами, не пустыми заглушками.
- Planner обязан назначить создание каждого будущего тестового файла раньше первого запуска и исключить лишние новые dependencies.
- Сохранить Phase 1 storage/retry/focus/skip-link/regression contracts, а намеренно изменившиеся placeholder states обновить адресно.

## Manual-Only / External Evidence

| Behavior | Requirement | Why separate | Instructions |
|---|---|---|---|
| Provenance/meaning of curated food/price/safety records | DATA-01/02 | Успешный synthetic spec не подтверждает реальный источник | Проверяемые первичные источники и сопоставление, честный data gate |
| New menu/shopping usability and real-device presentation | MENU-01/04, SHOP-01/04 | Phase 1 user UAT не является будущей Phase 2 приёмкой | Проверять новые экраны после реализации; не переписывать прежние результаты |
| LCP / historical Safari / screen-reader limits | Applicable UI criteria | Фактическая среда/методика должны быть названы | Не выдавать emulation/build target за реальное устройство/браузер; численные результаты не выдумывать |

## Validation Sign-Off

- [ ] Точная карта всех задач/20 REQ и secure behaviors заполнена планировщиком.
- [ ] Реальные RED/GREEN/проверки и source evidence выполнены исполнителем.
- [ ] Production catalog проверен, unknown не подменён фактами.
- [ ] Браузеры/type/lint/build выполнены, существенные ограничения названы.
- [ ] Независимая приёмка ещё не выполнена.
