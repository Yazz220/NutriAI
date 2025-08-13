/**
 * Enhanced input detection and validation system for recipe imports
 * Provides robust input type detection with confidence scoring and platform-specific recognition
 */

export type InputType = 'url' | 'text' | 'image' | 'video';

export interface DetectionResult {
  type: InputType;
  confidence: number;
  metadata: {
    platform?: string;
    fileType?: string;
    size?: number;
    isVideoUrl?: boolean;
    isSocialMedia?: boolean;
    // Extended analysis fields used by validators/tests
    hasRecipeStructure?: boolean;
    bulletPoints?: number;
    numberedSteps?: number;
    measurements?: number;
    lineCount?: number;
  };
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Platform detection patterns
const PLATFORM_PATTERNS = {
  tiktok: [
    /(?:https?:\/\/)?(?:www\.)?(?:vm\.)?tiktok\.com/i,
    /(?:https?:\/\/)?(?:www\.)?tiktok\.com\/.*\/video\//i,
    /(?:https?:\/\/)?vm\.tiktok\.com\/[A-Za-z0-9]+/i
  ],
  instagram: [
    /(?:https?:\/\/)?(?:www\.)?instagram\.com\/(?:p|reel|reels)\//i,
    /(?:https?:\/\/)?(?:www\.)?instagram\.com\/stories\//i
  ],
  youtube: [
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=/i,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\//i,
    /(?:https?:\/\/)?youtu\.be\/[A-Za-z0-9_-]+/i
  ],
  facebook: [
    /(?:https?:\/\/)?(?:www\.)?facebook\.com\/.*\/videos\//i,
    /(?:https?:\/\/)?(?:www\.)?facebook\.com\/watch\//i,
    /(?:https?:\/\/)?fb\.watch\/[A-Za-z0-9]+/i
  ],
  pinterest: [
    /(?:https?:\/\/)?(?:www\.)?pinterest\.com\/pin\//i,
    /(?:https?:\/\/)?pin\.it\/[A-Za-z0-9]+/i
  ]
};

// Video URL patterns for social media platforms
const VIDEO_URL_PATTERNS = [
  ...PLATFORM_PATTERNS.tiktok,
  ...PLATFORM_PATTERNS.instagram.filter(p => p.source.includes('reel')),
  ...PLATFORM_PATTERNS.youtube,
  ...PLATFORM_PATTERNS.facebook
];

// Image file extensions
const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif', 'gif', 'bmp'];

// Video file extensions
const VIDEO_EXTENSIONS = ['mp4', 'mov', 'avi', 'webm', 'm4v', 'mkv', '3gp'];

// Common recipe website patterns
const RECIPE_SITE_PATTERNS = [
  /allrecipes\.com/i,
  /foodnetwork\.com/i,
  /epicurious\.com/i,
  /bonappetit\.com/i,
  /seriouseats\.com/i,
  /food\.com/i,
  /delish\.com/i,
  /tasteofhome\.com/i,
  /cooking\.nytimes\.com/i,
  /recipe/i,
  /recipes/i
];

/**
 * Detects the input type with confidence scoring
 */
export function detectInputType(input: string | File): DetectionResult {
  // Handle File objects (images/videos)
  if (typeof input !== 'string') {
    return detectFileType(input);
  }

  const trimmedInput = input.trim();
  
  // Empty input
  if (!trimmedInput) {
    return {
      type: 'text',
      confidence: 0,
      metadata: {}
    };
  }

  // Try URL detection first
  const urlResult = detectUrlType(trimmedInput);
  if (urlResult.confidence > 0.7) {
    return urlResult;
  }

  // Check if it looks like structured recipe text
  const textResult = detectTextType(trimmedInput);
  return textResult;
}

/**
 * Detects URL type and platform
 */
function detectUrlType(input: string): DetectionResult {
  let url: URL;
  
  try {
    // Try parsing as-is first
    url = new URL(input);
  } catch {
    try {
      // Try adding https:// prefix
      url = new URL(`https://${input}`);
    } catch {
      // Not a valid URL
      return {
        type: 'text',
        confidence: 0,
        metadata: {}
      };
    }
  }

  const hostname = url.hostname.toLowerCase().replace(/^www\./, '');
  const pathname = url.pathname;
  const fullUrl = url.toString();

  // Check for video platforms
  for (const [platform, patterns] of Object.entries(PLATFORM_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(fullUrl)) {
        const isVideoUrl = VIDEO_URL_PATTERNS.some(p => p.test(fullUrl));
        return {
          type: 'url',
          confidence: 0.95,
          metadata: {
            platform,
            isVideoUrl,
            isSocialMedia: ['tiktok', 'instagram', 'youtube', 'facebook'].includes(platform)
          }
        };
      }
    }
  }

  // Check for recipe websites
  const isRecipeSite = RECIPE_SITE_PATTERNS.some(pattern => 
    pattern.test(hostname) || pattern.test(pathname)
  );

  if (isRecipeSite) {
    return {
      type: 'url',
      confidence: 0.9,
      metadata: {
        platform: 'recipe-site',
        isVideoUrl: false,
        isSocialMedia: false
      }
    };
  }

  // Generic URL
  return {
    type: 'url',
    confidence: 0.8,
    metadata: {
      platform: 'generic',
      isVideoUrl: false,
      isSocialMedia: false
    }
  };
}

/**
 * Detects file type for uploaded files
 */
function detectFileType(file: File): DetectionResult {
  const fileName = file.name?.toLowerCase() || '';
  const mimeType = file.type?.toLowerCase() || '';
  const size = file.size || 0;

  // Check MIME type first (most reliable)
  if (mimeType.startsWith('image/')) {
    return {
      type: 'image',
      confidence: 0.95,
      metadata: {
        fileType: mimeType,
        size
      }
    };
  }

  if (mimeType.startsWith('video/')) {
    return {
      type: 'video',
      confidence: 0.95,
      metadata: {
        fileType: mimeType,
        size
      }
    };
  }

  // Fallback to file extension
  const extension = fileName.split('.').pop() || '';
  
  if (IMAGE_EXTENSIONS.includes(extension)) {
    return {
      type: 'image',
      confidence: 0.8,
      metadata: {
        fileType: `image/${extension === 'jpg' ? 'jpeg' : extension}`,
        size
      }
    };
  }

  if (VIDEO_EXTENSIONS.includes(extension)) {
    return {
      type: 'video',
      confidence: 0.8,
      metadata: {
        fileType: `video/${extension}`,
        size
      }
    };
  }

  // Unknown file type, default to image for safety
  return {
    type: 'image',
    confidence: 0.3,
    metadata: {
      fileType: 'unknown',
      size
    }
  };
}

/**
 * Detects text type and analyzes content structure
 */
function detectTextType(input: string): DetectionResult {
  const lines = input.split('\n').map(line => line.trim()).filter(Boolean);
  const text = input.toLowerCase();
  
  let confidence = 0.5; // Base confidence for text
  
  // Look for recipe-like patterns
  const recipeIndicators = [
    /ingredients?:/i,
    /directions?:/i,
    /instructions?:/i,
    /steps?:/i,
    /method:/i,
    /recipe/i,
    /serves?\s+\d+/i,
    /prep\s+time/i,
    /cook\s+time/i,
    /\d+\s+(cup|tbsp|tsp|oz|lb|kg|g|ml|liter)/i
  ];

  const matchedIndicators = recipeIndicators.filter(pattern => pattern.test(text));
  confidence += matchedIndicators.length * 0.1;

  // Check for structured list format
  const bulletPoints = lines.filter(line => /^[-•*]\s/.test(line));
  const numberedSteps = lines.filter(line => /^\d+\.?\s/.test(line));
  
  if (bulletPoints.length > 2) confidence += 0.2;
  if (numberedSteps.length > 2) confidence += 0.2;

  // Check for measurement patterns
  const measurementPattern = /\d+\s*(cup|tbsp|tsp|tablespoon|teaspoon|oz|ounce|lb|pound|kg|gram|ml|liter)/gi;
  const measurements = text.match(measurementPattern) || [];
  if (measurements.length > 2) confidence += 0.2;

  // Cap confidence at 0.95
  confidence = Math.min(confidence, 0.95);

  return {
    type: 'text',
    confidence,
    metadata: {
      lineCount: lines.length,
      hasRecipeStructure: confidence > 0.7,
      bulletPoints: bulletPoints.length,
      numberedSteps: numberedSteps.length,
      measurements: measurements.length
    }
  };
}

/**
 * Validates input based on detected type
 */
export function validateInput(input: string | File, detectionResult: DetectionResult): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  switch (detectionResult.type) {
    case 'url':
      return validateUrl(input as string, detectionResult);
    
    case 'text':
      return validateText(input as string, detectionResult);
    
    case 'image':
      return validateImage(input as File, detectionResult);
    
    case 'video':
      return validateVideo(input as File, detectionResult);
    
    default:
      errors.push('Unknown input type detected');
      return { isValid: false, errors, warnings };
  }
}

/**
 * Validates URL input
 */
function validateUrl(url: string, detection: DetectionResult): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    const parsedUrl = new URL(url.startsWith('http') ? url : `https://${url}`);
    
    // Check for HTTPS (security warning)
    if (parsedUrl.protocol === 'http:') {
      warnings.push('URL uses HTTP instead of HTTPS - some content may not be accessible');
    }

    // Platform-specific validations
    if (detection.metadata.isSocialMedia) {
      if (detection.metadata.platform === 'tiktok' && !detection.metadata.isVideoUrl) {
        warnings.push('This appears to be a TikTok profile link rather than a specific video');
      }
      
      if (detection.metadata.platform === 'instagram' && !parsedUrl.pathname.includes('/reel')) {
        warnings.push('Instagram posts work best - Reels may have better recipe content');
      }
    }

    return {
      isValid: true,
      errors,
      warnings
    };
  } catch (error) {
    errors.push('Invalid URL format');
    return {
      isValid: false,
      errors,
      warnings
    };
  }
}

/**
 * Validates text input
 */
function validateText(text: string, detection: DetectionResult): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (text.trim().length < 10) {
    errors.push('Text is too short to contain a meaningful recipe');
    return { isValid: false, errors, warnings };
  }

  if (text.length > 50000) {
    warnings.push('Text is very long - processing may take extra time');
  }

  if (detection.confidence < 0.5) {
    warnings.push('Text does not appear to contain a structured recipe - results may vary');
  }

  // Check for common issues
  if (!/ingredients?/i.test(text) && !/\d+\s*(cup|tbsp|tsp|oz|lb|kg|g|ml)/i.test(text)) {
    warnings.push('No ingredients list detected - AI will attempt to extract from context');
  }

  if (!/(?:steps?|directions?|instructions?|method)/i.test(text) && !/^\d+\./m.test(text)) {
    warnings.push('No cooking steps detected - AI will attempt to extract from context');
  }

  return {
    isValid: true,
    errors,
    warnings
  };
}

/**
 * Validates image input
 */
function validateImage(file: File, detection: DetectionResult): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const maxSize = 10 * 1024 * 1024; // 10MB
  const minSize = 1024; // 1KB

  if (detection.metadata.size && detection.metadata.size > maxSize) {
    errors.push('Image file is too large (max 10MB)');
  }

  if (detection.metadata.size && detection.metadata.size < minSize) {
    warnings.push('Image file is very small - text may be difficult to read');
  }

  if (detection.confidence < 0.8) {
    warnings.push('File type detection uncertain - ensure this is a valid image file');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validates video input
 */
function validateVideo(file: File, detection: DetectionResult): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const maxSize = 100 * 1024 * 1024; // 100MB
  const recommendedMaxSize = 50 * 1024 * 1024; // 50MB

  if (detection.metadata.size && detection.metadata.size > maxSize) {
    errors.push('Video file is too large (max 100MB)');
  }

  if (detection.metadata.size && detection.metadata.size > recommendedMaxSize) {
    warnings.push('Large video file - processing may take several minutes');
  }

  if (detection.confidence < 0.8) {
    warnings.push('File type detection uncertain - ensure this is a valid video file');
  }

  warnings.push('Video processing requires transcription - ensure video has clear audio or captions');

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Gets platform-specific extraction hints
 */
export function getPlatformHints(detection: DetectionResult): string[] {
  const hints: string[] = [];

  if (detection.type === 'url' && detection.metadata.platform) {
    switch (detection.metadata.platform) {
      case 'tiktok':
        hints.push('TikTok videos work best when they show ingredients and steps clearly');
        hints.push('Consider using the transcription feature for better accuracy');
        break;
      
      case 'instagram':
        hints.push('Instagram Reels often have recipe details in captions');
        hints.push('Screenshots of recipe cards work well too');
        break;
      
      case 'youtube':
        hints.push('YouTube videos with clear ingredient lists in description work best');
        hints.push('Cooking channels often have timestamps for ingredients');
        break;
      
      case 'recipe-site':
        hints.push('Recipe websites usually have structured data for best results');
        break;
    }
  }

  if (detection.type === 'text' && detection.confidence < 0.7) {
    hints.push('For best results, include both ingredients list and cooking steps');
    hints.push('Use clear formatting with bullet points or numbers');
  }

  if (detection.type === 'image') {
    hints.push('Ensure text is clear and well-lit for better OCR results');
    hints.push('Recipe cards and screenshots work better than photos of printed recipes');
  }

  if (detection.type === 'video') {
    hints.push('Videos with clear narration or on-screen text work best');
    hints.push('Consider extracting a screenshot if video quality is poor');
  }

  return hints;
}