import React, { useRef, useState } from 'react';
import {
  Image,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { BookOpen, ChevronRight } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PhysicalBook } from '@/components/physical-book/PhysicalBook';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Radii, Spacing, Typography } from '@/constants/spacing';
import { Fonts } from '@/utils/fonts';

interface FirstRunWelcomeProps {
  onCreateCookbook: () => void;
  onPreviewSample: () => void;
  onSkip: () => void;
}

const PAGE_COUNT = 3;
const SOURCES_BACKGROUND = require('../../assets/brand/illustrations/onboarding-bring-recipes-background-v3.png');
const TRANSFORMATION_BACKGROUND = require('../../assets/brand/illustrations/onboarding-recipe-transformation-background-v3.png');

interface StoryPageProps {
  active: boolean;
  background: number;
  body: string;
  index: number;
  onNext: () => void;
  title: string;
  width: number;
}

function StoryPage({
  active,
  background,
  body,
  index,
  onNext,
  title,
  width,
}: StoryPageProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[styles.page, { width }]}
      accessibilityElementsHidden={!active}
      importantForAccessibility={active ? 'yes' : 'no-hide-descendants'}
      pointerEvents={active ? 'auto' : 'none'}
      testID={`onboarding-page-${index + 1}`}
    >
      <View style={styles.pageShell}>
        <Image
          source={background}
          style={styles.storyBackground}
          resizeMode="cover"
          accessible={false}
          testID={`onboarding-background-${index + 1}`}
        />

        <View style={[styles.storyHeader, { paddingTop: insets.top + Spacing.xl }]}>
          <Text style={styles.pageNumber} accessibilityLabel={`Page ${index + 1} of ${PAGE_COUNT}`}>
            <Text style={styles.pageNumberCurrent}>0{index + 1}</Text>
            <Text style={styles.pageNumberDivider}> / 0{PAGE_COUNT}</Text>
          </Text>

          <View style={styles.storyCopy}>
            <Text variant="h1" style={styles.storyTitle}>{title}</Text>
            <Text style={styles.storyBody}>{body}</Text>
          </View>
        </View>

        <OnboardingFooter
          activeIndex={index}
          bottomInset={insets.bottom}
          buttonLabel="Next"
          onPress={onNext}
        />
      </View>
    </View>
  );
}

interface OnboardingFooterProps {
  activeIndex: number;
  bottomInset: number;
  buttonLabel: string;
  onPress: () => void;
}

function OnboardingFooter({
  activeIndex,
  bottomInset,
  buttonLabel,
  onPress,
}: OnboardingFooterProps) {
  return (
    <View style={[styles.footer, { paddingBottom: bottomInset + Spacing.lg }]}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={buttonLabel}
      >
        <Text variant="button" style={styles.primaryText}>{buttonLabel}</Text>
        <ChevronRight size={20} color={Colors.onPrimary} strokeWidth={1.8} />
      </Pressable>

      <View style={styles.progress} accessibilityLabel={`Page ${activeIndex + 1} of ${PAGE_COUNT}`}>
        {Array.from({ length: PAGE_COUNT }, (_, index) => (
          <View
            key={index}
            style={[styles.progressDot, index === activeIndex && styles.progressDotActive]}
          />
        ))}
      </View>
    </View>
  );
}

interface FinalPageProps {
  active: boolean;
  onCreateCookbook: () => void;
  onPreviewSample: () => void;
  width: number;
}

function FinalPage({
  active,
  onCreateCookbook,
  onPreviewSample,
  width,
}: FinalPageProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[styles.page, { width }]}
      accessibilityElementsHidden={!active}
      importantForAccessibility={active ? 'yes' : 'no-hide-descendants'}
      pointerEvents={active ? 'auto' : 'none'}
      testID="onboarding-page-3"
    >
      <View style={styles.pageShell}>
        <View style={[styles.storyHeader, { paddingTop: insets.top + Spacing.xl }]}>
          <Text style={styles.pageNumber} accessibilityLabel={`Page 3 of ${PAGE_COUNT}`}>
            <Text style={styles.pageNumberCurrent}>03</Text>
            <Text style={styles.pageNumberDivider}> / 03</Text>
          </Text>

          <View style={styles.storyCopy}>
            <Text variant="h1" style={styles.storyTitle}>Make it yours.</Text>
            <Text style={styles.storyBody}>
              Choose the cover and page style for your first cookbook.
            </Text>
          </View>
        </View>

        <View style={styles.bookStage} accessibilityElementsHidden>
          <Image
            source={require('../../assets/brand/illustrations/onboarding-kitchen-backdrop-v1.png')}
            style={styles.bookBackdrop}
            resizeMode="contain"
            accessible={false}
            testID="onboarding-kitchen-backdrop"
          />
          <PhysicalBook
            title="My Cookbook"
            coverStyle="sage-linen"
            pageCount={1}
            width={190}
          />
        </View>

        <View style={[styles.finalFooter, { paddingBottom: insets.bottom + Spacing.lg }]}>
          <Pressable
            onPress={onCreateCookbook}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Make my first cookbook"
          >
            <BookOpen size={19} color={Colors.onPrimary} strokeWidth={1.8} />
            <Text variant="button" style={styles.primaryText}>Make my first cookbook</Text>
            <ChevronRight size={19} color={Colors.onPrimary} strokeWidth={1.8} />
          </Pressable>

          <Pressable
            onPress={onPreviewSample}
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Look inside a sample cookbook"
          >
            <Text variant="button" style={styles.secondaryText}>Look inside a sample</Text>
          </Pressable>

          <View style={styles.progress} accessibilityLabel={`Page 3 of ${PAGE_COUNT}`}>
            {Array.from({ length: PAGE_COUNT }, (_, index) => (
              <View
                key={index}
                style={[styles.progressDot, index === 2 && styles.progressDotActive]}
              />
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

export function FirstRunWelcome({
  onCreateCookbook,
  onPreviewSample,
  onSkip,
}: FirstRunWelcomeProps) {
  const pagerRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);

  const goToPage = (nextIndex: number) => {
    const boundedIndex = Math.max(0, Math.min(PAGE_COUNT - 1, nextIndex));
    setActiveIndex(boundedIndex);
    pagerRef.current?.scrollTo?.({ x: boundedIndex * width, animated: true });
  };

  const handleMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    setActiveIndex(Math.max(0, Math.min(PAGE_COUNT - 1, nextIndex)));
  };

  return (
    <View
      style={styles.layer}
      accessibilityViewIsModal
      importantForAccessibility="yes"
      testID="first-run-welcome"
    >
      <View style={[styles.skipRail, { paddingTop: insets.top + Spacing.lg }]} pointerEvents="box-none">
        <View style={styles.skipRailInner} pointerEvents="box-none">
          <Pressable
            onPress={onSkip}
            style={({ pressed }) => [styles.skipButton, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Skip welcome and open my cookbook shelf"
          >
            <Text variant="bodySmall" style={styles.skipText}>Skip</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        ref={pagerRef}
        horizontal
        pagingEnabled
        bounces={false}
        decelerationRate="fast"
        overScrollMode="never"
        showsHorizontalScrollIndicator={false}
        snapToInterval={width}
        scrollEventThrottle={16}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        style={styles.pager}
        contentContainerStyle={styles.pagerContent}
        testID="onboarding-pager"
      >
        <StoryPage
          active={activeIndex === 0}
          background={SOURCES_BACKGROUND}
          body="Bring in a link, photo, video, or note. Nosh keeps every recipe together."
          index={0}
          onNext={() => goToPage(1)}
          title={'Your recipes.\nYour story.'}
          width={width}
        />
        <StoryPage
          active={activeIndex === 1}
          background={TRANSFORMATION_BACKGROUND}
          body="Every recipe becomes a page you’ll love to read and cook from."
          index={1}
          onNext={() => goToPage(2)}
          title={'Beautifully\norganized.'}
          width={width}
        />
        <FinalPage
          active={activeIndex === 2}
          onCreateCookbook={onCreateCookbook}
          onPreviewSample={onPreviewSample}
          width={width}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
    overflow: 'hidden',
    backgroundColor: Colors.paperIvory,
  },
  pager: {
    flex: 1,
  },
  pagerContent: {
    flexGrow: 1,
  },
  page: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    overflow: 'hidden',
    backgroundColor: Colors.paperIvory,
  },
  pageShell: {
    flex: 1,
    width: '100%',
    maxWidth: 560,
    overflow: 'hidden',
    backgroundColor: Colors.paperIvory,
  },
  storyBackground: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  storyHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2,
    paddingHorizontal: Spacing.xxl,
  },
  pageNumber: {
    fontFamily: Fonts.display.regular,
    fontSize: Typography.sizes.xlPlus,
    lineHeight: Typography.metrics.lineHeight28,
  },
  pageNumberCurrent: {
    color: Colors.primary,
    fontFamily: Fonts.display.semibold,
  },
  pageNumberDivider: {
    color: Colors.alpha.primary[30],
    fontFamily: Fonts.display.regular,
  },
  storyCopy: {
    maxWidth: 420,
    marginTop: Spacing.xxxl,
    gap: Spacing.lg,
  },
  storyTitle: {
    color: Colors.primary,
    fontFamily: Fonts.display.regular,
    fontSize: Typography.sizes.displaySm,
    lineHeight: Typography.metrics.lineHeight42,
  },
  storyBody: {
    maxWidth: 360,
    color: Colors.text,
    fontFamily: Fonts.ui.regular,
    fontSize: Typography.sizes.lg,
    lineHeight: Typography.metrics.lineHeight27,
  },
  footer: {
    position: 'absolute',
    left: Spacing.xl,
    right: Spacing.xl,
    bottom: 0,
    zIndex: 3,
    gap: Spacing.xl,
  },
  finalFooter: {
    position: 'absolute',
    left: Spacing.xl,
    right: Spacing.xl,
    bottom: 0,
    zIndex: 3,
    gap: Spacing.sm,
  },
  primaryButton: {
    minHeight: 58,
    borderRadius: Radii.full,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    boxShadow: Colors.book.liftedShadow,
  },
  primaryText: {
    flexShrink: 1,
    color: Colors.onPrimary,
    textAlign: 'center',
  },
  secondaryButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  secondaryText: {
    color: Colors.primary,
  },
  progress: {
    minHeight: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  progressDot: {
    width: Spacing.sm,
    height: Spacing.sm,
    borderRadius: Radii.full,
    backgroundColor: Colors.border,
  },
  progressDotActive: {
    width: Spacing.md,
    backgroundColor: Colors.primary,
  },
  skipRail: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    alignItems: 'center',
  },
  skipRailInner: {
    width: '100%',
    maxWidth: 560,
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.lg,
  },
  skipButton: {
    minWidth: 52,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radii.full,
  },
  skipText: {
    color: Colors.textSecondary,
    fontFamily: Fonts.ui.medium,
  },
  bookStage: {
    position: 'absolute',
    top: '36%',
    left: 0,
    right: 0,
    height: '38%',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  bookBackdrop: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0.62,
  },
  pressed: {
    opacity: 0.84,
    transform: [{ scale: 0.985 }],
  },
});
