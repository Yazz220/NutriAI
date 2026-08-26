import React, { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, History, Plus } from 'lucide-react-native';
import { NoshCaptureWorkspace } from '@/components/nosh/capture/NoshCaptureWorkspace';
import { Text } from '@/components/ui/Text';
import { useCookbook } from '@/hooks/useCookbook';
import { Colors } from '@/constants/colors';
import { Radii, Spacing , Typography} from '@/constants/spacing';
import { Fonts } from '@/utils/fonts';

export default function AddPageScreen() {
  const { cookbookId } = useLocalSearchParams<{ cookbookId: string }>();
  const { cookbook } = useCookbook(cookbookId);
  const [showActivity, setShowActivity] = useState(false);
  const [activitySummary, setActivitySummary] = useState({ pendingCount: 0, attentionCount: 0 });

  const cookbookTitle = cookbook?.title ?? 'Cookbook';
  const activityLabel = activitySummary.pendingCount === 0
    ? 'Recipe activity'
    : `${activitySummary.pendingCount} recipe ${activitySummary.pendingCount === 1 ? 'item' : 'items'} active${activitySummary.attentionCount ? `, ${activitySummary.attentionCount} ${activitySummary.attentionCount === 1 ? 'needs' : 'need'} attention` : ''}`;

  return (
    <LinearGradient colors={Colors.book.shelfGradient} style={styles.container}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.topBar}>
          <Pressable
            style={styles.backButton}
            onPress={() => router.replace(`/(book)/${cookbookId}`)}
            accessibilityLabel="Back to cookbook"
          >
            <ChevronLeft size={20} color={Colors.text} />
          </Pressable>
          <View style={styles.heading}>
            <Text style={styles.title} numberOfLines={2} adjustsFontSizeToFit>
              {showActivity ? 'Recipe activity' : 'Save a recipe'}
            </Text>
            <Text style={styles.eyebrow} numberOfLines={1}>{cookbookTitle}</Text>
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
          key={showActivity ? 'activity' : 'composer'}
          destinationCookbookId={cookbookId}
          activityVisible={showActivity}
          onActivitySummaryChange={setActivitySummary}
        />
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    padding: Spacing.lg,
    paddingBottom: Spacing.xxxl,
    gap: Spacing.lg,
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
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.ash,
  },
  heading: {
    flex: 1,
    gap: Spacing.values[2],
  },
  eyebrow: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.sm,
    fontFamily: Fonts.ui.medium,
    letterSpacing: Typography.metrics.letterSpacing0,
  },
  title: {
    color: Colors.text,
    fontFamily: Fonts.display.bold,
    fontSize: Typography.sizes.xxxlPlus,
    lineHeight: Typography.metrics.lineHeight30,
    letterSpacing: Typography.metrics.letterSpacing0,
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
});
