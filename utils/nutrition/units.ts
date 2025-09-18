// Unit parsing and conversion helpers

export const WEIGHT_UNITS: Record<string, number> = {
  g: 1,
  gram: 1,
  grams: 1,
  kg: 1000,
  kilogram: 1000,
  kilograms: 1000,
  lb: 453.592,
  lbs: 453.592,
  pound: 453.592,
  pounds: 453.592,
  oz: 28.3495,
  ounce: 28.3495,
  ounces: 28.3495,
};

export const VOLUME_UNITS: Record<string, number> = {
  ml: 1,
  milliliter: 1,
  milliliters: 1,
  l: 1000,
  liter: 1000,
  liters: 1000,
  cup: 236.588,
  cups: 236.588,
  tbsp: 14.7868,
  tablespoon: 14.7868,
  tablespoons: 14.7868,
  tsp: 4.92892,
  teaspoon: 4.92892,
  teaspoons: 4.92892,
  'fl oz': 29.5735,
};

export const COUNT_UNITS = new Set([
  'pcs', 'pc', 'piece', 'pieces', 'unit', 'units',
  'clove', 'cloves', 'slice', 'slices', 'egg', 'eggs',
  // Common packaged/countable units
  'can', 'cans', 'tin', 'tins', 'jar', 'jars', 'carton', 'cartons',
  'packet', 'packets', 'pack', 'packs', 'pouch', 'pouches', 'pocket', 'pockets'
]);

export function parseQuantityUnit(measureRaw?: string): { amount: number; unit: string } {
  if (!measureRaw) return { amount: 0, unit: '' };
  const measure = String(measureRaw).trim();
  if (!measure) return { amount: 0, unit: '' };

  const mixedFraction = measure.match(/^(\d+)\s+(\d+)\/(\d+)(.*)$/);
  if (mixedFraction) {
    const whole = parseFloat(mixedFraction[1]);
    const num = parseFloat(mixedFraction[2]);
    const den = parseFloat(mixedFraction[3]) || 1;
    const rest = mixedFraction[4].trim();
    const amount = whole + (num / den);
    return { amount, unit: rest.trim() };
  }

  const simpleFraction = measure.match(/^(\d+)\/(\d+)(.*)$/);
  if (simpleFraction) {
    const num = parseFloat(simpleFraction[1]);
    const den = parseFloat(simpleFraction[2]) || 1;
    const rest = simpleFraction[3].trim();
    return { amount: num / den, unit: rest.trim() };
  }

  const numberFirst = measure.match(/^(\d+(?:\.\d+)?)(.*)$/);
  if (numberFirst) {
    const amount = parseFloat(numberFirst[1]);
    const rest = numberFirst[2].trim();
    return { amount: isNaN(amount) ? 0 : amount, unit: rest };
  }
  return { amount: 0, unit: measure };
}

// Approx densities g/ml for some ingredients; fallback to 1 for water-like
export const DENSITY_G_PER_ML: Record<string, number> = {
  'water': 1.0,
  'milk': 1.03,
  'olive oil': 0.91,
  'butter': 0.911,
  'flour': 0.53,
  'sugar': 0.85,
  'rice': 0.85,
  'pasta': 0.7,
};

// Typical weights for count-based units
export const COUNT_WEIGHTS_G: Record<string, number> = {
  'egg': 50,
  'eggs': 50,
  'clove': 3,
  'cloves': 3,
  'slice': 25,
  'slices': 25,
  'onion': 110,
  'tomato': 120,
};
