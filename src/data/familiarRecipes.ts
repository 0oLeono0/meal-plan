import foodSnapshot from '../../data/sources/food.snapshot.json';
import expansion from '../../data/sources/phase031.snapshot.json';
import type { Ingredient, MealSlot, Recipe } from '../domain/catalog';
import { decimal } from '../domain/quantities';

const profiles = new Map([...foodSnapshot.records, ...expansion.records].map(row => [row.productId, row.profileId]));

function author(id: string, name: string, slot: MealSlot, cookingMinutes: number, amounts: Readonly<Record<string, number>>, steps: readonly string[]): Recipe {
  const ingredients: Ingredient[] = Object.entries(amounts).map(([productId, grams]) => {
    const profileId = profiles.get(productId);
    if (!profileId) throw new Error(`Unacquired ingredient: ${productId}`);
    return { productId, profileId, quantity: { amount: decimal(String(grams)), unit: 'g' } };
  });
  return { id, name, slots: [slot], cookingMinutes, baseServings: decimal('2'), ingredients, steps,
    source: { sourceId: 'mealplan-original-familiar-recipes', recordId: id, release: '2026-11-11-1',
      url: 'https://mealplan.invalid/original-recipes', license: 'MealPlan original authored content' } };
}

// Weighed edible inputs for two servings. Water is technological. All oil/sauce is served.
// Cooked yield and retention are not asserted.
export const familiarRecipes: readonly Recipe[] = [
  author('familiar-omelet-tomato-bread', 'Омлет с томатами и хлебом', 'breakfast', 15,
    { egg: 200, tomato: 200, bread: 120, oil: 10, salt: 2 }, [
      'Взвесьте 200 г яичной массы без скорлупы, размешайте с солью. Томаты вымойте и нарежьте небольшими кусочками.',
      'Разогрейте всё масло в сковороде на среднем огне. Прогрейте томаты 3–4 минуты, сохраняя сок.',
      'Влейте яйца, накройте крышкой и готовьте на слабом огне 6–8 минут до полного схватывания без жидких участков.',
      'Разделите омлет и весь томатный сок на две порции. Подайте с отмеренным цельнозерновым хлебом.',
    ]),
  author('familiar-chicken-rice-carrot', 'Куриное филе с рисом и морковью', 'lunch', 30,
    { chicken: 300, rice: 140, carrot: 200, onion: 80, oil: 14, salt: 3 }, [
      'Отмерьте сухой рис и промойте. Влейте в кастрюлю примерно 280 мл воды, добавьте половину соли. После закипания варите под крышкой на слабом огне 15–18 минут до мягкости и впитывания воды.',
      'Пока варится рис, очистите и взвесьте морковь и лук. Морковь натрите, лук мелко нарежьте. Сырое куриное филе без кожи и костей нарежьте кусочками около 2 см на отдельной доске, затем вымойте руки и инвентарь.',
      'В сковороде разогрейте всё масло, прогрейте лук и морковь 4–5 минут. Добавьте курицу и оставшуюся соль, перемешайте. Влейте около 100 мл воды, накройте и тушите 12–15 минут до полной готовности курицы, температура в центре куска должна достигнуть 74 °C.',
      'Проверьте мягкость риса и готовность курицы. Разложите рис, курицу, овощи и весь соус на две тарелки. При необходимости добавляйте при тушении воду, сохраняя подаваемый соус.',
    ]),
  author('familiar-lentil-cabbage-tomato', 'Чечевица с капустой и томатами', 'dinner', 30,
    { lentil: 140, tomato: 300, cabbage: 200, onion: 80, oil: 12, salt: 3 }, [
      'Отмерьте сухую красную колотую чечевицу, переберите и промойте. Очищенный лук мелко нарежьте, капусту тонко нашинкуйте, томаты нарежьте кубиками.',
      'В глубокой сковороде разогрейте всё масло. Готовьте лук 3 минуты, добавьте капусту и прогрейте ещё 4 минуты, перемешивая.',
      'Добавьте чечевицу, томаты, соль и около 350 мл горячей воды. После закипания тушите под крышкой 15–18 минут до мягкости чечевицы и капусты. При необходимости подливайте воду небольшими порциями.',
      'Перемешайте и подайте две порции вместе со всем соусом. Для этого времени нужна именно красная колотая чечевица, цельная зелёная варится дольше.',
    ]),
  author('familiar-yogurt-apple', 'Натуральный йогурт с яблоком', 'snack', 5,
    { yogurt: 300, apple: 200 }, [
      'Вымойте яблоко, удалите сердцевину. Взвесьте 200 г съедобной мякоти с кожицей и нарежьте небольшими кусочками.',
      'Отмерьте 300 г натурального йогурта без добавок. Разложите в две миски по 150 г йогурта и по 100 г подготовленного яблока.',
      'Перемешайте перед подачей. Подавайте сразу, чтобы нарезанное яблоко сохранило свежий вид и плотную текстуру.',
    ]),
];
