import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedRef } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { AlertTriangle, ChevronLeft, ChevronRight, LoaderCircle } from 'lucide-react-native';
import { NoshCaptureWorkspace } from '@/components/nosh/capture/NoshCaptureWorkspace';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Spacing, Typography } from '@/constants/spacing';
import { Fonts } from '@/utils/fonts';

interface ActivitySummary {
  pendingCount: number;
  attentionCount: number;
}

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
  const [showActivity, setShowActivity] = useState(Boolean(captureId));
  const [activitySummary, setActivitySummary] = useState<ActivitySummary>({
    pendingCount: 0,
    attentionCount: 0,
  });
  const scrollableRef = useAnimatedRef<Animated.ScrollView>();

  const handleBack = () => {
    if (showActivity) {
      setShowActivity(false);
      return;
    }
    onExit();
  };

  const activityLabel = activitySummary.attentionCount > 0
    ? `${activitySummary.attentionCount} ${activitySummary.attentionCount === 1 ? 'page needs' : 'pages need'} attention`
    : `${activitySummary.pendingCount} ${activitySummary.pendingCount === 1 ? 'page' : 'pages'} in progress`;
  const activityAccessibilityLabel = `${activitySummary.pendingCount} recipe ${activitySummary.pendingCount === 1 ? 'item' : 'items'} active${activitySummary.attentionCount ? `, ${activitySummary.attentionCount} ${activitySummary.attentionCount === 1 ? 'needs' : 'need'} attention` : ''}`;

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
            onPress={handleBack}
            accessibilityRole="button"
            accessibilityLabel={showActivity ? 'Back to save a recipe' : exitAccessibilityLabel}
          >
            <ChevronLeft size={22} color={Colors.text} strokeWidth={1.8} />
          </Pressable>
          <View style={styles.heading}>
            <Text style={styles.title} numberOfLines={2} adjustsFontSizeToFit>
              {showActivity ? 'Recipe activity' : 'Save a recipe'}
            </Text>
            {!showActivity && cookbookTitle ? (
              <Text style={styles.eyebrow} numberOfLines={1}>{cookbookTitle}</Text>
            ) : null}
          </View>
        </View>

        {!showActivity && activitySummary.pendingCount > 0 ? (
          <Pressable
            style={({ pressed }) => [styles.activityLink, pressed && styles.activityLinkPressed]}
            onPress={() => setShowActivity(true)}
            accessibilityRole="button"
            accessibilityLabel={activityAccessibilityLabel}
          >
            {activitySummary.attentionCount > 0 ? (
              <AlertTriangle size={17} color={Colors.warning} strokeWidth={1.8} />
            ) : (
              <LoaderCircle size={17} color={Colors.textSecondary} strokeWidth={1.8} />
            )}
            <Text style={styles.activityLinkText}>{activityLabel}</Text>
            <ChevronRight size={17} color={Colors.textMuted} strokeWidth={1.8} />
          </Pressable>
        ) : null}

        <NoshCaptureWorkspace
          key={showActivity ? `activity-${captureId ?? 'history'}` : 'composer'}
          destinationCookbookId={destinationCookbookId}
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
  activityLink: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginLeft: Spacing.xxxx,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.divider,
  },
  activityLinkPressed: { opacity: 0.66 },
  activityLinkText: {
    flex: 1,
    color: Colors.textSecondary,
    fontFamily: Fonts.ui.medium,
    fontSize: Typography.sizes.md,
    lineHeight: Typography.metrics.lineHeight20,
  },
  pressed: { opacity: 0.56 },
});
