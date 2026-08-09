import React from 'react';
import { Stack } from 'expo-router';

export default function BookByIdLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="add" />
      <Stack.Screen name="templates" />
      <Stack.Screen name="review" />
      <Stack.Screen name="generation/[pageId]" />
    </Stack>
  );
}
