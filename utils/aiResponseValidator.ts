/**
 * AI response validation and error handling system
 * Provides robust validation, error recovery, and fallback strategies for AI responses
 */

export interface ValidationResult<T = any> {
  isValid: boolean;
  data?: T;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  confidence: number;
  fallbackUsed: boolean;
}

export interface ValidationError {
  code: string;
  message: string;
  field?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recoverable: boolean;
  suggestion?: string;
}

export interface ValidationWarning {
  code: string;
  message: string;
  field?: string;
  suggestion?: string;
}

export interface ValidationOptions {
  strictMode?: boolean;
  allowPartialData?: boolean;
  maxRetries?: number;
  fallbackStrategy?: 'simple' | 'template' | 'none';
  confidenceThreshold?: number;
}

export interface SchemaValidationRule {
  field: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  pattern?: RegExp;
  enum?: any[];
  items?: SchemaValidationRule;
  properties?: Record<string, SchemaValidationRule>;
  custom?: (value: any) => ValidationError | null;
}

// Common validation error codes
export const ERROR_CODES = {
  INVALID_JSON: 'INVALID_JSON',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_TYPE: 'INVALID_TYPE',
  INVALID_FORMAT: 'INVALID_FORMAT',
  VALUE_OUT_OF_RANGE: 'VALUE_OUT_OF_RANGE',
  INVALID_ENUM_VALUE: 'INVALID_ENUM_VALUE',
  EMPTY_ARRAY: 'EMPTY_ARRAY',
  PATTERN_MISMATCH: 'PATTERN_MISMATCH',
  CUSTOM_VALIDATION_FAILED: 'CUSTOM_VALIDATION_FAILED',
  LOW_CONFIDENCE: 'LOW_CONFIDENCE',
  PARTIAL_DATA: 'PARTIAL_DATA'
} as const;

// Recipe-specific validation schemas
export const RECIPE_VALIDATION_SCHEMA: Record<string, SchemaValidationRule> = {
  title: {
    field: 'title',
    type: 'string',
    required: true,
    minLength: 1,
    maxLength: 200,
    custom: (value: string) => {
      if (value.toLowerCase().includes('untitled') || value.toLowerCase().includes('unknown')) {
        return {
          code: ERROR_CODES.INVALID_FORMAT,
          message: 'Recipe title appears to be a placeholder',
          severity: 'medium',
          recoverable: true,
          suggestion: 'Try to extract a more specific recipe name from the content'
        };
      }
      return null;
    }
  },
  ingredients: {
    field: 'ingredients',
    type: 'array',
    required: true,
    items: {
      field: 'ingredient',
      type: 'object',
      properties: {
        name: {
          field: 'name',
          type: 'string',
          required: true,
          minLength: 1,
          maxLength: 100
        },
        quantity: {
          field: 'quantity',
          type: 'number',
          minimum: 0,
          maximum: 1000
        },
        unit: {
          field: 'unit',
          type: 'string',
          maxLength: 20,
          enum: ['tsp', 'tbsp', 'cup', 'oz', 'fl oz', 'pt', 'qt', 'gal', 'ml', 'l', 'g', 'kg', 'lb', 'clove', 'bunch', 'pinch', 'dash', 'splash', 'can', 'jar', 'pkg', 'slice', 'piece', 'pcs']
        },
        confidence: {
          field: 'confidence',
          type: 'number',
          minimum: 0,
          maximum: 1
        }
      }
    },
    custom: (ingredients: any[]) => {
      if (ingredients.length === 0) {
        return {
          code: ERROR_CODES.EMPTY_ARRAY,
          message: 'Recipe must have at least one ingredient',
          severity: 'critical',
          recoverable: false
        };
      }
      
      const lowConfidenceCount = ingredients.filter(ing => ing.confidence && ing.confidence < 0.5).length;
      if (lowConfidenceCount > ingredients.length * 0.5) {
        return {
          code: ERROR_CODES.LOW_CONFIDENCE,
          message: 'Too many ingredients have low confidence scores',
          severity: 'medium',
          recoverable: true,
          suggestion: 'Review and verify ingredient extraction'
        };
      }
      
      return null;
    }
  },
  instructions: {
    field: 'instructions',
    type: 'array',
    required: true,
    items: {
      field: 'instruction',
      type: 'string',
      minLength: 5,
      maxLength: 500
    },
    custom: (instructions: string[]) => {
      if (instructions.length === 0) {
        return {
          code: ERROR_CODES.EMPTY_ARRAY,
          message: 'Recipe must have at least one instruction',
          severity: 'critical',
          recoverable: false
        };
      }
      
      const shortInstructions = instructions.filter(inst => inst.length < 10).length;
      if (shortInstructions > instructions.length * 0.3) {
        return {
          code: ERROR_CODES.INVALID_FORMAT,
          message: 'Many instructions are very short and may be incomplete',
          severity: 'medium',
          recoverable: true,
          suggestion: 'Review instruction extraction for completeness'
        };
      }
      
      return null;
    }
  },
  prepTime: {
    field: 'prepTime',
    type: 'number',
    minimum: 0,
    maximum: 1440 // 24 hours in minutes
  },
  cookTime: {
    field: 'cookTime',
    type: 'number',
    minimum: 0,
    maximum: 1440
  },
  servings: {
    field: 'servings',
    type: 'number',
    minimum: 1,
    maximum: 100
  },
  confidence: {
    field: 'confidence',
    type: 'number',
    required: true,
    minimum: 0,
    maximum: 1
  }
};

/**
 * Main validation function for AI responses
 */
export function validateAIResponse<T = any>(
  response: string,
  schema: Record<string, SchemaValidationRule>,
  options: ValidationOptions = {}
): ValidationResult<T> {
  const {
    strictMode = false,
    allowPartialData = true,
    maxRetries = 2,
    fallbackStrategy = 'simple',
    confidenceThreshold = 0.5
  } = options;

  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  let data: any = null;
  let confidence = 0;
  let fallbackUsed = false;

  try {
    // Step 1: Extract and parse JSON
    const jsonResult = extractJSON(response);
    if (!jsonResult.success) {
      errors.push({
        code: ERROR_CODES.INVALID_JSON,
        message: jsonResult.error || 'Failed to parse JSON from response',
        severity: 'critical',
        recoverable: fallbackStrategy !== 'none',
        suggestion: 'Ensure AI response contains valid JSON'
      });

      if (fallbackStrategy !== 'none') {
        const fallbackResult = applyFallbackStrategy(response, schema, fallbackStrategy);
        if (fallbackResult.success) {
          data = fallbackResult.data;
          fallbackUsed = true;
          warnings.push({
            code: 'FALLBACK_USED',
            message: 'Used fallback parsing due to JSON extraction failure'
          });
        }
      }

      if (!data) {
        return {
          isValid: false,
          errors,
          warnings,
          confidence: 0,
          fallbackUsed
        };
      }
    } else {
      data = jsonResult.data;
    }

    // Step 2: Validate against schema
    const schemaValidation = validateAgainstSchema(data, schema, strictMode);
    errors.push(...schemaValidation.errors);
    warnings.push(...schemaValidation.warnings);

    // Step 3: Calculate confidence
    confidence = calculateValidationConfidence(data, errors, warnings);

    // Step 4: Check confidence threshold
    if (confidence < confidenceThreshold) {
      errors.push({
        code: ERROR_CODES.LOW_CONFIDENCE,
        message: `Validation confidence ${confidence.toFixed(2)} below threshold ${confidenceThreshold}`,
        severity: 'medium',
        recoverable: allowPartialData,
        suggestion: 'Consider using a different extraction method or improving input quality'
      });
    }

    // Step 5: Apply data cleaning and normalization
    const cleanedData = cleanAndNormalizeData(data, schema);

    // Step 6: Determine if validation passed
    const criticalErrors = errors.filter(e => e.severity === 'critical');
    const isValid = criticalErrors.length === 0 && (allowPartialData || confidence >= confidenceThreshold);

    return {
      isValid,
      data: isValid ? cleanedData : undefined,
      errors,
      warnings,
      confidence,
      fallbackUsed
    };

  } catch (error) {
    errors.push({
      code: 'VALIDATION_ERROR',
      message: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      severity: 'critical',
      recoverable: false
    });

    return {
      isValid: false,
      errors,
      warnings,
      confidence: 0,
      fallbackUsed
    };
  }
}

/**
 * Extracts JSON from AI response with multiple strategies
 */
function extractJSON(response: string): { success: boolean; data?: any; error?: string } {
  try {
    // Strategy 1: Try parsing the entire response
    const trimmed = response.trim();
    try {
      const parsed = JSON.parse(trimmed);
      return { success: true, data: parsed };
    } catch {
      // Continue to next strategy
    }

    // Strategy 2: Extract from code fences
    const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (codeBlockMatch) {
      try {
        const parsed = JSON.parse(codeBlockMatch[1].trim());
        return { success: true, data: parsed };
      } catch {
        // Continue to next strategy
      }
    }

    // Strategy 3: Find JSON object boundaries
    const firstBrace = trimmed.indexOf('{');
    const lastBrace = trimmed.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      try {
        const jsonStr = trimmed.slice(firstBrace, lastBrace + 1);
        const parsed = JSON.parse(jsonStr);
        return { success: true, data: parsed };
      } catch {
        // Continue to next strategy
      }
    }

    // Strategy 4: Try to find and parse array
    const firstBracket = trimmed.indexOf('[');
    const lastBracket = trimmed.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
      try {
        const jsonStr = trimmed.slice(firstBracket, lastBracket + 1);
        const parsed = JSON.parse(jsonStr);
        return { success: true, data: parsed };
      } catch {
        // Continue to next strategy
      }
    }

    // Strategy 5: Try to clean and parse
    const cleaned = cleanJSONString(trimmed);
    if (cleaned !== trimmed) {
      try {
        const parsed = JSON.parse(cleaned);
        return { success: true, data: parsed };
      } catch {
        // All strategies failed
      }
    }

    return { success: false, error: 'Could not extract valid JSON from response' };

  } catch (error) {
    return { 
      success: false, 
      error: `JSON extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
}

/**
 * Cleans JSON string by fixing common issues
 */
function cleanJSONString(jsonStr: string): string {
  return jsonStr
    // Remove leading/trailing non-JSON content
    .replace(/^[^{\[]*/, '')
    .replace(/[^}\]]*$/, '')
    // Fix common quote issues
    .replace(/'/g, '"')
    // Fix trailing commas
    .replace(/,(\s*[}\]])/g, '$1')
    // Fix missing quotes around keys
    .replace(/(\w+):/g, '"$1":')
    // Fix double quotes in strings
    .replace(/"([^"]*)"([^"]*)"([^"]*)":/g, '"$1$2$3":');
}

/**
 * Validates data against schema
 */
function validateAgainstSchema(
  data: any,
  schema: Record<string, SchemaValidationRule>,
  strictMode: boolean
): { errors: ValidationError[]; warnings: ValidationWarning[] } {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Validate each field in schema
  for (const [fieldName, rule] of Object.entries(schema)) {
    const fieldValue = data[fieldName];
    const fieldErrors = validateField(fieldValue, rule, fieldName);
    errors.push(...fieldErrors);
  }

  // Check for extra fields in strict mode
  if (strictMode) {
    for (const fieldName of Object.keys(data)) {
      if (!schema[fieldName]) {
        warnings.push({
          code: 'EXTRA_FIELD',
          message: `Unexpected field '${fieldName}' found in data`,
          field: fieldName,
          suggestion: 'Remove extra field or add to schema'
        });
      }
    }
  }

  return { errors, warnings };
}

/**
 * Validates a single field against its rule
 */
function validateField(value: any, rule: SchemaValidationRule, fieldPath: string): ValidationError[] {
  const errors: ValidationError[] = [];

  // Check if required field is missing
  if (rule.required && (value === undefined || value === null)) {
    errors.push({
      code: ERROR_CODES.MISSING_REQUIRED_FIELD,
      message: `Required field '${fieldPath}' is missing`,
      field: fieldPath,
      severity: 'critical',
      recoverable: false,
      suggestion: 'Ensure the field is included in the AI response'
    });
    return errors;
  }

  // Skip validation if field is not present and not required
  if (value === undefined || value === null) {
    return errors;
  }

  // Type validation
  if (!validateType(value, rule.type)) {
    errors.push({
      code: ERROR_CODES.INVALID_TYPE,
      message: `Field '${fieldPath}' should be of type ${rule.type}, got ${typeof value}`,
      field: fieldPath,
      severity: 'high',
      recoverable: true,
      suggestion: `Convert value to ${rule.type}`
    });
    return errors; // Skip further validation if type is wrong
  }

  // String validations
  if (rule.type === 'string' && typeof value === 'string') {
    if (rule.minLength !== undefined && value.length < rule.minLength) {
      errors.push({
        code: ERROR_CODES.VALUE_OUT_OF_RANGE,
        message: `Field '${fieldPath}' is too short (${value.length} < ${rule.minLength})`,
        field: fieldPath,
        severity: 'medium',
        recoverable: true
      });
    }

    if (rule.maxLength !== undefined && value.length > rule.maxLength) {
      errors.push({
        code: ERROR_CODES.VALUE_OUT_OF_RANGE,
        message: `Field '${fieldPath}' is too long (${value.length} > ${rule.maxLength})`,
        field: fieldPath,
        severity: 'medium',
        recoverable: true,
        suggestion: 'Truncate the value'
      });
    }

    if (rule.pattern && !rule.pattern.test(value)) {
      errors.push({
        code: ERROR_CODES.PATTERN_MISMATCH,
        message: `Field '${fieldPath}' does not match required pattern`,
        field: fieldPath,
        severity: 'medium',
        recoverable: true
      });
    }
  }

  // Number validations
  if (rule.type === 'number' && typeof value === 'number') {
    if (rule.minimum !== undefined && value < rule.minimum) {
      errors.push({
        code: ERROR_CODES.VALUE_OUT_OF_RANGE,
        message: `Field '${fieldPath}' is below minimum (${value} < ${rule.minimum})`,
        field: fieldPath,
        severity: 'medium',
        recoverable: true,
        suggestion: `Set value to at least ${rule.minimum}`
      });
    }

    if (rule.maximum !== undefined && value > rule.maximum) {
      errors.push({
        code: ERROR_CODES.VALUE_OUT_OF_RANGE,
        message: `Field '${fieldPath}' is above maximum (${value} > ${rule.maximum})`,
        field: fieldPath,
        severity: 'medium',
        recoverable: true,
        suggestion: `Set value to at most ${rule.maximum}`
      });
    }
  }

  // Enum validation
  if (rule.enum && !rule.enum.includes(value)) {
    errors.push({
      code: ERROR_CODES.INVALID_ENUM_VALUE,
      message: `Field '${fieldPath}' has invalid value '${value}', expected one of: ${rule.enum.join(', ')}`,
      field: fieldPath,
      severity: 'medium',
      recoverable: true,
      suggestion: `Use one of the valid values: ${rule.enum.join(', ')}`
    });
  }

  // Array validation
  if (rule.type === 'array' && Array.isArray(value)) {
    if (rule.items) {
      value.forEach((item, index) => {
        const itemErrors = validateField(item, rule.items!, `${fieldPath}[${index}]`);
        errors.push(...itemErrors);
      });
    }
  }

  // Object validation
  if (rule.type === 'object' && typeof value === 'object' && rule.properties) {
    for (const [propName, propRule] of Object.entries(rule.properties)) {
      const propErrors = validateField(value[propName], propRule, `${fieldPath}.${propName}`);
      errors.push(...propErrors);
    }
  }

  // Custom validation
  if (rule.custom) {
    const customError = rule.custom(value);
    if (customError) {
      errors.push({
        ...customError,
        field: fieldPath
      });
    }
  }

  return errors;
}

/**
 * Validates value type
 */
function validateType(value: any, expectedType: string): boolean {
  switch (expectedType) {
    case 'string':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number' && !isNaN(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'array':
      return Array.isArray(value);
    case 'object':
      return typeof value === 'object' && value !== null && !Array.isArray(value);
    default:
      return false;
  }
}

/**
 * Calculates validation confidence score
 */
function calculateValidationConfidence(
  data: any,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): number {
  let confidence = 1.0;

  // Reduce confidence based on errors
  const criticalErrors = errors.filter(e => e.severity === 'critical').length;
  const highErrors = errors.filter(e => e.severity === 'high').length;
  const mediumErrors = errors.filter(e => e.severity === 'medium').length;
  const lowErrors = errors.filter(e => e.severity === 'low').length;

  confidence -= criticalErrors * 0.5;
  confidence -= highErrors * 0.2;
  confidence -= mediumErrors * 0.1;
  confidence -= lowErrors * 0.05;

  // Reduce confidence based on warnings
  confidence -= warnings.length * 0.02;

  // Bonus for complete data
  if (data && typeof data === 'object') {
    const fieldCount = Object.keys(data).length;
    if (fieldCount > 5) confidence += 0.1;
  }

  return Math.max(0, Math.min(1, confidence));
}

/**
 * Cleans and normalizes data based on schema
 */
function cleanAndNormalizeData(data: any, schema: Record<string, SchemaValidationRule>): any {
  const cleaned = { ...data };

  for (const [fieldName, rule] of Object.entries(schema)) {
    const value = cleaned[fieldName];

    if (value === undefined || value === null) continue;

    // Clean strings
    if (rule.type === 'string' && typeof value === 'string') {
      cleaned[fieldName] = value.trim();
      
      if (rule.maxLength && value.length > rule.maxLength) {
        cleaned[fieldName] = value.slice(0, rule.maxLength);
      }
    }

    // Clamp numbers
    if (rule.type === 'number' && typeof value === 'number') {
      if (rule.minimum !== undefined && value < rule.minimum) {
        cleaned[fieldName] = rule.minimum;
      }
      if (rule.maximum !== undefined && value > rule.maximum) {
        cleaned[fieldName] = rule.maximum;
      }
    }

    // Clean arrays
    if (rule.type === 'array' && Array.isArray(value)) {
      cleaned[fieldName] = value.filter(item => item !== null && item !== undefined);
    }
  }

  return cleaned;
}

/**
 * Applies fallback strategy when JSON parsing fails
 */
function applyFallbackStrategy(
  response: string,
  schema: Record<string, SchemaValidationRule>,
  strategy: 'simple' | 'template'
): { success: boolean; data?: any } {
  try {
    if (strategy === 'simple') {
      return applySimpleFallback(response, schema);
    } else if (strategy === 'template') {
      return applyTemplateFallback(response, schema);
    }
  } catch (error) {
    console.warn('[AIResponseValidator] Fallback strategy failed:', error);
  }

  return { success: false };
}

/**
 * Simple fallback: extract basic information using regex
 */
function applySimpleFallback(response: string, schema: Record<string, SchemaValidationRule>): { success: boolean; data?: any } {
  const data: any = {};

  // Extract title
  const titleMatch = response.match(/(?:title|name|recipe):\s*([^\n]+)/i);
  if (titleMatch) {
    data.title = titleMatch[1].trim();
  }

  // Extract ingredients (simple list detection)
  const ingredientsMatch = response.match(/(?:ingredients?|what you need):\s*((?:[-•*]\s*[^\n]+\n?)+)/i);
  if (ingredientsMatch) {
    const ingredientLines = ingredientsMatch[1].split('\n').filter(line => line.trim());
    data.ingredients = ingredientLines.map(line => ({
      name: line.replace(/^[-•*]\s*/, '').trim(),
      confidence: 0.5,
      inferred: true,
      optional: false
    }));
  }

  // Extract instructions
  const instructionsMatch = response.match(/(?:instructions?|directions?|steps?):\s*((?:\d+\.\s*[^\n]+\n?)+)/i);
  if (instructionsMatch) {
    const instructionLines = instructionsMatch[1].split('\n').filter(line => line.trim());
    data.instructions = instructionLines.map(line => line.replace(/^\d+\.\s*/, '').trim());
  }

  data.confidence = 0.3; // Low confidence for fallback

  return { success: Object.keys(data).length > 0, data };
}

/**
 * Template fallback: use a basic recipe template
 */
function applyTemplateFallback(response: string, schema: Record<string, SchemaValidationRule>): { success: boolean; data?: any } {
  const data = {
    title: 'Extracted Recipe',
    ingredients: [
      {
        name: 'ingredient (extracted from text)',
        confidence: 0.3,
        inferred: true,
        optional: false
      }
    ],
    instructions: ['Follow the original instructions from the source'],
    confidence: 0.2
  };

  return { success: true, data };
}

/**
 * Validates recipe-specific AI response
 */
export function validateRecipeResponse(response: string, options: ValidationOptions = {}): ValidationResult {
  return validateAIResponse(response, RECIPE_VALIDATION_SCHEMA, options);
}

/**
 * Creates a validation summary for logging/debugging
 */
export function createValidationSummary(result: ValidationResult): string {
  const summary = [`Validation Result: ${result.isValid ? 'PASSED' : 'FAILED'}`];
  summary.push(`Confidence: ${(result.confidence * 100).toFixed(1)}%`);
  
  if (result.fallbackUsed) {
    summary.push('Fallback strategy was used');
  }

  if (result.errors.length > 0) {
    summary.push(`Errors (${result.errors.length}):`);
    result.errors.forEach(error => {
      summary.push(`  - ${error.severity.toUpperCase()}: ${error.message}`);
    });
  }

  if (result.warnings.length > 0) {
    summary.push(`Warnings (${result.warnings.length}):`);
    result.warnings.forEach(warning => {
      summary.push(`  - ${warning.message}`);
    });
  }

  return summary.join('\n');
}