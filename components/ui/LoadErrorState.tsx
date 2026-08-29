import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Radii, Spacing } from '@/constants/spacing';

interface LoadErrorStateProps {
  title: string;
  message: string;
  onRetry?: () => void;
  onBack?: () => void;
}

export function LoadErrorState({ title, message, onRetry, onBack }: LoadErrorStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.icon} accessibilityElementsHidden>
          <AlertTriangle size={24} color={Colors.error} />
        </View>
        <Text variant="h2" style={styles.title}>{title}</Text>
        <Text variant="body" style={styles.message}>{message}</Text>
        <View style={styles.actions}>
          {onRetry ? <Button title="Try again" onPress={onRetry} fullWidth /> : null}
          {onBack ? <Button title="Back to shelf" variant="ghost" onPress={onBack} fullWidth /> : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    backgroundColor: Colors.background,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.xl,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.ash,
    backgroundColor: Colors.white,
    boxShadow: Colors.book.cardShadow,
  },
  icon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radii.full,
    backgroundColor: Colors.errorLight,
  },
  title: {
    color: Colors.text,
    textAlign: 'center',
  },
  message: {
    color: Colors.textMuted,
    textAlign: 'center',
  },
  actions: {
    width: '100%',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
});
