import React, { useState } from 'react';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { BookLibraryGrid } from '@/components/cookbook/BookLibraryGrid';
import { AddCookbookSheet } from '@/components/cookbook/AddCookbookSheet';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Radii, Spacing } from '@/constants/spacing';
import { Fonts } from '@/utils/fonts';
import { useAuth } from '@/hooks/useAuth';
import { useCookbooks } from '@/hooks/useCookbooks';
import type { CookbookStyleId } from '@/types/cookbook';

export default function BookLibraryScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { createCookbook } = useCookbooks();
  const [selectedStyle, setSelectedStyle] = useState<CookbookStyleId | null>('handwritten');
  const [sheetOpen, setSheetOpen] = useState(false);

  function pickStyle(styleId: CookbookStyleId) {
    setSelectedStyle(styleId);
  }

  function openNamingStep() {
    if (!selectedStyle) return;
    setSheetOpen(true);
  }

  async function confirmCreate(title: string) {
    if (!selectedStyle) return;
    const cookbook = await createCookbook({ title, coverStyle: selectedStyle });
    setSheetOpen(false);
    router.replace(`/(book)/${cookbook.id}`);
  }

  function openSignIn() {
    setSheetOpen(false);
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

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Create your cookbook</Text>
        <Text style={styles.subtitle}>
          Start with the signature Nosh book. Personal cover details will return after its reading experience is
          perfected.
        </Text>

        <BookLibraryGrid selectedStyle={selectedStyle} onSelectStyle={pickStyle} />
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={[styles.cta, !selectedStyle && styles.ctaDisabled]}
          disabled={!selectedStyle}
          onPress={openNamingStep}
          accessibilityRole="button"
          accessibilityLabel="Continue to name your cookbook"
        >
          <Text style={styles.ctaText}>{selectedStyle ? 'Continue' : 'Choose a style to continue'}</Text>
        </Pressable>
      </View>

      <AddCookbookSheet
        visible={sheetOpen}
        styleId={selectedStyle}
        canCreate={!!user}
        onClose={() => setSheetOpen(false)}
        onConfirm={confirmCreate}
        onSignIn={openSignIn}
      />
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
  title: {
    fontFamily: Fonts.display.bold,
    fontSize: 32,
    lineHeight: 38,
    color: Colors.text,
    letterSpacing: 0,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxxl,
    gap: Spacing.sm,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 24,
    color: Colors.slate,
    marginBottom: Spacing.md,
  },
  footer: {
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.ash,
    backgroundColor: Colors.background,
  },
  cta: {
    minHeight: 44,
    borderRadius: Radii.full,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.charcoal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaDisabled: {
    opacity: 0.45,
  },
  ctaText: {
    color: Colors.text,
    fontFamily: Fonts.ui.medium,
    fontSize: 16,
    letterSpacing: 0,
  },
});
