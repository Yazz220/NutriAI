import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';

interface NewFolderModalProps {
  visible: boolean;
  defaultName?: string;
  mode?: 'create' | 'rename';
  onClose: () => void;
  onSubmit: (name: string) => void;
}

export const NewFolderModal: React.FC<NewFolderModalProps> = ({
  visible,
  defaultName = '',
  mode = 'create',
  onClose,
  onSubmit,
}) => {
  const [name, setName] = useState(defaultName);
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) {
      setName(defaultName);
      setError('');
    }
  }, [visible, defaultName]);

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Folder name is required');
      return;
    }
    if (trimmed.length > 40) {
      setError('Folder name is too long');
      return;
    }
    onSubmit(trimmed);
  };

  return (
    <Modal visible={visible} onClose={onClose} title={mode === 'create' ? 'New Folder' : 'Rename Folder'}>
      <View style={styles.container}>
        <Input
          label="Folder name"
          value={name}
          onChangeText={setName}
          placeholder="e.g., Breakfast"
        />
        {!!error && <Text style={styles.error}>{error}</Text>}
        <View style={styles.actions}>
          <Button title="Cancel" onPress={onClose} variant="secondary" style={{ marginRight: Spacing.sm }} />
          <Button title={mode === 'create' ? 'Create' : 'Rename'} onPress={handleSubmit} />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: Spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: Spacing.md,
  },
  error: {
    color: Colors.danger,
    marginTop: 6,
  },
});
