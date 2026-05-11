import type { ReactNode } from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Radii, Spacing } from '@/constants/spacing';
import { Fonts } from '@/utils/fonts';

const noshReading = require('../../assets/illustrations/nosh-reading-cookbook.png');

interface AuthScaffoldProps {
  title: string;
  subtitle: string;
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
          <Text style={styles.subtitle}>{subtitle}</Text>
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
    paddingHorizontal: Spacing.lg,
    gap: Spacing.lg,
  },
  header: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  wordmark: {
    fontFamily: Fonts.display.bold,
    fontSize: 32,
    lineHeight: 38,
    color: Colors.text,
    letterSpacing: 0.8,
  },
  illustration: {
    width: '100%',
    maxWidth: 340,
    height: 188,
  },
  title: {
    fontFamily: Fonts.display.bold,
    color: Colors.text,
    fontSize: 24,
    lineHeight: 30,
    textAlign: 'center',
    letterSpacing: 0.6,
  },
  subtitle: {
    color: Colors.slate,
    fontSize: 14,
    lineHeight: 24,
    textAlign: 'center',
    maxWidth: 360,
  },
  card: {
    gap: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.ash,
    backgroundColor: Colors.white,
    padding: Spacing.lg,
    boxShadow: Colors.book.cardShadow,
  },
  footer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: Spacing.lg,
  },
});
