import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import * as cheerio from 'https://esm.sh/cheerio@1.0.0-rc.12'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ParseRequest {
  type: 'link' | 'text' | 'image' | 'video'
  input: string
  options?: {
    useAI?: boolean
    includeNutrition?: boolean
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { type, input, options } = await req.json() as ParseRequest

    let recipe = null

    switch (type) {
      case 'link':
        recipe = await parseFromUrl(input, options)
        break
      case 'text':
        recipe = await parseFromText(input, options)
        break
      case 'image':
        recipe = await parseFromImage(input, options)
        break
      case 'video':
        recipe = await parseFromVideo(input, options)
        break
      default:
        throw new Error(`Unsupported type: ${type}`)
    }

    return new Response(
      JSON.stringify({ recipe }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Parse error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to parse recipe' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})

async function parseFromUrl(url: string, options?: any) {
  try {
    // Fetch the webpage
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.statusText}`)
    }

    const html = await response.text()
    const $ = cheerio.load(html)

    // First, try to find JSON-LD structured data
    let recipe = null
    $('script[type="application/ld+json"]').each((_, element) => {
      try {
        const jsonText = $(element).html()
        if (!jsonText) return
        
        const data = JSON.parse(jsonText)
        
        // Check if it's a Recipe schema
        if (isRecipeSchema(data)) {
          recipe = extractRecipeFromSchema(data, url)
          return false // Break the loop
        }
        
        // Check for @graph structure
        if (data['@graph'] && Array.isArray(data['@graph'])) {
          const recipeData = data['@graph'].find((item: any) => isRecipeSchema(item))
          if (recipeData) {
            recipe = extractRecipeFromSchema(recipeData, url)
            return false
          }
        }
      } catch (e) {
        console.log('Failed to parse JSON-LD:', e)
      }
    })

    // If no structured data, try to parse HTML directly
    if (!recipe) {
      recipe = await parseHtmlContent($, url)
    }

    // Enhance with AI if requested
    if (options?.useAI && recipe) {
      recipe = await enhanceWithAI(recipe)
    }

    return recipe
  } catch (error) {
    console.error('URL parsing error:', error)
    throw error
  }
}

async function parseFromText(text: string, options?: any) {
  const lines = text.split('\n').map(line => line.trim()).filter(Boolean)
  
  const recipe = {
    id: generateId(),
    title: 'Imported Recipe',
    description: '',
    source: 'text',
    sourceType: 'text',
    ingredients: [] as any[],
    instructions: [] as any[],
    servings: 4,
    createdAt: new Date().toISOString(),
  }

  let section: 'none' | 'ingredients' | 'instructions' = 'none'
  let instructionStep = 1

  for (const line of lines) {
    const lowerLine = line.toLowerCase()
    
    // Detect section headers
    if (lowerLine.includes('ingredient')) {
      section = 'ingredients'
      continue
    } else if (lowerLine.includes('instruction') || lowerLine.includes('direction') || lowerLine.includes('method')) {
      section = 'instructions'
      continue
    }
    
    // Extract title
    if (section === 'none' && recipe.title === 'Imported Recipe') {
      if (lowerLine.startsWith('recipe:')) {
        recipe.title = line.substring(7).trim()
      } else if (lines.indexOf(line) === 0) {
        recipe.title = line
      }
      continue
    }
    
    // Parse ingredients
    if (section === 'ingredients') {
      recipe.ingredients.push({
        name: line,
        original: line,
      })
    }
    
    // Parse instructions
    if (section === 'instructions') {
      const cleanedStep = line.replace(/^\d+\.?\s*/, '')
      recipe.instructions.push({
        step: instructionStep++,
        text: cleanedStep,
      })
    }
  }

  // Enhance with AI if requested
  if (options?.useAI && recipe) {
    return await enhanceWithAI(recipe)
  }
  
  return recipe.ingredients.length > 0 || recipe.instructions.length > 0 ? recipe : null
}

async function parseFromImage(input: string, options?: any) {
  // Placeholder for image processing
  // In production, this would use OCR service
  throw new Error('Image parsing not yet implemented')
}

async function parseFromVideo(input: string, options?: any) {
  // Placeholder for video processing
  // In production, this would extract video metadata and transcripts
  throw new Error('Video parsing not yet implemented')
}

function isRecipeSchema(data: any): boolean {
  if (!data) return false
  const type = data['@type']
  return type === 'Recipe' || 
         (Array.isArray(type) && type.includes('Recipe')) ||
         type === 'http://schema.org/Recipe'
}

function extractRecipeFromSchema(schema: any, sourceUrl: string) {
  const recipe = {
    id: generateId(),
    title: schema.name || 'Untitled Recipe',
    description: schema.description || '',
    image: typeof schema.image === 'string' ? schema.image : schema.image?.[0] || schema.image?.url,
    source: sourceUrl,
    sourceType: 'web',
    ingredients: [] as any[],
    instructions: [] as any[],
    prepTime: parseTime(schema.prepTime),
    cookTime: parseTime(schema.cookTime),
    totalTime: parseTime(schema.totalTime),
    servings: parseInt(schema.recipeYield) || parseInt(schema.yield) || 4,
    createdAt: new Date().toISOString(),
  }

  // Parse ingredients
  if (schema.recipeIngredient && Array.isArray(schema.recipeIngredient)) {
    recipe.ingredients = schema.recipeIngredient.map((ing: string) => ({
      name: ing,
      original: ing,
    }))
  }

  // Parse instructions
  if (schema.recipeInstructions) {
    if (Array.isArray(schema.recipeInstructions)) {
      recipe.instructions = schema.recipeInstructions.map((inst: any, index: number) => {
        if (typeof inst === 'string') {
          return { step: index + 1, text: inst }
        } else if (inst.text) {
          return { step: index + 1, text: inst.text }
        } else if (inst.name) {
          return { step: index + 1, text: inst.name }
        }
        return { step: index + 1, text: '' }
      }).filter(inst => inst.text)
    } else if (typeof schema.recipeInstructions === 'string') {
      recipe.instructions = schema.recipeInstructions
        .split(/\n+/)
        .filter(Boolean)
        .map((text: string, index: number) => ({
          step: index + 1,
          text: text.trim(),
        }))
    }
  }

  // Parse nutrition if available
  if (schema.nutrition) {
    const nutrition = schema.nutrition
    recipe['nutrition'] = {
      calories: parseNutritionValue(nutrition.calories),
      protein: parseNutritionValue(nutrition.proteinContent),
      carbs: parseNutritionValue(nutrition.carbohydrateContent),
      fat: parseNutritionValue(nutrition.fatContent),
      fiber: parseNutritionValue(nutrition.fiberContent),
      sugar: parseNutritionValue(nutrition.sugarContent),
      sodium: parseNutritionValue(nutrition.sodiumContent),
    }
  }

  // Parse categories/tags
  if (schema.recipeCategory) {
    recipe['categories'] = Array.isArray(schema.recipeCategory) 
      ? schema.recipeCategory 
      : [schema.recipeCategory]
  }

  if (schema.keywords) {
    recipe['tags'] = typeof schema.keywords === 'string' 
      ? schema.keywords.split(',').map(k => k.trim())
      : schema.keywords
  }

  return recipe
}

async function parseHtmlContent($: any, sourceUrl: string) {
  const recipe = {
    id: generateId(),
    title: 'Imported Recipe',
    description: '',
    image: '',
    source: sourceUrl,
    sourceType: 'web',
    ingredients: [] as any[],
    instructions: [] as any[],
    servings: 4,
    createdAt: new Date().toISOString(),
  }

  // Extract title
  recipe.title = $('h1').first().text().trim() || 
                 $('title').text().replace(/\s*[\|–-]\s*.*$/, '').trim() || 
                 'Imported Recipe'

  // Extract description
  recipe.description = $('meta[name="description"]').attr('content') || 
                      $('meta[property="og:description"]').attr('content') || ''

  // Extract image
  recipe.image = $('meta[property="og:image"]').attr('content') || 
                 $('img[itemprop="image"]').attr('src') || ''

  // Try various selectors for ingredients
  const ingredientSelectors = [
    '.recipe-ingredients li',
    '.ingredients li',
    '[class*="ingredient"] li',
    '[itemprop="ingredients"]',
    '.recipe-content ul li',
    '.recipe ul li',
  ]

  for (const selector of ingredientSelectors) {
    const elements = $(selector)
    if (elements.length > 0) {
      elements.each((_, el) => {
        const text = $(el).text().trim()
        if (text) {
          recipe.ingredients.push({
            name: text,
            original: text,
          })
        }
      })
      if (recipe.ingredients.length > 0) break
    }
  }

  // Try various selectors for instructions
  const instructionSelectors = [
    '.recipe-instructions li',
    '.instructions li',
    '.directions li',
    '.method li',
    '[itemprop="recipeInstructions"]',
    '.recipe-content ol li',
    '.recipe ol li',
  ]

  for (const selector of instructionSelectors) {
    const elements = $(selector)
    if (elements.length > 0) {
      elements.each((i, el) => {
        const text = $(el).text().trim()
        if (text) {
          recipe.instructions.push({
            step: i + 1,
            text: text,
          })
        }
      })
      if (recipe.instructions.length > 0) break
    }
  }

  // Look for prep/cook times
  const prepTimeText = $('.prep-time, [itemprop="prepTime"]').text()
  const cookTimeText = $('.cook-time, [itemprop="cookTime"]').text()
  
  if (prepTimeText) {
    recipe['prepTime'] = extractMinutes(prepTimeText)
  }
  if (cookTimeText) {
    recipe['cookTime'] = extractMinutes(cookTimeText)
  }

  // Look for servings
  const servingsText = $('.servings, [itemprop="recipeYield"]').text()
  if (servingsText) {
    const servingsMatch = servingsText.match(/\d+/)
    if (servingsMatch) {
      recipe.servings = parseInt(servingsMatch[0])
    }
  }

  return recipe.ingredients.length > 0 || recipe.instructions.length > 0 ? recipe : null
}

async function enhanceWithAI(recipe: any) {
  // Placeholder for AI enhancement
  // In production, this would call an AI service
  return recipe
}

function parseTime(isoDuration?: string): number | undefined {
  if (!isoDuration) return undefined
  
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/)
  if (!match) return undefined
  
  const hours = parseInt(match[1] || '0')
  const minutes = parseInt(match[2] || '0')
  
  return hours * 60 + minutes
}

function parseNutritionValue(value?: string | number): number | undefined {
  if (!value) return undefined
  if (typeof value === 'number') return value
  
  const numMatch = value.toString().match(/[\d.]+/)
  return numMatch ? parseFloat(numMatch[0]) : undefined
}

function extractMinutes(text: string): number | undefined {
  const match = text.match(/(\d+)\s*(?:hours?|hrs?|h)/i)
  const minMatch = text.match(/(\d+)\s*(?:minutes?|mins?|m)/i)
  
  let total = 0
  if (match) total += parseInt(match[1]) * 60
  if (minMatch) total += parseInt(minMatch[1])
  
  return total > 0 ? total : undefined
}

function generateId(): string {
  return `import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}
