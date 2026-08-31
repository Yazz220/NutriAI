import type { ReactNode } from 'react';
import {
  Image,
  type ImageSourcePropType,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NoshHorizontalLockup } from '@/components/brand/NoshBrandAssets';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';

interface AuthScaffoldProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  compactHeader?: boolean;
  backgroundImage?: ImageSourcePropType;
}

export function AuthScaffold({
  title,
  subtitle,
  children,
  footer,
  compactHeader = false,
  backgroundImage,
}: AuthScaffoldProps) {
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();
  const preservePortraitArtwork = width / Math.max(height, 1) < 0.64;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      {backgroundImage ? (
        <Image
          source={backgroundImage}
          style={styles.backgroundImage}
          resizeMode={preservePortraitArtwork ? 'stretch' : 'cover'}
          accessible={false}
          testID="auth-background-pattern"
        />
      ) : null}
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + Spacing.xl, paddingBottom: insets.bottom + Spacing.xxl },
        ]}
      >
        <View style={styles.header}>
          <NoshHorizontalLockup width={148} />
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
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    height: '100%',
    width: '100%',
    opacity: 0.72,
  },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.xxl,
  },
  header: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  brandSpacing: {
    height: Spacing.sm,
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
  },
  footer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: Spacing.lg,
  },
});
