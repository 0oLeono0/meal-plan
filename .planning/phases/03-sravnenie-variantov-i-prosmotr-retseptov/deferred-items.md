# Отложенные дефекты Phase03

## Recovery/a11y — 03-11: фокус после отмены генерации

Реальный App с задержанным generation port после отмены возвращает мастер, но `generate-menu` не получает фокус. Существовавший до03-10 дефект подтверждён на исходном `50b2a304c7175b2a980a6d9359322f5b98ab5f4c` в отдельной копии tracked src/e2e/data/configs внутри `.tmp/03-10-baseline`, без новых веток/worktrees и без изменения исходного checkout.

Фактически выполнено из `.tmp/03-10-baseline` (Vite4174):

`npm run test:e2e -- e2e/phase02-presentation.spec.ts --project=chromium --workers=1 -g '360px pending cancellation'`

Результат:1test failed, exit1,6.2s; `expect(submit).toBeFocused()` получил inactive после реального Enter по «Отмена». XML: `.tmp/03-10-baseline/.tmp/phase01-playwright.xml`. Начальная неполная baseline-копия падала на отсутствующем data import и не использовалась как доказательство; после добавления исходных data сценарий исполнился и дошёл до указанной focus assertion.

Тесты сохранены. Семь width-веток `pending cancellation` и один `traverse generation recovery` исключены только из финального03-10 прогона; это8непроверенных в нём путей, а не8успешных baseline-проверок. Только360px reproducer действительно проверен на baseline. Текущий прежний sequential generation recovery тоже падал на аналогичной focus assertion; сам baseline для него отдельно не запускался. WINDOWS#23 остаётся open. В03-11 воспроизвести, выяснить владельца return focus/route cancellation, исправить и выполнить все8путей.
