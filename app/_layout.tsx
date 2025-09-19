import 'react-native-gesture-handler';
import 'react-native-reanimated';

import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text, Text as RNText } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { Colors } from '@/constants/colors';
import { loadFonts, Fonts } from '@/utils/fonts';
import { isOnboardingCompleted } from '@/contexts/OnboardingContext';
import { useAuth } from '@/hooks/useAuth';
import { GlobalErrorBoundary } from '@/components/ui/GlobalErrorBoundary';
import { ToastProvider } from '@/contexts/ToastContext';

// Store Providers
import { InventoryProvider } from '@/hooks/useInventoryStore';
import { MealsProvider } from '@/hooks/useMealsStore';
import { ShoppingListProvider } from '@/hooks/useShoppingListStore';
import { UserPreferencesProvider } from '@/hooks/useUserPreferences';
import { UserProfileProvider } from '@/hooks/useUserProfile';
import { MealPlannerProvider } from '@/hooks/useMealPlanner';
import { NutritionProvider } from '@/hooks/useNutrition';
import { RecipeStoreProvider } from '@/hooks/useRecipeStore';
import { RecipeFoldersProvider } from '@/hooks/useRecipeFoldersStore';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const { initializing, session } = useAuth();
  const devBypass = process.env.EXPO_PUBLIC_DEV_BYPASS_AUTH === 'true';
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);

  // Load fonts and check onboarding status
  useEffect(() => {
    const initializeApp = async () => {
      try {
        await loadFonts();
        setupGlobalFontDefaults();
        
        const completed = await isOnboardingCompleted();
        setOnboardingCompleted(completed);
      } catch (error) {
        console.warn('Error initializing app:', error);
        setOnboardingCompleted(false); // Default to showing onboarding on error
      } finally {
        setFontsLoaded(true);
      }
    };
    
    initializeApp();
  }, []);

  /**
   * Sets up global font defaults for React Native Text components
   * This ensures existing components pick up the new UI font without code changes
   */
  const setupGlobalFontDefaults = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (RNText as any).defaultProps = {
      ...(RNText as any).defaultProps,
      style: [
        { fontFamily: Fonts.ui?.regular ?? Fonts.regular },
        (RNText as any).defaultProps && (RNText as any).defaultProps.style,
      ],
    };
  };
  // Hide splash screen once fonts are loaded
  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(console.warn);
    }
  }, [fontsLoaded]);

  // Show loading screen while initializing
  if (!fontsLoaded || onboardingCompleted === null || initializing) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar style="light" />
        <ActivityIndicator color={Colors.primary} />
        <Text style={styles.loadingText}>Loading…</Text>
      </View>
    );
  }

  /**
   * Determines which screen to show based on onboarding and auth status
   */
  const getInitialScreen = () => {
    // Priority 1: Onboarding (value-first approach)
    if (!onboardingCompleted) {
      return <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />;
    }
    
    // Priority 2: Authentication (unless dev bypass is enabled)
    if (!devBypass && !session) {
      return <Stack.Screen name="(auth)" options={{ headerShown: false }} />;
    }
    
    // Priority 3: Main app (authenticated or dev bypass)
    return <Stack.Screen name="(tabs)" options={{ headerShown: false }} />;
  };

  return (
    <GestureHandlerRootView style={styles.rootContainer}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        {getInitialScreen()}
      </Stack>
    </GestureHandlerRootView>
  );
}

/**
 * Combines all app providers in a clean, readable structure
 */
const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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
                            {children}
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
};

export default function RootLayout() {
  return (
    <AppProviders>
      <RootLayoutNav />
    </AppProviders>
  );
}

// Styles
const styles = {
  loadingContainer: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: Colors.background,
  },
  loadingText: {
    marginTop: 8,
    color: Colors.lightText,
  },
  rootContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
};