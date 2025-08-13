import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, ActivityIndicator, Alert, TextInput, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Colors } from '@/constants/colors';
import { Spacing, Typography } from '@/constants/spacing';
import { Download, X, ChefHat, Image as ImageIcon, Link, FileText } from 'lucide-react-native';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { importRecipeFromUrl, importRecipeFromText, importRecipeFromImage } from '@/utils/recipeImport';
import { transcribeFromUrl, transcribeFromUri } from '@/utils/sttClient';
import { smartImport } from '@/utils/universalImport';

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
  const [pickedVideo, setPickedVideo] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
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
  const [provenance, setProvenance] = useState<any | null>(null);
  const [improvedPreview, setImprovedPreview] = useState<typeof preview>(null);
  const [showDiff, setShowDiff] = useState(false);

  const isLikelyUrl = useMemo(() => {
    const s = url.trim();
    if (!s) return false;
    try { new URL(s); return true; } catch { return false; }
  }, [url]);

  const isSocialVideoLink = useMemo(() => {
    if (!isLikelyUrl) return false;
    try {
      const u = new URL(url.trim());
      const host = u.hostname.replace(/^www\./, '');
      const path = u.pathname || '';
      // Only treat as social VIDEO when both host matches and path looks like a video permalink
      if (host.includes('tiktok.com') || host.includes('vm.tiktok.com')) {
        return /\/video\//.test(path) || path.length > 1; // vm.tiktok shortlinks redirect
      }
      if (host.includes('instagram.com')) {
        return /\/(reel|reels)\//.test(path);
      }
      if (host.includes('youtube.com')) {
        return /\/(watch|shorts)\//.test(path) || u.searchParams.has('v');
      }
      if (host === 'youtu.be') {
        return path.length > 1; // youtu.be/<id>
      }
      if (host.includes('facebook.com') || host === 'fb.watch') {
        return /\/(reel|watch)\//.test(path) || path.length > 1; // fb.watch/<id>
      }
      // Avoid Pinterest and generic hosts to reduce false positives
      return false;
    } catch { return false; }
  }, [url, isLikelyUrl]);

  // Detector helpers defined above using URL parsing: isLikelyUrl, isSocialVideoLink

  if (!visible) return null;

  // Text preprocessor: remove hashtags/emojis/mentions/urls, normalize spacing and bullets
  const cleanText = (input: string) => {
    let t = input
      // remove URLs
      .replace(/https?:[^\s]+/gi, ' ')
      // remove mentions and hashtags
      .replace(/[@#][\w_]+/g, ' ')
      // remove most emojis (basic range)
      .replace(/[\u{1F300}-\u{1FAFF}\u{1F900}-\u{1F9FF}]/gu, ' ')
      // normalize dashes/bullets
      .replace(/[•\-*·]+/g, '- ')
      // collapse whitespace
      .replace(/\s+/g, ' ')
      .trim();
    return t;
  };

  const handleTranscribeFromUrl = async () => {
    if (!isLikelyUrl) return;
    setIsTranscribing(true);
    try {
      console.log('[ImportRecipeModal] Starting transcription for URL:', url.trim());
      const { text } = await transcribeFromUrl(url.trim(), { language: 'english', response_format: 'json' });
      const cleaned = cleanText(text || '');
      
      if (!cleaned || cleaned.length < 10) {
        throw new Error('No meaningful content transcribed from video');
      }
      
      console.log('[ImportRecipeModal] Transcription successful, length:', cleaned.length);
      
      // Use the smart import system with the transcribed text
      const { recipe, provenance } = await smartImport({ text: cleaned });
      
      if (!recipe) {
        throw new Error('Could not extract recipe from transcribed content');
      }
      
      // Create preview
      const enhancedPreview = {
        ...recipe,
        confidence: 0.8,
        originalUrl: url.trim(),
        extractionMethods: ['Video transcription + rule-based parsing']
      };
      
      setPreview(enhancedPreview);
      setProvenance(provenance || null);
      console.log('[ImportRecipeModal] Transcription and parsing complete');
      
    } catch (e) {
      console.error('[ImportRecipeModal] Transcription failed:', e);
      const errorMessage = e instanceof Error ? e.message : 'Unknown error';
      Alert.alert('Transcription failed', `Could not transcribe this video: ${errorMessage}\n\nTry pasting the recipe text from the video description or take a screenshot instead.`);
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleTranscribePickedVideo = async () => {
    if (!pickedVideo) return;
    setIsTranscribing(true);
    try {
      const ext = pickedVideo.split('.').pop()?.toLowerCase();
      const mime = ext === 'mov' ? 'video/quicktime' : 'video/mp4';
      const { text } = await transcribeFromUri(pickedVideo, 'video.mp4', mime, { language: 'english', response_format: 'json' });
      const cleaned = cleanText(text || '');
      if (!cleaned) throw new Error('Empty transcript');
      const data = await importRecipeFromText(cleaned);
      setPreview(data);
    } catch (e) {
      Alert.alert('Transcription failed', 'We could not transcribe this video. On web, try using the video URL instead.');
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleImport = async () => {
    setIsLoading(true);
    try {
      const input: any = { url: undefined, text: undefined, file: undefined };
      if (isLikelyUrl) input.url = url.trim();
      if (!input.url && url.trim()) input.text = url.trim();
      if (!input.url && !input.text) {
        if (pickedVideo) {
          const ext = pickedVideo.split('.').pop()?.toLowerCase();
          const mime = ext === 'mov' ? 'video/quicktime' : 'video/mp4';
          input.file = { uri: pickedVideo, mime, name: 'video.' + (ext || 'mp4') };
        } else if (pickedImage) {
          const ext = pickedImage.split('.').pop()?.toLowerCase();
          const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
          input.file = { uri: pickedImage, mime, name: 'image.' + (ext || 'jpg') };
        }
      }

      if (!input.url && !input.text && !input.file) {
        Alert.alert('Nothing to import', 'Please paste a URL/text or attach an image/video.');
        return;
      }

      console.log('[ImportRecipeModal] Smart import starting', { hasUrl: !!input.url, hasText: !!input.text, hasFile: !!input.file });
      
      try {
        const { recipe, provenance } = await smartImport(input);
        console.log('[ImportRecipeModal] Smart import complete', { 
          source: provenance?.source, 
          notes: provenance?.parserNotes?.length, 
          confidence: provenance?.confidence
        });
        
        if (!recipe) {
          Alert.alert('No recipe found', 'We could not extract a recipe. If this was a social video, try Transcribe Video or attach a screenshot.');
          return;
        }
        
        // Continue with preview setup and validation
        let enhancedPreview: any = {
          ...recipe,
          confidence: provenance?.confidence || 0.5,
          originalUrl: input.url,
          extractionMethods: provenance?.parserNotes || [],
          validationIssues: [],
          missingIngredients: [],
          inferredQuantities: []
        };

        // Run validation and ingredient recovery
        try {
          const { validateRecipeConsistency } = await import('../utils/aiRecipeParser');
          const parsedRecipe = {
            title: recipe.name,
            ingredients: recipe.ingredients.map((ing: any) => ({
              name: ing.name,
              quantity: ing.quantity,
              unit: ing.unit,
              optional: ing.optional || false,
              confidence: 0.8,
              inferred: false
            })),
            instructions: recipe.steps,
            prepTime: recipe.prepTime,
            cookTime: recipe.cookTime,
            servings: recipe.servings,
            tags: recipe.tags || [],
            confidence: provenance?.confidence || 0.5
          };

          const validationResult = await validateRecipeConsistency(
            parsedRecipe as any,
            input.text || input.url || 'Imported content'
          );

          enhancedPreview.ingredients = validationResult.validatedRecipe.ingredients.map((ing: any) => ({
            ...ing,
            hasIssues: ing.confidence < 0.6 || ing.inferred,
            issues: ing.confidence < 0.6 ? ['Low confidence extraction'] : 
                    ing.inferred ? ['Quantity was inferred'] : []
          }));
          
          enhancedPreview.validationIssues = validationResult.inconsistencies.map((inc: any) => ({
            type: inc.type,
            severity: inc.severity,
            description: inc.description,
            suggestion: inc.suggestion
          }));
          
          enhancedPreview.missingIngredients = validationResult.missingIngredients;
          enhancedPreview.inferredQuantities = validationResult.inferredQuantities;
        } catch (validationError) {
          console.warn('[ImportRecipeModal] Validation failed:', validationError);
        }

        setPreview(enhancedPreview);
        setProvenance(provenance || null);
        
      } catch (importError) {
        console.error('[ImportRecipeModal] Smart import failed:', importError);
        const errorMessage = importError instanceof Error ? importError.message : 'Unknown error occurred';
        Alert.alert('Import Failed', `Could not process this content: ${errorMessage}`);
        return;
      }
      
    } catch (e: any) {
      console.error('[ImportRecipeModal] Smart import failed', e);
      const msg = e?.message || 'Could not import this recipe. Try another source, transcribing the video, or attaching a screenshot.';
      Alert.alert('Import failed', msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Build a textual representation from current preview for AI enrichment
  const buildTextFromRecipe = (r: NonNullable<typeof preview>) => {
    const ingLines = (r.ingredients || []).map(i => `${i.quantity} ${i.unit} ${i.name}${i.optional ? ' (optional)' : ''}`.trim());
    const stepLines = (r.steps || []).map((s, idx) => `${idx + 1}. ${s}`);
    return [r.name, r.description || '', 'Ingredients:', ...ingLines, 'Instructions:', ...stepLines].filter(Boolean).join('\n');
  };

  const handleImproveWithAI = async () => {
    if (!preview) return;
    setIsLoading(true);
    try {
      const { parseRecipeWithAI } = await import('../utils/aiRecipeParser');
      const content = buildTextFromRecipe(preview);
      const parsed = await parseRecipeWithAI(content, { includeNutrition: false, strictValidation: true, useMultiStage: true });
      const improved = {
        name: parsed.title || preview.name,
        description: (parsed as any).description || preview.description,
        image: preview.image,
        ingredients: (parsed.ingredients || []).map((ing: any) => ({
          name: ing.name,
          quantity: typeof ing.quantity === 'number' ? ing.quantity : (parseFloat(String(ing.quantity)) || 0),
          unit: ing.unit || 'pcs',
          optional: !!ing.optional
        })),
        steps: parsed.instructions || [],
        tags: parsed.tags || preview.tags || [],
        prepTime: parsed.prepTime ?? preview.prepTime,
        cookTime: parsed.cookTime ?? preview.cookTime,
        servings: parsed.servings ?? preview.servings,
      } as NonNullable<typeof preview>;
      setImprovedPreview(improved);
      setShowDiff(true);
    } catch (e) {
      console.warn('[ImportRecipeModal] AI improvement failed:', e);
      Alert.alert('Improve with AI failed', 'Could not enhance this recipe right now.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleDiff = () => setShowDiff(v => !v);

  const computeDiffList = (a: string[], b: string[]) => {
    const setA = new Set(a.map(s => s.trim().toLowerCase()));
    const setB = new Set(b.map(s => s.trim().toLowerCase()));
    const removed = a.filter(s => !setB.has(s.trim().toLowerCase()));
    const added = b.filter(s => !setA.has(s.trim().toLowerCase()));
    const unchanged = a.filter(s => setB.has(s.trim().toLowerCase()));
    return { added, removed, unchanged };
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow photo library access to import from image.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.All, quality: 0.9 });
    if (!result.canceled && result.assets?.length) {
      const uri = result.assets[0].uri;
      // Heuristic: decide image vs video by mediaType or file extension
      const isVideo = (result.assets[0] as any).type?.startsWith('video') || /\.(mp4|mov|m4v|webm)$/i.test(uri);
      setPreview(null);
      if (isVideo) {
        setPickedVideo(uri);
        // MVP flow: prompt user to paste caption or take screenshot
        Alert.alert(
          'Video detected',
          'You can transcribe the video to extract the recipe, paste the caption in Text tab, or pick a screenshot.',
          [
            { text: 'Transcribe Video', onPress: () => handleTranscribePickedVideo() },
            { text: 'Paste Caption', onPress: () => setActiveTab('text') },
            { text: 'Pick Screenshot', onPress: () => setActiveTab('image') },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
      } else {
        setActiveTab('image');
        setPickedImage(uri);
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
        {/* Enhanced Header with Gradient */}
        <ExpoLinearGradient
          colors={['#ff9a9e', '#fecfef']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <View style={styles.headerTitleRow}>
              <View style={styles.headerIcon}>
                <Download size={20} color={Colors.white} />
              </View>
              <Text style={styles.title}>Import Recipe</Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X size={20} color={Colors.white} />
            </TouchableOpacity>
          </View>
        </ExpoLinearGradient>

        <ScrollView keyboardShouldPersistTaps="handled" style={styles.scrollContent} showsVerticalScrollIndicator={false}>

          <Input
            placeholder="Paste recipe URL or text (or attach a photo/video)"
            value={url}
            onChangeText={setUrl}
            autoCapitalize="none"
            keyboardType={isLikelyUrl ? 'url' : 'default'}
            autoCorrect={false}
          />
          <Text style={styles.helpText}>Single-button import detects URL, text, image, or video automatically.</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1, marginRight: Spacing.sm }}>
              <Button title={isLoading ? 'Importing…' : 'Smart Import'} onPress={handleImport} disabled={isLoading || (!url.trim() && !pickedImage && !pickedVideo)} />
            </View>
            <Button title="Attach" variant="outline" onPress={handlePickImage} />
          </View>
          {pickedImage ? (
            <Image source={{ uri: pickedImage }} style={styles.previewImage} />
          ) : null}
          {!!pickedVideo && (
            <Text style={styles.helpText}>Video attached. You can also transcribe it for better accuracy.</Text>
          )}
          {isSocialVideoLink ? (
            <>
              <Text style={styles.helpText}>
                Detected social video link. For best results, use "Transcribe Video" to extract audio, 
                or copy the recipe text from the video description/comments.
              </Text>
              <View style={{ marginTop: Spacing.xs }}>
                <Button 
                  title={isTranscribing ? 'Transcribing…' : 'Transcribe Video'} 
                  onPress={handleTranscribeFromUrl} 
                  disabled={isTranscribing || !url.trim()} 
                />
              </View>
            </>
          ) : null}

          {(isLoading || isTranscribing) && <ActivityIndicator style={{ marginTop: Spacing.md }} />}

          {preview && (
            <Card style={{ marginTop: Spacing.lg }}>
              {preview.image && (
                <Image source={{ uri: preview.image }} style={{ width: '100%', height: 180, borderRadius: 8 }} />
              )}
              <Text style={styles.previewName}>{(showDiff && improvedPreview ? improvedPreview.name : preview.name)}</Text>
              {preview.description ? <Text style={styles.previewDesc}>{preview.description}</Text> : null}
              {/* Provenance banner */}
              {provenance && (
                <View style={styles.provBanner}>
                  {!!provenance.policy && (
                    <Text style={styles.provBadge}>Policy: {String(provenance.policy)}</Text>
                  )}
                  {!!provenance.extractionMethod && (
                    <Text style={styles.provBadge}>Extracted: {String(provenance.extractionMethod)}</Text>
                  )}
                  {typeof provenance.confidence === 'number' && (
                    <Text style={styles.provBadge}>Confidence: {provenance.confidence.toFixed(2)}</Text>
                  )}
                </View>
              )}
              <Text style={styles.sectionTitle}>Ingredients</Text>
              {(() => {
                const baseList = preview.ingredients.map(i => `${i.quantity} ${i.unit} ${i.name}`.trim());
                const impList = (improvedPreview?.ingredients || []).map(i => `${i.quantity} ${i.unit} ${i.name}`.trim());
                if (showDiff && improvedPreview) {
                  const { added, removed, unchanged } = computeDiffList(baseList, impList);
                  return (
                    <View>
                      {removed.map((s, idx) => (<Text key={`r-${idx}`} style={styles.diffRemoved}>- {s}</Text>))}
                      {unchanged.map((s, idx) => (<Text key={`u-${idx}`} style={styles.ingredient}>{s}</Text>))}
                      {added.map((s, idx) => (<Text key={`a-${idx}`} style={styles.diffAdded}>+ {s}</Text>))}
                    </View>
                  );
                }
                const list = (improvedPreview && !showDiff) ? impList : baseList;
                return list.length ? list.map((s, idx) => (<Text key={idx} style={styles.ingredient}>{s}</Text>)) : (<Text style={styles.previewDesc}>No ingredients parsed</Text>);
              })()}
              <Text style={styles.sectionTitle}>Steps</Text>
              {(() => {
                const baseSteps = preview.steps;
                const impSteps = improvedPreview?.steps || [];
                if (showDiff && improvedPreview) {
                  const { added, removed, unchanged } = computeDiffList(baseSteps, impSteps);
                  return (
                    <View>
                      {removed.map((s, idx) => (<Text key={`sr-${idx}`} style={styles.diffRemoved}>- {s}</Text>))}
                      {unchanged.map((s, idx) => (<Text key={`su-${idx}`} style={styles.step}>{(baseSteps.indexOf(s) + 1)}. {s}</Text>))}
                      {added.map((s, idx) => (<Text key={`sa-${idx}`} style={styles.diffAdded}>+ {s}</Text>))}
                    </View>
                  );
                }
                const list = (improvedPreview && !showDiff) ? impSteps : baseSteps;
                return list.length ? list.map((s, idx) => (<Text key={idx} style={styles.step}>{idx + 1}. {s}</Text>)) : (<Text style={styles.previewDesc}>No steps parsed</Text>);
              })()}
              <View style={{ flexDirection: 'row', gap: 8, marginTop: Spacing.md }}>
                <Button title="Save to Library" onPress={handleSave} />
                <Button title={improvedPreview ? (showDiff ? 'Hide diff' : 'Show diff') : 'Improve with AI'} variant="outline" onPress={improvedPreview ? toggleDiff : handleImproveWithAI} />
              </View>
            </Card>
          )}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: { 
    position: 'absolute', 
    top: 0, 
    left: 0, 
    right: 0, 
    bottom: 0, 
    backgroundColor: 'rgba(0,0,0,0.6)', 
    justifyContent: 'flex-end' 
  },
  container: { 
    maxHeight: '90%', 
    backgroundColor: Colors.background, 
    borderTopLeftRadius: 24, 
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 12,
  },
  header: {
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  title: { 
    fontSize: 22, 
    fontWeight: '700', 
    color: Colors.white,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 20,
  },
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
  provBanner: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  provBadge: {
    backgroundColor: Colors.tabBackground,
    color: Colors.text,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 6,
    marginTop: 4,
    fontSize: 12,
    overflow: 'hidden',
  },
  diffRemoved: {
    color: '#b91c1c',
    textDecorationLine: 'line-through',
    marginTop: 4,
  },
  diffAdded: {
    color: '#065f46',
    marginTop: 4,
  },
});


