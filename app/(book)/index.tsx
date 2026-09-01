import React, { useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { NotebookPen } from 'lucide-react-native';
import { ShelfScene } from '@/components/shelf/ShelfScene';
import { NoshShelfChatButton } from '@/components/cookbook/NoshAssistantChat';
import { CookbookSettingsSheet } from '@/components/cookbook/ReaderActionSheets';
import { FirstRunWelcome } from '@/components/onboarding/FirstRunWelcome';
import { LoadErrorState } from '@/components/ui/LoadErrorState';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Colors } from '@/constants/colors';
import { useCookbooks } from '@/hooks/useCookbooks';
import { useAuth } from '@/hooks/useAuth';
import { useNoshNativeShare } from '@/contexts/NoshNativeShareContext';
import type { Cookbook } from '@/types/cookbook';
import { Radii, Spacing } from '@/constants/spacing';
import {
  defaultFirstRunOnboardingState,
  consumeFirstRunOnboardingReset,
  loadFirstRunOnboardingState,
  saveFirstRunOnboardingStatus,
  shouldPresentFirstRunWelcome,
  type FirstRunOnboardingState,
} from '@/utils/cookbook/firstRunOnboarding';
import { isSampleCookbookId, SAMPLE_COOKBOOK_ID } from '@/utils/cookbook/sampleCookbook';
import { buildCookbookContextActions, type ContextActionId } from '@/utils/cookbook/contextActions';

export default function MyCookbooksScreen() {
  const { cookbooks, isLoading, isShelfStale, shelfError, refresh, deleteCookbook, updateCookbookTitle } =
    useCookbooks();
  const { user } = useAuth();
  const { receipt } = useNoshNativeShare();
  const [firstRunState, setFirstRunState] = useState<FirstRunOnboardingState>(defaultFirstRunOnboardingState);
  const [firstRunReady, setFirstRunReady] = useState(false);
  const [managedCookbook, setManagedCookbook] = useState<Cookbook | null>(null);
  const cookbookActions = useMemo(
    () => buildCookbookContextActions({ canAddRecipe: true, canRename: true, canDelete: true }),
    [],
  );
  const realCookbooks = useMemo(() => cookbooks.filter((cookbook) => !isSampleCookbookId(cookbook.id)), [cookbooks]);

  useEffect(() => {
    if (!user?.id) {
      setFirstRunState(defaultFirstRunOnboardingState());
      setFirstRunReady(false);
      return;
    }
    let cancelled = false;
    setFirstRunReady(false);
    consumeFirstRunOnboardingReset(user.id)
      .then((resetState) => resetState ?? loadFirstRunOnboardingState(user.id))
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
    forceWelcomeForTesting: firstRunState.forceWelcomeForTesting,
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

  function confirmDeleteCookbook(cookbook: Cookbook) {
    Alert.alert('Delete cookbook?', `This permanently deletes ${cookbook.title} and all of its recipe pages.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete cookbook',
        style: 'destructive',
        onPress: () => {
          void deleteCookbook(cookbook.id).catch((error) => {
            const message = error instanceof Error ? error.message : 'The cookbook could not be deleted.';
            Alert.alert('Delete failed', message);
          });
        },
      },
    ]);
  }

  function handleCookbookAction(cookbook: Cookbook, actionId: ContextActionId) {
    if (isSampleCookbookId(cookbook.id)) return;
    if (actionId === 'add_recipe') {
      router.push(`/(book)/${cookbook.id}/add`);
      return;
    }
    if (actionId === 'rename_cookbook') {
      setManagedCookbook(cookbook);
      return;
    }
    if (actionId === 'delete_cookbook') {
      confirmDeleteCookbook(cookbook);
    }
  }

  async function beginFirstCookbook() {
    if (user?.id) {
      setFirstRunState(
        await saveFirstRunOnboardingStatus(user.id, 'started').catch(() => ({
          ...defaultFirstRunOnboardingState(),
          status: 'started' as const,
          updatedAt: new Date().toISOString(),
        })),
      );
    }
    router.push('/(book)/library?firstRun=1');
  }

  function previewSampleCookbook() {
    router.push(`/(book)/${SAMPLE_COOKBOOK_ID}`);
  }

  async function skipFirstRun() {
    if (user?.id) {
      setFirstRunState(
        await saveFirstRunOnboardingStatus(user.id, 'skipped').catch(() => ({
          ...defaultFirstRunOnboardingState(),
          status: 'skipped' as const,
          updatedAt: new Date().toISOString(),
        })),
      );
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
        <LoadingSpinner text="Opening your shelf…" />
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
          contextActionsFor={(cookbook) => (isSampleCookbookId(cookbook.id) ? [] : cookbookActions)}
          onContextAction={handleCookbookAction}
          onOpenCookbookActions={setManagedCookbook}
          isStale={isShelfStale}
          onRefresh={() => {
            void refresh();
          }}
        />
        <NoshShelfChatButton />
        <Pressable
          style={({ pressed }) => [styles.captureButton, pressed && styles.captureButtonPressed]}
          onPress={() => router.push('/(book)/save')}
          accessibilityRole="button"
          accessibilityLabel="Save a recipe with Folio"
        >
          <NotebookPen size={Spacing.values[22]} color={Colors.text} strokeWidth={1.8} />
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
      <CookbookSettingsSheet
        visible={managedCookbook !== null}
        cookbook={managedCookbook}
        onClose={() => setManagedCookbook(null)}
        onSaveTitle={async (title) => {
          if (!managedCookbook) return;
          await updateCookbookTitle({ cookbookId: managedCookbook.id, title });
        }}
        onDelete={() => {
          if (managedCookbook) confirmDeleteCookbook(managedCookbook);
        }}
      />
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
  captureButton: {
    position: 'absolute',
    right: Spacing.md,
    top: 198,
    width: Spacing.values[54],
    height: Spacing.values[54],
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radii.numeric[27],
    borderWidth: 1,
    borderColor: Colors.coral,
    backgroundColor: Colors.coral,
    boxShadow: Colors.book.liftedShadow,
  },
  captureButtonPressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.92,
  },
});
