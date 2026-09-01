import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedRef } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft } from 'lucide-react-native';
import { NoshCaptureWorkspace } from '@/components/nosh/capture/NoshCaptureWorkspace';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Spacing, Typography } from '@/constants/spacing';
import { Fonts } from '@/utils/fonts';

interface RecipeCaptureScreenProps {
  destinationCookbookId?: string;
  captureId?: string;
  cookbookTitle?: string;
  onExit: () => void;
  exitAccessibilityLabel: string;
}

export function RecipeCaptureScreen({
  destinationCookbookId,
  captureId,
  cookbookTitle,
  onExit,
  exitAccessibilityLabel,
}: RecipeCaptureScreenProps) {
  const scrollableRef = useAnimatedRef<Animated.ScrollView>();

  return (
    <LinearGradient colors={Colors.book.shelfGradient} style={styles.container}>
      <Animated.ScrollView
        ref={scrollableRef}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.topBar}>
          <Pressable
            style={({ pressed }) => [styles.backAction, pressed && styles.pressed]}
            onPress={onExit}
            accessibilityRole="button"
            accessibilityLabel={exitAccessibilityLabel}
          >
            <ChevronLeft size={22} color={Colors.text} strokeWidth={1.8} />
          </Pressable>
          <View style={styles.heading}>
            <Text style={styles.title} numberOfLines={2} adjustsFontSizeToFit>
              Save a recipe
            </Text>
            {cookbookTitle ? (
              <Text style={styles.eyebrow} numberOfLines={1}>{cookbookTitle}</Text>
            ) : null}
          </View>
        </View>

        <NoshCaptureWorkspace
          destinationCookbookId={destinationCookbookId}
          captureId={captureId}
          scrollableRef={scrollableRef}
        />
      </Animated.ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    gap: Spacing.lg,
    padding: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    paddingTop: Spacing.md,
  },
  backAction: {
    width: 44,
    height: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  heading: {
    flex: 1,
    gap: Spacing.values[2],
  },
  eyebrow: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.sm,
    fontFamily: Fonts.ui.medium,
  },
  title: {
    color: Colors.text,
    fontFamily: Fonts.display.bold,
    fontSize: Typography.sizes.xxxlPlus,
    lineHeight: Typography.metrics.lineHeight34,
  },
  pressed: { opacity: 0.56 },
});
