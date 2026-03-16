import React from 'react';
import { Stack } from 'expo-router';
import EnhancedProfileScreen from '@/components/profile/EnhancedProfileScreen';

export default function ProfileScreen() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <EnhancedProfileScreen />
    </>
  );
}
