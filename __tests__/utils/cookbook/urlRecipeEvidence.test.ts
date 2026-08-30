import {
  buildUrlRecipePrompt,
  extractRecipeJsonLdObject,
  selectRecipeJsonLd,
} from '@/supabase/functions/_shared/urlRecipeEvidence';

describe('URL recipe evidence', () => {
  it('selects the Recipe referenced by mainEntity instead of the first Recipe node', () => {
    const html = `
      <script type="application/ld+json">
        {
          "@graph": [
            {
              "@type": "WebPage",
              "mainEntity": { "@id": "#main-recipe" }
            },
            {
              "@type": "Recipe",
              "@id": "#related-recipe",
              "name": "Related dip",
              "recipeIngredient": ["1 cup yogurt"],
              "recipeInstructions": ["Stir."]
            },
            {
              "@type": "Recipe",
              "@id": "#main-recipe",
              "name": "Lemon rice",
              "recipeIngredient": ["1 cup rice", "2 cups water"],
              "recipeInstructions": ["Simmer the rice."]
            }
          ]
        }
      </script>`;

    const selection = selectRecipeJsonLd(html, 'https://example.com/lemon-rice');

    expect(selection.recipe?.name).toBe('Lemon rice');
    expect(selection.candidateCount).toBe(2);
    expect(selection.ambiguous).toBe(false);
    expect(selection.reason).toBe('main_entity');
  });

  it('keeps the complete graph node when mainEntity is a typed id reference', () => {
    const html = `
      <script type="application/ld+json">
        {
          "@graph": [
            {
              "@type": "WebPage",
              "mainEntity": { "@type": "Recipe", "@id": "#recipe" }
            },
            {
              "@type": "Recipe",
              "@id": "#recipe",
              "name": "Complete pie",
              "recipeIngredient": ["1 pie crust"],
              "recipeInstructions": ["Bake the pie."]
            }
          ]
        }
      </script>`;

    const selection = selectRecipeJsonLd(html, 'https://example.com/pie');

    expect(selection.candidateCount).toBe(1);
    expect(selection.recipe?.name).toBe('Complete pie');
  });

  it('does not silently choose between equally plausible recipes', () => {
    const html = `
      <script type="application/ld+json">
        [
          {
            "@type": "Recipe",
            "name": "Red sauce",
            "recipeIngredient": ["tomatoes"],
            "recipeInstructions": ["Simmer."]
          },
          {
            "@type": "Recipe",
            "name": "Green sauce",
            "recipeIngredient": ["herbs"],
            "recipeInstructions": ["Blend."]
          }
        ]
      </script>`;

    const selection = selectRecipeJsonLd(html, 'https://example.com/two-sauces');
    const prompt = buildUrlRecipePrompt('https://example.com/two-sauces', html);

    expect(selection.recipe).toBeNull();
    expect(selection.ambiguous).toBe(true);
    expect(prompt.structuredRecipe).toBeNull();
    expect(prompt.prompt).toContain('Multiple structured Recipe candidates');
  });

  it('captures canonical page metadata without changing the submitted source URL', () => {
    const html = `
      <html lang="en-GB">
        <head>
          <title>Weeknight lemon rice</title>
          <link href="/recipes/lemon-rice" rel="canonical">
        </head>
        <body>
          <script type="application/ld+json">
            {
              "@type": "Recipe",
              "name": "Lemon rice",
              "recipeIngredient": ["rice"],
              "recipeInstructions": ["Cook the rice."]
            }
          </script>
        </body>
      </html>`;

    const evidence = buildUrlRecipePrompt('https://example.com/shared?id=42', html);

    expect(evidence.canonicalUrl).toBe('https://example.com/recipes/lemon-rice');
    expect(evidence.sourceTitle).toBe('Weeknight lemon rice');
    expect(evidence.sourceLanguage).toBe('en-GB');
    expect(extractRecipeJsonLdObject(html, 'https://example.com/shared?id=42')?.name).toBe('Lemon rice');
  });
});
