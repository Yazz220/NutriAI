import { buildUrlRecipePrompt, extractRecipeJsonLd, extractRecipeJsonLdObject } from './urlRecipeEvidence.ts';

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

Deno.test('buildUrlRecipePrompt puts structured evidence before visible text', () => {
  const result = buildUrlRecipePrompt(
    'https://example.com/lemon-rice',
    '<script type="application/ld+json">{"@type":"Recipe","name":"Structured title"}</script><h1>Noisy title</h1>',
  );
  assertStringIncludes(result.prompt, 'Recipe JSON-LD (primary evidence)');
  assertEquals(result.prompt.indexOf('Structured title') < result.prompt.indexOf('Noisy title'), true);
  assertEquals(result.pageText, 'Noisy title');
});
