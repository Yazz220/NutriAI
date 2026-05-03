import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { BookOpen, Plus, Settings, Share } from 'lucide-react-native';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Radii, Spacing } from '@/constants/spacing';

interface PageControlsProps {
  pageLabel: string;
  onToc: () => void;
  onAdd: () => void;
  onShare: () => void;
  onSettings: () => void;
}

export function PageControls({ pageLabel, onToc, onAdd, onShare, onSettings }: PageControlsProps) {
  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.iconButton} onPress={onToc} accessibilityLabel="Open table of contents">
        <BookOpen size={20} color={Colors.text} />
      </TouchableOpacity>
      <Text style={styles.pageLabel}>{pageLabel}</Text>
      <TouchableOpacity style={styles.iconButton} onPress={onAdd} accessibilityLabel="Add page">
        <Plus size={20} color={Colors.text} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.iconButton} onPress={onShare} accessibilityLabel="Share page">
        <Share size={20} color={Colors.text} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.iconButton} onPress={onSettings} accessibilityLabel="Open settings">
        <Settings size={20} color={Colors.text} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radii.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageLabel: {
    flex: 1,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
