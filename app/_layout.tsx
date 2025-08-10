import 'react-native-gesture-handler';
import 'react-native-reanimated';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { View, ActivityIndicator, Text } from "react-native";
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

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const { initializing, session } = useAuth();
  const devBypass = process.env.EXPO_PUBLIC_DEV_BYPASS_AUTH === 'true';
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  if (initializing) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
        <Text style={{ marginTop: 8 }}>Loading…</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
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
                      <ToastProvider>
                        <GlobalErrorBoundary>
                          <RootLayoutNav />
                        </GlobalErrorBoundary>
                      </ToastProvider>
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