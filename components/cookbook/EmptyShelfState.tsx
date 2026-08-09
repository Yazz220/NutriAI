import React from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus } from 'lucide-react-native';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Radii, Spacing } from '@/constants/spacing';
import { Fonts } from '@/utils/fonts';

interface EmptyShelfStateProps {
  onAddCookbook: () => void;
  bottomInset?: number;
}

const noshReading = require('../../assets/illustrations/nosh-reading-cookbook.png');

export function EmptyShelfState({ onAddCookbook, bottomInset = 0 }: EmptyShelfStateProps) {
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient colors={Colors.book.shelfGradient} style={styles.container}>
      <View
        style={[
          styles.content,
          {
            paddingTop: insets.top + Spacing.xxl,
            paddingBottom: insets.bottom + Spacing.xxl + bottomInset,
          },
        ]}
      >
        <Image source={noshReading} style={styles.illustration} resizeMode="contain" />
        <Text style={styles.title}>Your shelf is ready</Text>
        <Text style={styles.subtitle}>
          Start a personal cookbook. Pick a cover, add it to your collection, then choose page templates as
          you bring in recipes.
        </Text>

        <Pressable
          style={styles.cta}
          onPress={onAddCookbook}
          accessibilityRole="button"
          accessibilityLabel="Add your first cookbook"
        >
          <Plus size={18} color={Colors.onPrimary} />
          <Text style={styles.ctaText}>Add your first cookbook</Text>
        </Pressable>

      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  illustration: {
    width: '100%',
    maxWidth: 340,
    height: 220,
    marginBottom: Spacing.sm,
  },
  title: {
    fontFamily: Fonts.display.bold,
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: 0,
    color: Colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 24,
    color: Colors.slate,
    textAlign: 'center',
    maxWidth: 360,
  },
  cta: {
    marginTop: Spacing.lg,
    minHeight: 44,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radii.full,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    borderWidth: 0,
    boxShadow: Colors.book.cardShadow,
  },
  ctaText: {
    color: Colors.onPrimary,
    fontFamily: Fonts.ui.medium,
    fontSize: 16,
    letterSpacing: 0,
  },
});
