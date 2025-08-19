import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { X, Link, Film, Image as ImageIcon, Type } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { Spacing, Typography } from '@/constants/spacing';
import { ImportType } from './ImportMenu';

interface ImportFlowModalProps {
  visible: boolean;
  importType: ImportType | null;
  onClose: () => void;
  onImport: (type: ImportType, data: any) => void;
  isLoading: boolean;
}

const importConfig = {
  link: { title: 'Import from Link', placeholder: 'Enter recipe URL', icon: Link },
  video: { title: 'Import from Video', placeholder: 'Enter video URL', icon: Film },
  image: { title: 'Import from Image', placeholder: 'Image selected', icon: ImageIcon },
  text: { title: 'Import from Text', placeholder: 'Paste your recipe text here', icon: Type },
};

export const ImportFlowModal: React.FC<ImportFlowModalProps> = ({ visible, importType, onClose, onImport, isLoading }) => {
  const [inputValue, setInputValue] = useState('');

  if (!importType) return null;

  const config = importConfig[importType];

  const handleImport = () => {
    onImport(importType, inputValue);
    setInputValue('');
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>{config.title}</Text>
            <TouchableOpacity onPress={onClose}>
              <X color={Colors.text} size={24} />
            </TouchableOpacity>
          </View>

          {importType === 'image' ? (
            <TouchableOpacity style={styles.imagePicker} onPress={() => onImport('image', null)}>
              <ImageIcon color={Colors.primary} size={48} />
              <Text style={styles.imagePickerText}>Tap to select an image</Text>
            </TouchableOpacity>
          ) : (
            <TextInput
              style={styles.input}
              placeholder={config.placeholder}
              value={inputValue}
              onChangeText={setInputValue}
              multiline={importType === 'text'}
              numberOfLines={importType === 'text' ? 10 : 1}
            />
          )}

          <TouchableOpacity style={styles.importButton} onPress={handleImport} disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.importButtonText}>Import Recipe</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  container: {
    width: '90%',
    backgroundColor: Colors.background,
    borderRadius: 24,
    padding: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: Typography.sizes.lg,
    fontWeight: '600',
    color: Colors.text,
  },
  input: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: Spacing.md,
    fontSize: Typography.sizes.md,
    borderColor: Colors.border,
    borderWidth: 1,
    minHeight: 50,
    textAlignVertical: 'top',
  },
  importButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  importButtonText: {
    color: Colors.white,
    fontSize: Typography.sizes.md,
    fontWeight: '600',
  },
  imagePicker: {
    height: 200,
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  imagePickerText: {
    marginTop: Spacing.sm,
    color: Colors.primary,
    fontSize: Typography.sizes.md,
  },
});
