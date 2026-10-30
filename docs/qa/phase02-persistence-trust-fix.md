# Phase 02 — T-02-10: доверие сохранённому каталогу

Дата: 29.10.2026. Исходное замечание: `.planning/phases/02-pervyy-dopustimyy-plan-i-rasschitannye-pokupki/02-SECURITY.md`.

Исправление: `e3f65a3` (`fix(02): T-02-10 verify persisted catalog against trusted versions`). Статус: исправлено, требуется независимая проверка логики/security gate оркестратором.

## Изменение

`trustedCatalogs` содержит поддерживаемые версии из исходников приложения. Сейчас production-регистр включает `mealplan-2026-10-28-1`, построенную из bundled source snapshots. `validateActiveBundle` после проверки схемы сравнивает весь каталог с доверенной версией до пересчёта проекций: продукты, nutrition/price/safety, источники, конверсии и рецепты. Проверка схемы дополнительно связывает sourceSnapshots и recipeSnapshot с этим каталогом.

Неизвестная версия и изменённые данные отклоняются при загрузке, проверке кандидата контроллером и сохранении. Повреждённый storage остаётся побайтно прежним; наличие активного плана не подтверждается, автоматическая запись и её retry блокируются. Проверка текущего запроса непосредственно перед `setItem`, сериализация записей, revision/read guards и точный codec сохранены; новых `await` не добавлено.

Регистр копирует и замораживает доверенные каталоги; его Map скрыт в замыкании. Изменение переданного объекта после создания регистра не меняет доверенные факты. Исторические версии нужно явно сохранять в production-регистре при обновлении каталога: они используют собственные исходные цены, без автоматического пересчёта по новой версии. Программная инъекция отдельного регистра поддерживает синтетические unit/browser fixtures; production не регистрирует каталоги из localStorage или URL. Нулевой нутриент сам по себе допустим.

## Выполненная проверка

Все команды выполнены в основном checkout `D:/Projects/meal-plan`, ветка `codex/phase01-execution`, `workflow.use_worktrees=false`.

- RED: до изменения production-кода восемь независимых сценариев самосогласованной подмены nutrition, price, safety, source, recipe, conversion, неизвестной version и неиспользованного food принимались как `valid`; новые проверки падали с ожидаемым `invalid`/фактическим `valid`. Отдельно поправлен неверный исходный численный oracle: fixture использует одного человека, а аудиторский probe — двоих.
- `npm run test:unit -- --run src/adapters/activePlan.test.ts src/features/generation/controller.test.ts`: **52/52**, 2 файла. Покрыты точный реальный round-trip `46.7527011203703637 RUB`, corrupt/presence/write block, недоверенный результат custom port, кандидат с совпадающими request inputs, явная историческая версия, допустимые нулевые нутриенты и защита от мутации доверенного объекта.
- `npm run test:unit -- --run`: **342/342**, 16 файлов, 6.59 s.
- `npm run typecheck`, `npm run lint`, `npm run build`: exit **0**; сборка — 137 модулей.
- `npx playwright test --config .tmp/persistence-trust.playwright.config.ts e2e/generation-storage.spec.ts`: **11/11 Chromium**, 2.3 min. Настоящие сохранение/перезагрузка, отдельные подмены nutrition/price/version, сохранность raw bytes, blocked replacement/retry, старый активный план при сбоях, отмена и timeout отложенной финальной записи, CR-01.
- `npx playwright test --config .tmp/persistence-trust.playwright.config.ts e2e/menu.spec.ts e2e/shopping.spec.ts --grep 'synthetic independent|synthetic partial|synthetic inherited category|synthetic long product'`: **6/6 Chromium**, 13.6 s. Проверены потребители явной тестовой инъекции, независимые суммы и КБЖУ, однократное pantry-покрытие, длинный мобильный текст и категории с именами унаследованных свойств. JUnit: `.tmp/persistence-trust-synthetic.xml`.
- `git diff --check` по изменённым файлам: exit **0**.

Browser-конфигурация временная: один worker, отдельный порт **4194**, timeout теста 25 s, ожиданий 5 s. Проверка не занимала общий 4173 и была согласована с параллельным UI-worker на 4195. Unit/type/lint/build выполнены после последнего изменения исходников; последующие изменения — только этот отчёт.

## Границы

Полная браузерная матрица повторно не запускалась. Этот прогон не подтверждает Safari/iOS; известный предыдущий результат WebKit **238 passed / 2 native-environment failures** не пересмотрен. Независимый security/code review и итоговое решение по T-02-10 выполняет оркестратор. Зависимости, системные настройки, исходные документы, STATE/ROADMAP и SECURITY-отчёт не изменялись.
