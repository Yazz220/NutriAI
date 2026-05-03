import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';
import { Spacing, Typography, Radii } from '@/constants/spacing';
import type { CookbookTheme } from '@/types/cookbook';

export const COOKBOOK_THEMES: CookbookTheme[] = [
  {
    name: 'Clean Editorial',
    prompt: 'clean editorial cookbook page, generous white space, refined serif title, realistic food photography',
  },
  {
    name: 'Warm Handwritten',
    prompt: 'warm handwritten family cookbook, cream paper, soft watercolor food illustration, cozy kitchen feeling',
  },
  {
    name: 'Modern Magazine',
    prompt: 'modern magazine recipe layout, crisp typography, polished food styling, high contrast sections',
  },
  {
    name: 'Vintage Recipe Book',
    prompt: 'vintage recipe book page, aged paper, nostalgic typography, gentle ink illustration',
  },
];

interface CookbookStylePickerProps {
  value: CookbookTheme | null;
  onChange: (theme: CookbookTheme) => void;
}

export function CookbookStylePicker({ value, onChange }: CookbookStylePickerProps) {
  return (
    <View style={styles.grid}>
      {COOKBOOK_THEMES.map((theme) => {
        const selected = value?.name === theme.name;

        return (
          <TouchableOpacity
            key={theme.name}
            style={[styles.card, selected && styles.cardSelected]}
            onPress={() => onChange(theme)}
            accessibilityRole="button"
            accessibilityLabel={`Choose ${theme.name} cookbook style`}
            accessibilityState={{ selected }}
            activeOpacity={0.82}
          >
            <View style={[styles.preview, selected && styles.previewSelected]}>
              <View style={styles.previewTitle} />
              <View style={styles.previewImage} />
              <View style={styles.previewLine} />
              <View style={[styles.previewLine, styles.previewLineShort]} />
            </View>
            <Text style={[styles.name, selected && styles.nameSelected]}>{theme.name}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    gap: Spacing.md,
  },
  card: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.md,
    padding: Spacing.md,
    backgroundColor: Colors.surface,
  },
  cardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.tints.brandTintSoft,
  },
  preview: {
    height: 96,
    borderRadius: Radii.sm,
    backgroundColor: Colors.cardSecondary,
    marginBottom: Spacing.sm,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  previewSelected: {
    backgroundColor: Colors.card,
  },
  previewTitle: {
    width: '56%',
    height: 10,
    borderRadius: Radii.sm,
    backgroundColor: Colors.primary,
  },
  previewImage: {
    flex: 1,
    borderRadius: Radii.sm,
    backgroundColor: Colors.secondaryLight,
    marginVertical: Spacing.xs,
  },
  previewLine: {
    width: '86%',
    height: 6,
    borderRadius: Radii.sm,
    backgroundColor: Colors.borderStrong,
  },
  previewLineShort: {
    width: '62%',
  },
  name: {
    fontSize: Typography.sizes.md,
    color: Colors.text,
    fontWeight: Typography.weights.semibold,
  },
  nameSelected: {
    color: Colors.primary,
  },
});
