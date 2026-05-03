import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Spacing, Typography } from '@/constants/spacing';

interface EmptyBookStateProps {
  onAddPage: () => void;
}

export function EmptyBookState({ onAddPage }: EmptyBookStateProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your cookbook is ready.</Text>
      <Text style={styles.subtitle}>
        Add your first recipe page and start building a book Nosh can cook from with you.
      </Text>
      <Button title="Add first page" onPress={onAddPage} />
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
  title: {
    fontSize: Typography.sizes.xxl,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: Typography.sizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
});
