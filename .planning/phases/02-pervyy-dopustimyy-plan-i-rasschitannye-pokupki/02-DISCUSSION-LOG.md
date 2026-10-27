# Phase 2 — Discussion Log

Дата: 2026-10-27. Режим `--auto`; пользователь запросил `$gsd-progress --next --auto`. Интерактивного опроса не было, ответы пользователя не выдумываются. Discuss выполнен одним проходом.

Наследовано: Phase 1 verified passed/UAT 9/9; guest/local/free architecture; optional manual person-day target; NEXT-10 P1; exact budget field; raw draft отличается от applied settings/pantry; C1 direct-select принят.

**[--auto] Selected all gray areas:** запуск/пропуск; бюджет и семейная база; цель питания; происхождение данных; ограничения и единицы; запасы; разнообразие/отказы; асинхронность; округление; сохранение/базовые экраны/приёмка.

| Q | Auto-selected recommendation | Контекст |
|---|---|---|
| Когда применять параметры? | Immutable applied snapshot, не каждый edit | D-01/02 |
| Что значит пропустить ограничения/домашние продукты? | Сохранить имеющиеся, явно объяснить; не снять запреты | D-03 |
| Какую сумму ограничивает бюджет? | Дополнительные покупки семьи за выбранные дни; три суммы раздельно | D-04 |
| На кого показывать КБЖУ? | День/среднее на человека, семейные totals явно отдельно | D-05 |
| Норма — жёсткая граница? | Мягкая цель с предупреждением F, запреты/бюджет жёсткие | D-06 |
| Что делать без цены/нутриентов/safety? | Не подставлять 0/true; incomplete data имеет объяснимый отказ | D-07 |
| Где взять данные? | Research бесплатных первичных источников; источник пока не выбран и не подтверждён | D-08/09 |
| Что с 50+ рецептами? | Не уменьшать цель/не выдавать fixtures за целевой каталог | D-09 |
| Как проверять ограничения/время? | Hard, unknown ≠ safe; выбранный time per recipe hard | D-10/11 |
| Как вычитать запас? | Aggregate period first, compatible basis, once only; unknown quantity preference only | D-12 |
| Как обеспечить воспроизводимость? | Settings+catalog version+seed, deterministic order/ties | D-13 |
| Что значит разнообразие? | same compact / medium avoid adjacency / max distinct, всё мягкое | D-14 |
| Когда показывать минимум? | Только обоснованный минимум; bounded search exhaustion — не доказательство невозможности | D-15 |
| Как отменять/обрабатывать timeout? | Request/revision guards, 30s, no late apply/no fake delay | D-16 |
| Как округлять? | Full precision inside; canonical product-row money, labelled display rules | D-17 |
| Как сохранять/показывать план? | One versioned active model, честный memory-only failure, real presence | D-18/19 |
| Что проверять? | 20 REQ, deterministic numeric cases + actual browser path + Phase 1 regressions | D-20 |

**Результат:** `02-CONTEXT.md`; это auto-выбор политик реализации, а не подтверждение фактических данных и не исполнение кода. Вопрос источников/прав Q-14 остаётся проверяемым research gate. Следующий шаг auto-chain: plan-phase research → планы/проверка → исполнение до реального блокера.
