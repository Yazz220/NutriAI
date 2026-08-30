import React from 'react';
import { Redirect } from 'expo-router';
import SignInScreen from '@/app/(auth)/sign-in';

export default function SignInPreviewScreen() {
  if (!__DEV__) {
    return <Redirect href="/" />;
  }

  return <SignInScreen />;
}
