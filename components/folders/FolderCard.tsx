import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Folder, MoreHorizontal } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';

interface FolderCardProps {
  name: string;
  count: number;
  onPress?: () => void;
  onMore?: () => void;
}

export const FolderCard: React.FC<FolderCardProps> = ({ name, count, onPress, onMore }) => {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={styles.iconWrap}>
        <Folder size={20} color={Colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.name} numberOfLines={1}>{name}</Text>
        <Text style={styles.count}>{count} {count === 1 ? 'recipe' : 'recipes'}</Text>
      </View>
      {onMore && (
        <TouchableOpacity onPress={onMore} style={styles.moreBtn}>
          <MoreHorizontal size={18} color={Colors.lightText} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    marginRight: Spacing.sm,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#EAF7F4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  count: {
    fontSize: 12,
    color: Colors.lightText,
    marginTop: 2,
  },
  moreBtn: {
    marginLeft: Spacing.sm,
    padding: 6,
  },
});
