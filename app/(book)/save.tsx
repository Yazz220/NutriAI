import React from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { RecipeCaptureScreen } from '@/components/nosh/capture/RecipeCaptureScreen';

export default function SaveRecipeScreen() {
  const params = useLocalSearchParams<{
    captureId?: string | string[];
    captureAction?: string | string[];
  }>();
  const captureId = Array.isArray(params.captureId) ? params.captureId[0] : params.captureId;
  const rawCaptureAction = Array.isArray(params.captureAction) ? params.captureAction[0] : params.captureAction;
  const initialCaptureAction = rawCaptureAction === 'replace_source' || rawCaptureAction === 'correct_recipe'
    ? rawCaptureAction
    : undefined;
  return (
    <RecipeCaptureScreen
      captureId={captureId}
      initialCaptureAction={initialCaptureAction}
      onExit={() => router.replace('/(book)')}
      exitAccessibilityLabel="Back to my cookbooks"
    />
  );
}
