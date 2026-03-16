import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Colors } from '@/constants/colors';
import { Typography as Type } from '@/constants/typography';
import { X, Clock, Users, FileText } from 'lucide-react-native';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import { Button } from '@/components/ui/Button';
import { Meal } from '@/types';

interface EditRecipeModalProps {
  visible: boolean;
  recipe: Meal | null;
  onClose: () => void;
  onSave: (updated: Meal) => void;
}

export const EditRecipeModal: React.FC<EditRecipeModalProps> = ({ visible, recipe, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [servings, setServings] = useState('');
  const [prepTime, setPrepTime] = useState('');
  const [cookTime, setCookTime] = useState('');
  const [tags, setTags] = useState('');

  useEffect(() => {
    if (recipe && visible) {
      setName(recipe.name ?? '');
      setDescription(recipe.description ?? '');
      setServings(String(recipe.servings ?? 1));
      setPrepTime(String(recipe.prepTime ?? 0));
      setCookTime(String(recipe.cookTime ?? 0));
      setTags((recipe.tags ?? []).join(', '));
    }
  }, [recipe, visible]);

  const handleSave = () => {
    if (!recipe || !name.trim()) return;
    const updated: Meal = {
      ...recipe,
      name: name.trim(),
      description: description.trim(),
      servings: Math.max(1, parseInt(servings, 10) || 1),
      prepTime: Math.max(0, parseInt(prepTime, 10) || 0),
      cookTime: Math.max(0, parseInt(cookTime, 10) || 0),
      tags: tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    };
    onSave(updated);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.container}>
          <ExpoLinearGradient
            colors={Colors.chart.gradients.secondary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.header}
          >
            <View style={styles.headerRow}>
              <Text style={styles.headerTitle}>Edit Recipe</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn} accessibilityLabel="Close">
                <X size={22} color={Colors.white} />
              </TouchableOpacity>
            </View>
          </ExpoLinearGradient>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={styles.label}>Name</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Recipe name" placeholderTextColor={Colors.lightText} />

            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Short description"
              placeholderTextColor={Colors.lightText}
              multiline
              numberOfLines={3}
            />

            <View style={styles.row}>
              <View style={styles.halfField}>
                <View style={styles.labelRow}>
                  <Users size={14} color={Colors.primary} />
                  <Text style={styles.label}>Servings</Text>
                </View>
                <TextInput style={styles.input} value={servings} onChangeText={setServings} keyboardType="number-pad" placeholder="1" placeholderTextColor={Colors.lightText} />
              </View>
              <View style={styles.halfField}>
                <View style={styles.labelRow}>
                  <Clock size={14} color={Colors.primary} />
                  <Text style={styles.label}>Prep (min)</Text>
                </View>
                <TextInput style={styles.input} value={prepTime} onChangeText={setPrepTime} keyboardType="number-pad" placeholder="0" placeholderTextColor={Colors.lightText} />
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.halfField}>
                <View style={styles.labelRow}>
                  <Clock size={14} color={Colors.primary} />
                  <Text style={styles.label}>Cook (min)</Text>
                </View>
                <TextInput style={styles.input} value={cookTime} onChangeText={setCookTime} keyboardType="number-pad" placeholder="0" placeholderTextColor={Colors.lightText} />
              </View>
              <View style={styles.halfField}>
                <View style={styles.labelRow}>
                  <FileText size={14} color={Colors.primary} />
                  <Text style={styles.label}>Tags</Text>
                </View>
                <TextInput style={styles.input} value={tags} onChangeText={setTags} placeholder="healthy, quick" placeholderTextColor={Colors.lightText} />
              </View>
            </View>

            <View style={styles.footer}>
              <Button title="Save Changes" onPress={handleSave} disabled={!name.trim()} />
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    overflow: 'hidden',
  },
  header: {
    paddingTop: 16,
    paddingBottom: 14,
    paddingHorizontal: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    ...Type.h3,
    color: Colors.white,
  },
  closeBtn: {
    padding: 4,
  },
  body: {
    padding: 20,
  },
  label: {
    ...Type.caption,
    color: Colors.text,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 14,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  input: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: Colors.text,
    fontSize: 15,
  },
  textArea: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfField: {
    flex: 1,
  },
  footer: {
    marginTop: 24,
    marginBottom: 32,
  },
});
