# Phase03 Plan11 — recovery, клавиатура и совместимость

Проверка08.11.2026. Это вклад03-11, не приёмка Phase3 или P0. Общие требования остаются Pending до03-12. Каталог52рецептов, исходные факты, dependencies и persisted schema не менялись. Phase03.1 выполняется отдельно после Phase3.

## TDD и реальные причины

| Сценарий | RED | Исправление / подтверждение |
|---|---|---|
| Cancel generation → wizard |033e5aa: реальный Tab/Enter, generate-menu inactive; `.tmp/03-11-01-red.json`, classifier RED_EVIDENCE_OK |Store notification приходил раньше Router transition и потреблял origin на старой странице. Origin хранится до commit целевого pathname. Chromium recovery8 + legacy8:16/16,58.6s |
| Requested selection row / append |5/8passed,3assertion failures: нет status в requested row, нет утверждённого текста поиска. `.tmp/03-11-row-red.json`, RED_EVIDENCE_OK |Один полный status в candidate row; saved selection не меняется до ack; append «Ищем новый вариант…»/«Отменить подбор» |
| Cancel announcement |3-case targeted:1pass/2fail (второй — recipe skeleton); `.tmp/03-11-cancel-notice-red.json`, RED_EVIDENCE_OK |Постоянное сообщение об отмене у saved menu, без таймера/нового store |
| Recipe skeleton |Тот же реальный delayed catalog retry: нет aria-hidden skeleton. `.tmp/03-11-02-red.json`, RED_EVIDENCE_OK |Общий PlanLoading recipe kind с busy/skeleton/единственным status; initial и retry используют один контракт. Chromium recipes8/8,22.7s |
| Equal recipe hero |Все3engines показали80px разницы при768. Изолированный Chromium EC-41:1failed, classifier RED_EVIDENCE_OK |Browser default figure margins40px с каждой стороны убираются только внутри recipe-hero |
| WebKit pointer card navigation |Изолированный EC-23 реально оставался /menu. Trusted pointerdown и pointerup попадали на разные карточки; click — tabpanel. `.tmp/03-11-pointer-red.json`, RED_EVIDENCE_OK |WebKit фокусирует tabpanel на mousedown; его onFocus scroll сдвигал страницу до mouseup. Modality ref оставляет panel scroll для клавиатуры, исключает во время pointer interaction; native links не заменены |
| Real PNG hero4:3 |Playwright MCP visual обнаружил вытянутое настоящее изображение; isolated EC-42: ratio0.3020257826887661 вместо4/3. `.tmp/03-11-hero-red.json`, RED_EVIDENCE_OK |Проверка использует actual bundled PNG, а не synthetic fallback; исходный HTML height требует CSS height:auto внутри recipe-hero |

Первый EC-41 classifier отказал: в общем JUnit три одноимённых failures на разных engines были неоднозначны. Production fix не применялся до нового изолированного RED. Первая попытка проверки retry heading использовала ошибочное ожидаемое название; после исправления на фактический successful recipe state + h1 focus тест прошёл на прежнем коде. Это existing coverage, не RED и не основание менять работающий focus.

## Recovery и trust boundaries

Реальная generation + local adapter, контролируемая ошибка записи: select/append/replace сравнивают literal старые bytes до ack и после failure; active ID остаётся прежним. Retry сохраняет тот же candidate, search counter не растёт, double-click даёт одну final write. После reload совпадают новые bytes/active; raw draft сохранён. До replacement test сначала выбирает второй вариант: повторный deterministic поиск не обязан отличаться от первого, поэтому fixture не использует одинаковые bytes как ложный оракул.

Pending row не объявляет новое selected. Cancel и navigation away перед настоящим поздним ответом не пишут и не перенаправляют. External corrupt bytes блокируют persistence; Keep current не пишет; valid reload восстанавливает прежнее меню. Ошибки/отказы не скрываются таймером. Saved menu/shopping/recipe читают active, не candidate. T-03-16/T-03-17 покрываются исполняемыми bytes/identity/focus сценариями; новых endpoints/auth/file-I/O boundaries нет.

Recipe tests проходят direct/base, known/unknown, malformed/duplicate/oversized/external return, stale/nonactive, incomplete/corrupt retry, late catalog result после ухода, media failure отдельно от recipe success. Четыре КБЖУ раскрываются native details Enter/Space, сохраняют focus и подписанную базу. Реальные Tab/Enter возвращают exact card с полным отображением над sticky.

## Geometry и UI review

Действительные widths:360/390/430/768/1199/1200/1279/1280;1/3/7dates;12variants; long names/large sums/source strings; reduced-motion; short height400;200% text enlargement. Text enlargement не выдаётся за browser zoom. Сводки/стоимости не копируются в React state. ResizeObserver и visualViewport применяются в прежних владельцах измерений; safe-area остаётся частью измеренной navigation height и не складывается второй раз.

EC-40 проверяет native Tab/ShiftTab trap, Escape, возврат initiator, отсутствие записи при отмене; EC-41 проверяет равные hero columns и полный перенос. Имеющиеся EC-19/20 проверяют Arrow/Home/End/Enter/Space и final focus над sticky. No overflow masking, CSS reorder, inert/showModal, toSorted или незащищённых crypto APIs не добавлено.

UI review использует [Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md), прочитанные08.11.2026, локальные UI UX Pro Max и Vercel React rules. Приоритет имеют project/Safari15 constraints: native semantics, один owner snapshot, derived values в render,44px targets/48px primary,16/14/24/32 typography,400/600 weights, существующие contrast tokens.

Старый phase02 sequential recovery test теперь реально подтверждает замену уже сохранённого меню через Tab/Enter. Ни одна из восьми cancellation веток не исключена. Lazy image fallback test прокручивает раннюю карточку в viewport перед ожиданием фактического request/error; при today's date внутри legacy period она обоснованно lazy. URL commit проверяется до strict singleton recipe assertions.

## Результаты и пределы

После последних logic/layout fixes: unit478/478 в20files,13.22s. После финального height:auto fix typecheck/lint/build повторены: exit0. Build target safari15,145modules, CSS16.84kB/4.09gzip, JS514.08kB/145.71gzip; прежнее advisory предупреждение chunk>500kB остаётся WINDOWS21. Повтор unit после чисто CSS height:auto не требовался; никаких unit failures нет.

Presentation: первый18-case run14pass/4fail (lazy image2, WebKit pointer1, nativeTab1); второй21-case run16pass/5fail (новый margin80px3, pointer1, nativeTab1). После исправлений выполнен только affected gate `-g 'EC-23|EC-41|EC-19'`:9/9 all3engines,48.5s. Остальные12case verdicts сохраняются из общего прогона; это не повторный полный21-case pass. Lazy fallback действительно прошёл все3engines после scroll. EC-40 twelve variants/modal trap прошёл все3; EC-20 Windows WebKit по-прежнему failed, WINDOWS24open (связан с15/16). Полный browser suite проекта здесь не запускался.

Фактически открыты visual tool: `.tmp/phase03-qa/03-11-dialog360.png`, `03-11-long-recipe-{360,768,1280}.png`, `03-11-12variants-200text-360.png`, `03-10-{390,430}-menu.png`; oversize текст переносится полностью и продолжает страницу вертикальным scroll. MCP напрямую открыл настоящий `/recipe/rice-sweet-porridge` при390/1280; visual нашёл actual hero ratio bug до закрытия плана. Финальные hero screenshots проверяются после исправления. Синтетический текст `<img...>` отображается как текст, не исполняется; это stress fixture, не содержимое каталога.

`npm run test:e2e -- e2e/seed-compatibility.spec.ts e2e/phase03-recovery.spec.ts e2e/phase03-recipes.spec.ts --workers=1`:62passed/1failed,exit1,6.1min; `.tmp/03-11-browser-final.xml` и `.tmp/03-11-browser.log`. Recovery24/24, seed15/15 (missing/throwing UUID, unavailable entropy, wizard, catalog reload), recipes23/24. Единственный failed —Windows WebKit `real Tab Enter and Space open composition and return focus to the exact day card`: native Tab не фокусирует meal-card anchor, тест останавливается до входа в рецепт; WINDOWS25open. Chromium/Firefox тот же путь прошли. Assertions и реальная клавиатура сохранены.

Последующий `npm run test:e2e -- e2e/phase03-presentation.spec.ts --workers=1 -g 'EC-42'`:3/3 all3engines,14.6s,exit0. Фактически открыты финальные `.tmp/phase03-qa/03-11-actual-hero-{360,768,1280}.png`: настоящее локальное PNG4:3, hero columns равны, подпись/текст переносятся. Это affected verification после последней CSS строки, не повтор63-case run. Новых stubs или критических/high security поверхностей нет. Неизменённый controller с его ownership/guard/30s семантикой дополнительно покрывается полным unit gate.

Native Safari15/macOS/iOS, физические safe-area/touch/виртуальная клавиатура, screen reader/AT, полноценный browser200%zoom и человеческое восприятие не проверены. Windows WebKit не выдаётся за native Safari. Исторические ограничения native Tab по ссылкам WINDOWS15/16 остаются отдельными фактическими failures, без skip, force focus, изменения OS preference или ослабления assertions. UAT остаётся end-of-phase; auto-chain не создаёт пользовательские pass.
