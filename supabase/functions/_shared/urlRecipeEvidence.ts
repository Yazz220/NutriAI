const JSON_LD_SCRIPT_PATTERN =
  /<script\b[^>]*type\s*=\s*(?:"application\/ld\+json(?:;[^"]*)?"|'application\/ld\+json(?:;[^']*)?'|application\/ld\+json)[^>]*>([\s\S]*?)<\/script>/gi;

type JsonRecord = Record<string, unknown>;

interface DiscoveredRecipe {
  node: JsonRecord;
  mainEntity: boolean;
  urlMatch: boolean;
  score: number;
}

export interface RecipeJsonLdSelection {
  recipe: JsonRecord | null;
  candidates: JsonRecord[];
  candidateCount: number;
  ambiguous: boolean;
  reason: 'no_candidate' | 'single_candidate' | 'main_entity' | 'url_match' | 'most_complete' | 'ambiguous';
}

export interface UrlRecipeEvidence {
  pageText: string;
  prompt: string;
  structuredRecipe: JsonRecord | null;
  structuredDataFormat: 'json_ld' | 'microdata' | null;
  structuredParserId?: string;
  structuredParserVersion?: number;
  recipeCandidateCount: number;
  recipeSelectionReason: RecipeJsonLdSelection['reason'];
  canonicalUrl?: string;
  sourceTitle?: string;
  sourceLanguage?: string;
}

function record(value: unknown): JsonRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as JsonRecord
    : null;
}

function strings(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(strings);
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  return [];
}

function hasRecipeType(value: unknown): boolean {
  return strings(value).some((type) => type.toLowerCase().split(/[\/#]/).pop() === 'recipe');
}

function readAttribute(tag: string, name: string): string | undefined {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = tag.match(new RegExp(`\\b${escapedName}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'));
  return (match?.[1] ?? match?.[2] ?? match?.[3])?.trim() || undefined;
}

function hasAttribute(tag: string, name: string): boolean {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\b${escapedName}(?:\\s*=|\\s|/?>)`, 'i').test(tag);
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_match, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_match, code) => String.fromCodePoint(Number.parseInt(code, 16)));
}

function comparableUrl(value: string, baseUrl?: string): string | null {
  try {
    const url = new URL(value, baseUrl);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    url.hash = '';
    url.search = '';
    url.pathname = url.pathname.replace(/\/+$/, '') || '/';
    return url.toString();
  } catch {
    return null;
  }
}

function extractCanonicalUrl(html: string, sourceUrl: string): string | undefined {
  const tags = html.match(/<link\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const rel = readAttribute(tag, 'rel')?.toLowerCase().split(/\s+/) ?? [];
    if (!rel.includes('canonical')) continue;
    const href = readAttribute(tag, 'href');
    if (!href) continue;
    try {
      const url = new URL(href, sourceUrl);
      if (url.protocol === 'http:' || url.protocol === 'https:') return url.toString();
    } catch {
      // Ignore invalid publisher metadata.
    }
  }
  return undefined;
}

function extractSourceTitle(html: string): string | undefined {
  const match = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  if (!match?.[1]) return undefined;
  const title = decodeHtmlEntities(match[1].replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
  return title || undefined;
}

function extractSourceLanguage(html: string): string | undefined {
  const tag = html.match(/<html\b[^>]*>/i)?.[0];
  return tag ? readAttribute(tag, 'lang') : undefined;
}

function instructionCount(value: unknown): number {
  if (Array.isArray(value)) return value.reduce((count, item) => count + instructionCount(item), 0);
  if (typeof value === 'string') return value.trim() ? 1 : 0;
  const item = record(value);
  if (!item) return 0;
  const nested = instructionCount(item.itemListElement ?? item.steps);
  if (nested > 0) return nested;
  return strings(item.text ?? item.name).length;
}

function collectMainEntityIds(value: unknown, ids: Set<string>): void {
  if (typeof value === 'string' && value.trim()) {
    ids.add(value.trim());
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collectMainEntityIds(item, ids));
    return;
  }
  const item = record(value);
  if (!item) return;
  if (typeof item['@id'] === 'string' && item['@id'].trim()) ids.add(item['@id'].trim());
}

function recipeUrls(recipe: JsonRecord): string[] {
  const mainEntityOfPage = record(recipe.mainEntityOfPage);
  return [
    ...strings(recipe.url),
    ...strings(recipe.mainEntityOfPage),
    ...strings(mainEntityOfPage?.['@id']),
    ...strings(recipe['@id']),
  ];
}

function recipeCompletenessScore(recipe: JsonRecord): number {
  const ingredientCount = strings(recipe.recipeIngredient ?? recipe.ingredients).length;
  const steps = instructionCount(recipe.recipeInstructions ?? recipe.instructions);
  let score = 0;
  if (strings(recipe.name).length > 0) score += 20;
  score += Math.min(ingredientCount, 12) * 2;
  score += Math.min(steps, 10) * 3;
  if (strings(recipe.recipeYield).length > 0) score += 4;
  if (strings(recipe.description).length > 0) score += 2;
  if (strings(recipe.author ?? recipe.publisher).length > 0 || record(recipe.author) || record(recipe.publisher)) score += 2;
  if (strings(recipe.prepTime ?? recipe.cookTime ?? recipe.totalTime).length > 0) score += 2;
  return score;
}

function discoverRecipeNodes(value: unknown): Array<{ node: JsonRecord; mainEntity: boolean }> {
  const mainEntityIds = new Set<string>();
  const discovered: Array<{ node: JsonRecord; mainEntity: boolean }> = [];

  function walk(item: unknown, inMainEntity: boolean): void {
    if (Array.isArray(item)) {
      item.forEach((entry) => walk(entry, inMainEntity));
      return;
    }
    const itemRecord = record(item);
    if (!itemRecord) return;
    if (hasRecipeType(itemRecord['@type'])) discovered.push({ node: itemRecord, mainEntity: inMainEntity });

    Object.entries(itemRecord).forEach(([key, child]) => {
      const isMainEntity = key === 'mainEntity';
      if (isMainEntity) collectMainEntityIds(child, mainEntityIds);
      walk(child, inMainEntity || isMainEntity);
    });
  }

  walk(value, false);

  const deduplicated = new Map<string, { node: JsonRecord; mainEntity: boolean }>();
  discovered.forEach((candidate) => {
    const id = typeof candidate.node['@id'] === 'string' ? candidate.node['@id'].trim() : '';
    const key = id || `anonymous:${JSON.stringify(candidate.node)}`;
    const mainEntity = candidate.mainEntity || Boolean(id && mainEntityIds.has(id));
    const previous = deduplicated.get(key);
    if (!previous) {
      deduplicated.set(key, { ...candidate, mainEntity });
      return;
    }
    const node = recipeCompletenessScore(candidate.node) > recipeCompletenessScore(previous.node)
      ? candidate.node
      : previous.node;
    deduplicated.set(key, { node, mainEntity: previous.mainEntity || mainEntity });
  });
  return [...deduplicated.values()];
}

interface HtmlNode {
  tagName: string;
  openTag: string;
  children: HtmlNode[];
  content: Array<string | HtmlNode>;
}

const VOID_TAGS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr',
]);

function parseHtmlTree(html: string): HtmlNode {
  const root: HtmlNode = { tagName: '#root', openTag: '', children: [], content: [] };
  const stack = [root];
  const tokens = html.match(/<!--[\s\S]*?-->|<![^>]*>|<\/?[a-zA-Z][^>]*>|[^<]+/g) ?? [];

  for (const token of tokens) {
    if (!token.startsWith('<')) {
      stack[stack.length - 1].content.push(token);
      continue;
    }
    if (/^<!--|^<![^-]/.test(token)) continue;

    const closing = token.match(/^<\s*\/\s*([\w:-]+)/);
    if (closing) {
      const tagName = closing[1].toLowerCase();
      for (let index = stack.length - 1; index > 0; index -= 1) {
        if (stack[index].tagName !== tagName) continue;
        stack.length = index;
        break;
      }
      continue;
    }

    const opening = token.match(/^<\s*([\w:-]+)/);
    if (!opening) continue;
    const tagName = opening[1].toLowerCase();
    const node: HtmlNode = { tagName, openTag: token, children: [], content: [] };
    stack[stack.length - 1].children.push(node);
    stack[stack.length - 1].content.push(node);
    if (!VOID_TAGS.has(tagName) && !/\/\s*>$/.test(token)) stack.push(node);
  }

  return root;
}

function htmlNodeText(node: HtmlNode): string {
  if (['script', 'style', 'template', 'noscript'].includes(node.tagName)) return '';
  return decodeHtmlEntities(node.content.map((part) => (
    typeof part === 'string' ? part : htmlNodeText(part)
  )).join('')).replace(/\s+/g, ' ').trim();
}

function itemProperties(node: HtmlNode): string[] {
  return (readAttribute(node.openTag, 'itemprop') ?? '').split(/\s+/).filter(Boolean);
}

function addStructuredProperty(target: JsonRecord, name: string, value: unknown): void {
  if (value === '' || value == null) return;
  const previous = target[name];
  if (previous === undefined) {
    target[name] = value;
  } else if (Array.isArray(previous)) {
    previous.push(value);
  } else {
    target[name] = [previous, value];
  }
}

function microdataScalar(node: HtmlNode): string {
  const attribute = node.tagName === 'meta'
    ? readAttribute(node.openTag, 'content')
    : node.tagName === 'time'
      ? readAttribute(node.openTag, 'datetime')
      : ['a', 'area', 'link'].includes(node.tagName)
        ? readAttribute(node.openTag, 'href')
        : ['audio', 'embed', 'iframe', 'img', 'source', 'track', 'video'].includes(node.tagName)
          ? readAttribute(node.openTag, 'src')
          : node.tagName === 'object'
            ? readAttribute(node.openTag, 'data')
            : ['data', 'meter'].includes(node.tagName)
              ? readAttribute(node.openTag, 'value')
              : undefined;
  return decodeHtmlEntities(attribute ?? htmlNodeText(node)).replace(/\s+/g, ' ').trim();
}

function microdataItem(scope: HtmlNode): JsonRecord {
  const item: JsonRecord = {};
  const itemTypes = strings(readAttribute(scope.openTag, 'itemtype'));
  if (itemTypes.length > 0) item['@type'] = itemTypes.map((type) => type.split(/[\/#]/).pop() ?? type);
  const itemId = readAttribute(scope.openTag, 'itemid');
  if (itemId) item['@id'] = itemId;

  function collect(node: HtmlNode): void {
    for (const child of node.children) {
      const properties = itemProperties(child);
      const nestedScope = hasAttribute(child.openTag, 'itemscope');
      if (properties.length > 0) {
        const value = nestedScope ? microdataItem(child) : microdataScalar(child);
        properties.forEach((property) => addStructuredProperty(item, property, value));
        continue;
      }
      if (!nestedScope) collect(child);
    }
  }

  collect(scope);
  return item;
}

function discoverMicrodataRecipes(html: string): Array<{ node: JsonRecord; mainEntity: boolean }> {
  const discovered: Array<{ node: JsonRecord; mainEntity: boolean }> = [];

  function walk(node: HtmlNode): void {
    for (const child of node.children) {
      const isScope = hasAttribute(child.openTag, 'itemscope');
      const itemType = readAttribute(child.openTag, 'itemtype');
      if (isScope && hasRecipeType(itemType)) {
        discovered.push({
          node: microdataItem(child),
          mainEntity: itemProperties(child).includes('mainEntity'),
        });
        continue;
      }
      walk(child);
    }
  }

  walk(parseHtmlTree(html));
  return discovered;
}

function parseJsonLdBlocks(html: string): unknown[] {
  JSON_LD_SCRIPT_PATTERN.lastIndex = 0;
  const blocks: unknown[] = [];
  let match: RegExpExecArray | null;
  while ((match = JSON_LD_SCRIPT_PATTERN.exec(html)) !== null) {
    let raw = match[1]?.trim();
    if (!raw) continue;
    for (let pass = 0; pass < 3; pass += 1) {
      raw = raw
        .replace(/;\s*$/, '')
        .replace(/^\s*<!--/, '')
        .replace(/-->\s*$/, '')
        .replace(/^\s*<!\[CDATA\[/i, '')
        .replace(/\]\]>?\s*$/i, '')
        .trim();
    }
    try {
      blocks.push(JSON.parse(raw));
    } catch {
      // Ignore malformed structured data and continue to the next block.
    }
  }
  return blocks;
}

function selectRecipeCandidates(
  discovered: Array<{ node: JsonRecord; mainEntity: boolean }>,
  html: string,
  sourceUrl?: string,
): RecipeJsonLdSelection {
  const canonicalUrl = sourceUrl ? extractCanonicalUrl(html, sourceUrl) : undefined;
  const comparableSources = new Set(
    [sourceUrl, canonicalUrl]
      .flatMap((value) => value ? [comparableUrl(value)] : [])
      .filter((value): value is string => Boolean(value)),
  );
  const candidates: DiscoveredRecipe[] = discovered.map((candidate) => ({
    ...candidate,
    urlMatch: sourceUrl
      ? recipeUrls(candidate.node).some((value) => {
          const normalized = comparableUrl(value, sourceUrl);
          return Boolean(normalized && comparableSources.has(normalized));
        })
      : false,
    score: recipeCompletenessScore(candidate.node),
  })).sort((left, right) => (
    Number(right.mainEntity) - Number(left.mainEntity)
    || Number(right.urlMatch) - Number(left.urlMatch)
    || right.score - left.score
  ));

  if (candidates.length === 0) {
    return { recipe: null, candidates: [], candidateCount: 0, ambiguous: false, reason: 'no_candidate' };
  }
  if (candidates.length === 1) {
    return {
      recipe: candidates[0].node,
      candidates: [candidates[0].node],
      candidateCount: 1,
      ambiguous: false,
      reason: 'single_candidate',
    };
  }

  const mainEntities = candidates.filter((candidate) => candidate.mainEntity);
  if (mainEntities.length === 1) {
    return {
      recipe: mainEntities[0].node,
      candidates: candidates.map((candidate) => candidate.node),
      candidateCount: candidates.length,
      ambiguous: false,
      reason: 'main_entity',
    };
  }

  const urlMatches = candidates.filter((candidate) => candidate.urlMatch);
  if (urlMatches.length === 1) {
    return {
      recipe: urlMatches[0].node,
      candidates: candidates.map((candidate) => candidate.node),
      candidateCount: candidates.length,
      ambiguous: false,
      reason: 'url_match',
    };
  }

  if (candidates[0].score - candidates[1].score >= 12) {
    return {
      recipe: candidates[0].node,
      candidates: candidates.map((candidate) => candidate.node),
      candidateCount: candidates.length,
      ambiguous: false,
      reason: 'most_complete',
    };
  }

  return {
    recipe: null,
    candidates: candidates.map((candidate) => candidate.node),
    candidateCount: candidates.length,
    ambiguous: true,
    reason: 'ambiguous',
  };
}

export function selectRecipeJsonLd(html: string, sourceUrl?: string): RecipeJsonLdSelection {
  const discovered = parseJsonLdBlocks(html).flatMap(discoverRecipeNodes);
  return selectRecipeCandidates(discovered, html, sourceUrl);
}

export function selectRecipeMicrodata(html: string, sourceUrl?: string): RecipeJsonLdSelection {
  return selectRecipeCandidates(discoverMicrodataRecipes(html), html, sourceUrl);
}

export function extractRecipeJsonLdObject(html: string, sourceUrl?: string): JsonRecord | null {
  return selectRecipeJsonLd(html, sourceUrl).recipe;
}

export function extractRecipeJsonLd(html: string, sourceUrl?: string): string | null {
  const recipe = extractRecipeJsonLdObject(html, sourceUrl);
  return recipe ? JSON.stringify(recipe) : null;
}

export function extractRecipeMicrodataObject(html: string, sourceUrl?: string): JsonRecord | null {
  return selectRecipeMicrodata(html, sourceUrl).recipe;
}

export function htmlToRecipePageText(html: string): string {
  return decodeHtmlEntities(html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]*style\s*=\s*"[^"]*display\s*:\s*none[^"]*"[^>]*>[\s\S]*?<\/[^>]+>/gi, ' ')
    .replace(/<[^>]*style\s*=\s*"[^"]*visibility\s*:\s*hidden[^"]*"[^>]*>[\s\S]*?<\/[^>]+>/gi, ' ')
    .replace(/<[^>]*style\s*=\s*"[^"]*font-size\s*:\s*0[^"]*"[^>]*>[\s\S]*?<\/[^>]+>/gi, ' ')
    .replace(/<[^>]+>/g, '\n'))
    .replace(/[\u200B\u200C\u200D\uFEFF]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const UNTRUSTED_CONTENT_PREFIX = '<UNTRUSTED_WEB_CONTENT>';
const UNTRUSTED_CONTENT_SUFFIX = '</UNTRUSTED_WEB_CONTENT>';

export function buildUrlRecipePrompt(url: string, html: string): UrlRecipeEvidence {
  const pageText = htmlToRecipePageText(html);
  const jsonLdSelection = selectRecipeJsonLd(html, url);
  const microdataSelection = selectRecipeMicrodata(html, url);
  let selectedFormat: UrlRecipeEvidence['structuredDataFormat'] = null;
  if (jsonLdSelection.recipe && microdataSelection.recipe) {
    selectedFormat = recipeCompletenessScore(microdataSelection.recipe)
        > recipeCompletenessScore(jsonLdSelection.recipe) + 4
      ? 'microdata'
      : 'json_ld';
  } else if (jsonLdSelection.recipe) {
    selectedFormat = 'json_ld';
  } else if (microdataSelection.recipe) {
    selectedFormat = 'microdata';
  } else if (jsonLdSelection.ambiguous) {
    selectedFormat = 'json_ld';
  } else if (microdataSelection.ambiguous) {
    selectedFormat = 'microdata';
  }
  const selection = selectedFormat === 'json_ld' ? jsonLdSelection : microdataSelection;
  const structuredRecipe = selection.recipe ? JSON.stringify(selection.recipe) : null;
  const candidateJsonLd = selection.ambiguous
    ? JSON.stringify(selection.candidates.slice(0, 5))
    : null;
  const structuredLabel = selectedFormat === 'microdata' ? 'Recipe Microdata' : 'Recipe JSON-LD';

  const evidence = structuredRecipe
    ? `${structuredLabel} (primary evidence):\n${UNTRUSTED_CONTENT_PREFIX}\n${structuredRecipe}\n${UNTRUSTED_CONTENT_SUFFIX}\n\nVisible page text (secondary evidence):\n${UNTRUSTED_CONTENT_PREFIX}\n${pageText}\n${UNTRUSTED_CONTENT_SUFFIX}`
    : candidateJsonLd
      ? `Multiple structured Recipe candidates were found. Select one only if the page clearly identifies a primary recipe; otherwise return insufficient_evidence with reasonCode multiple_recipes.\n${UNTRUSTED_CONTENT_PREFIX}\n${candidateJsonLd}\n${UNTRUSTED_CONTENT_SUFFIX}\n\nVisible page text (secondary evidence):\n${UNTRUSTED_CONTENT_PREFIX}\n${pageText}\n${UNTRUSTED_CONTENT_SUFFIX}`
      : `Visible page text:\n${UNTRUSTED_CONTENT_PREFIX}\n${pageText}\n${UNTRUSTED_CONTENT_SUFFIX}`;

  return {
    pageText,
    prompt: `Source URL: ${url}\n\n${evidence}`,
    structuredRecipe: selection.recipe,
    structuredDataFormat: selectedFormat,
    ...(selectedFormat ? {
      structuredParserId: selectedFormat === 'microdata' ? 'schema-org-microdata' : 'schema-org-json-ld',
      structuredParserVersion: selectedFormat === 'microdata' ? 1 : 3,
    } : {}),
    recipeCandidateCount: selection.candidateCount,
    recipeSelectionReason: selection.reason,
    canonicalUrl: extractCanonicalUrl(html, url) ?? url,
    sourceTitle: extractSourceTitle(html),
    sourceLanguage: extractSourceLanguage(html),
  };
}
