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
            status: 200,
          },
        )
      }
    }

    // Generate new image with improved prompt
    const ingredientName = display_name || slug.replace(/-/g, ' ')
    const positivePrompt = `Marker illustration (editorial food art) of a typical portion of ${ingredientName} as a cooking ingredient, true to life colors, isolated and centered on a solid cream-white background. Soft natural lighting with subtle shadows and balanced contrast. Clean composition, minimal styling, consistent angle, and perspective. Sharp focus, high detail.`
    const negativePrompt = `text, label, logo, watermark, brand name, table, spoon, multiple ingredients, collage, background clutter, reflections, extra props, artistic filters, oversaturation, exaggerated colors.`

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
          model: 'black-forest-labs/FLUX.1-schnell',
          seed: imageGenerationResponse.seed,
          prompt_version: 5,
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
          model: 'black-forest-labs/FLUX.1-schnell',
          prompt_version: 5,
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
    // Use Hugging Face FLUX.1-schnell
    const apiKey = Deno.env.get('HUGGINGFACE_API_KEY')
    if (!apiKey) {
      console.error('❌ Missing HUGGINGFACE_API_KEY')
      return { success: false, error: 'Hugging Face API not configured' }
    }

    const modelId = Deno.env.get('ICON_MODEL') || 'black-forest-labs/FLUX.1-schnell'
    console.log('🤖 Calling Hugging Face API...')
    console.log('Model:', modelId)
    console.log('Prompt:', positivePrompt.substring(0, 100) + '...')

    const endpoint = `https://api-inference.huggingface.co/models/${modelId}`

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: positivePrompt,
        parameters: {
          num_inference_steps: 4, // FLUX.1-schnell is optimized for 4 steps
          guidance_scale: 0, // schnell works best with guidance_scale = 0
        }
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Hugging Face API error:', response.status, errorText)
      return { success: false, error: `Hugging Face API error: ${response.status}` }
    }

    console.log('📊 Hugging Face API response received')

    // Hugging Face returns raw image bytes
    const imageBytes = new Uint8Array(await response.arrayBuffer())
    console.log('✅ Image generated:', imageBytes.length, 'bytes')

    // Convert to base64 for upload
    let binary = ''
    for (let i = 0; i < imageBytes.length; i++) {
      binary += String.fromCharCode(imageBytes[i])
    }
    const b64 = btoa(binary)

    // Upload to Supabase Storage
    const seed = Math.floor(Math.random() * 10000000000)
    const uploadResult = await uploadImageToSupabase(b64, slug, seed)

    if (!uploadResult) {
      return { success: false, error: 'Failed to upload image to storage' }
    }

    console.log('✅ Hugging Face image generated and uploaded successfully')
    return {
      success: true,
      image_url: uploadResult.imageUrl,
      storage_path: uploadResult.storagePath,
      seed: seed
    }

  } catch (error) {
    console.error('❌ Image generation error:', error)
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

HUGGINGFACE_API_KEY - Your Hugging Face API key
ICON_MODEL - Model to use (defaults to black-forest-labs/FLUX.1-schnell)
ICON_PROVIDER - Provider to use (set to 'huggingface')
*/