# Совместимость seed генерации с Safari 15 — CR-02

Дата: 30.10.2026. Область: два запуска генерации в `src/app/App.tsx` — обычный/быстрый старт и повтор после загрузки каталога. Пользовательские результаты UAT и отчёты владельцев фаз этим документом не меняются.

## Причина и исправление

Прямой `crypto.randomUUID()` недоступен в Safari 15.0–15.3. Первичное compatibility evidence и воспроизведение в secure context сохранены в `01-REVIEW.md`. Наличие `build --target safari15` не добавляет отсутствующий Web API.

Оба вызова заменены общим `createGenerationSeed()`: доступный native UUID; при отсутствии/исключении — `getRandomValues`; при полной недоступности browser crypto — ограниченная строка из времени и локального счётчика. Это только вход порядка детерминированного поиска, не секрет, токен авторизации или постоянный ID. Fallback не заявляет криптографическую случайность. Переданный в генератор seed по-прежнему сохраняется целиком, алгоритм и расчёты не изменены. Новые зависимости не добавлялись.

## Исполненный RED

- `npx playwright test --config .tmp/seed.playwright.config.ts seed-compatibility.spec.ts --project chromium --grep 'quick start.*missing-uuid'`: **1 failed**, до изменения реализации. Настоящая кнопка быстрого запуска, `randomUUID` отключён до загрузки приложения, остальные Web API сохранены. Ожидался `/menu`; фактически `/plan/generating`, Vite/PageError `TypeError: crypto.randomUUID is not a function`. Лог `.tmp/seed-red.log`, trace в `.tmp/seed-results`.
- Helper сначала воспроизводил прежний прямой вызов. `npm run test:unit -- --run src/app/generationSeed.test.ts`: **5 failed / 1 passed** до добавления fallback, `.tmp/seed-unit-red.log`. Отсутствующий UUID, исключение UUID и отсутствующая/отказывающая crypto приводили к реальным исключениям. После fallback тот же файл: **6/6 passed**, `.tmp/seed-unit-green.log`.

## Исполненный GREEN

- `npm run test:unit -- --run`: **365/365**, 17 файлов, 13.16 s, `.tmp/seed-full-unit.log`.
- `npm run typecheck`: успешно, `.tmp/seed-typecheck.log`.
- `npm run lint`: успешно, `.tmp/seed-lint.log`.
- `npm run build`: успешно, 139 модулей, 3.46 s, `.tmp/seed-build.log`.
- `npx playwright test --config .tmp/seed.playwright.config.ts seed-compatibility.spec.ts`: **15/15 passed**, 1.9 min; Chromium 5/5, Firefox 5/5, WebKit 5/5, `.tmp/seed-green.log`. Только предупреждение раннера о приоритете `FORCE_COLOR` над `NO_COLOR`; ошибки приложения отсутствуют.
- `node .tmp/seed-production-smoke.mjs`: **2/2** на существующем production preview4180 после сборки: missing UUID и полный отказ entropy. В каждом случае 28 сохранённых вхождений, повторная загрузка того же меню, побайтно прежние active и draft, `pageerror: []`. Лог `.tmp/seed-production-smoke.log`.

Пять browser-сценариев проверяют настоящий быстрый старт при отсутствующем UUID, исключении UUID и полном отказе entropy; настоящий submit мастера без UUID; загрузку каталога после первого отказа и настоящий повтор без UUID. Во всех проверяется реальное сохранённое меню 7 дат/28 вхождений, непустой ограниченный seed, совпадение применённых raw настроек с сохранённым черновиком, если он существует, reload того же active ID и побайтная неизменность active/draft после reload. Только отказ каталога задаётся через существующий программный порт в test harness; подбор и сохранение остаются настоящими. Production переключатели ошибок не добавлялись.

## Пределы доказательства

Отсутствие/отказ Web API контролируемо воспроизводятся в установленных браузерных движках. Это не запуск настоящего Safari 15.0, iOS-устройства или проверка всех Web API старого браузера. Исторические Windows WebKit native Tab/link ограничения не затрагивались. Успешные targeted тесты не заменяют повтор всей исторической browser-матрицы. Порты, системные настройки и защита браузера не менялись; preview4180 оставлен работающим.
