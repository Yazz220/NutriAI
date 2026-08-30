import React from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { RecipeCaptureScreen } from '@/components/nosh/capture/RecipeCaptureScreen';

export default function SaveRecipeScreen() {
  const params = useLocalSearchParams<{ captureId?: string | string[] }>();
  const captureId = Array.isArray(params.captureId) ? params.captureId[0] : params.captureId;
  return (
    <RecipeCaptureScreen
      captureId={captureId}
      onExit={() => router.replace('/(book)')}
      exitAccessibilityLabel="Back to my cookbooks"
    />
  );
}
