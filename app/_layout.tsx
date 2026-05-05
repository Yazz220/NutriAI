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
import { CookbookImportProvider } from "@/hooks/useCookbookImport";
import { Colors } from "@/constants/colors";
import { StatusBar } from "expo-status-bar";
import { loadFonts, Fonts } from '@/utils/fonts';
import { OfflineBanner } from '@/components/ui/OfflineBanner';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const { initializing, session } = useAuth();
  const devBypass = process.env.EXPO_PUBLIC_DEV_BYPASS_AUTH === 'true';
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    async function prepare() {
      try {
        await loadFonts();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (RNText as any).defaultProps = {
          ...(RNText as any).defaultProps,
          style: [
            { fontFamily: Fonts.ui?.regular ?? Fonts.regular },
            (RNText as any).defaultProps && (RNText as any).defaultProps.style,
          ],
        };
      } catch (e) {
        console.warn('Error loading fonts:', e);
      } finally {
        setFontsLoaded(true);
      }
    }
    prepare();
  }, []);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded]);

  useEffect(() => {
    if (initializing || !fontsLoaded) return;

    const isAuthenticated = devBypass || !!session;
    const inAuthGroup = segments[0] === '(auth)';
    const inBookGroup = segments[0] === '(book)';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/sign-in');
      return;
    }

    if (isAuthenticated && !inBookGroup) {
      router.replace('/(book)');
      return;
    }
  }, [initializing, session, segments, fontsLoaded, devBypass, router]);

  if (!fontsLoaded || initializing) {
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
            <CookbookImportProvider>
              <ToastProvider>
                <GlobalErrorBoundary>
                  <RootLayoutNav />
                </GlobalErrorBoundary>
              </ToastProvider>
            </CookbookImportProvider>
          </CookbookProvider>
        </UserPreferencesProvider>
      </UserProfileProvider>
    </QueryClientProvider>
  );
}
