import React from 'react';
import { Stack } from 'expo-router';

export default function BookLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="toc" />
      <Stack.Screen name="add" />
      <Stack.Screen name="review" />
      <Stack.Screen name="generation/[pageId]" />
      <Stack.Screen name="settings" />
    </Stack>
  );
}
