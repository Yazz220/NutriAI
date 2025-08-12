/**
 * Enhanced AI recipe parser with structured prompts and JSON schema validation
 * Provides multi-stage prompting for better accuracy and consistency
 */

import { createChatCompletion } from './aiClient';

export interface ParsedRecipe {
  title: string;
  description?: string;
  imageUrl?: string;
  ingredients: ParsedIngredient[];
  instructions: string[];
  prepTime?: number;
  cookTime?: number;
  servings?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  cuisine?: string;
  tags: string[];
  confidence: number;
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

export interface ValidationResult {
  validatedRecipe: ParsedRecipe;
  validationNotes: string[];
  missingIngredients: string[];
  inferredQuantities: ParsedIngredient[];
  inconsistencies: ValidationIssue[];
}

export interface ValidationIssue {
  type: 'missing_ingredient' | 'quantity_mismatch' | 'unit_inconsistency' | 'step_reference_error';
  description: string;
  severity: 'low' | 'medium' | 'high';
  suggestion?: string;
}

export interface ParsingOptions {
  useMultiStage?: boolean;
  includeNutrition?: boolean;
  strictValidation?: boolean;
  confidenceThreshold?: number;
  maxRetries?: number;
}

// JSON Schema for recipe output validation
const RECIPE_SCHEMA = {
  type: "object",
  required: ["title", "ingredients", "instructions"],
  properties: {
    title: { 
      type: "string", 
      minLength: 1,
      maxLength: 200 
    },
    description: { 
      type: "string",
      maxLength: 1000 
    },
    imageUrl: { 
      type: "string",
      format: "uri" 
    },
    ingredients: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        required: ["name"],
        properties: {
          name: { 
            type: "string", 
            minLength: 1,
            maxLength: 100 
          },
          quantity: { 
            type: "number", 
            minimum: 0 
          },
          unit: { 
            type: "string",
            maxLength: 20 
          },
          notes: { 
            type: "string",
            maxLength: 200 
          },
          optional: { 
            type: "boolean" 
          },
          confidence: { 
            type: "number", 
            minimum: 0, 
            maximum: 1 
          },
          inferred: { 
            type: "boolean" 
          }
        }
      }
    },
    instructions: {
      type: "array",
      minItems: 1,
      items: {
        type: "string",
        minLength: 5,
        maxLength: 500
      }
    },
    prepTime: { 
      type: "number", 
      minimum: 0,
      maximum: 1440 
    },
    cookTime: { 
      type: "number", 
      minimum: 0,
      maximum: 1440 
    },
    servings: { 
      type: "number", 
      minimum: 1,
      maximum: 100 
    },
    difficulty: { 
      type: "string", 
      enum: ["easy", "medium", "hard"] 
    },
    cuisine: { 
      type: "string",
      maxLength: 50 
    },
    tags: {
      type: "array",
      items: {
        type: "string",
        maxLength: 30
      },
      maxItems: 20
    },
    confidence: { 
      type: "number", 
      minimum: 0, 
      maximum: 1 
    }
  }
};

// Standardized cooking units
const STANDARD_UNITS = [
  'tsp', 'tbsp', 'cup', 'oz', 'fl oz', 'pt', 'qt', 'gal',
  'ml', 'l', 'g', 'kg', 'lb', 'clove', 'bunch', 'pinch', 
  'dash', 'splash', 'can', 'jar', 'pkg', 'slice', 'piece', 'pcs'
];

/**
 * Main AI recipe parsing function with multi-stage processing
 */
export async function parseRecipeWithAI(
  content: string,
  options: ParsingOptions = {}
): Promise<ParsedRecipe> {
  const {
    useMultiStage = true,
    includeNutrition = false,
    strictValidation = true,
    confidenceThreshold = 0.7,
    maxRetries = 2
  } = options;

  let attempt = 0;
  let lastError: Error | null = null;

  while (attempt <= maxRetries) {
    try {
      if (useMultiStage) {
        return await parseRecipeMultiStage(content, { includeNutrition, strictValidation, confidenceThreshold });
      } else {
        return await parseRecipeSingleStage(content, { includeNutrition, strictValidation, confidenceThreshold });
      }
    } catch (error) {
      lastError = error as Error;
      attempt++;
      
      if (attempt <= maxRetries) {
        console.warn(`[AIRecipeParser] Attempt ${attempt} failed, retrying:`, error);
        // Add some jitter to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  throw new Error(`Recipe parsing failed after ${maxRetries + 1} attempts: ${lastError?.message}`);
}

/**
 * Multi-stage parsing for better accuracy
 */
async function parseRecipeMultiStage(
  content: string,
  options: { includeNutrition: boolean; strictValidation: boolean; confidenceThreshold: number }
): Promise<ParsedRecipe> {
  // Stage 1: Initial structure extraction
  const initialParse = await performInitialParsing(content);
  
  // Stage 2: Ingredient validation and enhancement
  const enhancedIngredients = await enhanceIngredients(initialParse.ingredients, content);
  
  // Stage 3: Instruction validation and cross-referencing
  const validatedInstructions = await validateInstructions(initialParse.instructions, enhancedIngredients, content);
  
  // Stage 4: Final consistency check and confidence scoring
  const finalRecipe = await performFinalValidation({
    ...initialParse,
    ingredients: enhancedIngredients,
    instructions: validatedInstructions
  }, content, options);

  return finalRecipe;
}

/**
 * Single-stage parsing for simpler cases
 */
async function parseRecipeSingleStage(
  content: string,
  options: { includeNutrition: boolean; strictValidation: boolean; confidenceThreshold: number }
): Promise<ParsedRecipe> {
  const prompt = createSingleStagePrompt(content, options.includeNutrition);
  const response = await createChatCompletion([
    { role: 'system', content: prompt.system },
    { role: 'user', content: prompt.user }
  ]);

  const parsedData = extractAndValidateJSON(response, RECIPE_SCHEMA);
  return normalizeRecipeData(parsedData, options.confidenceThreshold);
}

/**
 * Stage 1: Initial structure extraction
 */
async function performInitialParsing(content: string): Promise<Partial<ParsedRecipe>> {
  const systemPrompt = `You are a precise recipe extraction specialist. Your task is to extract the basic structure of a recipe from the provided content.

CRITICAL REQUIREMENTS:
1. Extract ONLY information that is explicitly present in the content
2. Do NOT invent or assume ingredients, quantities, or steps
3. If information is unclear or missing, mark it as such
4. Return ONLY valid JSON matching the exact schema provided

EXTRACTION RULES:
- Title: Use the most prominent recipe name found
- Ingredients: Extract each ingredient with quantity, unit, and name when available
- Instructions: Extract cooking steps in logical order
- Times: Only include if explicitly mentioned (in minutes)
- Servings: Only if clearly stated
- Mark confidence for each ingredient (0.0 to 1.0)
- Mark inferred=true for any guessed information

UNIT STANDARDIZATION:
Use only these units: ${STANDARD_UNITS.join(', ')}

Return strict JSON matching this schema:`;

  const userPrompt = `Extract the recipe structure from this content:

${content.slice(0, 4000)}

Return only the JSON object, no additional text.`;

  const response = await createChatCompletion([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ]);

  const parsedData = extractAndValidateJSON(response, RECIPE_SCHEMA);
  return parsedData;
}

/**
 * Stage 2: Ingredient enhancement and validation
 */
async function enhanceIngredients(
  ingredients: ParsedIngredient[],
  originalContent: string
): Promise<ParsedIngredient[]> {
  const systemPrompt = `You are an ingredient validation specialist. Your task is to enhance and validate a list of recipe ingredients.

VALIDATION TASKS:
1. Check if quantities and units are reasonable and consistent
2. Identify missing ingredients mentioned in the original content
3. Standardize units using the approved list
4. Infer missing quantities when context provides clues
5. Mark confidence levels accurately

INFERENCE RULES:
- Only infer quantities when there are clear contextual clues
- Mark inferred quantities with inferred=true and lower confidence
- Use "to taste" for seasonings without quantities
- Mark optional ingredients when indicated by "optional" or similar terms

APPROVED UNITS: ${STANDARD_UNITS.join(', ')}

Return the enhanced ingredients list as JSON array.`;

  const userPrompt = `Original content:
${originalContent.slice(0, 2000)}

Current ingredients:
${JSON.stringify(ingredients, null, 2)}

Enhance and validate these ingredients. Return only the JSON array.`;

  const response = await createChatCompletion([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ]);

  const enhancedIngredients = extractAndValidateJSON(response, {
    type: "array",
    items: RECIPE_SCHEMA.properties.ingredients.items
  });

  return enhancedIngredients;
}

/**
 * Stage 3: Instruction validation and cross-referencing
 */
async function validateInstructions(
  instructions: string[],
  ingredients: ParsedIngredient[],
  originalContent: string
): Promise<string[]> {
  const systemPrompt = `You are an instruction validation specialist. Your task is to validate and enhance cooking instructions.

VALIDATION TASKS:
1. Ensure all ingredients mentioned in steps exist in the ingredients list
2. Check for logical flow and completeness
3. Standardize cooking terminology
4. Add missing critical steps if obvious from context
5. Ensure instructions are clear and actionable

RULES:
- Do NOT add ingredients to steps that aren't in the ingredients list
- Do NOT invent steps not supported by the content
- Keep instructions concise but complete
- Use standard cooking verbs (mix, stir, bake, etc.)
- Include temperatures and times when specified

Return the validated instructions as a JSON array of strings.`;

  const ingredientNames = ingredients.map(ing => ing.name).join(', ');
  
  const userPrompt = `Available ingredients: ${ingredientNames}

Current instructions:
${JSON.stringify(instructions, null, 2)}

Original content for reference:
${originalContent.slice(0, 2000)}

Validate and enhance these instructions. Return only the JSON array.`;

  const response = await createChatCompletion([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ]);

  const validatedInstructions = extractAndValidateJSON(response, {
    type: "array",
    items: { type: "string" }
  });

  return validatedInstructions;
}

/**
 * Stage 4: Final validation and confidence scoring
 */
async function performFinalValidation(
  recipe: Partial<ParsedRecipe>,
  originalContent: string,
  options: { confidenceThreshold: number }
): Promise<ParsedRecipe> {
  const systemPrompt = `You are a final recipe validation specialist. Your task is to perform a final quality check and assign an overall confidence score.

VALIDATION CHECKLIST:
1. Recipe has a clear title
2. All ingredients have reasonable quantities and units
3. Instructions reference only available ingredients
4. Cooking times and temperatures are realistic
5. Recipe is complete and cookable

CONFIDENCE SCORING:
- 0.9-1.0: Excellent, complete recipe with all details
- 0.7-0.8: Good recipe with minor gaps or uncertainties
- 0.5-0.6: Acceptable recipe but missing some information
- 0.3-0.4: Poor quality, significant gaps
- 0.0-0.2: Unusable, major issues

Return the complete recipe with final confidence score.`;

  const userPrompt = `Recipe to validate:
${JSON.stringify(recipe, null, 2)}

Original content:
${originalContent.slice(0, 1500)}

Perform final validation and return the complete recipe with confidence score.`;

  const response = await createChatCompletion([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ]);

  const finalRecipe = extractAndValidateJSON(response, RECIPE_SCHEMA);
  const normalizedRecipe = normalizeRecipeData(finalRecipe, options.confidenceThreshold);

  return normalizedRecipe;
}

/**
 * Creates a single-stage prompt for simpler parsing
 */
function createSingleStagePrompt(content: string, includeNutrition: boolean) {
  const systemPrompt = `You are a precise recipe parser. Extract recipe information from the provided content and return it as structured JSON.

CRITICAL REQUIREMENTS:
1. Extract ONLY information explicitly present in the content
2. Do NOT invent ingredients, quantities, or steps
3. Use standard cooking units: ${STANDARD_UNITS.join(', ')}
4. Mark confidence for each ingredient (0.0 to 1.0)
5. Mark inferred=true for any guessed information
6. Return ONLY valid JSON, no additional text

RECIPE STRUCTURE:
- title: Recipe name (required)
- description: Brief description if available
- ingredients: Array of ingredient objects (required)
- instructions: Array of cooking steps (required)
- prepTime: Preparation time in minutes
- cookTime: Cooking time in minutes
- servings: Number of servings
- difficulty: "easy", "medium", or "hard"
- cuisine: Type of cuisine if identifiable
- tags: Array of relevant tags
- confidence: Overall confidence score (0.0 to 1.0)

${includeNutrition ? 'Include nutrition information if available in the content.' : ''}

Return strict JSON matching the schema.`;

  const userPrompt = `Extract the recipe from this content:

${content.slice(0, 6000)}

Return only the JSON object.`;

  return { system: systemPrompt, user: userPrompt };
}

/**
 * Extracts and validates JSON from AI response using enhanced validator
 */
function extractAndValidateJSON(response: string, schema: any): any {
  try {
    // Use the enhanced AI response validator
    const { validateAIResponse } = require('./aiResponseValidator');
    
    // Convert simple schema to validation schema format
    const validationSchema = convertToValidationSchema(schema);
    
    const validationResult = validateAIResponse(response, validationSchema, {
      strictMode: false,
      allowPartialData: true,
      fallbackStrategy: 'simple',
      confidenceThreshold: 0.3
    });

    if (!validationResult.isValid) {
      const errorMessages = validationResult.errors.map(e => e.message).join('; ');
      throw new Error(`Validation failed: ${errorMessages}`);
    }

    if (validationResult.fallbackUsed) {
      console.warn('[AIRecipeParser] Used fallback parsing strategy');
    }

    return validationResult.data;
  } catch (error) {
    console.error('[AIRecipeParser] Enhanced validation failed, using basic extraction:', error);
    
    // Fallback to basic extraction
    return extractAndValidateJSONBasic(response, schema);
  }
}

/**
 * Basic JSON extraction as fallback
 */
function extractAndValidateJSONBasic(response: string, schema: any): any {
  try {
    // Extract JSON from response
    let jsonText = response.trim();
    
    // Remove code fences if present
    const fenceMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (fenceMatch) {
      jsonText = fenceMatch[1];
    } else {
      // Try to find JSON object boundaries
      const firstBrace = jsonText.indexOf('{');
      const lastBrace = jsonText.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        jsonText = jsonText.slice(firstBrace, lastBrace + 1);
      }
    }

    const parsedData = JSON.parse(jsonText);
    
    // Basic schema validation (simplified)
    validateAgainstSchemaBasic(parsedData, schema);
    
    return parsedData;
  } catch (error) {
    console.error('[AIRecipeParser] JSON extraction failed:', error);
    throw new Error(`Failed to parse AI response as valid JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Basic schema validation
 */
function validateAgainstSchemaBasic(data: any, schema: any): void {
  if (schema.required) {
    for (const field of schema.required) {
      if (!(field in data)) {
        throw new Error(`Required field '${field}' is missing`);
      }
    }
  }
  
  if (schema.properties) {
    for (const [key, value] of Object.entries(data)) {
      if (schema.properties[key]) {
        const fieldSchema = schema.properties[key];
        
        if (fieldSchema.type === 'array' && !Array.isArray(value)) {
          throw new Error(`Field '${key}' should be an array`);
        }
        
        if (fieldSchema.type === 'string' && typeof value !== 'string') {
          throw new Error(`Field '${key}' should be a string`);
        }
        
        if (fieldSchema.type === 'number' && typeof value !== 'number') {
          throw new Error(`Field '${key}' should be a number`);
        }
      }
    }
  }
}

/**
 * Converts simple JSON schema to validation schema format
 */
function convertToValidationSchema(schema: any): Record<string, any> {
  const validationSchema: Record<string, any> = {};
  
  if (schema.properties) {
    for (const [key, fieldSchema] of Object.entries(schema.properties as any)) {
      validationSchema[key] = {
        field: key,
        type: (fieldSchema as any).type,
        required: schema.required?.includes(key) || false,
        ...(fieldSchema as any)
      };
    }
  }
  
  return validationSchema;
}

/**
 * Normalizes and cleans recipe data
 */
function normalizeRecipeData(data: any, confidenceThreshold: number): ParsedRecipe {
  // Ensure required fields have defaults
  const normalized: ParsedRecipe = {
    title: data.title || 'Imported Recipe',
    description: data.description,
    imageUrl: data.imageUrl,
    ingredients: (data.ingredients || []).map((ing: any) => ({
      name: ing.name || 'Unknown ingredient',
      quantity: typeof ing.quantity === 'number' ? ing.quantity : undefined,
      unit: ing.unit,
      notes: ing.notes,
      optional: Boolean(ing.optional),
      confidence: Math.max(0, Math.min(1, ing.confidence || 0.5)),
      inferred: Boolean(ing.inferred)
    })),
    instructions: (data.instructions || []).filter((inst: any) => 
      typeof inst === 'string' && inst.trim().length > 0
    ),
    prepTime: typeof data.prepTime === 'number' ? Math.max(0, data.prepTime) : undefined,
    cookTime: typeof data.cookTime === 'number' ? Math.max(0, data.cookTime) : undefined,
    servings: typeof data.servings === 'number' ? Math.max(1, data.servings) : undefined,
    difficulty: ['easy', 'medium', 'hard'].includes(data.difficulty) ? data.difficulty : undefined,
    cuisine: data.cuisine,
    tags: Array.isArray(data.tags) ? data.tags.filter((tag: any) => 
      typeof tag === 'string' && tag.trim().length > 0
    ) : [],
    confidence: Math.max(0, Math.min(1, data.confidence || 0.5))
  };

  // Validate minimum requirements
  if (normalized.ingredients.length === 0) {
    throw new Error('Recipe must have at least one ingredient');
  }
  
  if (normalized.instructions.length === 0) {
    throw new Error('Recipe must have at least one instruction');
  }
  
  if (normalized.confidence < confidenceThreshold) {
    console.warn(`[AIRecipeParser] Recipe confidence ${normalized.confidence} below threshold ${confidenceThreshold}`);
  }

  return normalized;
}

/**
 * Validates recipe against ingredients for consistency using enhanced recovery system
 */
export async function validateRecipeConsistency(
  recipe: ParsedRecipe,
  originalContent: string
): Promise<ValidationResult> {
  try {
    // Use the enhanced ingredient recovery system
    const { recoverAndValidateIngredients } = await import('./ingredientRecoverySystem');
    
    const recoveryResult = await recoverAndValidateIngredients(
      recipe.ingredients,
      recipe.instructions,
      originalContent,
      {
        enableMissingIngredientDetection: true,
        enableQuantityInference: true,
        enableConsistencyCheck: true,
        confidenceThreshold: 0.5,
        maxInferredIngredients: 5,
        useAIForInference: true
      }
    );

    // Convert recovery result to validation result format
    const validationResult: ValidationResult = {
      validatedRecipe: {
        ...recipe,
        ingredients: recoveryResult.recoveredIngredients,
        confidence: Math.min(recipe.confidence, recoveryResult.confidence)
      },
      validationNotes: recoveryResult.recoveryNotes,
      missingIngredients: recoveryResult.missingIngredients.map(m => m.name),
      inferredQuantities: recoveryResult.inferredQuantities.map(iq => ({
        name: iq.ingredientName,
        originalQuantity: iq.originalQuantity || null,
        suggestedQuantity: iq.inferredQuantity,
        unit: iq.inferredUnit
      })),
      inconsistencies: recoveryResult.inconsistencies.map(inc => ({
        type: inc.type,
        description: inc.description,
        severity: inc.severity,
        suggestion: inc.suggestion
      }))
    };

    return validationResult;

  } catch (error) {
    console.warn('[AIRecipeParser] Enhanced validation failed, using fallback:', error);
    
    // Fallback to basic AI validation
    return await validateRecipeConsistencyBasic(recipe, originalContent);
  }
}

/**
 * Basic AI validation as fallback
 */
async function validateRecipeConsistencyBasic(
  recipe: ParsedRecipe,
  originalContent: string
): Promise<ValidationResult> {
  const systemPrompt = `You are a recipe consistency validator. Analyze the recipe for potential issues and inconsistencies.

CHECK FOR:
1. Ingredients mentioned in instructions but missing from ingredients list
2. Unrealistic quantities or units
3. Missing critical steps or information
4. Inconsistent cooking times or temperatures
5. Logical flow issues in instructions

RETURN FORMAT:
{
  "validationNotes": ["note1", "note2"],
  "missingIngredients": ["ingredient1", "ingredient2"],
  "inferredQuantities": [{"name": "ingredient", "originalQuantity": null, "suggestedQuantity": 1, "unit": "cup"}],
  "inconsistencies": [{"type": "missing_ingredient", "description": "...", "severity": "medium", "suggestion": "..."}]
}`;

  const userPrompt = `Recipe to validate:
${JSON.stringify(recipe, null, 2)}

Original content:
${originalContent.slice(0, 2000)}

Analyze for consistency issues and return validation results.`;

  try {
    const response = await createChatCompletion([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]);

    const validationData = extractAndValidateJSON(response, {
      type: "object",
      properties: {
        validationNotes: { type: "array", items: { type: "string" } },
        missingIngredients: { type: "array", items: { type: "string" } },
        inferredQuantities: { type: "array" },
        inconsistencies: { type: "array" }
      }
    });

    return {
      validatedRecipe: recipe,
      validationNotes: validationData.validationNotes || [],
      missingIngredients: validationData.missingIngredients || [],
      inferredQuantities: validationData.inferredQuantities || [],
      inconsistencies: validationData.inconsistencies || []
    };

  } catch (error) {
    console.warn('[AIRecipeParser] Basic validation failed:', error);
    return {
      validatedRecipe: recipe,
      validationNotes: ['Validation check failed'],
      missingIngredients: [],
      inferredQuantities: [],
      inconsistencies: []
    };
  }
}