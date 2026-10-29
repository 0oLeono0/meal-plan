---
phase: "02"
slug: pervyy-dopustimyy-plan-i-rasschitannye-pokupki
status: draft
threats_open: 1
asvs_level: 1
block_on: high
register_authored_at_plan_time: true
created: "2026-10-29"
audited_head: b73ea09657413497b55a70b7100c092d144c9edc
---

# Фаза 2 — проверка заявленных угроз

Независимый gsd-security-auditor: OPEN_THREATS, 24/25 закрыты, одна high открыта. Реестр из десяти PLAN, без нового сканирования угроз вне реестра. Общий T-02-SC учтён один раз. Accepted risks и transfer dispositions отсутствуют.

| Threat | STRIDE | Severity | Status | Подтверждённая mitigation/evidence |
|---|---|---|---|---|
| T-02-01 | Tampering | high | CLOSED | catalog.ts:33; sources.test.ts:11: identity/reference/source/known/unknown; исходные12identities/48nutrientrows сверены с ZIP |
| T-02-02 | Denial of service | medium | CLOSED | quantities.ts:21,31,126: bounds/strict codec/ненулевой denominator |
| T-02-03 | Tampering | high | CLOSED | appliedSettings.ts:36,76,84,101: immutable copy/4step/exact raw parsing |
| T-02-04 | Tampering | high | CLOSED | plan.ts:132,157,210: schema/date/count/instance/reference; недостаточное доверие к catalog выделено в T-02-10 |
| T-02-05 | Tampering | high | CLOSED | planProjection.ts:78,100,113,120; независимые oracle tests:35,91: scaleonce/stockonce/referencecost |
| T-02-06 | Tampering | high | CLOSED | planProjection.ts:50,124,148; presentation.ts:16,54: exact+display budget/rounding/strict110% |
| T-02-07 | Tampering | high | CLOSED | generatePlan.ts:98,104,110,123,165: hard filters до admission/ranking, final shared budget |
| T-02-08 | Denial of service | high | CLOSED | generatePlan.ts:16,92,103; generation.ts:15,37,57,64: bounded work/macrotasks/abort/deadline |
| T-02-09 | Repudiation | medium | CLOSED | generatePlan.ts:84,134,152,208: seed/version/work; lower-bound/exhaustive/exhaustion различаются |
| T-02-10 | Tampering | high | OPEN | activePlan.ts:22,65,74 доверяет source facts из того же untrusted catalog; воспроизведение ниже |
| T-02-11 | Tampering | high | CLOSED | controller.ts:44,106,114,118; activePlan.ts:81,83: serialization/ownership beforewrite/savebeforepromotion |
| T-02-12 | Information disclosure | medium | CLOSED | activePlan.ts:8,56,84; guestDraft.ts:36,42: отдельные local keys, sentinel test:29, dietary transport не обнаружен |
| T-02-13 | Tampering | high | CLOSED | acquisition/production gate data/catalog.ts:53,68,75,83,87,93: source identity/bases/values/computed excerpt hashes. Restoration bypass выделен в T-02-10 |
| T-02-14 | Spoofing | high | CLOSED | data/catalog.ts:83,85; safety.snapshot; generatePlan.ts:110: identity evidence/explicit certification unknown |
| T-02-15 | Information disclosure | medium | CLOSED | source probes: public GET/verified TLS/no credentials; manifest public URLs |
| T-02-16 | Tampering | high | CLOSED | App.tsx:225,226,233; Wizard.tsx:54,100: один apply gate/skip retention/отдельный draft |
| T-02-17 | Tampering | high | CLOSED | App.tsx:225; controller.ts:106,118; GenerationPage.tsx:27: duplicate guard/controller promotion/memory-only |
| T-02-18 | Information disclosure | medium | CLOSED | GenerationPage.tsx:44,45; MenuPage.tsx:37: JSX text/no rawHTML/transport |
| T-02-19 | Tampering | high | CLOSED | MenuPage.tsx:31,33; ShoppingPage.tsx:24,25; PlanSummary.tsx:8; projection.test.ts:35: единая projection/canonical formatting/oracle |
| T-02-20 | Information disclosure | medium | CLOSED | PlanSummary.tsx:24–26: provenance текстом, без HTML/внешнего запроса |
| T-02-21 | Tampering | high | CLOSED | App.tsx:25,26,59; generation-fixtures.ts:21: production defaults/test-only injected ports/no URL switches |
| T-02-22 | Information disclosure | medium | CLOSED | plan-fixtures.ts:39; phase02-presentation.spec.ts:104: literal HTML payload/img count0/JSX text |
| T-02-23 | Tampering | high | CLOSED | generation-storage.spec.ts:96,121; generation-races.spec.ts:26,42: real late response/write invariants; фактические JUnit |
| T-02-24 | Repudiation | medium | CLOSED | docs/qa/phase02.md, webkit-assessment, реальные logs/XML:326unit/240FF/238pass2failWK, без fake Safari pass |
| T-02-SC | Tampering | high | CLOSED | package/lock direct16pins совпадают approved phase01-install-preflight, installs/изменения зависимостей отсутствуют |

## Блокер T-02-10

`validateActiveBundle` вызывает `validateActivePlanEnvelope`, структурно проверяющий catalog. Источники сравниваются с источниками из того же недоверенного JSON. Пересчёт работает, но использует подменённые confirmed facts. Доверенная поддерживаемая версия каталога не проверяется.

Аудитор выполнил probe без записи файлов/реального localStorage: настоящий bundled однодневный план, seed `security-readonly-probe`, четыре первых подходящих рецепта. Baseline load=`loaded`, purchase93.5054022407407274RUB. После encode в используемых profiles подменены nutrition.values на четыре строки `0`, price.amount на `0.0000001`; source IDs/releases/hashes сохранены. Adapter снова load=`loaded`, family calories0, purchase0.000000184RUB. Настоящий `validateBundledCatalog` того же catalog=`invalid`. Самосогласованная неизвестная version в catalog/inputs/instances тоже принималась как loaded.

Проблема — подмена подтверждённого факта, а не разрешённость нулевого нутриента. Mitigation: trusted registry поддерживаемых версий, сравнение persisted food/nutrition/price/safety/source/conversion/recipe с trusted version до projection/presence/promotion/save. Неизвестная версия/изменённые facts => corrupt/error, исходные bytes сохраняются, автоматическая запись запрещена. Self-consistency и hashes из того же JSON не заменяют источник доверия.

Нужны независимые регрессии altered nutrient/price/safety/source/recipe/conversion и согласованной unknown version; штатный save/reload и current-request guards должны сохраниться.

## Фактическая проверка аудитора

Повторно выполнена группа activePlan/catalog/sources/controller/generation/quantities:98/98,6files,9.02s. Эти зелёные тесты не покрывали подтверждённую подмену. Полная браузерная матрица не повторялась. Исходники аудитор не менял. Во всех SUMMARY отсутствует Threat Flags section, unmapped flags не обнаружены.

Security gate остаётся открытым до исправления и независимой перепроверки. Остальные выводы относятся к указанному audited HEAD; последующие изменения требуют delta review.
