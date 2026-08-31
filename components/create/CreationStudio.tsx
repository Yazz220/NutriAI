import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Check } from 'lucide-react-native';
import { PhysicalBook } from '@/components/physical-book/PhysicalBook';
import { SkiaBookCover } from '@/components/physical-book/SkiaBookCover';
import { ShelfWallpaper } from '@/components/shelf/ShelfWallpaper';
import { Text } from '@/components/ui/Text';
import {
  COOKBOOK_PAGE_STYLES,
  DEFAULT_COVER_COLOR_ID,
  DEFAULT_COVER_FINISH_ID,
  DEFAULT_CREATION_PAGE_STYLE_ID,
  listCookbookCoverColors,
  listCookbookCoverFinishes,
  listCreationPageStyles,
  type CookbookCoverColorOption,
  type CookbookCoverFinishOption,
  type CookbookPageStyleOption,
  type CreationPageStyleId,
} from '@/constants/cookbookCustomization';
import { Colors } from '@/constants/colors';
import {
  DEFAULT_BOOKSHELF_SCENE,
  getShelfStyle,
  listShelfStyles,
  listWallpaperStyles,
  type ShelfStyleId,
  type ShelfStyleOption,
  type WallpaperStyleId,
  type WallpaperStyleOption,
} from '@/constants/shelfAppearance';
import {
  getLegacyCoverStyleForColor,
  resolveCookbookBinding,
} from '@/constants/cookbookBindings';
import {
  DEFAULT_COVER_TITLE_COLOR_ID,
  DEFAULT_COVER_TITLE_PLACEMENT_ID,
  listCoverTitleColors,
  listCoverTitlePlacements,
  resolveCoverTitleFoil,
  type CoverTitleColorOption,
  type CoverTitlePlacementOption,
} from '@/constants/cookbookCoverTypography';
import { resolveCookbookSpreadHeight } from '@/constants/cookbookGeometry';
import { Radii, Shadows, Spacing, Typography } from '@/constants/spacing';
import { Fonts } from '@/utils/fonts';
import type {
  CookbookCoverColorId,
  CookbookCoverFinishId,
  CookbookCoverTitleColorId,
  CookbookCoverTitlePlacementId,
} from '@/types/cookbook';

/**
 * Cookbook creation keeps the physical book canonical while letting the user
 * choose its title, cover finish, cover color, and book-owned recipe-page identity.
 */

type PreviewFace = 'cover' | 'inside';
type StudioScope = 'book' | 'scene';

export interface CreateCookbookDetails {
  title: string;
  coverFinishId: CookbookCoverFinishId;
  coverColorId: CookbookCoverColorId;
  coverTitleColorId: CookbookCoverTitleColorId;
  coverTitlePlacementId: CookbookCoverTitlePlacementId;
  pageStyleId: CreationPageStyleId;
}

interface CreationStudioProps {
  canCreate: boolean;
  onCreateBook: (details: CreateCookbookDetails) => Promise<void>;
  onSignIn: () => void;
  bottomInset?: number;
  mode?: 'standard' | 'first-run';
  shelfStyleId?: ShelfStyleId;
  wallpaperStyleId?: WallpaperStyleId;
  onShelfStyleChange?: (shelfStyleId: ShelfStyleId) => void | Promise<void>;
  onWallpaperStyleChange?: (wallpaperStyleId: WallpaperStyleId) => void | Promise<void>;
}

export function CreationStudio({
  canCreate,
  onCreateBook,
  onSignIn,
  bottomInset = 0,
  mode = 'standard',
  shelfStyleId = DEFAULT_BOOKSHELF_SCENE.shelfStyleId,
  wallpaperStyleId = DEFAULT_BOOKSHELF_SCENE.wallpaperStyleId,
  onShelfStyleChange,
  onWallpaperStyleChange,
}: CreationStudioProps) {
  const { width } = useWindowDimensions();
  const coverFinishes = listCookbookCoverFinishes();
  const coverColors = listCookbookCoverColors();
  const coverTitleColors = listCoverTitleColors();
  const coverTitlePlacements = listCoverTitlePlacements();
  const pageStyles = listCreationPageStyles();
  const shelfStyles = listShelfStyles();
  const wallpaperStyles = listWallpaperStyles();
  const isFirstRun = mode === 'first-run';
  const [title, setTitle] = useState(isFirstRun ? 'My Cookbook' : '');
  const [coverFinishId, setCoverFinishId] = useState<CookbookCoverFinishId>(DEFAULT_COVER_FINISH_ID);
  const [coverColorId, setCoverColorId] = useState<CookbookCoverColorId>(DEFAULT_COVER_COLOR_ID);
  const [coverTitleColorId, setCoverTitleColorId] = useState<CookbookCoverTitleColorId>(
    DEFAULT_COVER_TITLE_COLOR_ID,
  );
  const [coverTitlePlacementId, setCoverTitlePlacementId] = useState<CookbookCoverTitlePlacementId>(
    DEFAULT_COVER_TITLE_PLACEMENT_ID,
  );
  const [pageStyleId, setPageStyleId] = useState<CreationPageStyleId>(DEFAULT_CREATION_PAGE_STYLE_ID);
  const [previewFace, setPreviewFace] = useState<PreviewFace>('cover');
  const [studioScope, setStudioScope] = useState<StudioScope>('book');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function selectCoverFinish(value: CookbookCoverFinishId) {
    setCoverFinishId(value);
    setPreviewFace('cover');
    setError(null);
    void Haptics.selectionAsync().catch(() => undefined);
  }

  function selectCoverColor(value: CookbookCoverColorId) {
    setCoverColorId(value);
    setPreviewFace('cover');
    setError(null);
    void Haptics.selectionAsync().catch(() => undefined);
  }

  function selectPageStyle(value: CreationPageStyleId) {
    setPageStyleId(value);
    setPreviewFace('inside');
    setError(null);
    void Haptics.selectionAsync().catch(() => undefined);
  }

  function selectPreviewFace(value: PreviewFace) {
    setPreviewFace(value);
    void Haptics.selectionAsync().catch(() => undefined);
  }

  function selectCoverTitleColor(value: CookbookCoverTitleColorId) {
    setCoverTitleColorId(value);
    setPreviewFace('cover');
    setError(null);
    void Haptics.selectionAsync().catch(() => undefined);
  }

  function selectCoverTitlePlacement(value: CookbookCoverTitlePlacementId) {
    setCoverTitlePlacementId(value);
    setPreviewFace('cover');
    setError(null);
    void Haptics.selectionAsync().catch(() => undefined);
  }

  function selectStudioScope(value: StudioScope) {
    setStudioScope(value);
    setError(null);
    void Haptics.selectionAsync().catch(() => undefined);
  }

  function selectShelfStyle(value: ShelfStyleId) {
    if (!onShelfStyleChange || value === shelfStyleId) return;
    setError(null);
    void Promise.resolve(onShelfStyleChange(value)).catch(() => {
      setError('Could not save shelf appearance.');
    });
    void Haptics.selectionAsync().catch(() => undefined);
  }

  function selectWallpaperStyle(value: WallpaperStyleId) {
    if (!onWallpaperStyleChange || value === wallpaperStyleId) return;
    setError(null);
    void Promise.resolve(onWallpaperStyleChange(value)).catch(() => {
      setError('Could not save wallpaper appearance.');
    });
    void Haptics.selectionAsync().catch(() => undefined);
  }

  async function handleCreate() {
    const trimmed = title.trim();
    if (!trimmed || submitting || !canCreate) return;
    setSubmitting(true);
    setError(null);
    try {
      await onCreateBook({
        title: trimmed,
        coverFinishId,
        coverColorId,
        coverTitleColorId,
        coverTitlePlacementId,
        pageStyleId,
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    } catch (creationError) {
      setError(getErrorMessage(creationError));
      setSubmitting(false);
    }
  }

  const ctaDisabled = canCreate ? !title.trim() || submitting : false;

  return (
    <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.fill}
        contentContainerStyle={[styles.content, { paddingBottom: bottomInset + Spacing.xxl }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heading}>
          <Text style={styles.headingTitle}>
            {studioScope === 'scene'
              ? 'Set the scene'
              : isFirstRun
                ? 'Give your recipes a home'
                : 'Make it yours'}
          </Text>
        </View>

        <StudioScopeToggle value={studioScope} onChange={selectStudioScope} />

        {studioScope === 'book' ? (
          <>
            <View style={styles.previewPanel}>
              <BookPreview
                title={title}
                coverFinishId={coverFinishId}
                coverColorId={coverColorId}
                coverTitleColorId={coverTitleColorId}
                coverTitlePlacementId={coverTitlePlacementId}
                pageStyleId={pageStyleId}
                face={previewFace}
                availableWidth={Math.min(width - Spacing.xl * 2, 640)}
                onPress={() => selectPreviewFace(previewFace === 'cover' ? 'inside' : 'cover')}
              />
            </View>

            <View style={styles.controlPanel}>
              <TitleField
                value={title}
                disabled={submitting}
                onChange={(value) => {
                  setTitle(value);
                  setError(null);
                }}
              />
              <TitleStyleSelector
                colorValue={coverTitleColorId}
                placementValue={coverTitlePlacementId}
                coverColorId={coverColorId}
                colorOptions={coverTitleColors}
                placementOptions={coverTitlePlacements}
                disabled={submitting}
                onColorChange={selectCoverTitleColor}
                onPlacementChange={selectCoverTitlePlacement}
              />
              <CoverFinishSelector
                value={coverFinishId}
                options={coverFinishes}
                disabled={submitting}
                onChange={selectCoverFinish}
              />
              <CoverColorSelector
                value={coverColorId}
                options={coverColors}
                disabled={submitting}
                onChange={selectCoverColor}
              />
              <PageStyleSelector
                value={pageStyleId}
                options={pageStyles}
                disabled={submitting}
                onChange={selectPageStyle}
              />

              {error ? <Text style={styles.error} selectable>{error}</Text> : null}

              <Pressable
                style={[styles.finishButton, ctaDisabled && styles.disabledButton]}
                onPress={canCreate ? () => void handleCreate() : onSignIn}
                disabled={ctaDisabled}
                accessibilityRole="button"
                accessibilityLabel={
                  canCreate
                    ? isFirstRun
                      ? 'Put this cookbook on my shelf'
                      : 'Add this cookbook to my shelf'
                    : 'Go to sign in'
                }
              >
                {submitting ? (
                  <ActivityIndicator color={Colors.onPrimary} />
                ) : (
                  <Text style={styles.finishText}>
                    {canCreate ? (isFirstRun ? 'Create my cookbook' : 'Add to shelf') : 'Sign in to save'}
                  </Text>
                )}
              </Pressable>
            </View>
          </>
        ) : (
          <>
            <ScenePreview
              title={title}
              coverFinishId={coverFinishId}
              coverColorId={coverColorId}
              coverTitleColorId={coverTitleColorId}
              coverTitlePlacementId={coverTitlePlacementId}
              shelfStyleId={shelfStyleId}
              wallpaperStyleId={wallpaperStyleId}
              availableWidth={Math.min(width - Spacing.xl * 2, 640)}
            />
            <View style={styles.controlPanel}>
              <ShelfStyleSelector
                value={shelfStyleId}
                options={shelfStyles}
                disabled={submitting || !onShelfStyleChange}
                onChange={selectShelfStyle}
              />
              <WallpaperStyleSelector
                value={wallpaperStyleId}
                options={wallpaperStyles}
                disabled={submitting || !onWallpaperStyleChange}
                onChange={selectWallpaperStyle}
              />
              {error ? <Text style={styles.error} selectable>{error}</Text> : null}
            </View>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return 'Could not create cookbook.';
}

function StudioScopeToggle({
  value,
  onChange,
}: {
  value: StudioScope;
  onChange: (value: StudioScope) => void;
}) {
  return (
    <View style={styles.scopeToggle}>
      {(['book', 'scene'] as StudioScope[]).map((scope) => {
        const selected = value === scope;
        return (
          <Pressable
            key={scope}
            style={[styles.scopeToggleItem, selected && styles.scopeToggleItemSelected]}
            onPress={() => onChange(scope)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={scope === 'book' ? 'Customize book' : 'Customize bookshelf scene'}
          >
            <Text style={[styles.scopeToggleText, selected && styles.scopeToggleTextSelected]}>
              {scope === 'book' ? 'Book' : 'Scene'}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function ScenePreview({
  title,
  coverFinishId,
  coverColorId,
  coverTitleColorId,
  coverTitlePlacementId,
  shelfStyleId,
  wallpaperStyleId,
  availableWidth,
}: {
  title: string;
  coverFinishId: CookbookCoverFinishId;
  coverColorId: CookbookCoverColorId;
  coverTitleColorId: CookbookCoverTitleColorId;
  coverTitlePlacementId: CookbookCoverTitlePlacementId;
  shelfStyleId: ShelfStyleId;
  wallpaperStyleId: WallpaperStyleId;
  availableWidth: number;
}) {
  const shelfStyle = getShelfStyle(shelfStyleId);
  const stageWidth = Math.min(availableWidth, 560);
  const shelfWidth = Math.max(240, stageWidth - Spacing.md * 2);
  const shelfHeight = resolveShelfPreviewHeight(shelfStyle, shelfWidth);
  const bookWidth = Math.min(140, Math.max(118, stageWidth * 0.3));
  const stageHeight = availableWidth > 500 ? 320 : 262;

  return (
    <View style={[styles.sceneStage, { width: stageWidth, minHeight: stageHeight }]}>
      <ShelfWallpaper wallpaperStyleId={wallpaperStyleId} />
      <View
        pointerEvents="none"
        style={[
          styles.sceneBook,
          {
            bottom: shelfHeight - 5,
          },
        ]}
      >
        <PhysicalBook
          title={title.trim() || 'My Cookbook'}
          coverStyle={getLegacyCoverStyleForColor(coverColorId)}
          coverFinishId={coverFinishId}
          coverColorId={coverColorId}
          coverTitleColorId={coverTitleColorId}
          coverTitlePlacementId={coverTitlePlacementId}
          width={bookWidth}
          showShadow={false}
        />
      </View>
      <Image
        source={shelfStyle.asset}
        resizeMode="stretch"
        style={[styles.sceneShelf, { width: shelfWidth, height: shelfHeight }]}
        accessible={false}
      />
    </View>
  );
}

function ShelfStyleSelector({
  value,
  options,
  disabled,
  onChange,
}: {
  value: ShelfStyleId;
  options: ShelfStyleOption[];
  disabled: boolean;
  onChange: (value: ShelfStyleId) => void;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Shelf</Text>
      <OptionRail testID="shelf-style-rail">
        {options.map((option) => {
          const selected = value === option.id;
          return (
            <Pressable
              key={option.id}
              style={[styles.shelfStyleCard, selected && styles.shelfStyleCardSelected]}
              onPress={() => onChange(option.id)}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityState={{ selected, disabled }}
              accessibilityLabel={`${option.name} shelf`}
            >
              <View style={styles.shelfStyleSample} pointerEvents="none">
                <Image
                  source={option.asset}
                  resizeMode="contain"
                  style={styles.shelfStyleImage}
                  accessible={false}
                />
              </View>
              <Text style={[styles.shelfStyleName, selected && styles.shelfStyleNameSelected]}>
                {option.name}
              </Text>
              {selected ? (
                <View style={styles.shelfStyleSelectedMark}>
                  <Check size={10} color={Colors.onPrimary} strokeWidth={2.6} />
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </OptionRail>
    </View>
  );
}

function WallpaperStyleSelector({
  value,
  options,
  disabled,
  onChange,
}: {
  value: WallpaperStyleId;
  options: WallpaperStyleOption[];
  disabled: boolean;
  onChange: (value: WallpaperStyleId) => void;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Wallpaper</Text>
      <OptionRail testID="wallpaper-style-rail">
        {options.map((option) => {
          const selected = value === option.id;
          return (
            <Pressable
              key={option.id}
              style={[styles.wallpaperCard, selected && styles.wallpaperCardSelected]}
              onPress={() => onChange(option.id)}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityState={{ selected, disabled }}
              accessibilityLabel={`${option.name} wallpaper`}
            >
              <View
                style={[styles.wallpaperSample, { backgroundColor: option.previewColor }]}
                pointerEvents="none"
              >
                <ShelfWallpaper wallpaperStyleId={option.id} />
              </View>
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                style={[styles.wallpaperName, selected && styles.wallpaperNameSelected]}
              >
                {option.name}
              </Text>
              {selected ? (
                <View style={styles.wallpaperSelectedMark}>
                  <Check size={10} color={Colors.onPrimary} strokeWidth={2.6} />
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </OptionRail>
    </View>
  );
}

function OptionRail({ children, testID }: { children: React.ReactNode; testID: string }) {
  return (
    <ScrollView
      horizontal
      nestedScrollEnabled
      directionalLockEnabled
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.optionRailContent}
      style={styles.optionRail}
      testID={testID}
    >
      {children}
    </ScrollView>
  );
}

function resolveShelfPreviewHeight(option: ShelfStyleOption, width: number): number {
  const naturalHeight = width * option.assetAspectRatio;
  return Math.min(option.maxRenderedHeight, Math.max(option.minRenderedHeight, naturalHeight));
}

function BookPreview({
  title,
  coverFinishId,
  coverColorId,
  coverTitleColorId,
  coverTitlePlacementId,
  pageStyleId,
  face,
  availableWidth,
  onPress,
}: {
  title: string;
  coverFinishId: CookbookCoverFinishId;
  coverColorId: CookbookCoverColorId;
  coverTitleColorId: CookbookCoverTitleColorId;
  coverTitlePlacementId: CookbookCoverTitlePlacementId;
  pageStyleId: CreationPageStyleId;
  face: PreviewFace;
  availableWidth: number;
  onPress: () => void;
}) {
  const previewTitle = title.trim() || 'My Cookbook';
  const coverWidth = Math.min(availableWidth * 0.58, 224);
  const spreadWidth = Math.min(availableWidth - Spacing.md, 460);
  const stageHeight = availableWidth > 500 ? 360 : 292;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.bookStage,
        { minHeight: stageHeight },
        pressed && styles.bookStagePressed,
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={face === 'cover' ? 'Open cookbook preview' : 'Close cookbook preview'}
      accessibilityHint={
        face === 'cover'
          ? 'Opens the selected sample recipe pages'
          : 'Returns to the cookbook cover'
      }
    >
      {face === 'cover' ? (
        <>
          <View pointerEvents="none" style={styles.stageHalo} />
          <PhysicalBook
            title={previewTitle}
            coverStyle={getLegacyCoverStyleForColor(coverColorId)}
            coverFinishId={coverFinishId}
            coverColorId={coverColorId}
            coverTitleColorId={coverTitleColorId}
            coverTitlePlacementId={coverTitlePlacementId}
            width={coverWidth}
          />
        </>
      ) : (
        <GeneratedRecipeSpread
          coverFinishId={coverFinishId}
          coverColorId={coverColorId}
          pageStyleId={pageStyleId}
          width={spreadWidth}
        />
      )}
    </Pressable>
  );
}

function GeneratedRecipeSpread({
  coverFinishId,
  coverColorId,
  pageStyleId,
  width,
}: {
  coverFinishId: CookbookCoverFinishId;
  coverColorId: CookbookCoverColorId;
  pageStyleId: CreationPageStyleId;
  width: number;
}) {
  const binding = resolveCookbookBinding({ finishId: coverFinishId, colorId: coverColorId });
  const pageStyle = COOKBOOK_PAGE_STYLES[pageStyleId];
  const height = resolveCookbookSpreadHeight(width);
  const pageWidth = width / 2;

  return (
    <View style={[styles.spreadWrap, { width, height, backgroundColor: binding.cloth }]}>
      <Image
        source={pageStyle.samples.brownies}
        resizeMode="cover"
        style={[styles.generatedPage, styles.generatedPageLeft, { width: pageWidth - 4, height: height - 8 }]}
        accessibilityLabel={`${pageStyle.name} brownie recipe sample`}
      />
      <Image
        source={pageStyle.samples.cookies}
        resizeMode="cover"
        style={[
          styles.generatedPage,
          styles.generatedPageRight,
          { left: pageWidth + 1, width: pageWidth - 5, height: height - 8 },
        ]}
        accessibilityLabel={`${pageStyle.name} cookie recipe sample`}
      />
      <LinearGradient
        colors={[Colors.legacySurface.v61, Colors.legacySurface.v60, Colors.legacySurface.v78, Colors.legacySurface.v61]}
        locations={[0, 0.42, 0.58, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.spreadGutter, { left: pageWidth - 8, height: height - 8 }]}
        pointerEvents="none"
      />
    </View>
  );
}

function TitleField({
  value,
  disabled,
  onChange,
}: {
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.fieldHeading}>
        <Text style={styles.sectionTitle}>Book title</Text>
        {value.length >= 40 ? <Text style={styles.characterCount}>{value.length}/48</Text> : null}
      </View>
      <TextInput
        value={value}
        editable={!disabled}
        onChangeText={onChange}
        accessibilityLabel="Cookbook title"
        placeholder="Sunday Suppers"
        placeholderTextColor={Colors.textMuted}
        style={styles.input}
        maxLength={48}
        returnKeyType="done"
      />
    </View>
  );
}

function CoverFinishSelector({
  value,
  options,
  disabled,
  onChange,
}: {
  value: CookbookCoverFinishId;
  options: CookbookCoverFinishOption[];
  disabled: boolean;
  onChange: (value: CookbookCoverFinishId) => void;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Cover finish</Text>
      <OptionRail testID="cover-finish-rail">
        {options.map((option) => {
          const selected = value === option.id;
          const binding = resolveCookbookBinding({ finishId: option.id, colorId: 'sage' });
          return (
            <Pressable
              key={option.id}
              style={[styles.finishCard, selected && styles.finishCardSelected]}
              onPress={() => onChange(option.id)}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityState={{ selected, disabled }}
              accessibilityLabel={`${option.name} cover texture: ${option.description}`}
            >
              <View style={styles.finishSample} pointerEvents="none">
                <SkiaBookCover
                  binding={binding}
                  width={64}
                  height={64}
                  spineWidth={0}
                  presentation="swatch"
                />
              </View>
              <View style={styles.finishCopy}>
                <Text style={[styles.finishName, selected && styles.finishNameSelected]}>
                  {option.name}
                </Text>
              </View>
              {selected ? (
                <View style={styles.finishSelectedMark}>
                  <Check size={10} color={Colors.onPrimary} strokeWidth={2.6} />
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </OptionRail>
    </View>
  );
}

function TitleStyleSelector({
  colorValue,
  placementValue,
  coverColorId,
  colorOptions,
  placementOptions,
  disabled,
  onColorChange,
  onPlacementChange,
}: {
  colorValue: CookbookCoverTitleColorId;
  placementValue: CookbookCoverTitlePlacementId;
  coverColorId: CookbookCoverColorId;
  colorOptions: CoverTitleColorOption[];
  placementOptions: CoverTitlePlacementOption[];
  disabled: boolean;
  onColorChange: (value: CookbookCoverTitleColorId) => void;
  onPlacementChange: (value: CookbookCoverTitlePlacementId) => void;
}) {
  const binding = resolveCookbookBinding({ colorId: coverColorId });
  const selectedFoil = resolveCoverTitleFoil(colorValue, binding.foil);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Title style</Text>
      <View style={styles.titleStyleGroup}>
        <Text style={styles.controlLabel}>Color</Text>
        <OptionRail testID="title-color-rail">
          {colorOptions.map((option) => {
            const selected = colorValue === option.id;
            const foil = option.foil ?? binding.foil;
            return (
              <Pressable
                key={option.id}
                style={styles.titleColorOption}
                onPress={() => onColorChange(option.id)}
                disabled={disabled}
                accessibilityRole="button"
                accessibilityState={{ selected, disabled }}
                accessibilityLabel={`${option.name} title color`}
              >
                <View style={[styles.titleColorSwatchFrame, selected && styles.colorSwatchFrameSelected]}>
                  <LinearGradient
                    colors={[foil[0], foil[1], foil[2]]}
                    start={{ x: 0, y: 1 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.titleColorSwatch}
                  />
                  {selected ? (
                    <View style={styles.selectedMark}>
                      <Check size={10} color={Colors.onPrimary} strokeWidth={2.6} />
                    </View>
                  ) : null}
                </View>
                <Text style={[styles.colorName, selected && styles.colorNameSelected]}>{option.name}</Text>
              </Pressable>
            );
          })}
        </OptionRail>
      </View>

      <View style={styles.titleStyleGroup}>
        <Text style={styles.controlLabel}>Position</Text>
        <OptionRail testID="title-position-rail">
          {placementOptions.map((option) => {
            const selected = placementValue === option.id;
            return (
              <Pressable
                key={option.id}
                style={[styles.titlePlacementOption, selected && styles.titlePlacementOptionSelected]}
                onPress={() => onPlacementChange(option.id)}
                disabled={disabled}
                accessibilityRole="button"
                accessibilityState={{ selected, disabled }}
                accessibilityLabel={`${option.name} title position`}
              >
                <View style={[styles.titlePlacementBook, { backgroundColor: binding.cloth }]}>
                  <View
                    style={[
                      styles.titlePlacementLine,
                      {
                        top: option.centerRatio * 54 - 2,
                        backgroundColor: selectedFoil[1],
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.colorName, selected && styles.colorNameSelected]}>{option.name}</Text>
              </Pressable>
            );
          })}
        </OptionRail>
      </View>
    </View>
  );
}

function CoverColorSelector({
  value,
  options,
  disabled,
  onChange,
}: {
  value: CookbookCoverColorId;
  options: CookbookCoverColorOption[];
  disabled: boolean;
  onChange: (value: CookbookCoverColorId) => void;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Cover color</Text>
      <OptionRail testID="cover-color-rail">
        {options.map((option) => {
          const selected = value === option.id;
          const binding = resolveCookbookBinding({ colorId: option.id });
          return (
            <Pressable
              key={option.id}
              style={styles.colorOption}
              onPress={() => onChange(option.id)}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityState={{ selected, disabled }}
              accessibilityLabel={`${option.name} cover color`}
            >
              <View style={[styles.colorSwatchFrame, selected && styles.colorSwatchFrameSelected]}>
                <View
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: binding.cloth, borderColor: binding.weave },
                  ]}
                />
                {selected ? (
                  <View style={styles.selectedMark}>
                    <Check size={10} color={Colors.onPrimary} strokeWidth={2.6} />
                  </View>
                ) : null}
              </View>
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                style={[styles.colorName, selected && styles.colorNameSelected]}
              >
                {option.name}
              </Text>
            </Pressable>
          );
        })}
      </OptionRail>
    </View>
  );
}

function PageStyleSelector({
  value,
  options,
  disabled,
  onChange,
}: {
  value: CreationPageStyleId;
  options: CookbookPageStyleOption[];
  disabled: boolean;
  onChange: (value: CreationPageStyleId) => void;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Page style</Text>
      <OptionRail testID="page-style-rail">
        {options.map((option) => {
          const selected = value === option.id;
          return (
            <Pressable
              key={option.id}
              style={[styles.pageStyleCard, selected && styles.pageStyleCardSelected]}
              onPress={() => onChange(option.id)}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityState={{ selected, disabled }}
              accessibilityLabel={`${option.name} recipe page style: ${option.description}`}
            >
              <Image
                source={option.samples.brownies}
                resizeMode="cover"
                style={styles.pageStyleSample}
                accessible={false}
              />
              <View style={styles.pageStyleCopy}>
                <Text style={[styles.pageStyleName, selected && styles.pageStyleNameSelected]}>
                  {option.name}
                </Text>
                <Text numberOfLines={2} style={styles.pageStyleDescription}>
                  {option.description}
                </Text>
              </View>
              {selected ? (
                <View style={styles.pageStyleSelectedMark}>
                  <Check size={10} color={Colors.onPrimary} strokeWidth={2.6} />
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </OptionRail>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  content: {
    width: '100%',
    maxWidth: 688,
    alignSelf: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
    gap: Spacing.md,
  },
  heading: {
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
  },
  headingTitle: {
    color: Colors.text,
    fontFamily: Fonts.display.bold,
    fontSize: Typography.sizes.xxxlPlus,
    lineHeight: Typography.metrics.lineHeight34,
    textAlign: 'center',
  },
  scopeToggle: {
    alignSelf: 'center',
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  scopeToggleItem: {
    minWidth: 64,
    minHeight: 40,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.values[6],
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
    alignItems: 'center',
    outlineWidth: 0,
  },
  scopeToggleItemSelected: {
    borderBottomColor: Colors.primary,
  },
  scopeToggleText: {
    color: Colors.textSecondary,
    fontFamily: Fonts.ui.medium,
    fontSize: Typography.sizes.md,
  },
  scopeToggleTextSelected: {
    color: Colors.primary,
    fontFamily: Fonts.ui.semibold,
  },
  previewPanel: {
    gap: Spacing.xs,
  },
  bookStage: {
    alignItems: 'center',
    justifyContent: 'center',
    outlineWidth: 0,
  },
  bookStagePressed: {
    opacity: 0.92,
    transform: [{ scale: 0.995 }],
  },
  spreadWrap: {
    padding: Spacing.values[4],
    borderRadius: Radii.numeric[12],
    position: 'relative',
    boxShadow: Shadows.custom.studio,
  },
  generatedPage: {
    position: 'absolute',
    top: 4,
    backgroundColor: Colors.book.page,
  },
  generatedPageLeft: {
    left: 4,
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  generatedPageRight: {
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  spreadGutter: {
    position: 'absolute',
    top: 4,
    width: 16,
  },
  stageHalo: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: Radii.full,
    backgroundColor: Colors.legacySurface.v64,
  },
  sceneStage: {
    alignSelf: 'center',
    position: 'relative',
    overflow: 'hidden',
    borderRadius: Radii.lg,
  },
  sceneBook: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 1,
    alignItems: 'center',
  },
  sceneShelf: {
    position: 'absolute',
    bottom: 0,
    left: Spacing.md,
    right: Spacing.md,
    zIndex: 2,
  },
  controlPanel: {
    gap: Spacing.xl,
    paddingHorizontal: Spacing.xs,
  },
  section: {
    gap: Spacing.sm,
  },
  optionRail: {
    width: '100%',
  },
  optionRailContent: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingRight: Spacing.xl,
  },
  fieldHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: Colors.text,
    fontFamily: Fonts.ui.semibold,
    fontSize: Typography.sizes.md,
    lineHeight: Typography.metrics.lineHeight20,
  },
  characterCount: {
    color: Colors.textTertiary,
    fontFamily: Fonts.ui.regular,
    fontSize: Typography.sizes.sm,
  },
  input: {
    minHeight: 52,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceElevated,
    color: Colors.text,
    fontFamily: Fonts.ui.medium,
    fontSize: Typography.sizes.lg,
  },
  finishCard: {
    width: 108,
    minHeight: 100,
    padding: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: 'transparent',
    alignItems: 'center',
    gap: Spacing.values[6],
    position: 'relative',
  },
  controlLabel: {
    color: Colors.textSecondary,
    fontFamily: Fonts.ui.medium,
    fontSize: Typography.sizes.sm,
    lineHeight: Typography.metrics.lineHeight17,
  },
  titleStyleGroup: {
    gap: Spacing.values[6],
  },
  titleColorOption: {
    width: 64,
    alignItems: 'center',
    gap: Spacing.values[6],
  },
  titleColorSwatchFrame: {
    width: 42,
    height: 42,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.surface,
    position: 'relative',
  },
  titleColorSwatch: {
    width: 32,
    height: 32,
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: Colors.legacySurface.v62,
  },
  titlePlacementOption: {
    width: 82,
    minHeight: 86,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.values[6],
  },
  titlePlacementOptionSelected: {
    backgroundColor: Colors.surfaceMuted,
  },
  titlePlacementBook: {
    width: 42,
    height: 54,
    borderRadius: Radii.numeric[4],
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.legacySurface.v62,
  },
  titlePlacementLine: {
    position: 'absolute',
    left: 9,
    right: 7,
    height: 4,
    borderRadius: Radii.full,
  },
  finishCardSelected: {
    backgroundColor: Colors.surfaceMuted,
  },
  finishSample: {
    width: 64,
    height: 64,
    overflow: 'hidden',
    borderRadius: Radii.md,
  },
  finishCopy: {
    alignItems: 'center',
  },
  finishName: {
    color: Colors.text,
    fontFamily: Fonts.ui.semibold,
    fontSize: Typography.sizes.sm,
    lineHeight: Typography.metrics.lineHeight17,
    textAlign: 'center',
  },
  finishNameSelected: {
    color: Colors.primary,
    fontFamily: Fonts.ui.semibold,
  },
  finishSelectedMark: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 18,
    height: 18,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
  },
  shelfStyleCard: {
    width: 164,
    minHeight: 116,
    padding: Spacing.md,
    borderRadius: Radii.md,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
    position: 'relative',
    outlineWidth: 0,
  },
  shelfStyleCardSelected: {
    backgroundColor: Colors.surfaceMuted,
  },
  shelfStyleSample: {
    width: '100%',
    height: 64,
    justifyContent: 'center',
  },
  shelfStyleImage: {
    width: '100%',
    height: '100%',
  },
  shelfStyleName: {
    color: Colors.text,
    fontFamily: Fonts.ui.semibold,
    fontSize: Typography.sizes.sm,
    lineHeight: Typography.metrics.lineHeight17,
    textAlign: 'center',
  },
  shelfStyleNameSelected: {
    color: Colors.primary,
  },
  shelfStyleSelectedMark: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
  },
  wallpaperCard: {
    width: 112,
    minHeight: 124,
    padding: Spacing.sm,
    borderRadius: Radii.md,
    backgroundColor: 'transparent',
    alignItems: 'center',
    gap: Spacing.sm,
    position: 'relative',
    outlineWidth: 0,
  },
  wallpaperCardSelected: {
    backgroundColor: Colors.surfaceMuted,
  },
  wallpaperSample: {
    width: '100%',
    height: 78,
    borderRadius: Radii.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    overflow: 'hidden',
    position: 'relative',
  },
  wallpaperName: {
    color: Colors.text,
    fontFamily: Fonts.ui.semibold,
    fontSize: Typography.sizes.xs,
    lineHeight: Typography.metrics.lineHeight14,
    textAlign: 'center',
  },
  wallpaperNameSelected: {
    color: Colors.primary,
  },
  wallpaperSelectedMark: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
  },
  colorOption: {
    width: 72,
    alignItems: 'center',
    gap: Spacing.values[6],
  },
  colorSwatchFrame: {
    width: 46,
    height: 46,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.surface,
    position: 'relative',
  },
  colorSwatchFrameSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.surfaceMuted,
  },
  colorSwatch: {
    width: 36,
    height: 36,
    borderRadius: Radii.full,
    borderWidth: 1,
    boxShadow: Shadows.custom.studioSmall,
  },
  selectedMark: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 18,
    height: 18,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderWidth: 2,
    borderColor: Colors.surfaceElevated,
  },
  colorName: {
    color: Colors.textTertiary,
    fontFamily: Fonts.ui.regular,
    fontSize: Typography.sizes.xs,
    lineHeight: Typography.metrics.lineHeight14,
    textAlign: 'center',
  },
  colorNameSelected: {
    color: Colors.primary,
    fontFamily: Fonts.ui.semibold,
  },
  pageStyleHeading: {
    gap: Spacing.values[2],
  },
  pageStyleCard: {
    width: 196,
    minHeight: 116,
    padding: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    position: 'relative',
    gap: Spacing.values[6],
  },
  pageStyleCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.surfaceMuted,
  },
  pageStyleSample: {
    width: '100%',
    aspectRatio: 4 / 5,
    borderRadius: Radii.sm,
    backgroundColor: Colors.book.page,
  },
  pageStyleCopy: {
    gap: Spacing.values[2],
  },
  pageStyleName: {
    color: Colors.text,
    fontFamily: Fonts.ui.semibold,
    fontSize: Typography.sizes.sm,
    lineHeight: Typography.metrics.lineHeight17,
  },
  pageStyleNameSelected: {
    color: Colors.primary,
    fontFamily: Fonts.ui.semibold,
  },
  pageStyleDescription: {
    color: Colors.textTertiary,
    fontFamily: Fonts.ui.regular,
    fontSize: Typography.sizes.xs,
    lineHeight: Typography.metrics.lineHeight14,
  },
  pageStyleSelectedMark: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
  },
  finishButton: {
    minHeight: 54,
    borderRadius: Radii.full,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
  },
  disabledButton: {
    opacity: 0.35,
  },
  finishText: {
    color: Colors.onPrimary,
    fontFamily: Fonts.ui.semibold,
    fontSize: Typography.sizes.md,
  },
  error: {
    color: Colors.error,
    fontFamily: Fonts.ui.regular,
    fontSize: Typography.sizes.md,
    lineHeight: Typography.metrics.lineHeight18,
    textAlign: 'center',
  },
});
