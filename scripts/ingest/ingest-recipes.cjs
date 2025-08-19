/*
 Ingest Kaggle "Food Ingredients and Recipe Dataset with Images" into Supabase (CommonJS runtime).
 - Reads CSV with columns: Title, Ingredients, Instructions, Image_Name, Cleaned_Ingredients
 - NO_UPLOAD=true: assumes images already exist in Supabase Storage and only maps public URLs
 - Upserts rows into public.recipes with source identifiers for idempotency

 Usage (Windows PowerShell):
   $env:DOTENV_CONFIG_PATH="scripts/ingest/.env"
   node scripts/ingest/ingest-recipes.cjs
*/

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { parse } = require('fast-csv');
const { createClient } = require('@supabase/supabase-js');

// Load env
const dotenvPath = process.env.DOTENV_CONFIG_PATH || path.join('scripts', 'ingest', '.env');
dotenv.config({ path: dotenvPath });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = process.env.BUCKET || 'recipe-images';
const CSV_PATH = process.env.CSV_PATH;
const IMAGES_DIR = process.env.IMAGES_DIR;
const NO_UPLOAD = String(process.env.NO_UPLOAD || 'false').toLowerCase() === 'true';
const IMAGE_PREFIX = process.env.IMAGE_PREFIX || '';
const SOURCE = process.env.SOURCE || 'kaggle_food_images';
const VERSION = Number(process.env.VERSION || 1);
const PROVIDER = process.env.PROVIDER || 'dataset';

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('[Ingest] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
if (!CSV_PATH) {
  console.error('[Ingest] Please set CSV_PATH in env');
  process.exit(1);
}
if (!NO_UPLOAD && !IMAGES_DIR) {
  console.error('[Ingest] NO_UPLOAD is false, so IMAGES_DIR is required');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function sleep(ms) { return new Promise(res => setTimeout(res, ms)); }

function parseCleaned(ci) {
  if (!ci) return [];
  try {
    const maybe = JSON.parse(ci);
    if (Array.isArray(maybe)) return maybe.map(x => String(x).trim()).filter(Boolean);
  } catch {}
  return ci
    .replace(/[\[\]\"\']/g, ' ')
    .split(/[,;\n]/g)
    .map(s => s.trim())
    .filter(Boolean);
}

async function ensurePublicUrl(objectPath) {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(objectPath);
  return data.publicUrl;
}

async function uploadImage(localPath, objectPath) {
  const file = await fs.promises.readFile(localPath);
  const ext = path.extname(localPath).toLowerCase();
  const contentType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
  const { error: upErr } = await supabase.storage.from(BUCKET).upload(objectPath, file, {
    contentType,
    upsert: true,
  });
  if (upErr) throw upErr;
  return ensurePublicUrl(objectPath);
}

async function upsertRecipe(payload) {
  const { error } = await supabase
    .from('recipes')
    // Match the unique constraint shown in DB: UNIQUE (provider, external_id)
    .upsert(payload, { onConflict: 'provider,external_id' });
  if (error) throw error;
}

async function main() {
  console.log('[Ingest] Start');
  console.log(`[Ingest] Using bucket: ${BUCKET}`);

  const rows = [];
  await new Promise((resolve, reject) => {
    fs.createReadStream(CSV_PATH)
      .pipe(parse({ headers: true, ignoreEmpty: true, trim: true }))
      .on('error', reject)
      .on('data', (row) => rows.push(row))
      .on('end', resolve);
  });

  console.log(`[Ingest] CSV rows: ${rows.length}`);

  let processed = 0;
  const concurrency = 5;
  const queue = rows.map((row, idx) => ({ row, idx }));

  async function worker(id) {
    while (queue.length) {
      const item = queue.shift();
      if (!item) break;
      const { row, idx } = item;
      try {
        const baseName = (row.Image_Name || '').trim();
        const imageKey = NO_UPLOAD
          ? path.posix.join(IMAGE_PREFIX.replace(/\\/g, '/'), baseName)
          : `${SOURCE}/v${VERSION}/${idx}-${path.parse(baseName).name}${path.extname(baseName) || '.jpg'}`;

        let publicUrl = '';
        if (NO_UPLOAD) {
          publicUrl = await ensurePublicUrl(imageKey);
        } else {
          const imageLocal = path.join(IMAGES_DIR, baseName);
          try {
            publicUrl = await uploadImage(imageLocal, imageKey);
          } catch (e) {
            console.warn(`[Ingest] Image upload failed @ idx=${idx}, file=${imageLocal}:`, e.message || e);
            publicUrl = '';
          }
        }

        const cleanedArr = parseCleaned(row.Cleaned_Ingredients);
        const baseNameNoExt = path.parse(baseName).name || String(idx);
        const payload = {
          title: (row.Title || '').trim() || null,
          instructions: row.Instructions || null,
          raw_ingredients: row.Ingredients || null,
          cleaned_ingredients: cleanedArr,
          image_path: imageKey,
          image_url: publicUrl,
          provider: PROVIDER,
          external_id: baseNameNoExt,
          source: SOURCE,
          source_id: String(idx),
          version: VERSION,
        };

        await upsertRecipe(payload);
        processed++;
        if (processed % 100 === 0) console.log(`[Ingest] Upserted ${processed}/${rows.length}`);
      } catch (e) {
        console.error(`[Ingest] Row error idx=${item && item.idx}:`, e.message || e);
        await sleep(200);
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, (_, i) => worker(i)));
  console.log(`[Ingest] Done. Total upserted: ${processed}`);
}

main().catch((e) => {
  console.error('[Ingest] Fatal:', e);
  process.exit(1);
});
