import { describe, expect, it } from 'vitest';
import { createDraft } from './settings';
import { buildAppliedSettings } from './appliedSettings';
import { decimal } from './quantities';
import type { Catalog, Recipe } from './catalog';
import { foodSources } from '../data/foodSources';
import * as plan from './plan';

// Synthetic recipes are structural oracles; no production/source readiness assertion.
const source = { sourceId: 'test-author', recordId: 'recipe-1', release: 'v1', license: 'CC0-1.0', url: 'https://example.org/recipe-1' };
function catalogFixture(): Catalog {
  const food = foodSources.foods[0];
  const recipe: Recipe = { id: 'test-recipe', name: 'Тестовый рецепт', baseServings: decimal('2'),
    ingredients: [{ productId: food.productId, profileId: food.profileId, quantity: { amount: decimal('100'), unit: 'g' } }],
    slots: ['breakfast', 'lunch', 'dinner', 'snack'], cookingMinutes: 10, steps: ['Тестовый шаг'], source };
  return { version: 'test-v1', foods: [food], recipes: [recipe] };
}
function settingsFixture(days = '1') {
  const draft = createDraft(); draft.days = days; draft.people = '3';
  draft.home = [{ productId: 'egg', quantity: '', expiresSoon: true }];
  const applied = buildAppliedSettings(draft);
  if (applied.status !== 'applied') throw new Error('Invalid test fixture');
  return applied.settings;
}
function inputsFixture(days = '1', date = new Date(2026, 9, 27, 0, 5)) {
  return plan.createPlanInputs(settingsFixture(days), catalogFixture(), { now: () => date, seed: 'test-seed' });
}
function envelopeFixture(days = '1') {
  const inputs = inputsFixture(days);
  const instances = plan.createRecipeInstances(inputs, Array(Number(days) * 4).fill('test-recipe'), (date, slot) => `${date}/${slot}`);
  return plan.buildActivePlanEnvelope(inputs, [{ id: 'variant-1', instances }], 'variant-1');
}
function corrupt(change: (value: Record<string, unknown>) => void) {
  const encoded = plan.encodePlanEnvelope(envelopeFixture()) as Record<string, unknown>;
  change(encoded);
  return encoded;
}
describe('dated reproducible plan boundary', () => {
  it('stores the local calendar date for a launch near midnight', () => {
    expect(plan.localDateOnly(new Date(2026, 9, 27, 0, 5))).toBe('2026-10-27');
    expect(inputsFixture().startDate).toBe('2026-10-27');
  });
  it.each(['1', '7'])('creates exactly four unique date-slot instances per day for %s days', days => {
    const envelope = envelopeFixture(days);
    expect(envelope.inputs.dates).toHaveLength(Number(days));
    expect(envelope.variants[0].instances).toHaveLength(Number(days) * 4);
    expect(new Set(envelope.variants[0].instances.map(instance => instance.id)).size).toBe(Number(days) * 4);
    expect(envelope.variants[0].instances.slice(0, 4).map(instance => instance.slot)).toEqual(['breakfast', 'lunch', 'dinner', 'snack']);
    expect(plan.validateActivePlanEnvelope(envelope).status).toBe('valid');
  });
  it('walks calendar days across DST, leap day and year boundary', () => {
    expect(plan.calendarDates('2026-03-07', 4)).toEqual(['2026-03-07', '2026-03-08', '2026-03-09', '2026-03-10']);
    expect(plan.calendarDates('2026-10-31', 3)).toEqual(['2026-10-31', '2026-11-01', '2026-11-02']);
    expect(plan.calendarDates('2024-02-28', 3)).toEqual(['2024-02-28', '2024-02-29', '2024-03-01']);
    expect(plan.calendarDates('2026-12-31', 2)).toEqual(['2026-12-31', '2027-01-01']);
    const spring = inputsFixture('4', new Date(2026, 2, 7, 23, 55));
    expect(spring.dates).toEqual(['2026-03-07', '2026-03-08', '2026-03-09', '2026-03-10']);
  });
  it('uses local date on both sides of UTC midnight', () => {
    for (const instant of ['2026-10-26T21:05:00Z', '2026-10-27T03:55:00Z']) {
      const date = new Date(instant);
      const expected = [String(date.getFullYear()).padStart(4, '0'), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
      expect(plan.createPlanInputs(settingsFixture(), catalogFixture(), { now: () => date, seed: 'seed' }).startDate).toBe(expected);
    }
  });
  it('keeps repeated recipe IDs as independent source instances and scales servings only later', () => {
    const envelope = envelopeFixture(); const [breakfast, lunch] = envelope.variants[0].instances;
    expect(breakfast.recipeId).toBe(lunch.recipeId); expect(breakfast.id).not.toBe(lunch.id);
    expect(breakfast.selectedServings).toEqual({ numerator: 3n, denominator: 1n });
    expect(breakfast.recipeSnapshot.baseServings).toEqual({ numerator: 2n, denominator: 1n });
    expect(breakfast.recipeSnapshot.ingredients[0].quantity.amount).toEqual({ numerator: 100n, denominator: 1n });
    expect(breakfast.recipeSnapshot.source).toEqual(source);
    expect(Object.isFrozen(envelope.inputs.pantrySnapshot[0])).toBe(true);
  });
  it('detaches all catalog, recipe, food and provenance inputs', () => {
    const catalog = catalogFixture();
    const inputs = plan.createPlanInputs(settingsFixture(), catalog, { now: () => new Date(2026, 9, 27), seed: 's' });
    (catalog.recipes as Recipe[])[0] = { ...catalog.recipes[0], name: 'Changed' };
    expect(inputs.catalog.recipes[0].name).toBe('Тестовый рецепт');
    expect(Object.isFrozen(inputs.catalog.foods[0].nutrition)).toBe(true);
    expect(inputs.sourceSnapshots).toContainEqual(source);
  });
  it('round-trips JSON exact values and validates the detached result', () => {
    const original = envelopeFixture('7');
    const result = plan.validateActivePlanEnvelope(JSON.parse(JSON.stringify(plan.encodePlanEnvelope(original))));
    expect(result.status).toBe('valid');
    if (result.status === 'valid') expect(result.plan).toEqual(original);
  });
  it.each([
    ['schema version', (value: Record<string, unknown>) => { value.schemaVersion = 999; }],
    ['active variant', (value: Record<string, unknown>) => { value.activeVariantId = 'missing'; }],
    ['missing variant', (value: Record<string, unknown>) => { value.variants = []; }],
    ['persisted totals', (value: Record<string, unknown>) => { value.totals = { purchases: 0 }; }],
  ] as const)('rejects corrupt %s', (_name, change) => {
    expect(plan.validateActivePlanEnvelope(corrupt(change)).status).toBe('invalid');
  });
  it('rejects missing or duplicate slots, IDs, dates and broken recipe/source references', () => {
    const mutations = [
      (v: ReturnType<typeof envelopeFixture>) => v.variants[0].instances.slice(1),
      (v: ReturnType<typeof envelopeFixture>) => v.variants[0].instances.map((i, n) => n === 1 ? { ...i, slot: 'breakfast' as const } : i),
      (v: ReturnType<typeof envelopeFixture>) => v.variants[0].instances.map((i, n) => n === 1 ? { ...i, id: v.variants[0].instances[0].id } : i),
      (v: ReturnType<typeof envelopeFixture>) => v.variants[0].instances.map((i, n) => n === 1 ? { ...i, date: '2026-10-28' } : i),
      (v: ReturnType<typeof envelopeFixture>) => v.variants[0].instances.map((i, n) => n === 1 ? { ...i, recipeId: 'missing' } : i),
      (v: ReturnType<typeof envelopeFixture>) => v.variants[0].instances.map((i, n) => n === 1 ? { ...i, recipeSnapshot: { ...i.recipeSnapshot, source: { ...source, recordId: 'forged' } } } : i),
      (v: ReturnType<typeof envelopeFixture>) => v.variants[0].instances.map((i, n) => n === 1 ? { ...i, selectedServings: decimal('0') } : i),
    ];
    for (const mutation of mutations) {
      const value = envelopeFixture();
      expect(plan.validateActivePlanEnvelope({ ...value, variants: [{ id: 'variant-1', instances: mutation(value) }] }).status).toBe('invalid');
    }
  });
  it('rejects corrupt input date basis, source pool, pantry, settings and rational encoding', () => {
    const original = envelopeFixture();
    for (const inputs of [
      { ...original.inputs, schemaVersion: 2 }, { ...original.inputs, startDate: '2026-02-30' },
      { ...original.inputs, dates: ['2026-10-27', '2026-10-27'] }, { ...original.inputs, dateBasis: 'utc' },
      { ...original.inputs, catalogVersion: 'other' }, { ...original.inputs, sourceSnapshots: [] },
      { ...original.inputs, seed: '' }, { ...original.inputs, appliedSettings: { ...original.inputs.appliedSettings, days: 8 } },
      { ...original.inputs, pantrySnapshot: [{ productId: 'egg', quantity: { status: 'known', value: { amount: decimal('-1'), unit: 'pcs' } }, expiresSoon: true }] },
    ]) expect(plan.validateActivePlanEnvelope({ ...original, inputs }).status).toBe('invalid');
    const encoded = plan.encodePlanEnvelope(original) as { variants: { instances: { selectedServings: unknown }[] }[] };
    encoded.variants[0].instances[0].selectedServings = { numerator: '3', denominator: '0' };
    expect(plan.validateActivePlanEnvelope(encoded).status).toBe('invalid');
  });
  it('rejects oversized, cyclic, incomplete and malformed data without throwing', () => {
    const cyclic: Record<string, unknown> = {}; cyclic.self = cyclic;
    for (const input of [null, {}, cyclic, { schemaVersion: 1, variants: Array(5001).fill({}) }, { ...envelopeFixture(), activeVariantId: 'a'.repeat(4097) }]) {
      expect(plan.validateActivePlanEnvelope(input).status).toBe('invalid');
    }
    expect(() => plan.calendarDates('2026-02-30', 1)).toThrow();
    expect(() => plan.calendarDates('2026-10-27', 8)).toThrow();
    expect(() => plan.createRecipeInstances(inputsFixture(), Array(4).fill('test-recipe'), () => 'duplicate')).toThrow();
    expect(() => plan.localDateOnly(new Date(NaN))).toThrow();
  });
});
