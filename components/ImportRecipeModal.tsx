import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, ActivityIndicator, Alert, TextInput } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Colors } from '@/constants/colors';
import { Spacing, Typography } from '@/constants/spacing';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { importRecipeFromUrl, importRecipeFromText, importRecipeFromImage } from '@/utils/recipeImport';
import { Meal } from '@/types';

interface ImportRecipeModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (meal: Omit<Meal, 'id'>) => void;
}

export const ImportRecipeModal: React.FC<ImportRecipeModalProps> = ({ visible, onClose, onSave }) => {
  const [activeTab, setActiveTab] = useState<'url' | 'text' | 'image'>('url');
  const [url, setUrl] = useState('');
  const [rawText, setRawText] = useState('');
  const [pickedImage, setPickedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [preview, setPreview] = useState<null | {
    name: string;
    description?: string;
    image?: string;
    ingredients: Array<{ name: string; quantity: number; unit: string; optional?: boolean }>;
    steps: string[];
    tags: string[];
    prepTime?: number;
    cookTime?: number;
    servings?: number;
  }>(null);

  if (!visible) return null;

  const handleImport = async () => {
    setIsLoading(true);
    try {
      let data;
      if (activeTab === 'url') {
        data = await importRecipeFromUrl(url.trim());
      } else if (activeTab === 'text') {
        data = await importRecipeFromText(rawText.trim());
      } else {
        if (!pickedImage) throw new Error('No image selected');
        // Convert file URI to base64 data URL
        const base64 = await FileSystem.readAsStringAsync(pickedImage, { encoding: FileSystem.EncodingType.Base64 });
        const ext = pickedImage.split('.').pop()?.toLowerCase();
        const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
        const dataUrl = `data:${mime};base64,${base64}`;
        data = await importRecipeFromImage(dataUrl);
      }
      setPreview(data);
      if (!data.ingredients?.length && activeTab === 'url') {
        // Prompt to try AI text if URL failed
        Alert.alert('Heads up', 'This page didn\'t expose a recipe. If you can paste the recipe text or transcript, try the Text tab.');
      }
    } catch (e) {
      const msg = activeTab === 'url' ? 'Could not parse the recipe from this URL.' : activeTab === 'text' ? 'Could not parse the provided text.' : 'Could not parse the selected image.';
      Alert.alert('Import failed', msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow photo library access to import from image.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.9 });
    if (!result.canceled && result.assets?.length) {
      const uri = result.assets[0].uri;
      setActiveTab('image');
      setPickedImage(uri);
      setPreview(null);
      // Auto-start analysis for better UX
      try {
        setIsLoading(true);
        const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
        const ext = uri.split('.').pop()?.toLowerCase();
        const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
        const dataUrl = `data:${mime};base64,${base64}`;
        const data = await importRecipeFromImage(dataUrl);
        setPreview(data);
      } catch (e) {
        Alert.alert('Import failed', 'Could not parse the selected image.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleSave = () => {
    if (!preview) return;
    const meal: Omit<Meal, 'id'> = {
      name: preview.name,
      description: preview.description || '',
      image: preview.image,
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
        <ScrollView keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Import Recipe</Text>

          <View style={styles.tabRow}>
            <TouchableOpacity style={[styles.tabBtn, activeTab === 'url' && styles.tabBtnActive]} onPress={() => setActiveTab('url')}>
              <Text style={[styles.tabText, activeTab === 'url' && styles.tabTextActive]}>From URL</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tabBtn, activeTab === 'text' && styles.tabBtnActive]} onPress={() => setActiveTab('text')}>
              <Text style={[styles.tabText, activeTab === 'text' && styles.tabTextActive]}>From Text</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tabBtn, activeTab === 'image' && styles.tabBtnActive]} onPress={() => setActiveTab('image')}>
              <Text style={[styles.tabText, activeTab === 'image' && styles.tabTextActive]}>From Image</Text>
            </TouchableOpacity>
          </View>

          {activeTab === 'url' ? (
            <>
              <Input
                placeholder="Paste recipe URL (TikTok, website, etc.)"
                value={url}
                onChangeText={setUrl}
                autoCapitalize="none"
                keyboardType="url"
                autoCorrect={false}
              />
              <Button title={isLoading ? 'Importing…' : 'Import'} onPress={handleImport} disabled={isLoading || !url.trim()} />
            </>
          ) : activeTab === 'text' ? (
            <>
              <Text style={styles.helpText}>Paste any recipe text, transcript, or notes. We\'ll parse ingredients and steps.</Text>
              <TextInput
                value={rawText}
                onChangeText={setRawText}
                multiline
                placeholder="e.g. Title, ingredients list, step-by-step instructions…"
                style={styles.textArea}
              />
              <Button title={isLoading ? 'Parsing…' : 'Parse Text'} onPress={handleImport} disabled={isLoading || !rawText.trim()} />
            </>
          ) : (
            <>
              <Text style={styles.helpText}>Pick a screenshot or photo of a recipe. We\'ll OCR and parse it.</Text>
              {pickedImage ? (
                <Image source={{ uri: pickedImage }} style={styles.previewImage} />
              ) : null}
              <View style={{ flexDirection: 'row' }}>
                <View style={{ marginRight: Spacing.sm }}>
                  <Button title="Choose Photo" onPress={handlePickImage} variant="outline" />
                </View>
                <Button title={isLoading ? 'Parsing…' : 'Import'} onPress={handleImport} disabled={isLoading || !pickedImage} />
              </View>
            </>
          )}

          {isLoading && <ActivityIndicator style={{ marginTop: Spacing.md }} />}

          {preview && (
            <Card style={{ marginTop: Spacing.lg }}>
              {preview.image && (
                <Image source={{ uri: preview.image }} style={{ width: '100%', height: 180, borderRadius: 8 }} />
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
  tabRow: { flexDirection: 'row', backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, overflow: 'hidden', marginBottom: Spacing.md },
  tabBtn: { flex: 1, paddingVertical: Spacing.sm, alignItems: 'center', backgroundColor: Colors.white },
  tabBtnActive: { backgroundColor: Colors.primary + '20' },
  tabText: { color: Colors.lightText, fontWeight: '600' },
  tabTextActive: { color: Colors.primary },
  helpText: { color: Colors.lightText, marginBottom: Spacing.sm },
  textArea: { minHeight: 140, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.white, borderRadius: 8, padding: 10, textAlignVertical: 'top', color: Colors.text, marginBottom: Spacing.sm },
  previewImage: { width: '100%', height: 200, borderRadius: 8, marginBottom: Spacing.sm, backgroundColor: Colors.tabBackground },
  previewName: { marginTop: Spacing.md, fontSize: Typography.sizes.lg, fontWeight: '600', color: Colors.text },
  previewDesc: { color: Colors.lightText, marginTop: 4 },
  sectionTitle: { marginTop: Spacing.md, fontWeight: '600', color: Colors.text },
  ingredient: { color: Colors.text, marginTop: 4 },
  step: { color: Colors.text, marginTop: 4 },
  closeBtn: { alignSelf: 'center', padding: Spacing.md },
  closeText: { color: Colors.primary, fontWeight: '600' },
});


