import React from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { FolioHorizontalLockup } from '@/components/brand/NoshBrandAssets';
import { CreationStudio, type CreateCookbookDetails } from '@/components/create/CreationStudio';
import { LoadErrorState } from '@/components/ui/LoadErrorState';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Colors } from '@/constants/colors';
import {
  DEFAULT_CREATION_PAGE_STYLE_ID,
  getCookbookPageStylePreview,
  isCreationPageStyleId,
} from '@/constants/cookbookCustomization';
import { Spacing } from '@/constants/spacing';
import { useAuth } from '@/hooks/useAuth';
import { useCookbooks } from '@/hooks/useCookbooks';
import { useRecipeCaptures } from '@/hooks/useRecipeCaptures';
import { useShelfAppearance } from '@/hooks/useShelfAppearance';
import { useNoshSubscription } from '@/contexts/NoshSubscriptionContext';
import { recordFirstCookbookCreated } from '@/utils/cookbook/firstRunOnboarding';
import { trackEvent } from '@/utils/analytics';
import { useSubscriptionUi } from '@/components/subscription/SubscriptionHost';
import { CookbookLimitReachedError } from '@/utils/cookbook/api';

export default function BookLibraryScreen() {
  const insets = useSafeAreaInsets();
  const { captureId: captureIdParam, firstRun: firstRunParam, cookbookId: cookbookIdParam } = useLocalSearchParams<{
    captureId?: string | string[];
    firstRun?: string | string[];
    cookbookId?: string | string[];
  }>();
  const captureId = Array.isArray(captureIdParam) ? captureIdParam[0] : captureIdParam;
  const firstRun = Array.isArray(firstRunParam) ? firstRunParam[0] : firstRunParam;
  const cookbookId = Array.isArray(cookbookIdParam) ? cookbookIdParam[0] : cookbookIdParam;
  const isFirstRun = firstRun === '1' && !captureId;
  const { user } = useAuth();
  const {
    cookbooks,
    isLoading: isLoadingCookbooks,
    createCookbook,
    updateCookbookAppearance,
  } = useCookbooks();
  const editingCookbook = cookbookId
    ? cookbooks.find((cookbook) => cookbook.id === cookbookId)
    : undefined;
  const { prepareDestination } = useRecipeCaptures();
  const { scene, setShelfStyleId, setWallpaperStyleId } = useShelfAppearance();
  const { requestCookbookAccess } = useSubscriptionUi();
  const { refresh: refreshSubscription } = useNoshSubscription();

  async function handleCreate({
    title,
    coverFinishId,
    coverColorId,
    coverTitleColorId,
    coverTitlePlacementId,
    pageStyleId,
  }: CreateCookbookDetails) {
    if (!await requestCookbookAccess()) return false;
    const create = () => createCookbook({
      title,
      coverFinishId,
      coverColorId,
      coverTitleColorId,
      coverTitlePlacementId,
      pageStyleId,
    });
    let cookbook: Awaited<ReturnType<typeof create>>;
    try {
      cookbook = await create();
    } catch (error) {
      if (!(error instanceof CookbookLimitReachedError)) throw error;

      // The server is authoritative. Another device may have used the last
      // cookbook slot after this screen's preflight snapshot was loaded.
      if (!await requestCookbookAccess({ refresh: true })) return false;
      try {
        cookbook = await create();
      } catch (retryError) {
        if (!(retryError instanceof CookbookLimitReachedError)) throw retryError;
        await requestCookbookAccess({ refresh: true });
        return false;
      }
    }
    void refreshSubscription();
    if (captureId) {
      try {
        await prepareDestination({ captureId, destinationCookbookId: cookbook.id });
      } catch {
        // The capture workspace can safely retry the destination assignment.
      }
      router.replace(`/(book)/save?captureId=${encodeURIComponent(captureId)}`);
      return;
    }
    if (isFirstRun && user?.id) {
      await recordFirstCookbookCreated(user.id, cookbook.id).catch(() => undefined);
      trackEvent({
        type: 'first_cookbook_created',
        data: {
          cookbookId: cookbook.id,
          coverFinishId,
          coverColorId,
          coverTitleColorId,
          coverTitlePlacementId,
          pageStyleId,
        },
      });
    }
    router.replace(`/(book)/${cookbook.id}`);
  }

  async function handleSave(details: CreateCookbookDetails) {
    if (!editingCookbook) throw new Error('Cookbook not found.');
    await updateCookbookAppearance({
      cookbookId: editingCookbook.id,
      details: {
        title: details.title,
        coverFinishId: details.coverFinishId,
        coverColorId: details.coverColorId,
        coverTitleColorId: details.coverTitleColorId,
        coverTitlePlacementId: details.coverTitlePlacementId,
      },
    });
    if (router.canGoBack()) router.back();
    else router.replace('/(book)');
  }

  function openSignIn() {
    router.push('/(auth)/sign-in');
  }

  if (cookbookId && isLoadingCookbooks && !editingCookbook) {
    return (
      <View style={styles.loading}>
        <LoadingSpinner text="Opening your cookbook…" />
      </View>
    );
  }

  if (cookbookId && !editingCookbook) {
    return (
      <LoadErrorState
        title="Cookbook not found"
        message="Return to your shelf and choose the cookbook again."
        onRetry={() => router.replace('/(book)')}
      />
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back to my cookbooks"
        >
          <ChevronLeft size={20} color={Colors.text} />
        </Pressable>
        <View style={styles.heading}>
          <FolioHorizontalLockup width={88} />
        </View>
        <View style={styles.topSpacer} />
      </View>

      <CreationStudio
        key={editingCookbook?.id ?? 'new-cookbook'}
        bottomInset={insets.bottom}
        canCreate={!!user}
        mode={editingCookbook ? 'edit' : isFirstRun ? 'first-run' : 'standard'}
        existingPageStylePreview={editingCookbook
          ? getCookbookPageStylePreview(editingCookbook.pageStyleId, editingCookbook.styleRevision)
          : undefined}
        initialDetails={editingCookbook ? {
          title: editingCookbook.title,
          coverFinishId: editingCookbook.coverFinishId,
          coverColorId: editingCookbook.coverColorId,
          coverTitleColorId: editingCookbook.coverTitleColorId,
          coverTitlePlacementId: editingCookbook.coverTitlePlacementId,
          pageStyleId: isCreationPageStyleId(editingCookbook.pageStyleId)
            ? editingCookbook.pageStyleId
            : DEFAULT_CREATION_PAGE_STYLE_ID,
        } : undefined}
        shelfStyleId={scene.shelfStyleId}
        wallpaperStyleId={scene.wallpaperStyleId}
        onCreateBook={handleCreate}
        onSaveBook={editingCookbook ? handleSave : undefined}
        onShelfStyleChange={setShelfStyleId}
        onWallpaperStyleChange={setWallpaperStyleId}
        onSignIn={openSignIn}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heading: {
    flex: 1,
    alignItems: 'center',
  },
  topSpacer: {
    width: 44,
    height: 44,
  },
});
