// Enhanced Recipe Detail Modal
// Shows comprehensive recipe information from external APIs

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Share,
  Alert,
  Image,
  Linking,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Clock, Users, Heart, Star, Bookmark, BookmarkPlus, Share2, Utensils, Shuffle, MessageCircle, CheckCircle, ExternalLink } from 'lucide-react-native';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { LoadingSpinner } from './ui/LoadingSpinner';
import { Colors } from '../constants/colors';
import { Typography } from '../constants/spacing';
import { ExternalRecipe } from '../types/external';
import { RecipeProviderType } from '../types';
import { toCanonicalFromExternal } from '@/utils/recipeCanonical';
import { RecipeDetail } from './recipe-detail/RecipeDetail';
import { useRecipeStore } from '../hooks/useRecipeStore';
import { Meal, Recipe, RecipeIngredient } from '../types';
import { MealPlanModal } from './MealPlanModal';
import { useMealPlanner } from '@/hooks/useMealPlanner';
import { trackEvent } from '@/utils/analytics';
import ChatModal from '@/components/coach/ChatModal';
import { computeForExternalRecipe, estimateServingsForExternalRecipe } from '@/utils/nutrition/compute';
import { cleanupRecipeText, stripHtml as stripHtmlBasic, isInstructionLikeText } from '@/utils/text/recipeCleanup';

interface EnhancedRecipeDetailModalProps {
  visible: boolean;
  onClose: () => void;
  recipe: ExternalRecipe;
}

export const EnhancedRecipeDetailModal: React.FC<EnhancedRecipeDetailModalProps> = ({
  visible,
  onClose,
  recipe,
}) => {
  const { addPlannedMeal } = useMealPlanner();
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [recipeDetails, setRecipeDetails] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'chat'>('details');
  const [chatInput, setChatInput] = useState('');

  const { saveExternalRecipe, removeLocalRecipe, localRecipes } = useRecipeStore();

  // Direct step extraction (no summarization): prefer analyzed steps, else raw instructions split by line breaks
  const getDirectSteps = useCallback((): string[] => {
    const analyzed = recipeDetails?.analyzedInstructions?.[0]?.steps?.map((s: any) => s.step)
      || recipe.analyzedInstructions?.[0]?.steps?.map((s: any) => s.step);
    if (analyzed?.length) return analyzed.filter(Boolean).map((s: string) => String(s).trim()).filter(Boolean);
    const raw = (recipeDetails?.instructions || recipe.instructions || '') as string;
    const clean = stripHtmlBasic(raw);
    // Prefer explicit line breaks; if not present, fall back to sentence breaks without filtering content
    const lineSplit = clean.split(/\r?\n+/).map(s => s.trim()).filter(Boolean);
    if (lineSplit.length > 1) return lineSplit;
    const sentences = clean.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean);
    return sentences;
  }, [recipe, recipeDetails, recipeDetails?.analyzedInstructions, recipeDetails?.instructions]);

  // Build Recipe shape for chat context using direct steps
  const recipeForChat: Recipe = useMemo(() => {
    const ingredients = (recipeDetails?.ingredients || recipe.ingredients || []).map((ing: any) => ({
      name: ing?.name || ing?.original || '',
      quantity: typeof ing?.amount === 'number' ? ing.amount : (ing?.amount || 0),
      unit: ing?.unit || '',
    })) as RecipeIngredient[];
    const steps: string[] = getDirectSteps();
    return {
      id: String(recipe.id),
      name: recipe.title,
      image: recipe.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c',
      tags: (recipe as any)?.diets || [],
      prepTime: String(recipe.readyInMinutes || ''),
      cookTime: '',
      servings: recipe.servings || 0,
      ingredients,
      instructions: steps,
    } as Recipe;
  }, [recipe, recipeDetails, getDirectSteps]);

  // Use shared ChatModal for consistent Nosh chat UI

  // Load recipe details when modal opens
  useEffect(() => {
    if (recipe && !recipeDetails) {
      loadRecipeDetails();
    }
  }, [recipe, recipeDetails]);

  // Reset image error on recipe change
  useEffect(() => {
    setImageFailed(false);
  }, [recipe?.image]);

  // Check if recipe is saved
  useEffect(() => {
    if (recipe && localRecipes) {
      const matched = localRecipes.find((saved: any) => saved?.externalData?.externalId === recipe.id);
      setIsSaved(!!matched);
    }
  }, [recipe, localRecipes]);

  const loadRecipeDetails = async () => {
    if (!recipe) return;
    // External provider removed: use provided recipe fields directly
    setIsLoading(true);
    setError(null);
    try {
      setRecipeDetails(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveRecipe = async () => {
    if (!recipe) return;
    try {
      await saveExternalRecipe(recipe);
      setIsSaved(true);
      Alert.alert('Success', 'Recipe saved to your collection!');
    } catch (error) {
      console.error('Error saving recipe:', error);
      Alert.alert('Error', 'Failed to save recipe');
    }
  };

  const handleRemoveRecipe = async () => {
    if (!recipe) return;
    try {
      const matched = localRecipes.find((saved: any) => saved?.externalData?.externalId === recipe.id);
      if (matched) {
        await removeLocalRecipe(matched.id);
        setIsSaved(false);
        Alert.alert('Success', 'Recipe removed from your collection!');
      }
    } catch (error) {
      console.error('Error removing recipe:', error);
      Alert.alert('Error', 'Failed to remove recipe');
    }
  };

  const handleShareRecipe = async () => {
    if (!recipe) return;
    
    try {
      const message = [
        recipe.title,
        ((recipeDetails as any)?.sourceUrl || (recipe as any)?.sourceUrl) || undefined,
      ].filter(Boolean).join('\n');
      await Share.share({ message, title: recipe.title });
    } catch (error) {
      console.error('Error sharing recipe:', error);
    }
  };

  const buildShareText = (): string => {
    const lines: string[] = [];
    lines.push(recipe.title);
    const mins = (recipeDetails?.readyInMinutes ?? recipe.readyInMinutes);
    const sv = (recipeDetails?.servings ?? recipe.servings);
    const meta: string[] = [];
    if (typeof mins === 'number' && mins > 0) meta.push(`${mins} min`);
    if (typeof sv === 'number' && sv > 0) meta.push(`${sv} servings`);
    if (meta.length) lines.push(meta.join(' • '));

    // Ingredients (limit to 10 for brevity)
    const ingredients = (recipeDetails?.ingredients || recipe.ingredients) as any[] | undefined;
    if (ingredients?.length) {
      lines.push('');
      lines.push('Ingredients:');
      ingredients.slice(0, 10).forEach((ing: any) => {
        const text = ing?.original || ing?.name || '';
        if (text) lines.push(`• ${text}`);
      });
      if (ingredients.length > 10) lines.push(`…and ${ingredients.length - 10} more`);
    }

    // Instructions (direct, no summarization)
    const steps = getDirectSteps();
    const plain = (recipeDetails?.instructions || recipe.instructions || '') || undefined;

    if (steps?.length) {
      lines.push('');
      lines.push('Instructions:');
  steps.slice(0, 5).forEach((s: string, idx: number) => lines.push(`${idx + 1}. ${s}`));
      if (steps.length > 5) lines.push(`…and ${steps.length - 5} more steps`);
    } else if (plain) {
      lines.push('');
      lines.push('Instructions:');
      lines.push(stripHtmlBasic(plain));
    }

    // Optional: source URL if present on details
    const sourceUrl = (recipeDetails as any)?.sourceUrl || (recipe as any)?.sourceUrl;
    if (sourceUrl) {
      lines.push('');
      lines.push(sourceUrl);
    }

    return lines.join('\n');
  };

  if (!recipe) return null;

  // Canonical mapping for unified detail UI
  // Provider removed; set to 'unknown' until the new provider is integrated
  const providerType: RecipeProviderType = 'unknown';
  const canonical = useMemo(() => {
    const base = toCanonicalFromExternal(recipe, providerType);
    // Steps: fetch directly without summarization or filtering
    const steps = getDirectSteps();
    const MAX_SUMMARY_CHARS = 260;
    const rawDesc = recipe.summary || (recipe as any)?.summary || base.description;
    const cleanDesc = rawDesc ? stripHtmlBasic(rawDesc) : '';
    if (cleanDesc && !isInstructionLikeText(cleanDesc) && cleanDesc.length <= MAX_SUMMARY_CHARS) {
      base.description = cleanDesc;
    } else {
      base.description = undefined as any;
    }
    if (steps?.length) {
      base.steps = steps;
    }
    // Improve serving default when provider doesn't supply a realistic one
    const estServings = estimateServingsForExternalRecipe(recipe);
    if (!base.servings || base.servings <= 1) {
      base.servings = estServings;
    }
    // Compute nutrition per serving if missing
    if (!base.nutritionPerServing) {
      const computed = computeForExternalRecipe({ ...recipe, servings: base.servings } as any);
      if (computed) {
        base.nutritionPerServing = {
          calories: computed.calories,
          protein: computed.protein,
          carbs: computed.carbs,
          fats: computed.fats,
        } as any;
      }
    }
    return base;
  }, [recipe]);

  return (
    <Modal visible={visible} onClose={onClose} title="Recipe Details" size="full" hasHeader={false}>
      <View style={styles.modal}>
        <RecipeDetail
          onClose={onClose}
          recipe={canonical}
          mode="discover"
          isSaved={isSaved}
          onSave={async () => handleSaveRecipe()}
          onRemove={async () => handleRemoveRecipe()}
          onPlan={() => {
            trackEvent({ type: 'plan_button_tap', data: { source: 'detail', recipeId: recipe.id } });
            setShowPlanModal(true);
          }}
          onShare={() => handleShareRecipe()}
          onOpenSource={() => {
            const url = (recipeDetails as any)?.sourceUrl || (recipe as any)?.sourceUrl;
            if (url) Linking.openURL(url).catch(() => {});
          }}
          onAskAI={() => setActiveTab('chat')}
        />

        {/* Consistent Nosh chat UI, same as floating button page */}
        <ChatModal visible={activeTab === 'chat'} onClose={() => setActiveTab('details')} initialRecipe={recipeForChat} />

        {/* Bottom fade overlay removed per request */}

        {/* Plan Modal preserved */}
        <MealPlanModal
          visible={showPlanModal}
          selectedDate={new Date().toISOString().split('T')[0]}
          initialRecipeId={String(recipe.id)}
          onClose={() => setShowPlanModal(false)}
          onSave={async (planned) => {
            try {
              await addPlannedMeal({
                recipeId: planned.recipeId,
                date: planned.date,
                mealType: planned.mealType,
                servings: planned.servings,
                notes: planned.notes,
                isCompleted: planned.isCompleted ?? false,
              });
              setShowPlanModal(false);
              Alert.alert('Planned', 'Recipe added to your meal plan.');
            } catch (err) {
              console.error('Failed to add planned meal:', err);
              Alert.alert('Error', 'Unable to add recipe to plan.');
            }
          }}
        />
      </View>
    </Modal>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  modal: {
    flex: 1,
    backgroundColor: Colors.background,
    position: 'relative',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
    flex: 1,
    marginRight: 16,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  imageContainer: {
    width: '100%',
    height: 260,
    marginBottom: 8,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  stat: {
    alignItems: 'center',
  },
  statText: {
    fontSize: 12,
    color: Colors.text,
    marginTop: 4,
  },
  primaryActions: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  saveButton: {
    backgroundColor: Colors.primary,
  },
  savedButton: {
    backgroundColor: Colors.success,
  },
  shareButton: {
    backgroundColor: Colors.info,
  },
  sourceButton: {
    backgroundColor: Colors.secondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: Typography.weights.semibold,
  },
  bottomButtonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.background,
  },
  bottomPrimaryButton: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  bottomPrimaryButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.white,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.lightText,
  },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.secondary,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  rowText: {
    flex: 1,
    color: Colors.text,
    fontSize: 14,
  },
  stepBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadgeText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: Typography.weights.semibold,
  },
  nutritionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  nutritionItem: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    borderRadius: 8,
    minWidth: (width - 64) / 2 - 6,
    alignItems: 'center',
  },
  nutritionLabel: {
    fontSize: 12,
    color: Colors.lightText,
    marginBottom: 4,
  },
  nutritionValue: {
    fontSize: 16,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
  },
  errorText: {
    fontSize: 16,
    color: Colors.error,
    textAlign: 'center',
    padding: 20,
  },
  // Chat styles (aligned with system design minimal set)
  chatChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
    marginBottom: 12,
  },
  chatChip: {
    backgroundColor: Colors.secondary,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  chatChipText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: Typography.weights.medium,
  },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    marginTop: 12,
  },
  inputContainer: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  input: {
    fontSize: 16,
    color: Colors.text,
    maxHeight: 100,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  msg: {
    padding: 12,
    borderRadius: 16,
    marginBottom: 10,
    maxWidth: '85%',
  },
  msgUser: {
    backgroundColor: Colors.primary,
    alignSelf: 'flex-end',
  },
  msgCoach: {
    backgroundColor: Colors.card,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  msgText: {
    color: Colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  inlineActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  inlineActionBtn: {
    backgroundColor: Colors.secondary,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  inlineActionText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: Typography.weights.medium,
  },
  typingText: {
    color: Colors.lightText,
    fontStyle: 'italic',
    fontSize: 14,
  },
  
});

// Removed custom ActionPill in favor of shared Button component
