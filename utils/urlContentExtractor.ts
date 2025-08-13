/**
 * Enhanced URL content extractor with structured data support and fallback mechanisms
 * Provides robust extraction from recipe websites and social media platforms
 */

import { importRecipeFromText } from './recipeImport';

export interface ExtractedContent {
  rawText: string;
  metadata: {
    source: string;
    extractionMethods: string[];
    confidence: number;
    originalUrl?: string;
    platform?: string;
    creator?: string;
  };
  fallbackUsed: boolean;
}

export interface StructuredRecipeData {
  name: string;
  description?: string;
  imageUrl?: string;
  ingredients: string[];
  instructions: string[];
  prepTime?: number;
  cookTime?: number;
  servings?: number;
  keywords?: string[];
  author?: string;
  datePublished?: string;
  nutrition?: {
    calories?: number;
    protein?: string;
    carbs?: string;
    fat?: string;
  };
}

// Lightweight JSON-LD Recipe type and extractor to enable verbatim mapping
export type RecipeJsonLd = {
  name?: string;
  recipeIngredient?: string[];
  recipeInstructions?: Array<string | { text?: string } | { itemListElement?: Array<string | { text?: string }> }>;
  totalTime?: string;
  prepTime?: string;
  cookTime?: string;
  recipeYield?: string | number;
  keywords?: string | string[];
  image?: string | string[];
  description?: string;
  author?: any;
};

export function extractJsonLdRecipes(html: string): RecipeJsonLd[] {
  const matches = [...html.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  )];
  const out: RecipeJsonLd[] = [];
  for (const m of matches) {
    try {
      const blockText = (m[1] || '').trim();
      if (!blockText) continue;
      const block = JSON.parse(blockText);
      const nodes: any[] = Array.isArray(block)
        ? block
        : [block, ...((block && Array.isArray(block['@graph'])) ? block['@graph'] : [])];
      for (const node of nodes) {
        const t = node && node['@type'];
        if (t === 'Recipe' || (Array.isArray(t) && t.includes('Recipe'))) {
          out.push(node as RecipeJsonLd);
        }
      }
    } catch {
      // ignore malformed JSON-LD blocks
    }
  }
  return out;
}

// Social media oEmbed endpoints
const OEMBED_ENDPOINTS = {
  tiktok: 'https://www.tiktok.com/oembed',
  instagram: 'https://graph.facebook.com/v18.0/instagram_oembed',
  youtube: 'https://www.youtube.com/oembed',
  facebook: 'https://graph.facebook.com/v18.0/oembed_video'
};

// User agents for different scenarios
const USER_AGENTS = {
  desktop: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  mobile: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  bot: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
};

/**
 * Main URL content extraction function with multiple fallback strategies
 */
export async function extractUrlContent(url: string): Promise<ExtractedContent> {
  const extractionMethods: string[] = [];
  let rawText = '';
  let confidence = 0;
  let fallbackUsed = false;
  let platform: string | undefined;
  let creator: string | undefined;

  try {
    // Normalize URL
    const normalizedUrl = normalizeUrl(url);
    platform = detectPlatform(normalizedUrl);

    // Strategy 1: Try structured data extraction first
    try {
      const structuredData = await extractStructuredData(normalizedUrl);
      if (structuredData) {
        extractionMethods.push('structured-data');
        rawText = formatStructuredDataAsText(structuredData);
        confidence = 0.9;
        creator = structuredData.author;
        
        return {
          rawText,
          metadata: {
            source: normalizedUrl,
            extractionMethods,
            confidence,
            originalUrl: url,
            platform,
            creator
          },
          fallbackUsed: false
        };
      }
    } catch (error) {
      console.warn('[URLExtractor] Structured data extraction failed:', error);
    }

    // Strategy 2: Try social media caption extraction
    if (platform && ['tiktok', 'instagram', 'youtube', 'facebook'].includes(platform)) {
      try {
        const caption = await extractVideoCaption(normalizedUrl, platform);
        if (caption) {
          extractionMethods.push('video-caption');
          rawText = caption;
          confidence = 0.7;
          
          return {
            rawText,
            metadata: {
              source: normalizedUrl,
              extractionMethods,
              confidence,
              originalUrl: url,
              platform,
              creator
            },
            fallbackUsed: false
          };
        }
      } catch (error) {
        console.warn('[URLExtractor] Video caption extraction failed:', error);
      }
    }

    // Strategy 3: Try direct HTML scraping with multiple user agents
    const userAgents = [USER_AGENTS.desktop, USER_AGENTS.mobile, USER_AGENTS.bot];
    
    for (const userAgent of userAgents) {
      try {
        const html = await fetchWithUserAgent(normalizedUrl, userAgent);
        if (html) {
          const extracted = extractFromHtml(html, normalizedUrl);
          if (extracted.content) {
            extractionMethods.push(`html-scraping-${userAgent === USER_AGENTS.desktop ? 'desktop' : userAgent === USER_AGENTS.mobile ? 'mobile' : 'bot'}`);
            rawText = extracted.content;
            confidence = extracted.confidence;
            creator = extracted.author;
            
            return {
              rawText,
              metadata: {
                source: normalizedUrl,
                extractionMethods,
                confidence,
                originalUrl: url,
                platform,
                creator
              },
              fallbackUsed: false
            };
          }
        }
      } catch (error) {
        console.warn(`[URLExtractor] HTML scraping failed with ${userAgent}:`, error);
      }
    }

    // Strategy 4: Try reader proxy services
    const readerServices = [
      'https://r.jina.ai/',
      'https://mercury.postlight.com/parser'
    ];

    for (const readerService of readerServices) {
      try {
        const content = await extractWithReaderService(normalizedUrl, readerService);
        if (content) {
          extractionMethods.push(`reader-proxy-${readerService.includes('jina') ? 'jina' : 'mercury'}`);
          rawText = content;
          confidence = 0.6;
          fallbackUsed = true;
          
          return {
            rawText,
            metadata: {
              source: normalizedUrl,
              extractionMethods,
              confidence,
              originalUrl: url,
              platform,
              creator
            },
            fallbackUsed: true
          };
        }
      } catch (error) {
        console.warn(`[URLExtractor] Reader service ${readerService} failed:`, error);
      }
    }

    // Strategy 5: Last resort - return URL for AI processing
    extractionMethods.push('url-only');
    rawText = `URL: ${normalizedUrl}\nPlatform: ${platform || 'unknown'}\nPlease extract recipe information if you recognize this URL format.`;
    confidence = 0.3;
    fallbackUsed = true;

    return {
      rawText,
      metadata: {
        source: normalizedUrl,
        extractionMethods,
        confidence,
        originalUrl: url,
        platform,
        creator
      },
      fallbackUsed: true
    };

  } catch (error) {
    console.error('[URLExtractor] All extraction methods failed:', error);
    throw new Error(`Failed to extract content from URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Normalizes URL for consistent processing
 */
function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    
    // Remove tracking parameters
    const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid'];
    trackingParams.forEach(param => parsed.searchParams.delete(param));
    
    return parsed.toString();
  } catch {
    return url;
  }
}

/**
 * Detects platform from URL
 */
function detectPlatform(url: string): string | undefined {
  try {
    const hostname = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
    
    if (hostname.includes('tiktok.com') || hostname.includes('vm.tiktok.com')) return 'tiktok';
    if (hostname.includes('instagram.com')) return 'instagram';
    if (hostname.includes('youtube.com') || hostname === 'youtu.be') return 'youtube';
    if (hostname.includes('facebook.com') || hostname === 'fb.watch') return 'facebook';
    if (hostname.includes('pinterest.com') || hostname === 'pin.it') return 'pinterest';
    
    // Recipe sites
    if (hostname.includes('allrecipes.com')) return 'allrecipes';
    if (hostname.includes('foodnetwork.com')) return 'foodnetwork';
    if (hostname.includes('epicurious.com')) return 'epicurious';
    if (hostname.includes('bonappetit.com')) return 'bonappetit';
    if (hostname.includes('seriouseats.com')) return 'seriouseats';
    
    return undefined;
  } catch {
    return undefined;
  }
}

/**
 * Extracts structured recipe data from JSON-LD and microdata
 */
async function extractStructuredData(url: string): Promise<StructuredRecipeData | null> {
  try {
    const html = await fetchWithUserAgent(url, USER_AGENTS.bot);
    if (!html) return null;

    const doc = new DOMParser().parseFromString(html, 'text/html');
    
    // Try JSON-LD first
    const jsonLdData = extractJsonLd(doc);
    if (jsonLdData) return jsonLdData;
    
    // Try microdata
    const microdataData = extractMicrodata(doc);
    if (microdataData) return microdataData;
    
    // Try OpenGraph + structured selectors
    const ogData = extractOpenGraphData(doc);
    if (ogData) return ogData;
    
    return null;
  } catch (error) {
    console.warn('[URLExtractor] Structured data extraction error:', error);
    return null;
  }
}

/**
 * Extracts JSON-LD structured data
 */
function extractJsonLd(doc: Document): StructuredRecipeData | null {
  const scripts = Array.from(doc.querySelectorAll('script[type="application/ld+json"]'));
  
  for (const script of scripts) {
    try {
      const data = JSON.parse(script.textContent || '{}');
      const recipes = findRecipeInJsonLd(data);
      
      if (recipes.length > 0) {
        const recipe = recipes[0]; // Take the first recipe found
        
        return {
          name: recipe.name || 'Imported Recipe',
          description: recipe.description,
          imageUrl: Array.isArray(recipe.image) ? recipe.image[0] : recipe.image,
          ingredients: Array.isArray(recipe.recipeIngredient) ? recipe.recipeIngredient : [],
          instructions: extractInstructions(recipe.recipeInstructions),
          prepTime: parseISO8601Duration(recipe.prepTime),
          cookTime: parseISO8601Duration(recipe.cookTime),
          servings: parseServings(recipe.recipeYield),
          keywords: parseKeywords(recipe.keywords),
          author: recipe.author?.name || recipe.author,
          datePublished: recipe.datePublished,
          nutrition: recipe.nutrition ? {
            calories: recipe.nutrition.calories,
            protein: recipe.nutrition.proteinContent,
            carbs: recipe.nutrition.carbohydrateContent,
            fat: recipe.nutrition.fatContent
          } : undefined
        };
      }
    } catch (error) {
      console.warn('[URLExtractor] JSON-LD parsing error:', error);
    }
  }
  
  return null;
}

/**
 * Recursively finds Recipe objects in JSON-LD data
 */
function findRecipeInJsonLd(data: any): any[] {
  const recipes: any[] = [];
  
  function traverse(obj: any) {
    if (!obj || typeof obj !== 'object') return;
    
    if (Array.isArray(obj)) {
      obj.forEach(traverse);
      return;
    }
    
    // Check if this object is a Recipe
    const type = obj['@type'];
    if (type === 'Recipe' || (Array.isArray(type) && type.includes('Recipe'))) {
      recipes.push(obj);
    }
    
    // Check @graph property
    if (obj['@graph']) {
      traverse(obj['@graph']);
    }
    
    // Traverse other properties
    Object.values(obj).forEach(traverse);
  }
  
  traverse(data);
  return recipes;
}

/**
 * Extracts microdata structured data
 */
function extractMicrodata(doc: Document): StructuredRecipeData | null {
  const recipeElements = doc.querySelectorAll('[itemtype*="Recipe"]');
  
  if (recipeElements.length === 0) return null;
  
  const recipe = recipeElements[0];
  
  return {
    name: getItempropValue(recipe, 'name') || 'Imported Recipe',
    description: getItempropValue(recipe, 'description'),
    imageUrl: getItempropValue(recipe, 'image'),
    ingredients: getItempropValues(recipe, 'recipeIngredient'),
    instructions: getItempropValues(recipe, 'recipeInstructions'),
    prepTime: parseISO8601Duration(getItempropValue(recipe, 'prepTime')),
    cookTime: parseISO8601Duration(getItempropValue(recipe, 'cookTime')),
    servings: parseServings(getItempropValue(recipe, 'recipeYield')),
    keywords: parseKeywords(getItempropValue(recipe, 'keywords')),
    author: getItempropValue(recipe, 'author')
  };
}

/**
 * Extracts OpenGraph data as fallback
 */
function extractOpenGraphData(doc: Document): StructuredRecipeData | null {
  const title = doc.querySelector('meta[property="og:title"]')?.getAttribute('content');
  const description = doc.querySelector('meta[property="og:description"]')?.getAttribute('content');
  const image = doc.querySelector('meta[property="og:image"]')?.getAttribute('content');
  
  if (!title) return null;
  
  // Try to find ingredients and instructions using common selectors
  const ingredients = extractBySelectors(doc, [
    '[itemprop="recipeIngredient"]',
    '.recipe-ingredient',
    '.ingredients li',
    'li.ingredient'
  ]);
  
  const instructions = extractBySelectors(doc, [
    '[itemprop="recipeInstructions"]',
    '.recipe-instruction',
    '.instructions li',
    '.method li',
    '.directions li'
  ]);
  
  if (ingredients.length === 0 && instructions.length === 0) return null;
  
  return {
    name: title || 'Imported Recipe',
    description: description ?? undefined,
    imageUrl: image ?? undefined,
    ingredients,
    instructions,
    keywords: []
  };
}

/**
 * Extracts video captions from social media platforms
 */
async function extractVideoCaption(url: string, platform: string): Promise<string | null> {
  try {
    switch (platform) {
      case 'tiktok':
        return await extractTikTokCaption(url);
      case 'instagram':
        return await extractInstagramCaption(url);
      case 'youtube':
        return await extractYouTubeCaption(url);
      default:
        return null;
    }
  } catch (error) {
    console.warn(`[URLExtractor] ${platform} caption extraction failed:`, error);
    return null;
  }
}

/**
 * Extracts TikTok video caption
 */
async function extractTikTokCaption(url: string): Promise<string | null> {
  try {
    // Try oEmbed first
    const oembedUrl = `${OEMBED_ENDPOINTS.tiktok}?url=${encodeURIComponent(url)}`;
    const response = await fetch(oembedUrl);
    
    if (response.ok) {
      const data = await response.json();
      return data.title || null;
    }
    
    // Fallback to HTML scraping
    const html = await fetchWithUserAgent(url, USER_AGENTS.mobile);
    if (html) {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      
      // Try various selectors for TikTok captions
      const selectors = [
        '[data-e2e="browse-video-desc"]',
        '.video-meta-caption',
        'meta[property="og:description"]'
      ];
      
      for (const selector of selectors) {
        const element = doc.querySelector(selector);
        if (element) {
          const content = element.textContent || element.getAttribute('content');
          if (content && content.trim()) {
            return content.trim();
          }
        }
      }
    }
    
    return null;
  } catch (error) {
    console.warn('[URLExtractor] TikTok caption extraction failed:', error);
    return null;
  }
}

/**
 * Extracts Instagram caption
 */
async function extractInstagramCaption(url: string): Promise<string | null> {
  try {
    const html = await fetchWithUserAgent(url, USER_AGENTS.mobile);
    if (!html) return null;
    
    const doc = new DOMParser().parseFromString(html, 'text/html');
    
    // Try various selectors for Instagram captions
    const selectors = [
      'meta[property="og:description"]',
      'meta[name="description"]',
      '[data-testid="post-caption"]'
    ];
    
    for (const selector of selectors) {
      const element = doc.querySelector(selector);
      if (element) {
        const content = element.textContent || element.getAttribute('content');
        if (content && content.trim()) {
          return content.trim();
        }
      }
    }
    
    return null;
  } catch (error) {
    console.warn('[URLExtractor] Instagram caption extraction failed:', error);
    return null;
  }
}

/**
 * Extracts YouTube video description
 */
async function extractYouTubeCaption(url: string): Promise<string | null> {
  try {
    // Try oEmbed first
    const oembedUrl = `${OEMBED_ENDPOINTS.youtube}?url=${encodeURIComponent(url)}&format=json`;
    const response = await fetch(oembedUrl);
    
    if (response.ok) {
      const data = await response.json();
      return data.title || null;
    }
    
    // Fallback to HTML scraping
    const html = await fetchWithUserAgent(url, USER_AGENTS.desktop);
    if (html) {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      
      const description = doc.querySelector('meta[name="description"]')?.getAttribute('content');
      if (description && description.trim()) {
        return description.trim();
      }
    }
    
    return null;
  } catch (error) {
    console.warn('[URLExtractor] YouTube caption extraction failed:', error);
    return null;
  }
}

/**
 * Fetches HTML with specified user agent
 */
async function fetchWithUserAgent(url: string, userAgent: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    });
    
    if (response.ok) {
      return await response.text();
    }
    
    return null;
  } catch (error) {
    console.warn('[URLExtractor] Fetch failed:', error);
    return null;
  }
}

/**
 * Extracts content from HTML using various strategies
 */
function extractFromHtml(html: string, url: string): { content: string; confidence: number; author?: string } {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  
  // Try structured extraction first
  const structured = extractStructuredData(url);
  if (structured) {
    return {
      content: formatStructuredDataAsText(structured as any),
      confidence: 0.9,
      author: (structured as any).author
    };
  }
  
  // Extract by common recipe selectors
  const ingredients = extractBySelectors(doc, [
    '[itemprop="recipeIngredient"]',
    '.recipe-ingredient',
    '.ingredients li',
    'li.ingredient',
    '.ingredient-list li'
  ]);
  
  const instructions = extractBySelectors(doc, [
    '[itemprop="recipeInstructions"]',
    '.recipe-instruction',
    '.instructions li',
    '.method li',
    '.directions li',
    '.recipe-directions li'
  ]);
  
  if (ingredients.length > 0 || instructions.length > 0) {
    const title = doc.querySelector('h1')?.textContent?.trim() || 
                  doc.querySelector('meta[property="og:title"]')?.getAttribute('content') || 
                  doc.title;
    
    let content = title ? `${title}\n\n` : '';
    
    if (ingredients.length > 0) {
      content += 'Ingredients:\n' + ingredients.map(ing => `- ${ing}`).join('\n') + '\n\n';
    }
    
    if (instructions.length > 0) {
      content += 'Instructions:\n' + instructions.map((inst, idx) => `${idx + 1}. ${inst}`).join('\n');
    }
    
    return {
      content,
      confidence: 0.8,
      author: doc.querySelector('[itemprop="author"]')?.textContent?.trim()
    };
  }
  
  // Fallback to main content extraction
  const mainContent = extractMainContent(doc);
  return {
    content: mainContent,
    confidence: 0.5
  };
}

/**
 * Extracts content using reader proxy services
 */
async function extractWithReaderService(url: string, readerService: string): Promise<string | null> {
  try {
    let readerUrl: string;
    
    if (readerService.includes('jina')) {
      readerUrl = `${readerService}${url}`;
    } else {
      readerUrl = `${readerService}?url=${encodeURIComponent(url)}`;
    }
    
    const response = await fetch(readerUrl);
    if (response.ok) {
      const data = await response.text();
      return data;
    }
    
    return null;
  } catch (error) {
    console.warn('[URLExtractor] Reader service failed:', error);
    return null;
  }
}

// Helper functions

function getItempropValue(element: Element, prop: string): string | undefined {
  const el = element.querySelector(`[itemprop="${prop}"]`);
  return el?.textContent?.trim() || el?.getAttribute('content') || undefined;
}

function getItempropValues(element: Element, prop: string): string[] {
  const elements = element.querySelectorAll(`[itemprop="${prop}"]`);
  return Array.from(elements).map(el => el.textContent?.trim() || '').filter(Boolean);
}

function extractBySelectors(doc: Document, selectors: string[]): string[] {
  for (const selector of selectors) {
    const elements = doc.querySelectorAll(selector);
    if (elements.length > 0) {
      return Array.from(elements).map(el => el.textContent?.trim() || '').filter(Boolean);
    }
  }
  return [];
}

function extractInstructions(instructions: any): string[] {
  if (!instructions) return [];
  if (typeof instructions === 'string') return [instructions];
  if (!Array.isArray(instructions)) return [];
  
  return instructions.flatMap(instruction => {
    if (typeof instruction === 'string') return [instruction];
    if (instruction.text) return [instruction.text];
    if (instruction.name) return [instruction.name];
    if (Array.isArray(instruction)) return extractInstructions(instruction);
    return [];
  }).filter(Boolean);
}

function parseISO8601Duration(duration?: string): number | undefined {
  if (!duration) return undefined;
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return undefined;
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  return hours * 60 + minutes;
}

function parseServings(yield_?: any): number | undefined {
  if (!yield_) return undefined;
  if (typeof yield_ === 'number') return yield_;
  if (typeof yield_ === 'string') {
    const match = yield_.match(/\d+/);
    return match ? parseInt(match[0], 10) : undefined;
  }
  return undefined;
}

function parseKeywords(keywords?: any): string[] {
  if (!keywords) return [];
  if (typeof keywords === 'string') {
    return keywords.split(',').map(k => k.trim()).filter(Boolean);
  }
  if (Array.isArray(keywords)) {
    return keywords.map(k => String(k).trim()).filter(Boolean);
  }
  return [];
}

function formatStructuredDataAsText(data: StructuredRecipeData): string {
  let text = `${data.name}\n\n`;
  
  if (data.description) {
    text += `${data.description}\n\n`;
  }
  
  if (data.ingredients.length > 0) {
    text += 'Ingredients:\n';
    text += data.ingredients.map(ing => `- ${ing}`).join('\n') + '\n\n';
  }
  
  if (data.instructions.length > 0) {
    text += 'Instructions:\n';
    text += data.instructions.map((inst, idx) => `${idx + 1}. ${inst}`).join('\n') + '\n\n';
  }
  
  const metadata: string[] = [];
  if (data.prepTime) metadata.push(`Prep time: ${data.prepTime} minutes`);
  if (data.cookTime) metadata.push(`Cook time: ${data.cookTime} minutes`);
  if (data.servings) metadata.push(`Serves: ${data.servings}`);
  
  if (metadata.length > 0) {
    text += metadata.join(' | ') + '\n\n';
  }
  
  if (data.keywords && data.keywords.length > 0) {
    text += `Tags: ${data.keywords.join(', ')}\n`;
  }
  
  return text.trim();
}

function extractMainContent(doc: Document): string {
  // Try common content selectors
  const contentSelectors = [
    'main',
    '[role="main"]',
    '.main-content',
    '.content',
    '.post-content',
    '.entry-content',
    'article',
    '.recipe-content'
  ];
  
  for (const selector of contentSelectors) {
    const element = doc.querySelector(selector);
    if (element) {
      const text = element.textContent?.trim();
      if (text && text.length > 100) {
        return text;
      }
    }
  }
  
  // Fallback to body content
  return doc.body?.textContent?.trim() || '';
}