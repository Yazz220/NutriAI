import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, SafeAreaView } from 'react-native';
import { Stack } from 'expo-router';
import { Asset } from 'expo-asset';
import { OnboardingProvider } from '@/contexts/OnboardingContext';
import { Colors } from '@/constants/colors';

export default function OnboardingLayout() {
  const [assetsReady, setAssetsReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await Asset.loadAsync([
          require('@/assets/images/nosh/Nosh.gif'),
          require('@/assets/images/nosh/What do you like to eat.png'),
          require('@/assets/images/nosh/Do you have any allergies.png'),
        ]);
      } catch {}
      finally {
        if (mounted) setAssetsReady(true);
      }
    })();
    return () => { mounted = false; };
  }, []);

  if (!assetsReady) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="small" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <OnboardingProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          gestureEnabled: true,
          gestureDirection: 'horizontal',
          animation: 'slide_from_right',
          animationDuration: 260,
          contentStyle: { backgroundColor: Colors.background },
        }}
      >
        <Stack.Screen
          name="welcome"
          options={{
            gestureEnabled: false,
          }}
        />
        <Stack.Screen name="cookbook-style" />
        <Stack.Screen name="dietary-preferences" />
        <Stack.Screen name="allergies" />
        <Stack.Screen name="other-restrictions" />
      </Stack>
    </OnboardingProvider>
  );
}
