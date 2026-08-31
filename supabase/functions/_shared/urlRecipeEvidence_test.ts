import {
  buildUrlRecipePrompt,
  extractRecipeJsonLd,
  extractRecipeJsonLdObject,
  extractRecipeMicrodataObject,
} from './urlRecipeEvidence.ts';

function assertEquals(actual: unknown, expected: unknown): void {
  if (actual !== expected) throw new Error(`Expected ${String(expected)}, received ${String(actual)}`);
}

function assertStringIncludes(actual: string, expected: string): void {
  if (!actual.includes(expected)) throw new Error(`Expected text to include ${expected}`);
}

Deno.test('extractRecipeJsonLd finds a Recipe inside an @graph', () => {
  const html = `<script type="application/ld+json">{"@graph":[{"@type":"WebPage"},{"@type":"Recipe","name":"Lemon Rice"}]}</script>`;
  assertEquals(JSON.parse(extractRecipeJsonLd(html) ?? '{}').name, 'Lemon Rice');
});

Deno.test('extractRecipeJsonLdObject exposes structured fallback evidence', () => {
  const html = `<script type="application/ld+json">{"@type":"Recipe","name":"Berry Salad","recipeIngredient":["berries"],"recipeInstructions":[{"@type":"HowToStep","text":"Fold together."}]}</script>`;
  const recipe = extractRecipeJsonLdObject(html);
  assertEquals(recipe?.name, 'Berry Salad');
});

Deno.test('extractRecipeJsonLd tolerates common publisher wrappers', () => {
  const html = `<script type="application/ld+json"><!--<![CDATA[
    {"@type":"Recipe","name":"Wrapped Soup","recipeIngredient":["1 onion"],"recipeInstructions":["Simmer."]}
  ]]-->;</script>`;
  assertEquals(JSON.parse(extractRecipeJsonLd(html) ?? '{}').name, 'Wrapped Soup');
});

Deno.test('extractRecipeMicrodataObject reads a complete schema.org Recipe scope', () => {
  const html = `<article itemscope itemtype="https://schema.org/Recipe">
    <h1 itemprop="name">Apple Crumble</h1>
    <meta itemprop="recipeYield" content="Serves 6">
    <li itemprop="recipeIngredient">4 apples, sliced</li>
    <li itemprop="recipeIngredient">120 g flour</li>
    <section itemprop="recipeInstructions" itemscope itemtype="https://schema.org/HowToStep">
      <span itemprop="text">Bake for 35 minutes.</span>
    </section>
  </article>`;
  const recipe = extractRecipeMicrodataObject(html);
  assertEquals(recipe?.name, 'Apple Crumble');
  assertEquals(Array.isArray(recipe?.recipeIngredient), true);
  assertEquals((recipe?.recipeInstructions as Record<string, unknown>)?.text, 'Bake for 35 minutes.');
});

Deno.test('extractRecipeMicrodataObject preserves inline instruction text order', () => {
  const html = `<article itemscope itemtype="https://schema.org/Recipe">
    <h1 itemprop="name">Toast</h1>
    <p itemprop="recipeIngredient">2 slices bread</p>
    <p itemprop="recipeInstructions">Toast <strong>until golden</strong>, then serve.</p>
  </article>`;
  const recipe = extractRecipeMicrodataObject(html);
  assertEquals(recipe?.recipeInstructions, 'Toast until golden, then serve.');
});

Deno.test('buildUrlRecipePrompt puts structured evidence before visible text', () => {
  const result = buildUrlRecipePrompt(
    'https://example.com/lemon-rice',
    '<script type="application/ld+json">{"@type":"Recipe","name":"Structured title"}</script><h1>Noisy title</h1>',
  );
  assertStringIncludes(result.prompt, 'Recipe JSON-LD (primary evidence)');
  assertEquals(result.prompt.indexOf('Structured title') < result.prompt.indexOf('Noisy title'), true);
  assertEquals(result.pageText, 'Noisy title');
});

Deno.test('buildUrlRecipePrompt reports the structured-data format it selected', () => {
  const result = buildUrlRecipePrompt(
    'https://example.com/apple-crumble',
    '<article itemscope itemtype="https://schema.org/Recipe"><h1 itemprop="name">Apple Crumble</h1><p itemprop="recipeIngredient">4 apples</p><p itemprop="recipeInstructions">Bake.</p></article>',
  );
  assertEquals(result.structuredDataFormat, 'microdata');
  assertStringIncludes(result.prompt, 'Recipe Microdata (primary evidence)');
});

Deno.test('buildUrlRecipePrompt prefers complete Microdata over incomplete JSON-LD', () => {
  const result = buildUrlRecipePrompt(
    'https://example.com/apple-crumble',
    `<script type="application/ld+json">{"@type":"Recipe","name":"Apple Crumble"}</script>
     <article itemscope itemtype="https://schema.org/Recipe"><h1 itemprop="name">Apple Crumble</h1><p itemprop="recipeIngredient">4 apples</p><p itemprop="recipeInstructions">Bake.</p></article>`,
  );
  assertEquals(result.structuredDataFormat, 'microdata');
});
