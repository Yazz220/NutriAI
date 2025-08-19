import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { Colors } from '@/constants/colors';
import { Spacing, Typography } from '@/constants/spacing';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

interface CreateFolderSheetProps {
  visible: boolean;
  onClose: () => void;
  onCreate: (name: string) => void;
  existingNames?: string[];
}

export const CreateFolderSheet: React.FC<CreateFolderSheetProps> = ({ visible, onClose, onCreate, existingNames = [] }) => {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isValid, setIsValid] = useState(false);

  const validate = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return { ok: false, msg: 'Folder name is required' };
    if (trimmed.length > 30) return { ok: false, msg: 'Max 30 characters' };
    if (!/^[A-Za-z0-9][A-Za-z0-9 \-]*$/.test(trimmed)) return { ok: false, msg: 'Use letters, numbers, spaces, hyphens' };
    const exists = existingNames.map(n => n.trim().toLowerCase()).includes(trimmed.toLowerCase());
    if (exists) return { ok: false, msg: 'A folder with this name already exists' };
    return { ok: true, msg: '' };
  };

  useEffect(() => {
    if (visible) {
      setName('');
      setError('');
      setIsValid(false);
    }
  }, [visible]);

  const handleCreate = () => {
    const v = validate(name);
    if (!v.ok) { setError(v.msg); setIsValid(false); return; }
    setError('');
    onCreate(name.trim());
  };

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.container}>
            <Text style={styles.title}>Create Folder</Text>
            <Input
              label="Folder name"
              value={name}
              onChangeText={(t) => { setName(t); const v = validate(t); setIsValid(v.ok); setError(v.ok ? '' : v.msg); }}
              placeholder="e.g., Breakfast"
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleCreate}
            />
            {!!error && <Text style={styles.error}>{error}</Text>}
            <View style={styles.actions}>
              <Button title="Cancel" variant="outline" onPress={onClose} style={{ marginRight: Spacing.sm }} />
              <Button title="Create" onPress={handleCreate} disabled={!isValid} />
            </View>
          </View>
        </KeyboardAvoidingView>
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
  },
  title: {
    fontSize: Typography.sizes.lg,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  error: {
    color: Colors.danger,
    marginTop: 6,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: Spacing.md,
  },
});

export default CreateFolderSheet;
