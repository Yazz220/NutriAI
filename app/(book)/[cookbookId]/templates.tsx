import React from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { RecipeTemplateLibrary } from '@/components/cookbook/RecipeTemplateLibrary';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Radii, Spacing } from '@/constants/spacing';
import { Fonts } from '@/utils/fonts';
import { useCookbookImport } from '@/hooks/useCookbookImport';
import type { RecipeTemplateId } from '@/types/cookbook';

export default function RecipeTemplatesScreen() {
  const insets = useSafeAreaInsets();
  const { cookbookId } = useLocalSearchParams<{ cookbookId: string }>();
  const {
    selectedTemplateId,
    favoriteTemplateIds,
    selectTemplate,
    toggleFavoriteTemplate,
  } = useCookbookImport();

  function closeTemplateLibrary() {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace(`/(book)/${cookbookId}/add?source=url`);
  }

  function chooseTemplate(templateId: RecipeTemplateId) {
    selectTemplate(templateId);
    closeTemplateLibrary();
  }

  return (
    <LinearGradient colors={Colors.book.shelfGradient} style={styles.container}>
      <View style={[styles.topBar, { paddingTop: insets.top + Spacing.md }]}>
        <Pressable
          style={styles.backButton}
          onPress={closeTemplateLibrary}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <ChevronLeft size={20} color={Colors.text} />
        </Pressable>
        <View style={styles.heading}>
          <Text style={styles.eyebrow}>Templates</Text>
          <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit>
            Choose page style
          </Text>
        </View>
        <View style={styles.spacer} />
      </View>

      <Text style={styles.subtitle}>
        Save favorites here, then pick one when you add a recipe.
      </Text>

      <RecipeTemplateLibrary
        selectedTemplateId={selectedTemplateId}
        favoriteTemplateIds={favoriteTemplateIds}
        onSelectTemplate={chooseTemplate}
        onToggleFavoriteTemplate={toggleFavoriteTemplate}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.ash,
  },
  heading: {
    flex: 1,
    alignItems: 'center',
  },
  eyebrow: {
    color: Colors.textMuted,
    fontSize: 10,
    lineHeight: 14,
    fontFamily: Fonts.ui.medium,
    letterSpacing: 0,
  },
  title: {
    color: Colors.text,
    fontFamily: Fonts.display.bold,
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: 0,
  },
  spacer: {
    width: 42,
    height: 42,
  },
  subtitle: {
    color: Colors.slate,
    fontSize: 13,
    lineHeight: 20,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
});
