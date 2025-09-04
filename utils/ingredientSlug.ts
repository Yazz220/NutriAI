// Canonical ingredient slug utilities
// Examples: "Yellow Onion" -> "onion-yellow"; "Scallion" -> "onion-green"

export const SYNONYMS: Record<string, string> = {
  // Onions
  scallion: 'onion-green',
  "green onion": 'onion-green',
  chives: 'onion-chives',
  shallot: 'onion-shallot',
  onion: 'onion-yellow',
  "yellow onion": 'onion-yellow',
  "red onion": 'onion-red',
  // Herbs
  basil: 'basil',
  parsley: 'parsley',
  cilantro: 'cilantro',
  coriander: 'cilantro',
  // Basics
  tomato: 'tomato',
  potato: 'potato',
  garlic: 'garlic',
  ginger: 'ginger',
  carrot: 'carrot',
  celery: 'celery',
  banana: 'banana',
};

export function slugifyIngredient(name: string, variant?: string): string {
  const base = (name || '').trim().toLowerCase()
  const v = (variant || '').trim().toLowerCase()
  const key = [base, v].filter(Boolean).join(' ')

  if (SYNONYMS[key]) return SYNONYMS[key]
  if (SYNONYMS[base]) return withVariant(SYNONYMS[base], v)

  // Generic normalization: words -> hyphen
  const norm = key || base
  return norm
    .replace(/[^a-z0-9\\s-]/g, '')
    .replace(/\\s+/g, '-')
}

function withVariant(baseSlug: string, v: string): string {
  if (!v) return baseSlug
  const root = baseSlug.split('-')[0]
  return `${root}-${v}`
}

export function ingredientDisplayFromSlug(slug: string): string {
  return slug
    .replace(/-/g, ' ')
    .replace(/\\b\\w/g, (c) => c.toUpperCase())
}
