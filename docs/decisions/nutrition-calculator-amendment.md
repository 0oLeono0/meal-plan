# Поправка C-04: персональный автокалькулятор перенесён в P1

**Источник:** [human-confirmed record](nutrition-calculator.json), `decision=scope-amendment`, ответ человека «тогда выбираем второй» от 26.10.2026. Это явная поправка объёма, а не автоматический выбор агента. **Replan: prepared; независимый checker и исполнение 01-07/08 ещё не завершены.**

| Было | Применимый контракт | Статус |
|---|---|---|
| WIZ-09: manual + спорный автоматический расчёт F §5.2 | WIZ-09 сохраняет ID: необязательная ручная цель КБЖУ на человека в день, manual origin; пустой набор отсутствует, partial требует исправления/очистки, полный finite ккал > 0 и Б/Ж/У ≥ 0 | P0, Pending до QA 01-08 |
| Автоматический расчёт по полу/возрасту/росту/весу/активности, результат и «Использовать» | Новый NEXT-10, прежняя вычислительная часть WIZ-09; после приёмки P0 | P1, не реализован |
| Calculator empty/loading/error/partial, overflow/long-text | Все calculator-строки явно deferred P1/NEXT-10 в UI-SPEC/VALIDATION | Не реализованы и не входят в приёмку P0 |
| C-04: конфликт P0-мастера и P1-сводки | Человек разрешил только приоритет; история оригинала сохранена | Подтверждено record |
| Q-03: формула/коэффициенты/диапазоны/средние нормы; роль nutrition targets | Формула и будущий result/Use контракт P1 неизвестны; жёсткость целей генерации P0 тоже не определена | Частично открыт |

Неподтверждённые средние нормы не подставляются. Пустая цель не сравнивается с нулём и не даёт медицинской оценки. Обязательные детерминированные расчёты КБЖУ из структурированных ингредиентов для рецептов/порций/меню, бюджет/покупки и жёсткие пищевые ограничения сохраняют P0 без изменения. Перенос не означает выполнение вычисления или завершение фазы.

Исходные четыре PDF/DOCX в reference не меняются. Прежний [01-07](archive/01-07-calculator-before-amendment.md) сохранён вне phases с историческим контрактом; SUMMARY 01–05 не переписываются. Исходное [предложение](nutrition-calculator-proposal.md) помечено историческим с принятым вторым вариантом.

Affected paths: docs/decisions/nutrition-calculator.json, nutrition-calculator-proposal.md, этот mapping и archive/01-07-calculator-before-amendment.md; reference/PRD.md и OPEN_QUESTIONS.md; .planning/PROJECT.md, REQUIREMENTS.md, ROADMAP.md, STATE.md; phase01 CONTEXT, UI-SPEC, VALIDATION, PATTERNS, RESEARCH (только notice применимости), SKELETON и PLAN 01-07/08. PLAN 01-06, application source и validator не меняются.

| Source audit | Покрытие поправки |
|---|---|
| GOAL | Четыре шага и сохраняемые гостевые настройки сохранены; финальная QA 01-08 |
| REQ | WIZ-09 manual Pending; прежнее вычисление NEXT-10 явно P1, прочие P0 без изменения |
| RESEARCH | Исторические рекомендации/цитаты сохранены, сверху явный notice о принятом scope |
| CONTEXT | D-09 manual сохранён; D-10 заменён точной человеческой поправкой с provenance |

Проверка при исполнении 01-07:

1. Выполнить оба `<automated>` node-check из PLAN 01-07: точные decision/status/response/source/timestamp; сохранение WIZ-09 Pending и новый NEXT-10; все четыре UI calculator-состояния deferred P1; 01-08 содержит применимую ручную приёмку.
2. Существующий `node scripts/verify-calculator-decision.mjs docs/decisions/nutrition-calculator.json` обязан вернуть **exit 1 / REPLAN_REQUIRED**. Это ожидаемый запрет реализации формулы, его нельзя чинить для обхода gate.
3. Проверить affected-path diff: нет калькуляторных application-файлов, изменений четырёх binary reference, SUMMARY 01–05 и PLAN 01-06; `git diff --check` проходит.
4. Проверить структуру/frontmatter PLAN 01-07/08 штатным GSD; dependency 01-08 → 01-06/07 сохраняется. Подготовка не создаёт SUMMARY. Исполнитель 01-07 записывает фактические результаты, затем 01-08 проводит QA; WIZ-09/фаза не закрываются этим mapping.
