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
  existingNames?: string[];
}

export const NewFolderModal: React.FC<NewFolderModalProps> = ({
  visible,
  defaultName = '',
  mode = 'create',
  onClose,
  onSubmit,
  existingNames = [],
}) => {
  const [name, setName] = useState(defaultName);
  const [error, setError] = useState('');
  const [isValid, setIsValid] = useState(false);

  const validate = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return { ok: false, msg: 'Folder name is required' };
    if (trimmed.length > 30) return { ok: false, msg: 'Max 30 characters' };
    if (!/^[A-Za-z0-9][A-Za-z0-9 \-]*$/.test(trimmed)) return { ok: false, msg: 'Use letters, numbers, spaces, hyphens' };
    const exists = existingNames.map(n => n.trim().toLowerCase()).includes(trimmed.toLowerCase());
    if (exists && trimmed.toLowerCase() !== defaultName.trim().toLowerCase()) return { ok: false, msg: 'A folder with this name already exists' };
    return { ok: true, msg: '' };
  };

  useEffect(() => {
    if (visible) {
      setName(defaultName);
      setError('');
      const v = validate(defaultName);
      setIsValid(v.ok);
    }
  }, [visible, defaultName]);

  const handleSubmit = () => {
    const v = validate(name);
    if (!v.ok) { setError(v.msg); setIsValid(false); return; }
    setError('');
    onSubmit(name.trim());
  };

  return (
    <Modal visible={visible} onClose={onClose} title={mode === 'create' ? 'New Folder' : 'Rename Folder'} variant="outline" size="lg" scrollable={false}>
      <View style={styles.container}>
        <Input
          label="Folder name"
          value={name}
          onChangeText={(t) => {
            setName(t);
            const v = validate(t);
            setIsValid(v.ok); setError(v.ok ? '' : v.msg);
          }}
          placeholder="e.g., Breakfast"
          autoFocus
          returnKeyType="done"
          onSubmitEditing={handleSubmit}
        />
        {!!error && <Text style={styles.error}>{error}</Text>}
        <View style={styles.actions}>
          <Button title="Cancel" onPress={onClose} variant="outline" style={{ marginRight: Spacing.sm }} />
          <Button title={mode === 'create' ? 'Create' : 'Rename'} onPress={handleSubmit} disabled={!isValid} />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: Spacing.md,
    gap: 12,
  },
  error: {
    color: Colors.danger,
    marginTop: 6,
  },
});
