# Phase 01: Гостевой старт и сохраняемые настройки — Pattern Map

**Mapped:** 2026-10-26. **Analog coverage:** 0 / 14 proposed file groups.
Greenfield: `rg --files` и `git ls-files` не обнаружили исходников приложения или package.json. Инструменты `.tmp` и материалы skills не являются аналогами приложения. Все пути и интерфейсы ниже — **FUTURE: предложения**, существующих символов и фрагментов для копирования нет.

## File Classification

| FUTURE proposed path/group | Role | Data flow | Closest analog |
|---|---|---|---|
| `package.json`, `tsconfig*.json`, `vite.config.ts`, `eslint.config.*`, `index.html` | config | transform | Нет |
| `src/main.tsx`, `src/app/providers.tsx` | provider | event-driven | Нет |
| `src/app/routes.tsx` | route | request-response | Нет |
| `src/app/AppShell.tsx`, `src/app/GuestPages.tsx` | component | event-driven | Нет |
| `src/app/config.ts`, `src/shared/styles/tokens.css` | config | transform | Нет |
| `src/features/wizard/Wizard.tsx`, `src/features/wizard/steps/*.tsx` | component | event-driven | Нет |
| `src/features/wizard/draftReducer.ts` | store | transform | Нет |
| `src/domain/settings/types.ts`, `defaults.ts` | model | transform | Нет |
| `src/domain/settings/validation.ts`, `selectors.ts` | utility | transform | Нет |
| `src/adapters/storage/guestDraft.ts` | service | file-I/O (browser storage) | Нет |
| `src/adapters/catalog/productNames.ts` | service | request-response | Нет |
| `src/shared/ui/*.tsx`, `src/shared/format.ts` | component / utility | event-driven / transform | Нет |
| `src/**/*.test.ts`, `vitest.config.ts` | test / config | transform | Нет |
| `e2e/*.spec.ts`, `playwright.config.ts` | test / config | event-driven | Нет |

## Pattern Assignments

Для всех 14 групп: **no analog found**; использовать `01-RESEARCH.md` (Architecture Patterns, Code Examples, Validation Architecture), `01-CONTEXT.md` и `01-UI-SPEC.md`. Точные имена файлов уточняет планировщик; таблица не утверждает наличие готовой архитектуры.
- App/routes: гостевые маршруты из RESEARCH; отдельный layout мастера; пустые состояния будущих функций. Port наличия валидного плана тестируется fixture, без выдуманного MenuPlan и fake generation.
- Wizard/reducer: UI event → чистый reducer → raw draft → проверка шага → ошибки/следующий шаг. Побочные эффекты хранения снаружи reducer; draft не является подтверждёнными настройками или глобальным pantry.
- Settings: предлагаемый контракт парсера — raw draft → валидные значения либо ошибки полей. Хранить сырые строки, ID и текущий шаг; структурная проверка восстановления отделена от готовности шага. Budget selector вычисляет `budget / people / days` лишь после проверки аргументов.
- Storage: предлагаемый load result различает отсутствующий, валидный, повреждённый, неподдерживаемой версии и недоступный snapshot; save возвращает успех/ошибку. Envelope `schemaVersion=1` + draft, ключ `mealplan:guest:draft:v1`; hydrate до autosave, recovery не перезаписывать до явного сброса. Retry сохраняет текущий draft.
- Catalog: search(query) → ID/названия/синонимы либо ошибка; UI различает loading/empty/error. Names-only данные без цены, nutrition и safety claims; свободный текст не создаёт продукт, повтор ID фокусирует строку.
- Tests: unit проверяют guards/reducer/парсер/storage failures/selectors; e2e — маршруты, четыре шага, восстановление, keyboard/focus, поиск и responsive. Fixtures storage/catalog/plan-presence должны быть изолированы.

## Shared Patterns

Нет существующих import/auth/error/test excerpts и line references для копирования. Auth в гостевую фазу не добавлять. Ошибки ввода возвращать данными; storage exceptions переводить в явное предупреждение и memory fallback. Текст выводить безопасно, snapshot считать недоверенным; reset удаляет только свой ключ. Общие formatter/config/tokens применять во всех экранах, производные значения не дублировать state.

## No Analog Found / Metadata

Все строки таблицы не имеют аналога: tracked tree содержит документы, planning и domain skill, но не app source. Область поиска: root inventory + полный tracked inventory; **app source files scanned: 0**. C-04/Q-03 блокирует зависимую реализацию калькулятора и закрытие WIZ-09; этот документ gate не снимает. Установка, разработка, тесты и сборка не выполнялись.
