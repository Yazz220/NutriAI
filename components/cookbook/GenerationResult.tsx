import React from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { MessageCircle, RefreshCw, Share2 } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { NoshAssistantButton } from '@/components/cookbook/NoshAssistantButton';
import { Colors } from '@/constants/colors';
import { Radii, Spacing, Typography } from '@/constants/spacing';
import type { CookbookPage } from '@/types/cookbook';

interface GenerationResultProps {
  page: CookbookPage;
  isRegenerating?: boolean;
  onKeep: () => void;
  onRegenerate: () => void;
  onExport: () => void;
}

export function GenerationResult({
  page,
  isRegenerating = false,
  onKeep,
  onRegenerate,
  onExport,
}: GenerationResultProps) {
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>Generated page</Text>
        <Text style={styles.title}>{page.title}</Text>
        <View style={styles.preview}>
          {page.imageUrl ? (
            <Image source={{ uri: page.imageUrl }} style={styles.image} resizeMode="contain" />
          ) : (
            <Text style={styles.emptyText}>This page image is still getting ready.</Text>
          )}
        </View>
        <View style={styles.actions}>
          <Button title="Keep" onPress={onKeep} fullWidth />
          <Button
            title={isRegenerating ? 'Regenerating' : 'Regenerate'}
            variant="secondary"
            onPress={onRegenerate}
            disabled={isRegenerating}
            loading={isRegenerating}
            fullWidth
            icon={!isRegenerating ? <RefreshCw size={18} color={Colors.text} /> : undefined}
          />
          <Button
            title="Export"
            variant="secondary"
            onPress={onExport}
            fullWidth
            icon={<Share2 size={18} color={Colors.text} />}
          />
          <View style={styles.askNoshHint}>
            <MessageCircle size={18} color={Colors.textSecondary} />
            <Text style={styles.askNoshText}>Ask Nosh</Text>
          </View>
        </View>
      </ScrollView>
      <NoshAssistantButton page={page} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: 170,
  },
  eyebrow: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.sm,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  title: {
    color: Colors.text,
    fontSize: Typography.sizes.xxl,
    fontWeight: '700',
    marginBottom: Spacing.lg,
  },
  preview: {
    width: '100%',
    aspectRatio: 2 / 3,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.md,
    paddingHorizontal: Spacing.lg,
    textAlign: 'center',
  },
  actions: {
    gap: Spacing.sm,
  },
  askNoshHint: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  askNoshText: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.md,
    fontWeight: '600',
  },
});
