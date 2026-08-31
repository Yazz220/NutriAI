import { StyleSheet, View } from 'react-native';
import { Colors } from '@/constants/colors';
import { Radii, Spacing } from '@/constants/spacing';

export function SubscriptionStatusSkeleton() {
  return (
    <View
      style={styles.card}
      accessibilityRole="progressbar"
      accessibilityLabel="Checking your Nosh plan"
      accessibilityState={{ busy: true }}
      testID="subscription-status-skeleton"
    >
      <View style={[styles.placeholder, styles.eyebrow]} />
      <View style={[styles.placeholder, styles.title]} />
      <View style={[styles.placeholder, styles.copy]} />
      <View style={[styles.placeholder, styles.progress]} />
      <View style={[styles.placeholder, styles.button]} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.md,
    overflow: 'hidden',
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    padding: Spacing.lg,
  },
  placeholder: {
    borderRadius: Radii.full,
    backgroundColor: Colors.backgroundSecondary,
  },
  eyebrow: { width: 72, height: 10 },
  title: { width: '45%', height: 24 },
  copy: { width: '72%', height: 14 },
  progress: { width: '100%', height: 7 },
  button: { width: '100%', height: 48, marginTop: Spacing.xs },
});
