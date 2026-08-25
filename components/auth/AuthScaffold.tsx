import type { ReactNode } from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Radii, Spacing , Typography} from '@/constants/spacing';
import { Fonts } from '@/utils/fonts';

const noshReading = require('../../assets/illustrations/nosh-reading-cookbook.png');

interface AuthScaffoldProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  showIllustration?: boolean;
}

export function AuthScaffold({
  title,
  subtitle,
  children,
  footer,
  showIllustration = true,
}: AuthScaffoldProps) {
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + Spacing.xl, paddingBottom: insets.bottom + Spacing.xxl },
        ]}
      >
        <View style={styles.header}>
          <Text style={styles.wordmark}>Nosh</Text>
          {showIllustration ? (
            <Image source={noshReading} style={styles.illustration} resizeMode="contain" />
          ) : null}
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>

        <View style={styles.card}>{children}</View>
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.xl,
  },
  header: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  wordmark: {
    fontFamily: Fonts.display.bold,
    fontSize: Typography.sizes.md,
    lineHeight: Typography.metrics.lineHeight40,
    color: Colors.text,
    letterSpacing: Typography.metrics.letterSpacing0,
  },
  illustration: {
    width: '100%',
    maxWidth: 340,
    height: 188,
  },
  title: {
    fontFamily: Fonts.display.bold,
    color: Colors.text,
    fontSize: Typography.sizes.md,
    lineHeight: Typography.metrics.lineHeight34,
    textAlign: 'center',
    letterSpacing: Typography.metrics.letterSpacing0,
  },
  subtitle: {
    color: Colors.slate,
    fontSize: Typography.sizes.md,
    lineHeight: Typography.metrics.lineHeight24,
    textAlign: 'center',
    maxWidth: 360,
  },
  card: {
    gap: Spacing.md,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.ash,
    backgroundColor: Colors.white,
    padding: Spacing.xl,
    boxShadow: Colors.book.cardShadow,
  },
  footer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: Spacing.lg,
  },
});
