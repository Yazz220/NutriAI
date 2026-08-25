import type { RecipeCapture } from '@/utils/cookbook/captureLifecycle';

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
}

export interface CaptureProgressStep {
  label: string;
  state: 'complete' | 'active' | 'upcoming';
}

const GENERIC_CAPTURE_FAILURE = 'Nosh saved your recipe, but could not finish the page. Please try again.';

function presentableFailureMessage(message?: string): string {
  if (!message) return GENERIC_CAPTURE_FAILURE;
  if (/\b(constraint|relation|sqlstate|postgres|row-level security|duplicate key|invalid input syntax)\b/i.test(message)) {
    return GENERIC_CAPTURE_FAILURE;
  }
  return message;
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
    return {
      phase: 'attention',
      label: 'Try again',
      title: recipeTitle,
      detail: presentableFailureMessage(capture.failureMessage ?? capture.pageWarning),
      cookbookTitle,
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
      detail: `${recipeTitle} has been understood. Nosh is preparing its cookbook page.`,
      cookbookTitle,
    };
  }

  return {
    phase: 'reading',
    label: 'Reading recipe',
    title: 'Reading your recipe',
    detail: 'Nosh is finding the ingredients, timings, and cooking steps.',
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
