import React, { useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Plus } from 'lucide-react-native';
import { ShelfScene } from '@/components/shelf/ShelfScene';
import { NoshShelfChatButton } from '@/components/cookbook/NoshAssistantChat';
import { FirstRunWelcome } from '@/components/onboarding/FirstRunWelcome';
import { LoadErrorState } from '@/components/ui/LoadErrorState';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { useCookbooks } from '@/hooks/useCookbooks';
import { useAuth } from '@/hooks/useAuth';
import { useNoshNativeShare } from '@/contexts/NoshNativeShareContext';
import type { Cookbook } from '@/types/cookbook';
import { Radii, Spacing } from '@/constants/spacing';
import { Fonts } from '@/utils/fonts';
import {
  defaultFirstRunOnboardingState,
  loadFirstRunOnboardingState,
  saveFirstRunOnboardingStatus,
  shouldPresentFirstRunWelcome,
  type FirstRunOnboardingState,
} from '@/utils/cookbook/firstRunOnboarding';
import { isSampleCookbookId, SAMPLE_COOKBOOK_ID } from '@/utils/cookbook/sampleCookbook';

export default function MyCookbooksScreen() {
  const { cookbooks, isLoading, isShelfStale, shelfError, refresh } = useCookbooks();
  const { fontScale } = useWindowDimensions();
  const usesAccessibilityText = fontScale >= 2;
  const { user } = useAuth();
  const { receipt } = useNoshNativeShare();
  const [firstRunState, setFirstRunState] = useState<FirstRunOnboardingState>(
    defaultFirstRunOnboardingState,
  );
  const [firstRunReady, setFirstRunReady] = useState(false);
  const realCookbooks = useMemo(
    () => cookbooks.filter((cookbook) => !isSampleCookbookId(cookbook.id)),
    [cookbooks],
  );

  useEffect(() => {
    if (!user?.id) {
      setFirstRunState(defaultFirstRunOnboardingState());
      setFirstRunReady(false);
      return;
    }
    let cancelled = false;
    setFirstRunReady(false);
    loadFirstRunOnboardingState(user.id)
      .then((state) => {
        if (cancelled) return;
        setFirstRunState(state);
        setFirstRunReady(true);
      })
      .catch(() => {
        if (cancelled) return;
        setFirstRunState(defaultFirstRunOnboardingState());
        setFirstRunReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const showFirstRunWelcome = shouldPresentFirstRunWelcome({
    isReady: firstRunReady && !isLoading,
    cookbookCount: realCookbooks.length,
    status: firstRunState.status,
    hasNativeShareWork: receipt.status !== 'idle',
  });

  function openLibrary() {
    router.push('/(book)/library');
  }

  function openSettings() {
    router.push('/(book)/settings');
  }

  function openCookbook(cookbook: Cookbook) {
    router.push(`/(book)/${cookbook.id}`);
  }

  async function beginFirstCookbook() {
    if (user?.id) {
      setFirstRunState(await saveFirstRunOnboardingStatus(user.id, 'started').catch(() => ({
        ...defaultFirstRunOnboardingState(),
        status: 'started' as const,
        updatedAt: new Date().toISOString(),
      })));
    }
    router.push('/(book)/library?firstRun=1');
  }

  function previewSampleCookbook() {
    router.push(`/(book)/${SAMPLE_COOKBOOK_ID}`);
  }

  async function skipFirstRun() {
    if (user?.id) {
      setFirstRunState(await saveFirstRunOnboardingStatus(user.id, 'skipped').catch(() => ({
        ...defaultFirstRunOnboardingState(),
        status: 'skipped' as const,
        updatedAt: new Date().toISOString(),
      })));
    } else {
      setFirstRunState({
        ...defaultFirstRunOnboardingState(),
        status: 'skipped',
        updatedAt: new Date().toISOString(),
      });
    }
  }

  if (isLoading && cookbooks.length === 0) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  if (shelfError && cookbooks.length === 0) {
    return (
      <LoadErrorState
        title="Could not open your cookbooks"
        message="Your cookbooks are still safe. Check your connection and try again."
        onRetry={() => {
          void refresh();
        }}
      />
    );
  }

  return (
    <View style={styles.container}>
      <View
        testID="cookbook-shelf-content"
        style={styles.shelfContent}
        pointerEvents={showFirstRunWelcome ? 'none' : 'auto'}
        accessibilityElementsHidden={showFirstRunWelcome}
        importantForAccessibility={showFirstRunWelcome ? 'no-hide-descendants' : 'auto'}
      >
        <ShelfScene
          cookbooks={cookbooks}
          onSelectCookbook={openCookbook}
          onAddCookbook={openLibrary}
          onOpenSettings={openSettings}
          isStale={isShelfStale}
          onRefresh={() => {
            void refresh();
          }}
        />
        <NoshShelfChatButton />
        <Pressable
          style={[styles.captureButton, usesAccessibilityText && styles.captureButtonAccessibilityText]}
          onPress={() => router.push('/(book)/save')}
          accessibilityRole="button"
          accessibilityLabel="Save a recipe with Nosh"
        >
          <Plus size={17} color={Colors.text} />
          {!usesAccessibilityText ? <Text style={styles.captureButtonText}>Save a recipe</Text> : null}
        </Pressable>
      </View>
      {showFirstRunWelcome ? (
        <FirstRunWelcome
          onCreateCookbook={() => {
            void beginFirstCookbook();
          }}
          onPreviewSample={previewSampleCookbook}
          onSkip={() => {
            void skipFirstRun();
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  shelfContent: {
    flex: 1,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  captureButtonText: { color: Colors.text, fontFamily: Fonts.ui.medium, fontSize: 12 },
  captureButton: {
    position: 'absolute',
    right: Spacing.md,
    top: 198,
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: Colors.charcoal,
    backgroundColor: Colors.parchment,
    paddingHorizontal: Spacing.md,
    boxShadow: Colors.book.cardShadow,
  },
  captureButtonAccessibilityText: {
    width: 54,
    height: 54,
    minHeight: 54,
    justifyContent: 'center',
    paddingHorizontal: 0,
  },
});
