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
import { BookOpen, Check, Feather, Leaf, Sparkles } from 'lucide-react-native';
import { PhysicalBook } from '@/components/physical-book/PhysicalBook';
import { Text } from '@/components/ui/Text';
import {
  COOKBOOK_PAGE_STYLES,
  DEFAULT_CREATION_PAGE_STYLE_ID,
  listCreationPageStyles,
  listFeaturedCookbookCoverFinishes,
  type CookbookCoverFinishOption,
  type CookbookPageStyleOption,
  type CreationPageStyleId,
} from '@/constants/cookbookCustomization';
import { Colors } from '@/constants/colors';
import { getCookbookBindingForStyle } from '@/constants/cookbookBindings';
import { Radii, Spacing } from '@/constants/spacing';
import { Fonts } from '@/utils/fonts';
import type { CookbookStyleId } from '@/types/cookbook';

/**
 * Production cookbook creation studio. The book remains the focal object while
 * catalog-backed controls independently choose its physical cover and its
 * book-owned recipe-page visual language. Page layout remains automatic.
 */

type PreviewFace = 'cover' | 'inside';

interface CreationStudioProps {
  canCreate: boolean;
  onCreateBook: (
    title: string,
    coverStyle: CookbookStyleId,
    pageStyleId: CreationPageStyleId,
  ) => Promise<void>;
  onSignIn: () => void;
  bottomInset?: number;
}

export function CreationStudio({
  canCreate,
  onCreateBook,
  onSignIn,
  bottomInset = 0,
}: CreationStudioProps) {
  const { width } = useWindowDimensions();
  const coverFinishes = listFeaturedCookbookCoverFinishes();
  const pageStyles = listCreationPageStyles();
  const [title, setTitle] = useState('');
  const [coverStyle, setCoverStyle] = useState<CookbookStyleId>(coverFinishes[0].id);
  const [pageStyleId, setPageStyleId] = useState<CreationPageStyleId>(DEFAULT_CREATION_PAGE_STYLE_ID);
  const [previewFace, setPreviewFace] = useState<PreviewFace>('cover');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function selectWithHaptic<T>(setter: (value: T) => void, value: T) {
    setter(value);
    setError(null);
    void Haptics.selectionAsync().catch(() => undefined);
  }

  function selectPageStyle(value: CreationPageStyleId) {
    selectWithHaptic(setPageStyleId, value);
    setPreviewFace('inside');
  }

  async function handleCreate() {
    const trimmed = title.trim();
    if (!trimmed || submitting || !canCreate) return;
    setSubmitting(true);
    setError(null);
    try {
      await onCreateBook(trimmed, coverStyle, pageStyleId);
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
          <Text style={styles.eyebrow}>CREATE COOKBOOK</Text>
          <Text style={styles.headingTitle}>Make it yours</Text>
          <Text style={styles.headingSubtitle}>
            One book, personalized for the way you want to cook and collect.
          </Text>
        </View>

        <View style={styles.previewPanel}>
          <PreviewToggle value={previewFace} onChange={(value) => selectWithHaptic(setPreviewFace, value)} />
          <BookPreview
            title={title}
            coverStyle={coverStyle}
            pageStyleId={pageStyleId}
            face={previewFace}
            availableWidth={Math.min(width - Spacing.xl * 2, 712)}
            onPress={() => selectWithHaptic(setPreviewFace, previewFace === 'cover' ? 'inside' : 'cover')}
          />
          <SelectionSummary coverStyle={coverStyle} pageStyleId={pageStyleId} />
        </View>

        <View style={styles.controlStack}>
          <TitleField value={title} onChange={(value) => {
            setTitle(value);
            setError(null);
          }} />
          <CoverSelector value={coverStyle} options={coverFinishes} onChange={(value) => {
            selectWithHaptic(setCoverStyle, value);
            setPreviewFace('cover');
          }} />
          <PageStyleSelector value={pageStyleId} options={pageStyles} onChange={selectPageStyle} />

          {error ? <Text style={styles.error} selectable>{error}</Text> : null}
          {!canCreate ? <Text style={styles.note}>Sign in to add cookbooks to your shelf.</Text> : null}

          <Pressable
            style={[styles.finishButton, ctaDisabled && styles.disabledButton]}
            onPress={canCreate ? () => void handleCreate() : onSignIn}
            disabled={ctaDisabled}
            accessibilityRole="button"
            accessibilityLabel={canCreate ? 'Add this cookbook to my shelf' : 'Go to sign in'}
          >
            {submitting ? (
              <ActivityIndicator color={Colors.onPrimary} />
            ) : (
              <>
                <BookOpen size={18} color={Colors.onPrimary} />
                <Text style={styles.finishText}>{canCreate ? 'Add to my shelf' : 'Sign in to save'}</Text>
              </>
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
            {face === 'cover' ? 'Cover' : 'Inside'}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function BookPreview({
  title,
  coverStyle,
  pageStyleId,
  face,
  availableWidth,
  onPress,
}: {
  title: string;
  coverStyle: CookbookStyleId;
  pageStyleId: CreationPageStyleId;
  face: PreviewFace;
  availableWidth: number;
  onPress: () => void;
}) {
  const previewTitle = title.trim() || 'My Cookbook';
  const coverWidth = Math.min(availableWidth * 0.54, 214);
  const spreadWidth = Math.min(availableWidth - Spacing.md, 460);
  const stageHeight = availableWidth > 500 ? 410 : 330;

  return (
    <Pressable
      style={[styles.bookStage, { minHeight: stageHeight }]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={face === 'cover' ? 'Open cookbook preview' : 'Close cookbook preview'}
    >
      <LinearGradient
        colors={['#fbfaf6', '#f0ede7']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {face === 'cover' ? (
        <PhysicalBook title={previewTitle} coverStyle={coverStyle} width={coverWidth} />
      ) : (
        <GeneratedRecipeSpread coverStyle={coverStyle} pageStyleId={pageStyleId} width={spreadWidth} />
      )}
    </Pressable>
  );
}

function GeneratedRecipeSpread({
  coverStyle,
  pageStyleId,
  width,
}: {
  coverStyle: CookbookStyleId;
  pageStyleId: CreationPageStyleId;
  width: number;
}) {
  const binding = getCookbookBindingForStyle(coverStyle);
  const style = COOKBOOK_PAGE_STYLES[pageStyleId];
  const height = width * 0.75;
  const pageWidth = width / 2;

  return (
    <View style={[styles.spreadWrap, { width, height, backgroundColor: binding.cloth }]}>
      <Image
        source={style.samples.brownies}
        resizeMode="cover"
        style={[styles.generatedPage, styles.generatedPageLeft, { width: pageWidth - 4, height: height - 8 }]}
        accessibilityLabel={`${style.name} brownie recipe sample`}
      />
      <Image
        source={style.samples.cookies}
        resizeMode="cover"
        style={[
          styles.generatedPage,
          styles.generatedPageRight,
          { left: pageWidth + 1, width: pageWidth - 5, height: height - 8 },
        ]}
        accessibilityLabel={`${style.name} cookie recipe sample`}
      />
      <LinearGradient
        colors={['rgba(23,22,20,0)', 'rgba(23,22,20,0.18)', 'rgba(255,255,255,0.18)', 'rgba(23,22,20,0)']}
        locations={[0, 0.42, 0.58, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.spreadGutter, { left: pageWidth - 8, height: height - 8 }]}
        pointerEvents="none"
      />
    </View>
  );
}

function SelectionSummary({
  coverStyle,
  pageStyleId,
}: {
  coverStyle: CookbookStyleId;
  pageStyleId: CreationPageStyleId;
}) {
  const cover = listFeaturedCookbookCoverFinishes().find((option) => option.id === coverStyle);
  const pageStyle = COOKBOOK_PAGE_STYLES[pageStyleId];
  return (
    <Text style={styles.selectionSummary}>
      {cover?.name ?? 'Custom'} {cover?.material.toLowerCase() ?? 'cover'} · {pageStyle.name} pages
    </Text>
  );
}

function TitleField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <View style={styles.section}>
      <View style={styles.fieldHeading}>
        <Text style={styles.sectionTitle}>Book title</Text>
        <Text style={styles.characterCount}>{value.length}/48</Text>
      </View>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="e.g. Healthy Meals"
        placeholderTextColor={Colors.textMuted}
        style={styles.input}
        maxLength={48}
        returnKeyType="done"
      />
    </View>
  );
}

function CoverSelector({
  value,
  options,
  onChange,
}: {
  value: CookbookStyleId;
  options: CookbookCoverFinishOption[];
  onChange: (value: CookbookStyleId) => void;
}) {
  return (
    <View style={styles.section}>
      <View>
        <Text style={styles.sectionTitle}>Cover finish</Text>
        <Text style={styles.sectionHint}>Choose the color and material together.</Text>
      </View>
      <View style={styles.coverGrid}>
        {options.map((option) => (
          <CoverChip
            key={option.id}
            option={option}
            selected={value === option.id}
            onPress={() => onChange(option.id)}
          />
        ))}
      </View>
    </View>
  );
}

function CoverChip({
  option,
  selected,
  onPress,
}: {
  option: CookbookCoverFinishOption;
  selected: boolean;
  onPress: () => void;
}) {
  const binding = getCookbookBindingForStyle(option.id);
  return (
    <Pressable
      style={[styles.coverChip, selected && styles.optionSelected]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${option.name} ${option.material} cover`}
    >
      <View style={[styles.coverSwatch, { backgroundColor: binding.cloth }]}>
        <View style={[styles.swatchSpine, { backgroundColor: binding.band }]} />
        <View style={[styles.swatchFoil, { backgroundColor: binding.foil[1] }]} />
      </View>
      <View style={styles.optionCopy}>
        <Text style={styles.optionName}>{option.name}</Text>
        <Text style={styles.optionMeta}>{option.material}</Text>
      </View>
      {selected ? <SelectedMark /> : null}
    </Pressable>
  );
}

function PageStyleSelector({
  value,
  options,
  onChange,
}: {
  value: CreationPageStyleId;
  options: CookbookPageStyleOption[];
  onChange: (value: CreationPageStyleId) => void;
}) {
  return (
    <View style={styles.section}>
      <View>
        <Text style={styles.sectionTitle}>Recipe pages</Text>
        <Text style={styles.sectionHint}>The look stays consistent. Layout adapts to each recipe.</Text>
      </View>
      <View style={styles.pageStyleGrid}>
        {options.map((option) => (
          <Pressable
            key={option.id}
            style={[styles.pageStyleCard, value === option.id && styles.optionSelected]}
            onPress={() => onChange(option.id)}
            accessibilityRole="button"
            accessibilityState={{ selected: value === option.id }}
          >
            <View style={[styles.pageStyleIcon, value === option.id && styles.pageStyleIconSelected]}>
              <PageStyleIcon id={option.id} selected={value === option.id} />
            </View>
            <View style={styles.optionCopy}>
              <Text style={styles.optionName}>{option.name}</Text>
              <Text numberOfLines={3} style={styles.optionMeta}>{option.description}</Text>
            </View>
            {value === option.id ? <SelectedMark /> : null}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function PageStyleIcon({ id, selected }: { id: CreationPageStyleId; selected: boolean }) {
  const color = selected ? Colors.onPrimary : Colors.text;
  if (id === 'illustrated') return <Leaf size={18} color={color} strokeWidth={1.6} />;
  if (id === 'studio-editorial') return <Sparkles size={18} color={color} strokeWidth={1.6} />;
  return <Feather size={18} color={color} strokeWidth={1.6} />;
}

function SelectedMark() {
  return (
    <View style={styles.selectedMark}>
      <Check size={11} color={Colors.onPrimary} strokeWidth={2.5} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  content: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
    gap: Spacing.xl,
  },
  heading: {
    gap: Spacing.xs,
  },
  eyebrow: {
    color: Colors.textTertiary,
    fontFamily: Fonts.ui.semibold,
    fontSize: 10,
    lineHeight: 15,
    letterSpacing: 1.4,
  },
  headingTitle: {
    color: Colors.text,
    fontFamily: Fonts.display.bold,
    fontSize: 34,
    lineHeight: 40,
  },
  headingSubtitle: {
    color: Colors.textSecondary,
    fontFamily: Fonts.ui.regular,
    fontSize: 14,
    lineHeight: 22,
    maxWidth: 520,
  },
  previewPanel: {
    gap: Spacing.md,
  },
  previewToggle: {
    alignSelf: 'center',
    flexDirection: 'row',
    padding: 3,
    backgroundColor: Colors.surfaceMuted,
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  previewToggleItem: {
    minWidth: 78,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 8,
    borderRadius: Radii.full,
    alignItems: 'center',
  },
  previewToggleItemSelected: {
    backgroundColor: Colors.text,
  },
  previewToggleText: {
    color: Colors.textSecondary,
    fontFamily: Fonts.ui.medium,
    fontSize: 12,
  },
  previewToggleTextSelected: {
    color: Colors.onPrimary,
  },
  bookStage: {
    borderRadius: Radii.xl,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    boxShadow: Colors.book.cardShadow,
  },
  spreadWrap: {
    padding: 4,
    borderRadius: 12,
    position: 'relative',
    boxShadow: '0 18px 34px rgba(23,22,20,0.18)',
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
  selectionSummary: {
    color: Colors.textTertiary,
    fontFamily: Fonts.ui.medium,
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
  },
  controlStack: {
    gap: Spacing.xl,
  },
  section: {
    gap: Spacing.md,
  },
  fieldHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: Colors.text,
    fontFamily: Fonts.ui.semibold,
    fontSize: 14,
    lineHeight: 20,
  },
  sectionHint: {
    color: Colors.textTertiary,
    fontFamily: Fonts.ui.regular,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 2,
  },
  characterCount: {
    color: Colors.textTertiary,
    fontFamily: Fonts.ui.regular,
    fontSize: 10,
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
    fontSize: 15,
  },
  coverGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  coverChip: {
    width: '48.5%',
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    paddingRight: 30,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceElevated,
    position: 'relative',
  },
  coverSwatch: {
    width: 38,
    height: 50,
    borderRadius: 5,
    position: 'relative',
    overflow: 'hidden',
    boxShadow: '0 5px 10px rgba(23,22,20,0.14)',
  },
  swatchSpine: {
    width: 7,
    height: '100%',
  },
  swatchFoil: {
    position: 'absolute',
    left: 14,
    top: 13,
    width: 13,
    height: 1,
  },
  optionCopy: {
    flex: 1,
    gap: 2,
  },
  optionName: {
    color: Colors.text,
    fontFamily: Fonts.ui.semibold,
    fontSize: 12,
    lineHeight: 17,
  },
  optionMeta: {
    color: Colors.textTertiary,
    fontFamily: Fonts.ui.regular,
    fontSize: 10,
    lineHeight: 15,
  },
  optionSelected: {
    borderColor: Colors.text,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
  },
  selectedMark: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.text,
  },
  pageStyleGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  pageStyleCard: {
    flex: 1,
    minHeight: 134,
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceElevated,
    position: 'relative',
    gap: Spacing.sm,
  },
  pageStyleIcon: {
    width: 38,
    height: 38,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceMuted,
  },
  pageStyleIconSelected: {
    backgroundColor: Colors.text,
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
    fontSize: 14,
  },
  error: {
    color: Colors.error,
    fontFamily: Fonts.ui.regular,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  note: {
    color: Colors.textTertiary,
    fontFamily: Fonts.ui.regular,
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'center',
  },
});
