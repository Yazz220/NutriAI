import React from 'react';
import { router } from 'expo-router';
import { Alert, StyleSheet, View } from 'react-native';
import { AddPageComposer } from '@/components/cookbook/AddPageComposer';
import { Text } from '@/components/ui/Text';
import { useCookbookImport } from '@/hooks/useCookbookImport';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';

export default function AddPageScreen() {
  const { parseSource, isParsing } = useCookbookImport();
  const [error, setError] = React.useState<string | null>(null);

  return (
    <View style={styles.container}>
      <AddPageComposer
        isSubmitting={isParsing}
        onSubmit={async (payload) => {
          setError(null);
          try {
            await parseSource(payload);
            router.push('/(book)/review');
          } catch (err) {
            const message = err instanceof Error ? err.message : 'Could not read that recipe.';
            setError(message);
            Alert.alert('Recipe import failed', message);
          }
        }}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  error: {
    color: Colors.error,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
});
