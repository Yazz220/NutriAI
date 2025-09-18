// Utilities to clean up and normalize recipe description/steps for a clear UI

/** Strip basic HTML tags and decode simple entities */
export const stripHtml = (html?: string): string => {
  if (!html) return '';
  const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  // Very small entity handling; extend as needed
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
};

/** Heuristic: does a line look like an instruction step? */
export const isStepLikeLine = (line?: string): boolean => {
  if (!line) return false;
  const s = line.trim();
  if (!s) return false;
  // Bullets and numbering
  if (/^(\d+\.|\d+\)|[-•*])\s+/i.test(s)) return true;
  if (/^step\s*\d+[:.)-]?\s+/i.test(s)) return true;
  // Imperative cooking verbs near start
  const commonVerbs = [
    'add','mix','stir','cook','bake','grill','saute','sauté','boil','simmer','preheat','heat','combine','whisk','fold','serve','season','chop','slice','reduce','bring','pour','transfer','garnish','knead','rest','marinate','drain','rinse'
  ];
  const lower = s.toLowerCase();
  // Starts with a verb
  if (new RegExp(`^(${commonVerbs.join('|')})\b`).test(lower)) return true;
  // Contains time then verb ("for 10 minutes", "until")
  if (/(for\s+\d+\s*(min|mins|minutes|hour|hours)\b|until\b)/i.test(s)) return true;
  return false;
};

/** Is a paragraph mostly instructions? */
export const isInstructionLikeText = (text?: string): boolean => {
  if (!text) return false;
  const lines = text.split(/\n|\.|;|\r/).map(l => l.trim()).filter(Boolean);
  if (!lines.length) return false;
  const stepish = lines.filter(isStepLikeLine).length;
  return stepish / lines.length >= 0.5 || /step\s*\d+/i.test(text);
};

/** Normalize steps from any of: analyzed steps array, plain instructions, or summary fallback */
export const normalizeSteps = (
  analyzedSteps?: string[] | undefined,
  plainInstructions?: string | undefined,
  summary?: string | undefined,
): string[] => {
  let steps: string[] = [];
  if (analyzedSteps?.length) {
    steps = analyzedSteps;
  } else if (plainInstructions) {
    // Split on newlines or sentence boundaries conservatively
    const raw = stripHtml(plainInstructions)
      .split(/\n+/)
      .flatMap(l => l.split(/(?<=[.!?])\s+(?=[A-Z])/))
      .map(s => s.trim())
      .filter(Boolean);
    // If many sentences, keep ones that look like steps
    const stepCandidates = raw.filter(isStepLikeLine);
    steps = stepCandidates.length >= 2 ? stepCandidates : raw;
  } else if (summary && isInstructionLikeText(summary)) {
    const raw = stripHtml(summary)
      .split(/\n+/)
      .flatMap(l => l.split(/(?<=[.!?])\s+(?=[A-Z])/))
      .map(s => s.trim())
      .filter(Boolean);
    const stepCandidates = raw.filter(isStepLikeLine);
    steps = stepCandidates.length ? stepCandidates : raw;
  }

  // Clean up: trim, dedupe, remove trailing periods-only differences
  const seen = new Set<string>();
  const cleaned = steps
    .map(s => s.replace(/\s+/g, ' ').trim())
    .map(s => s.replace(/[.;:,\s]+$/g, '').trim())
    .filter(s => {
      const key = s.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return s.length > 0;
    });

  return cleaned;
};

/** Build a concise, non-duplicative summary (1-2 short sentences, ~200 chars) */
export const buildConciseSummary = (
  description?: string,
  steps?: string[],
  maxChars: number = 220,
): string | undefined => {
  const clean = stripHtml(description);
  if (clean && !isInstructionLikeText(clean)) {
    // Take first sentence or two within char limit
    const sentences = clean.split(/(?<=[.!?])\s+/).filter(Boolean);
    let out = '';
    for (const s of sentences) {
      if ((out + (out ? ' ' : '') + s).length > maxChars) break;
      out = out ? `${out} ${s}` : s;
      if (out.length >= maxChars * 0.6) break; // usually one sentence is enough
    }
    return out || sentences[0]?.slice(0, maxChars);
  }
  // Fallback: craft a sentence from first one or two steps
  if (steps?.length) {
    const first = steps[0];
    const second = steps[1];
    const base = first ? first.replace(/^(step\s*\d+[:.)-]?\s*)/i, '') : '';
    const combo = second ? `${base}. ${second}` : base;
    return combo.length > maxChars ? combo.slice(0, maxChars - 1) + '…' : combo;
  }
  return clean || undefined;
};

/** High-level helper to produce cleaned description and steps */
export const cleanupRecipeText = (opts: {
  description?: string;
  analyzedSteps?: string[];
  plainInstructions?: string;
}): { summary?: string; steps: string[] } => {
  const steps = normalizeSteps(opts.analyzedSteps, opts.plainInstructions, opts.description);
  const summary = buildConciseSummary(opts.description, steps);
  return { summary, steps };
};
