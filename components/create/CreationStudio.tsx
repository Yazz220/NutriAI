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
  getLegacyCoverStyleForColor,
  resolveCookbookBinding,
} from '@/constants/cookbookBindings';
import { resolveCookbookSpreadHeight } from '@/constants/cookbookGeometry';
import { Radii, Shadows, Spacing, Typography } from '@/constants/spacing';
import { Fonts } from '@/utils/fonts';
import type { CookbookCoverColorId, CookbookCoverFinishId } from '@/types/cookbook';

/**
 * Cookbook creation keeps the physical book canonical while letting the user
 * choose its title, cover finish, cover color, and book-owned recipe-page identity.
 */

type PreviewFace = 'cover' | 'inside';

export interface CreateCookbookDetails {
  title: string;
  coverFinishId: CookbookCoverFinishId;
  coverColorId: CookbookCoverColorId;
  pageStyleId: CreationPageStyleId;
}

interface CreationStudioProps {
  canCreate: boolean;
  onCreateBook: (details: CreateCookbookDetails) => Promise<void>;
  onSignIn: () => void;
  bottomInset?: number;
  mode?: 'standard' | 'first-run';
}

export function CreationStudio({
  canCreate,
  onCreateBook,
  onSignIn,
  bottomInset = 0,
  mode = 'standard',
}: CreationStudioProps) {
  const { width } = useWindowDimensions();
  const coverFinishes = listCookbookCoverFinishes();
  const coverColors = listCookbookCoverColors();
  const pageStyles = listCreationPageStyles();
  const isFirstRun = mode === 'first-run';
  const [title, setTitle] = useState(isFirstRun ? 'My Cookbook' : '');
  const [coverFinishId, setCoverFinishId] = useState<CookbookCoverFinishId>(DEFAULT_COVER_FINISH_ID);
  const [coverColorId, setCoverColorId] = useState<CookbookCoverColorId>(DEFAULT_COVER_COLOR_ID);
  const [pageStyleId, setPageStyleId] = useState<CreationPageStyleId>(DEFAULT_CREATION_PAGE_STYLE_ID);
  const [previewFace, setPreviewFace] = useState<PreviewFace>('cover');
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

  async function handleCreate() {
    const trimmed = title.trim();
    if (!trimmed || submitting || !canCreate) return;
    setSubmitting(true);
    setError(null);
    try {
      await onCreateBook({ title: trimmed, coverFinishId, coverColorId, pageStyleId });
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
            {isFirstRun ? 'Give your recipes a home' : 'Make it yours'}
          </Text>
        </View>

        <View style={styles.previewPanel}>
          <PreviewToggle value={previewFace} onChange={selectPreviewFace} />
          <BookPreview
            title={title}
            coverFinishId={coverFinishId}
            coverColorId={coverColorId}
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
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return 'Could not create cookbook.';
}

function PreviewToggle({ value, onChange }: { value: PreviewFace; onChange: (value: PreviewFace) => void }) {
  return (
    <View style={styles.previewToggle}>
      {(['cover', 'inside'] as PreviewFace[]).map((face) => (
        <Pressable
          key={face}
          style={[styles.previewToggleItem, value === face && styles.previewToggleItemSelected]}
          onPress={() => onChange(face)}
          accessibilityRole="button"
          accessibilityState={{ selected: value === face }}
        >
          <Text style={[styles.previewToggleText, value === face && styles.previewToggleTextSelected]}>
            {face === 'cover' ? 'Cover' : 'Pages'}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function BookPreview({
  title,
  coverFinishId,
  coverColorId,
  pageStyleId,
  face,
  availableWidth,
  onPress,
}: {
  title: string;
  coverFinishId: CookbookCoverFinishId;
  coverColorId: CookbookCoverColorId;
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
      style={[styles.bookStage, { minHeight: stageHeight }]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={face === 'cover' ? 'Open cookbook preview' : 'Close cookbook preview'}
    >
      {face === 'cover' ? (
        <>
          <View pointerEvents="none" style={styles.stageHalo} />
          <PhysicalBook
            title={previewTitle}
            coverStyle={getLegacyCoverStyleForColor(coverColorId)}
            coverFinishId={coverFinishId}
            coverColorId={coverColorId}
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
      <View style={styles.finishGrid}>
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
      <Text style={styles.sectionTitle}>Color</Text>
      <View style={styles.colorRow}>
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
      </View>
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
      <View style={styles.pageStyleGrid}>
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
      </View>
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
  previewPanel: {
    gap: Spacing.xs,
  },
  previewToggle: {
    alignSelf: 'center',
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  previewToggleItem: {
    minWidth: 64,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.values[6],
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
    alignItems: 'center',
  },
  previewToggleItemSelected: {
    borderBottomColor: Colors.primary,
  },
  previewToggleText: {
    color: Colors.textSecondary,
    fontFamily: Fonts.ui.medium,
    fontSize: Typography.sizes.md,
  },
  previewToggleTextSelected: {
    color: Colors.primary,
    fontFamily: Fonts.ui.semibold,
  },
  bookStage: {
    alignItems: 'center',
    justifyContent: 'center',
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
  controlPanel: {
    gap: Spacing.xl,
    paddingHorizontal: Spacing.xs,
  },
  section: {
    gap: Spacing.sm,
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
  finishGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
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
  colorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.values[2],
  },
  colorOption: {
    flex: 1,
    minWidth: 0,
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
  pageStyleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  pageStyleCard: {
    flexBasis: '46%',
    flexGrow: 1,
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
