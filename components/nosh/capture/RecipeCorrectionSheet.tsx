import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { AlertTriangle } from 'lucide-react-native';
import { Sheet } from '@/components/ui/Sheet';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Radii, Spacing, Typography } from '@/constants/spacing';
import type { RecipeGraphDraft } from '@/types/recipeGraph';
import { Fonts } from '@/utils/fonts';

interface RecipeCorrectionSheetProps {
  visible: boolean;
  recipeGraph: RecipeGraphDraft | null;
  saving: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (recipeGraph: RecipeGraphDraft) => Promise<void> | void;
}

export function RecipeCorrectionSheet({
  visible,
  recipeGraph,
  saving,
  error,
  onClose,
  onSubmit,
}: RecipeCorrectionSheetProps) {
  const [draft, setDraft] = useState<RecipeGraphDraft | null>(null);
  const [servings, setServings] = useState('');
  const [yieldText, setYieldText] = useState('');
  const [prepTime, setPrepTime] = useState('');
  const [cookTime, setCookTime] = useState('');
  const [totalTime, setTotalTime] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || !recipeGraph) return;
    const next = cloneGraph(recipeGraph);
    setDraft(next);
    setServings(next.servings ? String(next.servings) : '');
    setYieldText(next.yieldText ?? '');
    setPrepTime(next.prepTimeMinutes === undefined ? '' : String(next.prepTimeMinutes));
    setCookTime(next.cookTimeMinutes === undefined ? '' : String(next.cookTimeMinutes));
    setTotalTime(next.totalTimeMinutes === undefined ? '' : String(next.totalTimeMinutes));
    setLocalError(null);
  }, [recipeGraph, visible]);

  if (!draft) return null;
  const activeDraft = draft;

  const issues = recipeGraph?.provenance.qualityAssessment?.issues.filter((issue) => (
    issue.severity === 'blocking' && !issue.confirmed
  )) ?? [];

  function edit(mutator: (next: RecipeGraphDraft) => void) {
    setDraft((current) => {
      if (!current) return current;
      const next = cloneGraph(current);
      mutator(next);
      return next;
    });
    setLocalError(null);
  }

  async function submit() {
    try {
      setLocalError(null);
      const next = prepareGraph(activeDraft, { servings, yieldText, prepTime, cookTime, totalTime });
      setDraft(next);
      await onSubmit(next);
    } catch (reason) {
      setLocalError(reason instanceof Error ? reason.message : 'Check the recipe details and try again.');
    }
  }

  return (
    <Sheet
      visible={visible}
      onClose={saving ? () => undefined : onClose}
      keyboardAvoiding
      maxHeight="94%"
      closeAccessibilityLabel="Close recipe correction"
      header={<Text style={styles.title}>Check recipe details</Text>}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.issueList} accessibilityLiveRegion="polite">
          {issues.map((issue) => (
            <View key={issue.key} style={styles.issueRow}>
              <AlertTriangle size={17} color={Colors.error} />
              <Text style={styles.issueText}>{issue.message}</Text>
            </View>
          ))}
        </View>

        <LabeledInput
          label="Title"
          value={activeDraft.title}
          onChangeText={(value) => edit((next) => { next.title = value; })}
        />

        <View style={styles.twoColumnRow}>
          <LabeledInput
            label="Yield"
            value={yieldText}
            onChangeText={setYieldText}
            placeholder="For example, 1 loaf"
            style={styles.flexField}
          />
          <LabeledInput
            label="Servings"
            value={servings}
            onChangeText={setServings}
            keyboardType="number-pad"
            style={styles.compactField}
          />
        </View>

        <View style={styles.timeRow}>
          <LabeledInput label="Prep min" value={prepTime} onChangeText={setPrepTime} keyboardType="number-pad" style={styles.flexField} />
          <LabeledInput label="Cook min" value={cookTime} onChangeText={setCookTime} keyboardType="number-pad" style={styles.flexField} />
          <LabeledInput label="Total min" value={totalTime} onChangeText={setTotalTime} keyboardType="number-pad" style={styles.flexField} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ingredients</Text>
          {activeDraft.ingredientGroups.map((group, groupIndex) => (
            <View key={group.id} style={styles.group}>
              {group.label ? <Text style={styles.groupLabel}>{group.label}</Text> : null}
              {group.ingredients.map((ingredient, ingredientIndex) => (
                <View key={`${group.id}-${ingredientIndex}`} style={styles.ingredientRow}>
                  <TextInput
                    value={ingredient.quantity ?? ''}
                    onChangeText={(value) => edit((next) => {
                      next.ingredientGroups[groupIndex].ingredients[ingredientIndex].quantity = value || undefined;
                    })}
                    placeholder="Qty"
                    placeholderTextColor={Colors.textTertiary}
                    style={[styles.input, styles.quantityInput]}
                    accessibilityLabel={`${ingredient.name || `Ingredient ${ingredientIndex + 1}`} quantity`}
                  />
                  <TextInput
                    value={ingredient.unit ?? ''}
                    onChangeText={(value) => edit((next) => {
                      next.ingredientGroups[groupIndex].ingredients[ingredientIndex].unit = value || undefined;
                    })}
                    placeholder="Unit"
                    placeholderTextColor={Colors.textTertiary}
                    style={[styles.input, styles.unitInput]}
                    accessibilityLabel={`${ingredient.name || `Ingredient ${ingredientIndex + 1}`} unit`}
                  />
                  <TextInput
                    value={ingredient.name}
                    onChangeText={(value) => edit((next) => {
                      next.ingredientGroups[groupIndex].ingredients[ingredientIndex].name = value;
                    })}
                    placeholder="Ingredient"
                    placeholderTextColor={Colors.textTertiary}
                    style={[styles.input, styles.nameInput]}
                    accessibilityLabel={`Ingredient ${ingredientIndex + 1} name`}
                  />
                </View>
              ))}
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Directions</Text>
          {activeDraft.stepGroups.map((group, groupIndex) => (
            <View key={group.id} style={styles.group}>
              {group.label ? <Text style={styles.groupLabel}>{group.label}</Text> : null}
              {group.steps.map((step, stepIndex) => (
                <View key={step.id} style={styles.stepRow}>
                  <Text style={styles.stepNumber}>{stepIndex + 1}</Text>
                  <TextInput
                    value={step.text}
                    onChangeText={(value) => edit((next) => {
                      next.stepGroups[groupIndex].steps[stepIndex].text = value;
                    })}
                    placeholder="Direction"
                    placeholderTextColor={Colors.textTertiary}
                    style={[styles.input, styles.stepInput]}
                    multiline
                    accessibilityLabel={`Direction ${stepIndex + 1}`}
                  />
                </View>
              ))}
            </View>
          ))}
        </View>

        {localError || error ? (
          <Text style={styles.error} accessibilityRole="alert">{localError ?? error}</Text>
        ) : null}

        <Pressable
          style={({ pressed }) => [styles.primaryButton, pressed && !saving && styles.pressed]}
          disabled={saving}
          onPress={() => { void submit(); }}
          accessibilityRole="button"
          accessibilityLabel="Save corrected recipe"
          accessibilityState={{ disabled: saving, busy: saving }}
        >
          {saving ? <ActivityIndicator size="small" color={Colors.onPrimary} /> : null}
          <Text style={styles.primaryText}>{saving ? 'Checking recipe' : 'Save and continue'}</Text>
        </Pressable>
      </ScrollView>
    </Sheet>
  );
}

function LabeledInput({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  style,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'number-pad';
  style?: object;
}) {
  return (
    <View style={[styles.field, style]}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.textTertiary}
        keyboardType={keyboardType}
        style={styles.input}
        accessibilityLabel={label}
      />
    </View>
  );
}

function prepareGraph(
  draft: RecipeGraphDraft,
  values: { servings: string; yieldText: string; prepTime: string; cookTime: string; totalTime: string },
): RecipeGraphDraft {
  const next = cloneGraph(draft);
  next.title = next.title.trim();
  if (!next.title) throw new Error('Add a recipe title.');

  const servings = optionalInteger(values.servings, 'Servings', 1, 1000);
  if (servings === undefined) delete next.servings;
  else next.servings = servings;
  next.yieldText = values.yieldText.trim() || undefined;
  next.prepTimeMinutes = optionalInteger(values.prepTime, 'Prep time', 0, 10_080);
  next.cookTimeMinutes = optionalInteger(values.cookTime, 'Cook time', 0, 10_080);
  next.totalTimeMinutes = optionalInteger(values.totalTime, 'Total time', 0, 10_080);

  next.ingredientGroups = next.ingredientGroups.map((group) => ({
    ...group,
    ingredients: group.ingredients.map((ingredient) => ({
      ...ingredient,
      name: ingredient.name.trim(),
      quantity: ingredient.quantity?.trim() || undefined,
      unit: ingredient.unit?.trim() || undefined,
    })),
  }));
  next.stepGroups = next.stepGroups.map((group) => ({
    ...group,
    steps: group.steps.map((step) => ({ ...step, text: step.text.trim() })),
  }));
  return next;
}

function optionalInteger(value: string, label: string, minimum: number, maximum: number): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(`${label} must be a whole number between ${minimum} and ${maximum}.`);
  }
  return parsed;
}

function cloneGraph(graph: RecipeGraphDraft): RecipeGraphDraft {
  return JSON.parse(JSON.stringify(graph)) as RecipeGraphDraft;
}

const styles = StyleSheet.create({
  title: { color: Colors.text, fontFamily: Fonts.display.bold, fontSize: Typography.sizes.xxlMd },
  content: { gap: Spacing.lg, paddingBottom: Spacing.md },
  issueList: { gap: Spacing.sm },
  issueRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    borderRadius: Radii.md,
    backgroundColor: Colors.errorLight,
    padding: Spacing.md,
  },
  issueText: { flex: 1, color: Colors.text, fontFamily: Fonts.ui.regular, fontSize: Typography.sizes.md, lineHeight: 20 },
  field: { gap: Spacing.values[6] },
  flexField: { flex: 1 },
  compactField: { width: 100 },
  label: { color: Colors.text, fontFamily: Fonts.ui.medium, fontSize: Typography.sizes.md },
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
  twoColumnRow: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm },
  timeRow: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm },
  section: { gap: Spacing.sm, paddingTop: Spacing.xs },
  sectionTitle: { color: Colors.text, fontFamily: Fonts.display.semibold, fontSize: Typography.sizes.lgMd },
  group: { gap: Spacing.sm },
  groupLabel: { color: Colors.textSecondary, fontFamily: Fonts.ui.semibold, fontSize: Typography.sizes.md },
  ingredientRow: { flexDirection: 'row', gap: Spacing.xs },
  quantityInput: { width: 64 },
  unitInput: { width: 72 },
  nameInput: { flex: 1 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  stepNumber: { width: 20, paddingTop: 13, color: Colors.textMuted, textAlign: 'center' },
  stepInput: { flex: 1, minHeight: 70, textAlignVertical: 'top' },
  error: { color: Colors.error, fontFamily: Fonts.ui.regular, fontSize: Typography.sizes.md },
  primaryButton: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderRadius: Radii.full,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
  },
  primaryText: { color: Colors.onPrimary, fontFamily: Fonts.ui.semibold, fontSize: Typography.sizes.md },
  pressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
});
