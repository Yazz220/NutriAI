import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { Colors } from '@/constants/colors';
import { Spacing, Typography } from '@/constants/spacing';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

interface RenameFolderSheetProps {
  visible: boolean;
  defaultName: string;
  onClose: () => void;
  onRename: (name: string) => void;
  existingNames?: string[];
}

const RenameFolderSheet: React.FC<RenameFolderSheetProps> = ({ visible, defaultName, onClose, onRename, existingNames = [] }) => {
  const [name, setName] = useState(defaultName);
  const [error, setError] = useState('');
  const [isValid, setIsValid] = useState(false);

  const validate = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return { ok: false, msg: 'Folder name is required' };
    if (trimmed.length > 30) return { ok: false, msg: 'Max 30 characters' };
    if (!/^[A-Za-z0-9][A-Za-z0-9 \-]*$/.test(trimmed)) return { ok: false, msg: 'Use letters, numbers, spaces, hyphens' };
    const exists = existingNames.map(n => n.trim().toLowerCase()).includes(trimmed.toLowerCase());
    // Allow unchanged name
    if (exists && trimmed.toLowerCase() !== (defaultName || '').trim().toLowerCase()) return { ok: false, msg: 'A folder with this name already exists' };
    return { ok: true, msg: '' };
  };

  useEffect(() => {
    if (visible) {
      setName(defaultName || '');
      const v = validate(defaultName || '');
      setIsValid(v.ok);
      setError('');
    }
  }, [visible, defaultName]);

  const handleRename = () => {
    const v = validate(name);
    if (!v.ok) { setError(v.msg); setIsValid(false); return; }
    setError('');
    onRename(name.trim());
  };

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.container}>
            <Text style={styles.title}>Rename Folder</Text>
            <Input
              label="Folder name"
              value={name}
              onChangeText={(t) => { setName(t); const v = validate(t); setIsValid(v.ok); setError(v.ok ? '' : v.msg); }}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleRename}
            />
            {!!error && <Text style={styles.error}>{error}</Text>}
            <View style={styles.actions}>
              <Button title="Cancel" variant="outline" onPress={onClose} style={{ marginRight: Spacing.sm }} />
              <Button title="Rename" onPress={handleRename} disabled={!isValid} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  container: { backgroundColor: Colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.lg },
  title: { fontSize: Typography.sizes.lg, fontWeight: '600', color: Colors.text, marginBottom: Spacing.md },
  error: { color: Colors.danger, marginTop: 6 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: Spacing.md },
});

export default RenameFolderSheet;
