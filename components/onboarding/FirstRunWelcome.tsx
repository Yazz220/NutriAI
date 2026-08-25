import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BookOpen, ChevronRight } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PhysicalBook } from '@/components/physical-book/PhysicalBook';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Radii, Spacing } from '@/constants/spacing';
import { Fonts } from '@/utils/fonts';

interface FirstRunWelcomeProps {
  onCreateCookbook: () => void;
  onPreviewSample: () => void;
  onSkip: () => void;
}

export function FirstRunWelcome({
  onCreateCookbook,
  onPreviewSample,
  onSkip,
}: FirstRunWelcomeProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={styles.layer}
      accessibilityViewIsModal
      importantForAccessibility="yes"
      testID="first-run-welcome"
    >
      <LinearGradient
        colors={['rgba(244,240,232,0.90)', 'rgba(232,225,213,0.98)']}
        style={StyleSheet.absoluteFill}
      />
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + Spacing.xl, paddingBottom: insets.bottom + Spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.wordmarkRow}>
          <Text style={styles.wordmark}>Nosh</Text>
          <Pressable
            onPress={onSkip}
            style={({ pressed }) => [styles.notNowButton, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Skip welcome and open my cookbook shelf"
          >
            <Text style={styles.notNowText}>Not now</Text>
          </Pressable>
        </View>

        <View style={styles.bookStage} accessibilityElementsHidden>
          <View style={styles.bookGlow} />
          <PhysicalBook
            title="My Cookbook"
            coverStyle="sage-linen"
            pageCount={1}
            width={190}
          />
        </View>

        <View style={styles.copy}>
          <Text style={styles.eyebrow}>YOUR PERSONAL COOKBOOK</Text>
          <Text style={styles.title}>Recipes worth keeping deserve a book.</Text>
          <Text style={styles.body}>
            Bring Nosh a link, recipe text, photo, or video. It becomes a beautifully designed page in a cookbook that feels like yours.
          </Text>
        </View>

        <View style={styles.actions}>
          <Pressable
            onPress={onCreateCookbook}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Make my first cookbook"
          >
            <BookOpen size={19} color={Colors.onPrimary} />
            <Text style={styles.primaryText}>Make my first cookbook</Text>
            <ChevronRight size={19} color={Colors.onPrimary} />
          </Pressable>

          <Pressable
            onPress={onPreviewSample}
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Look inside a sample cookbook"
          >
            <Text style={styles.secondaryText}>Look inside a sample</Text>
          </Pressable>
        </View>

        <Text style={styles.footnote}>
          Start with your own book, or take a quiet look around first.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    paddingHorizontal: Spacing.xl,
    justifyContent: 'space-between',
    gap: Spacing.lg,
  },
  wordmarkRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  wordmark: {
    color: Colors.text,
    fontFamily: Fonts.display.bold,
    fontSize: 25,
    lineHeight: 32,
  },
  notNowButton: {
    minWidth: 76,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radii.full,
  },
  notNowText: {
    color: Colors.textSecondary,
    fontFamily: Fonts.ui.medium,
    fontSize: 14,
  },
  bookStage: {
    minHeight: 250,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookGlow: {
    position: 'absolute',
    width: 270,
    height: 190,
    borderRadius: 135,
    backgroundColor: 'rgba(255,255,255,0.55)',
    transform: [{ translateY: 18 }],
  },
  copy: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  eyebrow: {
    color: Colors.textMuted,
    fontFamily: Fonts.ui.medium,
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 1.6,
    textAlign: 'center',
  },
  title: {
    maxWidth: 430,
    color: Colors.text,
    fontFamily: Fonts.display.bold,
    fontSize: 36,
    lineHeight: 42,
    textAlign: 'center',
  },
  body: {
    maxWidth: 440,
    color: Colors.slate,
    fontFamily: Fonts.ui.regular,
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  actions: {
    gap: Spacing.md,
  },
  primaryButton: {
    minHeight: 54,
    borderRadius: Radii.full,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    boxShadow: Colors.book.liftedShadow,
  },
  primaryText: {
    flexShrink: 1,
    color: Colors.onPrimary,
    fontFamily: Fonts.ui.medium,
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
  },
  secondaryButton: {
    minHeight: 50,
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: Colors.charcoal,
    backgroundColor: 'rgba(255,255,255,0.52)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  secondaryText: {
    color: Colors.text,
    fontFamily: Fonts.ui.medium,
    fontSize: 15,
    lineHeight: 21,
  },
  footnote: {
    color: Colors.textMuted,
    fontFamily: Fonts.ui.regular,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.985 }],
  },
});
