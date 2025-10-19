/**
 * Input Detection System for Recipe Import
 * Automatically detects content type and platform
 */

export type InputType = 'url' | 'text' | 'image' | 'video' | 'unknown';

export type Platform = 
  | 'tiktok'
  | 'instagram'
  | 'youtube'
  | 'recipe_website'
  | 'generic_website'
  | 'unknown';

export interface DetectionResult {
  type: InputType;
  platform: Platform;
  confidence: number;
  hints: string[];
  normalizedInput: string;
}

/**
 * URL pattern matchers for various platforms
 */
const PLATFORM_PATTERNS = {
  tiktok: [
    /(?:https?:\/\/)?(?:www\.)?tiktok\.com\/@[\w.-]+\/video\/(\d+)/i,
    /(?:https?:\/\/)?(?:vm|vt)\.tiktok\.com\/[\w-]+/i,
    /(?:https?:\/\/)?(?:www\.)?tiktok\.com\/t\/[\w-]+/i,
  ],
  instagram: [
    /(?:https?:\/\/)?(?:www\.)?instagram\.com\/p\/[\w-]+/i,
    /(?:https?:\/\/)?(?:www\.)?instagram\.com\/reel\/[\w-]+/i,
    /(?:https?:\/\/)?(?:www\.)?instagram\.com\/tv\/[\w-]+/i,
    /(?:https?:\/\/)?(?:www\.)?instagr\.am\/p\/[\w-]+/i,
  ],
  youtube: [
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=[\w-]+/i,
    /(?:https?:\/\/)?(?:www\.)?youtu\.be\/[\w-]+/i,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/[\w-]+/i,
    /(?:https?:\/\/)?(?:m\.)?youtube\.com\/watch\?v=[\w-]+/i,
  ],
};

/**
 * Recipe website patterns
 */
const RECIPE_WEBSITE_PATTERNS = [
  /allrecipes\.com/i,
  /foodnetwork\.com/i,
  /bonappetit\.com/i,
  /seriouseats\.com/i,
  /epicurious\.com/i,
  /delish\.com/i,
  /tasty\.co/i,
  /bbc\.co\.uk\/food/i,
  /bbcgoodfood\.com/i,
  /simplyrecipes\.com/i,
  /cookinglight\.com/i,
  /myrecipes\.com/i,
  /food52\.com/i,
  /thekitchn\.com/i,
  /smittenkitchen\.com/i,
  /minimalistbaker\.com/i,
  /budgetbytes\.com/i,
  /sallysbakingaddiction\.com/i,
  /halfbakedharvest\.com/i,
  /pinchofyum\.com/i,
  /loveandlemons\.com/i,
  /cookieandkate\.com/i,
  /ambitiouuskitchen\.com/i,
  /cafedelites\.com/i,
  /recipetineats\.com/i,
];

/**
 * Recipe-related keywords for text detection
 */
const RECIPE_KEYWORDS = [
  'ingredients',
  'instructions',
  'directions',
  'method',
  'preparation',
  'recipe',
  'serves',
  'servings',
  'prep time',
  'cook time',
  'total time',
  'calories',
  'yield',
  'cup',
  'tablespoon',
  'teaspoon',
  'ounce',
  'pound',
  'gram',
  'liter',
  'ml',
  'preheat',
  'bake',
  'simmer',
  'boil',
  'fry',
  'mix',
  'stir',
  'whisk',
  'chop',
  'dice',
  'slice',
];

/**
 * Main detection function
 */
export function detectInputType(input: string): DetectionResult {
  const trimmedInput = input.trim();
  
  // Check if it's a URL
  if (isUrl(trimmedInput)) {
    return detectUrlType(trimmedInput);
  }
  
  // Check if it's an image URL or data URI
  if (isImageInput(trimmedInput)) {
    return {
      type: 'image',
      platform: 'unknown',
      confidence: 0.9,
      hints: ['Image detected. Will use OCR to extract recipe text.'],
      normalizedInput: trimmedInput,
    };
  }
  
  // Check if it's recipe text
  if (isRecipeText(trimmedInput)) {
    return {
      type: 'text',
      platform: 'unknown',
      confidence: 0.8,
      hints: ['Recipe text detected. Will parse ingredients and instructions.'],
      normalizedInput: trimmedInput,
    };
  }
  
  // Default to text with low confidence
  return {
    type: 'text',
    platform: 'unknown',
    confidence: 0.3,
    hints: ['Input type unclear. Attempting to parse as text.'],
    normalizedInput: trimmedInput,
  };
}

/**
 * Check if input is a valid URL
 */
function isUrl(input: string): boolean {
  try {
    const url = new URL(input);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    // Also check for URLs without protocol
    return /^(?:www\.)?[\w.-]+\.[\w]{2,}(?:\/.*)?$/i.test(input);
  }
}

/**
 * Detect URL type and platform
 */
function detectUrlType(url: string): DetectionResult {
  const normalizedUrl = normalizeUrl(url);
  
  // Check for video platforms
  for (const [platform, patterns] of Object.entries(PLATFORM_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(normalizedUrl)) {
        return {
          type: 'video',
          platform: platform as Platform,
          confidence: 0.95,
          hints: [`${platform} video detected. Will extract recipe from video content.`],
          normalizedInput: normalizedUrl,
        };
      }
    }
  }
  
  // Check for recipe websites
  for (const pattern of RECIPE_WEBSITE_PATTERNS) {
    if (pattern.test(normalizedUrl)) {
      return {
        type: 'url',
        platform: 'recipe_website',
        confidence: 0.9,
        hints: ['Recipe website detected. Will extract structured recipe data.'],
        normalizedInput: normalizedUrl,
      };
    }
  }
  
  // Check if URL points to an image
  if (isImageUrl(normalizedUrl)) {
    return {
      type: 'image',
      platform: 'unknown',
      confidence: 0.85,
      hints: ['Image URL detected. Will download and process with OCR.'],
      normalizedInput: normalizedUrl,
    };
  }
  
  // Default to generic website
  return {
    type: 'url',
    platform: 'generic_website',
    confidence: 0.6,
    hints: ['Generic website. Will attempt to extract recipe content.'],
    normalizedInput: normalizedUrl,
  };
}

/**
 * Normalize URL for consistent matching
 */
function normalizeUrl(url: string): string {
  let normalized = url.trim().toLowerCase();
  
  // Add protocol if missing
  if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
    normalized = 'https://' + normalized;
  }
  
  try {
    const urlObj = new URL(normalized);
    return urlObj.href;
  } catch {
    return normalized;
  }
}

/**
 * Check if input is an image (URL or data URI)
 */
function isImageInput(input: string): boolean {
  // Check for data URI
  if (input.startsWith('data:image/')) {
    return true;
  }
  
  // Check for image file extensions in URL
  return isImageUrl(input);
}

/**
 * Check if URL points to an image
 */
function isImageUrl(url: string): boolean {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
  const lowerUrl = url.toLowerCase();
  
  return imageExtensions.some(ext => lowerUrl.includes(ext));
}

/**
 * Check if input appears to be recipe text
 */
function isRecipeText(text: string): boolean {
  const lowerText = text.toLowerCase();
  
  // Count recipe keyword occurrences
  let keywordCount = 0;
  for (const keyword of RECIPE_KEYWORDS) {
    if (lowerText.includes(keyword)) {
      keywordCount++;
    }
  }
  
  // Check for common recipe structure patterns
  const hasIngredientSection = /ingredients?:?\s*\n/i.test(text);
  const hasInstructionSection = /(?:instructions?|directions?|method|steps?):?\s*\n/i.test(text);
  const hasMeasurements = /\d+\s*(?:cup|tbsp|tsp|oz|lb|g|kg|ml|l)/i.test(text);
  const hasNumberedSteps = /(?:^|\n)\s*\d+\.\s+/m.test(text);
  
  // Calculate confidence based on indicators
  const indicators = [
    keywordCount >= 3,
    hasIngredientSection,
    hasInstructionSection,
    hasMeasurements,
    hasNumberedSteps,
  ];
  
  const matchedIndicators = indicators.filter(Boolean).length;
  
  return matchedIndicators >= 2;
}

/**
 * Extract video ID from various platforms
 */
export function extractVideoId(url: string, platform: Platform): string | null {
  const patterns: Record<string, RegExp> = {
    youtube: /(?:v=|\/shorts\/|youtu\.be\/)([^&\s]+)/,
    tiktok: /(?:video\/|v\/)(\d+)/,
    instagram: /(?:p|reel|tv)\/([\w-]+)/,
  };
  
  const pattern = patterns[platform];
  if (!pattern) return null;
  
  const match = url.match(pattern);
  return match ? match[1] : null;
}

/**
 * Get platform-specific API endpoint or scraping strategy
 */
export function getPlatformStrategy(platform: Platform): {
  method: 'api' | 'scrape' | 'hybrid';
  endpoint?: string;
  requiresAuth: boolean;
} {
  const strategies = {
    youtube: {
      method: 'hybrid' as const,
      endpoint: 'https://www.googleapis.com/youtube/v3',
      requiresAuth: true,
    },
    tiktok: {
      method: 'scrape' as const,
      requiresAuth: false,
    },
    instagram: {
      method: 'scrape' as const,
      requiresAuth: false,
    },
    recipe_website: {
      method: 'scrape' as const,
      requiresAuth: false,
    },
    generic_website: {
      method: 'scrape' as const,
      requiresAuth: false,
    },
    unknown: {
      method: 'scrape' as const,
      requiresAuth: false,
    },
  };
  
  return strategies[platform] || strategies.unknown;
}

/**
 * Validate and provide improvement hints for input
 */
export function validateInput(input: string, type: InputType): {
  isValid: boolean;
  issues: string[];
  suggestions: string[];
} {
  const issues: string[] = [];
  const suggestions: string[] = [];
  
  if (!input || input.trim().length === 0) {
    issues.push('Input is empty');
    return { isValid: false, issues, suggestions };
  }
  
  switch (type) {
    case 'url':
    case 'video':
      if (!isUrl(input)) {
        issues.push('Invalid URL format');
        suggestions.push('Make sure to include http:// or https://');
      }
      break;
      
    case 'text':
      if (input.length < 50) {
        issues.push('Text seems too short for a recipe');
        suggestions.push('Include both ingredients and instructions');
      }
      if (!isRecipeText(input)) {
        suggestions.push('Try to include ingredient measurements and cooking steps');
      }
      break;
      
    case 'image':
      if (!isImageInput(input)) {
        issues.push('Input does not appear to be an image');
        suggestions.push('Provide an image URL or select from gallery');
      }
      break;
  }
  
  return {
    isValid: issues.length === 0,
    issues,
    suggestions,
  };
}
