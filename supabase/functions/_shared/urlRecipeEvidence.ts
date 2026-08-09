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

export function extractRecipeJsonLd(html: string): string | null {
  JSON_LD_SCRIPT_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = JSON_LD_SCRIPT_PATTERN.exec(html)) !== null) {
    const raw = match[1]?.trim();
    if (!raw) continue;
    try {
      const recipe = findRecipeNode(JSON.parse(raw));
      if (recipe) return JSON.stringify(recipe);
    } catch {
      // Ignore malformed structured data and continue to the next block.
    }
  }
  return null;
}

export function htmlToRecipePageText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, '\n')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function buildUrlRecipePrompt(url: string, html: string): { pageText: string; prompt: string } {
  const pageText = htmlToRecipePageText(html);
  const recipeJsonLd = extractRecipeJsonLd(html);
  const evidence = recipeJsonLd
    ? `Recipe JSON-LD (primary evidence):\n${recipeJsonLd}\n\nVisible page text (secondary evidence):\n${pageText}`
    : `Visible page text:\n${pageText}`;

  return { pageText, prompt: `Source URL: ${url}\n\n${evidence}` };
}
