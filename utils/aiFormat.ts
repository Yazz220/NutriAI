export type StructuredMode = 'chat' | 'recipe';

export type StructuredIngredient = {
  name: string;
  quantity?: number | string;
  unit?: string;
  inInventory?: boolean;
  substituteFor?: string | null;
  note?: string | null;
};

export type StructuredStep = {
  label?: string;
  instruction: string;
  durationSec?: number;
  timer?: boolean;
};

export type StructuredResponse = {
  mode: StructuredMode;
  title?: string;
  summary?: string[]; // bullets
  ingredients?: StructuredIngredient[];
  steps?: StructuredStep[];
  tips?: string[];
  // Fallback chat content when not recipe oriented
  chat?: string[]; // short bullet lines
};

export function buildStructuredSystemPrompt(userContext: string) {
  return [
    'You are NutriAI inside a mobile app. Be concise, actionable, and mobile-first.',
    'Always return STRICT JSON ONLY matching the schema below. No markdown, no prose outside JSON.',
    'Prefer lists and short sentences. If the user asks for step-by-step cooking help, use mode="recipe".',
    'If general Q&A, use mode="chat" with concise bullet lines in chat[].',
    '',
    'JSON Schema (TypeScript-like):',
    '{',
    '  "mode": "chat" | "recipe",',
    '  "title"?: string,',
    '  "summary"?: string[],',
    '  "ingredients"?: Array<{ name: string; quantity?: number | string; unit?: string; inInventory?: boolean; substituteFor?: string | null; note?: string | null }>,',
    '  "steps"?: Array<{ label?: string; instruction: string; durationSec?: number; timer?: boolean }>,',
    '  "tips"?: string[],',
    '  "chat"?: string[]',
    '}',
    '',
    'Rules:',
    '- Use singular ingredient names; fill in inInventory when possible from context.',
    '- Keep steps short and numbered implicitly (frontend will number).',
    '- If unsure about quantities, leave quantity null/omitted.',
    '- Do NOT include markdown formatting like **bold**, tables, or <br>.',
    '',
    'User Context:',
    userContext,
  ].join('\n');
}

export function tryExtractJSON(text: string): StructuredResponse | null {
  if (!text) return null;
  // Try parse directly
  try { return JSON.parse(text) as StructuredResponse; } catch {}
  // Try extract first JSON block
  const match = text.match(/\{[\s\S]*\}$/);
  if (match) {
    try { return JSON.parse(match[0]) as StructuredResponse; } catch {}
  }
  return null;
}
