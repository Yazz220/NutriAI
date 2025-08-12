/**
 * Unit tests for image OCR processor
 */

import { processImageOcr, validateOcrResult } from '../imageOcrProcessor';

// Mock Tesseract.js
jest.mock('tesseract.js', () => ({
  createWorker: jest.fn().mockResolvedValue({
    recognize: jest.fn().mockResolvedValue({
      data: {
        text: 'Mocked OCR text result',
        confidence: 85
      }
    }),
    terminate: jest.fn().mockResolvedValue(undefined)
  })
}));

// Mock DOM APIs
global.document = {
  createElement: jest.fn().mockImplementation((tagName) => {
    if (tagName === 'canvas') {
      return {
        width: 0,
        height: 0,
        getContext: jest.fn().mockReturnValue({
          drawImage: jest.fn(),
          getImageData: jest.fn().mockReturnValue({
            data: new Uint8ClampedArray(400) // 10x10 image
          }),
          putImageData: jest.fn(),
          imageSmoothingEnabled: true
        }),
        toDataURL: jest.fn().mockReturnValue('data:image/png;base64,mocked')
      };
    }
    return {};
  })
} as any;

global.Image = jest.fn().mockImplementation(() => ({
  onload: null,
  onerror: null,
  src: '',
  width: 100,
  height: 100
})) as any;

describe('Image OCR Processor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('processImageOcr', () => {
    const mockImageDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

    test('should successfully process image with Tesseract OCR', async () => {
      // Mock Image loading
      const mockImage = new Image();
      setTimeout(() => {
        if (mockImage.onload) mockImage.onload({} as Event);
      }, 0);

      const result = await processImageOcr(mockImageDataUrl, {
        provider: 'tesseract',
        preprocessImage: false
      });

      expect(result.text).toBe('Mocked OCR text result');
      expect(result.confidence).toBe(0.85);
      expect(result.metadata.provider).toBe('tesseract');
      expect(result.metadata.processingTime).toBeGreaterThan(0);
    });

    test('should apply image preprocessing when requested', async () => {
      const mockImage = new Image();
      setTimeout(() => {
        if (mockImage.onload) mockImage.onload({} as Event);
      }, 0);

      const result = await processImageOcr(mockImageDataUrl, {
        provider: 'tesseract',
        preprocessImage: true
      });

      expect(result.metadata.preprocessingApplied).toContain('contrast-enhancement');
      expect(result.metadata.preprocessingApplied).toContain('denoising');
      expect(result.metadata.preprocessingApplied).toContain('sharpening');
    });

    test('should handle auto provider selection', async () => {
      const mockImage = new Image();
      setTimeout(() => {
        if (mockImage.onload) mockImage.onload({} as Event);
      }, 0);

      const result = await processImageOcr(mockImageDataUrl, {
        provider: 'auto'
      });

      expect(result.metadata.provider).toBe('tesseract'); // Should fallback to available provider
    });

    test('should handle OCR failure gracefully', async () => {
      const { createWorker } = await import('tesseract.js');
      (createWorker as jest.Mock).mockRejectedValueOnce(new Error('OCR failed'));

      const mockImage = new Image();
      setTimeout(() => {
        if (mockImage.onload) mockImage.onload({} as Event);
      }, 0);

      await expect(processImageOcr(mockImageDataUrl, {
        provider: 'tesseract',
        fallbackProviders: false
      })).rejects.toThrow('All OCR providers failed');
    });

    test('should try fallback providers when primary fails', async () => {
      const { createWorker } = await import('tesseract.js');
      
      // First call fails, second succeeds
      (createWorker as jest.Mock)
        .mockRejectedValueOnce(new Error('First provider failed'))
        .mockResolvedValueOnce({
          recognize: jest.fn().mockResolvedValue({
            data: { text: 'Fallback OCR result', confidence: 75 }
          }),
          terminate: jest.fn().mockResolvedValue(undefined)
        });

      const mockImage = new Image();
      setTimeout(() => {
        if (mockImage.onload) mockImage.onload({} as Event);
      }, 0);

      const result = await processImageOcr(mockImageDataUrl, {
        provider: 'tesseract',
        fallbackProviders: true
      });

      expect(result.text).toBe('Fallback OCR result');
      expect(result.confidence).toBe(0.75);
    });

    test('should handle image loading failure', async () => {
      const mockImage = new Image();
      setTimeout(() => {
        if (mockImage.onerror) mockImage.onerror({} as Event);
      }, 0);

      await expect(processImageOcr(mockImageDataUrl)).rejects.toThrow('OCR processing failed');
    });

    test('should clean OCR text output', async () => {
      const { createWorker } = await import('tesseract.js');
      (createWorker as jest.Mock).mockResolvedValueOnce({
        recognize: jest.fn().mockResolvedValue({
          data: {
            text: 'Recipe   with   extra   spaces\n\n\nand|weird|characters',
            confidence: 80
          }
        }),
        terminate: jest.fn().mockResolvedValue(undefined)
      });

      const mockImage = new Image();
      setTimeout(() => {
        if (mockImage.onload) mockImage.onload({} as Event);
      }, 0);

      const result = await processImageOcr(mockImageDataUrl);

      expect(result.text).toBe('Recipe with extra spaces\nandlweirdlcharacters');
    });

    test('should handle different language options', async () => {
      const mockImage = new Image();
      setTimeout(() => {
        if (mockImage.onload) mockImage.onload({} as Event);
      }, 0);

      const result = await processImageOcr(mockImageDataUrl, {
        language: 'spa',
        provider: 'tesseract'
      });

      expect(result.metadata.language).toBe('spa');
    });

    test('should throw error for unavailable providers', async () => {
      const mockImage = new Image();
      setTimeout(() => {
        if (mockImage.onload) mockImage.onload({} as Event);
      }, 0);

      await expect(processImageOcr(mockImageDataUrl, {
        provider: 'google',
        fallbackProviders: false
      })).rejects.toThrow('All OCR providers failed');
    });

    test('should handle empty OCR results', async () => {
      const { createWorker } = await import('tesseract.js');
      (createWorker as jest.Mock).mockResolvedValueOnce({
        recognize: jest.fn().mockResolvedValue({
          data: { text: '', confidence: 0 }
        }),
        terminate: jest.fn().mockResolvedValue(undefined)
      });

      const mockImage = new Image();
      setTimeout(() => {
        if (mockImage.onload) mockImage.onload({} as Event);
      }, 0);

      await expect(processImageOcr(mockImageDataUrl, {
        provider: 'tesseract',
        fallbackProviders: false
      })).rejects.toThrow('All OCR providers failed');
    });
  });

  describe('validateOcrResult', () => {
    test('should validate good OCR result', () => {
      const goodResult = {
        text: 'This is a well-extracted recipe with multiple ingredients and clear instructions.',
        confidence: 0.9,
        metadata: {
          provider: 'tesseract',
          processingTime: 1000,
          imageSize: { width: 800, height: 600 },
          preprocessingApplied: ['contrast-enhancement'],
          language: 'eng'
        }
      };

      const validation = validateOcrResult(goodResult);

      expect(validation.isValid).toBe(true);
      expect(validation.issues).toHaveLength(0);
    });

    test('should detect short text issues', () => {
      const shortResult = {
        text: 'Short',
        confidence: 0.8,
        metadata: {
          provider: 'tesseract',
          processingTime: 500,
          imageSize: { width: 400, height: 300 },
          preprocessingApplied: [],
          language: 'eng'
        }
      };

      const validation = validateOcrResult(shortResult);

      expect(validation.isValid).toBe(false);
      expect(validation.issues).toContain('Very little text extracted');
      expect(validation.suggestions).toContain('Try a higher resolution image or better lighting');
    });

    test('should detect low confidence issues', () => {
      const lowConfidenceResult = {
        text: 'This text has low confidence from OCR processing',
        confidence: 0.3,
        metadata: {
          provider: 'tesseract',
          processingTime: 1200,
          imageSize: { width: 600, height: 400 },
          preprocessingApplied: ['denoising'],
          language: 'eng'
        }
      };

      const validation = validateOcrResult(lowConfidenceResult);

      expect(validation.isValid).toBe(false);
      expect(validation.issues).toContain('Low OCR confidence');
      expect(validation.suggestions).toContain('Image quality may be poor - try preprocessing or a different image');
    });

    test('should detect OCR artifacts', () => {
      const artifactResult = {
        text: 'Recipe with ||| many /// artifacts ~~~ and ``` weird characters',
        confidence: 0.7,
        metadata: {
          provider: 'tesseract',
          processingTime: 800,
          imageSize: { width: 500, height: 700 },
          preprocessingApplied: ['sharpening'],
          language: 'eng'
        }
      };

      const validation = validateOcrResult(artifactResult);

      expect(validation.isValid).toBe(false);
      expect(validation.issues).toContain('High number of OCR artifacts detected');
      expect(validation.suggestions).toContain('Image may have poor contrast or resolution');
    });

    test('should detect very few words', () => {
      const fewWordsResult = {
        text: 'Only few',
        confidence: 0.8,
        metadata: {
          provider: 'tesseract',
          processingTime: 600,
          imageSize: { width: 300, height: 200 },
          preprocessingApplied: [],
          language: 'eng'
        }
      };

      const validation = validateOcrResult(fewWordsResult);

      expect(validation.isValid).toBe(false);
      expect(validation.issues).toContain('Very few words detected');
      expect(validation.suggestions).toContain('Ensure the image contains readable text');
    });

    test('should suggest line break fixes for single-line text', () => {
      const singleLineResult = {
        text: 'This is a very long recipe text that should probably have line breaks but appears to be all on one single line which might indicate formatting issues',
        confidence: 0.8,
        metadata: {
          provider: 'tesseract',
          processingTime: 1000,
          imageSize: { width: 800, height: 100 },
          preprocessingApplied: ['resizing'],
          language: 'eng'
        }
      };

      const validation = validateOcrResult(singleLineResult);

      expect(validation.isValid).toBe(true);
      expect(validation.suggestions).toContain('Text appears to be in a single line - check for line break issues');
    });

    test('should handle edge cases gracefully', () => {
      const edgeCaseResult = {
        text: '',
        confidence: 0,
        metadata: {
          provider: 'tesseract',
          processingTime: 100,
          imageSize: { width: 0, height: 0 },
          preprocessingApplied: ['preprocessing-failed'],
          language: 'eng'
        }
      };

      const validation = validateOcrResult(edgeCaseResult);

      expect(validation.isValid).toBe(false);
      expect(validation.issues.length).toBeGreaterThan(0);
      expect(validation.suggestions.length).toBeGreaterThan(0);
    });
  });
});