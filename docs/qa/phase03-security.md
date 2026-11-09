# Phase03 — scoped security evidence

08.11.2026, ASVS5.0.0 level1 scope; security_block_on=high. Это аудит threat register Phase03, не сертификат соответствия всему ASVS и не аудит будущего backend/hosting. Гостевой локальный SPA не предоставляет серверную авторизацию: same-origin пользователь/скрипт способен менять localStorage. Guards защищают согласованность приложения, не заменяют доверенный сервер.

Нормативные источники фактически открыты08.11.2026: [ASVS5 V2 Validation and Business Logic](https://raw.githubusercontent.com/OWASP/ASVS/v5.0.0/5.0/en/0x11-V2-Validation-and-Business-Logic.md), [ASVS5 V3 Web Frontend Security](https://raw.githubusercontent.com/OWASP/ASVS/v5.0.0/5.0/en/0x12-V3-Web-Frontend-Security.md). Применены2.1.1/2.2.1 (положительная структура/границы),2.3.1 (последовательность workflow),3.2.2 (safe text). Ограничение2.2.2 явно: browser validation не считается server-side security. HTTPS/HSTS/CSP/production headers/cookies/auth — не подтверждены local preview и не введены этим планом.

## Проверенные поверхности

| Threat | Severity/STRIDE | Source mitigation | Конкретное evidence |
|---|---|---|---|
|T-03-01|high/Tampering|`domain/plan.ts`, `adapters/activePlan.ts`, `trustedCatalogs.ts`: каждый variant+catalog equality+полная проекция|`plan.test.ts`, `activePlan.test.ts`: malformed/legacy/inactive tampering; полный unit478pass; legacy actual browser|
|T-03-02|high/Tampering|`features/generation/controller.ts`: owned op/base revision, сериализация и final write guard, ack-only active|controller select pending/late/reload tests; `phase03-recovery.spec.ts#pending select announces the requested row while the saved selection remains active`, quota select/retry|
|T-03-03|high/Tampering|append/recreate из saved inputs, исключаются fingerprint outputs; прежний набор до saveack|`phase03-append.spec.ts` real append,11→12, cap12, confirmation/failed write/navigation; real acceptance изменяет draft и сравнивает старые inputs/variants|
|T-03-04|medium/DoS|target1…3, exclusions≤12, cap12; единый30s, проверки времени после bounded step; cancel cleanup|`adapters/generation.test.ts`29999/30000/30001 и stalled-yield; controller timeout/late tests; реальный default benchmark512evaluations, ≤30s|
|T-03-05|high/Spoofing|`domain/recipeView.ts` resolveRecipeContext: bounded exact triple, active membership, enum/date safe return|`recipeView.test.ts`, `phase03-recipes.spec.ts#malformed duplicate oversized and external return URLs cannot rebind a saved occurrence`; direct/notfound/stale/reload byte assertions|
|T-03-06|high/Tampering|один canonical stock remainder date/slot/ingredient, exact rational facts+selected/base один раз|`planProjection.test.ts`, `recipeView.test.ts#scales base2 to family3 exactly once with four per portion facts including known zero`; independent acceptance USDA/price sums и literal500−200=300|
|T-03-07|medium/Information disclosure|`RecipeImage.tsx`, `data/recipeMedia.ts`: compiled version+id local sidecar, no remote hotlinks|`phase03-media.spec.ts` full-media запрещает nonlocal requests, проверяет52decodedheroes; fallback отдельно|
|T-03-08|high/Tampering|original artifact/prompt/time/hash/dimensions/path containment; sample не выдаётся за другую иллюстрацию|`scripts/check-recipe-media.mjs --all` fresh exit0 checked52/fulltrue; `recipeMedia.test.ts`; `docs/data/recipe-media.json` и `docs/qa/phase03-media-review.md` per-image provenance/review|
|T-03-09|high/Tampering|batch01 independent native outputs and review|media auditor52; browser `batch-01-01..03`; provenance batch01; source food data не изменены|
|T-03-10|high/Tampering|batch02 original artifacts/recipe-aligned content|media auditor52; browser `batch-02-01..03`; provenance batch02|
|T-03-11|high/Tampering|batch03 original artifacts/recipe-aligned content|media auditor52; browser `batch-03-01..03`; provenance batch03, previous37assets preserved|
|T-03-12|high/Tampering|batch04 original artifacts/recipe-aligned content|media auditor52; browser `batch-04-01..03`; provenance batch04|
|T-03-13|high/Tampering|exact52IDs/paths/different hashes/IHDR; factual catalog/persistence outside media|fresh auditor52, media unit5; full-media runtime and batch-05-01; original source gate остаётся12profiles/52recipes|
|T-03-14|high/Tampering|menu/cards берут тот же saved bundle+per-instance allocation; URL validation|`menuView.test.ts`, `phase03-presentation.spec.ts#EC-23/24/28/29 real saved day card opens exact occurrence and returns to its day and focus`; acceptance exacttriple|
|T-03-15|medium/Information disclosure|React text, local media, encoded route and same-app return|long-text synthetic `<img…onerror…>` displayed as text; recipe malformed/external return rejected; no rawHTML/media URL from localStorage|
|T-03-16|high/Tampering|failed save retains exact oldbytes; retry same candidate/no search; cancel/navigation invalidates ownership|`phase03-recovery.spec.ts`8cases incl real quota select/append/replace, corrupt/retry/late/cancel; controller unit suite|
|T-03-17|medium/Spoofing|validated return enum/date and exact origin, stale→current menu; pointer focus separated from keyboard scroll|recipe/menu URL unit and browser; native keyboard functional claims LIMITED: WindowsWebKit15/16/24/25 failed/unverified, clean-HTML reproduction separately documented|
|T-03-18|medium/Repudiation|fresh commands/exits retained; real ports vs synthetic literal oracle separated|`phase03-final-validation.md`, acceptance first6pass then extended8pass/1fail retained; full initial failures never overwritten by focused rerun; no human/native passes fabricated|
|T-03-SC|high/Tampering|никаких installs/updates, no packages/lockfile/catalog changes|`git diff 5987aa9 -- package.json package-lock.json data/sources src/data/recipes.ts` empty; untracked user skills-lock preserved; Context7 fetched docs without installs|

Все high mitigation implementations имеются; свежий unit и media audit их подтверждают. Browser current status берётся из итоговой QA-матрицы, а не из прошлого отчёта. Необнаружение новой high-угрозы не закрывает native/manual/UI gate. Независимый verifier остаётся обязательным.

## Проверка границ и ограничений

- Новых network endpoints/auth paths/schema/file access в production этот plan не вводит. Новые файлы — тесты/QA. Верификационные page.evaluate imports работают в dev harness, production preview smoke использует только собранный UI.
- Existing4_000_000-character envelope bound/strict keys/positive rational checks/trusted catalog equality не увеличивались. Invalid, incomplete, unknown и stale сохраняют tagged состояние; source bytes при read/retry не перезаписываются.
- Полное отсутствие сети с пустым cache не поддержано SPA без service worker; проверка52local assets при блокировке внешних URL не называется full-offline startup. No-cache offline и реальный nativeSafari15/device/AT не сертифицированы.
- `03-PROHIBITIONS.json`:6 `flagged-unverified` descriptorless items сохраняются. Behavioral evidence помогает verifier, но не превращается в автоматически пройденный descriptor/prohibition gate.
- Фото — авторские generated illustrations с disclosure, не доказательство приготовленного блюда/фактов/нутриционной полноценности. Кухонная, медицинская и окончательная визуальная оценка человека не проводилась агентом как user UAT.

## Повторная проверка 09.11.2026

Production-изменения `ff52a34` и `30f8735` ограничены lifecycle cancellation и DOM focus/scroll. Успешное сохранение сохраняет succeeded, навигация во время pending/save по-прежнему инвалидирует request. ConfirmDialog получает существующий ID инициатора. Keyboard scroll использует уже измеренные sticky offsets, pointer guard сохранён. Новых endpoints, auth paths, схем и file-access trust boundaries не добавлено.

T-03-18 имеет сохранённый initial960-case report с889pass/71unsuccessful и отдельные scoped reruns. Initial failures и человеческие/native ограничения не переименованы в pass. T-03-16 подтверждается реальными adapter quota/old bytes/retry/late operations. Последние unit478/478, typecheck/lint/build иmedia52 — exit0. Подробные browser outcomes перечислены в итоговой QA-матрице с именами оставшихся failures.

Supply-chain scope проверен read-only diff от `5987aa9` по package.json/package-lock.json/domain/data/sources. Изменений нет. Пользовательские untracked skills/lock/cache сохранены. Current React19.3.1 reference получен через Context7. Актуальный Web Interface Guidelines открыт09.11, source contract Safari15 и собственные ограничения приоритетны.

Четыре nativeWebKit anchor failures относятся к существующим WINDOWS15/16/24/25. WINDOWS26 и6descriptorless prohibitions остаются открыты. Новых unresolved high/critical app threats в рассмотренном diff не обнаружено. Этот вывод ограничен scoped source/test audit и не подтверждает общий release, human UAT или nativeSafari.
