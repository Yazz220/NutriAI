import React from 'react';
import { Stack } from 'expo-router';

export default function BookLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="library" options={{ presentation: 'card' }} />
      <Stack.Screen name="settings" />
      <Stack.Screen name="[cookbookId]" options={{ animation: 'none' }} />
    </Stack>
  );
}
