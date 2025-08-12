/**
 * Quick-fix action generator for recipe validation issues
 * Converts validation results into actionable quick-fix suggestions
 */

import { QuickFixAction } from '../components/QuickFixPanel';

export interface ValidationIssue {
  type: 'missing_ingredient' | 'quantity_mismatch' | 'invented_ingredient' | 'low_confidence' | 'missing_in_steps' | 'duplicate_ingredient';
  severity: 'low' | 'medium' | 'high';
  description: string;
  suggestion: string;
  field?: string;
  ingredientName?: string;
  data?: any;
}

export interface RecipeData {
  title: string;
  ingredients: Array<{
    name: string;
    quantity?: number;
    unit?: string;
    confidence: number;
    inferred: boolean;
    optional: boolean;
  }>;
  instructions: string[];
  prepTime?: number;
  cookTime?: number;
  servings?: number;
}

export interface MissingIngredient {
  name: string;
  suggestedQuantity?: number;
  suggestedUnit?: string;
  confidence: number;
  context: string;
}

export interface InferredQuantity {
  ingredientName: string;
  originalQuantity?: number;
  inferredQuantity: number;
  inferredUnit: string;
  confidence: number;
  reasoning: string;
}

/**
 * Generates quick-fix actions from validation results
 */
export function generateQuickFixActions(
  recipe: RecipeData,
  validationIssues: ValidationIssue[],
  missingIngredients: MissingIngredient[],
  inferredQuantities: InferredQuantity[]
): QuickFixAction[] {
  const actions: QuickFixAction[] = [];
  let actionId = 0;

  // Generate actions for missing ingredients
  missingIngredients.forEach(missing => {
    if (missing.confidence >= 0.6) {
      actions.push({
        id: `add_ingredient_${actionId++}`,
        type: 'add_ingredient',
        title: `Add missing ingredient: ${missing.name}`,
        description: `This ingredient is mentioned in instructions but missing from the ingredients list.`,
        severity: 'high',
        autoFix: true,
        data: {
          name: missing.name,
          quantity: missing.suggestedQuantity || 1,
          unit: missing.suggestedUnit || 'cup',
          optional: false,
          confidence: missing.confidence,
          inferred: true
        }
      });
    } else {
      actions.push({
        id: `add_ingredient_${actionId++}`,
        type: 'add_ingredient',
        title: `Possibly add: ${missing.name}`,
        description: `This ingredient might be missing. Please verify and add if needed.`,
        severity: 'medium',
        autoFix: false,
        data: {
          name: missing.name,
          quantity: missing.suggestedQuantity,
          unit: missing.suggestedUnit
        }
      });
    }
  });

  // Generate actions for low confidence ingredients
  recipe.ingredients.forEach((ingredient, index) => {
    if (ingredient.confidence < 0.6) {
      actions.push({
        id: `fix_quantity_${actionId++}`,
        type: 'fix_quantity',
        title: `Verify quantity: ${ingredient.name}`,
        description: `The quantity "${ingredient.quantity} ${ingredient.unit}" has low confidence and may be incorrect.`,
        severity: ingredient.confidence < 0.4 ? 'high' : 'medium',
        autoFix: false,
        data: {
          ingredientIndex: index,
          ingredientName: ingredient.name,
          currentQuantity: ingredient.quantity,
          currentUnit: ingredient.unit,
          newQuantity: ingredient.quantity,
          newUnit: ingredient.unit
        }
      });
    }
  });

  // Generate actions for inferred quantities
  inferredQuantities.forEach(inferred => {
    if (inferred.confidence < 0.7) {
      actions.push({
        id: `fix_quantity_${actionId++}`,
        type: 'fix_quantity',
        title: `Verify inferred quantity: ${inferred.ingredientName}`,
        description: `Quantity was inferred as "${inferred.inferredQuantity} ${inferred.inferredUnit}". ${inferred.reasoning}`,
        severity: 'medium',
        autoFix: false,
        data: {
          ingredientName: inferred.ingredientName,
          currentQuantity: inferred.inferredQuantity,
          currentUnit: inferred.inferredUnit,
          newQuantity: inferred.inferredQuantity,
          newUnit: inferred.inferredUnit,
          isInferred: true
        }
      });
    }
  });

  // Generate actions for validation issues
  validationIssues.forEach(issue => {
    switch (issue.type) {
      case 'duplicate_ingredient':
        actions.push({
          id: `remove_duplicate_${actionId++}`,
          type: 'remove_ingredient',
          title: `Remove duplicate: ${issue.ingredientName}`,
          description: issue.description,
          severity: 'medium',
          autoFix: true,
          data: {
            ingredientName: issue.ingredientName,
            action: 'remove_duplicate'
          }
        });
        break;

      case 'missing_in_steps':
        actions.push({
          id: `mark_optional_${actionId++}`,
          type: 'mark_optional',
          title: `Mark as optional: ${issue.ingredientName}`,
          description: `${issue.ingredientName} is not mentioned in instructions. Mark as optional or remove.`,
          severity: 'low',
          autoFix: true,
          data: {
            ingredientName: issue.ingredientName,
            markOptional: true
          }
        });
        break;

      case 'invented_ingredient':
        actions.push({
          id: `remove_invented_${actionId++}`,
          type: 'remove_ingredient',
          title: `Remove invented ingredient: ${issue.ingredientName}`,
          description: `This ingredient was not found in the original content and may have been incorrectly added.`,
          severity: 'high',
          autoFix: false,
          data: {
            ingredientName: issue.ingredientName,
            action: 'remove_invented'
          }
        });
        break;
    }
  });

  // Generate actions for missing recipe metadata
  if (!recipe.prepTime && !recipe.cookTime) {
    actions.push({
      id: `add_time_${actionId++}`,
      type: 'add_time',
      title: 'Add cooking times',
      description: 'Prep time and cook time are missing. Adding these helps with meal planning.',
      severity: 'low',
      autoFix: false,
      data: {
        prepTime: undefined,
        cookTime: undefined
      }
    });
  }

  if (!recipe.servings) {
    actions.push({
      id: `add_servings_${actionId++}`,
      type: 'fix_servings',
      title: 'Add serving size',
      description: 'Number of servings is missing. This helps with portion planning.',
      severity: 'low',
      autoFix: false,
      data: {
        servings: undefined
      }
    });
  }

  // Generate actions for problematic instructions
  recipe.instructions.forEach((instruction, index) => {
    if (instruction.length < 10) {
      actions.push({
        id: `fix_instruction_${actionId++}`,
        type: 'fix_instruction',
        title: `Expand step ${index + 1}`,
        description: `This instruction is very short: "${instruction}". Consider adding more detail.`,
        severity: 'low',
        autoFix: false,
        data: {
          stepNumber: index + 1,
          stepIndex: index,
          currentText: instruction,
          newText: instruction
        }
      });
    }
  });

  // Sort actions by severity and type
  return actions.sort((a, b) => {
    const severityOrder = { high: 3, medium: 2, low: 1 };
    const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
    if (severityDiff !== 0) return severityDiff;
    
    // Within same severity, prioritize auto-fixable actions
    if (a.autoFix && !b.autoFix) return -1;
    if (!a.autoFix && b.autoFix) return 1;
    
    return 0;
  });
}

/**
 * Generates quick fixes specifically for common extraction errors
 */
export function generateExtractionErrorFixes(
  originalContent: string,
  extractedRecipe: RecipeData
): QuickFixAction[] {
  const actions: QuickFixAction[] = [];
  let actionId = 0;

  // Analyze original content for missing ingredients
  const originalLower = originalContent.toLowerCase();
  const extractedIngredientNames = extractedRecipe.ingredients.map(ing => ing.name.toLowerCase());

  // Common ingredients that are often missed
  const commonIngredients = [
    { name: 'salt', patterns: ['salt', 'sea salt', 'kosher salt'] },
    { name: 'pepper', patterns: ['pepper', 'black pepper', 'ground pepper'] },
    { name: 'oil', patterns: ['oil', 'olive oil', 'vegetable oil', 'cooking oil'] },
    { name: 'butter', patterns: ['butter', 'unsalted butter', 'melted butter'] },
    { name: 'garlic', patterns: ['garlic', 'garlic cloves', 'minced garlic'] },
    { name: 'onion', patterns: ['onion', 'yellow onion', 'diced onion'] },
    { name: 'flour', patterns: ['flour', 'all-purpose flour', 'wheat flour'] },
    { name: 'sugar', patterns: ['sugar', 'granulated sugar', 'white sugar'] },
    { name: 'eggs', patterns: ['egg', 'eggs', 'large eggs'] },
    { name: 'milk', patterns: ['milk', 'whole milk', 'skim milk'] }
  ];

  commonIngredients.forEach(ingredient => {
    const isInOriginal = ingredient.patterns.some(pattern => originalLower.includes(pattern));
    const isInExtracted = extractedIngredientNames.some(name => 
      ingredient.patterns.some(pattern => name.includes(pattern) || pattern.includes(name))
    );

    if (isInOriginal && !isInExtracted) {
      actions.push({
        id: `missing_common_${actionId++}`,
        type: 'add_ingredient',
        title: `Add missing ${ingredient.name}`,
        description: `"${ingredient.name}" appears in the original content but wasn't extracted.`,
        severity: 'high',
        autoFix: true,
        data: {
          name: ingredient.name,
          quantity: getCommonQuantity(ingredient.name),
          unit: getCommonUnit(ingredient.name),
          optional: false,
          confidence: 0.8,
          inferred: true
        }
      });
    }
  });

  // Check for quantity mismatches
  extractedRecipe.ingredients.forEach((ingredient, index) => {
    const patterns = [
      new RegExp(`(\\d+(?:\\.\\d+)?(?:\\s*[¼½¾⅓⅔⅛⅜⅝⅞])?(?:\\s*\\d+/\\d+)?)\\s*(?:cups?|cup|c\\b)\\s+${escapeRegex(ingredient.name)}`, 'i'),
      new RegExp(`(\\d+(?:\\.\\d+)?)\\s*(?:tablespoons?|tbsp|tbs)\\s+${escapeRegex(ingredient.name)}`, 'i'),
      new RegExp(`(\\d+(?:\\.\\d+)?)\\s*(?:teaspoons?|tsp|ts)\\s+${escapeRegex(ingredient.name)}`, 'i'),
      new RegExp(`(\\d+(?:\\.\\d+)?)\\s*(?:ounces?|oz)\\s+${escapeRegex(ingredient.name)}`, 'i'),
      new RegExp(`(\\d+(?:\\.\\d+)?)\\s*(?:pounds?|lbs?|lb)\\s+${escapeRegex(ingredient.name)}`, 'i')
    ];

    for (const pattern of patterns) {
      const match = originalContent.match(pattern);
      if (match) {
        const originalQuantity = parseFloat(match[1]);
        if (ingredient.quantity && Math.abs(originalQuantity - ingredient.quantity) > 0.1) {
          actions.push({
            id: `quantity_mismatch_${actionId++}`,
            type: 'fix_quantity',
            title: `Fix quantity: ${ingredient.name}`,
            description: `Original shows "${match[0]}" but extracted "${ingredient.quantity} ${ingredient.unit}".`,
            severity: 'high',
            autoFix: true,
            data: {
              ingredientIndex: index,
              ingredientName: ingredient.name,
              currentQuantity: ingredient.quantity,
              currentUnit: ingredient.unit,
              newQuantity: originalQuantity,
              newUnit: extractUnitFromMatch(match[0])
            }
          });
          break;
        }
      }
    }
  });

  return actions;
}

/**
 * Helper functions
 */
function getCommonQuantity(ingredientName: string): number {
  const quantities: Record<string, number> = {
    'salt': 1,
    'pepper': 0.5,
    'oil': 2,
    'butter': 2,
    'garlic': 2,
    'onion': 1,
    'flour': 2,
    'sugar': 1,
    'eggs': 2,
    'milk': 1
  };
  return quantities[ingredientName.toLowerCase()] || 1;
}

function getCommonUnit(ingredientName: string): string {
  const units: Record<string, string> = {
    'salt': 'tsp',
    'pepper': 'tsp',
    'oil': 'tbsp',
    'butter': 'tbsp',
    'garlic': 'clove',
    'onion': 'cup',
    'flour': 'cup',
    'sugar': 'cup',
    'eggs': 'pcs',
    'milk': 'cup'
  };
  return units[ingredientName.toLowerCase()] || 'cup';
}

function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractUnitFromMatch(match: string): string {
  if (match.includes('cup')) return 'cup';
  if (match.includes('tbsp') || match.includes('tablespoon')) return 'tbsp';
  if (match.includes('tsp') || match.includes('teaspoon')) return 'tsp';
  if (match.includes('oz') || match.includes('ounce')) return 'oz';
  if (match.includes('lb') || match.includes('pound')) return 'lb';
  return 'cup';
}