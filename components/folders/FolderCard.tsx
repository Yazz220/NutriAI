import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MoreHorizontal } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';

export interface FolderCardProps {
  name: string;
  count: number;
  onPress?: () => void;
  onMore?: () => void;
  active?: boolean;
}

export const FolderCard: React.FC<FolderCardProps> = ({ name, count, onPress, onMore, active }) => {
  return (
    <TouchableOpacity style={[styles.container, active && styles.containerActive]} onPress={onPress} activeOpacity={0.9}>
      <Text style={[styles.name, active && styles.nameActive]} numberOfLines={1}>{name}</Text>
      <View style={styles.rightSide}>
        <View style={[styles.countBadge, active && styles.countBadgeActive]}>
          <Text style={[styles.countText, active && styles.countTextActive]}>{count}</Text>
        </View>
        {onMore && (
          <TouchableOpacity onPress={onMore} style={styles.moreBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MoreHorizontal size={16} color={active ? Colors.white : Colors.lightText} />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    marginRight: Spacing.sm,
    minHeight: 36,
  },
  containerActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  name: {
    maxWidth: 140,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  nameActive: {
    color: Colors.white,
  },
  rightSide: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: Spacing.sm,
  },
  countBadge: {
    minWidth: 22,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  countBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderColor: 'rgba(255,255,255,0.22)',
  },
  countText: {
    fontSize: 11,
    color: Colors.lightText,
    fontWeight: '600',
  },
  countTextActive: {
    color: Colors.white,
  },
  moreBtn: {
    padding: 4,
    marginLeft: Spacing.xs,
  },
});
