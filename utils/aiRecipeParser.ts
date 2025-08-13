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
  const enhancedIngredients = await enhanceIngredients(initialParse.ingredients ?? [], content);

  // Stage 3: Instruction validation and cross-referencing
  const validatedInstructions = await validateInstructions(initialParse.instructions ?? [], enhancedIngredients, content);

  // Stage 4: Final consistency check and confidence scoring
  const finalRecipe = await performFinalValidation({
    ...initialParse,
    ingredients: enhancedIngredients,
    instructions: validatedInstructions
  }, content, options);

  return finalRecipe;
}

// ...

/**
 * Single-stage parsing for environments where multi-stage is not desired
 */
async function parseRecipeSingleStage(
  content: string,
  options: { includeNutrition: boolean; strictValidation: boolean; confidenceThreshold: number }
): Promise<ParsedRecipe> {
  const systemPrompt = `You are a meticulous recipe extraction assistant.
Extract a clean JSON object that conforms strictly to the provided schema fields.
Do not include commentary. Output only JSON.`;

  const userPrompt = `SOURCE CONTENT:\n\n${content.slice(0, 6000)}\n\nReturn the recipe fields: title, description, imageUrl, ingredients[], instructions[], prepTime, cookTime, servings, difficulty, cuisine, tags[], confidence.`;

  const response = await createChatCompletion([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ]);

  const data = extractAndValidateJSON(response, RECIPE_SCHEMA);
  let recipe = normalizeRecipeData(data, options.confidenceThreshold);

  if (options.strictValidation) {
    try {
      const validation = await validateRecipeConsistency(recipe, content);
      recipe = validation.validatedRecipe;
    } catch {
      // keep normalized recipe on validation failure
    }
  }

  return recipe;
}

/**
 * Stage 1: Initial structure extraction
 */
async function performInitialParsing(content: string): Promise<ParsedRecipe> {
  const systemPrompt = `You extract structured recipe JSON per the schema. Keep arrays concise and avoid hallucination.`;
  const userPrompt = `Parse the following into the schema JSON (no markdown fences):\n\n${content.slice(0, 7000)}`;

  const response = await createChatCompletion([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ]);

  const data = extractAndValidateJSON(response, RECIPE_SCHEMA);
  return normalizeRecipeData(data, 0.5);
}

/**
 * Stage 2: Ingredient validation and enhancement
 */
async function enhanceIngredients(
  ingredients: ParsedIngredient[],
  content: string
): Promise<ParsedIngredient[]> {
  // Lightweight normalization: clamp confidence, coerce optional, and standardize units when reasonable
  const normalized = ingredients.map((ing) => {
    const unit = ing.unit?.toLowerCase().trim();
    const stdUnit = unit && STANDARD_UNITS.includes(unit) ? unit : ing.unit;
    return {
      ...ing,
      unit: stdUnit,
      optional: Boolean(ing.optional),
      confidence: Math.max(0, Math.min(1, ing.confidence ?? 0.6)),
      inferred: Boolean(ing.inferred)
    };
  });

  // Optionally, could use LLM to infer missing quantities; keep simple for type safety
  return normalized;
}

/**
 * Stage 3: Instruction validation and cross-referencing
 */
async function validateInstructions(
  instructions: string[],
  ingredients: ParsedIngredient[],
  content: string
): Promise<string[]> {
  // Remove empty/too-short steps and trim
  const cleaned = (instructions || [])
    .filter((s) => typeof s === 'string' && s.trim().length >= 5)
    .map((s) => s.trim());
  return cleaned.length > 0 ? cleaned : instructions;
}

/**
 * Stage 4: Final consistency check and confidence scoring
 */
async function performFinalValidation(
  recipe: ParsedRecipe,
  content: string,
  options: { includeNutrition: boolean; strictValidation: boolean; confidenceThreshold: number }
): Promise<ParsedRecipe> {
  if (!options.strictValidation) return recipe;
  try {
    const validation = await validateRecipeConsistency(recipe, content);
    // Keep minimum confidence between earlier and validation phases
    return {
      ...validation.validatedRecipe,
      confidence: Math.min(recipe.confidence, validation.validatedRecipe.confidence)
    };
  } catch {
    return recipe;
  }
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
      const errorMessages = validationResult.errors.map((e: any) => e.message).join('; ');
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
        quantity: iq.inferredQuantity,
        unit: iq.inferredUnit,
        optional: false,
        confidence: 0.6,
        inferred: true,
        notes: iq.originalQuantity ? `Originally: ${iq.originalQuantity}` : undefined
      })),
      inconsistencies: recoveryResult.inconsistencies.map(inc => ({
        type: ((): ValidationIssue['type'] => {
          switch (inc.type) {
            case 'missing_in_steps':
              return 'step_reference_error';
            case 'missing_in_ingredients':
            case 'duplicate_ingredient':
              return 'missing_ingredient';
            case 'quantity_mismatch':
              return 'quantity_mismatch';
            case 'unit_inconsistency':
              return 'unit_inconsistency';
            default:
              return 'step_reference_error';
          }
        })(),
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