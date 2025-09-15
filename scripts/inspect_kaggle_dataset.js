/*
Simple dataset inspector for recipe datasets (CSV / JSON / JSONL).
Usage:
  1) Download and unzip the Kaggle dataset into a folder, e.g. data/kaggle/healthy-diet-recipes
     (see README below for Kaggle CLI command)
  2) Run: node scripts/inspect_kaggle_dataset.js data/kaggle/healthy-diet-recipes

The script will:
  - List files in the dataset folder
  - For CSV files: print headers + first row
  - For JSON/JSONL files: print keys of first object + sample
  - Heuristically check presence of fields needed for `CanonicalRecipe`
  - Produce a suggested mapping from dataset fields to CanonicalRecipe

Notes:
  - This is a quick heuristic tool to help evaluate compatibility. It does not attempt
    robust CSV parsing for complex quoted fields; for more robust analysis, install a CSV
    parser (csv-parse) or open the files in Python/pandas.
*/

const fs = require('fs');
const path = require('path');

function readText(filePath, n = 64 * 1024) {
  return fs.readFileSync(filePath, 'utf8');
}

function sampleCsv(filePath) {
  const txt = readText(filePath);
  const lines = txt.split(/\r?\n/).filter(Boolean);
  if (!lines.length) return { headers: [], firstRow: null };
  const headerLine = lines[0];
  // naive CSV split (won't be perfect for quoted commas)
  const headers = headerLine.split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const firstRow = lines.length > 1 ? lines[1].split(',').map(c => c.trim()) : null;
  return { headers, firstRow, sampleLines: lines.slice(0, Math.min(10, lines.length)) };
}

function sampleJson(filePath) {
  const txt = readText(filePath);
  // try parse as array
  try {
    const v = JSON.parse(txt);
    if (Array.isArray(v) && v.length > 0) {
      return { type: 'array', keys: Object.keys(v[0] || {}), sample: v[0] };
    }
    if (typeof v === 'object' && v !== null) {
      return { type: 'object', keys: Object.keys(v), sample: v };
    }
  } catch (e) {
    // try jsonl: first non-empty line
    const lines = txt.split(/\r?\n/).filter(Boolean);
    if (lines.length > 0) {
      try {
        const first = JSON.parse(lines[0]);
        return { type: 'jsonl', keys: Object.keys(first), sample: first };
      } catch (ee) {
        return { type: 'unknown', keys: [], sample: null };
      }
    }
  }
  return { type: 'unknown', keys: [], sample: null };
}

function detectFields(keys) {
  const kset = new Set(keys.map(k => k.toLowerCase()));
  const has = name => [...kset].some(k => k.includes(name));

  return {
    hasTitle: has('title') || has('name') || has('recipe'),
    hasIngredients: has('ingredient'),
    hasInstructions: has('instruction') || has('step') || has('method') || has('direction'),
    hasServings: has('serving') || has('yield'),
    hasPrepOrCookTime: has('prep') || has('cook') || has('ready') || has('totaltime') || has('time'),
    hasNutrition: has('calorie') || has('protein') || has('fat') || has('carb') || has('nutrition'),
    hasImage: has('image') || has('photo') || has('image_url'),
    hasSourceUrl: has('source') || has('url') || has('sourceurl') || has('originalurl'),
  };
}

function suggestMapping(keys) {
  const lower = key => keys.find(k => k.toLowerCase().includes(key));
  const mapping = {
    id: lower('id') || null,
    title: lower('title') || lower('name') || null,
    image: lower('image') || lower('photo') || null,
    description: lower('summary') || lower('description') || null,
    servings: lower('serving') || lower('yield') || null,
    prepTimeMinutes: lower('prep') || lower('preptime') || null,
    cookTimeMinutes: lower('cook') || lower('cooktime') || null,
    totalTimeMinutes: lower('ready') || lower('total') || null,
    ingredients: lower('ingredient') || lower('ingredients') || null,
    steps: lower('instruction') || lower('instructions') || lower('steps') || null,
    nutrition: lower('nutrition') || lower('calorie') || lower('calories') || null,
    sourceUrl: lower('source') || lower('url') || null,
    tags: lower('diet') || lower('cuisine') || lower('tags') || null,
  };
  return mapping;
}

function printReportForFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  console.log('\n--- File:', path.basename(filePath), '---');
  try {
    if (ext === '.csv' || ext === '.tsv') {
      const { headers, firstRow } = sampleCsv(filePath);
      console.log('Type: CSV');
      console.log('Columns:', headers.join(', '));
      console.log('Sample row:', firstRow);
      const fields = detectFields(headers);
      console.log('Detected fields presence:', fields);
      console.log('Suggested mapping:', suggestMapping(headers));
    } else if (ext === '.json' || ext === '.jsonl' || ext === '.ndjson') {
      const { type, keys, sample } = sampleJson(filePath);
      console.log('Type:', type === 'array' ? 'JSON Array' : type === 'jsonl' ? 'JSON Lines' : 'JSON/Object');
      console.log('Keys:', keys.join(', '));
      console.log('Sample object:', sample ? JSON.stringify(sample, null, 2) : null);
      const fields = detectFields(keys);
      console.log('Detected fields presence:', fields);
      console.log('Suggested mapping:', suggestMapping(keys));
    } else if (ext === '.txt' || ext === '.md') {
      const txt = readText(filePath, 8 * 1024);
      console.log('Type: Text/Markdown; first 4KB:\n');
      console.log(txt.slice(0, 4096));
    } else {
      console.log('Unknown file type; showing first 4KB:');
      const txt = readText(filePath, 8 * 1024);
      console.log(txt.slice(0, 4096));
    }
  } catch (e) {
    console.error('Error reading file:', e.message);
  }
}

function summarizeDataset(dir) {
  console.log('Inspecting dataset directory:', dir);
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    console.error('Directory not found or not a directory:', dir);
    process.exit(1);
  }
  const files = fs.readdirSync(dir).map(f => path.join(dir, f));
  if (!files.length) {
    console.log('No files found in dataset directory.');
    return;
  }
  // Focus on likely data files
  const dataFiles = files.filter(f => {
    const ext = path.extname(f).toLowerCase();
    return ['.csv', '.json', '.jsonl', '.ndjson', '.txt', '.md'].includes(ext);
  });

  console.log('Found files:', dataFiles.map(f => path.basename(f)).join(', '));

  for (const f of dataFiles) {
    printReportForFile(f);
  }

  // Aggregate heuristics across first data file
  if (dataFiles.length > 0) {
    const f = dataFiles[0];
    const ext = path.extname(f).toLowerCase();
    let keys = [];
    if (ext === '.csv' || ext === '.tsv') {
      const { headers } = sampleCsv(f);
      keys = headers;
    } else {
      const { keys: k } = sampleJson(f);
      keys = k;
    }
    const fields = detectFields(keys);
    console.log('\nOverall heuristics (based on first file):', fields);
    console.log('\nCompatibility guidance:');
    if (!fields.hasIngredients) console.log('- Missing explicit ingredient field: you will need to parse raw text into ingredient lines.');
    if (!fields.hasInstructions) console.log('- Missing instructions/steps: steps may be embedded in a single text field and need splitting.');
    if (!fields.hasNutrition) console.log('- Missing nutrition data: you will need to compute nutrition (USDA) or call an analysis API.');
    if (!fields.hasImage) console.log('- Missing image field: images may not be included.');
    if (fields.hasIngredients && fields.hasInstructions) console.log('- Basic recipe structure present: ingredients+instructions -> good for mapping to CanonicalRecipe.');
    if (fields.hasNutrition) console.log('- Nutrition present -> maps directly to `nutritionPerServing`.');
    console.log('\nSuggested next steps:');
    console.log('1) If field names are present, run a small mapping test: implement a map function to transform sample rows into CanonicalRecipe.');
    console.log('2) If ingredients are raw strings, use or adapt your parser to produce `CanonicalIngredient` (amount/unit/name).');
    console.log('3) If nutrition missing, consider using USDA FDC + approximate matching or an external nutrition analysis API.');
    console.log('4) Consider adding a pre-processing step to normalize units and ingredient names (for inventory linking).');
  }
}

if (require.main === module) {
  const dir = process.argv[2];
  if (!dir) {
    console.error('Usage: node scripts/inspect_kaggle_dataset.js <dataset-directory>');
    process.exit(1);
  }
  summarizeDataset(dir);
}
