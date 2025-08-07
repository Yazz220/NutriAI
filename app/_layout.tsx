import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { InventoryProvider } from "@/hooks/useInventoryStore";
import { MealsProvider } from "@/hooks/useMealsStore";
import { ShoppingListProvider } from "@/hooks/useShoppingListStore";
import { UserPreferencesProvider } from "@/hooks/useUserPreferences";
import { MealPlannerProvider } from "@/hooks/useMealPlanner";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <UserPreferencesProvider>
        <InventoryProvider>
          <MealsProvider>
            <ShoppingListProvider>
              <MealPlannerProvider>
                <RootLayoutNav />
              </MealPlannerProvider>
            </ShoppingListProvider>
          </MealsProvider>
        </InventoryProvider>
      </UserPreferencesProvider>
    </QueryClientProvider>
  );
}