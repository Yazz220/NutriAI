import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Trash2 } from 'lucide-react-native';
import { NoshSymbol } from '@/components/brand/NoshBrandAssets';
import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Radii, Spacing, Typography } from '@/constants/spacing';
import type { CookingPreference, CookingPreferenceKey } from '@/utils/cookbook/cookingPreferences';
import { Fonts } from '@/utils/fonts';

const GROUPS: Array<{
  title: string;
  keys: CookingPreferenceKey[];
}> = [
  {
    title: 'Safety and diet',
    keys: ['allergy', 'dietary_restriction', 'disliked_ingredient'],
  },
  {
    title: 'Cooking defaults',
    keys: ['measurement_system', 'default_servings'],
  },
  {
    title: 'Your kitchen',
    keys: ['appliance', 'cooking_goal'],
  },
];

const LABELS: Record<CookingPreferenceKey, string> = {
  allergy: 'Allergy',
  dietary_restriction: 'Dietary restriction',
  disliked_ingredient: 'Disliked ingredient',
  measurement_system: 'Measurements',
  default_servings: 'Default servings',
  appliance: 'Appliance',
  cooking_goal: 'Cooking goal',
};

interface CookingPreferencesSheetProps {
  visible: boolean;
  preferences: CookingPreference[];
  loading: boolean;
  error: string | null;
  removingId: string | null;
  onClose: () => void;
  onRetry: () => void;
  onRemove: (preference: CookingPreference) => void;
  onOpenNosh: () => void;
}

export function CookingPreferencesSheet({
  visible,
  preferences,
  loading,
  error,
  removingId,
  onClose,
  onRetry,
  onRemove,
  onOpenNosh,
}: CookingPreferencesSheetProps) {
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      maxHeight="88%"
      closeAccessibilityLabel="Close cooking preferences"
      header={
        <View style={styles.header}>
          <View style={styles.brandBadge} accessibilityElementsHidden>
            <NoshSymbol size={25} />
          </View>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>NOSH</Text>
            <Text style={styles.title}>Cooking preferences</Text>
          </View>
        </View>
      }
    >
      <Text style={styles.intro}>
        Nosh uses only the preferences you have explicitly asked it to remember. Remove anything that is no longer right.
      </Text>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator color={Colors.primary} />
            <Text style={styles.stateCopy}>Loading your preferences...</Text>
          </View>
        ) : error ? (
          <View style={styles.centerState}>
            <Text style={styles.stateTitle}>Could not load preferences</Text>
            <Text style={styles.stateCopy}>{error}</Text>
            <Button title="Try again" variant="secondary" size="sm" onPress={onRetry} />
          </View>
        ) : preferences.length === 0 ? (
          <View style={styles.emptyState}>
            <NoshSymbol size={34} accessibilityLabel="Nosh" />
            <Text style={styles.stateTitle}>Nothing saved yet</Text>
            <Text style={styles.stateCopy}>
              Tell Nosh about an allergy, preferred measurements, serving size, or something else worth remembering.
            </Text>
          </View>
        ) : (
          GROUPS.map((group) => {
            const groupPreferences = preferences.filter((preference) => group.keys.includes(preference.key));
            if (groupPreferences.length === 0) return null;
            return (
              <View key={group.title} style={styles.group}>
                <Text style={styles.groupTitle}>{group.title}</Text>
                <View style={styles.preferenceCard}>
                  {groupPreferences.map((preference, index) => (
                    <View
                      key={preference.id}
                      style={[styles.preferenceRow, index > 0 && styles.preferenceDivider]}
                    >
                      <View style={styles.preferenceCopy}>
                        <Text style={styles.preferenceLabel}>{LABELS[preference.key]}</Text>
                        <Text style={styles.preferenceValue}>{preference.value}</Text>
                      </View>
                      <Pressable
                        style={({ pressed }) => [styles.removeButton, pressed && styles.pressed]}
                        onPress={() => onRemove(preference)}
                        disabled={removingId !== null}
                        accessibilityRole="button"
                        accessibilityLabel={`Forget ${preference.value}`}
                        accessibilityState={{ disabled: removingId !== null }}
                      >
                        {removingId === preference.id ? (
                          <ActivityIndicator size="small" color={Colors.dangerText} />
                        ) : (
                          <Trash2 size={18} color={Colors.dangerText} />
                        )}
                      </Pressable>
                    </View>
                  ))}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <Button
        title="Tell Nosh a preference"
        onPress={onOpenNosh}
        fullWidth
        icon={<NoshSymbol size={22} tone="ivory" />}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  header: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  brandBadge: {
    width: 42,
    height: 42,
    borderRadius: Radii.full,
    backgroundColor: Colors.parchment,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {
    flex: 1,
  },
  eyebrow: {
    color: Colors.textSecondary,
    fontFamily: Fonts.ui.semibold,
    fontSize: Typography.sizes.sm,
    letterSpacing: Typography.metrics.letterSpacing12,
  },
  title: {
    color: Colors.text,
    fontFamily: Fonts.display.bold,
    fontSize: Typography.sizes.lgPlus,
    lineHeight: Typography.metrics.lineHeight24,
  },
  intro: {
    color: Colors.textSecondary,
    fontFamily: Fonts.ui.regular,
    fontSize: Typography.sizes.md,
    lineHeight: Typography.metrics.lineHeight20,
  },
  scroll: {
    flexShrink: 1,
  },
  scrollContent: {
    gap: Spacing.lg,
    paddingBottom: Spacing.xs,
  },
  centerState: {
    minHeight: 170,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  emptyState: {
    minHeight: 190,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
  },
  stateTitle: {
    color: Colors.text,
    fontFamily: Fonts.ui.semibold,
    fontSize: Typography.sizes.lg,
    textAlign: 'center',
  },
  stateCopy: {
    color: Colors.textSecondary,
    fontFamily: Fonts.ui.regular,
    fontSize: Typography.sizes.md,
    lineHeight: Typography.metrics.lineHeight20,
    textAlign: 'center',
  },
  group: {
    gap: Spacing.sm,
  },
  groupTitle: {
    color: Colors.textSecondary,
    fontFamily: Fonts.ui.medium,
    fontSize: Typography.sizes.md,
    paddingHorizontal: Spacing.xs,
  },
  preferenceCard: {
    overflow: 'hidden',
    borderRadius: Radii.lg,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  preferenceRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: Spacing.lg,
    paddingRight: Spacing.sm,
    gap: Spacing.md,
  },
  preferenceDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  preferenceCopy: {
    flex: 1,
    gap: Spacing.xxs,
  },
  preferenceLabel: {
    color: Colors.textSecondary,
    fontFamily: Fonts.ui.medium,
    fontSize: Typography.sizes.sm,
  },
  preferenceValue: {
    color: Colors.text,
    fontFamily: Fonts.ui.regular,
    fontSize: Typography.sizes.mdPlus,
    lineHeight: Typography.metrics.lineHeight20,
  },
  removeButton: {
    width: 44,
    height: 44,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    backgroundColor: Colors.errorLight,
  },
});
