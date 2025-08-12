/**
 * Unit tests for URL content extractor
 */

import { extractUrlContent } from '../urlContentExtractor';

// Mock fetch globally
global.fetch = jest.fn();

// Mock DOMParser
global.DOMParser = jest.fn().mockImplementation(() => ({
  parseFromString: jest.fn().mockReturnValue({
    querySelectorAll: jest.fn().mockReturnValue([]),
    querySelector: jest.fn().mockReturnValue(null),
    body: { textContent: 'Mock body content' },
    title: 'Mock Title'
  })
}));

describe('URL Content Extractor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('extractUrlContent', () => {
    test('should extract structured JSON-LD recipe data', async () => {
      const mockHtml = `
        <html>
          <head>
            <script type="application/ld+json">
              {
                "@context": "https://schema.org",
                "@type": "Recipe",
                "name": "Chocolate Chip Cookies",
                "description": "Delicious homemade cookies",
                "image": "https://example.com/cookies.jpg",
                "recipeIngredient": [
                  "2 cups flour",
                  "1 cup sugar",
                  "1/2 cup butter"
                ],
                "recipeInstructions": [
                  {"@type": "HowToStep", "text": "Mix ingredients"},
                  {"@type": "HowToStep", "text": "Bake for 12 minutes"}
                ],
                "prepTime": "PT15M",
                "cookTime": "PT12M",
                "recipeYield": "24 cookies",
                "keywords": "cookies, dessert",
                "author": {"@type": "Person", "name": "Chef John"}
              }
            </script>
          </head>
          <body></body>
        </html>
      `;

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockHtml)
      });

      (global.DOMParser as jest.Mock).mockImplementation(() => ({
        parseFromString: () => {
          const mockDoc = {
            querySelectorAll: jest.fn().mockImplementation((selector) => {
              if (selector === 'script[type="application/ld+json"]') {
                return [{
                  textContent: JSON.stringify({
                    "@context": "https://schema.org",
                    "@type": "Recipe",
                    "name": "Chocolate Chip Cookies",
                    "description": "Delicious homemade cookies",
                    "image": "https://example.com/cookies.jpg",
                    "recipeIngredient": [
                      "2 cups flour",
                      "1 cup sugar",
                      "1/2 cup butter"
                    ],
                    "recipeInstructions": [
                      {"@type": "HowToStep", "text": "Mix ingredients"},
                      {"@type": "HowToStep", "text": "Bake for 12 minutes"}
                    ],
                    "prepTime": "PT15M",
                    "cookTime": "PT12M",
                    "recipeYield": "24 cookies",
                    "keywords": "cookies, dessert",
                    "author": {"@type": "Person", "name": "Chef John"}
                  })
                }];
              }
              return [];
            }),
            querySelector: jest.fn().mockReturnValue(null)
          };
          return mockDoc;
        }
      }));

      const result = await extractUrlContent('https://example.com/recipe');

      expect(result.metadata.extractionMethods).toContain('structured-data');
      expect(result.metadata.confidence).toBe(0.9);
      expect(result.rawText).toContain('Chocolate Chip Cookies');
      expect(result.rawText).toContain('2 cups flour');
      expect(result.rawText).toContain('Mix ingredients');
      expect(result.metadata.creator).toBe('Chef John');
      expect(result.fallbackUsed).toBe(false);
    });

    test('should handle TikTok URLs with oEmbed', async () => {
      const mockOEmbedResponse = {
        title: 'Amazing pasta recipe! #cooking #pasta',
        author_name: 'chef_tiktok',
        html: '<blockquote>...</blockquote>'
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockOEmbedResponse)
      });

      const result = await extractUrlContent('https://www.tiktok.com/@chef/video/123456789');

      expect(result.metadata.platform).toBe('tiktok');
      expect(result.metadata.extractionMethods).toContain('video-caption');
      expect(result.rawText).toBe('Amazing pasta recipe! #cooking #pasta');
      expect(result.metadata.confidence).toBe(0.7);
    });

    test('should fallback to HTML scraping when structured data fails', async () => {
      const mockHtml = `
        <html>
          <head>
            <title>Pasta Recipe</title>
            <meta property="og:description" content="Simple pasta recipe">
          </head>
          <body>
            <h1>Pasta Recipe</h1>
            <ul class="ingredients">
              <li>1 lb pasta</li>
              <li>2 cups sauce</li>
            </ul>
            <ol class="instructions">
              <li>Boil water</li>
              <li>Cook pasta</li>
            </ol>
          </body>
        </html>
      `;

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockHtml)
      });

      (global.DOMParser as jest.Mock).mockImplementation(() => ({
        parseFromString: () => ({
          querySelectorAll: jest.fn().mockImplementation((selector) => {
            if (selector === 'script[type="application/ld+json"]') return [];
            if (selector.includes('.ingredients li')) {
              return [
                { textContent: '1 lb pasta' },
                { textContent: '2 cups sauce' }
              ];
            }
            if (selector.includes('.instructions li')) {
              return [
                { textContent: 'Boil water' },
                { textContent: 'Cook pasta' }
              ];
            }
            return [];
          }),
          querySelector: jest.fn().mockImplementation((selector) => {
            if (selector === 'h1') return { textContent: 'Pasta Recipe' };
            if (selector === 'meta[property="og:title"]') return { getAttribute: () => 'Pasta Recipe' };
            return null;
          }),
          title: 'Pasta Recipe'
        })
      }));

      const result = await extractUrlContent('https://example.com/pasta-recipe');

      expect(result.metadata.extractionMethods).toContain('html-scraping-bot');
      expect(result.rawText).toContain('Pasta Recipe');
      expect(result.rawText).toContain('1 lb pasta');
      expect(result.rawText).toContain('Boil water');
      expect(result.metadata.confidence).toBe(0.8);
    });

    test('should use reader proxy as fallback', async () => {
      // First fetch fails
      (global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        // Reader proxy succeeds
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve('Extracted recipe content from reader proxy')
        });

      const result = await extractUrlContent('https://blocked-site.com/recipe');

      expect(result.metadata.extractionMethods).toContain('reader-proxy-jina');
      expect(result.rawText).toBe('Extracted recipe content from reader proxy');
      expect(result.fallbackUsed).toBe(true);
      expect(result.metadata.confidence).toBe(0.6);
    });

    test('should handle Instagram URLs', async () => {
      const mockHtml = `
        <html>
          <head>
            <meta property="og:description" content="Delicious homemade pizza recipe! 🍕 #pizza #cooking">
          </head>
          <body></body>
        </html>
      `;

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockHtml)
      });

      (global.DOMParser as jest.Mock).mockImplementation(() => ({
        parseFromString: () => ({
          querySelectorAll: jest.fn().mockReturnValue([]),
          querySelector: jest.fn().mockImplementation((selector) => {
            if (selector === 'meta[property="og:description"]') {
              return { getAttribute: () => 'Delicious homemade pizza recipe! 🍕 #pizza #cooking' };
            }
            return null;
          })
        })
      }));

      const result = await extractUrlContent('https://www.instagram.com/reel/ABC123/');

      expect(result.metadata.platform).toBe('instagram');
      expect(result.metadata.extractionMethods).toContain('video-caption');
      expect(result.rawText).toBe('Delicious homemade pizza recipe! 🍕 #pizza #cooking');
    });

    test('should handle YouTube URLs', async () => {
      const mockOEmbedResponse = {
        title: 'How to Make Perfect Pancakes - Cooking Tutorial',
        author_name: 'Cooking Channel'
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockOEmbedResponse)
      });

      const result = await extractUrlContent('https://www.youtube.com/watch?v=abc123');

      expect(result.metadata.platform).toBe('youtube');
      expect(result.metadata.extractionMethods).toContain('video-caption');
      expect(result.rawText).toBe('How to Make Perfect Pancakes - Cooking Tutorial');
    });

    test('should normalize URLs and remove tracking parameters', async () => {
      const urlWithTracking = 'https://example.com/recipe?utm_source=facebook&utm_medium=social&fbclid=123&recipe_id=456';
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('<html><body>Recipe content</body></html>')
      });

      (global.DOMParser as jest.Mock).mockImplementation(() => ({
        parseFromString: () => ({
          querySelectorAll: jest.fn().mockReturnValue([]),
          querySelector: jest.fn().mockReturnValue(null),
          body: { textContent: 'Recipe content' }
        })
      }));

      const result = await extractUrlContent(urlWithTracking);

      expect(result.metadata.source).toBe('https://example.com/recipe?recipe_id=456');
      expect(result.metadata.source).not.toContain('utm_source');
      expect(result.metadata.source).not.toContain('fbclid');
    });

    test('should handle microdata structured data', async () => {
      const mockHtml = `
        <html>
          <body>
            <div itemscope itemtype="https://schema.org/Recipe">
              <h1 itemprop="name">Microdata Recipe</h1>
              <p itemprop="description">Recipe with microdata</p>
              <span itemprop="recipeIngredient">1 cup flour</span>
              <span itemprop="recipeIngredient">2 eggs</span>
              <div itemprop="recipeInstructions">Mix ingredients</div>
              <div itemprop="recipeInstructions">Bake for 30 minutes</div>
            </div>
          </body>
        </html>
      `;

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockHtml)
      });

      (global.DOMParser as jest.Mock).mockImplementation(() => ({
        parseFromString: () => ({
          querySelectorAll: jest.fn().mockImplementation((selector) => {
            if (selector === 'script[type="application/ld+json"]') return [];
            if (selector === '[itemtype*="Recipe"]') {
              return [{
                querySelector: jest.fn().mockImplementation((prop) => {
                  const propMap: { [key: string]: any } = {
                    '[itemprop="name"]': { textContent: 'Microdata Recipe' },
                    '[itemprop="description"]': { textContent: 'Recipe with microdata' }
                  };
                  return propMap[prop] || null;
                }),
                querySelectorAll: jest.fn().mockImplementation((prop) => {
                  if (prop === '[itemprop="recipeIngredient"]') {
                    return [
                      { textContent: '1 cup flour' },
                      { textContent: '2 eggs' }
                    ];
                  }
                  if (prop === '[itemprop="recipeInstructions"]') {
                    return [
                      { textContent: 'Mix ingredients' },
                      { textContent: 'Bake for 30 minutes' }
                    ];
                  }
                  return [];
                })
              }];
            }
            return [];
          }),
          querySelector: jest.fn().mockReturnValue(null)
        })
      }));

      const result = await extractUrlContent('https://example.com/microdata-recipe');

      expect(result.metadata.extractionMethods).toContain('structured-data');
      expect(result.rawText).toContain('Microdata Recipe');
      expect(result.rawText).toContain('1 cup flour');
      expect(result.rawText).toContain('Mix ingredients');
    });

    test('should handle complete extraction failure gracefully', async () => {
      // All fetch attempts fail
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      await expect(extractUrlContent('https://unreachable-site.com/recipe'))
        .rejects.toThrow('Failed to extract content from URL');
    });

    test('should detect recipe websites correctly', async () => {
      const recipeUrls = [
        'https://www.allrecipes.com/recipe/123/cookies',
        'https://www.foodnetwork.com/recipes/pasta',
        'https://www.epicurious.com/recipes/desserts'
      ];

      for (const url of recipeUrls) {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve('<html><body>Recipe content</body></html>')
        });

        (global.DOMParser as jest.Mock).mockImplementation(() => ({
          parseFromString: () => ({
            querySelectorAll: jest.fn().mockReturnValue([]),
            querySelector: jest.fn().mockReturnValue(null),
            body: { textContent: 'Recipe content' }
          })
        }));

        const result = await extractUrlContent(url);
        
        expect(['allrecipes', 'foodnetwork', 'epicurious']).toContain(result.metadata.platform);
      }
    });

    test('should extract OpenGraph data as fallback', async () => {
      const mockHtml = `
        <html>
          <head>
            <meta property="og:title" content="OpenGraph Recipe">
            <meta property="og:description" content="Recipe from OpenGraph">
            <meta property="og:image" content="https://example.com/recipe.jpg">
          </head>
          <body>
            <ul class="ingredients">
              <li>Ingredient 1</li>
              <li>Ingredient 2</li>
            </ul>
            <ol class="instructions">
              <li>Step 1</li>
              <li>Step 2</li>
            </ol>
          </body>
        </html>
      `;

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockHtml)
      });

      (global.DOMParser as jest.Mock).mockImplementation(() => ({
        parseFromString: () => ({
          querySelectorAll: jest.fn().mockImplementation((selector) => {
            if (selector === 'script[type="application/ld+json"]') return [];
            if (selector === '[itemtype*="Recipe"]') return [];
            if (selector.includes('.ingredients li')) {
              return [
                { textContent: 'Ingredient 1' },
                { textContent: 'Ingredient 2' }
              ];
            }
            if (selector.includes('.instructions li')) {
              return [
                { textContent: 'Step 1' },
                { textContent: 'Step 2' }
              ];
            }
            return [];
          }),
          querySelector: jest.fn().mockImplementation((selector) => {
            if (selector === 'meta[property="og:title"]') {
              return { getAttribute: () => 'OpenGraph Recipe' };
            }
            if (selector === 'meta[property="og:description"]') {
              return { getAttribute: () => 'Recipe from OpenGraph' };
            }
            if (selector === 'meta[property="og:image"]') {
              return { getAttribute: () => 'https://example.com/recipe.jpg' };
            }
            return null;
          })
        })
      }));

      const result = await extractUrlContent('https://example.com/og-recipe');

      expect(result.metadata.extractionMethods).toContain('structured-data');
      expect(result.rawText).toContain('OpenGraph Recipe');
      expect(result.rawText).toContain('Ingredient 1');
      expect(result.rawText).toContain('Step 1');
    });
  });
});