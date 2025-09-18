// Removed TheMealDB provider. This module is intentionally empty to avoid accidental usage.
// Any imports from this path should be removed. If imported, throw to signal misuse.
export const __MEALDB_REMOVED__ = true;
export function unused() {
  throw new Error('TheMealDB provider has been removed. Do not import from utils/providers/mealdb');
}
