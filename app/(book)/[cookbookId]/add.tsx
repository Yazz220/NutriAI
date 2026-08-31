import React from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { RecipeCaptureScreen } from '@/components/nosh/capture/RecipeCaptureScreen';
import { useCookbook } from '@/hooks/useCookbook';

export default function AddPageScreen() {
  const { cookbookId } = useLocalSearchParams<{ cookbookId: string }>();
  const { cookbook } = useCookbook(cookbookId);
  const cookbookTitle = cookbook?.title ?? 'Cookbook';

  return (
    <RecipeCaptureScreen
      destinationCookbookId={cookbookId}
      cookbookTitle={cookbookTitle}
      onExit={() => router.replace(`/(book)/${cookbookId}`)}
      exitAccessibilityLabel="Back to cookbook"
    />
  );
}
