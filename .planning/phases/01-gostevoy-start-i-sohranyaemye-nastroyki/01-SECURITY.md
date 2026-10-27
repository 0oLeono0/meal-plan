---
phase: "01"
slug: gostevoy-start-i-sohranyaemye-nastroyki
status: verified
threats_open: 0
asvs_level: 1
created: "2026-10-27"
register_authored_at_plan_time: true
---

# Phase 1 — Security

Проверены только угрозы, заранее перечисленные в PLAN 01–08. Порог блокировки — high. Независимый gsd-security-auditor подтвердил 12/12 мер защиты; исходники не изменял. Общий T-01-SC учтён один раз. Отчёт не означает полного penetration test или завершения человеческой приёмки.

## Trust Boundaries

| Boundary | Description | Data Crossing |
|---|---|---|
| Browser input/storage/catalog → domain | Непроверенные значения проходят структурную и семантическую проверку | raw draft, product IDs, quantity, provenance |
| Domain → UI | React text rendering, без HTML из пользовательских значений | brand, labels, validation messages |
| Human decision → scope | Фактические ответы и согласованные версии отделены от машинной проверки структуры | install approval, scope-amendment |

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|---|---|---|---|---|---|---|
| T-01-01 | Tampering | snapshot | high | mitigate | guestDraft.ts:28 + settings.ts:53; version/shape before hydrate; guestDraft.test.ts:31, guest.spec.ts:100 | closed |
| T-01-02 | Tampering | storage lifecycle | high | mitigate | guestDraft.ts:19/34; App.tsx:86–99 queue/revision guards; storage.spec.ts:28, guest.spec.ts:112 | closed |
| T-01-03 | Information disclosure | brand/routes | medium | mitigate | App.tsx text/routes; navigation.spec.ts:92 hostile brand, stale presence, deep routes | closed |
| T-01-04 | Tampering | budget | high | mitigate | budget.ts strict digit/safe integer parse, separate projection; budget.test.ts:15, budget.spec.ts:13/36 | closed |
| T-01-05 | Information disclosure | manual target | medium | mitigate | nutritionTarget.ts absent/partial/finite checks; manual provenance; nutrition.spec.ts:19/36/68 | closed |
| T-01-06 | Tampering | product labels | high | mitigate | ProductCombobox React text; products.spec.ts:126/275 hostile labels/IDs remain literal | closed |
| T-01-07 | Tampering | IDs/undo | high | mitigate | ExclusionsStep/HomeProductsStep duplicate/undo guards; settings.ts unique known IDs; products.spec.ts:158/209 pantry/confirmed sentinels | closed |
| T-01-08 | Tampering | async search | medium | mitigate | ProductCombobox latest token/active/pending guards; products.spec.ts:103/252 out-of-order, retry, repeated Enter | closed |
| T-01-09 | Tampering | calculator gate | high | mitigate | human-confirmed decision; historical archive preserved; validator exit 1 REPLAN_REQUIRED; NEXT-10 P1, manual WIZ-09 separate | closed |
| T-01-10 | Information disclosure | demographic data | medium | mitigate | No demographic input/formula in P0; manual parser only; dormant calculated provenance type is not implemented calculator | closed |
| T-01-11 | Tampering | explicit reset | high | mitigate | Only DRAFT_KEY removed; App reset invalidates revision and awaits write; guestDraft.test.ts:31/44, storage.spec.ts:6/76/105/125 | closed |
| T-01-12 | Information disclosure | local QA artifacts | low | accept | Fixture-only local screenshots/logs; no credentials or external publication, as planned in 01-08 | closed — planned accept documented |
| T-01-SC | Tampering | packages | high | mitigate | Actual human-approved 16 exact pins equal package.json/lock; auditor compared versions/integrity/tarballs; no extra direct dependencies | closed |

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---|---|---|---|---|
| AR-01 | T-01-12 | Fixture-only local QA images/logs, no credentials or external publishing. This entry records the existing plan disposition; it does not invent a separate human risk approval. | Planned accept in 01-08-PLAN.md; recorded by orchestrator | 2026-10-27 |

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|---|---|---|---|---|
| 2026-10-27 | 13 | 12 mitigation + 1 planned accept | 0 | gsd-security-auditor; accepted-risk ledger recorded by orchestrator |

Evidence inspected: source and named tests, approved install JSON, exact direct pins/lock integrity, normalized historical plan archive, existing actual logs: 134 unit, full Chromium/Firefox 112 each before focus fix, final WebKit 112 and affected Chromium/Firefox 70 afterward. No additional runtime suite was executed by the auditor. Source line numbers refer to the audited revision and can move with later presentation-only edits.

No unmapped Threat Flags were found in the eight SUMMARY files. Device, accessibility judgement and two-tab UX limits remain acceptance debt in QA/VALIDATION; this audit does not convert them to passed.

## Sign-Off

- [x] All planned threats have a disposition.
- [x] Existing planned accepted risk recorded without invented human approval.
- [x] threats_open: 0 at configured high threshold.
- [x] status: verified for this bounded ASVS1 mitigation audit.

## Correction after code review — 2026-10-27

Предыдущие verdict/sign-off и таблица являются историей независимого аудита до новых code-review контрпримеров. Аудитор не запускал новые runtime suites. Последующее `01-REVIEW.md` на `c899a1c` воспроизвело **CR-01**: при восстановлении доступа к чтению без memory edits App игнорировал загруженный снимок и сохранял defaults. Следовательно, прежнего evidence **T-01-02** было недостаточно для полного storage lifecycle; этот сценарий был пропущен аудитом, а не обнаружен им.

**T-01-02 correction:** `8811b0f` добавляет dirty tracking после неуспешной гидратации, восстановление `result.draft` без записи при отсутствии edits, проверку dirty после await и revision/mounted/resetting guard. `e2e/storage-retry.spec.ts`: шесть сценариев (полный raw snapshot без перезаписи, edits до/во время controlled retry, missing без unsolicited write, corrupt без перезаписи, failed write/retry latest value). Все шесть прошли в каждом из Chromium/Firefox/WebKit на окончательном source `8cd5872`. Нетронутый снимок включает restrictions/exclusion IDs, home product ID/quantity/unit/expiry и manual provenance. Это новое evidence после исправления; оно не приписывается прежнему audit.

**T-01-11 correction/extension:** WR-02 не менял разрешённый объём удаления, но обнаружил потерю доступной точки продолжения после explicit reset. `8cd5872` добавляет heading fallback только при удалённом инициаторе; существующий возврат к живому инициатору сохранён. `storage.spec.ts` проверяет успешный reset с первого шага, cancellation/failed-reset focus и сохранность foreign keys во всех трёх браузерах. WR-01 (`a82e308`) отдельно восстанавливает post-commit focus первой ошибки в свёрнутой норме; semantics/nutrition facts не менялись.

Проверки выполнены **в основном checkout**, `workflow.use_worktrees=false`: 134 unit passed, typecheck/lint/build exit 0. Связанный browser run — **185 passed / 1 Firefox context teardown error**, не 186 green; изолированный повтор teardown error также failed. Все регрессии указанных угроз/замечаний прошли; инфраструктурная причина ошибки ещё не установлена. Evidence и точные команды — `01-REVIEW-FIXES.md`, `docs/qa/phase01.md`, `.tmp/phase01-qa/review-related-186.xml`. Это addendum исполнителя с новым evidence, **не повторный независимый security audit** и не завершение приёмки Phase 1. Независимый review логики CR-01 и ранее указанные human gates остаются.
