const JSON_LD_SCRIPT_PATTERN =
  /<script\b[^>]*type\s*=\s*(?:"application\/ld\+json"|'application\/ld\+json'|application\/ld\+json)[^>]*>([\s\S]*?)<\/script>/gi;

function hasRecipeType(value: unknown): boolean {
  const types = Array.isArray(value) ? value : [value];
  return types.some((type) => typeof type === 'string' && type.toLowerCase() === 'recipe');
}

function findRecipeNode(value: unknown): Record<string, unknown> | null {
  if (Array.isArray(value)) {
    for (const item of value) {
      const recipe = findRecipeNode(item);
      if (recipe) return recipe;
    }
    return null;
  }

  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  if (hasRecipeType(record['@type'])) return record;
  return findRecipeNode(record['@graph']);
}

export function extractRecipeJsonLdObject(html: string): Record<string, unknown> | null {
  JSON_LD_SCRIPT_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = JSON_LD_SCRIPT_PATTERN.exec(html)) !== null) {
    const raw = match[1]?.trim();
    if (!raw) continue;
    try {
      const recipe = findRecipeNode(JSON.parse(raw));
      if (recipe) return recipe;
    } catch {
      // Ignore malformed structured data and continue to the next block.
    }
  }
  return null;
}

export function extractRecipeJsonLd(html: string): string | null {
  const recipe = extractRecipeJsonLdObject(html);
  return recipe ? JSON.stringify(recipe) : null;
}

export function htmlToRecipePageText(html: string): string {
  return html
    // Strip scripts and styles (existing defense)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    // Strip HTML comments — common injection vector for hidden instructions
    .replace(/<!--[\s\S]*?-->/g, ' ')
    // Strip hidden elements: display:none, visibility:hidden, zero font-size
    .replace(/<[^>]*style\s*=\s*"[^"]*display\s*:\s*none[^"]*"[^>]*>[\s\S]*?<\/[^>]+>/gi, ' ')
    .replace(/<[^>]*style\s*=\s*"[^"]*visibility\s*:\s*hidden[^"]*"[^>]*>[\s\S]*?<\/[^>]+>/gi, ' ')
    .replace(/<[^>]*style\s*=\s*"[^"]*font-size\s*:\s*0[^"]*"[^>]*>[\s\S]*?<\/[^>]+>/gi, ' ')
    // Strip remaining tags
    .replace(/<[^>]+>/g, '\n')
    // Decode common HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    // Remove zero-width characters — invisible injection vector
    .replace(/[\u200B\u200C\u200D\uFEFF]/g, '')
    // Collapse excessive whitespace
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Wrap untrusted web content in explicit delimiters so the model can
 * distinguish our instructions from the scraped data. This is the
 * "spotlighting" defense technique (OWASP LLM01:2025).
 */
const UNTRUSTED_CONTENT_PREFIX = `<UNTRUSTED_WEB_CONTENT>`;
const UNTRUSTED_CONTENT_SUFFIX = `</UNTRUSTED_WEB_CONTENT>`;

export function buildUrlRecipePrompt(url: string, html: string): {
  pageText: string;
  prompt: string;
  recipeJsonLd: Record<string, unknown> | null;
} {
  const pageText = htmlToRecipePageText(html);
  const recipeJsonLdObject = extractRecipeJsonLdObject(html);
  const recipeJsonLd = recipeJsonLdObject ? JSON.stringify(recipeJsonLdObject) : null;

  const evidence = recipeJsonLd
    ? `Recipe JSON-LD (primary evidence):\n${UNTRUSTED_CONTENT_PREFIX}\n${recipeJsonLd}\n${UNTRUSTED_CONTENT_SUFFIX}\n\nVisible page text (secondary evidence):\n${UNTRUSTED_CONTENT_PREFIX}\n${pageText}\n${UNTRUSTED_CONTENT_SUFFIX}`
    : `Visible page text:\n${UNTRUSTED_CONTENT_PREFIX}\n${pageText}\n${UNTRUSTED_CONTENT_SUFFIX}`;

  return {
    pageText,
    prompt: `Source URL: ${url}\n\n${evidence}`,
    recipeJsonLd: recipeJsonLdObject,
  };
}
