/*
 Ingest Kaggle "Food Ingredients and Recipe Dataset with Images" into Supabase.
 - Reads CSV with columns: Title, Ingredients, Instructions, Image_Name, Cleaned_Ingredients
 - Uploads images from a local folder to Supabase Storage bucket (e.g., recipe-images)
 - Upserts rows into public.recipes with source identifiers for idempotency

 Usage (Windows PowerShell):
   # 1) Install deps (in project root)
   #    npm i -D ts-node typescript @types/node fast-csv
   #    npm i @supabase/supabase-js dotenv
   # 2) Create scripts/.env.local with:
   #    SUPABASE_URL=...
   #    SUPABASE_SERVICE_ROLE_KEY=...   # service role key (do NOT commit)
   #    BUCKET=recipe-images
   #    CSV_PATH=C:\\path\\to\\Food Ingredients and Recipe Dataset with Image Name Mapping.csv
   #    IMAGES_DIR=C:\\path\\to\\Food Images   # unzipped folder
   #    SOURCE=kaggle_food_images
   #    VERSION=1
   # 3) Run:
   #    npx ts-node scripts/ingest/ingest-recipes.ts
*/

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { parse } from 'fast-csv';
import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const SUPABASE_URL = process.env.SUPABASE_URL as string;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
// Supabase storage bucket (used only when USE_S3 !== 'true')
const BUCKET = process.env.BUCKET || 'recipe-images';
const CSV_PATH = process.env.CSV_PATH as string;
const IMAGES_DIR = process.env.IMAGES_DIR as string;
const NO_UPLOAD = String(process.env.NO_UPLOAD || 'false').toLowerCase() === 'true';
const IMAGE_PREFIX = process.env.IMAGE_PREFIX || '';
const SOURCE = process.env.SOURCE || 'kaggle_food_images';
const VERSION = Number(process.env.VERSION || 1);

// Optional: AWS S3 mode
const USE_S3 = String(process.env.USE_S3 || 'false').toLowerCase() === 'true';
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const S3_BUCKET = process.env.S3_BUCKET || '';
const CDN_BASE = process.env.CDN_BASE || '';

const s3 = USE_S3
  ? new S3Client({ region: AWS_REGION })
  : (null as unknown as S3Client);

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

if (USE_S3 && !S3_BUCKET) {
  console.error('[Ingest] USE_S3=true but S3_BUCKET is not set');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function sleep(ms: number) { return new Promise(res => setTimeout(res, ms)); }

type Row = {
  Title: string;
  Ingredients: string;
  Instructions: string;
  Image_Name: string;
  Cleaned_Ingredients: string;
};

// Best-effort parse of cleaned ingredients to string[]
function parseCleaned(ci: string): string[] {
  if (!ci) return [];
  // common formats: "['salt', 'pepper']" or "salt, pepper" or JSON
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

async function ensureBucket() {
  if (USE_S3) {
    console.log(`[Ingest] Using S3 bucket: ${S3_BUCKET} (region ${AWS_REGION})`);
  } else {
    // No storage admin via supabase-js yet; assume bucket created in dashboard
    console.log(`[Ingest] Using Supabase bucket: ${BUCKET}`);
  }
}

async function ensurePublicUrl(objectPath: string): Promise<string> {
  if (USE_S3) {
    // Prefer CDN_BASE if provided, else S3 website URL
    if (CDN_BASE) return `${CDN_BASE.replace(/\/$/, '')}/${objectPath}`;
    // region-agnostic URL works in most regions
    return `https://${S3_BUCKET}.s3.amazonaws.com/${objectPath}`;
  }
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(objectPath);
  return data.publicUrl;
}

async function uploadImage(localPath: string, objectPath: string): Promise<string> {
  const file = await fs.promises.readFile(localPath);
  const ext = path.extname(localPath).toLowerCase();
  const contentType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';

  if (USE_S3) {
    await s3.send(new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: objectPath,
      Body: file,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable',
    }));
    return ensurePublicUrl(objectPath);
  }

  const { error: upErr } = await supabase.storage.from(BUCKET).upload(objectPath, file, {
    contentType,
    upsert: true,
  });
  if (upErr) throw upErr;
  return ensurePublicUrl(objectPath);
}

async function upsertRecipe(payload: any) {
  const { error } = await supabase
    .from('recipes')
    .upsert(payload, { onConflict: 'source,source_id,version' });
  if (error) throw error;
}

async function main() {
  console.log('[Ingest] Start');
  await ensureBucket();

  const stream = fs.createReadStream(CSV_PATH);
  const rows: Row[] = [];

  await new Promise<void>((resolve, reject) => {
    stream
      .pipe(parse<Row, Row>({ headers: true, ignoreEmpty: true, trim: true }))
      .on('error', reject)
      .on('data', (row: Row) => rows.push(row))
      .on('end', () => resolve());
  });

  console.log(`[Ingest] CSV rows: ${rows.length}`);

  let processed = 0;
  const concurrency = 5; // adjust if needed
  const queue = rows.map((row, idx) => ({ row, idx }));

  async function worker(id: number) {
    while (queue.length) {
      const item = queue.shift();
      if (!item) break;
      const { row, idx } = item;
      try {
        const baseName = row.Image_Name?.trim() || '';
        // Build object path. If NO_UPLOAD, assume images already exist at IMAGE_PREFIX/baseName
        const imageKey = NO_UPLOAD
          ? path.posix.join(IMAGE_PREFIX.replace(/\\/g, '/'), baseName)
          : `${SOURCE}/v${VERSION}/${idx}-${path.parse(baseName).name}${path.extname(baseName) || '.jpg'}`;

        let publicUrl = '';
        if (NO_UPLOAD) {
          // Do not upload, just compute public URL
          publicUrl = await ensurePublicUrl(imageKey);
        } else {
          const imageLocal = path.join(IMAGES_DIR, baseName);
          try {
            publicUrl = await uploadImage(imageLocal, imageKey);
          } catch (e: any) {
            console.warn(`[Ingest] Image upload failed @ idx=${idx}, file=${imageLocal}:`, e.message || e);
            publicUrl = '';
          }
        }

        const cleanedArr = parseCleaned(row.Cleaned_Ingredients);
        const payload = {
          title: row.Title?.trim() || null,
          instructions: row.Instructions || null,
          raw_ingredients: row.Ingredients || null,
          cleaned_ingredients: cleanedArr,
          image_path: imageKey,
          image_url: publicUrl,
          source: SOURCE,
          source_id: String(idx),
          version: VERSION,
        };

        await upsertRecipe(payload);
        processed++;
        if (processed % 100 === 0) console.log(`[Ingest] Upserted ${processed}/${rows.length}`);
      } catch (e: any) {
        console.error(`[Ingest] Row error idx=${item?.idx}:`, e.message || e);
        // brief backoff
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
