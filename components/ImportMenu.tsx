import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { X, Link, Film, Image as ImageIcon, Type } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { Spacing, Typography } from '@/constants/spacing';

export type ImportType = 'link' | 'video' | 'image' | 'text';

interface ImportMenuProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (type: ImportType) => void;
}

const options = [
  { type: 'text' as ImportType, label: 'Text', icon: Type },
  { type: 'image' as ImportType, label: 'Image', icon: ImageIcon },
  { type: 'video' as ImportType, label: 'Video', icon: Film },
  { type: 'link' as ImportType, label: 'Link', icon: Link },
];

export const ImportMenu: React.FC<ImportMenuProps> = ({ visible, onClose, onSelect }) => {
  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>Add a recipe using</Text>
          <View style={styles.optionsGrid}>
            {options.map(({ type, label, icon: Icon }) => (
              <TouchableOpacity key={type} style={styles.optionButton} onPress={() => onSelect(type)}>
                <View style={styles.iconContainer}>
                  <Icon color={Colors.primary} size={32} />
                </View>
                <Text style={styles.optionLabel}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  container: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  title: {
    fontSize: Typography.sizes.lg,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.lg,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    width: '100%',
  },
  optionButton: {
    alignItems: 'center',
    width: '25%',
    marginBottom: Spacing.md,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  optionLabel: {
    fontSize: Typography.sizes.sm,
    color: Colors.text,
  },
  cancelButton: {
    marginTop: Spacing.md,
    paddingVertical: Spacing.md,
    width: '100%',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cancelButtonText: {
    fontSize: Typography.sizes.md,
    fontWeight: '600',
    color: Colors.primary,
  },
});
