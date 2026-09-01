import type { RecipeCapture } from '@/utils/cookbook/captureLifecycle';
import {
  isRecipeEvidenceFailureCode,
  recipeEvidenceFeedback,
  type RecipeEvidenceFailureCode,
} from '@/supabase/functions/_shared/recipeEvidence';

export type CapturePresentationPhase =
  | 'reading'
  | 'preparing'
  | 'designing'
  | 'destination'
  | 'attention'
  | 'ready';

export interface CapturePresentation {
  phase: CapturePresentationPhase;
  label: string;
  title: string;
  detail: string;
  cookbookTitle?: string;
  action?: 'retry' | 'replace_source' | 'correct_recipe';
  actionLabel?: string;
}

export interface CaptureProgressStep {
  label: string;
  state: 'complete' | 'active' | 'upcoming';
}

const GENERIC_CAPTURE_FAILURE = 'Folio saved your recipe, but could not finish the page. Please try again.';

const TECHNICAL_FAILURE_COPY: Record<string, { title: string; detail: string }> = {
  source_read_failed: {
    title: 'Folio could not reopen this source',
    detail: 'The source is still saved. Try reading it again.',
  },
  source_acquisition_failed: {
    title: 'Nosh could not read this social video',
    detail: 'The link is still saved. Try reading it again.',
  },
  extraction_failed: {
    title: 'Folio could not finish reading this recipe',
    detail: 'The source is still saved. Try reading it again.',
  },
  quality_assessment_failed: {
    title: 'Folio could not verify the recipe details',
    detail: 'The understood recipe is still saved. Try the check again.',
  },
  destination_unavailable: {
    title: 'Folio could not open this cookbook',
    detail: 'Try again, or choose another cookbook for this recipe.',
  },
  page_generation_failed: {
    title: 'Folio could not finish the cookbook page',
    detail: 'The understood recipe is still saved. Try designing the page again.',
  },
  publication_failed: {
    title: 'The page is ready but was not added',
    detail: 'Try adding the finished page to the cookbook again.',
  },
  designed_page_limit_reached: {
    title: 'Page creation is waiting',
    detail: 'The understood recipe is saved. Check your page allowance to continue without starting over.',
  },
};

function presentableFailureMessage(message?: string): string {
  if (!message) return GENERIC_CAPTURE_FAILURE;
  if (/\b(constraint|relation|sqlstate|postgres|row-level security|duplicate key|invalid input syntax)\b/i.test(message)) {
    return GENERIC_CAPTURE_FAILURE;
  }
  return message;
}

function recipeEvidenceTitle(reasonCode: RecipeEvidenceFailureCode): string {
  if (reasonCode === 'not_a_recipe' || reasonCode === 'blank_or_empty_source') {
    return 'This does not look like a recipe';
  }
  if (reasonCode === 'unreadable_source') return 'Folio could not read this recipe';
  if (reasonCode === 'blurry_or_low_resolution_image') return 'This recipe image is too blurry';
  if (reasonCode === 'cropped_recipe_image') return 'This recipe image is incomplete';
  if (reasonCode === 'url_unavailable') return 'Folio could not open this recipe page';
  if (reasonCode === 'url_access_restricted') return 'This site blocked recipe access';
  if (reasonCode === 'url_source_unsupported') return "This link isn't a readable recipe page";
  if (reasonCode === 'url_too_large') return 'This recipe page is too large';
  if (reasonCode === 'video_source_unsupported') return 'Add the recipe another way';
  if (reasonCode === 'video_permission_required') return 'Permission is required for this video';
  if (reasonCode === 'video_unavailable') return 'Folio could not open this video';
  if (reasonCode === 'video_too_large') return 'This video is too large';
  if (reasonCode === 'audio_source_unsupported') return "This audio format isn't supported";
  if (reasonCode === 'audio_too_large') return 'This audio file is too large';
  if (reasonCode === 'audio_no_speech') return 'Folio could not hear a recipe';
  if (reasonCode === 'audio_transcription_failed') return 'Folio could not transcribe this audio';
  if (reasonCode === 'multiple_recipes') return 'Share one recipe at a time';
  return 'Folio needs a more complete source';
}

export function getCapturePresentation(
  capture: RecipeCapture,
  cookbookTitle?: string,
): CapturePresentation {
  const recipeTitle = capture.recipeGraph?.title ?? 'Your recipe';

  if (capture.status === 'needs_destination') {
    return {
      phase: 'destination',
      label: 'Choose cookbook',
      title: recipeTitle,
      detail: 'Choose where this finished page belongs.',
    };
  }

  if (capture.status === 'needs_attention') {
    if (capture.failureCode === 'needs_recipe_correction' && capture.recipeGraph) {
      const openIssues = capture.recipeGraph.provenance?.qualityAssessment?.issues.filter((issue) => (
        issue.severity === 'blocking' && !issue.confirmed
      )) ?? [];
      return {
        phase: 'attention',
        label: 'Check details',
        title: `Check ${recipeTitle}`,
        detail: openIssues[0]?.message
          ?? 'Check the extracted recipe details before Folio creates the page.',
        cookbookTitle,
        action: 'correct_recipe',
        actionLabel: 'Review recipe',
      };
    }
    if (isRecipeEvidenceFailureCode(capture.failureCode)) {
      const retrySavedSource = capture.failureCode === 'url_unavailable'
        || capture.failureCode === 'video_unavailable'
        || capture.failureCode === 'audio_transcription_failed';
      return {
        phase: 'attention',
        label: 'Check source',
        title: recipeEvidenceTitle(capture.failureCode),
        detail: recipeEvidenceFeedback(capture.failureCode),
        cookbookTitle,
        action: retrySavedSource ? 'retry' : 'replace_source',
        actionLabel: capture.failureCode === 'url_unavailable'
          ? 'Try link again'
          : capture.failureCode === 'video_unavailable'
            ? 'Try video again'
            : capture.failureCode === 'audio_transcription_failed'
              ? 'Try audio again'
              : 'Choose another source',
      };
    }
    const technicalFailure = capture.failureCode
      ? TECHNICAL_FAILURE_COPY[capture.failureCode]
      : undefined;
    if (technicalFailure) {
      return {
        phase: 'attention',
        label: 'Try again',
        title: technicalFailure.title,
        detail: technicalFailure.detail,
        cookbookTitle,
        action: 'retry',
        actionLabel: 'Try again',
      };
    }
    return {
      phase: 'attention',
      label: 'Try again',
      title: recipeTitle,
      detail: presentableFailureMessage(capture.failureMessage ?? capture.pageWarning),
      cookbookTitle,
      action: 'retry',
      actionLabel: 'Try again',
    };
  }

  if (capture.status === 'ready') {
    return {
      phase: 'ready',
      label: 'Ready',
      title: recipeTitle,
      detail: cookbookTitle ? `Added to ${cookbookTitle}` : 'Added to your cookbook',
      cookbookTitle,
    };
  }

  if (capture.pageStatus === 'generating' || capture.pageId) {
    return {
      phase: 'designing',
      label: 'Designing page',
      title: 'Creating your cookbook page',
      detail: cookbookTitle
        ? `Applying ${cookbookTitle}’s visual style to ${recipeTitle}.`
        : `Designing the finished page for ${recipeTitle}.`,
      cookbookTitle,
    };
  }

  if (capture.recipeGraph) {
    return {
      phase: 'preparing',
      label: 'Preparing page',
      title: 'Preparing your recipe',
      detail: `${recipeTitle} has been understood. Folio is preparing its cookbook page.`,
      cookbookTitle,
    };
  }

  return {
    phase: 'reading',
    label: 'Reading recipe',
    title: 'Reading your recipe',
    detail: 'Folio is finding the ingredients, timings, and cooking steps.',
    cookbookTitle,
  };
}

export function captureProgressSteps(capture: RecipeCapture): CaptureProgressStep[] {
  const recipeUnderstood = Boolean(capture.recipeGraph);
  const pageReady = capture.status === 'ready' && capture.pageStatus === 'ready';
  const pageInProgress = recipeUnderstood && capture.status === 'processing';

  return [
    { label: 'Source saved', state: 'complete' },
    {
      label: 'Recipe understood',
      state: recipeUnderstood ? 'complete' : 'active',
    },
    {
      label: 'Page added to cookbook',
      state: pageReady ? 'complete' : pageInProgress ? 'active' : 'upcoming',
    },
  ];
}

const ACTIVITY_PRIORITY: Record<RecipeCapture['status'], number> = {
  processing: 0,
  needs_destination: 1,
  needs_attention: 2,
  ready: 3,
};

export function prioritizeCaptureActivity(captures: RecipeCapture[]): RecipeCapture[] {
  return [...captures].sort((left, right) => {
    const priority = ACTIVITY_PRIORITY[left.status] - ACTIVITY_PRIORITY[right.status];
    if (priority !== 0) return priority;
    return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
  });
}
