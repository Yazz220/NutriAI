import 'dotenv/config'

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

// Top/common ingredient display names (expand over time)
const COMMON: string[] = [
  'Yellow Onion',
  'Garlic',
  'Tomato',
  'Potato',
  'Carrot',
  'Celery',
  'Basil',
  'Parsley',
  'Cilantro',
  'Ginger',
  'Banana',
]

async function enqueue(slug: string, display_name?: string) {
  const url = `${SUPABASE_URL.replace(/\/$/, '')}/functions/v1/get-ingredient-icon`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_ANON}`, apikey: SUPABASE_ANON },
    body: JSON.stringify({ slug, display_name }),
  })
  if (!res.ok) throw new Error(`enqueue failed ${res.status}`)
  return res.json()
}

function slugify(s: string) {
  return s.trim().toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-')
}

async function main() {
  console.log(`[icons] pre-generate ${COMMON.length} ingredients`)
  for (const name of COMMON) {
    const slug = slugify(name)
    const out = await enqueue(slug, name)
    console.log('  -', slug, '=>', out.status)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
