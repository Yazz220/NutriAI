import { Spacing } from '@/constants/spacing';
import 'react-native-url-polyfill/auto';
import 'react-native-gesture-handler';
import 'react-native-reanimated';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as Linking from 'expo-linking';
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { ShareIntentProvider } from 'expo-share-intent';
import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, Platform, Text, Text as RNText, StyleProp, TextStyle } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ToastProvider } from "@/contexts/ToastContext";
import { GlobalErrorBoundary } from "@/components/ui/GlobalErrorBoundary";
import { useAuth } from "@/hooks/useAuth";
import { CookbooksProvider } from "@/hooks/useCookbooks";
import { NoshConversationProvider, useNoshConversation } from '@/contexts/NoshConversationContext';
import { NoshConversationHost } from '@/components/cookbook/NoshAssistantChat';
import { RecipeCaptureResume } from '@/components/nosh/capture/RecipeCaptureResume';
import { NativeShareIngestion } from '@/components/nosh/capture/NativeShareIngestion';
import { NoshHorizontalLockup } from '@/components/brand/NoshBrandAssets';
import { NoshNativeShareProvider } from '@/contexts/NoshNativeShareContext';
import { AiDataConsentProvider } from '@/contexts/AiDataConsentContext';
import { Colors } from "@/constants/colors";
import { StatusBar } from "expo-status-bar";
import { loadFonts, Fonts } from '@/utils/fonts';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { LocalUserDataCleanupResume } from '@/components/account/LocalUserDataCleanupResume';
import { supabase } from '@/lib/supabase';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();
const webInteractionStyles = `
button,
[role='button'],
input,
textarea,
[contenteditable='true'] {
  -webkit-tap-highlight-color: transparent;
}

input:focus,
textarea:focus,
[contenteditable='true']:focus {
  outline: none !important;
}

button:focus,
[role='button']:focus {
  outline: none;
}

button:focus-visible,
[role='button']:focus-visible {
  outline: 1px solid rgba(101, 67, 111, 0.38);
  outline-offset: 3px;
}
`;
const shareIntentOptions = {
  scheme: 'nosh',
  resetOnBackground: false,
  disabled: Platform.OS === 'web'
    || Constants.executionEnvironment === ExecutionEnvironment.StoreClient,
};

type TextWithDefaultProps = typeof RNText & {
  defaultProps?: {
    style?: StyleProp<TextStyle>;
  };
};

function WebInteractionStyles() {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;

    const existing = document.getElementById('nosh-interaction-reset');
    if (existing) return;

    const style = document.createElement('style');
    style.id = 'nosh-interaction-reset';
    style.textContent = webInteractionStyles;
    document.head.appendChild(style);

    return () => style.remove();
  }, []);

  return null;
}

function getAuthCallbackParams(url: string): URLSearchParams {
  const params = new URLSearchParams();
  const hashIndex = url.indexOf('#');
  const queryIndex = url.indexOf('?');
  const queryEnd = hashIndex >= 0 ? hashIndex : url.length;
  const query =
    queryIndex >= 0 && queryIndex < queryEnd ? url.slice(queryIndex + 1, queryEnd) : '';
  const hash = hashIndex >= 0 ? url.slice(hashIndex + 1) : '';

  [hash, query].forEach((part) => {
    if (!part) return;
    new URLSearchParams(part).forEach((value, key) => {
      params.set(key, value);
    });
  });

  return params;
}

function isSupabaseAuthCallback(params: URLSearchParams): boolean {
  return ['access_token', 'refresh_token', 'code', 'token_hash', 'error', 'error_description', 'error_code']
    .some((key) => params.has(key));
}

async function handleSupabaseAuthCallbackUrl(
  url: string,
  appRouter: ReturnType<typeof useRouter>,
): Promise<boolean> {
  const params = getAuthCallbackParams(url);
  if (!isSupabaseAuthCallback(params)) return false;

  const callbackError = params.get('error_description') ?? params.get('error');
  if (callbackError) {
    console.warn('[Auth] Supabase callback error:', callbackError);
    return false;
  }

  const type = params.get('type');
  const isRecovery = type === 'recovery';
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  const code = params.get('code');
  const tokenHash = params.get('token_hash');

  if (tokenHash && isRecovery) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' });
    if (error) throw error;
    appRouter.replace('/(auth)/reset-password');
    return true;
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    appRouter.replace(isRecovery ? '/(auth)/reset-password' : '/(book)');
    return true;
  }

  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) throw error;
    appRouter.replace(isRecovery ? '/(auth)/reset-password' : '/(book)');
    return true;
  }

  if (isRecovery) {
    appRouter.replace('/(auth)/reset-password');
    return true;
  }

  return false;
}

function RootLayoutNav() {
  const { initializing, session } = useAuth();
  const { visible: noshConversationVisible } = useNoshConversation();
  const devBypass = process.env.EXPO_PUBLIC_DEV_BYPASS_AUTH === 'true';
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [checkingAuthCallback, setCheckingAuthCallback] = useState(true);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    async function prepare() {
      try {
        await loadFonts();
        const TextComponent = RNText as TextWithDefaultProps;
        TextComponent.defaultProps = {
          ...(TextComponent.defaultProps ?? {}),
          style: [
            { fontFamily: Fonts.ui?.regular ?? Fonts.regular },
            TextComponent.defaultProps?.style,
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
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [fontsLoaded]);

  useEffect(() => {
    let cancelled = false;

    async function processInitialUrl() {
      try {
        const url = await Linking.getInitialURL();
        if (!cancelled && url) {
          await handleSupabaseAuthCallbackUrl(url, router);
        }
      } catch (err) {
        console.warn('[Auth] Could not process auth callback URL:', err);
      } finally {
        if (!cancelled) {
          setCheckingAuthCallback(false);
        }
      }
    }

    void processInitialUrl();

    const subscription = Linking.addEventListener('url', ({ url }) => {
      void handleSupabaseAuthCallbackUrl(url, router).catch((err) => {
        console.warn('[Auth] Could not process auth callback URL:', err);
      });
    });

    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, [router]);

  useEffect(() => {
    if (initializing || !fontsLoaded || checkingAuthCallback) return;

    const canEnterBook = devBypass || !!session;
    const routeSegments = segments as readonly string[];
    const inAuthGroup = routeSegments[0] === '(auth)';
    const inBookGroup = routeSegments[0] === '(book)';
    const inResetPasswordRoute = inAuthGroup && routeSegments.includes('reset-password');

    if (!canEnterBook && !inAuthGroup) {
      router.replace('/(auth)/sign-in');
      return;
    }

    if (canEnterBook && !inBookGroup && !inResetPasswordRoute) {
      router.replace('/(book)');
      return;
    }
  }, [initializing, session, segments, fontsLoaded, checkingAuthCallback, devBypass, router]);

  if (!fontsLoaded || initializing || checkingAuthCallback) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background }}>
        <StatusBar style="dark" />
        <NoshHorizontalLockup width={164} />
        <View style={{ height: Spacing.xl }} />
        <ActivityIndicator color={Colors.primary} />
        <Text style={{ marginTop: Spacing.values[8], color: Colors.lightText }}>Opening your cookbook…</Text>
      </View>
    );
  }

  return (
    <AiDataConsentProvider>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: Colors.background }}>
        <SafeAreaProvider>
          <StatusBar style="dark" />
          <View
            style={{ flex: 1 }}
            pointerEvents={noshConversationVisible ? 'none' : 'auto'}
            accessibilityElementsHidden={noshConversationVisible}
            importantForAccessibility={noshConversationVisible ? 'no-hide-descendants' : 'auto'}
          >
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(auth)" options={{ headerShown: false }} />
              <Stack.Screen name="(book)" options={{ headerShown: false }} />
            </Stack>
          </View>
          <NoshConversationHost />
          <RecipeCaptureResume />
          <NativeShareIngestion />
          <LocalUserDataCleanupResume />
          <OfflineBanner />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </AiDataConsentProvider>
  );
}

export default function RootLayout() {
  return (
    <ShareIntentProvider options={shareIntentOptions}>
      <NoshNativeShareProvider>
        <QueryClientProvider client={queryClient}>
          <CookbooksProvider>
            <NoshConversationProvider>
              <ToastProvider>
                <GlobalErrorBoundary>
                  <>
                    <WebInteractionStyles />
                    <RootLayoutNav />
                  </>
                </GlobalErrorBoundary>
              </ToastProvider>
            </NoshConversationProvider>
          </CookbooksProvider>
        </QueryClientProvider>
      </NoshNativeShareProvider>
    </ShareIntentProvider>
  );
}
