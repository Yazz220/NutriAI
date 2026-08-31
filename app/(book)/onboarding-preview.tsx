import React from 'react';
import { Redirect, router } from 'expo-router';
import { FirstRunWelcome } from '@/components/onboarding/FirstRunWelcome';

export default function OnboardingPreviewScreen() {
  if (!__DEV__) {
    return <Redirect href="/" />;
  }

  return (
    <FirstRunWelcome
      onCreateCookbook={() => router.push('/(book)/library?firstRun=1')}
      onPreviewSample={() => router.push('/(book)/demo-cookbook')}
      onSkip={() => router.replace('/')}
    />
  );
}
