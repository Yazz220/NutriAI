import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, ActivityIndicator, Alert } from 'react-native';
import { Colors } from '@/constants/colors';
import { Spacing, Typography } from '@/constants/spacing';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { importRecipeFromUrl } from '@/utils/recipeImport';
import { Meal } from '@/types';

interface ImportRecipeModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (meal: Omit<Meal, 'id'>) => void;
}

export const ImportRecipeModal: React.FC<ImportRecipeModalProps> = ({ visible, onClose, onSave }) => {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [preview, setPreview] = useState<null | {
    name: string;
    description?: string;
    imageUrl?: string;
    ingredients: Array<{ name: string; quantity: number; unit: string; optional: boolean }>;
    steps: string[];
    tags: string[];
    prepTime?: number;
    cookTime?: number;
    servings?: number;
  }>(null);

  if (!visible) return null;

  const handleImport = async () => {
    if (!url) return;
    setIsLoading(true);
    try {
      const data = await importRecipeFromUrl(url);
      setPreview(data);
    } catch (e) {
      Alert.alert('Import failed', 'Could not parse the recipe from this URL.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = () => {
    if (!preview) return;
    const meal: Omit<Meal, 'id'> = {
      name: preview.name,
      description: preview.description || '',
      imageUrl: preview.imageUrl,
      tags: preview.tags,
      ingredients: preview.ingredients.map(i => ({ name: i.name, quantity: i.quantity, unit: i.unit, optional: i.optional })),
      steps: preview.steps.length ? preview.steps : ['Imported from URL'],
      prepTime: preview.prepTime || 10,
      cookTime: preview.cookTime || 10,
      servings: preview.servings || 2,
      nutritionPerServing: { calories: 0, protein: 0, carbs: 0, fats: 0 },
    };
    onSave(meal);
    onClose();
  };

  return (
    <View style={styles.overlay}>
      <View style={styles.container}>
        <ScrollView>
          <Text style={styles.title}>Import Recipe</Text>
          <Input
            placeholder="Paste recipe URL"
            value={url}
            onChangeText={setUrl}
            autoCapitalize="none"
            keyboardType="url"
            autoCorrect={false}
          />
          <Button title={isLoading ? 'Importing…' : 'Import'} onPress={handleImport} disabled={isLoading || !url} />

          {isLoading && <ActivityIndicator style={{ marginTop: Spacing.md }} />}

          {preview && (
            <Card style={{ marginTop: Spacing.lg }}>
              {preview.imageUrl && (
                <Image source={{ uri: preview.imageUrl }} style={{ width: '100%', height: 180, borderRadius: 8 }} />
              )}
              <Text style={styles.previewName}>{preview.name}</Text>
              {preview.description ? <Text style={styles.previewDesc}>{preview.description}</Text> : null}
              <Text style={styles.sectionTitle}>Ingredients</Text>
              {preview.ingredients.length ? (
                preview.ingredients.map((i, idx) => (
                  <Text key={idx} style={styles.ingredient}>{i.quantity} {i.unit} {i.name}</Text>
                ))
              ) : (
                <Text style={styles.previewDesc}>No ingredients parsed</Text>
              )}
              <Text style={styles.sectionTitle}>Steps</Text>
              {preview.steps.length ? (
                preview.steps.map((s, idx) => (
                  <Text key={idx} style={styles.step}>{idx + 1}. {s}</Text>
                ))
              ) : (
                <Text style={styles.previewDesc}>No steps parsed</Text>
              )}
              <Button title="Save to Library" onPress={handleSave} style={{ marginTop: Spacing.md }} />
            </Card>
          )}
        </ScrollView>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <Text style={styles.closeText}>Close</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  container: { maxHeight: '85%', backgroundColor: Colors.background, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: Spacing.lg },
  title: { fontSize: Typography.sizes.xl, fontWeight: '600', color: Colors.text, marginBottom: Spacing.md },
  previewName: { marginTop: Spacing.md, fontSize: Typography.sizes.lg, fontWeight: '600', color: Colors.text },
  previewDesc: { color: Colors.lightText, marginTop: 4 },
  sectionTitle: { marginTop: Spacing.md, fontWeight: '600', color: Colors.text },
  ingredient: { color: Colors.text, marginTop: 4 },
  step: { color: Colors.text, marginTop: 4 },
  closeBtn: { alignSelf: 'center', padding: Spacing.md },
  closeText: { color: Colors.primary, fontWeight: '600' },
});


