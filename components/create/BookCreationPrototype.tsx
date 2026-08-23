import React, { useEffect, useMemo, useState } from 'react';
import {
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
import { router } from 'expo-router';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Feather,
  Leaf,
  Palette,
  Sparkles,
} from 'lucide-react-native';
import { PhysicalBook } from '@/components/physical-book/PhysicalBook';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { getCookbookBindingForStyle } from '@/constants/cookbookBindings';
import { Radii, Spacing } from '@/constants/spacing';
import { Fonts } from '@/utils/fonts';
import type { CookbookStyleId } from '@/types/cookbook';

/**
 * PROTOTYPE — three variants of one-book cookbook customization, switchable
 * with `?variant=A|B|C` on the existing `/library` route. Nothing is saved.
 */

export type BookCreationPrototypeVariant = 'A' | 'B' | 'C';

type PreviewFace = 'cover' | 'inside';
type PageLookId = 'illustrated' | 'editorial' | 'heritage';
type GuidedStep = 'name' | 'cover' | 'pages';

interface CoverOption {
  id: CookbookStyleId;
  name: string;
  material: string;
}

interface PageLook {
  id: PageLookId;
  name: string;
  description: string;
}

const COVER_OPTIONS: CoverOption[] = [
  { id: 'sage-linen', name: 'Sage', material: 'Linen' },
  { id: 'terracotta-cloth', name: 'Clay', material: 'Book cloth' },
  { id: 'navy-leather', name: 'Midnight', material: 'Leather' },
  { id: 'alabaster-linen', name: 'Alabaster', material: 'Linen' },
];

const PAGE_LOOKS: PageLook[] = [
  {
    id: 'illustrated',
    name: 'Illustrated',
    description: 'Gentle drawings and soft color',
  },
  {
    id: 'editorial',
    name: 'Editorial',
    description: 'Bold imagery and clean type',
  },
  {
    id: 'heritage',
    name: 'Heritage',
    description: 'Classic ink and quiet ornament',
  },
];

const VARIANTS: BookCreationPrototypeVariant[] = ['A', 'B', 'C'];
const VARIANT_LABELS: Record<BookCreationPrototypeVariant, string> = {
  A: 'Single studio',
  B: 'Tactile tray',
  C: 'Guided steps',
};

interface BookCreationPrototypeProps {
  variant: BookCreationPrototypeVariant;
  bottomInset?: number;
}

interface VariantProps {
  title: string;
  coverStyle: CookbookStyleId;
  pageLook: PageLookId;
  previewFace: PreviewFace;
  width: number;
  bottomInset: number;
  ready: boolean;
  guidedStep: GuidedStep;
  onTitleChange: (value: string) => void;
  onCoverChange: (value: CookbookStyleId) => void;
  onPageLookChange: (value: PageLookId) => void;
  onPreviewFaceChange: (value: PreviewFace) => void;
  onGuidedStepChange: (value: GuidedStep) => void;
  onFinish: () => void;
}

export function BookCreationPrototype({ variant, bottomInset = 0 }: BookCreationPrototypeProps) {
  const { width } = useWindowDimensions();
  const [title, setTitle] = useState('');
  const [coverStyle, setCoverStyle] = useState<CookbookStyleId>('sage-linen');
  const [pageLook, setPageLook] = useState<PageLookId>('illustrated');
  const [previewFace, setPreviewFace] = useState<PreviewFace>('cover');
  const [guidedStep, setGuidedStep] = useState<GuidedStep>('name');
  const [ready, setReady] = useState(false);

  function selectWithHaptic<T>(setter: (value: T) => void, value: T) {
    setter(value);
    setReady(false);
    void Haptics.selectionAsync().catch(() => undefined);
  }

  const props: VariantProps = {
    title,
    coverStyle,
    pageLook,
    previewFace,
    width,
    bottomInset,
    ready,
    guidedStep,
    onTitleChange: (value) => {
      setTitle(value);
      setReady(false);
    },
    onCoverChange: (value) => selectWithHaptic(setCoverStyle, value),
    onPageLookChange: (value) => {
      selectWithHaptic(setPageLook, value);
      setPreviewFace('inside');
    },
    onPreviewFaceChange: (value) => selectWithHaptic(setPreviewFace, value),
    onGuidedStepChange: (value) => selectWithHaptic(setGuidedStep, value),
    onFinish: () => {
      if (!title.trim()) return;
      setReady(true);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    },
  };

  return (
    <View style={styles.root}>
      {variant === 'A' ? <VariantA {...props} /> : null}
      {variant === 'B' ? <VariantB {...props} /> : null}
      {variant === 'C' ? <VariantC {...props} /> : null}
      <PrototypeSwitcher current={variant} bottomInset={bottomInset} />
    </View>
  );
}

function VariantA(props: VariantProps) {
  return (
    <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.fill}
        contentContainerStyle={[styles.studioContent, { paddingBottom: props.bottomInset + 126 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <PrototypeHeading
          eyebrow="CREATE COOKBOOK"
          title="Make it yours"
          subtitle="One book, personalized for the way you want to cook and collect."
        />

        <View style={styles.previewPanel}>
          <PreviewToggle value={props.previewFace} onChange={props.onPreviewFaceChange} />
          <BookPreview
            title={props.title}
            coverStyle={props.coverStyle}
            pageLook={props.pageLook}
            face={props.previewFace}
            availableWidth={props.width - Spacing.xl * 2}
            onPress={() => props.onPreviewFaceChange(props.previewFace === 'cover' ? 'inside' : 'cover')}
          />
          <SelectionSummary coverStyle={props.coverStyle} pageLook={props.pageLook} />
        </View>

        <View style={styles.controlStack}>
          <TitleField value={props.title} onChange={props.onTitleChange} />
          <CoverSelector value={props.coverStyle} onChange={props.onCoverChange} />
          <PageLookSelector value={props.pageLook} onChange={props.onPageLookChange} layout="cards" />
          <FinishButton title={props.title} ready={props.ready} onPress={props.onFinish} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function VariantB(props: VariantProps) {
  return (
    <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.fill}
        contentContainerStyle={[styles.trayContent, { paddingBottom: props.bottomInset + 126 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.trayHero}>
          <View style={styles.trayHeadingRow}>
            <View>
              <Text style={styles.eyebrow}>YOUR NEW COOKBOOK</Text>
              <Text style={styles.trayTitle}>{props.title.trim() || 'My Cookbook'}</Text>
            </View>
            <Pressable
              style={styles.roundFaceButton}
              onPress={() => props.onPreviewFaceChange(props.previewFace === 'cover' ? 'inside' : 'cover')}
              accessibilityRole="button"
              accessibilityLabel={props.previewFace === 'cover' ? 'Open cookbook preview' : 'Close cookbook preview'}
            >
              {props.previewFace === 'cover' ? (
                <BookOpen size={19} color={Colors.text} strokeWidth={1.7} />
              ) : (
                <Palette size={19} color={Colors.text} strokeWidth={1.7} />
              )}
            </Pressable>
          </View>

          <BookPreview
            title={props.title}
            coverStyle={props.coverStyle}
            pageLook={props.pageLook}
            face={props.previewFace}
            availableWidth={props.width - Spacing.lg * 2}
            onPress={() => props.onPreviewFaceChange(props.previewFace === 'cover' ? 'inside' : 'cover')}
            stage="dramatic"
          />

          <Text style={styles.tapHint}>
            {props.previewFace === 'cover' ? 'Tap the book to look inside' : 'Tap the pages to return to the cover'}
          </Text>
        </View>

        <View style={styles.customizationTray}>
          <View style={styles.trayHandle} />
          <View style={styles.traySectionHeading}>
            <Text style={styles.sectionTitle}>Personalize</Text>
            <SelectionSummary coverStyle={props.coverStyle} pageLook={props.pageLook} compact />
          </View>

          <TextInput
            value={props.title}
            onChangeText={props.onTitleChange}
            placeholder="Name your cookbook"
            placeholderTextColor={Colors.textMuted}
            style={styles.trayInput}
            maxLength={48}
            returnKeyType="done"
          />

          <Text style={styles.trayLabel}>Cover finish</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.trayOptionsRow}>
            {COVER_OPTIONS.map((option) => (
              <CoverChip
                key={option.id}
                option={option}
                selected={props.coverStyle === option.id}
                onPress={() => props.onCoverChange(option.id)}
                compact
              />
            ))}
          </ScrollView>

          <Text style={styles.trayLabel}>Recipe pages</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.trayOptionsRow}>
            {PAGE_LOOKS.map((look) => (
              <PageLookChip
                key={look.id}
                look={look}
                selected={props.pageLook === look.id}
                onPress={() => props.onPageLookChange(look.id)}
              />
            ))}
          </ScrollView>

          <FinishButton title={props.title} ready={props.ready} onPress={props.onFinish} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function VariantC(props: VariantProps) {
  const steps: GuidedStep[] = ['name', 'cover', 'pages'];
  const activeIndex = steps.indexOf(props.guidedStep);

  function goForward() {
    if (activeIndex < steps.length - 1) {
      props.onGuidedStepChange(steps[activeIndex + 1]);
      if (steps[activeIndex + 1] === 'pages') props.onPreviewFaceChange('inside');
      return;
    }
    props.onFinish();
  }

  function goBack() {
    if (activeIndex > 0) props.onGuidedStepChange(steps[activeIndex - 1]);
  }

  const nextDisabled = props.guidedStep === 'name' && !props.title.trim();

  return (
    <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.fill}
        contentContainerStyle={[styles.guidedContent, { paddingBottom: props.bottomInset + 126 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <PrototypeHeading
          eyebrow="CREATE COOKBOOK"
          title="A book of your own"
          subtitle="Three small choices. You can change them before adding the book to your shelf."
        />

        <GuidedProgress current={props.guidedStep} onChange={props.onGuidedStepChange} />

        <View style={styles.guidedPreview}>
          <BookPreview
            title={props.title}
            coverStyle={props.coverStyle}
            pageLook={props.pageLook}
            face={props.guidedStep === 'pages' ? 'inside' : 'cover'}
            availableWidth={props.width - Spacing.xl * 2}
          />
        </View>

        <View style={styles.guidedCard}>
          {props.guidedStep === 'name' ? (
            <>
              <Text style={styles.guidedStepCount}>STEP 1 OF 3</Text>
              <Text style={styles.guidedQuestion}>What will you call it?</Text>
              <Text style={styles.guidedHelp}>The name appears on the cover and on your shelf.</Text>
              <TextInput
                value={props.title}
                onChangeText={props.onTitleChange}
                placeholder="e.g. Healthy Meals"
                placeholderTextColor={Colors.textMuted}
                style={styles.guidedInput}
                maxLength={48}
                returnKeyType="next"
                onSubmitEditing={goForward}
              />
            </>
          ) : null}

          {props.guidedStep === 'cover' ? (
            <>
              <Text style={styles.guidedStepCount}>STEP 2 OF 3</Text>
              <Text style={styles.guidedQuestion}>Choose a cover</Text>
              <Text style={styles.guidedHelp}>A small set of finishes keeps the choice quick and tactile.</Text>
              <View style={styles.guidedCoverGrid}>
                {COVER_OPTIONS.map((option) => (
                  <CoverChip
                    key={option.id}
                    option={option}
                    selected={props.coverStyle === option.id}
                    onPress={() => props.onCoverChange(option.id)}
                  />
                ))}
              </View>
            </>
          ) : null}

          {props.guidedStep === 'pages' ? (
            <>
              <Text style={styles.guidedStepCount}>STEP 3 OF 3</Text>
              <Text style={styles.guidedQuestion}>How should recipes feel?</Text>
              <Text style={styles.guidedHelp}>Nosh will adapt every layout while keeping this visual language consistent.</Text>
              <PageLookSelector value={props.pageLook} onChange={props.onPageLookChange} layout="rows" />
            </>
          ) : null}

          <View style={styles.guidedActions}>
            {activeIndex > 0 ? (
              <Pressable style={styles.guidedBack} onPress={goBack} accessibilityRole="button">
                <ArrowLeft size={17} color={Colors.text} />
                <Text style={styles.guidedBackText}>Back</Text>
              </Pressable>
            ) : (
              <View />
            )}
            <Pressable
              style={[styles.guidedNext, nextDisabled && styles.disabledButton, props.ready && styles.readyButton]}
              onPress={goForward}
              disabled={nextDisabled}
              accessibilityRole="button"
            >
              {props.ready ? <Check size={17} color={Colors.onPrimary} /> : null}
              <Text style={styles.guidedNextText}>
                {props.ready ? 'Ready for your shelf' : activeIndex === steps.length - 1 ? 'Add to my shelf' : 'Continue'}
              </Text>
              {!props.ready && activeIndex < steps.length - 1 ? (
                <ArrowRight size={17} color={Colors.onPrimary} />
              ) : null}
            </Pressable>
          </View>
          {props.ready ? <PrototypeOnlyNotice /> : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function PrototypeHeading({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) {
  return (
    <View style={styles.heading}>
      <View style={styles.prototypeRow}>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <View style={styles.prototypeBadge}>
          <Text style={styles.prototypeBadgeText}>PROTOTYPE</Text>
        </View>
      </View>
      <Text style={styles.headingTitle}>{title}</Text>
      <Text style={styles.headingSubtitle}>{subtitle}</Text>
    </View>
  );
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
  pageLook,
  face,
  availableWidth,
  onPress,
  stage = 'quiet',
}: {
  title: string;
  coverStyle: CookbookStyleId;
  pageLook: PageLookId;
  face: PreviewFace;
  availableWidth: number;
  onPress?: () => void;
  stage?: 'quiet' | 'dramatic';
}) {
  const previewTitle = title.trim() || 'My Cookbook';
  const coverWidth = Math.min(availableWidth * (stage === 'dramatic' ? 0.58 : 0.54), 214);
  const spreadWidth = Math.min(availableWidth - Spacing.md, 360);

  return (
    <Pressable
      style={[styles.bookStage, stage === 'dramatic' && styles.bookStageDramatic]}
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={onPress ? (face === 'cover' ? 'Open cookbook preview' : 'Close cookbook preview') : undefined}
    >
      <LinearGradient
        colors={stage === 'dramatic' ? ['#f0ede7', '#fbfaf6', '#e6e1d5'] : ['#fbfaf6', '#f0ede7']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {face === 'cover' ? (
        <View style={styles.closedBookWrap}>
          <PhysicalBook title={previewTitle} coverStyle={coverStyle} width={coverWidth} />
        </View>
      ) : (
        <RecipeSpread title={previewTitle} pageLook={pageLook} coverStyle={coverStyle} width={spreadWidth} />
      )}
    </Pressable>
  );
}

function RecipeSpread({
  title,
  pageLook,
  coverStyle,
  width,
}: {
  title: string;
  pageLook: PageLookId;
  coverStyle: CookbookStyleId;
  width: number;
}) {
  const binding = getCookbookBindingForStyle(coverStyle);
  const height = width * 0.68;
  const pageWidth = width / 2;
  const accent = pageLook === 'editorial' ? '#a7422b' : pageLook === 'heritage' ? '#b77a10' : binding.cloth;

  return (
    <View style={[styles.spreadWrap, { width, height, backgroundColor: binding.cloth }]}>
      <View style={[styles.recipePage, styles.leftRecipePage, { width: pageWidth - 3, height: height - 8 }]}>
        <Text numberOfLines={1} style={styles.sampleBookName}>{title}</Text>
        <View style={[styles.sampleRule, { backgroundColor: accent }]} />
        <Text style={styles.sampleRecipeTitle}>Lemon garden pasta</Text>
        <Text style={styles.sampleMeta}>25 MIN · SERVES 4</Text>
        <Text style={styles.sampleSection}>INGREDIENTS</Text>
        {['linguine', 'two lemons', 'garden herbs', 'parmesan', 'olive oil'].map((item) => (
          <View key={item} style={styles.sampleLineRow}>
            <View style={[styles.sampleDot, { backgroundColor: accent }]} />
            <Text style={styles.sampleLine}>{item}</Text>
          </View>
        ))}
      </View>

      <View style={[styles.recipePage, styles.rightRecipePage, { left: pageWidth + 1, width: pageWidth - 4, height: height - 8 }]}>
        <SampleRecipeArtwork pageLook={pageLook} accent={accent} />
        <Text style={styles.sampleSection}>METHOD</Text>
        <Text style={styles.sampleMethod}>Toss hot pasta with lemon, herbs and a little pasta water.</Text>
        <Text style={styles.sampleMethod}>Finish with parmesan and a bright pour of olive oil.</Text>
      </View>
      <LinearGradient
        colors={['rgba(23,22,20,0)', 'rgba(23,22,20,0.16)', 'rgba(255,255,255,0.2)', 'rgba(23,22,20,0)']}
        locations={[0, 0.42, 0.58, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.spreadGutter, { left: pageWidth - 8, height: height - 8 }]}
      />
    </View>
  );
}

function SampleRecipeArtwork({ pageLook, accent }: { pageLook: PageLookId; accent: string }) {
  if (pageLook === 'editorial') {
    return (
      <LinearGradient colors={['#312a24', accent, '#e8aa42']} style={styles.sampleArtwork}>
        <View style={styles.editorialPlate}>
          <View style={styles.editorialPasta} />
        </View>
        <Text style={styles.editorialCaption}>LEMON · HERBS · PARMESAN</Text>
      </LinearGradient>
    );
  }

  if (pageLook === 'heritage') {
    return (
      <View style={[styles.sampleArtwork, styles.heritageArtwork, { borderColor: accent }]}>
        <Feather size={32} color={accent} strokeWidth={1.25} />
        <View style={[styles.heritageRule, { backgroundColor: accent }]} />
        <Text style={[styles.heritageCaption, { color: accent }]}>FROM THE KITCHEN</Text>
      </View>
    );
  }

  return (
    <View style={[styles.sampleArtwork, styles.illustratedArtwork]}>
      <View style={[styles.illustrationSun, { backgroundColor: `${accent}33` }]} />
      <Leaf size={44} color={accent} strokeWidth={1.3} />
      <Sparkles size={17} color={Colors.butterscotch} strokeWidth={1.4} style={styles.illustrationSparkle} />
    </View>
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

function CoverSelector({ value, onChange }: { value: CookbookStyleId; onChange: (value: CookbookStyleId) => void }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeadingRow}>
        <View>
          <Text style={styles.sectionTitle}>Cover finish</Text>
          <Text style={styles.sectionHint}>Choose the color and material together.</Text>
        </View>
      </View>
      <View style={styles.coverGrid}>
        {COVER_OPTIONS.map((option) => (
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
  compact = false,
}: {
  option: CoverOption;
  selected: boolean;
  onPress: () => void;
  compact?: boolean;
}) {
  const binding = getCookbookBindingForStyle(option.id);

  return (
    <Pressable
      style={[styles.coverChip, compact && styles.coverChipCompact, selected && styles.optionSelected]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${option.name} ${option.material} cover`}
    >
      <View style={[styles.coverSwatch, { backgroundColor: binding.cloth }]}>
        <View style={[styles.swatchSpine, { backgroundColor: binding.band }]} />
        <View style={[styles.swatchFoil, { backgroundColor: binding.foil[1] }]} />
      </View>
      <View style={styles.coverChipCopy}>
        <Text style={styles.optionName}>{option.name}</Text>
        <Text style={styles.optionMeta}>{option.material}</Text>
      </View>
      {selected ? (
        <View style={styles.selectedMark}>
          <Check size={11} color={Colors.onPrimary} strokeWidth={2.5} />
        </View>
      ) : null}
    </Pressable>
  );
}

function PageLookSelector({
  value,
  onChange,
  layout,
}: {
  value: PageLookId;
  onChange: (value: PageLookId) => void;
  layout: 'cards' | 'rows';
}) {
  return (
    <View style={layout === 'cards' ? styles.section : undefined}>
      {layout === 'cards' ? (
        <View style={styles.sectionHeadingRow}>
          <View>
            <Text style={styles.sectionTitle}>Recipe pages</Text>
            <Text style={styles.sectionHint}>The look stays consistent. Layout adapts to each recipe.</Text>
          </View>
        </View>
      ) : null}
      <View style={layout === 'cards' ? styles.pageLookGrid : styles.pageLookRows}>
        {PAGE_LOOKS.map((look) => (
          <PageLookCard
            key={look.id}
            look={look}
            selected={value === look.id}
            onPress={() => onChange(look.id)}
            row={layout === 'rows'}
          />
        ))}
      </View>
    </View>
  );
}

function PageLookCard({
  look,
  selected,
  onPress,
  row = false,
}: {
  look: PageLook;
  selected: boolean;
  onPress: () => void;
  row?: boolean;
}) {
  return (
    <Pressable
      style={[styles.pageLookCard, row && styles.pageLookCardRow, selected && styles.optionSelected]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <View style={[styles.pageLookIcon, selected && styles.pageLookIconSelected]}>
        <PageLookIcon id={look.id} selected={selected} />
      </View>
      <View style={styles.pageLookCopy}>
        <Text style={styles.optionName}>{look.name}</Text>
        <Text numberOfLines={row ? 2 : 3} style={styles.optionMeta}>{look.description}</Text>
      </View>
      {selected ? (
        <View style={styles.selectedMark}>
          <Check size={11} color={Colors.onPrimary} strokeWidth={2.5} />
        </View>
      ) : null}
    </Pressable>
  );
}

function PageLookChip({ look, selected, onPress }: { look: PageLook; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      style={[styles.pageLookChip, selected && styles.pageLookChipSelected]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <PageLookIcon id={look.id} selected={selected} />
      <Text style={[styles.pageLookChipText, selected && styles.pageLookChipTextSelected]}>{look.name}</Text>
    </Pressable>
  );
}

function PageLookIcon({ id, selected }: { id: PageLookId; selected: boolean }) {
  const color = selected ? Colors.onPrimary : Colors.text;
  if (id === 'illustrated') return <Leaf size={18} color={color} strokeWidth={1.6} />;
  if (id === 'editorial') return <Sparkles size={18} color={color} strokeWidth={1.6} />;
  return <Feather size={18} color={color} strokeWidth={1.6} />;
}

function SelectionSummary({
  coverStyle,
  pageLook,
  compact = false,
}: {
  coverStyle: CookbookStyleId;
  pageLook: PageLookId;
  compact?: boolean;
}) {
  const cover = COVER_OPTIONS.find((option) => option.id === coverStyle) ?? COVER_OPTIONS[0];
  const look = PAGE_LOOKS.find((option) => option.id === pageLook) ?? PAGE_LOOKS[0];
  return (
    <Text style={compact ? styles.compactSummary : styles.selectionSummary}>
      {cover.name} {cover.material.toLowerCase()} · {look.name} pages
    </Text>
  );
}

function FinishButton({ title, ready, onPress }: { title: string; ready: boolean; onPress: () => void }) {
  const disabled = !title.trim();
  return (
    <View style={styles.finishWrap}>
      <Pressable
        style={[styles.finishButton, disabled && styles.disabledButton, ready && styles.readyButton]}
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
      >
        {ready ? <Check size={18} color={Colors.onPrimary} /> : <BookOpen size={18} color={Colors.onPrimary} />}
        <Text style={styles.finishText}>{ready ? 'Ready for your shelf' : 'Add to my shelf'}</Text>
      </Pressable>
      {ready ? <PrototypeOnlyNotice /> : null}
    </View>
  );
}

function PrototypeOnlyNotice() {
  return <Text style={styles.prototypeNotice}>Prototype only — no cookbook was saved.</Text>;
}

function GuidedProgress({ current, onChange }: { current: GuidedStep; onChange: (value: GuidedStep) => void }) {
  const items: { id: GuidedStep; label: string }[] = [
    { id: 'name', label: 'Name' },
    { id: 'cover', label: 'Cover' },
    { id: 'pages', label: 'Pages' },
  ];
  return (
    <View style={styles.progressRow}>
      {items.map((item, index) => {
        const selected = item.id === current;
        return (
          <React.Fragment key={item.id}>
            {index > 0 ? <View style={styles.progressRule} /> : null}
            <Pressable style={styles.progressItem} onPress={() => onChange(item.id)} accessibilityRole="button">
              <View style={[styles.progressNumber, selected && styles.progressNumberSelected]}>
                <Text style={[styles.progressNumberText, selected && styles.progressNumberTextSelected]}>{index + 1}</Text>
              </View>
              <Text style={[styles.progressLabel, selected && styles.progressLabelSelected]}>{item.label}</Text>
            </Pressable>
          </React.Fragment>
        );
      })}
    </View>
  );
}

function PrototypeSwitcher({ current, bottomInset }: { current: BookCreationPrototypeVariant; bottomInset: number }) {
  const currentIndex = VARIANTS.indexOf(current);

  const changeVariant = useMemo(
    () => (direction: -1 | 1) => {
      const nextIndex = (currentIndex + direction + VARIANTS.length) % VARIANTS.length;
      router.setParams({ variant: VARIANTS[nextIndex] });
    },
    [currentIndex],
  );

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName?.toLowerCase();
      if (tagName === 'input' || tagName === 'textarea' || target?.isContentEditable) return;
      if (event.key === 'ArrowLeft') changeVariant(-1);
      if (event.key === 'ArrowRight') changeVariant(1);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [changeVariant]);

  return (
    <View style={[styles.switcherWrap, { bottom: Math.max(bottomInset, Spacing.md) }]} pointerEvents="box-none">
      <View style={styles.switcher}>
        <Pressable
          style={styles.switcherArrow}
          onPress={() => changeVariant(-1)}
          accessibilityLabel="Previous prototype"
        >
          <ChevronLeft size={20} color={Colors.onPrimary} />
        </Pressable>
        <View style={styles.switcherLabel}>
          <Text style={styles.switcherEyebrow}>PROTOTYPE</Text>
          <Text style={styles.switcherText}>{current} — {VARIANT_LABELS[current]}</Text>
        </View>
        <Pressable
          style={styles.switcherArrow}
          onPress={() => changeVariant(1)}
          accessibilityLabel="Next prototype"
        >
          <ChevronRight size={20} color={Colors.onPrimary} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  fill: {
    flex: 1,
  },
  studioContent: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
    gap: Spacing.xl,
  },
  trayContent: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    paddingTop: Spacing.sm,
  },
  guidedContent: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
    gap: Spacing.lg,
  },
  heading: {
    gap: Spacing.xs,
  },
  prototypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eyebrow: {
    color: Colors.textTertiary,
    fontFamily: Fonts.ui.semibold,
    fontSize: 10,
    lineHeight: 15,
    letterSpacing: 1.4,
  },
  prototypeBadge: {
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceMuted,
    borderRadius: Radii.full,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  prototypeBadgeText: {
    color: Colors.textTertiary,
    fontFamily: Fonts.ui.semibold,
    fontSize: 8,
    letterSpacing: 1.1,
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
    minHeight: 330,
    borderRadius: Radii.xl,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    boxShadow: Colors.book.cardShadow,
  },
  bookStageDramatic: {
    minHeight: 390,
    borderRadius: 0,
    borderLeftWidth: 0,
    borderRightWidth: 0,
  },
  closedBookWrap: {
    transform: [{ perspective: 900 }, { rotateX: '2deg' }, { rotateY: '-4deg' }],
  },
  spreadWrap: {
    padding: 4,
    borderRadius: 12,
    position: 'relative',
    boxShadow: '0 18px 34px rgba(23,22,20,0.18)',
    transform: [{ perspective: 900 }, { rotateX: '3deg' }],
  },
  recipePage: {
    position: 'absolute',
    top: 4,
    backgroundColor: Colors.book.page,
    paddingHorizontal: 13,
    paddingVertical: 12,
    overflow: 'hidden',
  },
  leftRecipePage: {
    left: 4,
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  rightRecipePage: {
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  spreadGutter: {
    position: 'absolute',
    top: 4,
    width: 16,
  },
  sampleBookName: {
    color: Colors.textTertiary,
    fontFamily: Fonts.ui.semibold,
    fontSize: 6,
    lineHeight: 8,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  sampleRule: {
    width: 28,
    height: 2,
    marginTop: 7,
    marginBottom: 8,
  },
  sampleRecipeTitle: {
    color: Colors.text,
    fontFamily: Fonts.display.bold,
    fontSize: 15,
    lineHeight: 17,
  },
  sampleMeta: {
    color: Colors.textTertiary,
    fontFamily: Fonts.ui.semibold,
    fontSize: 5,
    lineHeight: 7,
    letterSpacing: 0.5,
    marginTop: 4,
    marginBottom: 10,
  },
  sampleSection: {
    color: Colors.text,
    fontFamily: Fonts.ui.bold,
    fontSize: 6,
    lineHeight: 9,
    letterSpacing: 0.7,
    marginBottom: 5,
  },
  sampleLineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  sampleDot: {
    width: 3,
    height: 3,
    borderRadius: Radii.full,
  },
  sampleLine: {
    color: Colors.textSecondary,
    fontFamily: Fonts.ui.regular,
    fontSize: 6,
    lineHeight: 8,
  },
  sampleArtwork: {
    width: '100%',
    height: '48%',
    borderRadius: 5,
    marginBottom: 9,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editorialPlate: {
    width: 64,
    height: 64,
    borderRadius: Radii.full,
    backgroundColor: '#f5ead7',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 8px 18px rgba(23,22,20,0.22)',
  },
  editorialPasta: {
    width: 38,
    height: 38,
    borderRadius: Radii.full,
    borderWidth: 5,
    borderColor: '#e8aa42',
    borderStyle: 'dashed',
  },
  editorialCaption: {
    position: 'absolute',
    bottom: 6,
    color: Colors.white,
    fontFamily: Fonts.ui.semibold,
    fontSize: 5,
    letterSpacing: 0.5,
  },
  heritageArtwork: {
    borderWidth: 1,
    backgroundColor: '#f3eee4',
  },
  heritageRule: {
    width: 34,
    height: 1,
    marginTop: 5,
    marginBottom: 4,
  },
  heritageCaption: {
    fontFamily: Fonts.display.bold,
    fontSize: 6,
    letterSpacing: 0.4,
  },
  illustratedArtwork: {
    backgroundColor: '#eef0e8',
  },
  illustrationSun: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: Radii.full,
  },
  illustrationSparkle: {
    position: 'absolute',
    top: 16,
    right: 26,
  },
  sampleMethod: {
    color: Colors.textSecondary,
    fontFamily: Fonts.ui.regular,
    fontSize: 6,
    lineHeight: 9,
    marginBottom: 5,
  },
  selectionSummary: {
    color: Colors.textTertiary,
    fontFamily: Fonts.ui.medium,
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
  },
  compactSummary: {
    color: Colors.textTertiary,
    fontFamily: Fonts.ui.medium,
    fontSize: 10,
    lineHeight: 15,
    textAlign: 'right',
    flexShrink: 1,
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
  sectionHeadingRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
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
  coverChipCompact: {
    width: 150,
    flexShrink: 0,
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
  coverChipCopy: {
    flex: 1,
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
  pageLookGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  pageLookRows: {
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  pageLookCard: {
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
  pageLookCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 72,
    flex: 0,
    paddingRight: 40,
  },
  pageLookIcon: {
    width: 38,
    height: 38,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceMuted,
  },
  pageLookIconSelected: {
    backgroundColor: Colors.text,
  },
  pageLookCopy: {
    flex: 1,
    gap: 2,
  },
  pageLookChip: {
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceElevated,
  },
  pageLookChipSelected: {
    backgroundColor: Colors.text,
    borderColor: Colors.text,
  },
  pageLookChipText: {
    color: Colors.text,
    fontFamily: Fonts.ui.medium,
    fontSize: 12,
  },
  pageLookChipTextSelected: {
    color: Colors.onPrimary,
  },
  finishWrap: {
    gap: Spacing.sm,
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
  readyButton: {
    backgroundColor: Colors.success,
  },
  finishText: {
    color: Colors.onPrimary,
    fontFamily: Fonts.ui.semibold,
    fontSize: 14,
  },
  prototypeNotice: {
    color: Colors.textTertiary,
    fontFamily: Fonts.ui.regular,
    fontSize: 10,
    lineHeight: 15,
    textAlign: 'center',
  },
  trayHero: {
    gap: Spacing.md,
  },
  trayHeadingRow: {
    paddingHorizontal: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  trayTitle: {
    color: Colors.text,
    fontFamily: Fonts.display.bold,
    fontSize: 27,
    lineHeight: 34,
    marginTop: 2,
  },
  roundFaceButton: {
    width: 44,
    height: 44,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tapHint: {
    color: Colors.textTertiary,
    fontFamily: Fonts.ui.regular,
    fontSize: 10,
    lineHeight: 15,
    textAlign: 'center',
    marginTop: -4,
  },
  customizationTray: {
    marginTop: Spacing.sm,
    backgroundColor: Colors.surfaceElevated,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: Colors.borderLight,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xl,
    gap: Spacing.md,
    boxShadow: '0 -12px 36px rgba(23,22,20,0.08)',
  },
  trayHandle: {
    width: 38,
    height: 4,
    borderRadius: Radii.full,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: Spacing.xs,
  },
  traySectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  trayInput: {
    minHeight: 48,
    paddingHorizontal: 0,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderStrong,
    color: Colors.text,
    fontFamily: Fonts.display.bold,
    fontSize: 22,
  },
  trayLabel: {
    color: Colors.textSecondary,
    fontFamily: Fonts.ui.semibold,
    fontSize: 11,
    lineHeight: 16,
    marginTop: Spacing.xs,
  },
  trayOptionsRow: {
    gap: Spacing.sm,
    paddingRight: Spacing.xl,
  },
  guidedPreview: {
    marginTop: Spacing.xs,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xs,
  },
  progressItem: {
    alignItems: 'center',
    gap: 4,
  },
  progressRule: {
    width: 46,
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.sm,
    marginBottom: 18,
  },
  progressNumber: {
    width: 26,
    height: 26,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    backgroundColor: Colors.background,
  },
  progressNumberSelected: {
    backgroundColor: Colors.text,
    borderColor: Colors.text,
  },
  progressNumberText: {
    color: Colors.textSecondary,
    fontFamily: Fonts.ui.semibold,
    fontSize: 10,
  },
  progressNumberTextSelected: {
    color: Colors.onPrimary,
  },
  progressLabel: {
    color: Colors.textTertiary,
    fontFamily: Fonts.ui.medium,
    fontSize: 9,
  },
  progressLabelSelected: {
    color: Colors.text,
  },
  guidedCard: {
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceElevated,
    padding: Spacing.xl,
    gap: Spacing.sm,
    boxShadow: Colors.book.cardShadow,
  },
  guidedStepCount: {
    color: Colors.textTertiary,
    fontFamily: Fonts.ui.semibold,
    fontSize: 9,
    letterSpacing: 1.2,
  },
  guidedQuestion: {
    color: Colors.text,
    fontFamily: Fonts.display.bold,
    fontSize: 24,
    lineHeight: 30,
  },
  guidedHelp: {
    color: Colors.textSecondary,
    fontFamily: Fonts.ui.regular,
    fontSize: 12,
    lineHeight: 19,
  },
  guidedInput: {
    minHeight: 54,
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    color: Colors.text,
    backgroundColor: Colors.background,
    fontFamily: Fonts.ui.medium,
    fontSize: 15,
  },
  guidedCoverGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  guidedActions: {
    marginTop: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  guidedBack: {
    minHeight: 48,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  guidedBackText: {
    color: Colors.text,
    fontFamily: Fonts.ui.medium,
    fontSize: 13,
  },
  guidedNext: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: Radii.full,
    paddingHorizontal: Spacing.xl,
    marginLeft: 'auto',
  },
  guidedNextText: {
    color: Colors.onPrimary,
    fontFamily: Fonts.ui.semibold,
    fontSize: 13,
  },
  switcherWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 100,
  },
  switcher: {
    minWidth: 268,
    height: 58,
    borderRadius: Radii.full,
    backgroundColor: Colors.charcoal,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
    boxShadow: '0 14px 30px rgba(0,0,0,0.28)',
  },
  switcherArrow: {
    width: 46,
    height: 46,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switcherLabel: {
    alignItems: 'center',
    gap: 1,
  },
  switcherEyebrow: {
    color: Colors.textTertiary,
    fontFamily: Fonts.ui.semibold,
    fontSize: 7,
    letterSpacing: 1.1,
  },
  switcherText: {
    color: Colors.onPrimary,
    fontFamily: Fonts.ui.semibold,
    fontSize: 12,
  },
});
