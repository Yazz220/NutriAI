import React, { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Alert, StyleSheet, View } from 'react-native';
import { RecipeReviewForm } from '@/components/cookbook/RecipeReviewForm';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Spacing, Typography } from '@/constants/spacing';
import { useCookbook } from '@/hooks/useCookbook';
import { useCookbookImport } from '@/hooks/useCookbookImport';
import { generateCookbookPage } from '@/utils/cookbook/api';
import { buildCookbookPagePromptPayload } from '@/utils/cookbook/pagePrompt';
import type { StructuredRecipe } from '@/types/cookbook';

export default function RecipeReviewScreen() {
  const { cookbook, refresh } = useCookbook();
  const { draft, setDraft } = useCookbookImport();
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (!draft) {
      router.replace('/(book)/add');
    }
  }, [draft]);

  async function generateReviewedRecipe(recipe: StructuredRecipe) {
    setDraft(recipe);

    if (!cookbook) {
      Alert.alert('Cookbook not ready', 'Try again once your cookbook has loaded.');
      return;
    }

    setIsGenerating(true);
    try {
      const page = await generateCookbookPage({
        cookbookId: cookbook.id,
        recipe,
        promptPayload: buildCookbookPagePromptPayload({ recipe, theme: cookbook.theme }),
      });
      await refresh();
      router.replace(`/(book)/generation/${page.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not generate this page.';
      Alert.alert('Page generation failed', message);
    } finally {
      setIsGenerating(false);
    }
  }

  if (!draft) {
    return (
      <View style={styles.container}>
        <Text style={styles.subtitle}>Sending you back to add a recipe.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <RecipeReviewForm draft={draft} isGenerating={isGenerating} onGenerate={generateReviewedRecipe} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  title: {
    fontSize: Typography.sizes.xxl,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: Typography.sizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
});
