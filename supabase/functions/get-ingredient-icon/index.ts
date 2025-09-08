// Supabase Edge Function for ingredient icon generation
/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestPayload {
  slug: string;
  display_name?: string;
  force_regenerate?: boolean;
}

interface IconResponse {
  status: 'ready' | 'pending';
  image_url: string | null;
  slug: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      db: { schema: 'nutriai' }
    })

    // Parse request
    const payload: RequestPayload = await req.json()
    const { slug, display_name, force_regenerate = false } = payload

    console.log('🎨 Ingredient icon request:', {
      slug,
      display_name,
      force_regenerate
    })

    // Check if image already exists (unless force_regenerate is true)
    if (!force_regenerate) {
      const { data: existingImage } = await supabase
        .from('ingredient_icons')
        .select('*')
        .eq('slug', slug)
        .single()

      if (existingImage && existingImage.image_url && existingImage.status === 'ready') {
        console.log('✅ Using existing image for:', slug)
        return new Response(
          JSON.stringify({
            status: 'ready',
            image_url: existingImage.image_url,
            slug: slug,
          } as IconResponse),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          }
        )
      }
    }

    // Generate new image with improved prompt
    const ingredientName = display_name || slug.replace(/-/g, ' ')
    const positivePrompt = `Three-quarter angle food photography of ${ingredientName}, shot at 45 degrees, isolated on a solid light-gray background. Clean studio product photography with bright, even lighting. Sharp focus, centered, square frame, true-to-life color, minimalist editorial style.`
    const negativePrompt = `multiple items, cluttered, dark background, blurry, low quality, cartoon, illustration, text, watermark, logo, hands, people`

    console.log('📷 Generating image for:', ingredientName)

    // Call your AI image generation API (replace with your actual API)
    const imageGenerationResponse = await generateImageWithAI(positivePrompt, negativePrompt, slug)

    if (imageGenerationResponse.success) {
      // Save to database
      const { error: insertError } = await supabase
        .from('ingredient_icons')
        .upsert({
          slug: slug,
          display_name: display_name || slug,
          image_url: imageGenerationResponse.image_url,
          storage_path: imageGenerationResponse.storage_path,
          status: 'ready',
          prompt: positivePrompt,
          model: 'imagen-3.0-generate-002',
          seed: imageGenerationResponse.seed,
          prompt_version: 4,
          updated_at: new Date().toISOString()
        })

      if (insertError) {
        console.error('❌ Database insert error:', insertError)
        throw insertError
      }

      console.log('✅ Image generated and saved for:', slug)

      return new Response(
        JSON.stringify({
          status: 'ready',
          image_url: imageGenerationResponse.image_url,
          slug: slug,
        } as IconResponse),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    } else {
      // Image generation failed or is pending
      console.log('⏳ Image generation pending for:', slug)

      // Save pending status
      await supabase
        .from('ingredient_icons')
        .upsert({
          slug: slug,
          display_name: display_name || slug,
          image_url: null,
          status: 'pending',
          prompt: positivePrompt,
          model: 'imagen-3.0-generate-002',
          updated_at: new Date().toISOString()
        })

      return new Response(
        JSON.stringify({
          status: 'pending',
          image_url: null,
          slug: slug,
        } as IconResponse),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    }

  } catch (error) {
    console.error('❌ Edge function error:', error)

    return new Response(
      JSON.stringify({
        error: error.message,
        status: 'failed',
        image_url: null,
        slug: ''
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})

/**
 * Replace this function with your actual AI image generation API call
 * This is a placeholder that shows the expected interface
 */
async function generateImageWithAI(
  positivePrompt: string,
  _negativePrompt: string,
  slug: string,
): Promise<{
  success: boolean;
  image_url?: string;
  storage_path?: string;
  seed?: number;
  error?: string;
}> {
  try {
    // Use your existing Gemini configuration
    const apiKey = Deno.env.get('GEMINI_API_KEY') || Deno.env.get('GOOGLE_API_KEY')
    if (!apiKey) {
      console.error('❌ Missing GEMINI_API_KEY')
      return { success: false, error: 'Gemini API not configured' }
    }

    const modelId = Deno.env.get('ICON_MODEL') || 'imagen-3.0-generate-002'
    console.log('🤖 Calling Gemini/Imagen API...')
    console.log('Positive prompt:', positivePrompt.substring(0, 100) + '...')

    // Use your existing Gemini endpoint format
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelId)}:predict`

    const body = {
      instances: [{ prompt: positivePrompt }],
      parameters: {
        sampleCount: 1,
        aspectRatio: '1:1'
      }
    }

    const response = await fetch(endpoint + `?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Gemini API error:', response.status, errorText)
      return { success: false, error: `Gemini API error: ${response.status}` }
    }

    const data = await response.json()
    console.log('📊 Gemini API response received')

    // Extract base64 image using your existing logic
    let b64: string | undefined
    if (Array.isArray(data?.predictions) && data.predictions[0]) {
      const p0 = data.predictions[0]
      b64 = typeof p0?.bytesBase64Encoded === 'string' ? p0.bytesBase64Encoded :
        typeof p0?.imageBytes === 'string' ? p0.imageBytes :
          Array.isArray(p0?.images) && typeof p0.images[0]?.bytesBase64Encoded === 'string' ? p0.images[0].bytesBase64Encoded :
            undefined
    }

    if (!b64 && Array.isArray(data?.generatedImages) && data.generatedImages[0]?.image?.imageBytes) {
      b64 = data.generatedImages[0].image.imageBytes
    }

    if (!b64) {
      console.error('❌ No image data in Gemini response')
      return { success: false, error: 'No image data in response' }
    }

    // Upload to Supabase Storage using your existing bucket
    const seed = Math.floor(Math.random() * 10000000000)
    const uploadResult = await uploadImageToSupabase(b64, slug, seed)

    if (!uploadResult) {
      return { success: false, error: 'Failed to upload image to storage' }
    }

    console.log('✅ Gemini image generated and uploaded successfully')
    return {
      success: true,
      image_url: uploadResult.imageUrl,
      storage_path: uploadResult.storagePath,
      seed: seed
    }

  } catch (error) {
    console.error('❌ Gemini image generation error:', error)
    return { success: false, error: error.message }
  }
}

async function uploadImageToSupabase(base64Data: string, slug: string, seed: number): Promise<{ imageUrl: string, storagePath: string } | null> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      db: { schema: 'nutriai' }
    })

    // Convert base64 to Uint8Array (your existing logic)
    const raw = base64Data.replace(/^data:[^;]+;base64,/, '')
    const bin = atob(raw)
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) {
      bytes[i] = bin.charCodeAt(i)
    }

    // Generate filename matching your existing structure: slug/v4/seedXXXXXX.png
    const fileName = `${slug}/v4/seed${seed}.png`

    // Use your existing bucket name
    const bucketName = 'ingredient-icons'

    // Upload to Supabase Storage
    const { error } = await supabase.storage
      .from(bucketName)
      .upload(fileName, bytes, {
        contentType: 'image/png',
        cacheControl: '3600'
      })

    if (error) {
      console.error('❌ Supabase upload error:', error)
      return null
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucketName)
      .getPublicUrl(fileName)

    console.log('✅ Image uploaded to Supabase:', publicUrl)
    return {
      imageUrl: publicUrl,
      storagePath: fileName
    }

  } catch (error) {
    console.error('❌ Upload error:', error)
    return null
  }
}

/* 
ENVIRONMENT VARIABLES (should already be set in your Supabase project):

GEMINI_API_KEY or GOOGLE_API_KEY - Your Google Gemini API key
ICON_MODEL - Model to use (defaults to imagen-3.0-generate-002)
EXPO_PUBLIC_SUPABASE_IMAGES_BUCKET - Bucket name for storing images
*/