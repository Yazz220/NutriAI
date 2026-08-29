import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NoshHorizontalLockup } from '@/components/brand/NoshBrandAssets';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Radii, Spacing } from '@/constants/spacing';

interface AuthScaffoldProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  compactHeader?: boolean;
}

export function AuthScaffold({
  title,
  subtitle,
  children,
  footer,
  compactHeader = false,
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
          <NoshHorizontalLockup width={172} />
          {!compactHeader ? <View style={styles.brandSpacing} /> : null}
          <Text variant="h1" style={styles.title}>{title}</Text>
          {subtitle ? <Text variant="body" style={styles.subtitle}>{subtitle}</Text> : null}
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
  brandSpacing: {
    height: Spacing.md,
  },
  title: {
    color: Colors.text,
    textAlign: 'center',
  },
  subtitle: {
    color: Colors.slate,
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
