import 'react-native-url-polyfill/auto';
import 'react-native-gesture-handler';
import 'react-native-reanimated';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, Text, Text as RNText } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { UserPreferencesProvider } from "@/hooks/useUserPreferences";
import { UserProfileProvider } from "@/hooks/useUserProfile";
import { ToastProvider } from "@/contexts/ToastContext";
import { GlobalErrorBoundary } from "@/components/ui/GlobalErrorBoundary";
import { useAuth } from "@/hooks/useAuth";
import { CookbookProvider } from "@/hooks/useCookbook";
import { Colors } from "@/constants/colors";
import { StatusBar } from "expo-status-bar";
import { loadFonts, Fonts } from '@/utils/fonts';
import { isOnboardingCompleted } from '@/contexts/OnboardingContext';
import { OfflineBanner } from '@/components/ui/OfflineBanner';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const { initializing, session } = useAuth();
  const devBypass = process.env.EXPO_PUBLIC_DEV_BYPASS_AUTH === 'true';
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);
  const router = useRouter();
  const segments = useSegments();

  // Load fonts and check onboarding status
  useEffect(() => {
    async function prepare() {
      try {
        await loadFonts();
        // Set global default font family to Manrope (UI) for all RN <Text />
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (RNText as any).defaultProps = {
          ...(RNText as any).defaultProps,
          style: [
            { fontFamily: Fonts.ui?.regular ?? Fonts.regular },
            (RNText as any).defaultProps && (RNText as any).defaultProps.style,
          ],
        };

        const completed = await isOnboardingCompleted();
        setOnboardingCompleted(completed);
      } catch (e) {
        console.warn('Error loading fonts:', e);
        setOnboardingCompleted(false);
      } finally {
        setFontsLoaded(true);
      }
    }
    prepare();
  }, []);

  useEffect(() => {
    if (!fontsLoaded) return;

    let cancelled = false;

    isOnboardingCompleted()
      .then((completed) => {
        if (!cancelled) {
          setOnboardingCompleted(completed);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setOnboardingCompleted(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [fontsLoaded, segments]);

  // Hide the splash only after the first renderable app state is ready.
  useEffect(() => {
    if (fontsLoaded && onboardingCompleted !== null) {
      SplashScreen.hideAsync().catch(() => { });
    }
  }, [fontsLoaded, onboardingCompleted]);

  // Handle navigation based on auth state changes
  useEffect(() => {
    if (initializing || !fontsLoaded || onboardingCompleted === null) return;

    const isAuthenticated = devBypass || !!session;
    const inAuthGroup = segments[0] === '(auth)';
    const inOnboardingGroup = segments[0] === '(onboarding)';
    const inBookGroup = segments[0] === '(book)';

    // Redirect to onboarding if not completed
    if (!onboardingCompleted && !inOnboardingGroup) {
      router.replace('/(onboarding)/welcome');
      return;
    }

    // Redirect to auth if onboarding complete but not authenticated
    if (onboardingCompleted && !isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/sign-in');
      return;
    }

    // Redirect to book if authenticated but not in book
    if (onboardingCompleted && isAuthenticated && !inBookGroup) {
      router.replace('/(book)');
      return;
    }
  }, [initializing, session, segments, fontsLoaded, onboardingCompleted, devBypass, router]);

  if (!fontsLoaded || onboardingCompleted === null || initializing) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background }}>
        <StatusBar style="light" />
        <ActivityIndicator color={Colors.primary} />
        <Text style={{ marginTop: 8, color: Colors.lightText }}>Loading…</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: Colors.background }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(book)" options={{ headerShown: false }} />
        </Stack>
        <OfflineBanner />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <UserProfileProvider>
        <UserPreferencesProvider>
          <CookbookProvider>
            <ToastProvider>
              <GlobalErrorBoundary>
                <RootLayoutNav />
              </GlobalErrorBoundary>
            </ToastProvider>
          </CookbookProvider>
        </UserPreferencesProvider>
      </UserProfileProvider>
    </QueryClientProvider>
  );
}
