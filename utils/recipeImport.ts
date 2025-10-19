/**
 * Recipe Import Utility
 * Handles importing recipes from various sources
 */

import { ImportedRecipe, toExternalRecipe } from '@/types/importedRecipe';
import { detectInputType, extractVideoId, getPlatformStrategy } from './inputDetection';

export interface ImportOptions {
  useAI?: boolean;
  includeNutrition?: boolean;
  maxRetries?: number;
}

export interface ImportResult {
  success: boolean;
  recipe?: ImportedRecipe;
  error?: string;
  confidence?: number;
  source?: string;
}

/**
 * Main recipe import function
 */
export async function importRecipe(
  input: string,
  type: 'link' | 'text' | 'image' | 'video',
  options: ImportOptions = {}
): Promise<ImportResult> {
  try {
    // Detect input type and platform
    const detection = detectInputType(input);
    
    // Route to appropriate handler based on type
    switch (type) {
      case 'link':
        return await importFromUrl(input, options);
      case 'text':
        return await importFromText(input, options);
      case 'image':
        return await importFromImage(input, options);
      case 'video':
        return await importFromVideo(input, options);
      default:
        throw new Error(`Unsupported import type: ${type}`);
    }
  } catch (error) {
    console.error('Recipe import error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to import recipe',
    };
  }
}

/**
 * Import recipe from URL
 */
async function importFromUrl(url: string, options: ImportOptions): Promise<ImportResult> {
  try {
    // Normalize URL
    const normalizedUrl = url.trim();
    if (!normalizedUrl) {
      throw new Error('URL is required');
    }

    // Try to fetch and parse the URL
    const response = await fetchUrlContent(normalizedUrl);
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch URL content');
    }

    // Parse the HTML content
    const recipe = await parseHtmlRecipe(response.html || '', normalizedUrl);
    
    if (!recipe) {
      throw new Error('No recipe found at this URL');
    }

    // Enhance with AI if requested
    if (options.useAI) {
      const enhanced = await enhanceRecipeWithAI(recipe);
      return {
        success: true,
        recipe: enhanced,
        confidence: 0.9,
        source: normalizedUrl,
      };
    }

    return {
      success: true,
      recipe,
      confidence: 0.8,
      source: normalizedUrl,
    };
  } catch (error) {
    console.error('URL import error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to import from URL',
    };
  }
}

/**
 * Import recipe from text
 */
async function importFromText(text: string, options: ImportOptions): Promise<ImportResult> {
  try {
    const cleanedText = text.trim();
    if (!cleanedText) {
      throw new Error('Text content is required');
    }

    // Parse text into recipe format
    const recipe = parseTextRecipe(cleanedText);
    
    if (!recipe) {
      throw new Error('Could not parse recipe from text');
    }

    // Enhance with AI if requested
    if (options.useAI) {
      const enhanced = await enhanceRecipeWithAI(recipe);
      return {
        success: true,
        recipe: enhanced,
        confidence: 0.85,
        source: 'text',
      };
    }

    return {
      success: true,
      recipe,
      confidence: 0.7,
      source: 'text',
    };
  } catch (error) {
    console.error('Text import error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to import from text',
    };
  }
}

/**
 * Import recipe from image
 */
async function importFromImage(imageInput: string, options: ImportOptions): Promise<ImportResult> {
  try {
    // For now, return a placeholder response
    // In production, this would use OCR service
    return {
      success: false,
      error: 'Image import not yet implemented. Coming soon!',
    };
  } catch (error) {
    console.error('Image import error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to import from image',
    };
  }
}

/**
 * Import recipe from video URL
 */
async function importFromVideo(videoUrl: string, options: ImportOptions): Promise<ImportResult> {
  try {
    // For now, return a placeholder response
    // In production, this would extract video metadata and transcripts
    return {
      success: false,
      error: 'Video import not yet implemented. Coming soon!',
    };
  } catch (error) {
    console.error('Video import error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to import from video',
    };
  }
}

/**
 * Fetch URL content
 */
async function fetchUrlContent(url: string): Promise<{ success: boolean; html?: string; error?: string }> {
  try {
    // Try to use a CORS proxy for client-side fetching
    // In production, this should be handled by your backend
    const corsProxy = 'https://api.allorigins.win/raw?url=';
    const proxiedUrl = corsProxy + encodeURIComponent(url);
    
    const response = await fetch(proxiedUrl, {
      method: 'GET',
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    return { success: true, html };
  } catch (error) {
    console.error('Fetch error:', error);
    
    // Provide helpful error message for CORS issues
    if (error instanceof Error && error.message.includes('CORS')) {
      return {
        success: false,
        error: 'Unable to fetch from this URL directly. Please copy and paste the recipe text instead.',
      };
    }
    
    return { 
      success: false, 
      error: 'Unable to fetch from this URL. Try copying the recipe text directly from the website instead.',
    };
  }
}

/**
 * Parse HTML content to extract recipe
 */
async function parseHtmlRecipe(html: string, sourceUrl: string): Promise<ImportedRecipe | null> {
  try {
    // Look for JSON-LD structured data
    const jsonLdMatch = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi);
    
    if (jsonLdMatch) {
      for (const match of jsonLdMatch) {
        const jsonStr = match.replace(/<\/?script[^>]*>/gi, '');
        try {
          const data = JSON.parse(jsonStr);
          
          // Check if it's a Recipe schema
          if (data['@type'] === 'Recipe' || (Array.isArray(data['@type']) && data['@type'].includes('Recipe'))) {
            return convertSchemaToRecipe(data, sourceUrl);
          }
          
          // Check for @graph structure
          if (data['@graph']) {
            const recipe = data['@graph'].find((item: any) => 
              item['@type'] === 'Recipe' || 
              (Array.isArray(item['@type']) && item['@type'].includes('Recipe'))
            );
            if (recipe) {
              return convertSchemaToRecipe(recipe, sourceUrl);
            }
          }
        } catch (e) {
          console.log('Failed to parse JSON-LD:', e);
        }
      }
    }

    // Fallback to basic HTML parsing
    return parseHtmlFallback(html, sourceUrl);
  } catch (error) {
    console.error('HTML parsing error:', error);
    return null;
  }
}

/**
 * Convert Schema.org Recipe to our format
 */
function convertSchemaToRecipe(schema: any, sourceUrl: string): ImportedRecipe {
  const recipe: ImportedRecipe = {
    id: generateRecipeId(),
    title: schema.name || 'Untitled Recipe',
    description: schema.description || '',
    image: typeof schema.image === 'string' ? schema.image : schema.image?.[0] || schema.image?.url,
    source: sourceUrl,
    sourceType: 'web',
    sourceUrl: sourceUrl,
    ingredients: [],
    instructions: [],
    prepTime: parseTime(schema.prepTime),
    cookTime: parseTime(schema.cookTime),
    totalTime: parseTime(schema.totalTime),
    servings: parseInt(schema.recipeYield) || parseInt(schema.yield) || 4,
    createdAt: new Date().toISOString(),
  };

  // Parse ingredients
  if (schema.recipeIngredient && Array.isArray(schema.recipeIngredient)) {
    recipe.ingredients = schema.recipeIngredient.map((ing: string) => ({
      name: ing,
      original: ing,
    }));
  }

  // Parse instructions
  if (schema.recipeInstructions) {
    if (Array.isArray(schema.recipeInstructions)) {
      recipe.instructions = schema.recipeInstructions.map((inst: any, index: number) => {
        if (typeof inst === 'string') {
          return { step: index + 1, text: inst };
        } else if (inst.text) {
          return { step: index + 1, text: inst.text };
        } else if (inst.name) {
          return { step: index + 1, text: inst.name };
        }
        return { step: index + 1, text: '' };
      }).filter((inst: any) => inst.text);
    } else if (typeof schema.recipeInstructions === 'string') {
      recipe.instructions = schema.recipeInstructions
        .split(/\n+/)
        .filter(Boolean)
        .map((text: string, index: number) => ({
          step: index + 1,
          text: text.trim(),
        }));
    }
  }

  // Parse nutrition if available
  if (schema.nutrition) {
    const nutrition = schema.nutrition;
    recipe.nutrition = {
      calories: parseNutritionValue(nutrition.calories),
      protein: parseNutritionValue(nutrition.proteinContent),
      carbs: parseNutritionValue(nutrition.carbohydrateContent),
      fat: parseNutritionValue(nutrition.fatContent),
      fiber: parseNutritionValue(nutrition.fiberContent),
      sugar: parseNutritionValue(nutrition.sugarContent),
      sodium: parseNutritionValue(nutrition.sodiumContent),
    };
  }

  // Parse categories/tags
  if (schema.recipeCategory) {
    recipe.categories = Array.isArray(schema.recipeCategory) 
      ? schema.recipeCategory 
      : [schema.recipeCategory];
  }

  if (schema.keywords) {
    recipe.tags = typeof schema.keywords === 'string' 
      ? schema.keywords.split(',').map((k: string) => k.trim())
      : schema.keywords;
  }

  return recipe;
}

/**
 * Fallback HTML parsing when structured data is not available
 */
function parseHtmlFallback(html: string, sourceUrl: string): ImportedRecipe | null {
  // This is a simplified version - in production, you'd use a proper HTML parser
  const recipe: ImportedRecipe = {
    id: generateRecipeId(),
    title: 'Imported Recipe',
    description: '',
    source: sourceUrl,
    sourceType: 'web',
    ingredients: [],
    instructions: [],
    servings: 4,
    createdAt: new Date().toISOString(),
  };

  // Extract title
  const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
  if (titleMatch) {
    recipe.title = titleMatch[1]
      .replace(/\s*[\|–-]\s*.*$/, '') // Remove site name
      .trim();
  }

  // Extract meta description
  const descMatch = html.match(/<meta[^>]*name="description"[^>]*content="([^"]+)"/i);
  if (descMatch) {
    recipe.description = descMatch[1];
  }

  // Extract Open Graph image
  const ogImageMatch = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/i);
  if (ogImageMatch) {
    recipe.image = ogImageMatch[1];
  }

  // Try to find ingredients section
  const ingredientsMatch = html.match(/(?:ingredients|recipe-ingredients)[\s\S]{0,500}?<ul[^>]*>([\s\S]*?)<\/ul>/i);
  if (ingredientsMatch) {
    const ingredients = ingredientsMatch[1].match(/<li[^>]*>([\s\S]*?)<\/li>/gi);
    if (ingredients) {
      recipe.ingredients = ingredients.map(li => ({
        name: li.replace(/<[^>]*>/g, '').trim(),
        original: li.replace(/<[^>]*>/g, '').trim(),
      }));
    }
  }

  // Try to find instructions section
  const instructionsMatch = html.match(/(?:instructions|directions|method|recipe-instructions)[\s\S]{0,500}?<ol[^>]*>([\s\S]*?)<\/ol>/i);
  if (instructionsMatch) {
    const steps = instructionsMatch[1].match(/<li[^>]*>([\s\S]*?)<\/li>/gi);
    if (steps) {
      recipe.instructions = steps.map((li, index) => ({
        step: index + 1,
        text: li.replace(/<[^>]*>/g, '').trim(),
      }));
    }
  }

  // Return null if we couldn't extract meaningful data
  if (recipe.ingredients.length === 0 && recipe.instructions.length === 0) {
    return null;
  }

  return recipe;
}

/**
 * Parse text content into recipe format
 */
function parseTextRecipe(text: string): ImportedRecipe | null {
  const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
  
  const recipe: ImportedRecipe = {
    id: generateRecipeId(),
    title: 'Imported Recipe',
    description: '',
    source: 'text',
    sourceType: 'text',
    ingredients: [],
    instructions: [],
    servings: 4,
    createdAt: new Date().toISOString(),
  };

  let section: 'none' | 'ingredients' | 'instructions' = 'none';
  let instructionStep = 1;

  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    
    // Detect section headers
    if (lowerLine.includes('ingredient')) {
      section = 'ingredients';
      continue;
    } else if (lowerLine.includes('instruction') || lowerLine.includes('direction') || lowerLine.includes('method')) {
      section = 'instructions';
      continue;
    }
    
    // Extract title (usually first line or after "Recipe:")
    if (section === 'none' && !recipe.title.startsWith('Imported')) {
      if (lowerLine.startsWith('recipe:')) {
        recipe.title = line.substring(7).trim();
      } else if (lines.indexOf(line) === 0) {
        recipe.title = line;
      }
      continue;
    }
    
    // Parse ingredients
    if (section === 'ingredients') {
      // Skip if it looks like a section header
      if (lowerLine.includes('instruction') || lowerLine.includes('direction')) {
        section = 'instructions';
        continue;
      }
      
      recipe.ingredients.push({
        name: line,
        original: line,
      });
    }
    
    // Parse instructions
    if (section === 'instructions') {
      // Remove step numbers if present
      const cleanedStep = line.replace(/^\d+\.?\s*/, '');
      recipe.instructions.push({
        step: instructionStep++,
        text: cleanedStep,
      });
    }
  }
  
  // Return null if no meaningful content was extracted
  if (recipe.ingredients.length === 0 && recipe.instructions.length === 0) {
    return null;
  }
  
  return recipe;
}

/**
 * Enhance recipe with AI (placeholder for now)
 */
async function enhanceRecipeWithAI(recipe: ImportedRecipe): Promise<ImportedRecipe> {
  // In production, this would call an AI service to:
  // 1. Fill missing information
  // 2. Standardize measurements
  // 3. Improve clarity of instructions
  // 4. Add nutrition information
  
  return recipe;
}

/**
 * Helper function to parse ISO 8601 duration to minutes
 */
function parseTime(isoDuration?: string): number | undefined {
  if (!isoDuration) return undefined;
  
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return undefined;
  
  const hours = parseInt(match[1] || '0');
  const minutes = parseInt(match[2] || '0');
  
  return hours * 60 + minutes;
}

/**
 * Helper function to parse nutrition values
 */
function parseNutritionValue(value?: string | number): number | undefined {
  if (!value) return undefined;
  if (typeof value === 'number') return value;
  
  const numMatch = value.match(/[\d.]+/);
  return numMatch ? parseFloat(numMatch[0]) : undefined;
}

/**
 * Generate a unique recipe ID
 */
function generateRecipeId(): string {
  return `import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
