
---
name: mealplan-domain
description: Use when implementing or testing MealPlan meal generation, nutrition calculations, recipe portions, weekly budgets, pantry inventory, ingredient quantities, dietary restrictions or shopping lists. Ensures correct deterministic food planning and calculations.
---

# MealPlan Domain Expert

You are a specialist in meal planning algorithms, nutrition calculations, recipe data, grocery budgets and pantry inventory.

Use this skill whenever implementing or modifying MealPlan business logic.

Read the relevant project requirements in reference/ before implementation.

## 1. Architecture

Keep domain logic independent of React.

Implement calculations as pure, testable TypeScript functions.

Use structured data for:
- Products
- Ingredients
- Recipes
- Nutrition
- Prices
- Pantry inventory
- Meal plans
- Shopping lists

Use stable product identifiers.

Avoid duplicated calculations across components.

## 2. Nutrition Calculations

Calculate nutrition from ingredient quantities and nutrition data per 100 grams or other explicitly defined reference quantities.

Calculate:
- Calories
- Protein
- Fat
- Carbohydrates

Recalculate nutrition when:
- Portions change
- Ingredients change
- Recipes are replaced

Do not invent nutrition values.

Use clearly documented rounding rules.

## 3. Ingredient Quantities

Normalize measurement units.

Supported conversions:
- 1000 g = 1 kg
- 1000 ml = 1 l

Never convert grams to milliliters without reliable density information.

Never combine incompatible units.

Store calculations using consistent base units.

## 4. Pantry Inventory

Track products available at home.

When generating shopping lists:

1. Calculate total required ingredients.
2. Aggregate quantities by product ID.
3. Normalize compatible units.
4. Subtract available pantry quantities.
5. Never allow negative shopping quantities.

Example:

Required rice: 800 g
Available rice: 300 g
Shopping list: 500 g

Never subtract the same pantry inventory multiple times.

Prefer recipes using ingredients that will expire soon.

## 5. Budget Calculations

Maintain separate values for:
- Total recipe ingredient cost
- Estimated grocery purchase cost
- Value of ingredients already available
- Remaining weekly budget

Use deterministic pricing calculations.

Do not invent missing product prices.

Round consistently.

Never silently exceed a hard budget constraint.

If no valid menu satisfies all hard constraints, return an explicit failure.

Use BUDGET_TOO_LOW when appropriate.

## 6. Meal Generation

Generate weekly menus according to:
- Number of people
- Budget
- Nutrition targets
- Dietary preferences
- Allergies
- Cooking time
- Pantry inventory
- Meal variety

Treat allergies and explicit exclusions as hard constraints.

Never relax allergy restrictions to produce a result.

If ingredient safety cannot be verified, do not mark the recipe as suitable.

Prioritize soon-to-expire ingredients when feasible.

Avoid unnecessary repetition.

Use deterministic algorithms and reproducible test data.

## 7. Shopping Lists

Combine ingredients across recipes.

Group shopping items by category.

Support:
- Ingredient aggregation
- Pantry subtraction
- Quantity editing
- Purchased checkboxes
- Manual item additions
- Budget recalculation
- PDF export

Changing a meal must update dependent calculations.

Changing pantry quantities must update shopping requirements.

Changing recipe portions must update ingredient requirements.

## 8. Recipe Portions

Support portion scaling.

Examples:
- x0.5
- x1
- x2

Scale:
- Ingredient quantities
- Nutrition totals
- Estimated ingredient costs

Maintain consistent rounding.

Do not accidentally multiply values twice.

## 9. Testing

Use test-driven-development from Superpowers when appropriate.

Write tests for:

1. Nutrition calculations.
2. Portion scaling.
3. Ingredient aggregation.
4. Unit conversions.
5. Pantry subtraction.
6. Budget limits.
7. Dietary exclusions.
8. Meal replacement.
9. Shopping list recalculation.
10. Impossible menu constraints.

Important examples:

- 500 g required - 200 g available = 300 g to purchase.
- 200 g + 300 g = 500 g.
- 1 kg + 500 g = 1500 g.
- Doubling a recipe doubles ingredient quantities.
- Replacing a recipe recalculates weekly totals.
- Allergens must never be ignored.
- An impossible budget must produce an explicit failure.

## 10. Validation

Before declaring domain functionality complete:

1. Run relevant unit tests.
2. Verify TypeScript types.
3. Verify expected calculations.
4. Test edge cases.
5. Check integration with dependent modules.
6. Run the production build when applicable.

Do not report success without verification.

If tests fail, identify and fix the root cause.

## 11. Integration

Use GSD Core for project planning.

Use Superpowers for debugging and testing.

Use React Best Practices for UI integration.

Use Context7 for version-sensitive library documentation.

Use Playwright for end-to-end verification.

Do not introduce a competing project management workflow.

## 12. Success Criteria

MealPlan calculations must be:
- Deterministic
- Reproducible
- Testable
- Consistent
- Explainable

Never replace correct calculations with plausible-looking AI-generated numbers.

The primary objective is reliable meal planning, not merely a visually convincing interface.
