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
import { LinearGradient } from 'expo-linear-gradient';
import { Check, ChevronLeft } from 'lucide-react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { OpenBookInspector } from '@/components/create/OpenBookInspector';
import { PhysicalBook, resolveSpineWidth } from '@/components/physical-book/PhysicalBook';
import { SpineFace } from '@/components/physical-book/SpineFace';
import { ShelfBoard } from '@/components/shelf/ShelfBoard';
import { ShelfCarousel } from '@/components/shelf/ShelfCarousel';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { getCookbookBindingForStyle, type BindingMaterial } from '@/constants/cookbookBindings';
import { listCookbookCreationStyles } from '@/constants/cookbookStyles';
import type { CookbookStylePreset } from '@/constants/cookbookStyles';
import { DEFAULT_RECIPE_TEMPLATE_ID, listRecipeTemplates } from '@/constants/recipeTemplates';
import { Radii, Spacing } from '@/constants/spacing';
import { Fonts } from '@/utils/fonts';
import type { CookbookStyleId, RecipeTemplateId } from '@/types/cookbook';

/**
 * The 3D Cover Creation Studio. Browse: binding presets stand spine-out on
 * the shelf (the same packed-shelf physics as the library). Inspect: the
 * centered volume cracks open into a spread on the wooden table — bookplate
 * on the left, binding details on the right — with a live title input and
 * the "Use This Binding" CTA.
 */

const BOARD_HEIGHT = 18;
const BOARD_BOTTOM = 10;
const BOARD_CLEARANCE = BOARD_BOTTOM + BOARD_HEIGHT;

interface CreationStudioProps {
  canCreate: boolean;
  onCreateBook: (title: string, styleId: CookbookStyleId, pageTemplateId: RecipeTemplateId) => Promise<void>;
  onSignIn: () => void;
  bottomInset?: number;
}

export function CreationStudio({ canCreate, onCreateBook, onSignIn, bottomInset = 0 }: CreationStudioProps) {
  const { width } = useWindowDimensions();
  const presets = listCookbookCreationStyles();
  const pageTemplates = listRecipeTemplates();
  const [mode, setMode] = useState<'browse' | 'inspect'>('browse');
  const [activeIndex, setActiveIndex] = useState(0);
  const [inspected, setInspected] = useState<CookbookStyleId | null>(null);
  const [pageTemplateId, setPageTemplateId] = useState<RecipeTemplateId>(DEFAULT_RECIPE_TEMPLATE_ID);
  const [title, setTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activePreset = presets[Math.min(activeIndex, presets.length - 1)];
  const inspectedPreset = inspected ? presets.find((preset) => preset.id === inspected) : undefined;

  function inspectStyle(styleId: CookbookStyleId) {
    setInspected(styleId);
    setMode('inspect');
    setError(null);
  }

  function backToBrowse() {
    setMode('browse');
    setInspected(null);
    setError(null);
  }

  async function handleCreate() {
    const trimmed = title.trim();
    if (!trimmed || submitting || !inspected || !canCreate) return;
    setSubmitting(true);
    setError(null);
    try {
      await onCreateBook(trimmed, inspected, pageTemplateId);
    } catch (err) {
      setError(getErrorMessage(err));
      setSubmitting(false);
    }
  }

  const ctaDisabled = canCreate ? !title.trim() || submitting : false;

  return (
    <View style={styles.container}>
      {mode === 'browse' ? (
        <Animated.View key="browse" entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)} style={styles.mode}>
          <View style={styles.heading}>
            <Text style={styles.title}>Choose a binding</Text>
            <Text style={styles.subtitle}>Swipe the shelf. Tap the centered volume to open it.</Text>
          </View>

          <View style={styles.stage}>
            <LinearGradient
              colors={['rgba(23,22,20,0)', 'rgba(23,22,20,0.07)']}
              style={[styles.wallShadow, { bottom: BOARD_CLEARANCE }]}
              pointerEvents="none"
            />
            <ShelfBoard bottom={BOARD_BOTTOM} height={BOARD_HEIGHT} />
            <ShelfCarousel
              items={presets}
              keyExtractor={(preset) => preset.id}
              onActiveIndexChange={setActiveIndex}
              onActivateItem={(preset) => inspectStyle(preset.id)}
              accessibilityLabelFor={(preset) => `Inspect ${preset.name} binding`}
              spineWidthFor={(_preset, width) => resolveSpineWidth(width, 12)}
              renderCover={(preset, width) => (
                <PhysicalBook title={preset.name} coverStyle={preset.id} width={width} showShadow={false} />
              )}
              renderSpine={(preset, spineWidth, height) => (
                <SpineFace
                  title={preset.name}
                  binding={getCookbookBindingForStyle(preset.id)}
                  width={spineWidth}
                  height={height}
                />
              )}
              boardClearance={BOARD_CLEARANCE}
            />
          </View>

          <View style={styles.browseMeta}>
            <Text style={styles.metaTitle}>{activePreset.name}</Text>
            <Text style={styles.metaSub}>{activePreset.tagline}</Text>
          </View>
        </Animated.View>
      ) : inspectedPreset ? (
        <Animated.View key="inspect" entering={FadeIn.duration(200)} style={styles.mode}>
          <KeyboardAvoidingView
            style={styles.mode}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <ScrollView
              style={styles.inspectScroll}
              contentContainerStyle={[styles.inspectContent, { paddingBottom: bottomInset + Spacing.xxl }]}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Pressable
                style={({ pressed }) => [styles.backRow, pressed && styles.pressed]}
                onPress={backToBrowse}
                accessibilityRole="button"
                accessibilityLabel="Choose a different binding"
              >
                <ChevronLeft size={18} color={Colors.text} strokeWidth={1.8} />
                <Text style={styles.backText}>All bindings</Text>
              </Pressable>

              <View style={styles.inspectorStage}>
                <ShelfBoard bottom={-6} height={BOARD_HEIGHT} />
                <OpenBookInspector
                  key={inspectedPreset.id}
                  preset={inspectedPreset}
                  title={title}
                  width={Math.min(width - 32, 380)}
                />
              </View>

              <BindingSpecSummary preset={inspectedPreset} />

              <Animated.View entering={FadeIn.delay(500).duration(400)} style={styles.pageStyleSection}>
                <Text style={styles.pageStyleLabel}>Page style</Text>
                <Text style={styles.pageStyleHint}>How your recipes will look inside the book</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.pageStyleScroll}
                >
                  {pageTemplates.map((template) => {
                    const selected = pageTemplateId === template.id;
                    return (
                      <Pressable
                        key={template.id}
                        style={[styles.pageStyleCard, selected && styles.pageStyleCardSelected]}
                        onPress={() => setPageTemplateId(template.id)}
                        accessibilityRole="button"
                        accessibilityLabel={`Use ${template.name} page style`}
                        accessibilityState={{ selected }}
                      >
                        <View style={styles.pageStylePreviewFrame}>
                          <Image source={template.previewAsset} style={styles.pageStylePreview} resizeMode="cover" />
                          {selected ? (
                            <View style={styles.pageStyleCheck} pointerEvents="none">
                              <Check size={12} color={Colors.onPrimary} strokeWidth={2.5} />
                            </View>
                          ) : null}
                        </View>
                        <Text style={styles.pageStyleName} numberOfLines={1}>
                          {template.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </Animated.View>

              <Animated.View entering={FadeIn.delay(700).duration(400)} style={styles.form}>
                <Text style={styles.label}>Name your cookbook</Text>
                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  placeholder="e.g. Nonna's Kitchen"
                  placeholderTextColor={Colors.textMuted}
                  style={styles.input}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={() => {
                    void handleCreate();
                  }}
                  editable={!submitting}
                  maxLength={48}
                />

                {error ? (
                  <Text style={styles.error} selectable>
                    {error}
                  </Text>
                ) : null}
                {!canCreate ? (
                  <Text style={styles.note}>Sign in to add cookbooks to your shelf.</Text>
                ) : null}

                <Pressable
                  style={[styles.cta, ctaDisabled && styles.ctaDisabled]}
                  onPress={canCreate ? () => void handleCreate() : onSignIn}
                  disabled={ctaDisabled}
                  accessibilityRole="button"
                  accessibilityLabel={canCreate ? 'Use this binding and create the cookbook' : 'Go to sign in'}
                >
                  {submitting ? (
                    <ActivityIndicator color={Colors.onPrimary} />
                  ) : (
                    <Text style={styles.ctaText}>{canCreate ? 'Use This Binding' : 'Sign in to save'}</Text>
                  )}
                </Pressable>
              </Animated.View>
            </ScrollView>
          </KeyboardAvoidingView>
        </Animated.View>
      ) : null}
    </View>
  );
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return 'Could not create cookbook.';
}

function materialLabel(material: BindingMaterial): string {
  if (material === 'linen') return 'Woven linen';
  if (material === 'leather') return 'Full-grain leather';
  return 'Book cloth';
}

function foilLabel(foil: readonly [string, string, string]): string {
  if (foil[1] === '#d4af37') return 'Gold foil';
  if (foil[1] === '#b87348') return 'Copper foil';
  return 'Silver foil';
}

/**
 * Binding spec summary in the inspector panel. Swatch dots, a one-line
 * spec ("Woven linen · Gold foil · Raised hubs"), and the tagline —
 * staggered to cascade in alongside the book's opening animation.
 * Future "Edit cover" / sticker controls drop into this panel without
 * touching the book rendering.
 */
function BindingSpecSummary({ preset }: { preset: CookbookStylePreset }) {
  const binding = getCookbookBindingForStyle(preset.id);
  const specLine = `${materialLabel(binding.material)} · ${foilLabel(binding.foil)} · Raised hubs`;

  return (
    <Animated.View entering={FadeIn.delay(300).duration(400)} style={styles.specSummary}>
      <Text style={styles.specName}>{binding.name}</Text>
      <View style={styles.swatches}>
        {[binding.cloth, binding.foil[1], binding.band].map((color) => (
          <View key={color} style={[styles.swatch, { backgroundColor: color }]} />
        ))}
      </View>
      <Text style={styles.specLine}>{specLine}</Text>
      <Text style={styles.specTagline}>{binding.tagline}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mode: {
    flex: 1,
  },
  heading: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.xs,
  },
  title: {
    color: Colors.text,
    fontFamily: Fonts.display.bold,
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: 0,
  },
  subtitle: {
    color: Colors.slate,
    fontSize: 14,
    lineHeight: 24,
    fontFamily: Fonts.ui.regular,
  },
  stage: {
    flex: 1,
    overflow: 'visible',
  },
  wallShadow: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 26,
  },
  browseMeta: {
    minHeight: 84,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingHorizontal: Spacing.xl,
  },
  metaTitle: {
    color: Colors.text,
    fontFamily: Fonts.display.semibold,
    fontSize: 18,
    lineHeight: 24,
    textAlign: 'center',
  },
  metaSub: {
    color: Colors.textMuted,
    fontFamily: Fonts.ui.regular,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  inspectScroll: {
    flex: 1,
  },
  inspectContent: {
    gap: Spacing.lg,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    alignSelf: 'flex-start',
    minHeight: 44,
    paddingHorizontal: Spacing.lg,
  },
  backText: {
    color: Colors.text,
    fontFamily: Fonts.ui.medium,
    fontSize: 14,
  },
  pressed: {
    opacity: 0.6,
  },
  inspectorStage: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 26,
    minHeight: 280,
    overflow: 'visible',
  },
  form: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  specSummary: {
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.xl,
  },
  pageStyleSection: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.xs,
  },
  pageStyleLabel: {
    color: Colors.text,
    fontFamily: Fonts.ui.medium,
    fontSize: 14,
  },
  pageStyleHint: {
    color: Colors.textMuted,
    fontFamily: Fonts.ui.regular,
    fontSize: 12,
    lineHeight: 17,
  },
  pageStyleScroll: {
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  pageStyleCard: {
    width: 84,
    gap: 6,
    alignItems: 'center',
  },
  pageStylePreviewFrame: {
    position: 'relative',
    width: 84,
    height: 112,
    borderRadius: Radii.md,
    borderWidth: 2,
    borderColor: Colors.ash,
    overflow: 'hidden',
    backgroundColor: Colors.book.page,
  },
  pageStyleCardSelected: {
    borderColor: Colors.charcoal,
  },
  pageStylePreview: {
    width: '100%',
    height: '100%',
  },
  pageStyleCheck: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  pageStyleName: {
    color: Colors.text,
    fontSize: 11,
    lineHeight: 15,
    fontFamily: Fonts.ui.medium,
    textAlign: 'center',
  },
  specName: {
    color: Colors.text,
    fontFamily: Fonts.display.semibold,
    fontSize: 20,
    lineHeight: 26,
    textAlign: 'center',
  },
  swatches: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 2,
  },
  swatch: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: Colors.ash,
  },
  specLine: {
    color: Colors.textSecondary,
    fontFamily: Fonts.ui.regular,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  specTagline: {
    color: Colors.textMuted,
    fontFamily: Fonts.ui.regular,
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  label: {
    color: Colors.text,
    fontFamily: Fonts.ui.medium,
    fontSize: 14,
  },
  input: {
    minHeight: 48,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.ash,
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md,
    fontSize: 15,
    color: Colors.text,
    fontFamily: Fonts.ui.regular,
  },
  cta: {
    minHeight: 50,
    borderRadius: Radii.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: Colors.book.cardShadow,
  },
  ctaDisabled: {
    opacity: 0.5,
  },
  ctaText: {
    color: Colors.onPrimary,
    fontFamily: Fonts.ui.medium,
    fontSize: 16,
    letterSpacing: 0.2,
  },
  error: {
    color: Colors.error,
    backgroundColor: Colors.errorLight,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.error,
    padding: Spacing.sm,
    fontSize: 13,
    lineHeight: 18,
  },
  note: {
    color: Colors.textSecondary,
    backgroundColor: Colors.parchment,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.ash,
    padding: Spacing.sm,
    fontSize: 13,
    lineHeight: 18,
  },
});
