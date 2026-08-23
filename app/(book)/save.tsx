import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { NoshCaptureWorkspace } from '@/components/nosh/capture/NoshCaptureWorkspace';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Radii, Spacing } from '@/constants/spacing';
import { Fonts } from '@/utils/fonts';

export default function SaveRecipeScreen() {
  const params = useLocalSearchParams<{ captureId?: string | string[] }>();
  const captureId = Array.isArray(params.captureId) ? params.captureId[0] : params.captureId;

  return (
    <LinearGradient colors={Colors.book.shelfGradient} style={styles.container}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.topBar}>
          <Pressable
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
            onPress={() => router.replace('/(book)')}
            accessibilityRole="button"
            accessibilityLabel="Back to my cookbooks"
          >
            <ChevronLeft size={20} color={Colors.text} />
          </Pressable>
          <View style={styles.heading}>
            <Text style={styles.eyebrow}>Nosh intake</Text>
            <Text style={styles.title}>Save a recipe</Text>
            <Text style={styles.copy}>
              Add a source and follow it here until the finished page is in its cookbook.
            </Text>
          </View>
        </View>

        <NoshCaptureWorkspace captureId={captureId} />
      </ScrollView>
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
  backButton: {
    width: 42,
    height: 42,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.ash,
    backgroundColor: Colors.white,
  },
  pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
  heading: { flex: 1, gap: 2 },
  eyebrow: {
    color: Colors.textMuted,
    fontFamily: Fonts.ui.medium,
    fontSize: 10,
    letterSpacing: 0.4,
  },
  title: {
    color: Colors.text,
    fontFamily: Fonts.display.bold,
    fontSize: 28,
    lineHeight: 34,
  },
  copy: {
    maxWidth: 520,
    color: Colors.textSecondary,
    fontFamily: Fonts.ui.regular,
    fontSize: 13,
    lineHeight: 19,
  },
});
