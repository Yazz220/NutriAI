import React from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft } from 'lucide-react-native';
import { AddPageComposer } from '@/components/cookbook/AddPageComposer';
import { ExtractingRecipeStages } from '@/components/cookbook/ExtractingRecipeStages';
import { Text } from '@/components/ui/Text';
import { useCookbook } from '@/hooks/useCookbook';
import { useCookbookImport } from '@/hooks/useCookbookImport';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { Fonts } from '@/utils/fonts';
import type { RecipeSourceType } from '@/types/cookbook';

function normalizeSourceParam(value: string | string[] | undefined): RecipeSourceType | undefined {
  const source = Array.isArray(value) ? value[0] : value;
  return source === 'url' || source === 'text' || source === 'image' || source === 'video'
    ? source
    : undefined;
}

export default function AddPageScreen() {
  const { cookbookId, source } = useLocalSearchParams<{ cookbookId: string; source?: string | string[] }>();
  const { cookbook } = useCookbook(cookbookId);
  const { parseSource, isParsing } = useCookbookImport();
  const [error, setError] = React.useState<string | null>(null);

  const sourceHint = normalizeSourceParam(source);
  const cookbookTitle = cookbook?.title ?? 'Cookbook';

  return (
    <LinearGradient colors={Colors.book.shelfGradient} style={styles.container}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.topBar}>
          <Pressable
            style={styles.backButton}
            onPress={() => router.replace(`/(book)/${cookbookId}`)}
            accessibilityLabel="Back to cookbook"
          >
            <ChevronLeft size={20} color={Colors.text} />
          </Pressable>
          <View style={styles.heading}>
            <Text style={styles.eyebrow}>Add page</Text>
            <Text style={styles.title} numberOfLines={2} adjustsFontSizeToFit>
              Add a page to {cookbookTitle}
            </Text>
          </View>
        </View>

        {isParsing ? (
          <ExtractingRecipeStages running={isParsing} />
        ) : (
          <AddPageComposer
            isSubmitting={isParsing}
            sourceHint={sourceHint}
            onSubmit={async (payload) => {
              setError(null);
              try {
                await parseSource(payload);
                router.push(`/(book)/${cookbookId}/review`);
              } catch (err) {
                const message = err instanceof Error ? err.message : 'Could not read that recipe.';
                setError(message);
                Alert.alert('Recipe import failed', message);
              }
            }}
          />
        )}
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
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  heading: {
    flex: 1,
  },
  eyebrow: {
    color: Colors.textMuted,
    fontSize: 11,
    fontFamily: Fonts.ui.medium,
  },
  title: {
    color: Colors.text,
    fontFamily: Fonts.display.bold,
    fontSize: 30,
    lineHeight: 36,
  },
  error: {
    color: Colors.onError,
    backgroundColor: Colors.error,
    borderRadius: 8,
    padding: Spacing.md,
    overflow: 'hidden',
  },
});
