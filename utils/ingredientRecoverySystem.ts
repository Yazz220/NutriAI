/**
 * Ingredient recovery and validation system
 * Finds missing ingredients, infers quantities, and ensures consistency between ingredients and instructions
 */

import { createChatCompletion } from './aiClient';

export interface IngredientRecoveryResult {
  originalIngredients: ParsedIngredient[];
  recoveredIngredients: ParsedIngredient[];
  missingIngredients: MissingIngredient[];
  inferredQuantities: InferredQuantity[];
  inconsistencies: IngredientInconsistency[];
  confidence: number;
  recoveryNotes: string[];
}

export interface ParsedIngredient {
  name: string;
  quantity?: number;
  unit?: string;
  notes?: string;
  optional: boolean;
  confidence: number;
  inferred: boolean;
}

export interface MissingIngredient {
  name: string;
  mentionedIn: string[];
  suggestedQuantity?: number;
  suggestedUnit?: string;
  confidence: number;
  context: string;
}

export interface InferredQuantity {
  ingredientName: string;
  originalQuantity?: number;
  originalUnit?: string;
  inferredQuantity: number;
  inferredUnit: string;
  confidence: number;
  reasoning: string;
}

export interface IngredientInconsistency {
  type: 'missing_in_steps' | 'missing_in_ingredients' | 'quantity_mismatch' | 'unit_inconsistency' | 'duplicate_ingredient';
  ingredientName: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  suggestion: string;
  affectedSteps?: number[];
}

export interface RecoveryOptions {
  enableMissingIngredientDetection?: boolean;
  enableQuantityInference?: boolean;
  enableConsistencyCheck?: boolean;
  confidenceThreshold?: number;
  maxInferredIngredients?: number;
  useAIForInference?: boolean;
}

// Common cooking ingredients and their typical quantities
const COMMON_INGREDIENT_QUANTITIES: Record<string, { quantity: number; unit: string; confidence: number }> = {
  'salt': { quantity: 1, unit: 'tsp', confidence: 0.8 },
  'pepper': { quantity: 0.5, unit: 'tsp', confidence: 0.7 },
  'black pepper': { quantity: 0.5, unit: 'tsp', confidence: 0.7 },
  'garlic powder': { quantity: 1, unit: 'tsp', confidence: 0.7 },
  'onion powder': { quantity: 1, unit: 'tsp', confidence: 0.7 },
  'paprika': { quantity: 1, unit: 'tsp', confidence: 0.6 },
  'oregano': { quantity: 1, unit: 'tsp', confidence: 0.6 },
  'basil': { quantity: 1, unit: 'tsp', confidence: 0.6 },
  'thyme': { quantity: 1, unit: 'tsp', confidence: 0.6 },
  'rosemary': { quantity: 1, unit: 'tsp', confidence: 0.6 },
  'cumin': { quantity: 1, unit: 'tsp', confidence: 0.6 },
  'cinnamon': { quantity: 1, unit: 'tsp', confidence: 0.6 },
  'vanilla extract': { quantity: 1, unit: 'tsp', confidence: 0.8 },
  'baking powder': { quantity: 1, unit: 'tsp', confidence: 0.8 },
  'baking soda': { quantity: 0.5, unit: 'tsp', confidence: 0.8 },
  'olive oil': { quantity: 2, unit: 'tbsp', confidence: 0.7 },
  'vegetable oil': { quantity: 2, unit: 'tbsp', confidence: 0.7 },
  'butter': { quantity: 2, unit: 'tbsp', confidence: 0.7 },
  'lemon juice': { quantity: 1, unit: 'tbsp', confidence: 0.7 },
  'lime juice': { quantity: 1, unit: 'tbsp', confidence: 0.7 },
  'soy sauce': { quantity: 1, unit: 'tbsp', confidence: 0.7 },
  'worcestershire sauce': { quantity: 1, unit: 'tsp', confidence: 0.6 },
  'hot sauce': { quantity: 0.5, unit: 'tsp', confidence: 0.5 }
};

// Ingredient synonyms and variations
const INGREDIENT_SYNONYMS: Record<string, string[]> = {
  'salt': ['sea salt', 'kosher salt', 'table salt', 'fine salt'],
  'pepper': ['black pepper', 'ground pepper', 'cracked pepper'],
  'garlic': ['garlic cloves', 'fresh garlic', 'minced garlic'],
  'onion': ['yellow onion', 'white onion', 'sweet onion', 'red onion'],
  'tomato': ['tomatoes', 'fresh tomato', 'ripe tomato'],
  'butter': ['unsalted butter', 'salted butter', 'softened butter'],
  'oil': ['olive oil', 'vegetable oil', 'canola oil', 'cooking oil'],
  'flour': ['all-purpose flour', 'plain flour', 'white flour'],
  'sugar': ['granulated sugar', 'white sugar', 'caster sugar'],
  'milk': ['whole milk', 'skim milk', '2% milk', 'low-fat milk'],
  'cheese': ['cheddar cheese', 'mozzarella cheese', 'parmesan cheese'],
  'chicken': ['chicken breast', 'chicken thighs', 'chicken pieces'],
  'beef': ['ground beef', 'beef chunks', 'beef strips'],
  'rice': ['white rice', 'brown rice', 'long-grain rice'],
  'pasta': ['spaghetti', 'penne', 'linguine', 'fettuccine']
};

// Units that can be inferred from context
const CONTEXTUAL_UNIT_PATTERNS: Array<{ pattern: RegExp; unit: string; confidence: number }> = [
  { pattern: /\b(pinch|dash)\s+of\b/i, unit: 'pinch', confidence: 0.9 },
  { pattern: /\bto\s+taste\b/i, unit: 'to taste', confidence: 0.8 },
  { pattern: /\ba\s+little\b/i, unit: 'pinch', confidence: 0.6 },
  { pattern: /\ba\s+bit\s+of\b/i, unit: 'pinch', confidence: 0.6 },
  { pattern: /\bsome\b/i, unit: 'to taste', confidence: 0.5 },
  { pattern: /\bsprinkle\b/i, unit: 'pinch', confidence: 0.7 },
  { pattern: /\bdrizzle\b/i, unit: 'tbsp', confidence: 0.6 }
];

/**
 * Main ingredient recovery function
 */
export async function recoverAndValidateIngredients(
  ingredients: ParsedIngredient[],
  instructions: string[],
  originalContent: string,
  options: RecoveryOptions = {}
): Promise<IngredientRecoveryResult> {
  const {
    enableMissingIngredientDetection = true,
    enableQuantityInference = true,
    enableConsistencyCheck = true,
    confidenceThreshold = 0.5,
    maxInferredIngredients = 5,
    useAIForInference = true
  } = options;

  const recoveryNotes: string[] = [];
  let recoveredIngredients = [...ingredients];
  const missingIngredients: MissingIngredient[] = [];
  const inferredQuantities: InferredQuantity[] = [];
  const inconsistencies: IngredientInconsistency[] = [];

  try {
    // Step 1: Find missing ingredients mentioned in instructions
    if (enableMissingIngredientDetection) {
      const missingResult = await findMissingIngredients(
        recoveredIngredients,
        instructions,
        originalContent,
        maxInferredIngredients
      );
      
      missingIngredients.push(...missingResult.missing);
      recoveredIngredients.push(...missingResult.recovered);
      recoveryNotes.push(...missingResult.notes);
    }

    // Step 2: Infer missing quantities
    if (enableQuantityInference) {
      const quantityResult = await inferMissingQuantities(
        recoveredIngredients,
        instructions,
        originalContent,
        useAIForInference
      );
      
      inferredQuantities.push(...quantityResult.inferred);
      recoveredIngredients = quantityResult.ingredients;
      recoveryNotes.push(...quantityResult.notes);
    }

    // Step 3: Check for consistency issues
    if (enableConsistencyCheck) {
      const consistencyResult = checkIngredientConsistency(
        recoveredIngredients,
        instructions
      );
      
      inconsistencies.push(...consistencyResult.inconsistencies);
      recoveryNotes.push(...consistencyResult.notes);
    }

    // Step 4: Calculate overall confidence
    const confidence = calculateRecoveryConfidence(
      ingredients,
      recoveredIngredients,
      missingIngredients,
      inferredQuantities,
      inconsistencies
    );

    return {
      originalIngredients: ingredients,
      recoveredIngredients,
      missingIngredients,
      inferredQuantities,
      inconsistencies,
      confidence,
      recoveryNotes
    };

  } catch (error) {
    console.error('[IngredientRecovery] Recovery process failed:', error);
    
    return {
      originalIngredients: ingredients,
      recoveredIngredients: ingredients,
      missingIngredients: [],
      inferredQuantities: [],
      inconsistencies: [],
      confidence: 0.5,
      recoveryNotes: [`Recovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
    };
  }
}

/**
 * Finds ingredients mentioned in instructions but missing from ingredients list
 */
async function findMissingIngredients(
  ingredients: ParsedIngredient[],
  instructions: string[],
  originalContent: string,
  maxInferred: number
): Promise<{ missing: MissingIngredient[]; recovered: ParsedIngredient[]; notes: string[] }> {
  const missing: MissingIngredient[] = [];
  const recovered: ParsedIngredient[] = [];
  const notes: string[] = [];

  try {
    // Get existing ingredient names (including synonyms)
    const existingIngredients = new Set<string>();
    ingredients.forEach(ing => {
      existingIngredients.add(ing.name.toLowerCase());
      // Add synonyms
      const synonyms = findSynonyms(ing.name);
      synonyms.forEach(syn => existingIngredients.add(syn.toLowerCase()));
    });

    // Analyze instructions for ingredient mentions
    const instructionText = instructions.join(' ').toLowerCase();
    const potentialIngredients = extractPotentialIngredients(instructionText);

    // Filter out ingredients that are already in the list
    const missingCandidates = potentialIngredients.filter(candidate => 
      !existingIngredients.has(candidate.name.toLowerCase()) &&
      !isExistingIngredientVariation(candidate.name, ingredients)
    );

    // Validate and score missing ingredients
    for (const candidate of missingCandidates.slice(0, maxInferred)) {
      const validation = validateMissingIngredient(candidate, instructions, originalContent);
      
      if (validation.confidence >= 0.5) {
        const missingIngredient: MissingIngredient = {
          name: candidate.name,
          mentionedIn: candidate.mentionedIn,
          suggestedQuantity: validation.suggestedQuantity,
          suggestedUnit: validation.suggestedUnit,
          confidence: validation.confidence,
          context: validation.context
        };
        
        missing.push(missingIngredient);
        
        // Create recovered ingredient
        const recoveredIngredient: ParsedIngredient = {
          name: candidate.name,
          quantity: validation.suggestedQuantity,
          unit: validation.suggestedUnit,
          optional: validation.isOptional,
          confidence: validation.confidence,
          inferred: true,
          notes: 'Inferred from instructions'
        };
        
        recovered.push(recoveredIngredient);
        notes.push(`Found missing ingredient: ${candidate.name}`);
      }
    }

    return { missing, recovered, notes };

  } catch (error) {
    console.warn('[IngredientRecovery] Missing ingredient detection failed:', error);
    return { missing: [], recovered: [], notes: ['Missing ingredient detection failed'] };
  }
}

/**
 * Extracts potential ingredients from instruction text
 */
function extractPotentialIngredients(text: string): Array<{ name: string; mentionedIn: string[] }> {
  const ingredients: Array<{ name: string; mentionedIn: string[] }> = [];
  
  // Common ingredient patterns
  const ingredientPatterns = [
    // "add the [ingredient]"
    /\badd\s+(?:the\s+)?([a-z\s]+?)(?:\s+(?:and|to|into|until)|\.|,|$)/gi,
    // "mix in [ingredient]"
    /\bmix\s+in\s+(?:the\s+)?([a-z\s]+?)(?:\s+(?:and|to|into|until)|\.|,|$)/gi,
    // "season with [ingredient]"
    /\bseason\s+with\s+([a-z\s]+?)(?:\s+(?:and|to|into|until)|\.|,|$)/gi,
    // "sprinkle [ingredient]"
    /\bsprinkle\s+(?:with\s+)?([a-z\s]+?)(?:\s+(?:and|to|into|until)|\.|,|$)/gi,
    // "drizzle [ingredient]"
    /\bdrizzle\s+(?:with\s+)?([a-z\s]+?)(?:\s+(?:and|to|into|until)|\.|,|$)/gi,
    // "garnish with [ingredient]"
    /\bgarnish\s+with\s+([a-z\s]+?)(?:\s+(?:and|to|into|until)|\.|,|$)/gi
  ];

  for (const pattern of ingredientPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const ingredientName = match[1].trim();
      
      if (isLikelyIngredient(ingredientName)) {
        const existing = ingredients.find(ing => ing.name.toLowerCase() === ingredientName.toLowerCase());
        if (existing) {
          existing.mentionedIn.push(match[0]);
        } else {
          ingredients.push({
            name: ingredientName,
            mentionedIn: [match[0]]
          });
        }
      }
    }
  }

  return ingredients;
}

/**
 * Checks if a string is likely to be an ingredient
 */
function isLikelyIngredient(text: string): boolean {
  const cleaned = text.toLowerCase().trim();
  
  // Too short or too long
  if (cleaned.length < 3 || cleaned.length > 30) return false;
  
  // Contains numbers (likely not an ingredient name)
  if (/\d/.test(cleaned)) return false;
  
  // Common non-ingredient words
  const nonIngredients = [
    'heat', 'temperature', 'time', 'minutes', 'hours', 'degrees',
    'bowl', 'pan', 'pot', 'oven', 'stove', 'plate', 'dish',
    'mixture', 'batter', 'dough', 'liquid', 'solid',
    'taste', 'flavor', 'texture', 'color', 'appearance',
    'serving', 'portion', 'piece', 'slice', 'cup', 'tablespoon'
  ];
  
  if (nonIngredients.includes(cleaned)) return false;
  
  // Check if it's in common ingredients or has food-related words
  const foodWords = ['oil', 'salt', 'pepper', 'sauce', 'powder', 'extract', 'juice', 'zest'];
  const hasFood = foodWords.some(word => cleaned.includes(word));
  const isCommon = Object.keys(COMMON_INGREDIENT_QUANTITIES).some(ing => 
    cleaned.includes(ing) || ing.includes(cleaned)
  );
  
  return hasFood || isCommon || cleaned.split(' ').length <= 3;
}

/**
 * Validates a missing ingredient candidate
 */
function validateMissingIngredient(
  candidate: { name: string; mentionedIn: string[] },
  instructions: string[],
  originalContent: string
): {
  confidence: number;
  suggestedQuantity?: number;
  suggestedUnit?: string;
  isOptional: boolean;
  context: string;
} {
  const name = candidate.name.toLowerCase();
  let confidence = 0.3; // Base confidence
  let suggestedQuantity: number | undefined;
  let suggestedUnit: string | undefined;
  let isOptional = false;

  // Check if it's a common ingredient
  if (COMMON_INGREDIENT_QUANTITIES[name]) {
    const common = COMMON_INGREDIENT_QUANTITIES[name];
    suggestedQuantity = common.quantity;
    suggestedUnit = common.unit;
    confidence += common.confidence * 0.5;
  }

  // Check context patterns
  const context = candidate.mentionedIn.join(' ').toLowerCase();
  
  // Optional indicators
  if (/\b(optional|if desired|to taste|garnish)\b/.test(context)) {
    isOptional = true;
    confidence += 0.2;
  }

  // Quantity context patterns
  for (const pattern of CONTEXTUAL_UNIT_PATTERNS) {
    if (pattern.pattern.test(context)) {
      suggestedUnit = pattern.unit;
      confidence += pattern.confidence * 0.3;
      break;
    }
  }

  // Frequency of mentions
  const mentionCount = candidate.mentionedIn.length;
  if (mentionCount > 1) {
    confidence += Math.min(0.3, mentionCount * 0.1);
  }

  // Check if mentioned in original content
  if (originalContent.toLowerCase().includes(name)) {
    confidence += 0.2;
  }

  return {
    confidence: Math.min(1, confidence),
    suggestedQuantity,
    suggestedUnit,
    isOptional,
    context: candidate.mentionedIn.join('; ')
  };
}

/**
 * Infers missing quantities for ingredients
 */
async function inferMissingQuantities(
  ingredients: ParsedIngredient[],
  instructions: string[],
  originalContent: string,
  useAI: boolean
): Promise<{ ingredients: ParsedIngredient[]; inferred: InferredQuantity[]; notes: string[] }> {
  const inferred: InferredQuantity[] = [];
  const notes: string[] = [];
  const updatedIngredients = [...ingredients];

  for (let i = 0; i < updatedIngredients.length; i++) {
    const ingredient = updatedIngredients[i];
    
    if (!ingredient.quantity || ingredient.quantity === 0) {
      const inferenceResult = await inferQuantityForIngredient(
        ingredient,
        instructions,
        originalContent,
        useAI
      );
      
      if (inferenceResult.success) {
        // Update ingredient
        updatedIngredients[i] = {
          ...ingredient,
          quantity: inferenceResult.quantity,
          unit: inferenceResult.unit,
          inferred: true,
          confidence: Math.min(ingredient.confidence, inferenceResult.confidence)
        };
        
        // Record inference
        inferred.push({
          ingredientName: ingredient.name,
          originalQuantity: ingredient.quantity,
          originalUnit: ingredient.unit,
          inferredQuantity: inferenceResult.quantity!,
          inferredUnit: inferenceResult.unit!,
          confidence: inferenceResult.confidence,
          reasoning: inferenceResult.reasoning
        });
        
        notes.push(`Inferred quantity for ${ingredient.name}: ${inferenceResult.quantity} ${inferenceResult.unit}`);
      }
    }
  }

  return { ingredients: updatedIngredients, inferred, notes };
}

/**
 * Infers quantity for a single ingredient
 */
async function inferQuantityForIngredient(
  ingredient: ParsedIngredient,
  instructions: string[],
  originalContent: string,
  useAI: boolean
): Promise<{
  success: boolean;
  quantity?: number;
  unit?: string;
  confidence: number;
  reasoning: string;
}> {
  const name = ingredient.name.toLowerCase();
  
  // Try common ingredient quantities first
  if (COMMON_INGREDIENT_QUANTITIES[name]) {
    const common = COMMON_INGREDIENT_QUANTITIES[name];
    return {
      success: true,
      quantity: common.quantity,
      unit: common.unit,
      confidence: common.confidence,
      reasoning: 'Based on common cooking quantities'
    };
  }

  // Try contextual inference from instructions
  const instructionText = instructions.join(' ').toLowerCase();
  const contextResult = inferFromContext(ingredient.name, instructionText);
  if (contextResult.success) {
    return contextResult;
  }

  // Try AI inference if enabled
  if (useAI) {
    try {
      const aiResult = await inferQuantityWithAI(ingredient, instructions, originalContent);
      if (aiResult.success) {
        return aiResult;
      }
    } catch (error) {
      console.warn('[IngredientRecovery] AI quantity inference failed:', error);
    }
  }

  return {
    success: false,
    confidence: 0,
    reasoning: 'Could not infer quantity from available information'
  };
}

/**
 * Infers quantity from instruction context
 */
function inferFromContext(ingredientName: string, instructionText: string): {
  success: boolean;
  quantity?: number;
  unit?: string;
  confidence: number;
  reasoning: string;
} {
  const name = ingredientName.toLowerCase();
  
  // Look for contextual clues
  for (const pattern of CONTEXTUAL_UNIT_PATTERNS) {
    const regex = new RegExp(`\\b${name}\\b.*?${pattern.pattern.source}`, 'i');
    if (regex.test(instructionText)) {
      return {
        success: true,
        quantity: pattern.unit === 'to taste' ? undefined : 1,
        unit: pattern.unit,
        confidence: pattern.confidence,
        reasoning: `Inferred from context: "${pattern.pattern.source}"`
      };
    }
  }

  return {
    success: false,
    confidence: 0,
    reasoning: 'No contextual clues found'
  };
}

/**
 * Uses AI to infer ingredient quantity
 */
async function inferQuantityWithAI(
  ingredient: ParsedIngredient,
  instructions: string[],
  originalContent: string
): Promise<{
  success: boolean;
  quantity?: number;
  unit?: string;
  confidence: number;
  reasoning: string;
}> {
  const systemPrompt = `You are a cooking expert specializing in ingredient quantities. Given an ingredient name and recipe context, infer the most likely quantity and unit.

RULES:
- Return only realistic cooking quantities
- Use standard units: tsp, tbsp, cup, oz, g, ml, lb, kg, clove, bunch, pinch
- Consider the recipe context and serving size
- If uncertain, use common cooking quantities
- Return JSON: {"quantity": number, "unit": "string", "confidence": 0.0-1.0, "reasoning": "explanation"}`;

  const userPrompt = `Ingredient: ${ingredient.name}

Instructions:
${instructions.join('\n')}

Original content context:
${originalContent.slice(0, 1000)}

Infer the most appropriate quantity and unit for this ingredient.`;

  try {
    const response = await createChatCompletion([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]);

    const result = JSON.parse(response.trim());
    
    return {
      success: true,
      quantity: result.quantity,
      unit: result.unit,
      confidence: Math.min(0.8, result.confidence || 0.6), // Cap AI confidence
      reasoning: result.reasoning || 'AI inference'
    };

  } catch (error) {
    return {
      success: false,
      confidence: 0,
      reasoning: `AI inference failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Checks for consistency issues between ingredients and instructions
 */
function checkIngredientConsistency(
  ingredients: ParsedIngredient[],
  instructions: string[]
): { inconsistencies: IngredientInconsistency[]; notes: string[] } {
  const inconsistencies: IngredientInconsistency[] = [];
  const notes: string[] = [];

  const ingredientNames = new Set(ingredients.map(ing => ing.name.toLowerCase()));
  const instructionText = instructions.join(' ').toLowerCase();

  // Check for duplicate ingredients
  const nameCounts = new Map<string, number>();
  ingredients.forEach(ing => {
    const name = ing.name.toLowerCase();
    nameCounts.set(name, (nameCounts.get(name) || 0) + 1);
  });

  nameCounts.forEach((count, name) => {
    if (count > 1) {
      inconsistencies.push({
        type: 'duplicate_ingredient',
        ingredientName: name,
        description: `Ingredient "${name}" appears ${count} times in the list`,
        severity: 'medium',
        suggestion: 'Combine duplicate ingredients or specify different forms'
      });
    }
  });

  // Check for ingredients mentioned in steps but not in list
  const mentionedIngredients = extractPotentialIngredients(instructionText);
  mentionedIngredients.forEach(mentioned => {
    if (!ingredientNames.has(mentioned.name.toLowerCase()) && 
        !isExistingIngredientVariation(mentioned.name, ingredients)) {
      inconsistencies.push({
        type: 'missing_in_ingredients',
        ingredientName: mentioned.name,
        description: `"${mentioned.name}" is mentioned in instructions but not in ingredients list`,
        severity: 'high',
        suggestion: 'Add this ingredient to the ingredients list'
      });
    }
  });

  // Check for ingredients not mentioned in instructions
  ingredients.forEach(ingredient => {
    if (!ingredient.optional && !isIngredientMentioned(ingredient.name, instructionText)) {
      inconsistencies.push({
        type: 'missing_in_steps',
        ingredientName: ingredient.name,
        description: `"${ingredient.name}" is in ingredients but not mentioned in instructions`,
        severity: 'medium',
        suggestion: 'Add usage instructions or mark as optional'
      });
    }
  });

  notes.push(`Found ${inconsistencies.length} consistency issues`);
  return { inconsistencies, notes };
}

/**
 * Helper functions
 */
function findSynonyms(ingredientName: string): string[] {
  const name = ingredientName.toLowerCase();
  for (const [key, synonyms] of Object.entries(INGREDIENT_SYNONYMS)) {
    if (name.includes(key) || synonyms.some(syn => name.includes(syn))) {
      return [key, ...synonyms];
    }
  }
  return [];
}

function isExistingIngredientVariation(candidateName: string, ingredients: ParsedIngredient[]): boolean {
  const candidate = candidateName.toLowerCase();
  return ingredients.some(ing => {
    const existing = ing.name.toLowerCase();
    return existing.includes(candidate) || candidate.includes(existing) ||
           findSynonyms(existing).some(syn => syn.includes(candidate) || candidate.includes(syn));
  });
}

function isIngredientMentioned(ingredientName: string, instructionText: string): boolean {
  const name = ingredientName.toLowerCase();
  const text = instructionText.toLowerCase();
  
  // Direct mention
  if (text.includes(name)) return true;
  
  // Check synonyms
  const synonyms = findSynonyms(name);
  return synonyms.some(syn => text.includes(syn));
}

function calculateRecoveryConfidence(
  original: ParsedIngredient[],
  recovered: ParsedIngredient[],
  missing: MissingIngredient[],
  inferred: InferredQuantity[],
  inconsistencies: IngredientInconsistency[]
): number {
  let confidence = 0.7; // Base confidence

  // Bonus for finding missing ingredients
  if (missing.length > 0) {
    const avgMissingConfidence = missing.reduce((sum, m) => sum + m.confidence, 0) / missing.length;
    confidence += avgMissingConfidence * 0.2;
  }

  // Bonus for successful quantity inference
  if (inferred.length > 0) {
    const avgInferredConfidence = inferred.reduce((sum, i) => sum + i.confidence, 0) / inferred.length;
    confidence += avgInferredConfidence * 0.1;
  }

  // Penalty for inconsistencies
  const highSeverityCount = inconsistencies.filter(i => i.severity === 'high').length;
  const mediumSeverityCount = inconsistencies.filter(i => i.severity === 'medium').length;
  
  confidence -= highSeverityCount * 0.2;
  confidence -= mediumSeverityCount * 0.1;

  return Math.max(0, Math.min(1, confidence));
}