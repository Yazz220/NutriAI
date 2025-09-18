// DEPRECATED: TheMealDB tooling has been removed in favor of FatSecret.
// This script remains only for historical reference and should not be used.
// If executed, it will exit immediately.
console.warn('[DEPRECATED] scripts/count_themealdb_meals.js is no longer supported. Exiting.');
process.exit(1);

// Quick script to count unique meals in TheMealDB by iterating letters A-Z
// Usage (no longer supported): node scripts/count_themealdb_meals.js

const fetch = require('node-fetch');

async function fetchMealsByLetter(letter) {
  const url = `https://www.themealdb.com/api/json/v1/1/search.php?f=${letter}`;
  try {
    const res = await fetch(url, { timeout: 10000 });
    if (!res.ok) return [];
    const json = await res.json();
    return json.meals || [];
  } catch (e) {
    console.error(`Failed to fetch ${letter}:`, e.message || e);
    return [];
  }
}

(async () => {
  const ids = new Set();
  const all = [];
  const letters = 'abcdefghijklmnopqrstuvwxyz'.split('');
  for (const l of letters) {
    const meals = await fetchMealsByLetter(l);
    for (const m of meals) {
      if (m && m.idMeal) {
        ids.add(String(m.idMeal));
        all.push(m);
      }
    }
  }

  console.log(`Unique meal IDs found: ${ids.size}`);
  console.log(`Total meal objects fetched: ${all.length}`);
  // Optionally list counts by first-letter
  const byLetter = {};
  for (const m of all) {
    const ch = (m.strMeal || '').trim().charAt(0).toLowerCase() || '?';
    byLetter[ch] = (byLetter[ch] || 0) + 1;
  }
  console.log('Counts by starting letter:', byLetter);
})();
