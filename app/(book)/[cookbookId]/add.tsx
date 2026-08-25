import React from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft } from 'lucide-react-native';
import { NoshCaptureWorkspace } from '@/components/nosh/capture/NoshCaptureWorkspace';
import { Text } from '@/components/ui/Text';
import { useCookbook } from '@/hooks/useCookbook';
import { Colors } from '@/constants/colors';
import { Radii, Spacing , Typography} from '@/constants/spacing';
import { Fonts } from '@/utils/fonts';

export default function AddPageScreen() {
  const { cookbookId } = useLocalSearchParams<{ cookbookId: string }>();
  const { cookbook } = useCookbook(cookbookId);

  const cookbookTitle = cookbook?.title ?? 'Cookbook';

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
              Add a page to {cookbookTitle}
            </Text>
          </View>
        </View>

        <NoshCaptureWorkspace destinationCookbookId={cookbookId} activityVisible={false} />
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
    alignItems: 'center',
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
  },
  eyebrow: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.md,
    fontFamily: Fonts.ui.medium,
    letterSpacing: Typography.metrics.letterSpacing0,
  },
  title: {
    color: Colors.text,
    fontFamily: Fonts.display.bold,
    fontSize: Typography.sizes.md,
    lineHeight: Typography.metrics.lineHeight30,
    letterSpacing: Typography.metrics.letterSpacing0,
  },
});
