# Phase 01 — предложение набора для установки

**Статус: pending-human-approval.** Проверено 26.10.2026, 15:49 UTC. Это материал для checkpoint `01-01-01`, задача ещё не завершена. Разработка разрешена командой пользователя execute-phase 1; отдельное подтверждение этих версий ещё не получено.

Среда: **Node 24.12.0, npm 11.6.2**, Windows. Выполнены только GET-запросы к бесплатным официальным npm registry и upstream. Пакеты, браузеры и приложение не устанавливались; `package.json`, `package-lock.json`, `node_modules` и approved-record не создавались.

## Предлагаемые 16 прямых зависимостей

Версии фиксируются точно, без `^`, `~` и `latest`. В колонке scripts указаны автоматически запускаемые при установке lifecycle scripts: `preinstall`, `install`, `postinstall`, `prepublish`, `preprepare`, `prepare`, `postprepare`. «Нет» означает отсутствие в опубликованном манифесте; это не аудит исполняемого кода tarball. «Не задан» в engines означает отсутствие ограничения в манифесте, а не проверку всех сред. `opt` — необязательная peer-зависимость.

| Пакет / точная версия / npm | Официальный upstream | Node engines | Peer dependencies | Install scripts | Основание выбора |
|---|---|---|---|---|---|
| [react 19.3.1](https://www.npmjs.com/package/react/v/19.3.1) | [react/react](https://github.com/react/react) | `>=0.10.0` | Нет | Нет | Стабильная опубликованная версия, совпадает с DOM |
| [react-dom 19.3.1](https://www.npmjs.com/package/react-dom/v/19.3.1) | [react/react](https://github.com/react/react) | Не задан | `react ^19.3.1` | Нет | Точная пара React |
| [react-router 8.5.0](https://www.npmjs.com/package/react-router/v/8.5.0) | [remix-run/react-router](https://github.com/remix-run/react-router) | `>=22.22.0` | `react >=19.2.7`; opt: `react-dom >=19.2.7`, оба `@types/* >=19.2.0` | Нет | SPA-навигация, все выбранные React pins удовлетворяют peers |
| [vite 8.3.5](https://www.npmjs.com/package/vite/v/8.3.5) | [vitejs/vite](https://github.com/vitejs/vite) | `^20.19.0 \|\| >=22.12.0` | Только opt: группа V ниже | Нет | Совместим с plugin-react 6 и Vitest 5 |
| [@vitejs/plugin-react 6.1.2](https://www.npmjs.com/package/@vitejs/plugin-react/v/6.1.2) | [vitejs/vite-plugin-react](https://github.com/vitejs/vite-plugin-react) | `^20.19.0 \|\| >=22.12.0` | `vite ^8.0.0`; opt: группа R | Нет | Официальная интеграция React для Vite 8 |
| [postcss 8.5.31](https://www.npmjs.com/package/postcss/v/8.5.31) | [postcss/postcss](https://github.com/postcss/postcss) | `^10 \|\| ^12 \|\| >=14` | Нет | Нет | Совместим с Tailwind 3 и Autoprefixer |
| [vitest 5.0.5](https://www.npmjs.com/package/vitest/v/5.0.5) | [vitest-dev/vitest](https://github.com/vitest-dev/vitest) | `^22.12.0 \|\| ^24.0.0 \|\| >=26.0.0` | `vite ^6.4.0 \|\| ^7.0.0 \|\| ^8.0.0`; opt: группа T | Нет | Чистые unit-тесты в Node; DOM-эмулятор не нужен |
| [@playwright/test 1.64.1](https://www.npmjs.com/package/@playwright/test/v/1.64.1) | [microsoft/playwright](https://github.com/microsoft/playwright) | `>=20` | Нет | Нет | Реальные Chromium/Firefox/WebKit тесты после install gate |
| [eslint 10.13.0](https://www.npmjs.com/package/eslint/v/10.13.0) | [eslint/eslint](https://github.com/eslint/eslint) | `^20.19.0 \|\| ^22.13.0 \|\| >=24` | opt: `jiti *` | Нет | Принимается typescript-eslint 8.72 и @eslint/js 10 |
| [typescript-eslint 8.72.0](https://www.npmjs.com/package/typescript-eslint/v/8.72.0) | [typescript-eslint/typescript-eslint](https://github.com/typescript-eslint/typescript-eslint) | `^18.18.0 \|\| ^20.9.0 \|\| >=21.1.0` | `eslint ^8.57.0 \|\| ^9.0.0 \|\| ^10.0.0`; `typescript >=4.8.4 <6.1.0` | Нет | TS lint, совместимый опубликованный диапазон |
| [typescript 6.0.3](https://www.npmjs.com/package/typescript/v/6.0.3) | [microsoft/TypeScript](https://github.com/microsoft/TypeScript) | `>=14.17` | Нет | Нет | Последний опубликованный стабильный 6.0.x, внутри peer typescript-eslint |
| [tailwindcss 3.4.19](https://www.npmjs.com/package/tailwindcss/v/3.4.19) | [tailwindlabs/tailwindcss](https://github.com/tailwindlabs/tailwindcss/tree/v3) | `>=14.0.0` | Нет | Нет | Ветка 3.4 для требования Safari 15 |
| [autoprefixer 10.6.1](https://www.npmjs.com/package/autoprefixer/v/10.6.1) | [postcss/autoprefixer](https://github.com/postcss/autoprefixer) | `^10 \|\| ^12 \|\| >=14` | `postcss ^8.1.0` | Нет | CSS-префиксы в связке PostCSS 8/Tailwind 3 |
| [@eslint/js 10.0.1](https://www.npmjs.com/package/@eslint/js/v/10.0.1) | [eslint/eslint](https://github.com/eslint/eslint/tree/main/packages/js) | `^20.19.0 \|\| ^22.13.0 \|\| >=24` | opt: `eslint ^10.0.0` | Нет | Официальные JS-конфигурации для выбранного ESLint 10 |
| [@types/react 19.3.0](https://www.npmjs.com/package/@types/react/v/19.3.0) | [DefinitelyTyped/types/react](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/react) | Не задан | Нет | Нет | Типы той же линии React 19.3 |
| [@types/react-dom 19.3.0](https://www.npmjs.com/package/@types/react-dom/v/19.3.0) | [DefinitelyTyped/types/react-dom](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/react-dom) | Не задан | `@types/react ^19.3.0` | Нет | Типы DOM той же линии |

Три runtime-зависимости: React, React DOM, React Router. Остальные 13 — инструменты разработки. `globals`, Zustand, TanStack Query, jsdom, form-библиотеки, React Compiler и дополнительные плагины прямо не добавляются. Для браузерных глобальных имён ESLint достаточно явной конфигурации без отдельного пакета.

## Необязательные peers

Сохранены полностью, чтобы отсутствие установки не скрывало требования манифестов:

- **V (Vite):** `tsx ^4.8.1`, `jiti >=1.21.0`, `less ^4.0.0`, `sass ^1.70.0`, `yaml ^2.4.2`, `stylus >=0.54.8`, `terser ^5.16.0`, `esbuild ^0.27.0 || ^0.28.0`, `sugarss ^5.0.0`, `@types/node ^20.19.0 || >=22.12.0`, `sass-embedded ^1.70.0`, `@vitejs/devtools ^0.7.1 || ^0.8.0`.
- **R (React plugin):** `oxc-transform-react ^0.152.0`, `@rolldown/plugin-babel ^0.1.7 || ^0.2.0`, `babel-plugin-react-compiler ^1.0.0`.
- **T (Vitest):** `jsdom *`, `happy-dom *`, `@vitest/ui 5.0.5`, `@types/node ^22.0.0 || >=24.0.0`, `@edge-runtime/vm *`, `@opentelemetry/api ^1.9.0`, `@vitest/coverage-v8 5.0.5`, `@vitest/browser-preview 5.0.5`, `@vitest/coverage-istanbul 5.0.5`, `@vitest/browser-playwright 5.0.5`, `@vitest/browser-webdriverio ^5.0.0-beta.5 || >=5.0.0`.

Эти opt peers не расширяют список прямых зависимостей. Их наличие как транзитивных зависимостей и совместимость такого фактического дерева можно будет проверить только после получения разрешения и создания lockfile.

## Что проверено

1. Каждый из 16 точных URL `https://registry.npmjs.org/<name>/<version>` вернул ожидаемые name/version и upstream repository. В выбранных версиях нет prerelease-суффикса или поля deprecated. Полные registry URLs, engines, peers, scripts, integrity и доступные attestations сохранены в [сыром proposal](../../.tmp/phase01-preflight-proposal.json).
2. Прочитаны upstream `package.json`: 14/14 обычных пакетов совпали по имени и версии на registry gitHead либо release tag. Для Playwright использован правильный путь `packages/playwright-test/package.json`, а не корневой private monorepo manifest. Точные ссылки сохранены в `upstreamPackageUrl` proposal.
3. Для двух DefinitelyTyped-пакетов исходники `master/types/*/package.json` содержат те же имена и `19.3.9999`. Это [документированный формат исходников DefinitelyTyped](https://github.com/DefinitelyTyped/DefinitelyTyped#how-do-definitely-typed-package-versions-relate-to-versions-of-the-corresponding-library); опубликованные точные `19.3.0` проверены по registry. Соответствие конкретного tarball конкретному исходному коммиту этим не доказано.
4. Выполнены **25/25 успешных semver-проверок** локальным semver из установленного npm: 13 Node engines и 12 peer-связей между выбранными pins. Необязательные отсутствующие peers исключены явно; отсутствующих обязательных direct peers нет. Новые пакеты для этой проверки не скачивались и не исполнялись.
5. Полные scripts из registry проверены для всех 16 пакетов: перечисленных install lifecycle scripts нет. `start`, `build`, `test`, `prepublishOnly`, `prebuild`, `postbuild`, `install:integrations` и другие служебные scripts не тождественны install hook. В частности, Tailwind содержит `prepublishOnly: npm install --force && npm run build`: это script публикации самого upstream, который при обычной установке опубликованной зависимости не запускается. Ничего из этих команд не запускалось. Семантика сверена с [официальной документацией npm scripts](https://docs.npmjs.com/cli/v11/using-npm/scripts/).

## Совместимость и выбранные отклонения от latest

**TypeScript 6.0.3 вместо latest 7.0.2.** Опубликованы стабильные 6.0.2 и 6.0.3; выбран 6.0.3. `typescript-eslint 8.72.0` требует `<6.1.0`, и 7.0.2 этот контракт нарушает. Выбор подтверждён registry и [официальной таблицей поддержки typescript-eslint](https://typescript-eslint.io/users/dependency-versions/). `--force` и `--legacy-peer-deps` для обхода peers использовать нельзя.

**Tailwind 3.4.19 вместо latest 4.3.3.** В проекте заявлен Safari 15; Tailwind v4 рассчитан на Safari 16.4+, а официальный [upgrade guide рекомендует 3.4 для более старых браузеров](https://tailwindcss.com/docs/upgrade-guide#browser-requirements). Сам pin не доказывает работоспособность всего приложения на Safari 15. Будущая production-сборка должна явно задавать `safari15`, затем проверяться отдельно.

**Остальные pins** — проверенные опубликованные стабильные линии из исследования, с проверкой каждого точного релиза и прямых peers в текущей среде. React/DOM/Router/types согласованы; Vite 8 принимается React plugin 6 и Vitest 5; ESLint 10 принимается typescript-eslint 8.72 и @eslint/js 10. Свежесть релизов из метки SUS/too-new в RESEARCH остаётся поводом для предусмотренной человеческой проверки, а не доказательством подмены.

## Пределы и следующий шаг

Это проверка происхождения и манифестов, а не заключение об отсутствии уязвимостей. Lockfile, полное транзитивное дерево, транзитивные lifecycle scripts, npm audit, сборка и тесты приложения пока не проверены. Публичные metadata и ссылки не заменяют криптографическую проверку содержимого пакетов. Платных API или услуг набор не требует.

Checkpoint в [01-01-PLAN.md](../../.planning/phases/01-gostevoy-start-i-sohranyaemye-nastroyki/01-01-PLAN.md) имеет `gate="blocking-human"` и требует: «Сверить SUS-пакеты по официальным npm страницам и upstream; получить подтверждение именно этого набора и совместимых pins». Поэтому разрешение разработки не считается подтверждением набора. `docs/qa/phase01-install-preflight.json` со `status=approved` и `humanApprovedAt` можно создать только после фактического ответа человека.

После подтверждения: записать решение с этими pins и временем ответа, установить согласованные версии без обхода peer conflicts, создать lockfile и проверить фактически полученное дерево, затем продолжить tracer `01-01-02` по TDD. При отказе или неполном подтверждении install остаётся заблокирован.
