/**
 * Unit tests for input detection and validation system
 */

import { detectInputType, validateInput, getPlatformHints } from '../inputDetection';

// Mock File class for testing
class MockFile implements File {
  name: string;
  type: string;
  size: number;
  lastModified: number;
  webkitRelativePath: string = '';

  constructor(name: string, type: string, size: number = 1024) {
    this.name = name;
    this.type = type;
    this.size = size;
    this.lastModified = Date.now();
  }

  arrayBuffer(): Promise<ArrayBuffer> { throw new Error('Not implemented'); }
  slice(): Blob { throw new Error('Not implemented'); }
  stream(): ReadableStream<Uint8Array> { throw new Error('Not implemented'); }
  text(): Promise<string> { throw new Error('Not implemented'); }
}

describe('Input Detection System', () => {
  describe('detectInputType', () => {
    describe('URL Detection', () => {
      test('should detect TikTok URLs', () => {
        const urls = [
          'https://www.tiktok.com/@user/video/1234567890',
          'https://vm.tiktok.com/ZMeAbCdEf/',
          'tiktok.com/@chef/video/9876543210'
        ];

        urls.forEach(url => {
          const result = detectInputType(url);
          expect(result.type).toBe('url');
          expect(result.confidence).toBeGreaterThan(0.9);
          expect(result.metadata.platform).toBe('tiktok');
          expect(result.metadata.isVideoUrl).toBe(true);
          expect(result.metadata.isSocialMedia).toBe(true);
        });
      });

      test('should detect Instagram URLs', () => {
        const urls = [
          'https://www.instagram.com/reel/ABC123DEF/',
          'https://instagram.com/p/XYZ789/',
          'instagram.com/reels/cooking123'
        ];

        urls.forEach(url => {
          const result = detectInputType(url);
          expect(result.type).toBe('url');
          expect(result.confidence).toBeGreaterThan(0.9);
          expect(result.metadata.platform).toBe('instagram');
          expect(result.metadata.isSocialMedia).toBe(true);
        });
      });

      test('should detect YouTube URLs', () => {
        const urls = [
          'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          'https://youtu.be/dQw4w9WgXcQ',
          'youtube.com/shorts/abc123',
          'www.youtube.com/watch?v=abc123&t=30s'
        ];

        urls.forEach(url => {
          const result = detectInputType(url);
          expect(result.type).toBe('url');
          expect(result.confidence).toBeGreaterThan(0.9);
          expect(result.metadata.platform).toBe('youtube');
          expect(result.metadata.isVideoUrl).toBe(true);
        });
      });

      test('should detect recipe website URLs', () => {
        const urls = [
          'https://www.allrecipes.com/recipe/123/chocolate-cake',
          'foodnetwork.com/recipes/alton-brown/pancakes',
          'https://cooking.nytimes.com/recipes/1234/pasta',
          'https://example.com/recipe/chicken-curry'
        ];

        urls.forEach(url => {
          const result = detectInputType(url);
          expect(result.type).toBe('url');
          expect(result.confidence).toBeGreaterThan(0.8);
          expect(result.metadata.isVideoUrl).toBe(false);
        });
      });

      test('should handle URLs without protocol', () => {
        const result = detectInputType('tiktok.com/@user/video/123');
        expect(result.type).toBe('url');
        expect(result.confidence).toBeGreaterThan(0.9);
        expect(result.metadata.platform).toBe('tiktok');
      });

      test('should handle invalid URLs', () => {
        const invalidUrls = [
          'not-a-url',
          'just some text',
          'http://',
          'ftp://invalid.com'
        ];

        invalidUrls.forEach(url => {
          const result = detectInputType(url);
          expect(result.type).toBe('text');
          expect(result.confidence).toBeLessThan(0.5);
        });
      });
    });

    describe('File Detection', () => {
      test('should detect image files by MIME type', () => {
        const imageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
        
        imageTypes.forEach(mimeType => {
          const file = new MockFile('recipe.jpg', mimeType, 2048);
          const result = detectInputType(file);
          
          expect(result.type).toBe('image');
          expect(result.confidence).toBe(0.95);
          expect(result.metadata.fileType).toBe(mimeType);
          expect(result.metadata.size).toBe(2048);
        });
      });

      test('should detect video files by MIME type', () => {
        const videoTypes = ['video/mp4', 'video/quicktime', 'video/webm'];
        
        videoTypes.forEach(mimeType => {
          const file = new MockFile('recipe.mp4', mimeType, 10240);
          const result = detectInputType(file);
          
          expect(result.type).toBe('video');
          expect(result.confidence).toBe(0.95);
          expect(result.metadata.fileType).toBe(mimeType);
          expect(result.metadata.size).toBe(10240);
        });
      });

      test('should fallback to extension detection', () => {
        // File with no MIME type but valid extension
        const file = new MockFile('recipe.png', '', 1024);
        const result = detectInputType(file);
        
        expect(result.type).toBe('image');
        expect(result.confidence).toBe(0.8);
        expect(result.metadata.fileType).toBe('image/png');
      });

      test('should handle unknown file types', () => {
        const file = new MockFile('recipe.txt', 'text/plain', 1024);
        const result = detectInputType(file);
        
        expect(result.type).toBe('image'); // Defaults to image for safety
        expect(result.confidence).toBe(0.3);
        expect(result.metadata.fileType).toBe('unknown');
      });
    });

    describe('Text Detection', () => {
      test('should detect structured recipe text', () => {
        const recipeText = `
          Chocolate Chip Cookies
          
          Ingredients:
          - 2 cups flour
          - 1 cup sugar
          - 1/2 cup butter
          - 1 tsp vanilla
          
          Instructions:
          1. Preheat oven to 350°F
          2. Mix dry ingredients
          3. Add wet ingredients
          4. Bake for 12 minutes
          
          Serves 24 cookies
          Prep time: 15 minutes
        `;

        const result = detectInputType(recipeText);
        expect(result.type).toBe('text');
        expect(result.confidence).toBeGreaterThan(0.8);
        expect(result.metadata.hasRecipeStructure).toBe(true);
        expect(result.metadata.bulletPoints).toBeGreaterThan(0);
        expect(result.metadata.numberedSteps).toBeGreaterThan(0);
      });

      test('should detect unstructured recipe text', () => {
        const recipeText = `
          Mix 2 cups flour with 1 cup sugar and bake at 350 degrees.
          Add some vanilla and butter to taste.
        `;

        const result = detectInputType(recipeText);
        expect(result.type).toBe('text');
        expect(result.confidence).toBeGreaterThan(0.5);
        expect(result.metadata.measurements).toBeGreaterThan(0);
      });

      test('should handle non-recipe text', () => {
        const nonRecipeText = 'This is just some random text without any recipe content.';
        
        const result = detectInputType(nonRecipeText);
        expect(result.type).toBe('text');
        expect(result.confidence).toBeLessThan(0.7);
        expect(result.metadata.hasRecipeStructure).toBe(false);
      });

      test('should handle empty text', () => {
        const result = detectInputType('');
        expect(result.type).toBe('text');
        expect(result.confidence).toBe(0);
      });
    });
  });

  describe('validateInput', () => {
    describe('URL Validation', () => {
      test('should validate HTTPS URLs', () => {
        const detection = {
          type: 'url' as const,
          confidence: 0.9,
          metadata: { platform: 'tiktok', isSocialMedia: true }
        };

        const result = validateInput('https://tiktok.com/@user/video/123', detection);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      test('should warn about HTTP URLs', () => {
        const detection = {
          type: 'url' as const,
          confidence: 0.9,
          metadata: { platform: 'generic' }
        };

        const result = validateInput('http://example.com/recipe', detection);
        expect(result.isValid).toBe(true);
        expect(result.warnings).toContain(expect.stringContaining('HTTP instead of HTTPS'));
      });

      test('should reject invalid URLs', () => {
        const detection = {
          type: 'url' as const,
          confidence: 0.9,
          metadata: {}
        };

        const result = validateInput('not-a-valid-url', detection);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Invalid URL format');
      });
    });

    describe('Text Validation', () => {
      test('should validate sufficient text length', () => {
        const detection = {
          type: 'text' as const,
          confidence: 0.8,
          metadata: { hasRecipeStructure: true }
        };

        const result = validateInput('This is a recipe with enough content to be meaningful', detection);
        expect(result.isValid).toBe(true);
      });

      test('should reject too short text', () => {
        const detection = {
          type: 'text' as const,
          confidence: 0.5,
          metadata: {}
        };

        const result = validateInput('short', detection);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(expect.stringContaining('too short'));
      });

      test('should warn about very long text', () => {
        const detection = {
          type: 'text' as const,
          confidence: 0.8,
          metadata: {}
        };

        const longText = 'a'.repeat(60000);
        const result = validateInput(longText, detection);
        expect(result.isValid).toBe(true);
        expect(result.warnings).toContain(expect.stringContaining('very long'));
      });
    });

    describe('File Validation', () => {
      test('should validate normal-sized image files', () => {
        const file = new MockFile('recipe.jpg', 'image/jpeg', 2 * 1024 * 1024); // 2MB
        const detection = {
          type: 'image' as const,
          confidence: 0.95,
          metadata: { fileType: 'image/jpeg', size: 2 * 1024 * 1024 }
        };

        const result = validateInput(file, detection);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      test('should reject oversized image files', () => {
        const file = new MockFile('huge.jpg', 'image/jpeg', 15 * 1024 * 1024); // 15MB
        const detection = {
          type: 'image' as const,
          confidence: 0.95,
          metadata: { fileType: 'image/jpeg', size: 15 * 1024 * 1024 }
        };

        const result = validateInput(file, detection);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(expect.stringContaining('too large'));
      });

      test('should warn about large video files', () => {
        const file = new MockFile('video.mp4', 'video/mp4', 60 * 1024 * 1024); // 60MB
        const detection = {
          type: 'video' as const,
          confidence: 0.95,
          metadata: { fileType: 'video/mp4', size: 60 * 1024 * 1024 }
        };

        const result = validateInput(file, detection);
        expect(result.isValid).toBe(true);
        expect(result.warnings).toContain(expect.stringContaining('Large video file'));
      });
    });
  });

  describe('getPlatformHints', () => {
    test('should provide TikTok-specific hints', () => {
      const detection = {
        type: 'url' as const,
        confidence: 0.95,
        metadata: { platform: 'tiktok', isVideoUrl: true }
      };

      const hints = getPlatformHints(detection);
      expect(hints).toContain(expect.stringContaining('TikTok videos'));
      expect(hints).toContain(expect.stringContaining('transcription'));
    });

    test('should provide Instagram-specific hints', () => {
      const detection = {
        type: 'url' as const,
        confidence: 0.95,
        metadata: { platform: 'instagram', isVideoUrl: true }
      };

      const hints = getPlatformHints(detection);
      expect(hints).toContain(expect.stringContaining('Instagram Reels'));
      expect(hints).toContain(expect.stringContaining('captions'));
    });

    test('should provide text formatting hints for low-confidence text', () => {
      const detection = {
        type: 'text' as const,
        confidence: 0.6,
        metadata: { hasRecipeStructure: false }
      };

      const hints = getPlatformHints(detection);
      expect(hints).toContain(expect.stringContaining('ingredients list'));
      expect(hints).toContain(expect.stringContaining('bullet points'));
    });

    test('should provide image quality hints', () => {
      const detection = {
        type: 'image' as const,
        confidence: 0.9,
        metadata: { fileType: 'image/jpeg' }
      };

      const hints = getPlatformHints(detection);
      expect(hints).toContain(expect.stringContaining('clear and well-lit'));
      expect(hints).toContain(expect.stringContaining('OCR results'));
    });

    test('should provide video processing hints', () => {
      const detection = {
        type: 'video' as const,
        confidence: 0.9,
        metadata: { fileType: 'video/mp4' }
      };

      const hints = getPlatformHints(detection);
      expect(hints).toContain(expect.stringContaining('clear narration'));
      expect(hints).toContain(expect.stringContaining('screenshot'));
    });
  });
});