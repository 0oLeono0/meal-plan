# Phase 02 — CR-01: «Без рыбы»

Проверено 30.10.2026 в основном checkout `D:/Projects/meal-plan`, ветка
`codex/phase01-execution`; `workflow.use_worktrees=false`. Статус исправления
логики: **fixed: requires human verification** — независимая перепроверка
оркестратором следует после локальных проверок.

Причина: генератор и active-plan boundary автоматически добавляли
`allergen:seafood` к выбранному `restriction:no-fish`. Документированная
классификация [источников](../data/phase02-sources.md) уже исключает рыбу и все
морепродукты по проверенной идентичности ингредиентов. Аллергенная гарантия
конкретной упаковки — отдельный факт. Теперь оба пути проверяют выбранные
restriction facts; только явный `allergenKeys: ['seafood']` требует собственного
allergen fact. Отрицательное подтверждение даёт отказ, неизвестное — неполноту
данных. Новых фактов, сертификатов и версии источников не создавалось.

Сохранены полное сравнение с trusted catalog до projection, защита исходных
corrupt bytes, current-request guards, ограничения времени, исключённые продукты
и общий бюджет. Общий helper не потребовался: изменена только сборка requirements
в двух существующих местах. Старое синтетическое ожидание для креветки заменено
корректным отрицательным no-fish fact; добавлены рыба, кальмар и мидии, explicit
allergy false/unknown/true и неизвестный no-fish на границе восстановления.

## Выполненная проверка

- RED до production-правки: `npm run test:unit -- --run src/data/catalog.test.ts src/adapters/activePlan.test.ts`
  — **2 failed, 46 passed**, именно реальная генерация `error` вместо `success`
  и trusted validation `invalid` вместо `valid`.
- Дополнительный RED `src/domain/generatePlan.test.ts` — **2 failed, 34 passed**:
  no-fish ошибочно зависел от отдельного allergen false/unknown.
- GREEN `npm run test:unit -- --run src/domain/generatePlan.test.ts src/adapters/activePlan.test.ts src/data/catalog.test.ts`
  — **86/86**, 3 файла, 14.99s. Реальный 52-рецептовый корпус проходит
  generation → trusted validate → save → fresh-adapter load; тот же корпус с
  явной seafood allergy остаётся `GENERATION_DATA_INCOMPLETE`. Timeout нового
  интеграционного теста 30s как у существующего real-default test: первый GREEN
  запуск достиг 5.38s при default 5s; ошибкой данных это не было.
- `npm run typecheck` — exit 0 после завершения совместимых CR-02 изменений.
- `npx eslint src/domain/generatePlan.ts src/domain/generatePlan.test.ts src/adapters/activePlan.ts src/adapters/activePlan.test.ts src/data/catalog.test.ts e2e/no-fish.spec.ts e2e/products.spec.ts`
  — exit 0; `git diff --check` затронутых файлов — exit 0.
- `npx playwright test --config .tmp/cr01-playwright.config.ts e2e/no-fish.spec.ts`
  — первый прогон **8 passed, 1 failed**, 2.2m. Chromium и WebKit прошли все
  360/768/1280 px, Firefox прошёл 360/768 px. На Firefox 1280 `page.reload`
  получил `NS_BINDING_ABORTED` одновременно с Vite HMR/duplicate-root console
  при параллельном редактировании appliedSettings другим fixer; генерация и
  сохранение до reload прошли. Это событие не объявляется успешным тестом.
- После заморозки production sources повтор
  `npx playwright test --config .tmp/cr01-playwright.config.ts e2e/no-fish.spec.ts --project firefox --grep 1280`
  — **1/1**, 22.9s (сам тест 12.9s); JUnit `.tmp/cr01-firefox1280-rerun.xml`.
  Таким образом, каждая из девяти комбинаций действительно прошла, одна со
  второго запуска. Проверены реальные UI/каталог/adapter без fixtures, четыре
  слота одного дня, сохранённое ограничение, cooking ≤30, budget accepted,
  отсутствие invented allergen facts, одинаковые menu/storage после reload и
  отсутствие горизонтального скролла.
- `npx playwright test --config .tmp/cr01-playwright.config.ts e2e/products.spec.ts --grep 'home-products boundary/precision/error' --timeout 20000`
  — **3/3** Chromium/Firefox/WebKit, 53.9s. Старый сценарий с no-fish и точным
  микроколичеством риса теперь ожидает сохранённое меню и сохранность draft при
  возвращении к настройкам; default 20s timeout соблюдён. Последний JUnit:
  `.tmp/.tmp/cr01-playwright.xml`.

Полный unit/build и общая Phase 1 regression в этом fixer повторно не запускались:
их один совместный запуск выполняет оркестратор после двух независимых fixes.
Файлы REVIEW/DISPOSITION/SECURITY/STATE и чужой CR-02 scope не редактировались.
