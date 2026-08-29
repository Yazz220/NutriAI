import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedRef } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, History, Plus } from 'lucide-react-native';
import { NoshCaptureWorkspace } from '@/components/nosh/capture/NoshCaptureWorkspace';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Radii, Spacing, Typography } from '@/constants/spacing';
import { Fonts } from '@/utils/fonts';

export default function SaveRecipeScreen() {
  const params = useLocalSearchParams<{ captureId?: string | string[] }>();
  const captureId = Array.isArray(params.captureId) ? params.captureId[0] : params.captureId;
  const [showActivity, setShowActivity] = useState(Boolean(captureId));
  const scrollableRef = useAnimatedRef<Animated.ScrollView>();
  const [activitySummary, setActivitySummary] = useState({ pendingCount: 0, attentionCount: 0 });
  const activityLabel = activitySummary.pendingCount === 0
    ? 'Recipe activity'
    : `${activitySummary.pendingCount} recipe ${activitySummary.pendingCount === 1 ? 'item' : 'items'} active${activitySummary.attentionCount ? `, ${activitySummary.attentionCount} ${activitySummary.attentionCount === 1 ? 'needs' : 'need'} attention` : ''}`;

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
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
            onPress={() => router.replace('/(book)')}
            accessibilityRole="button"
            accessibilityLabel="Back to my cookbooks"
          >
            <ChevronLeft size={20} color={Colors.text} />
          </Pressable>
          <View style={styles.heading}>
            <Text style={styles.title}>{showActivity ? 'Recipe activity' : 'Save a recipe'}</Text>
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.activityButton,
              showActivity && styles.activityButtonSelected,
              pressed && styles.pressed,
            ]}
            onPress={() => setShowActivity((current) => !current)}
            accessibilityRole="button"
            accessibilityLabel={showActivity ? 'Save another recipe' : activityLabel}
            accessibilityState={{ selected: showActivity }}
          >
            {showActivity
              ? <Plus size={20} color={Colors.onPrimary} />
              : <History size={20} color={Colors.text} />}
            {!showActivity && activitySummary.pendingCount > 0 ? (
              <View style={[
                styles.activityBadge,
                activitySummary.attentionCount > 0 && styles.activityBadgeAttention,
              ]}>
                <Text style={styles.activityBadgeText}>
                  {activitySummary.pendingCount > 9 ? '9+' : activitySummary.pendingCount}
                </Text>
              </View>
            ) : null}
          </Pressable>
        </View>

        <NoshCaptureWorkspace
          key={showActivity ? `activity-${captureId ?? 'history'}` : 'composer'}
          captureId={showActivity ? captureId : undefined}
          activityVisible={showActivity}
          scrollableRef={scrollableRef}
          onActivitySummaryChange={setActivitySummary}
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
  activityButton: {
    width: 44,
    height: 44,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.ash,
    backgroundColor: Colors.white,
  },
  activityButtonSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  activityBadge: {
    position: 'absolute',
    top: -Spacing.values[2],
    right: -Spacing.values[2],
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radii.full,
    borderWidth: 2,
    borderColor: Colors.alabaster,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.values[4],
  },
  activityBadgeAttention: { backgroundColor: Colors.error },
  activityBadgeText: {
    color: Colors.onPrimary,
    fontFamily: Fonts.ui.semibold,
    fontSize: Typography.sizes.xs,
  },
  pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
  heading: { flex: 1, gap: Spacing.values[2] },
  title: {
    color: Colors.text,
    fontFamily: Fonts.display.bold,
    fontSize: Typography.sizes.xxxlPlus,
    lineHeight: Typography.metrics.lineHeight34,
  },
});
