# Локальные иллюстрации рецептов

На 2026-11-07 произведены и проверены все52 PNG текущего каталога mealplan-2026-10-28-1: sample и партии01…05. Aggregate содержит52 исходные записи,52 уникальных SHA256 и52 actual PNG1448×1086. Общий вес123844749bytes. Полная ведомость и границы проверок: [agent visual review](../qa/phase03-media-review.md), [локальный контактный лист](../qa/phase03-media-contact-sheet.html). Медиа не входят в factual catalog, sourceSnapshots или localStorage. Новый обязательный каталог Phase03.1 потребует своей проверки полноты; нынешнее число52 не доказывает его готовность.

Каждый рецепт требует отдельного встроенного image_gen вызова. Exact prompt включает название, все ингредиенты с количествами, воду и последовательность шагов, финальную текстуру. Требовать landscape 4:3, native PNG, нейтральную посуду и отсутствие неучтённых ингредиентов, текста, брендов. Полный фактический prompt сохраняется в ledger; шаблон не заменяет запись invocation.

Новый рисовый output создан встроенным инструментом без платного API. Original sample с hash 26007bd43e3b5611b576c982aec375f5eba95bbee8c40c16a64cfd8caae4aad5 сохранён как исследовательское evidence; его prompt/time неизвестны и не восстановлены догадкой. Ledger содержит собственные новые prompt/time/artifact/hash/dimensions. generatedAt — время отправки вызова. effectiveDate обозначает дату invocation; ревизия условий провайдера не утверждается.

Для каждого output обязательны recipeId, catalogVersion, local path, originalArtifact, prompt, generatedAt, provider, generated=true, termsUrl/effectiveDate, width/height, sha256, bytes и visualReview (status accepted, notes, reviewedAt). Это generated output по условиям провайдера, без утверждений CC0, исключительности или реальной фотографии приготовленного блюда. КБЖУ/состав из картинки не выводятся. Пользователь видит подпись о генерации.

После генерации открыть native output, сопоставить с exact ingredients/steps. Лишние ингредиенты или неверная текстура требуют reject и новой targeted generation; не исправлять растровые данные вручную. Скопировать native файл в public/recipes, сохранить оригинал, измерить IHDR/вес/SHA256 и записать фактические metadata. Не заполнять ledger будущими ассетами. При quota остановиться с сохранённым прогрессом; платный fallback не разрешён.

Проверка образца: `node scripts/check-recipe-media.mjs --ledger docs/data/recipe-media.json --ids rice-sweet-porridge`.

Партии используют docs/data/recipe-media-batches/01.json…05.json и явные --ids; browser groups batch-01-01…batch-04-03 проверяют по четыре ID, batch-05-01 — три. Финальный --all требует точные52 записи и физический PNG set, уникальные actual hashes и корректные headers. `npm run test:e2e -- e2e/phase03-media.spec.ts --grep sample --project=chromium --workers=1` проверяет реальный decode и отдельно HTTP404 fallback. Full-media исполнен в03-09:52hero decode при блокировке всех внешних origins и доступном локальном сервере. Полный browser-network-offline/cold reload не заявлен: Vite no-cache требует перепроверки PNG. Отсутствие файла — ошибка positive image gate, никогда skip.

RecipeImage: герой eager, остальные вызовы по умолчанию lazy; decorative даёт alt="" для карточки с независимой текстовой ссылкой. Loading резервирует 4:3. Ошибка удаляет img и один раз показывает нейтральный SVG с «Фото недоступно» без повторных запросов.
