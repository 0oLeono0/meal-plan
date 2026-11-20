# Phase 2 — UI audit fixes

Проверено 2026-10-30. Source commits: `9834678af5aa5f28e66a67b4143d1000f9137003`, `8605fe7832f3fdd660275eeaf1edcdfdba09dc57`; baseline: `e3f65a3`. Область — семь WARNING из `02-UI-REVIEW.md`; расчёты, каталог и security fix не изменены.

## Исправления

- V1: видимый indeterminate indicator без процентов; доступные status/cancel; при reduced motion зелёная полоса остаётся видимой без анимации.
- T1/S1/S2: h3 экранов меню/покупок — существующий body token 1rem, weight600, margins16/8px; бюджетный dl использует token gaps, dd без native40px indent. Ритм мастера не изменён.
- C1: исключённые продукты в отказе по бюджету показаны русскими названиями из каталога/локального справочника, неизвестный ID — «Неизвестный продукт».
- C2: известные diagnostics раздельно объясняют цену, КБЖУ или ограничение. Продукт указывается только при точном profileId в path; неизвестная причина получает общий честный текст, без выдуманных фактов.
- E1: общий PlanLoading используется при начальной hydration через App.InitialLoadStatus и при загрузке страниц меню/покупок. Декоративный skeleton имеет aria-hidden, текстовый status единственный. Изменение App ограничено import и представлением InitialLoadStatus; trusted registry injection/request guards не изменены.

## Выполненная проверка

- `npm run typecheck`, `npm run lint`, `npm run build`: все exit0. Target safari15 в сборке — не браузерная проверка Safari.
- `npx playwright test --config .tmp/ui-fix.config.ts`: финальный Chromium **20 passed (46.6s)**, exit0; собственный Vite127.0.0.1:4195. Покрыты реальный wizard → сохранение → reload, pending/cancel/late result, retry/save failure/timeout, corrupt/deep entry, новые представления ошибок, skeletons и шесть сочетаний route/viewport. До followup также выполнен owning run18/18 (40.9s).
- Два regression-теста initial hydration монтируют настоящий App с catalogPort, задержанным до явного release-catalog event. До исправления оба фактически упали на missing skeleton (2 failed); после исправления оба passed в финальном20. Проверяют loading status/skeleton без fake data, затем переход в реальный empty state после release. Задержка управляется событием, не увеличенным timeout.
- Тесты computed styles на текущем коде: menu/shopping при360/768/1280px — h3 16px/600, budget dd margin-inline-start0, три стоимости совпадают между экранами, scrollWidth равен viewport.
- Сохранённый probe `.tmp/phase02-ui-fixes/evidence.json` (2026-10-29, тот же неизменённый UI diff) содержит восемь просмотров: два экрана при360/768/1280px и два synthetic long-text при360px. Измерения: h3 margins16px0px8px, overflow отсутствует. Повторно реально открыты через view_image: menu360, shopping768, menu1280, оба long-text360 и pending-reduced-motion360. Текущий тест заново сохраняет pending screenshot. Длинные названия переносятся в карточке и не обрезаются.
- `git diff --check`: exit0 перед source commit.

## Границы вывода

Полная браузерная матрица, Safari, реальные устройства и screen reader повторно не проверялись. Этот UI fix не закрывает оставшуюся device/human приёмку фазы. Каталог остаётся ограниченным: примерно462₽ и1010ккал/2,38г жиров на человека в день в default-плане не являются доказательством полноценности рациона; существующая оговорка сохранена. Чужой отчёт `phase02-persistence-trust-fix.md`, QA/security/STATE и untracked skills в этот commit не включены.

Независимый read-only review `/root/phase2_ui_fix_finish/ui_delta_review`: первый verdict6/7 выявил пропущенную initial hydration в App. После точечного followup повторный терминальный verdict **PASS: все7 предупреждений закрыты**, новых существенных ошибок не найдено. Reviewer проверял код, тесты сам не перезапускал; указанные выше20 проверок выполнены владельцем изменений. Полная фаза этим отчётом не объявляется закрытой.
