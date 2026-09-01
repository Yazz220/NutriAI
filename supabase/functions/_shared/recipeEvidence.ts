export const RECIPE_EVIDENCE_OUTCOMES = [
  'recipe',
  'not_recipe',
  'insufficient_evidence',
] as const;

export const MAX_RECIPE_TEXT_CHARACTERS = 50_000;

export function recipeTextSourceIsTooLarge(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > MAX_RECIPE_TEXT_CHARACTERS;
}

export type RecipeEvidenceOutcome = typeof RECIPE_EVIDENCE_OUTCOMES[number];

export const RECIPE_EVIDENCE_REASON_CODES = [
  'none',
  'not_a_recipe',
  'blank_or_empty_source',
  'unreadable_source',
  'blurry_or_low_resolution_image',
  'cropped_recipe_image',
  'url_unavailable',
  'url_access_restricted',
  'url_source_unsupported',
  'url_too_large',
  'video_source_unsupported',
  'video_permission_required',
  'video_unavailable',
  'video_too_large',
  'audio_source_unsupported',
  'audio_too_large',
  'audio_no_speech',
  'audio_transcription_failed',
  'missing_ingredients',
  'missing_instructions',
  'multiple_recipes',
] as const;

export type RecipeEvidenceReasonCode = typeof RECIPE_EVIDENCE_REASON_CODES[number];

export type RecipeEvidenceFailureCode = Exclude<RecipeEvidenceReasonCode, 'none'>;

export interface AcceptedRecipeEvidenceDecision {
  outcome: 'recipe';
  reasonCode: 'none';
  diagnostic: string;
  recipeGraph: Record<string, unknown>;
}

export interface RejectedRecipeEvidenceDecision {
  outcome: 'not_recipe' | 'insufficient_evidence';
  reasonCode: RecipeEvidenceFailureCode;
  diagnostic: string;
  recipeGraph: null;
}

export type RecipeEvidenceDecision =
  | AcceptedRecipeEvidenceDecision
  | RejectedRecipeEvidenceDecision;

interface RecipeEvidenceCompletion {
  choices?: Array<{
    finish_reason?: string | null;
    message?: {
      content?: string | Array<{ type?: string; text?: string }> | null;
    };
  }>;
}

const NOT_RECIPE_REASONS = new Set<RecipeEvidenceReasonCode>([
  'not_a_recipe',
  'blank_or_empty_source',
]);

const INSUFFICIENT_EVIDENCE_REASONS = new Set<RecipeEvidenceReasonCode>([
  'unreadable_source',
  'blurry_or_low_resolution_image',
  'cropped_recipe_image',
  'url_unavailable',
  'url_access_restricted',
  'url_source_unsupported',
  'url_too_large',
  'video_source_unsupported',
  'video_permission_required',
  'video_unavailable',
  'video_too_large',
  'audio_source_unsupported',
  'audio_too_large',
  'audio_no_speech',
  'audio_transcription_failed',
  'missing_ingredients',
  'missing_instructions',
  'multiple_recipes',
]);

const FEEDBACK_BY_REASON: Record<RecipeEvidenceFailureCode, string> = {
  not_a_recipe: 'This source does not appear to contain a recipe. Choose another link, image, video, audio file, or pasted recipe.',
  blank_or_empty_source: 'This source appears blank or contains too little visible information. Choose a clearer source.',
  unreadable_source: 'Folio could not read enough of this recipe. Choose a sharper, well-lit source with the full recipe visible.',
  blurry_or_low_resolution_image: 'This recipe image is too blurry or low-resolution to read reliably. Choose a sharper image and try again.',
  cropped_recipe_image: 'Part of this recipe is cut off. Choose an image that shows the full ingredient list and cooking method.',
  url_unavailable: 'Folio could not reach this recipe page. Check that the link still works and try again.',
  url_access_restricted: 'This site would not let Folio read the recipe. Open it in your browser, then share screenshots or paste the recipe text.',
  url_source_unsupported: 'This link does not open a readable webpage. Share the recipe page itself, screenshots, or paste the recipe text.',
  url_too_large: 'This webpage is too large for Folio to read safely. Share screenshots or paste the recipe text instead.',
  video_source_unsupported: 'Folio could not read this social video directly. Open the original, then add the video file, screenshots, audio, or recipe text.',
  video_permission_required: 'Confirm that you made this video or have permission to process it, then add it again.',
  video_unavailable: 'Folio could not open this video. Check that it is public and still available, then try again.',
  video_too_large: 'This video is too large to read directly. Choose a shorter file under 20 MB, screenshots, audio, or pasted recipe text.',
  audio_source_unsupported: 'Folio can read MP3, M4A, WAV, AAC, AIFF, OGG, and FLAC audio files. Choose a supported recording and try again.',
  audio_too_large: 'This audio file is too large. Choose a recording under 6 MB or paste the recipe text.',
  audio_no_speech: 'Folio could not find clear spoken recipe details in this audio. Choose a clearer recording or paste the recipe text.',
  audio_transcription_failed: 'Folio could not transcribe this audio right now. The recording is saved, so you can try again.',
  missing_ingredients: 'Folio found recipe instructions but not a complete ingredient list. Choose a source that includes the ingredients.',
  missing_instructions: 'Folio found ingredients but not enough cooking instructions. Choose a source that includes the method.',
  multiple_recipes: 'This source appears to contain more than one recipe. Share one recipe at a time.',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isOutcome(value: unknown): value is RecipeEvidenceOutcome {
  return typeof value === 'string'
    && (RECIPE_EVIDENCE_OUTCOMES as readonly string[]).includes(value);
}

export function isRecipeEvidenceReasonCode(value: unknown): value is RecipeEvidenceReasonCode {
  return typeof value === 'string'
    && (RECIPE_EVIDENCE_REASON_CODES as readonly string[]).includes(value);
}

export function isRecipeEvidenceFailureCode(value: unknown): value is RecipeEvidenceFailureCode {
  return isRecipeEvidenceReasonCode(value) && value !== 'none';
}

/**
 * Validates the provider-neutral decision envelope returned by an extractor.
 * Provider-specific response shapes must be adapted into this contract before
 * capture orchestration can use them.
 */
export function normalizeRecipeEvidenceDecision(value: unknown): RecipeEvidenceDecision {
  if (!isRecord(value)) throw new Error('Extraction returned an invalid evidence decision');

  const outcome = value.outcome;
  const reasonCode = value.reasonCode;
  if (!isOutcome(outcome) || !isRecipeEvidenceReasonCode(reasonCode)) {
    throw new Error('Extraction returned an invalid evidence outcome');
  }

  const recipeGraph = isRecord(value.recipeGraph) ? value.recipeGraph : null;
  const diagnostic = typeof value.diagnostic === 'string'
    ? value.diagnostic.trim().slice(0, 500)
    : '';

  if (outcome === 'recipe') {
    if (reasonCode !== 'none' || !recipeGraph) {
      throw new Error('Accepted recipe evidence must include a Recipe Graph');
    }
  } else if (recipeGraph) {
    throw new Error('Rejected recipe evidence cannot include a Recipe Graph');
  } else if (outcome === 'not_recipe' && !NOT_RECIPE_REASONS.has(reasonCode)) {
    throw new Error('Non-recipe evidence returned an incompatible reason');
  } else if (outcome === 'insufficient_evidence' && !INSUFFICIENT_EVIDENCE_REASONS.has(reasonCode)) {
    throw new Error('Insufficient recipe evidence returned an incompatible reason');
  }

  if (outcome === 'recipe') {
    return { outcome, reasonCode: 'none', diagnostic, recipeGraph: recipeGraph! };
  }
  return { outcome, reasonCode: reasonCode as RecipeEvidenceFailureCode, diagnostic, recipeGraph: null };
}

export function parseRecipeEvidenceCompletion(
  response: RecipeEvidenceCompletion,
): RecipeEvidenceDecision {
  const choice = response.choices?.[0];
  if (choice?.finish_reason && choice.finish_reason !== 'stop') {
    throw new Error('Recipe extraction did not finish. Please try again.');
  }

  const content = choice?.message?.content;
  const text = typeof content === 'string'
    ? content
    : Array.isArray(content)
      ? content.map((part) => part.type === 'text' ? part.text ?? '' : '').join('\n')
      : '';
  if (!text.trim()) throw new Error('Extraction returned no content');

  const trimmed = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  const jsonText = start >= 0 && end > start ? trimmed.slice(start, end + 1) : trimmed;
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error('AI returned invalid JSON');
  }
  return normalizeRecipeEvidenceDecision(parsed);
}

export function recipeEvidenceFeedback(reasonCode: RecipeEvidenceFailureCode): string {
  return FEEDBACK_BY_REASON[reasonCode];
}
