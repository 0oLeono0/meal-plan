---
phase: "03"
slug: sravnenie-variantov-i-prosmotr-retseptov
status: verified
threats_open: 0
threats_total: 19
asvs_level: 1
block_on: high
register_authored_at_plan_time: true
created: "2026-11-09"
audited_head: e989842
---

# Phase03 — Security

Независимый gsd-security-auditor проверил19плановых mitigations,14high и5medium. Scoped ASVS level1 review. Threat register закрыт по наличию и placement мер в исходниках. Фазовая приёмка и native/human gates остаются открыты.

## Trust Boundaries

| Boundary | Data crossing | Control |
|---|---|---|
| localStorage → active plan | Недоверенный envelope и каталог | Полная структурная/semantic validation, trusted catalog equality |
| generation → saved state | Candidate, request/revision ownership | Serialized guarded save и ack-only installation |
| URL → recipe/menu | IDs, variant/instance, return day/mode | Bounded exact triple и allowlist return |
| structured facts → projection | Количества, nutrition, price, pantry | Rational calculation и единый remainder |
| local asset/provenance → UI | PNG paths и attribution | Compiled map, path/hash/IHDR/physicalset auditor |

## Threat Register

Все строки имеют disposition `mitigate`. Номера строк относятся к audited HEAD.

| Threat ID | Category | Severity | Disposition | Mitigation evidence | Status |
|---|---|---|---|---|---|
| T-03-01 | Tampering | high | mitigate | plan.ts224, activePlan.ts28/34, trustedCatalogs.ts26, all-variant validation | closed |
| T-03-02 | Tampering | high | mitigate | controller.ts54/126/136, activePlan.ts89, owned serialized ack | closed |
| T-03-03 | Tampering | high | mitigate | controller.ts163/175/196, MenuPage.tsx200, App.tsx242, saved inputs/confirmation | closed |
| T-03-04 | DoS | medium | mitigate | generation.ts32/43/65/77, controller.ts198, bounded search/deadline/cap | closed |
| T-03-05 | Spoofing | high | mitigate | recipeView.ts20/27/36/44/52, bounded exact triple/return | closed |
| T-03-06 | Tampering | high | mitigate | planProjection.ts78/83/115, recipeView.ts97/108/121, single remainder/rational facts | closed |
| T-03-07 | Information disclosure | medium | mitigate | recipeMedia.ts58/60, RecipeImage.tsx14, phase03-media.spec.ts175, local allowlist | closed |
| T-03-08 | Tampering | high | mitigate | check-recipe-media.mjs24/25/28/31/35, original provenance/path/hash | closed |
| T-03-09 | Tampering | high | mitigate | recipe-media-batches/01.json6/13, auditor25/35, all12 exact aggregate/original match | closed |
| T-03-10 | Tampering | high | mitigate | recipe-media-batches/02.json6/13, auditor25/35, all12 exact aggregate/original match | closed |
| T-03-11 | Tampering | high | mitigate | recipe-media-batches/03.json6/13, auditor25/35, all12 exact aggregate/original match | closed |
| T-03-12 | Tampering | high | mitigate | recipe-media-batches/04.json6/13, auditor25/35, all12 exact aggregate/original match | closed |
| T-03-13 | Tampering | high | mitigate | auditor13/21/35/46, phase03-media.spec.ts183/193, exact52IDs/hash/IHDR | closed |
| T-03-14 | Tampering | high | mitigate | MealCard.tsx12/14, menuView.ts15/27, recipeView.ts100, instance projection/context | closed |
| T-03-15 | Information disclosure | medium | mitigate | MealCard.tsx14/21, RecipePage.tsx41/56, RecipeImage.tsx7, recipeView.ts44, safe React text | closed |
| T-03-16 | Tampering | high | mitigate | controller.ts134/144/210, App.tsx222, recovery.spec.ts23/84, preserved bytes/retry/late guard | closed |
| T-03-17 | Spoofing | medium | mitigate | recipeView.ts36/53, MenuPage.tsx74/78, RecipePage.tsx34, validated return/focus origin | closed |
| T-03-18 | Repudiation | medium | mitigate | acceptance.spec.ts18/38, retained initial/final XML, final-validation.md209/228 | closed |
| T-03-SC | Tampering | high | mitigate | package.json14/package-lock.json1, phase-wide diff/log e1ce49b→e989842 empty for dependencies | closed |

Source paths above are rooted in `src/domain`, `src/adapters`, `src/features/generation`, `src/features/menu`, `src/features/recipe`, `src/shared`, `src/data`, `scripts`, `docs/data`, `e2e` as named in docs/qa/phase03-security.md. No accepted risks were introduced. No SUMMARY threat flags remained outside the register.

## Security Audit

| Field | Result |
|---|---|
| Date | 2026-11-09 |
| Auditor | gsd-security-auditor, independent source inspection |
| Threats found | 19 |
| Closed | 19 |
| Open | 0 |
| Fresh checks | media auditor checked52/fulltrue,52original SHA256 matches, five batch ledgers match aggregate |
| Reused evidence | unit478, type/lint/build, critical60pass, XML independently inspected |

## Limitations and Sign-Off

Same-origin localStorage remains user/script editable. Browser validation does not provide server-side authentication or production hosting/header assurance. No package changes or new network/auth endpoints were introduced. Four native WebKit Tab failures WINDOWS15/16/24/25, WINDOWS26 nativeSafari/device/AT/zoom/human UAT and six descriptorless prohibitions retain their open/unverified status. T-03-17 closes the spoofing control only. Native focus usability requires its separate gate.

Initial960=889pass/71failure-or-error is retained, with separately scoped post-fix reports. Full post-fix960pass is absent. Security verdict does not mark Phase03/P0 or shared requirements complete.

- [x] All19mitigations have concrete source evidence
- [x] threats_open0 at high threshold
- [x] Scoped security status verified
- [ ] Phase03 human acceptance

## Post-review recovery correction

Независимый code review обнаружил CR-01 в retry dispatch выбора. Исправление ec24f1b связывает retry сtargetID/baseRevision вместо прежнего append/replace descriptor. RED913cd3b иcontrollerGREEN48/48 подтверждают отсутствие новой генерации/замены после timeout для generated иloaded base. T-03-02/03/16 controls сохраняются с этим уточнением. WR-01focus correction прошла6browserchecks all3engines. New endpoints/auth/schema/file boundaries отсутствуют. Более ранний19-row source audit относится кe989842, эти изменения иevidence учтены отдельно.
