/**
 * Text content normalizer for recipe import processing
 * Cleans and standardizes text from various sources for better AI parsing
 */

export interface NormalizationOptions {
  removeEmojis?: boolean;
  removeHashtags?: boolean;
  removeMentions?: boolean;
  removeUrls?: boolean;
  normalizeWhitespace?: boolean;
  fixCommonErrors?: boolean;
  standardizeUnits?: boolean;
  enhanceStructure?: boolean;
  preserveFormatting?: boolean;
}

export interface NormalizationResult {
  normalizedText: string;
  appliedOperations: string[];
  originalLength: number;
  normalizedLength: number;
  confidence: number;
}

// Common recipe-related patterns
const RECIPE_PATTERNS = {
  ingredients: /(?:ingredients?|what you need|shopping list|grocery list)[\s:]/i,
  instructions: /(?:instructions?|directions?|method|steps?|how to make|preparation)[\s:]/i,
  servings: /(?:serves?|servings?|portions?|makes?)[\s:]?\s*(\d+)/i,
  prepTime: /(?:prep(?:aration)?\s*time|prep)[\s:]?\s*(\d+)\s*(?:min|minutes?|hrs?|hours?)/i,
  cookTime: /(?:cook(?:ing)?\s*time|bake\s*time|cooking)[\s:]?\s*(\d+)\s*(?:min|minutes?|hrs?|hours?)/i,
  temperature: /(\d+)\s*(?:°|degrees?)\s*(?:[fF]|fahrenheit|[cC]|celsius)/g
};

// Unit standardization mappings
const UNIT_MAPPINGS: Record<string, string> = {
  // Volume
  'teaspoons': 'tsp',
  'teaspoon': 'tsp',
  'tablespoons': 'tbsp',
  'tablespoon': 'tbsp',
  'cups': 'cup',
  'ounces': 'oz',
  'ounce': 'oz',
  'fluid ounces': 'fl oz',
  'fluid ounce': 'fl oz',
  'pints': 'pt',
  'pint': 'pt',
  'quarts': 'qt',
  'quart': 'qt',
  'gallons': 'gal',
  'gallon': 'gal',
  'milliliters': 'ml',
  'milliliter': 'ml',
  'liters': 'l',
  'liter': 'l',
  
  // Weight
  'pounds': 'lb',
  'pound': 'lb',
  'ounces': 'oz',
  'ounce': 'oz',
  'grams': 'g',
  'gram': 'g',
  'kilograms': 'kg',
  'kilogram': 'kg',
  
  // Count
  'pieces': 'pcs',
  'piece': 'pc',
  'cloves': 'clove',
  'bunches': 'bunch',
  'packages': 'pkg',
  'package': 'pkg',
  'cans': 'can',
  'bottles': 'bottle',
  'jars': 'jar'
};

// Common OCR/transcription errors
const COMMON_ERRORS: Record<string, string> = {
  // Number confusions
  '0ne': 'one',
  '1/4': '¼',
  '1/2': '½',
  '3/4': '¾',
  '1/3': '⅓',
  '2/3': '⅔',
  
  // Letter confusions
  'rninutes': 'minutes',
  'rnin': 'min',
  'degress': 'degrees',
  'ingrediants': 'ingredients',
  'recipie': 'recipe',
  'seperate': 'separate',
  'untill': 'until',
  'recieve': 'receive',
  
  // Common cooking terms
  'saute': 'sauté',
  'flambe': 'flambé',
  'puree': 'purée',
  'pate': 'pâté',
  'creme': 'crème',
  'fraiche': 'fraîche'
};

/**
 * Main text normalization function
 */
export function normalizeTextContent(
  text: string,
  options: NormalizationOptions = {}
): NormalizationResult {
  const {
    removeEmojis = true,
    removeHashtags = true,
    removeMentions = true,
    removeUrls = true,
    normalizeWhitespace = true,
    fixCommonErrors = true,
    standardizeUnits = true,
    enhanceStructure = true,
    preserveFormatting = false
  } = options;

  const appliedOperations: string[] = [];
  const originalLength = text.length;
  let normalizedText = text;

  // Step 1: Remove social media artifacts
  if (removeEmojis) {
    normalizedText = removeEmojiCharacters(normalizedText);
    appliedOperations.push('emoji-removal');
  }

  if (removeHashtags) {
    normalizedText = removeHashtagsAndMentions(normalizedText, true, false);
    appliedOperations.push('hashtag-removal');
  }

  if (removeMentions) {
    normalizedText = removeHashtagsAndMentions(normalizedText, false, true);
    appliedOperations.push('mention-removal');
  }

  if (removeUrls) {
    normalizedText = removeUrlsFromText(normalizedText);
    appliedOperations.push('url-removal');
  }

  // Step 2: Fix common transcription/OCR errors
  if (fixCommonErrors) {
    normalizedText = fixCommonTextErrors(normalizedText);
    appliedOperations.push('error-correction');
  }

  // Step 3: Standardize units and measurements
  if (standardizeUnits) {
    normalizedText = standardizeMeasurementUnits(normalizedText);
    appliedOperations.push('unit-standardization');
  }

  // Step 4: Normalize whitespace and formatting
  if (normalizeWhitespace) {
    normalizedText = normalizeWhitespaceAndFormatting(normalizedText, preserveFormatting);
    appliedOperations.push('whitespace-normalization');
  }

  // Step 5: Enhance recipe structure
  if (enhanceStructure) {
    normalizedText = enhanceRecipeStructure(normalizedText);
    appliedOperations.push('structure-enhancement');
  }

  // Calculate confidence based on improvements made
  const confidence = calculateNormalizationConfidence(text, normalizedText, appliedOperations);

  return {
    normalizedText: normalizedText.trim(),
    appliedOperations,
    originalLength,
    normalizedLength: normalizedText.length,
    confidence
  };
}

/**
 * Removes emoji characters from text
 */
function removeEmojiCharacters(text: string): string {
  // Remove most emoji ranges
  return text
    .replace(/[\u{1F300}-\u{1FAFF}]/gu, ' ') // Miscellaneous Symbols and Pictographs
    .replace(/[\u{1F900}-\u{1F9FF}]/gu, ' ') // Supplemental Symbols and Pictographs
    .replace(/[\u{2600}-\u{26FF}]/gu, ' ')   // Miscellaneous Symbols
    .replace(/[\u{2700}-\u{27BF}]/gu, ' ')   // Dingbats
    .replace(/[\u{FE00}-\u{FE0F}]/gu, '')    // Variation Selectors
    .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, ' ') // Regional Indicator Symbols
    .replace(/[\u{E000}-\u{F8FF}]/gu, ' ');  // Private Use Area
}

/**
 * Removes hashtags and mentions from text
 */
function removeHashtagsAndMentions(text: string, removeHashtags: boolean, removeMentions: boolean): string {
  let result = text;
  
  if (removeHashtags) {
    result = result.replace(/#[\w_]+/g, ' ');
  }
  
  if (removeMentions) {
    result = result.replace(/@[\w_]+/g, ' ');
  }
  
  return result;
}

/**
 * Removes URLs from text
 */
function removeUrlsFromText(text: string): string {
  return text
    .replace(/https?:\/\/[^\s]+/gi, ' ')
    .replace(/www\.[^\s]+/gi, ' ')
    .replace(/[a-zA-Z0-9-]+\.[a-zA-Z]{2,}[^\s]*/gi, ' ');
}

/**
 * Fixes common transcription and OCR errors
 */
function fixCommonTextErrors(text: string): string {
  let result = text;
  
  // Apply common error corrections
  Object.entries(COMMON_ERRORS).forEach(([error, correction]) => {
    const regex = new RegExp(`\\b${error}\\b`, 'gi');
    result = result.replace(regex, correction);
  });
  
  // Fix common punctuation issues
  result = result
    .replace(/\s+([,.!?;:])/g, '$1') // Remove space before punctuation
    .replace(/([.!?])\s*([a-z])/g, '$1 $2') // Ensure space after sentence endings
    .replace(/(\d)\s*-\s*(\d)/g, '$1-$2') // Fix number ranges
    .replace(/(\d)\s*\/\s*(\d)/g, '$1/$2') // Fix fractions
    .replace(/\s*°\s*/g, '°') // Fix degree symbols
    .replace(/\s*%\s*/g, '%'); // Fix percentage symbols
  
  return result;
}

/**
 * Standardizes measurement units
 */
function standardizeMeasurementUnits(text: string): string {
  let result = text;
  
  // Standardize units
  Object.entries(UNIT_MAPPINGS).forEach(([longForm, shortForm]) => {
    const regex = new RegExp(`\\b${longForm}\\b`, 'gi');
    result = result.replace(regex, shortForm);
  });
  
  // Standardize temperature formats
  result = result
    .replace(/(\d+)\s*degrees?\s*fahrenheit/gi, '$1°F')
    .replace(/(\d+)\s*degrees?\s*celsius/gi, '$1°C')
    .replace(/(\d+)\s*degrees?\s*f\b/gi, '$1°F')
    .replace(/(\d+)\s*degrees?\s*c\b/gi, '$1°C');
  
  // Standardize time formats
  result = result
    .replace(/(\d+)\s*hours?\s*(\d+)\s*minutes?/gi, '$1h $2min')
    .replace(/(\d+)\s*hrs?\s*(\d+)\s*mins?/gi, '$1h $2min')
    .replace(/(\d+)\s*hours?/gi, '$1h')
    .replace(/(\d+)\s*hrs?/gi, '$1h')
    .replace(/(\d+)\s*minutes?/gi, '$1min')
    .replace(/(\d+)\s*mins?/gi, '$1min');
  
  return result;
}

/**
 * Normalizes whitespace and basic formatting
 */
function normalizeWhitespaceAndFormatting(text: string, preserveFormatting: boolean): string {
  let result = text;
  
  if (!preserveFormatting) {
    // Normalize line breaks
    result = result
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n{3,}/g, '\n\n'); // Max 2 consecutive line breaks
  }
  
  // Normalize spaces
  result = result
    .replace(/[\t\u00A0\u2000-\u200B\u2028\u2029\u3000]/g, ' ') // Replace various space characters
    .replace(/ {2,}/g, ' ') // Replace multiple spaces with single space
    .replace(/^ +| +$/gm, ''); // Trim lines
  
  // Fix bullet point formatting
  result = result
    .replace(/^[\s]*[-•*·]\s*/gm, '- ') // Standardize bullet points
    .replace(/^[\s]*(\d+)[\.\)]\s*/gm, '$1. '); // Standardize numbered lists
  
  return result;
}

/**
 * Enhances recipe structure for better AI parsing
 */
function enhanceRecipeStructure(text: string): string {
  let result = text;
  
  // Add clear section headers if missing
  if (!RECIPE_PATTERNS.ingredients.test(result) && hasIngredientList(result)) {
    result = result.replace(/^(\s*[-•*]\s*\d+.*(?:\n\s*[-•*]\s*.*)*)/m, 'Ingredients:\n$1');
  }
  
  if (!RECIPE_PATTERNS.instructions.test(result) && hasInstructionList(result)) {
    result = result.replace(/^(\s*\d+\.\s*.*(?:\n\s*\d+\.\s*.*)*)/m, 'Instructions:\n$1');
  }
  
  // Enhance measurement formatting
  result = result
    .replace(/(\d+)\s*([¼½¾⅓⅔⅛⅜⅝⅞])/g, '$1 $2') // Space between whole numbers and fractions
    .replace(/(\d+)\s*([¼½¾⅓⅔⅛⅜⅝⅞])\s*(\w+)/g, '$1$2 $3') // Fix fraction spacing
    .replace(/(\d+)\s*\/\s*(\d+)\s*(\w+)/g, '$1/$2 $3'); // Fix fraction formatting
  
  // Enhance cooking instruction clarity
  result = result
    .replace(/\b(\d+)\s*-\s*(\d+)\s*(min|minutes?|hrs?|hours?)\b/gi, '$1-$2 $3')
    .replace(/\bfor\s+about\s+(\d+)/gi, 'for approximately $1')
    .replace(/\bundertil\b/gi, 'until')
    .replace(/\btill\b/gi, 'until');
  
  return result;
}

/**
 * Checks if text contains an ingredient list
 */
function hasIngredientList(text: string): boolean {
  const lines = text.split('\n');
  const bulletLines = lines.filter(line => /^\s*[-•*]\s*/.test(line));
  
  if (bulletLines.length < 3) return false;
  
  // Check if bullet points contain measurement patterns
  const measurementPattern = /\d+\s*(?:[¼½¾⅓⅔⅛⅜⅝⅞]|\d*\/\d+)?\s*(?:cup|tbsp|tsp|oz|lb|g|kg|ml|l|clove|bunch|pinch)\b/i;
  const measurementLines = bulletLines.filter(line => measurementPattern.test(line));
  
  return measurementLines.length >= Math.min(3, bulletLines.length * 0.6);
}

/**
 * Checks if text contains an instruction list
 */
function hasInstructionList(text: string): boolean {
  const lines = text.split('\n');
  const numberedLines = lines.filter(line => /^\s*\d+\.\s*/.test(line));
  
  if (numberedLines.length < 3) return false;
  
  // Check if numbered lines contain cooking verbs
  const cookingVerbs = /\b(?:mix|stir|add|cook|bake|heat|boil|simmer|fry|sauté|chop|dice|slice|combine|whisk|fold|pour|serve)\b/i;
  const cookingLines = numberedLines.filter(line => cookingVerbs.test(line));
  
  return cookingLines.length >= Math.min(2, numberedLines.length * 0.5);
}

/**
 * Calculates confidence score for normalization
 */
function calculateNormalizationConfidence(
  originalText: string,
  normalizedText: string,
  operations: string[]
): number {
  let confidence = 0.5; // Base confidence
  
  // Increase confidence based on successful operations
  if (operations.includes('emoji-removal') && /[\u{1F300}-\u{1FAFF}]/gu.test(originalText)) {
    confidence += 0.1;
  }
  
  if (operations.includes('hashtag-removal') && /#\w+/.test(originalText)) {
    confidence += 0.1;
  }
  
  if (operations.includes('url-removal') && /https?:\/\//.test(originalText)) {
    confidence += 0.1;
  }
  
  if (operations.includes('error-correction')) {
    confidence += 0.1;
  }
  
  if (operations.includes('unit-standardization')) {
    confidence += 0.1;
  }
  
  if (operations.includes('structure-enhancement')) {
    confidence += 0.1;
  }
  
  // Penalize if text became too short
  if (normalizedText.length < originalText.length * 0.5) {
    confidence -= 0.2;
  }
  
  // Bonus for recipe-like structure
  if (RECIPE_PATTERNS.ingredients.test(normalizedText) && RECIPE_PATTERNS.instructions.test(normalizedText)) {
    confidence += 0.1;
  }
  
  return Math.max(0, Math.min(1, confidence));
}

/**
 * Specialized normalization for social media content
 */
export function normalizeSocialMediaContent(text: string): NormalizationResult {
  return normalizeTextContent(text, {
    removeEmojis: true,
    removeHashtags: true,
    removeMentions: true,
    removeUrls: true,
    normalizeWhitespace: true,
    fixCommonErrors: true,
    standardizeUnits: true,
    enhanceStructure: true,
    preserveFormatting: false
  });
}

/**
 * Specialized normalization for OCR content
 */
export function normalizeOcrContent(text: string): NormalizationResult {
  return normalizeTextContent(text, {
    removeEmojis: false, // OCR usually doesn't capture emojis
    removeHashtags: false,
    removeMentions: false,
    removeUrls: false,
    normalizeWhitespace: true,
    fixCommonErrors: true, // Very important for OCR
    standardizeUnits: true,
    enhanceStructure: true,
    preserveFormatting: true // OCR formatting might be important
  });
}

/**
 * Specialized normalization for transcribed content
 */
export function normalizeTranscribedContent(text: string): NormalizationResult {
  return normalizeTextContent(text, {
    removeEmojis: false, // Transcription doesn't include emojis
    removeHashtags: false,
    removeMentions: false,
    removeUrls: false,
    normalizeWhitespace: true,
    fixCommonErrors: true,
    standardizeUnits: true,
    enhanceStructure: true,
    preserveFormatting: false // Transcription usually lacks formatting
  });
}

/**
 * Specialized normalization for web content
 */
export function normalizeWebContent(text: string): NormalizationResult {
  return normalizeTextContent(text, {
    removeEmojis: true,
    removeHashtags: false, // Web content hashtags might be relevant
    removeMentions: false,
    removeUrls: true,
    normalizeWhitespace: true,
    fixCommonErrors: true,
    standardizeUnits: true,
    enhanceStructure: true,
    preserveFormatting: true // Web formatting is usually meaningful
  });
}