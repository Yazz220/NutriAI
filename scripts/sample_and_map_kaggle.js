/*
Sample and map Kaggle recipe dataset rows to CanonicalRecipe shape.
Usage:
  node scripts/sample_and_map_kaggle.js <dataset-dir> [sampleSize]

Example:
  node scripts/sample_and_map_kaggle.js data/kaggle/healthy-diet-recipes 100

The script will:
  - Find the first CSV or JSON data file in the dataset directory
  - Read up to sampleSize recipes, map fields heuristically to CanonicalRecipe
  - Write mapped recipes to data/kaggle/healthy-diet-recipes/sample_mapped_recipes.json

Notes:
  - This is a best-effort mapper. It does not perform ingredient amount/unit parsing.
  - For production you should replace heuristic mapping with a robust parser and nutrition enrichment.
*/

const fs = require('fs');
const path = require('path');

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function parseCsvRows(filePath) {
  const txt = readText(filePath);
  const lines = txt.split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = parseCsvLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    if (cols.length === 0) continue;
    const obj = {};
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = cols[j] !== undefined ? cols[j] : '';
    }
    rows.push(obj);
  }
  return { headers, rows };
}

// Parse a CSV line (handles quoted fields)
function parseCsvLine(line) {
  const result = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; continue; }
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === ',' && !inQuotes) {
      result.push(cur);
      cur = '';
      continue;
    }
    cur += ch;
  }
  result.push(cur);
  return result.map(s => s.trim());
}

function sampleJsonArray(filePath) {
  const txt = readText(filePath);
  try {
    const v = JSON.parse(txt);
    if (!Array.isArray(v)) return { rows: [], keys: [] };
    const keys = Object.keys(v[0] || {});
    return { rows: v, keys };
  } catch (e) {
    // try jsonl
    const lines = txt.split(/\r?\n/).filter(Boolean);
    const rows = lines.map(l => {
      try { return JSON.parse(l); } catch (e) { return null; }
    }).filter(Boolean);
    const keys = rows.length ? Object.keys(rows[0]) : [];
    return { rows, keys };
  }
}

function lowerKeyMatch(keys, needle) {
  const found = keys.find(k => k.toLowerCase().includes(needle));
  return found || null;
}

function parseNumberFromString(s) {
  if (s === null || s === undefined) return undefined;
  const m = ('' + s).match(/\d+/);
  if (!m) return undefined;
  return parseInt(m[0], 10);
}

function parseMinutes(s) {
  if (!s) return undefined;
  s = ('' + s).toLowerCase();
  // patterns: '1 hr 20 mins', '45 mins', 'PT30M', '30'
  const hrMatch = s.match(/(\d+)\s*hr/);
  const minMatch = s.match(/(\d+)\s*min/);
  let mins = 0;
  if (hrMatch) mins += parseInt(hrMatch[1], 10) * 60;
  if (minMatch) mins += parseInt(minMatch[1], 10);
  if (!hrMatch && !minMatch) {
    const num = parseNumberFromString(s);
    if (num) mins = num;
  }
  return mins || undefined;
}

function splitIngredientsField(v) {
  if (!v) return [];
  // try JSON array
  if (v.trim().startsWith('[')) {
    try { const arr = JSON.parse(v); if (Array.isArray(arr)) return arr.map(x => (''+x).trim()).filter(Boolean); } catch (e) {}
  }
  // split by newline or ; or | or '||'
  const parts = v.split(/\r?\n|;|\|\||\|/).map(p => p.trim()).filter(Boolean);
  if (parts.length > 1) return parts;
  // try comma-split but be careful
  if (v.indexOf(',') !== -1 && v.split(',').length <= 8) {
    return v.split(',').map(p => p.trim()).filter(Boolean);
  }
  return [v.trim()];
}

function splitStepsField(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v.map(s => (''+s).trim()).filter(Boolean);
  // if JSON array string
  if (typeof v === 'string' && v.trim().startsWith('[')) {
    try { const arr = JSON.parse(v); if (Array.isArray(arr)) return arr.map(s => (''+s).trim()).filter(Boolean); } catch (e) {}
  }
  // split on newlines or numbered steps
  const byNewline = v.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  if (byNewline.length > 1) return byNewline;
  // split by sentences if it's a long paragraph
  const sentences = v.split(/(?<=[\.\?\!])\s+/).map(s => s.trim()).filter(Boolean);
  if (sentences.length > 1) return sentences;
  return [v.trim()];
}

function mapRowToCanonical(row, keys, idx) {
  const lowerKeys = keys.map(k => k.toLowerCase());
  const get = name => {
    const k = lowerKeyMatch(keys, name);
    return k ? row[k] : undefined;
  };

  const idField = lowerKeyMatch(keys, 'id') || lowerKeyMatch(keys, 'recipeid') || null;
  const rawId = idField ? (row[idField] || '') : '';
  const providerId = rawId || String(idx + 1);

  const title = get('title') || get('name') || `Recipe ${providerId}`;
  const image = get('image') || get('photo') || null;
  const description = get('summary') || get('description') || null;
  const servingsRaw = get('serving') || get('yield') || get('servings');
  const servings = parseNumberFromString(servingsRaw) || undefined;
  const prep = parseMinutes(get('prep') || get('preptime'));
  const cook = parseMinutes(get('cook') || get('cooktime'));
  const total = parseMinutes(get('total') || get('ready') || get('totaltime')) || (prep || 0) + (cook || 0) || undefined;

  const ingredientsRaw = get('ingredient') || get('ingredients') || '';
  const ingredientsList = splitIngredientsField(ingredientsRaw);
  const ingredients = ingredientsList.map(i => ({ name: i, original: i }));

  const instructionsRaw = get('instruction') || get('instructions') || get('direction') || get('steps') || '';
  const steps = splitStepsField(instructionsRaw);

  // nutrition heuristics
  const calories = parseNumberFromString(get('calories') || get('calorie'));
  const protein = parseNumberFromString(get('protein'));
  const carbs = parseNumberFromString(get('carbs') || get('carbohydrate'));
  const fats = parseNumberFromString(get('fat') || get('fats'));

  const nutrition = (calories || protein || carbs || fats) ? { calories, protein, carbs, fats } : undefined;

  const tagsRaw = get('tags') || get('cuisine') || get('diet') || '';
  const tags = tagsRaw ? (''+tagsRaw).split(/[,;|]/).map(t => t.trim()).filter(Boolean) : [];

  const sourceUrl = get('source') || get('source_url') || get('url') || null;

  const canonical = {
    id: `kaggle:${providerId}`,
    title: title || `Recipe ${providerId}`,
    image: image || undefined,
    description: description || undefined,
    servings: servings,
    prepTimeMinutes: prep,
    cookTimeMinutes: cook,
    totalTimeMinutes: total,
    ingredients: ingredients,
    steps: steps,
    nutritionPerServing: nutrition,
    source: { providerType: 'unknown', providerId },
    sourceUrl: sourceUrl || undefined,
    tags: tags.length ? tags : undefined,
  };

  return canonical;
}

function writeOutput(outputPath, arr) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(arr, null, 2), 'utf8');
}

function findDataFile(dir) {
  const files = fs.readdirSync(dir).map(f => path.join(dir, f));
  // prefer csv/json
  const priority = ['.csv', '.json', '.jsonl', '.ndjson'];
  for (const ext of priority) {
    const found = files.find(f => path.extname(f).toLowerCase() === ext);
    if (found) return found;
  }
  return null;
}

if (require.main === module) {
  const dir = process.argv[2];
  const sampleSize = parseInt(process.argv[3] || '100', 10);
  if (!dir) { console.error('Usage: node scripts/sample_and_map_kaggle.js <dataset-dir> [sampleSize]'); process.exit(1); }
  if (!fs.existsSync(dir)) { console.error('Dataset dir not found:', dir); process.exit(1); }
  const dataFile = findDataFile(dir);
  if (!dataFile) { console.error('No CSV/JSON data file found in dataset dir. Files present:', fs.readdirSync(dir)); process.exit(1); }
  console.log('Using data file:', dataFile);

  const ext = path.extname(dataFile).toLowerCase();
  let rows = [];
  let keys = [];
  if (ext === '.csv') {
    const parsed = parseCsvRows(dataFile);
    rows = parsed.rows;
    keys = parsed.headers;
  } else {
    const parsed = sampleJsonArray(dataFile);
    rows = parsed.rows;
    keys = parsed.keys;
  }
  console.log('Total rows in file:', rows.length);

  const mapped = [];
  for (let i = 0; i < Math.min(sampleSize, rows.length); i++) {
    const row = rows[i];
    mapped.push(mapRowToCanonical(row, keys, i));
  }

  const outPath = path.join(dir, 'sample_mapped_recipes.json');
  writeOutput(outPath, mapped);
  console.log('Wrote', mapped.length, 'mapped recipes to', outPath);
}
