import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { BookOpen, Settings, Share } from 'lucide-react-native';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Radii, Spacing } from '@/constants/spacing';

interface PageControlsProps {
  pageLabel: string;
  onToc: () => void;
  onShare: () => void;
  onSettings: () => void;
}

export function PageControls({ pageLabel, onToc, onShare, onSettings }: PageControlsProps) {
  return (
    <View style={styles.container}>
      <Pressable style={styles.iconButton} onPress={onToc} accessibilityLabel="Open table of contents">
        <BookOpen size={19} color={Colors.text} />
      </Pressable>
      <Text style={styles.pageLabel}>{pageLabel}</Text>
      <Pressable style={styles.iconButton} onPress={onShare} accessibilityLabel="Share page">
        <Share size={18} color={Colors.text} />
      </Pressable>
      <Pressable style={styles.iconButton} onPress={onSettings} accessibilityLabel="Open settings">
        <Settings size={18} color={Colors.text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'center',
    minHeight: 48,
    maxWidth: 360,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: 6,
    borderRadius: Radii.lg,
    backgroundColor: 'rgba(255, 249, 239, 0.94)',
    borderWidth: 1,
    borderColor: '#D8BE8E',
    boxShadow: '0 8px 18px rgba(54, 36, 18, 0.12)',
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3E1BF',
  },
  pageLabel: {
    minWidth: 112,
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
});
