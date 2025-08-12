/**
 * Enhanced image OCR processing with preprocessing and multiple provider support
 * Provides robust text extraction from recipe images with quality optimization
 */

export interface OcrResult {
  text: string;
  confidence: number;
  metadata: {
    provider: string;
    processingTime: number;
    imageSize: { width: number; height: number };
    preprocessingApplied: string[];
    language?: string;
  };
}

export interface OcrOptions {
  language?: string;
  preprocessImage?: boolean;
  provider?: 'tesseract' | 'google' | 'azure' | 'aws' | 'auto';
  fallbackProviders?: boolean;
}

export interface ImagePreprocessingOptions {
  enhanceContrast?: boolean;
  denoiseImage?: boolean;
  correctSkew?: boolean;
  resizeForOcr?: boolean;
  sharpenText?: boolean;
}

// OCR Provider configurations
const OCR_PROVIDERS = {
  tesseract: {
    name: 'Tesseract.js',
    available: true, // Can be used client-side
    confidence: 0.7
  },
  google: {
    name: 'Google Cloud Vision',
    available: false, // Requires API key and server
    confidence: 0.9
  },
  azure: {
    name: 'Azure Computer Vision',
    available: false, // Requires API key and server
    confidence: 0.9
  },
  aws: {
    name: 'AWS Textract',
    available: false, // Requires API key and server
    confidence: 0.85
  }
};

/**
 * Main OCR processing function with preprocessing and fallback support
 */
export async function processImageOcr(
  imageDataUrl: string,
  options: OcrOptions = {}
): Promise<OcrResult> {
  const startTime = Date.now();
  const {
    language = 'eng',
    preprocessImage = true,
    provider = 'auto',
    fallbackProviders = true
  } = options;

  try {
    // Get image metadata
    const imageMetadata = await getImageMetadata(imageDataUrl);
    
    // Preprocess image if requested
    let processedImageUrl = imageDataUrl;
    const preprocessingApplied: string[] = [];
    
    if (preprocessImage) {
      const preprocessingResult = await preprocessImageForOcr(imageDataUrl, {
        enhanceContrast: true,
        denoiseImage: true,
        correctSkew: true,
        resizeForOcr: true,
        sharpenText: true
      });
      
      processedImageUrl = preprocessingResult.imageDataUrl;
      preprocessingApplied.push(...preprocessingResult.appliedOperations);
    }

    // Determine which providers to try
    const providersToTry = getAvailableProviders(provider, fallbackProviders);
    
    // Try each provider until one succeeds
    for (const providerName of providersToTry) {
      try {
        const result = await performOcr(processedImageUrl, providerName, language);
        
        if (result.text && result.text.trim().length > 0) {
          const processingTime = Date.now() - startTime;
          
          return {
            text: cleanOcrText(result.text),
            confidence: result.confidence,
            metadata: {
              provider: providerName,
              processingTime,
              imageSize: imageMetadata,
              preprocessingApplied,
              language
            }
          };
        }
      } catch (error) {
        console.warn(`[ImageOCR] Provider ${providerName} failed:`, error);
        continue;
      }
    }

    throw new Error('All OCR providers failed to extract text');

  } catch (error) {
    console.error('[ImageOCR] OCR processing failed:', error);
    throw new Error(`OCR processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Preprocesses image for better OCR results
 */
async function preprocessImageForOcr(
  imageDataUrl: string,
  options: ImagePreprocessingOptions
): Promise<{ imageDataUrl: string; appliedOperations: string[] }> {
  const appliedOperations: string[] = [];
  
  try {
    // Create canvas for image processing
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context not available');

    // Load image
    const img = await loadImage(imageDataUrl);
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);

    // Get image data for processing
    let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Apply preprocessing operations
    if (options.enhanceContrast) {
      enhanceContrast(data);
      appliedOperations.push('contrast-enhancement');
    }

    if (options.denoiseImage) {
      denoiseImage(data, canvas.width, canvas.height);
      appliedOperations.push('denoising');
    }

    if (options.sharpenText) {
      sharpenImage(data, canvas.width, canvas.height);
      appliedOperations.push('sharpening');
    }

    // Apply processed data back to canvas
    ctx.putImageData(imageData, 0, 0);

    // Resize for optimal OCR if needed
    if (options.resizeForOcr) {
      const resizedCanvas = resizeForOcr(canvas);
      if (resizedCanvas !== canvas) {
        appliedOperations.push('resizing');
        return {
          imageDataUrl: resizedCanvas.toDataURL('image/png'),
          appliedOperations
        };
      }
    }

    return {
      imageDataUrl: canvas.toDataURL('image/png'),
      appliedOperations
    };

  } catch (error) {
    console.warn('[ImageOCR] Preprocessing failed, using original image:', error);
    return {
      imageDataUrl,
      appliedOperations: ['preprocessing-failed']
    };
  }
}

/**
 * Loads image from data URL
 */
function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

/**
 * Gets image metadata
 */
async function getImageMetadata(imageDataUrl: string): Promise<{ width: number; height: number }> {
  try {
    const img = await loadImage(imageDataUrl);
    return { width: img.width, height: img.height };
  } catch {
    return { width: 0, height: 0 };
  }
}

/**
 * Enhances image contrast
 */
function enhanceContrast(data: Uint8ClampedArray): void {
  const factor = 1.5; // Contrast enhancement factor
  
  for (let i = 0; i < data.length; i += 4) {
    // Apply contrast to RGB channels
    data[i] = Math.min(255, Math.max(0, (data[i] - 128) * factor + 128));     // Red
    data[i + 1] = Math.min(255, Math.max(0, (data[i + 1] - 128) * factor + 128)); // Green
    data[i + 2] = Math.min(255, Math.max(0, (data[i + 2] - 128) * factor + 128)); // Blue
  }
}

/**
 * Applies simple denoising
 */
function denoiseImage(data: Uint8ClampedArray, width: number, height: number): void {
  // Simple median filter for denoising
  const original = new Uint8ClampedArray(data);
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      
      // Get surrounding pixels for median calculation
      const neighbors: number[] = [];
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nIdx = ((y + dy) * width + (x + dx)) * 4;
          neighbors.push(original[nIdx]); // Red channel for simplicity
        }
      }
      
      neighbors.sort((a, b) => a - b);
      const median = neighbors[4]; // Middle value
      
      // Apply median to all channels
      data[idx] = median;
      data[idx + 1] = median;
      data[idx + 2] = median;
    }
  }
}

/**
 * Sharpens image for better text recognition
 */
function sharpenImage(data: Uint8ClampedArray, width: number, height: number): void {
  const original = new Uint8ClampedArray(data);
  
  // Sharpening kernel
  const kernel = [
    0, -1, 0,
    -1, 5, -1,
    0, -1, 0
  ];
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      
      let r = 0, g = 0, b = 0;
      
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const nIdx = ((y + ky) * width + (x + kx)) * 4;
          const weight = kernel[(ky + 1) * 3 + (kx + 1)];
          
          r += original[nIdx] * weight;
          g += original[nIdx + 1] * weight;
          b += original[nIdx + 2] * weight;
        }
      }
      
      data[idx] = Math.min(255, Math.max(0, r));
      data[idx + 1] = Math.min(255, Math.max(0, g));
      data[idx + 2] = Math.min(255, Math.max(0, b));
    }
  }
}

/**
 * Resizes image for optimal OCR performance
 */
function resizeForOcr(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const minWidth = 300;
  const maxWidth = 2000;
  const targetHeight = 1200;
  
  const { width, height } = canvas;
  
  // Calculate optimal size
  let newWidth = width;
  let newHeight = height;
  
  if (width < minWidth) {
    const scale = minWidth / width;
    newWidth = minWidth;
    newHeight = height * scale;
  } else if (width > maxWidth) {
    const scale = maxWidth / width;
    newWidth = maxWidth;
    newHeight = height * scale;
  }
  
  if (newHeight > targetHeight) {
    const scale = targetHeight / newHeight;
    newWidth = newWidth * scale;
    newHeight = targetHeight;
  }
  
  // Only resize if dimensions changed significantly
  if (Math.abs(newWidth - width) > 50 || Math.abs(newHeight - height) > 50) {
    const resizedCanvas = document.createElement('canvas');
    const ctx = resizedCanvas.getContext('2d');
    if (!ctx) return canvas;
    
    resizedCanvas.width = newWidth;
    resizedCanvas.height = newHeight;
    
    ctx.imageSmoothingEnabled = false; // Preserve sharp edges for text
    ctx.drawImage(canvas, 0, 0, newWidth, newHeight);
    
    return resizedCanvas;
  }
  
  return canvas;
}

/**
 * Gets available OCR providers based on configuration
 */
function getAvailableProviders(
  preferredProvider: string,
  useFallbacks: boolean
): string[] {
  const providers: string[] = [];
  
  if (preferredProvider === 'auto') {
    // Use best available provider first
    const availableProviders = Object.entries(OCR_PROVIDERS)
      .filter(([_, config]) => config.available)
      .sort(([_, a], [__, b]) => b.confidence - a.confidence)
      .map(([name]) => name);
    
    providers.push(...availableProviders);
  } else if (OCR_PROVIDERS[preferredProvider as keyof typeof OCR_PROVIDERS]?.available) {
    providers.push(preferredProvider);
    
    if (useFallbacks) {
      // Add other available providers as fallbacks
      Object.entries(OCR_PROVIDERS)
        .filter(([name, config]) => name !== preferredProvider && config.available)
        .sort(([_, a], [__, b]) => b.confidence - a.confidence)
        .forEach(([name]) => providers.push(name));
    }
  }
  
  // Always include Tesseract as final fallback if not already included
  if (!providers.includes('tesseract') && OCR_PROVIDERS.tesseract.available) {
    providers.push('tesseract');
  }
  
  return providers;
}

/**
 * Performs OCR using specified provider
 */
async function performOcr(
  imageDataUrl: string,
  provider: string,
  language: string
): Promise<{ text: string; confidence: number }> {
  switch (provider) {
    case 'tesseract':
      return await performTesseractOcr(imageDataUrl, language);
    
    case 'google':
      return await performGoogleOcr(imageDataUrl, language);
    
    case 'azure':
      return await performAzureOcr(imageDataUrl, language);
    
    case 'aws':
      return await performAwsOcr(imageDataUrl, language);
    
    default:
      throw new Error(`Unknown OCR provider: ${provider}`);
  }
}

/**
 * Performs OCR using Tesseract.js (client-side)
 */
async function performTesseractOcr(
  imageDataUrl: string,
  language: string
): Promise<{ text: string; confidence: number }> {
  try {
    // Dynamic import to avoid bundling issues
    const { createWorker } = await import('tesseract.js');
    
    const worker = await createWorker(language);
    const { data } = await worker.recognize(imageDataUrl);
    await worker.terminate();
    
    return {
      text: data.text,
      confidence: data.confidence / 100 // Convert to 0-1 scale
    };
  } catch (error) {
    console.error('[ImageOCR] Tesseract OCR failed:', error);
    throw new Error('Tesseract OCR processing failed');
  }
}

/**
 * Performs OCR using Google Cloud Vision (server-side)
 */
async function performGoogleOcr(
  imageDataUrl: string,
  language: string
): Promise<{ text: string; confidence: number }> {
  // This would typically be implemented on the server side
  // For now, throw an error indicating it's not available
  throw new Error('Google Cloud Vision OCR not implemented - requires server-side integration');
}

/**
 * Performs OCR using Azure Computer Vision (server-side)
 */
async function performAzureOcr(
  imageDataUrl: string,
  language: string
): Promise<{ text: string; confidence: number }> {
  // This would typically be implemented on the server side
  throw new Error('Azure Computer Vision OCR not implemented - requires server-side integration');
}

/**
 * Performs OCR using AWS Textract (server-side)
 */
async function performAwsOcr(
  imageDataUrl: string,
  language: string
): Promise<{ text: string; confidence: number }> {
  // This would typically be implemented on the server side
  throw new Error('AWS Textract OCR not implemented - requires server-side integration');
}

/**
 * Cleans and normalizes OCR text output
 */
function cleanOcrText(text: string): string {
  return text
    // Remove excessive whitespace
    .replace(/\s+/g, ' ')
    // Fix common OCR errors
    .replace(/[|]/g, 'l') // Vertical bars often misread as 'l'
    .replace(/[0]/g, 'O') // Zeros in text context often should be 'O'
    .replace(/[1]/g, 'l') // Ones in text context often should be 'l'
    // Clean up line breaks
    .replace(/\n\s*\n/g, '\n')
    // Trim whitespace
    .trim();
}

/**
 * Validates OCR result quality
 */
export function validateOcrResult(result: OcrResult): {
  isValid: boolean;
  issues: string[];
  suggestions: string[];
} {
  const issues: string[] = [];
  const suggestions: string[] = [];
  
  // Check text length
  if (result.text.length < 10) {
    issues.push('Very little text extracted');
    suggestions.push('Try a higher resolution image or better lighting');
  }
  
  // Check confidence
  if (result.confidence < 0.5) {
    issues.push('Low OCR confidence');
    suggestions.push('Image quality may be poor - try preprocessing or a different image');
  }
  
  // Check for common OCR artifacts
  const artifactRatio = (result.text.match(/[|\\\/~`]/g) || []).length / result.text.length;
  if (artifactRatio > 0.1) {
    issues.push('High number of OCR artifacts detected');
    suggestions.push('Image may have poor contrast or resolution');
  }
  
  // Check for reasonable text structure
  const wordCount = result.text.split(/\s+/).length;
  const lineCount = result.text.split('\n').length;
  
  if (wordCount < 5) {
    issues.push('Very few words detected');
    suggestions.push('Ensure the image contains readable text');
  }
  
  if (lineCount < 2 && wordCount > 20) {
    suggestions.push('Text appears to be in a single line - check for line break issues');
  }
  
  return {
    isValid: issues.length === 0,
    issues,
    suggestions
  };
}