import { serve } from 'std/http/server.ts';

// CORS headers compatible with Expo and browsers
const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, if-none-match',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
};

const OFF_SEARCH = 'https://world.openfoodfacts.org/cgi/search.pl';

function toNumber(n: unknown): number | null {
  const v = typeof n === 'string' ? parseFloat(n) : typeof n === 'number' ? n : NaN;
  return Number.isFinite(v) ? v : null;
}

function kJtoKcal(kj: number | null): number | null {
  if (kj == null) return null;
  return Math.round((kj / 4.184) * 10) / 10;
}

async function searchOpenFoodFacts(query: string) {
  const params = new URLSearchParams({
    search_terms: query,
    search_simple: '1',
    action: 'process',
    json: '1',
    page_size: '25',
    fields: 'code,product_name,brands,serving_size,nutriments,image_front_url,image_front_small_url',
  });
  const res = await fetch(`${OFF_SEARCH}?${params.toString()}`, { method: 'GET' });
  if (!res.ok) throw new Error(`OpenFoodFacts error ${res.status}`);
  const json = await res.json();
  const products = Array.isArray(json?.products) ? json.products : [];
  return products as any[];
}

function normalizeProduct(p: any) {
  const nutr = p?.nutriments || {};
  const kcal100 = toNumber(nutr['energy-kcal_100g']) ?? kJtoKcal(toNumber(nutr['energy_100g'])) ?? 0;
  const protein100 = toNumber(nutr['proteins_100g']) ?? 0;
  const carbs100 = toNumber(nutr['carbohydrates_100g']) ?? 0;
  const fat100 = toNumber(nutr['fat_100g']) ?? 0;
  const per100 = {
    calories: Math.max(0, Math.round(kcal100)),
    protein: Math.max(0, Math.round((protein100 + Number.EPSILON) * 10) / 10),
    carbs: Math.max(0, Math.round((carbs100 + Number.EPSILON) * 10) / 10),
    fats: Math.max(0, Math.round((fat100 + Number.EPSILON) * 10) / 10),
  };
  const servingSize = (p?.serving_size && String(p.serving_size)) || undefined;
  return {
    id: String(p?.code || ''),
    name: String(p?.product_name || '').trim() || 'Unknown food',
    brand: p?.brands ? String(p.brands) : undefined,
    imageUrl: p?.image_front_url || p?.image_front_small_url || undefined,
    servingSize,
    per100g: per100,
  };
}

function pickBest(products: any[]) {
  // Choose the first product with calories > 0 and at least one macro
  for (const p of products) {
    const n = normalizeProduct(p);
    if (n.per100g.calories > 0 && (n.per100g.protein > 0 || n.per100g.carbs > 0 || n.per100g.fats > 0)) {
      return n;
    }
  }
  // Fallback to first product normalized
  if (products.length) return normalizeProduct(products[0]);
  return null;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    let query = (url.searchParams.get('q') || '').trim();

    if (req.method === 'POST') {
      try {
        const body = await req.json();
        if (typeof body?.query === 'string' && body.query.trim()) {
          query = body.query.trim();
        }
      } catch {
        // ignore JSON parse errors; rely on query param
      }
    }

    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Missing query. Provide ?q=apple or {"query":"apple"}.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const products = await searchOpenFoodFacts(query);
    const best = pickBest(products);

    const normalized = products.slice(0, 10).map(normalizeProduct);

    const result = {
      provider: 'openfoodfacts',
      query,
      top: best,
      alternatives: normalized,
      meta: { count: products.length },
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
