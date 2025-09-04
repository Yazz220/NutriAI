// Utility to fetch or create an ingredient icon via Edge Function
// Uses Supabase anon key from Expo public env.

export type IconResponse = {
  status: 'ready' | 'pending'
  image_url: string | null
  slug: string
}

const FUNCTION_URL = 'https://wckohtwftlwhyldnfpbz.supabase.co/functions/v1/get-ingredient-icon'

export async function fetchIngredientIcon(slug: string, displayName?: string, forceRegenerate?: boolean): Promise<IconResponse> {
  const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string
  if (!anon) throw new Error('Missing EXPO_PUBLIC_SUPABASE_ANON_KEY')

  console.log('🔍 Fetching ingredient icon:', { slug, displayName, forceRegenerate })

  const res = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${anon}`,
      apikey: anon,
    },
    body: JSON.stringify({ 
      slug, 
      display_name: displayName,
      force_regenerate: forceRegenerate,
    }),
  })

  console.log('📡 API Response status:', res.status)

  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    console.error('❌ API Error:', res.status, txt)
    throw new Error(`get-ingredient-icon failed: ${res.status} ${txt}`)
  }

  const body = (await res.json()) as IconResponse
  console.log('✅ API Response body:', body)
  return body
}
