// Centralized prompt/policy/knob registry for recipe imports
// Versioned for auditability

export type ParsePolicy = 'verbatim' | 'conservative' | 'enrich';

export type ImportKnobs = {
  version: string;
  policy: ParsePolicy;
  allowEnrich: boolean;
  minIngredientSupport: number; // e.g., 0.7
  minStepSupport: number;       // e.g., 0.7
  telemetryLevel: 'basic' | 'verbose';
};

const VERSION = '2025-08-14';

function numFromEnv(name: string, def: number): number {
  if (typeof process?.env?.[name] === 'string') {
    const n = Number(process.env[name]);
    if (!Number.isNaN(n) && n >= 0 && n <= 1) return n;
  }
  // Expo fallback
  if (typeof (global as any)?.EXPO_PUBLIC?.[name] === 'number') {
    return (global as any).EXPO_PUBLIC[name];
  }
  return def;
}

function boolFromEnv(name: string, def: boolean): boolean {
  const v = process?.env?.[name] ?? (global as any)?.EXPO_PUBLIC?.[name];
  if (typeof v === 'string') return ['1', 'true', 'yes', 'on'].includes(v.toLowerCase());
  if (typeof v === 'boolean') return v;
  return def;
}

function strFromEnv(name: string, def: string): string {
  const v = process?.env?.[name] ?? (global as any)?.EXPO_PUBLIC?.[name];
  if (typeof v === 'string' && v.trim()) return v.trim();
  return def;
}

export function getImportKnobs(): ImportKnobs {
  const policyEnv = (strFromEnv('EXPO_PUBLIC_IMPORT_POLICY', 'conservative') as ParsePolicy);
  return {
    version: VERSION,
    policy: policyEnv,
    allowEnrich: boolFromEnv('EXPO_PUBLIC_IMPORT_ALLOW_ENRICH', false),
    minIngredientSupport: numFromEnv('EXPO_PUBLIC_IMPORT_MIN_ING_SUPPORT', 0.7),
    minStepSupport: numFromEnv('EXPO_PUBLIC_IMPORT_MIN_STEP_SUPPORT', 0.7),
    telemetryLevel: (strFromEnv('EXPO_PUBLIC_IMPORT_TELEMETRY', 'basic') as 'basic' | 'verbose')
  };
}

export type BuiltPrompt = { system: string; user: string };

// Basic builders (can be expanded). For now we centralize shared prefaces.
export function buildPrompt(kind: 'import.text' | 'import.image' | 'import.video' | 'import.urlJsonLd' | 'import.reconcile', policy: ParsePolicy, opts?: Partial<ImportKnobs>): BuiltPrompt {
  const knobs = { ...getImportKnobs(), ...(opts || {}), policy } as ImportKnobs;
  const preface = 'Output rule: Return STRICT JSON only (no markdown, no commentary).';
  switch (kind) {
    case 'import.text':
      return {
        system: [
          preface,
          'You are a precise recipe parser. Parse the provided unstructured text (may include headings/ads).',
          `Policy: ${knobs.policy}.`,
          'Rules (non-negotiable):',
          '- Include only items that appear in the text verbatim or near-verbatim; do not add or infer missing items, quantities, or steps.',
          '- Quantities: if unclear, omit quantity/unit rather than guess.',
          '- Times/servings: only if explicitly present; otherwise null.',
          'Schema (return minified JSON matching exactly):',
          '{"name": string | null, "description"?: string, "imageUrl"?: string, "ingredients": [{"name": string, "quantity"?: number | string, "unit"?: string, "optional"?: boolean }], "steps": string[], "tags": string[], "prepTime"?: number | null, "cookTime"?: number | null, "servings"?: number | null, "provenance": {"source": "text", "policy": "conservative", "evidenceUsed": string}}',
          'If evidence is insufficient for required fields, return only: {"abstain": true, "reason": "insufficient_text_evidence", "missing": [..] }'
        ].join('\n'),
        user: ''
      };
    case 'import.image':
      return {
        system: [
          preface,
          'You parse a recipe photo/screenshot. Use only OCR tokens provided or embedded.',
          `Policy: ${knobs.policy}.`,
          'Rules: no guesses; no invented ingredients; quantities only if explicit; if OCR cannot support both ingredients and steps, abstain.',
          'Return schema JSON exactly:',
          '{"name": string | null, "description"?: string, "imageUrl"?: string, "ingredients": [{"name": string, "quantity"?: number | string, "unit"?: string, "optional"?: boolean}], "steps": string[], "tags": string[], "prepTime"?: number | null, "cookTime"?: number | null, "servings"?: number | null, "provenance": {"source": "ocr", "policy": "conservative", "evidenceUsed": string}}',
          'If insufficient: {"abstain": true, "reason": "insufficient_ocr_evidence", "missing": [...]}'
        ].join('\n'),
        user: ''
      };
    case 'import.video':
      return {
        system: [
          preface,
          'You parse video-derived evidence (caption, transcript, OCR).',
          `Policy: ${knobs.policy}.`,
          'Rules: build from the union of caption+transcript+OCR. An item is eligible only if its main tokens appear in at least one source.',
          `Accept only if ≥${knobs.minIngredientSupport} ingredient support and ≥${knobs.minStepSupport} step support; otherwise abstain with reason "insufficient_video_evidence".`,
          'Return schema JSON with provenance and exact evidenceUsed lines.'
        ].join('\n'),
        user: ''
      };
    case 'import.urlJsonLd':
      return {
        system: [
          preface,
          'You import structured JSON-LD. Policy: verbatim. Map fields directly, normalize whitespace/fractions only. No reconciliation unless allowEnrich=true. provenance.source="json-ld".'
        ].join('\n'),
        user: ''
      };
    case 'import.reconcile':
      return {
        system: [
          preface,
          'You are a conservative recipe validator. Minimize changes while binding to evidence. Remove items with no token overlap to the evidence; record notes explaining each removal. Fix obvious parsing errors only. Preserve fraction formatting; normalize unit shorthands only. Return {recipe, notes, confidence}.',
        ].join('\n'),
        user: ''
      };
  }
}
