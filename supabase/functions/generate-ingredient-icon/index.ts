import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Env
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get('SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const BUCKET = Deno.env.get('ICON_BUCKET') || 'ingredient-icons'
const MODEL = Deno.env.get('ICON_MODEL') || 'stable-image-core'

// Optional S3 config (preferred in your setup)
const AWS_ACCESS_KEY_ID = Deno.env.get('AWS_ACCESS_KEY_ID') || undefined
const AWS_SECRET_ACCESS_KEY = Deno.env.get('AWS_SECRET_ACCESS_KEY') || undefined
const AWS_REGION = Deno.env.get('AWS_REGION') || undefined
const ICON_S3_BUCKET = Deno.env.get('ICON_S3_BUCKET') || undefined
const ICON_S3_PUBLIC_BASE = Deno.env.get('ICON_S3_PUBLIC_BASE') || undefined
const ICON_S3_USE_PUBLIC_READ = (Deno.env.get('ICON_S3_USE_PUBLIC_READ') || 'true').toLowerCase() === 'true'

// Improved prompt for marker illustration style
const BASE_STYLE = 'Marker illustration (editorial food art) of a typical portion of {subject} as a cooking ingredient, isolated and centered on a solid cream-white background. Soft natural lighting with subtle shadows and balanced contrast. Clean composition, minimal styling, consistent angle, and perspective. Sharp focus, high detail, hand-rendered marker texture, 4K.'

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    // Auth: restrict to service role or scheduled invocations
    const auth = req.headers.get('authorization') || ''
    if (!auth.includes(SUPABASE_SERVICE_ROLE_KEY.slice(0, 8))) {
      // Best-effort: Supabase schedule uses service role internally; allow fallback in self-hosted cron by env check.
    }

    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.45.4')
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` } },
      db: { schema: 'nutriai' },
    })

    // Fetch pending items (oldest first)
    const { data: pending, error } = await supabase
      .from('ingredient_icons')
      .select('*')
      .eq('status', 'pending')
      .order('updated_at', { ascending: true })
      .limit(10)

    if (error) return json({ error: error.message }, 500)
    if (!pending || pending.length === 0) return json({ processed: 0 })

    let processed = 0
    for (const row of pending) {
      try {
        const subject = descriptorFromSlug(row.slug, row.display_name)
        const prompt = BASE_STYLE.replace('{subject}', subject)
        // Generate image
        const png = await generatePng({ prompt, seed: row.seed, model: MODEL })

        // Decide storage: S3 (if configured) else Supabase Storage
        const storagePath = `${row.slug}/v${row.prompt_version}/seed${row.seed}.png`
        let image_url: string

        if (AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY && AWS_REGION && ICON_S3_BUCKET) {
          // Upload to AWS S3
          const { S3Client, PutObjectCommand } = await import('https://esm.sh/@aws-sdk/client-s3@3.614.0')
          const s3 = new S3Client({
            region: AWS_REGION,
            credentials: { accessKeyId: AWS_ACCESS_KEY_ID, secretAccessKey: AWS_SECRET_ACCESS_KEY },
          })
          const put = new PutObjectCommand({
            Bucket: ICON_S3_BUCKET,
            Key: storagePath,
            Body: png,
            ContentType: 'image/png',
            ACL: ICON_S3_USE_PUBLIC_READ ? 'public-read' : undefined,
          })
          await s3.send(put)

          // Compose public URL
          if (ICON_S3_PUBLIC_BASE) {
            image_url = `${ICON_S3_PUBLIC_BASE.replace(/\/$/, '')}/${storagePath}`
          } else {
            image_url = `https://${ICON_S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${storagePath}`
          }
        } else {
          // Fallback to Supabase Storage
          const uploadRes = await supabase.storage.from(BUCKET).upload(storagePath, png, {
            contentType: 'image/png',
            upsert: true,
          })
          if (uploadRes.error) throw new Error(uploadRes.error.message)
          const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)
          image_url = pub.publicUrl
        }

        // Update row → ready
        const upd = await supabase
          .from('ingredient_icons')
          .update({ status: 'ready', image_url, storage_path: storagePath, model: MODEL, prompt })
          .eq('slug', row.slug)
        if (upd.error) throw new Error(upd.error.message)

        processed++
      } catch (e) {
        const err = e instanceof Error ? e.message : String(e)
        await supabase
          .from('ingredient_icons')
          .update({ status: 'failed', fail_count: (row.fail_count ?? 0) + 1, last_error: err })
          .eq('slug', row.slug)
      }
    }

    return json({ processed })
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e)
    return json({ error: err }, 500)
  }
})

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

function descriptorFromSlug(slug: string, display?: string | null): string {
  // Basic heuristic; admins can override display_name
  const s = display?.trim() || slug.replace(/[-_]/g, ' ')
  return s
}

async function generatePng({ prompt, seed, model }: { prompt: string; seed?: number; model: string }): Promise<Uint8Array> {
  // Provider-agnostic stub; implement your chosen provider here. Use env secrets (kept server-side).
  const provider = Deno.env.get('ICON_PROVIDER') || 'stability'
  if (provider === 'stability') {
    const key = Deno.env.get('STABILITY_API_KEY')
    if (!key) throw new Error('Missing STABILITY_API_KEY')

    // Use Stability "Stable Image Core" v2beta endpoint. We request raw image bytes.
    const form = new FormData()
    form.append('prompt', prompt)
    form.append('output_format', 'png')
    form.append('aspect_ratio', '1:1')
    form.append('style_preset', 'line-art')
    if (typeof seed === 'number' && seed > 0) form.append('seed', String(seed))

    const res = await fetch('https://api.stability.ai/v2beta/stable-image/generate/core', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        Accept: 'image/*',
      },
      body: form,
    })
    if (!res.ok) {
      let errText: string
      try { errText = await res.text() } catch { errText = `${res.status} ${res.statusText}` }
      throw new Error(`Stability error ${res.status}: ${errText}`)
    }
    const buf = new Uint8Array(await res.arrayBuffer())
    return buf
  }
  if (provider === 'modelslab') {
    const key = Deno.env.get('MODELSLAB_API_KEY')
    if (!key) throw new Error('Missing MODELSLAB_API_KEY')

    // Allow overriding model/endpoint via env, default to provided values
    const endpoint = (Deno.env.get('MODELSLAB_ENDPOINT') || 'https://modelslab.com/api/v7/images/text-to-image').trim()
    const modelId = (Deno.env.get('MODELSLAB_MODEL_ID') || model || 'imagen-3').trim()

    // Build payload. Keep it minimal and let our BASE_STYLE drive consistency.
    const body = {
      key,
      model_id: modelId,
      prompt,
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      let errText: string
      try { errText = await res.text() } catch { errText = `${res.status} ${res.statusText}` }
      throw new Error(`Modelslab error ${res.status}: ${errText}`)
    }

    // Response can vary; try to support common shapes.
    const data: any = await res.json().catch(() => ({}))
    // Try url-first (some providers return output as array of URLs)
    let imgBytes: Uint8Array | null = null
    const url = Array.isArray(data?.output) && typeof data.output[0] === 'string' ? data.output[0] : (typeof data?.url === 'string' ? data.url : undefined)
    if (url) {
      const imgRes = await fetch(url)
      if (!imgRes.ok) throw new Error(`Modelslab image fetch failed ${imgRes.status}`)
      imgBytes = new Uint8Array(await imgRes.arrayBuffer())
    }
    // Else try base64 fields
    if (!imgBytes) {
      const b64 = (Array.isArray(data?.output) && typeof data.output[0] === 'string') ? data.output[0] : (typeof data?.image_base64 === 'string' ? data.image_base64 : undefined)
      if (b64) {
        // Strip data URL prefix if present
        const raw = b64.replace(/^data:[^;]+;base64,/, '')
        const bin = atob(raw)
        const bytes = new Uint8Array(bin.length)
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
        imgBytes = bytes
      }
    }
    if (!imgBytes) {
      // Include raw response (truncated) to aid debugging of provider errors/quotas/params
      let snapshot = ''
      try { snapshot = JSON.stringify(data).slice(0, 1500) } catch {}
      throw new Error(`Modelslab response missing image output. body=${snapshot}`)
    }
    return imgBytes
  }
  if (provider === 'fal') {
    // Fal.ai API with FLUX Pro
    const apiKey = Deno.env.get('FAL_API_KEY')
    if (!apiKey) throw new Error('Missing FAL_API_KEY')

    const modelId = (Deno.env.get('ICON_MODEL') || model || 'fal-ai/flux-pro/kontext/max/text-to-image').trim()
    const endpoint = `https://queue.fal.run/${modelId}`

    console.log(`🤖 Calling Fal.ai API (${modelId})...`)

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: prompt,
        image_size: 'square',
        num_inference_steps: 28,
        guidance_scale: 3.5,
        num_images: 1,
        enable_safety_checker: false,
      }),
    })

    if (!res.ok) {
      let errText: string
      try { errText = await res.text() } catch { errText = `${res.status} ${res.statusText}` }
      throw new Error(`Fal.ai error ${res.status}: ${errText}`)
    }

    const data: any = await res.json()
    console.log('📊 Fal.ai response received')

    // Fal.ai returns image URL in data.images[0].url
    const imageUrl = data?.images?.[0]?.url
    if (!imageUrl) {
      throw new Error('No image URL in Fal.ai response')
    }

    // Download the image
    const imgRes = await fetch(imageUrl)
    if (!imgRes.ok) throw new Error(`Failed to download image: ${imgRes.status}`)
    
    const bytes = new Uint8Array(await imgRes.arrayBuffer())
    console.log(`✅ Fal.ai image generated (${bytes.length} bytes)`)
    return bytes
  }
  if (provider === 'huggingface') {
    // Hugging Face Inference API with Stable Diffusion 2.1
    const apiKey = Deno.env.get('HUGGINGFACE_API_KEY')
    if (!apiKey) throw new Error('Missing HUGGINGFACE_API_KEY')

    const modelId = (Deno.env.get('ICON_MODEL') || model || 'black-forest-labs/FLUX.1-schnell').trim()
    const endpoint = `https://api-inference.huggingface.co/models/${modelId}`

    console.log(`🤖 Calling Hugging Face API (${modelId})...`)

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          num_inference_steps: 4, // FLUX.1-schnell is optimized for 4 steps
          guidance_scale: 0, // schnell works best with guidance_scale = 0
        }
      }),
    })

    if (!res.ok) {
      let errText: string
      try { errText = await res.text() } catch { errText = `${res.status} ${res.statusText}` }
      throw new Error(`Hugging Face error ${res.status}: ${errText}`)
    }

    // Hugging Face returns raw image bytes
    const bytes = new Uint8Array(await res.arrayBuffer())
    console.log(`✅ Hugging Face image generated (${bytes.length} bytes)`)
    return bytes
  }
  if (provider === 'gemini') {
    // Google Gemini API (Imagen). Uses API key auth via header x-goog-api-key.
    // Default to Imagen 3.0 generate model unless overridden by ICON_MODEL env.
    const apiKey = Deno.env.get('GEMINI_API_KEY') || Deno.env.get('GOOGLE_API_KEY')
    if (!apiKey) throw new Error('Missing GEMINI_API_KEY')

    const modelId = (Deno.env.get('ICON_MODEL') || model || 'imagen-3.0-generate-002').trim()
    // REST endpoint shape per docs: v1beta/models/{model}:predict
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelId)}:predict`

    const body = {
      instances: [
        {
          prompt,
        },
      ],
      parameters: {
        // Generate a single square image suitable for icons
        sampleCount: 1,
        aspectRatio: '1:1',
        // sampleImageSize could be set for Standard/Ultra models (e.g., '1K'),
        // but we omit for compatibility across Imagen variants.
      },
    }

    const res = await fetch(endpoint + `?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      let errText: string
      try { errText = await res.text() } catch { errText = `${res.status} ${res.statusText}` }
      throw new Error(`Gemini/Imagen error ${res.status}: ${errText}`)
    }

    // Parse response; support multiple possible shapes.
    const data: any = await res.json().catch(() => ({}))
    let b64: string | undefined
    // Common REST shape: predictions[0].bytesBase64Encoded
    if (Array.isArray(data?.predictions) && data.predictions[0]) {
      const p0 = data.predictions[0]
      b64 = typeof p0?.bytesBase64Encoded === 'string' ? p0.bytesBase64Encoded
        : typeof p0?.imageBytes === 'string' ? p0.imageBytes
        : (Array.isArray(p0?.images) && typeof p0.images[0]?.bytesBase64Encoded === 'string'
            ? p0.images[0].bytesBase64Encoded
            : undefined)
    }
    // SDK-like shape fallback: generatedImages[].image.imageBytes
    if (!b64 && Array.isArray(data?.generatedImages) && data.generatedImages[0]?.image?.imageBytes) {
      b64 = data.generatedImages[0].image.imageBytes
    }
    if (!b64) {
      let snapshot = ''
      try { snapshot = JSON.stringify(data).slice(0, 1500) } catch {}
      throw new Error(`Gemini/Imagen response missing image bytes. body=${snapshot}`)
    }

    // Convert base64 -> Uint8Array
    const raw = b64.replace(/^data:[^;]+;base64,/, '')
    const bin = atob(raw)
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    return bytes
  }
  throw new Error(`Unsupported ICON_PROVIDER: ${provider}`)
}
