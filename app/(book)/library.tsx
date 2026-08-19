import React from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { CreationStudio } from '@/components/create/CreationStudio';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Radii, Spacing } from '@/constants/spacing';
import { Fonts } from '@/utils/fonts';
import { useAuth } from '@/hooks/useAuth';
import { useCookbooks } from '@/hooks/useCookbooks';
import type { CookbookStyleId, RecipeTemplateId } from '@/types/cookbook';

export default function BookLibraryScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { createCookbook } = useCookbooks();

  async function handleCreate(title: string, coverStyle: CookbookStyleId, pageTemplateId: RecipeTemplateId) {
    const cookbook = await createCookbook({ title, coverStyle, pageTemplateId });
    router.replace(`/(book)/${cookbook.id}`);
  }

  function openSignIn() {
    router.push('/(auth)/sign-in');
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Pressable style={styles.backButton} onPress={() => router.back()} accessibilityLabel="Back to my cookbooks">
          <ChevronLeft size={20} color={Colors.text} />
        </Pressable>
        <View style={styles.heading}>
          <Text style={styles.wordmark}>Nosh</Text>
        </View>
        <View style={styles.topSpacer} />
      </View>

      <CreationStudio canCreate={!!user} onCreateBook={handleCreate} onSignIn={openSignIn} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.alabaster,
    borderWidth: 1,
    borderColor: Colors.ash,
  },
  heading: {
    flex: 1,
    alignItems: 'center',
  },
  topSpacer: {
    width: 42,
    height: 42,
  },
  wordmark: {
    fontFamily: Fonts.display.bold,
    fontSize: 24,
    lineHeight: 30,
    color: Colors.text,
    letterSpacing: 0,
  },
});
