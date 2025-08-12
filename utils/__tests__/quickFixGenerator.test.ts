/**
 * Tests for quickFixGenerator utility
 * Validates quick-fix action generation from validation results
 */

import {
  generateQuickFixActions,
  generateExtractionErrorFixes,
  ValidationIssue,
  RecipeData,
  MissingIngredient,
  InferredQuantity
} from '../quickFixGenerator';

describe('generateQuickFixActions', () => {
  const sampleRecipe: RecipeData = {
    title: 'Test Recipe',
    ingredients: [
      {
        name: 'flour',
        quantity: 2,
        unit: 'cups',
        confidence: 0.9,
        inferred: false,
        optional: false
      },
      {
        name: 'sugar',
        quantity: 1,
        unit: 'cup',
        confidence: 0.3, // Low confidence
        inferred: true,
        optional: false
      },
      {
        name: 'vanilla',
        quantity: 1,
        unit: 'tsp',
        confidence: 0.8,
        inferred: false,
        optional: false
      }
    ],
    instructions: ['Mix ingredients', 'Bake for 30 minutes'],
    prepTime: undefined,
    cookTime: undefined,
    servings: undefined
  };

  const sampleValidationIssues: ValidationIssue[] = [
    {
      type: 'duplicate_ingredient',
      severity: 'medium',
      description: 'Duplicate ingredient found',
      suggestion: 'Remove duplicate',
      ingredientName: 'flour'
    },
    {
      type: 'missing_in_steps',
      severity: 'low',
      description: 'Ingredient not mentioned in steps',
      suggestion: 'Mark as optional',
      ingredientName: 'vanilla'
    },
    {
      type: 'invented_ingredient',
      severity: 'high',
      description: 'Ingredient not in original content',
      suggestion: 'Remove ingredient',
      ingredientName: 'chocolate'
    }
  ];

  const sampleMissingIngredients: MissingIngredient[] = [
    {
      name: 'salt',
      suggestedQuantity: 1,
      suggestedUnit: 'tsp',
      confidence: 0.8,
      context: 'mentioned in step 1'
    },
    {
      name: 'pepper',
      suggestedQuantity: 0.5,
      suggestedUnit: 'tsp',
      confidence: 0.4, // Low confidence
      context: 'possibly mentioned'
    }
  ];

  const sampleInferredQuantities: InferredQuantity[] = [
    {
      ingredientName: 'butter',
      originalQuantity: undefined,
      inferredQuantity: 2,
      inferredUnit: 'tbsp',
      confidence: 0.6, // Low confidence
      reasoning: 'Inferred from typical recipe proportions'
    },
    {
      ingredientName: 'eggs',
      originalQuantity: undefined,
      inferredQuantity: 2,
      inferredUnit: 'pcs',
      confidence: 0.9, // High confidence
      reasoning: 'Standard for this recipe type'
    }
  ];

  it('generates actions for high-confidence missing ingredients', () => {
    const actions = generateQuickFixActions(
      sampleRecipe,
      [],
      sampleMissingIngredients,
      []
    );

    const saltAction = actions.find(a => a.data.name === 'salt');
    expect(saltAction).toBeDefined();
    expect(saltAction?.type).toBe('add_ingredient');
    expect(saltAction?.severity).toBe('high');
    expect(saltAction?.autoFix).toBe(true);
    expect(saltAction?.data).toEqual({
      name: 'salt',
      quantity: 1,
      unit: 'tsp',
      optional: false,
      confidence: 0.8,
      inferred: true
    });
  });

  it('generates manual actions for low-confidence missing ingredients', () => {
    const actions = generateQuickFixActions(
      sampleRecipe,
      [],
      sampleMissingIngredients,
      []
    );

    const pepperAction = actions.find(a => a.data.name === 'pepper');
    expect(pepperAction).toBeDefined();
    expect(pepperAction?.type).toBe('add_ingredient');
    expect(pepperAction?.severity).toBe('medium');
    expect(pepperAction?.autoFix).toBe(false);
  });

  it('generates actions for low confidence ingredients', () => {
    const actions = generateQuickFixActions(
      sampleRecipe,
      [],
      [],
      []
    );

    const sugarAction = actions.find(a => a.data.ingredientName === 'sugar');
    expect(sugarAction).toBeDefined();
    expect(sugarAction?.type).toBe('fix_quantity');
    expect(sugarAction?.severity).toBe('high'); // confidence < 0.4
    expect(sugarAction?.autoFix).toBe(false);
  });

  it('generates actions for low-confidence inferred quantities', () => {
    const actions = generateQuickFixActions(
      sampleRecipe,
      [],
      [],
      sampleInferredQuantities
    );

    const butterAction = actions.find(a => a.data.ingredientName === 'butter');
    expect(butterAction).toBeDefined();
    expect(butterAction?.type).toBe('fix_quantity');
    expect(butterAction?.severity).toBe('medium');
    expect(butterAction?.data.isInferred).toBe(true);

    // High confidence inferred quantities should not generate actions
    const eggsAction = actions.find(a => a.data.ingredientName === 'eggs');
    expect(eggsAction).toBeUndefined();
  });

  it('generates actions for validation issues', () => {
    const actions = generateQuickFixActions(
      sampleRecipe,
      sampleValidationIssues,
      [],
      []
    );

    // Duplicate ingredient
    const duplicateAction = actions.find(a => a.type === 'remove_ingredient' && a.data.ingredientName === 'flour');
    expect(duplicateAction).toBeDefined();
    expect(duplicateAction?.severity).toBe('medium');
    expect(duplicateAction?.autoFix).toBe(true);

    // Missing in steps
    const optionalAction = actions.find(a => a.type === 'mark_optional' && a.data.ingredientName === 'vanilla');
    expect(optionalAction).toBeDefined();
    expect(optionalAction?.severity).toBe('low');
    expect(optionalAction?.autoFix).toBe(true);

    // Invented ingredient
    const inventedAction = actions.find(a => a.type === 'remove_ingredient' && a.data.ingredientName === 'chocolate');
    expect(inventedAction).toBeDefined();
    expect(inventedAction?.severity).toBe('high');
    expect(inventedAction?.autoFix).toBe(false);
  });

  it('generates actions for missing recipe metadata', () => {
    const actions = generateQuickFixActions(
      sampleRecipe,
      [],
      [],
      []
    );

    // Missing times
    const timeAction = actions.find(a => a.type === 'add_time');
    expect(timeAction).toBeDefined();
    expect(timeAction?.severity).toBe('low');
    expect(timeAction?.autoFix).toBe(false);

    // Missing servings
    const servingsAction = actions.find(a => a.type === 'fix_servings');
    expect(servingsAction).toBeDefined();
    expect(servingsAction?.severity).toBe('low');
    expect(servingsAction?.autoFix).toBe(false);
  });

  it('generates actions for short instructions', () => {
    const recipeWithShortInstructions: RecipeData = {
      ...sampleRecipe,
      instructions: ['Mix', 'Bake for 30 minutes', 'Cool']
    };

    const actions = generateQuickFixActions(
      recipeWithShortInstructions,
      [],
      [],
      []
    );

    const shortInstructionActions = actions.filter(a => a.type === 'fix_instruction');
    expect(shortInstructionActions).toHaveLength(2); // 'Mix' and 'Cool' are short

    const mixAction = shortInstructionActions.find(a => a.data.currentText === 'Mix');
    expect(mixAction).toBeDefined();
    expect(mixAction?.data.stepNumber).toBe(1);
    expect(mixAction?.data.stepIndex).toBe(0);
  });

  it('sorts actions by severity and auto-fix capability', () => {
    const actions = generateQuickFixActions(
      sampleRecipe,
      sampleValidationIssues,
      sampleMissingIngredients,
      sampleInferredQuantities
    );

    // High severity actions should come first
    const highSeverityActions = actions.filter(a => a.severity === 'high');
    const mediumSeverityActions = actions.filter(a => a.severity === 'medium');
    const lowSeverityActions = actions.filter(a => a.severity === 'low');

    expect(highSeverityActions.length).toBeGreaterThan(0);
    expect(mediumSeverityActions.length).toBeGreaterThan(0);
    expect(lowSeverityActions.length).toBeGreaterThan(0);

    // Check that high severity comes before medium, medium before low
    const firstHighIndex = actions.findIndex(a => a.severity === 'high');
    const firstMediumIndex = actions.findIndex(a => a.severity === 'medium');
    const firstLowIndex = actions.findIndex(a => a.severity === 'low');

    expect(firstHighIndex).toBeLessThan(firstMediumIndex);
    expect(firstMediumIndex).toBeLessThan(firstLowIndex);
  });

  it('handles empty inputs gracefully', () => {
    const actions = generateQuickFixActions(
      {
        title: 'Empty Recipe',
        ingredients: [],
        instructions: [],
        prepTime: 15,
        cookTime: 30,
        servings: 4
      },
      [],
      [],
      []
    );

    // Should only generate actions for empty instructions if any
    expect(actions).toEqual([]);
  });
});

describe('generateExtractionErrorFixes', () => {
  const sampleExtractedRecipe: RecipeData = {
    title: 'Chocolate Chip Cookies',
    ingredients: [
      {
        name: 'flour',
        quantity: 2,
        unit: 'cups',
        confidence: 0.9,
        inferred: false,
        optional: false
      },
      {
        name: 'sugar',
        quantity: 0.5, // Different from original
        unit: 'cup',
        confidence: 0.8,
        inferred: false,
        optional: false
      }
    ],
    instructions: ['Mix ingredients', 'Bake'],
    prepTime: 15,
    cookTime: 25,
    servings: 24
  };

  it('detects missing common ingredients', () => {
    const originalContent = `
      Chocolate Chip Cookies Recipe
      
      Ingredients:
      - 2 cups all-purpose flour
      - 1 cup granulated sugar
      - 1/2 cup butter, melted
      - 2 large eggs
      - 1 tsp vanilla extract
      - 1/2 tsp salt
      - 1 tsp baking powder
      
      Instructions:
      1. Mix all ingredients together
      2. Bake at 350°F for 12-15 minutes
    `;

    const actions = generateExtractionErrorFixes(originalContent, sampleExtractedRecipe);

    // Should detect missing salt, butter, eggs, vanilla
    const missingIngredients = ['salt', 'butter', 'eggs'];
    
    missingIngredients.forEach(ingredient => {
      const action = actions.find(a => a.data.name === ingredient);
      expect(action).toBeDefined();
      expect(action?.type).toBe('add_ingredient');
      expect(action?.severity).toBe('high');
      expect(action?.autoFix).toBe(true);
    });
  });

  it('detects quantity mismatches', () => {
    const originalContent = `
      Recipe with specific quantities:
      - 2 cups flour
      - 1 cup sugar (not 0.5 cup)
      - 3 tablespoons butter
    `;

    const actions = generateExtractionErrorFixes(originalContent, sampleExtractedRecipe);

    const sugarMismatch = actions.find(a => 
      a.type === 'fix_quantity' && 
      a.data.ingredientName === 'sugar'
    );
    
    expect(sugarMismatch).toBeDefined();
    expect(sugarMismatch?.severity).toBe('high');
    expect(sugarMismatch?.autoFix).toBe(true);
    expect(sugarMismatch?.data.newQuantity).toBe(1);
  });

  it('handles various unit formats', () => {
    const originalContent = `
      - 2 tbsp olive oil
      - 1 tsp salt
      - 3 oz cream cheese
      - 1 lb ground beef
    `;

    const recipeWithMismatches: RecipeData = {
      title: 'Test',
      ingredients: [
        { name: 'olive oil', quantity: 1, unit: 'cup', confidence: 0.8, inferred: false, optional: false },
        { name: 'salt', quantity: 2, unit: 'tbsp', confidence: 0.8, inferred: false, optional: false },
        { name: 'cream cheese', quantity: 1, unit: 'cup', confidence: 0.8, inferred: false, optional: false },
        { name: 'ground beef', quantity: 2, unit: 'cups', confidence: 0.8, inferred: false, optional: false }
      ],
      instructions: ['Cook'],
      prepTime: 10,
      cookTime: 20,
      servings: 4
    };

    const actions = generateExtractionErrorFixes(originalContent, recipeWithMismatches);

    // Should detect mismatches for all ingredients
    expect(actions.filter(a => a.type === 'fix_quantity')).toHaveLength(4);
    
    const oilAction = actions.find(a => a.data.ingredientName === 'olive oil');
    expect(oilAction?.data.newQuantity).toBe(2);
    expect(oilAction?.data.newUnit).toBe('tbsp');
  });

  it('ignores ingredients not in original content', () => {
    const originalContent = `
      Simple recipe:
      - 1 cup flour
      - 1 egg
    `;

    const recipeWithExtra: RecipeData = {
      title: 'Test',
      ingredients: [
        { name: 'flour', quantity: 1, unit: 'cup', confidence: 0.9, inferred: false, optional: false },
        { name: 'sugar', quantity: 1, unit: 'cup', confidence: 0.8, inferred: false, optional: false }, // Not in original
        { name: 'chocolate chips', quantity: 0.5, unit: 'cup', confidence: 0.7, inferred: false, optional: false } // Not in original
      ],
      instructions: ['Mix and bake'],
      prepTime: 10,
      cookTime: 15,
      servings: 12
    };

    const actions = generateExtractionErrorFixes(originalContent, recipeWithExtra);

    // Should detect missing egg but not generate actions for sugar/chocolate chips
    const eggAction = actions.find(a => a.data.name === 'eggs');
    expect(eggAction).toBeDefined();

    const sugarAction = actions.find(a => a.data.name === 'sugar');
    expect(sugarAction).toBeUndefined();
  });

  it('handles fractional quantities', () => {
    const originalContent = `
      - 1½ cups flour
      - ¾ cup sugar
      - ⅓ cup oil
    `;

    const recipeWithWrongFractions: RecipeData = {
      title: 'Test',
      ingredients: [
        { name: 'flour', quantity: 1, unit: 'cup', confidence: 0.8, inferred: false, optional: false },
        { name: 'sugar', quantity: 0.5, unit: 'cup', confidence: 0.8, inferred: false, optional: false },
        { name: 'oil', quantity: 0.25, unit: 'cup', confidence: 0.8, inferred: false, optional: false }
      ],
      instructions: ['Mix'],
      prepTime: 5,
      cookTime: 10,
      servings: 8
    };

    const actions = generateExtractionErrorFixes(originalContent, recipeWithWrongFractions);

    // Should detect quantity mismatches for fractional amounts
    const flourAction = actions.find(a => a.data.ingredientName === 'flour');
    expect(flourAction).toBeDefined();
    expect(flourAction?.data.newQuantity).toBe(1.5);

    const sugarAction = actions.find(a => a.data.ingredientName === 'sugar');
    expect(sugarAction).toBeDefined();
    expect(sugarAction?.data.newQuantity).toBe(0.75);
  });

  it('returns empty array for perfect extraction', () => {
    const originalContent = `
      Perfect recipe:
      - 2 cups flour
      - 1 cup sugar
    `;

    const perfectRecipe: RecipeData = {
      title: 'Perfect',
      ingredients: [
        { name: 'flour', quantity: 2, unit: 'cups', confidence: 0.9, inferred: false, optional: false },
        { name: 'sugar', quantity: 1, unit: 'cup', confidence: 0.9, inferred: false, optional: false }
      ],
      instructions: ['Mix and bake'],
      prepTime: 10,
      cookTime: 20,
      servings: 12
    };

    const actions = generateExtractionErrorFixes(originalContent, perfectRecipe);
    expect(actions).toHaveLength(0);
  });
});