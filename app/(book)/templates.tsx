import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RecipeTemplateLibrary } from '@/components/cookbook/RecipeTemplateLibrary';
import { LibraryBackButton } from '@/components/navigation/LibraryBackButton';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { useCookbookImport } from '@/hooks/useCookbookImport';
import { Fonts } from '@/utils/fonts';

export default function TopLevelTemplatesScreen() {
  const insets = useSafeAreaInsets();
  const {
    selectedTemplateId,
    favoriteTemplateIds,
    selectTemplate,
    toggleFavoriteTemplate,
  } = useCookbookImport();

  return (
    <LinearGradient colors={Colors.book.shelfGradient} style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <LibraryBackButton />
        <Text style={styles.title}>Templates</Text>
        <Text style={styles.subtitle}>
          Browse page styles and keep favorites ready for your next recipe.
        </Text>
      </View>

      <RecipeTemplateLibrary
        selectedTemplateId={selectedTemplateId}
        favoriteTemplateIds={favoriteTemplateIds}
        bottomInset={insets.bottom + Spacing.xxl}
        onSelectTemplate={selectTemplate}
        onToggleFavoriteTemplate={toggleFavoriteTemplate}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
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
    lineHeight: 22,
    maxWidth: 520,
  },
});
