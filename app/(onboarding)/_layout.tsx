import React from 'react';
import { Stack } from 'expo-router';
import { OnboardingProvider } from '@/contexts/OnboardingContext';
import { Colors } from '@/constants/colors';

export default function OnboardingLayout() {
  return (
    <OnboardingProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          gestureEnabled: true,
          gestureDirection: 'horizontal',
          animation: 'slide_from_right',
          animationDuration: 300,
          contentStyle: { backgroundColor: Colors.background },
        }}
      >
        <Stack.Screen 
          name="welcome" 
          options={{
            gestureEnabled: false, // Prevent going back from welcome screen
          }}
        />
        <Stack.Screen name="health-goals" />
        <Stack.Screen name="basic-profile" />
        <Stack.Screen name="dietary-preferences" />
        <Stack.Screen name="pantry-setup" />
        <Stack.Screen name="ai-coach-intro" />
        <Stack.Screen name="completion" />
      </Stack>
    </OnboardingProvider>
  );
}