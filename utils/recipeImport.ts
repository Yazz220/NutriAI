// Minimal client-side recipe import via scraping JSON-LD and Open Graph
// Note: For production, consider a server function to avoid CORS and site variability

export interface ImportedRecipe {
  name: string;
  description?: string;
  imageUrl?: string;
  ingredients: Array<{ name: string; quantity: number; unit: string; optional: boolean }>;
  steps: string[];
  tags: string[];
  prepTime?: number;
  cookTime?: number;
  servings?: number;
}

function parseISO8601DurationToMinutes(duration?: string): number | undefined {
  if (!duration) return undefined;
  // Simple PTxxM/PTxxHxxM parser
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return undefined;
  const hours = parseInt(match[1] || '0', 10);
  const mins = parseInt(match[2] || '0', 10);
  return hours * 60 + mins;
}

function normalizeIngredient(raw: string) {
  // Very naive parser: "1 cup rice" -> { quantity: 1, unit: 'cup', name: 'rice' }
  const parts = raw.trim().split(/\s+/);
  const quantity = parseFloat(parts[0]);
  if (!isNaN(quantity) && parts.length >= 3) {
    const unit = parts[1];
    const name = parts.slice(2).join(' ');
    return { name, quantity, unit, optional: false };
  }
  return { name: raw.trim(), quantity: 1, unit: 'pcs', optional: false };
}

export async function importRecipeFromUrl(url: string): Promise<ImportedRecipe> {
  const res = await fetch(url);
  const html = await res.text();

  const doc = new DOMParser().parseFromString(html, 'text/html');

  // Try JSON-LD @type Recipe
  const ldScripts = Array.from(doc.querySelectorAll('script[type="application/ld+json"]'));
  for (const script of ldScripts) {
    try {
      const json = JSON.parse(script.textContent || '{}');
      const candidates = Array.isArray(json) ? json : [json];
      const recipeJson = candidates.find((j) => j['@type'] === 'Recipe' || (Array.isArray(j['@type']) && j['@type'].includes('Recipe')));
      if (recipeJson) {
        const ingredientsList: string[] = recipeJson.recipeIngredient || [];
        const instructions = (recipeJson.recipeInstructions || []).map((step: any) =>
          typeof step === 'string' ? step : step.text
        );
        return {
          name: recipeJson.name || 'Imported Recipe',
          description: recipeJson.description,
          imageUrl: (Array.isArray(recipeJson.image) ? recipeJson.image[0] : recipeJson.image) || undefined,
          ingredients: ingredientsList.map(normalizeIngredient),
          steps: instructions.filter(Boolean),
          tags: (recipeJson.keywords ? String(recipeJson.keywords).split(',').map((s: string) => s.trim()) : []),
          prepTime: parseISO8601DurationToMinutes(recipeJson.prepTime),
          cookTime: parseISO8601DurationToMinutes(recipeJson.cookTime),
          servings: recipeJson.recipeYield ? parseInt(String(recipeJson.recipeYield).replace(/\D/g, '') || '0', 10) : undefined,
        };
      }
    } catch {}
  }

  // Fallback: Open Graph
  const title = doc.querySelector('meta[property="og:title"]')?.getAttribute('content') || doc.title || 'Imported Recipe';
  const description = doc.querySelector('meta[property="og:description"]')?.getAttribute('content') || undefined;
  const image = doc.querySelector('meta[property="og:image"]')?.getAttribute('content') || undefined;

  return {
    name: title,
    description,
    imageUrl: image,
    ingredients: [],
    steps: [],
    tags: [],
  };
}


