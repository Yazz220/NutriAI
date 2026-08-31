import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Minus, Plus } from 'lucide-react-native';
import { Sheet } from '@/components/ui/Sheet';
import { Text } from '@/components/ui/Text';
import { PageCreationDisclosure } from '@/components/subscription/PageCreationDisclosure';
import { useSubscriptionUi } from '@/components/subscription/SubscriptionHost';
import { isDesignedPageLimitReachedError } from '@/components/subscription/subscriptionErrors';
import { Colors } from '@/constants/colors';
import { useNoshSubscription } from '@/contexts/NoshSubscriptionContext';
import { Radii, Spacing , Typography} from '@/constants/spacing';
import type { CookbookPage, GeneratedRecipePage } from '@/types/cookbook';
import type { RecipeGraph } from '@/types/recipeGraph';
import { createGenerationRequestKey } from '@/utils/cookbook/generationAttempt';
import { Fonts } from '@/utils/fonts';

export type RecipeRevisionMode = 'edit' | 'design';

interface RecipeRevisionSheetProps {
  visible: boolean;
  mode: RecipeRevisionMode;
  page: CookbookPage | null;
  onClose: () => void;
  onGenerate: (
    page: CookbookPage,
    recipeGraph: RecipeGraph,
    instruction: string | undefined,
    idempotencyKey: string,
  ) => Promise<GeneratedRecipePage>;
  onUse: (
    page: CookbookPage,
    candidate: GeneratedRecipePage,
    recipeGraph?: RecipeGraph,
  ) => Promise<void>;
}

export function RecipeRevisionSheet({
  visible,
  mode,
  page,
  onClose,
  onGenerate,
  onUse,
}: RecipeRevisionSheetProps) {
  const { requestPageAccess } = useSubscriptionUi();
  const { refresh: refreshSubscription } = useNoshSubscription();
  const [draft, setDraft] = useState<RecipeGraph | null>(null);
  const [servings, setServings] = useState('');
  const [prepTime, setPrepTime] = useState('');
  const [cookTime, setCookTime] = useState('');
  const [instruction, setInstruction] = useState('');
  const [candidate, setCandidate] = useState<GeneratedRecipePage | null>(null);
  const [busy, setBusy] = useState<'generate' | 'use' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const requestKey = useRef(createGenerationRequestKey());

  useEffect(() => {
    if (!visible || !page?.recipeGraph) return;
    const graph = cloneGraph(page.recipeGraph);
    setDraft(graph);
    setServings(graph.servings ? String(graph.servings) : '');
    setPrepTime(graph.prepTimeMinutes ? String(graph.prepTimeMinutes) : '');
    setCookTime(graph.cookTimeMinutes ? String(graph.cookTimeMinutes) : '');
    setInstruction('');
    setCandidate(null);
    setBusy(null);
    setError(null);
    requestKey.current = createGenerationRequestKey();
  }, [mode, page, visible]);

  if (!page || !draft) return null;

  const activePage = page;
  const activeDraft = draft;
  const close = busy ? () => undefined : onClose;

  function edit(mutator: (next: RecipeGraph) => void) {
    setDraft((current) => {
      if (!current) return current;
      const next = cloneGraph(current);
      mutator(next);
      return next;
    });
    setCandidate(null);
    setError(null);
    requestKey.current = createGenerationRequestKey();
  }

  function preparedGraph(): RecipeGraph {
    const next = cloneGraph(activeDraft);
    next.title = next.title.trim();
    next.description = next.description?.trim() || undefined;
    const parsedServings = parseOptionalPositiveNumber(servings, 'Servings');
    if (parsedServings) {
      next.servings = parsedServings;
      next.yieldText = `${parsedServings} servings`;
    } else {
      delete next.servings;
      if (activeDraft.servings) delete next.yieldText;
    }
    next.prepTimeMinutes = parseOptionalMinutes(prepTime, 'Prep time');
    next.cookTimeMinutes = parseOptionalMinutes(cookTime, 'Cook time');
    next.updatedAt = new Date().toISOString();

    if (!next.title) throw new Error('Add a recipe title.');
    if (!next.ingredientGroups.some((group) => group.ingredients.some((item) => item.name.trim()))) {
      throw new Error('Add at least one ingredient.');
    }
    if (!next.stepGroups.some((group) => group.steps.some((step) => step.text.trim()))) {
      throw new Error('Add at least one direction.');
    }
    next.ingredientGroups = next.ingredientGroups.map((group) => ({
      ...group,
      ingredients: group.ingredients
        .map((item) => ({ ...item, name: item.name.trim() }))
        .filter((item) => item.name),
    }));
    next.stepGroups = next.stepGroups.map((group) => ({
      ...group,
      steps: group.steps
        .map((step) => ({ ...step, text: step.text.trim() }))
        .filter((step) => step.text),
    }));
    return next;
  }

  async function generate() {
    const accessReason = mode === 'edit' ? 'recipe_revision' : 'page_redesign';
    if (!await requestPageAccess(accessReason)) return;
    setBusy('generate');
    setError(null);
    try {
      const graph = mode === 'edit' ? preparedGraph() : cloneGraph(activeDraft);
      const artDirection = mode === 'design' ? instruction.trim() || undefined : undefined;
      setDraft(graph);
      try {
        setCandidate(await onGenerate(activePage, graph, artDirection, requestKey.current));
      } catch (generationError) {
        requestKey.current = createGenerationRequestKey();
        if (!isDesignedPageLimitReachedError(generationError)) {
          setError(generationError instanceof Error ? generationError.message : 'Could not create the preview.');
          return;
        }

        const canRetry = await requestPageAccess(accessReason, { refresh: true });
        if (!canRetry) return;

        try {
          setCandidate(await onGenerate(activePage, graph, artDirection, requestKey.current));
        } catch (retryError) {
          requestKey.current = createGenerationRequestKey();
          setError(isDesignedPageLimitReachedError(retryError)
            ? 'Page creation is still unavailable. Your edits are still here.'
            : retryError instanceof Error ? retryError.message : 'Could not create the preview.');
        }
      }
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : 'Could not create the preview.');
    } finally {
      void refreshSubscription();
      setBusy(null);
    }
  }

  async function applyCandidate() {
    if (!candidate) return;
    setBusy('use');
    setError(null);
    try {
      await onUse(activePage, candidate, mode === 'edit' ? activeDraft : undefined);
      onClose();
    } catch (useError) {
      setError(useError instanceof Error ? useError.message : 'Could not update this page.');
      setBusy(null);
    }
  }

  return (
    <Sheet
      visible={visible}
      onClose={close}
      keyboardAvoiding={mode === 'edit'}
      maxHeight="92%"
      closeAccessibilityLabel="Close recipe update"
      header={
        <View style={styles.headerCopy}>
          <Text style={styles.title}>{candidate ? 'Preview' : mode === 'edit' ? 'Edit recipe' : 'Try another design'}</Text>
        </View>
      }
    >
      {candidate ? (
        <Preview
          candidate={candidate}
          busy={busy}
          error={error}
          onUse={() => void applyCandidate()}
          onKeep={onClose}
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {mode === 'edit' ? (
            <RecipeFields
              draft={draft}
              servings={servings}
              prepTime={prepTime}
              cookTime={cookTime}
              onServingsChange={(value) => { setServings(value); setCandidate(null); }}
              onPrepTimeChange={(value) => { setPrepTime(value); setCandidate(null); }}
              onCookTimeChange={(value) => { setCookTime(value); setCandidate(null); }}
              onEdit={edit}
            />
          ) : (
            <View style={styles.field}>
              <Text style={styles.label}>What should change? <Text style={styles.optional}>Optional</Text></Text>
              <TextInput
                value={instruction}
                onChangeText={setInstruction}
                placeholder="For example, less illustration"
                placeholderTextColor={Colors.textTertiary}
                style={[styles.input, styles.directionInput]}
                multiline
                maxLength={600}
                accessibilityLabel="Design direction"
              />
            </View>
          )}
          {error ? <Text style={styles.error} accessibilityLiveRegion="polite">{error}</Text> : null}
          <PageCreationDisclosure>
            Creating this preview uses one page creation
          </PageCreationDisclosure>
          <Pressable
            style={({ pressed }) => [styles.primaryButton, pressed && !busy && styles.pressed]}
            disabled={Boolean(busy)}
            onPress={() => void generate()}
            accessibilityRole="button"
            accessibilityLabel="Create page preview"
            accessibilityState={{ disabled: Boolean(busy), busy: busy === 'generate' }}
          >
            {busy === 'generate' ? <ActivityIndicator size="small" color={Colors.onPrimary} /> : null}
            <Text style={styles.primaryText}>{busy === 'generate' ? 'Creating preview' : 'Create preview'}</Text>
          </Pressable>
        </ScrollView>
      )}
    </Sheet>
  );
}

function RecipeFields({
  draft,
  servings,
  prepTime,
  cookTime,
  onServingsChange,
  onPrepTimeChange,
  onCookTimeChange,
  onEdit,
}: {
  draft: RecipeGraph;
  servings: string;
  prepTime: string;
  cookTime: string;
  onServingsChange: (value: string) => void;
  onPrepTimeChange: (value: string) => void;
  onCookTimeChange: (value: string) => void;
  onEdit: (mutator: (next: RecipeGraph) => void) => void;
}) {
  return (
    <>
      <LabeledInput
        label="Title"
        value={draft.title}
        onChangeText={(value) => onEdit((next) => { next.title = value; })}
      />
      <LabeledInput
        label="Description"
        value={draft.description ?? ''}
        onChangeText={(value) => onEdit((next) => { next.description = value; })}
        multiline
      />
      <View style={styles.timeRow}>
        <CompactNumber label="Servings" value={servings} onChangeText={onServingsChange} />
        <CompactNumber label="Prep min" value={prepTime} onChangeText={onPrepTimeChange} />
        <CompactNumber label="Cook min" value={cookTime} onChangeText={onCookTimeChange} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ingredients</Text>
        {draft.ingredientGroups.map((group, groupIndex) => (
          <View key={group.id} style={styles.group}>
            {group.label ? <Text style={styles.groupLabel}>{group.label}</Text> : null}
            {group.ingredients.map((ingredient, ingredientIndex) => (
              <View key={`${group.id}-${ingredientIndex}`} style={styles.ingredientRow}>
                <TextInput
                  value={ingredient.quantity ?? ''}
                  onChangeText={(value) => onEdit((next) => {
                    next.ingredientGroups[groupIndex].ingredients[ingredientIndex].quantity = value || undefined;
                  })}
                  placeholder="Qty"
                  placeholderTextColor={Colors.textTertiary}
                  style={[styles.input, styles.quantityInput]}
                  accessibilityLabel={`Ingredient ${ingredientIndex + 1} quantity`}
                />
                <TextInput
                  value={ingredient.unit ?? ''}
                  onChangeText={(value) => onEdit((next) => {
                    next.ingredientGroups[groupIndex].ingredients[ingredientIndex].unit = value || undefined;
                  })}
                  placeholder="Unit"
                  placeholderTextColor={Colors.textTertiary}
                  style={[styles.input, styles.unitInput]}
                  accessibilityLabel={`Ingredient ${ingredientIndex + 1} unit`}
                />
                <TextInput
                  value={ingredient.name}
                  onChangeText={(value) => onEdit((next) => {
                    next.ingredientGroups[groupIndex].ingredients[ingredientIndex].name = value;
                  })}
                  placeholder="Ingredient"
                  placeholderTextColor={Colors.textTertiary}
                  style={[styles.input, styles.nameInput]}
                  accessibilityLabel={`Ingredient ${ingredientIndex + 1} name`}
                />
                <IconButton
                  label={`Remove ingredient ${ingredientIndex + 1}`}
                  icon="minus"
                  onPress={() => onEdit((next) => {
                    next.ingredientGroups[groupIndex].ingredients.splice(ingredientIndex, 1);
                  })}
                />
              </View>
            ))}
          </View>
        ))}
        <SmallAction
          label="Add ingredient"
          onPress={() => onEdit((next) => {
            if (next.ingredientGroups.length === 0) {
              next.ingredientGroups.push({ id: 'default', ingredients: [] });
            }
            next.ingredientGroups.at(-1)?.ingredients.push({ name: '' });
          })}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Directions</Text>
        {draft.stepGroups.map((group, groupIndex) => (
          <View key={group.id} style={styles.group}>
            {group.label ? <Text style={styles.groupLabel}>{group.label}</Text> : null}
            {group.steps.map((step, stepIndex) => (
              <View key={step.id} style={styles.stepRow}>
                <Text style={styles.stepNumber}>{stepIndex + 1}</Text>
                <TextInput
                  value={step.text}
                  onChangeText={(value) => onEdit((next) => {
                    next.stepGroups[groupIndex].steps[stepIndex].text = value;
                  })}
                  placeholder="Direction"
                  placeholderTextColor={Colors.textTertiary}
                  style={[styles.input, styles.stepInput]}
                  multiline
                  accessibilityLabel={`Direction ${stepIndex + 1}`}
                />
                <IconButton
                  label={`Remove direction ${stepIndex + 1}`}
                  icon="minus"
                  onPress={() => onEdit((next) => {
                    next.stepGroups[groupIndex].steps.splice(stepIndex, 1);
                  })}
                />
              </View>
            ))}
          </View>
        ))}
        <SmallAction
          label="Add direction"
          onPress={() => onEdit((next) => {
            if (next.stepGroups.length === 0) next.stepGroups.push({ id: 'default', steps: [] });
            next.stepGroups.at(-1)?.steps.push({ id: createGenerationRequestKey(), text: '' });
          })}
        />
      </View>
    </>
  );
}

function Preview({
  candidate,
  busy,
  error,
  onUse,
  onKeep,
}: {
  candidate: GeneratedRecipePage;
  busy: 'generate' | 'use' | null;
  error: string | null;
  onUse: () => void;
  onKeep: () => void;
}) {
  return (
    <View style={styles.previewWrap}>
      {candidate.imageUrl ? (
        <Image
          source={{ uri: candidate.imageUrl }}
          style={styles.previewImage}
          resizeMode="contain"
          accessibilityLabel="New recipe page preview"
        />
      ) : null}
      {error ? <Text style={styles.error} accessibilityLiveRegion="polite">{error}</Text> : null}
      <Pressable
        style={({ pressed }) => [styles.primaryButton, pressed && !busy && styles.pressed]}
        disabled={Boolean(busy)}
        onPress={onUse}
        accessibilityRole="button"
        accessibilityLabel="Use new page"
        accessibilityState={{ disabled: Boolean(busy), busy: busy === 'use' }}
      >
        {busy === 'use' ? <ActivityIndicator size="small" color={Colors.onPrimary} /> : null}
        <Text style={styles.primaryText}>{busy === 'use' ? 'Updating page' : 'Use new page'}</Text>
      </Pressable>
      <Pressable
        style={styles.secondaryButton}
        disabled={Boolean(busy)}
        onPress={onKeep}
        accessibilityRole="button"
        accessibilityLabel="Keep current page"
      >
        <Text style={styles.secondaryText}>Keep current</Text>
      </Pressable>
    </View>
  );
}

function LabeledInput({
  label,
  value,
  onChangeText,
  multiline = false,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  multiline?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        style={[styles.input, multiline && styles.multilineInput]}
        multiline={multiline}
        accessibilityLabel={label}
      />
    </View>
  );
}

function CompactNumber({ label, value, onChangeText }: { label: string; value: string; onChangeText: (value: string) => void }) {
  return (
    <View style={[styles.field, styles.numberField]}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType="number-pad"
        style={styles.input}
        accessibilityLabel={label}
      />
    </View>
  );
}

function SmallAction({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.smallAction} onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
      <Plus size={15} color={Colors.textSecondary} />
      <Text style={styles.smallActionText}>{label}</Text>
    </Pressable>
  );
}

function IconButton({ label, icon, onPress }: { label: string; icon: 'minus'; onPress: () => void }) {
  return (
    <Pressable style={styles.iconButton} onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
      {icon === 'minus' ? <Minus size={15} color={Colors.textTertiary} /> : null}
    </Pressable>
  );
}

function parseOptionalPositiveNumber(value: string, label: string): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) throw new Error(`${label} must be between 1 and 100.`);
  return parsed;
}

function parseOptionalMinutes(value: string, label: string): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 1440) throw new Error(`${label} must be a valid number of minutes.`);
  return parsed;
}

function cloneGraph(graph: RecipeGraph): RecipeGraph {
  return JSON.parse(JSON.stringify(graph)) as RecipeGraph;
}

const styles = StyleSheet.create({
  headerCopy: { flex: 1, gap: Spacing.values[2] },
  eyebrow: { color: Colors.textTertiary, fontFamily: Fonts.ui.semibold, fontSize: Typography.sizes.md, lineHeight: Typography.metrics.lineHeight13 },
  title: { color: Colors.text, fontFamily: Fonts.display.bold, fontSize: Typography.sizes.xxlMd, lineHeight: Typography.metrics.lineHeight29 },
  scrollContent: { gap: Spacing.lg, paddingBottom: Spacing.sm },
  field: { gap: Spacing.values[6] },
  label: { color: Colors.text, fontFamily: Fonts.ui.medium, fontSize: Typography.sizes.md, lineHeight: Typography.metrics.lineHeight17 },
  optional: { color: Colors.textTertiary, fontFamily: Fonts.ui.regular },
  input: {
    minHeight: 46,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceElevated,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.values[10],
    color: Colors.text,
    fontFamily: Fonts.ui.regular,
    fontSize: Typography.sizes.md,
  },
  multilineInput: { minHeight: 76, textAlignVertical: 'top' },
  directionInput: { minHeight: 88, textAlignVertical: 'top' },
  timeRow: { flexDirection: 'row', gap: Spacing.sm },
  numberField: { flex: 1 },
  section: { gap: Spacing.sm, paddingTop: Spacing.xs },
  sectionTitle: { color: Colors.text, fontFamily: Fonts.display.semibold, fontSize: Typography.sizes.lgMd, lineHeight: Typography.metrics.lineHeight22 },
  group: { gap: Spacing.xs },
  groupLabel: { color: Colors.textSecondary, fontFamily: Fonts.ui.semibold, fontSize: Typography.sizes.md, lineHeight: Typography.metrics.lineHeight16 },
  ingredientRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.values[6] },
  quantityInput: { width: 54 },
  unitInput: { width: 62 },
  nameInput: { flex: 1 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.xs },
  stepNumber: { width: 20, paddingTop: Spacing.values[13], color: Colors.textTertiary, fontFamily: Fonts.ui.semibold, fontSize: Typography.sizes.md, textAlign: 'center' },
  stepInput: { flex: 1, minHeight: 64, textAlignVertical: 'top' },
  iconButton: { width: 36, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: Radii.full },
  smallAction: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: Spacing.values[6], alignSelf: 'flex-start', paddingHorizontal: Spacing.xs },
  smallActionText: { color: Colors.textSecondary, fontFamily: Fonts.ui.medium, fontSize: Typography.sizes.md, },
  previewWrap: { gap: Spacing.md },
  previewImage: { width: '100%', height: 440, borderRadius: Radii.md, backgroundColor: Colors.surfaceMuted },
  previewNote: { color: Colors.textTertiary, fontFamily: Fonts.ui.regular, fontSize: Typography.sizes.md, textAlign: 'center' },
  primaryButton: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, borderRadius: Radii.full, backgroundColor: Colors.primary },
  primaryText: { color: Colors.onPrimary, fontFamily: Fonts.ui.semibold, fontSize: Typography.sizes.md, },
  secondaryButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { color: Colors.textSecondary, fontFamily: Fonts.ui.medium, fontSize: Typography.sizes.md, },
  error: { color: Colors.error, fontFamily: Fonts.ui.regular, fontSize: Typography.sizes.md, lineHeight: Typography.metrics.lineHeight18 },
  pressed: { opacity: 0.72 },
});
