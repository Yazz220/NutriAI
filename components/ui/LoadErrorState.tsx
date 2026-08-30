import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';

interface LoadErrorStateProps {
  title: string;
  message: string;
  onRetry?: () => void;
  onBack?: () => void;
}

export function LoadErrorState({ title, message, onRetry, onBack }: LoadErrorStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.content} accessibilityRole="alert">
        <View style={styles.icon} accessibilityElementsHidden>
          <AlertTriangle size={22} color={Colors.error} strokeWidth={1.8} />
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
  content: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    gap: Spacing.md,
  },
  icon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
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
    maxWidth: 280,
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
});
