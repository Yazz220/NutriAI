/**
 * Detects the type of content the user sent in chat and routes to the
 * correct import pipeline.
 */

export type ContentType = 'video_url' | 'recipe_url' | 'image' | 'text';

const VIDEO_PATTERNS = [
  /(?:youtube\.com\/(?:watch|shorts)|youtu\.be\/)/i,
  /tiktok\.com\//i,
  /instagram\.com\/(?:reel|p)\//i,
  /facebook\.com\/.*\/videos\//i,
];

const URL_PATTERN = /https?:\/\/[^\s]+/i;

/**
 * Determine what kind of content the user submitted.
 */
export function detectContentType(text: string, hasImage: boolean): ContentType {
  if (hasImage) return 'image';

  const trimmed = text.trim();

  // Check for video URLs first (more specific than generic URL)
  for (const pattern of VIDEO_PATTERNS) {
    if (pattern.test(trimmed)) return 'video_url';
  }

  // Check for any URL
  if (URL_PATTERN.test(trimmed)) return 'recipe_url';

  // Everything else is text
  return 'text';
}

/**
 * Extract the first URL from a string.
 */
export function extractUrl(text: string): string | null {
  const match = text.match(/https?:\/\/[^\s]+/i);
  return match ? match[0] : null;
}

/**
 * Check if text looks like it might contain recipe content.
 */
export function looksLikeRecipe(text: string): boolean {
  const lower = text.toLowerCase();
  const recipeSignals = [
    /\d+\s*(cup|tbsp|tsp|oz|lb|g|ml|tablespoon|teaspoon)/i,
    /ingredient/i,
    /step\s*\d/i,
    /preheat|sauté|simmer|bake|fry|chop|dice|mix|stir|fold/i,
    /serves?\s*\d/i,
    /prep\s*time|cook\s*time/i,
  ];
  const matches = recipeSignals.filter(r => r.test(lower));
  return matches.length >= 2;
}
