import React from 'react';
import { router } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft } from 'lucide-react-native';
import { AddPageComposer } from '@/components/cookbook/AddPageComposer';
import { Text } from '@/components/ui/Text';
import { useCookbookImport } from '@/hooks/useCookbookImport';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { Fonts } from '@/utils/fonts';

export default function AddPageScreen() {
  const { parseSource, isParsing } = useCookbookImport();
  const [error, setError] = React.useState<string | null>(null);

  return (
    <LinearGradient colors={['#4A3220', '#8B6237', '#E2C58E']} style={styles.container}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.topBar}>
          <Pressable style={styles.backButton} onPress={() => router.replace('/(book)')} accessibilityLabel="Back to cookbook">
            <ChevronLeft size={20} color="#FFF9EF" />
          </Pressable>
          <View style={styles.heading}>
            <Text style={styles.eyebrow}>Add to the book</Text>
            <Text style={styles.title}>Create a page</Text>
          </View>
        </View>

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
        {error ? <Text style={styles.error} selectable>{error}</Text> : null}
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
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 249, 239, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255, 249, 239, 0.28)',
  },
  heading: {
    flex: 1,
  },
  eyebrow: {
    color: '#F7E6C8',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  title: {
    color: '#FFF9EF',
    fontFamily: Fonts.display.bold,
    fontSize: 30,
    lineHeight: 36,
  },
  error: {
    color: Colors.onError,
    backgroundColor: 'rgba(154, 81, 72, 0.92)',
    borderRadius: 16,
    padding: Spacing.md,
    overflow: 'hidden',
  },
});
