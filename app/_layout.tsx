import 'react-native-gesture-handler';
import 'react-native-reanimated';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, Text, Text as RNText } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { InventoryProvider } from "@/hooks/useInventoryStore";
import { MealsProvider } from "@/hooks/useMealsStore";
import { ShoppingListProvider } from "@/hooks/useShoppingListStore";
import { UserPreferencesProvider } from "@/hooks/useUserPreferences";
import { UserProfileProvider } from "@/hooks/useUserProfile";
import { MealPlannerProvider } from "@/hooks/useMealPlanner";
import { NutritionProvider } from "@/hooks/useNutrition";
import { ToastProvider } from "@/contexts/ToastContext";
import { GlobalErrorBoundary } from "@/components/ui/GlobalErrorBoundary";
import { useAuth } from "@/hooks/useAuth";
import { RecipeStoreProvider } from "@/hooks/useRecipeStore";
import { RecipeFoldersProvider } from "@/hooks/useRecipeFoldersStore";
import { Colors } from "@/constants/colors";
import { StatusBar } from "expo-status-bar";
import { loadFonts, Fonts } from '@/utils/fonts';

// (onboarding) stack remains accessible but not forced by root

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const { initializing, session } = useAuth();
  const devBypass = process.env.EXPO_PUBLIC_DEV_BYPASS_AUTH === 'true';
  const [fontsLoaded, setFontsLoaded] = useState(false);

  // Load fonts
  useEffect(() => {
    async function prepare() {
      try {
        await loadFonts();
        // Set global default font family to Manrope (UI) for all RN <Text />
        // This ensures existing components pick up the new UI font without code changes
        // while we gradually migrate to the custom Typography/Text components.
        // Merge with any existing default styles to avoid clobbering them.
        // Note: defaultProps is safe for RN Text in app code (not on web SSR).
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
  // Hide the splash screen once fonts are loaded. Declare this effect before
  // any early returns so hook order remains stable across renders.
  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null; // Or a loading screen
  }
  
  // No onboarding gating in root; keep it simple while we iterate on importing flow

  // splash hide is handled by the fontsLoaded effect above

  // No onboarding checks

  if (initializing) {
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
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        {devBypass || session ? (
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        ) : (
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        )}
      </Stack>
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <UserProfileProvider>
        <UserPreferencesProvider>
          <InventoryProvider>
            <MealsProvider>
              <ShoppingListProvider>
                <MealPlannerProvider>
                  <NutritionProvider>
                    <RecipeStoreProvider>
                      <RecipeFoldersProvider>
                      <ToastProvider>
                        <GlobalErrorBoundary>
                          <RootLayoutNav />
                        </GlobalErrorBoundary>
                      </ToastProvider>
                      </RecipeFoldersProvider>
                    </RecipeStoreProvider>
                  </NutritionProvider>
                </MealPlannerProvider>
              </ShoppingListProvider>
            </MealsProvider>
          </InventoryProvider>
        </UserPreferencesProvider>
      </UserProfileProvider>
    </QueryClientProvider>
  );
}