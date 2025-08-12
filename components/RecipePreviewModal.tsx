/**
 * Enhanced Recipe Preview Modal with validation highlights and correction tools
 * Helps users review and fix imported recipe data before saving
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  Image,
  Switch
} from 'react-native';
import { Colors } from '@/constants/colors';
import { Spacing, Typography } from '@/constants/spacing';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { 
  CheckCircle, 
  AlertTriangle, 
  AlertCircle, 
  Edit3, 
  Plus, 
  Minus, 
  ExternalLink,
  Eye,
  EyeOff,
  Zap
} from 'lucide-react-native';
import QuickFixPanel, { QuickFixAction } from './QuickFixPanel';
import { generateQuickFixActions, generateExtractionErrorFixes } from '@/utils/quickFixGenerator';

export interface RecipePreviewData {
  title: string;
  description?: string;
  imageUrl?: string;
  ingredients: PreviewIngredient[];
  instructions: string[];
  prepTime?: number;
  cookTime?: number;
  servings?: number;
  tags: string[];
  confidence: number;
  originalUrl?: string;
  extractionMethods?: string[];
  validationIssues?: ValidationIssue[];
  missingIngredients?: string[];
  inferredQuantities?: InferredQuantity[];
}

export interface PreviewIngredient {
  name: string;
  quantity?: number;
  unit?: string;
  notes?: string;
  optional: boolean;
  confidence: number;
  inferred: boolean;
  hasIssues?: boolean;
  issues?: string[];
}

export interface ValidationIssue {
  type: 'missing_ingredient' | 'quantity_mismatch' | 'invented_ingredient' | 'low_confidence';
  severity: 'low' | 'medium' | 'high';
  description: string;
  suggestion: string;
  field?: string;
}

export interface InferredQuantity {
  ingredientName: string;
  originalQuantity?: number;
  inferredQuantity: number;
  inferredUnit: string;
  confidence: number;
  reasoning: string;
}

interface RecipePreviewModalProps {
  visible: boolean;
  recipe: RecipePreviewData;
  originalContent?: string;
  onSave: (recipe: RecipePreviewData) => void;
  onCancel: () => void;
  onOpenOriginal?: () => void;
}

export const RecipePreviewModal: React.FC<RecipePreviewModalProps> = ({
  visible,
  recipe,
  originalContent,
  onSave,
  onCancel,
  onOpenOriginal
}) => {
  const [editedRecipe, setEditedRecipe] = useState<RecipePreviewData>(recipe);
  const [showValidationPanel, setShowValidationPanel] = useState(true);
  const [showOriginalContent, setShowOriginalContent] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<number | null>(null);
  const [editingInstruction, setEditingInstruction] = useState<number | null>(null);
  const [quickFixActions, setQuickFixActions] = useState<QuickFixAction[]>([]);
  const [showQuickFixes, setShowQuickFixes] = useState(true);

  useEffect(() => {
    setEditedRecipe(recipe);
    
    // Generate quick-fix actions
    if (recipe.validationIssues || recipe.missingIngredients || recipe.inferredQuantities) {
      const actions = generateQuickFixActions(
        {
          title: recipe.title,
          ingredients: recipe.ingredients,
          instructions: recipe.instructions,
          prepTime: recipe.prepTime,
          cookTime: recipe.cookTime,
          servings: recipe.servings
        },
        recipe.validationIssues || [],
        recipe.missingIngredients?.map(name => ({
          name,
          confidence: 0.7,
          context: 'Found in validation',
          suggestedQuantity: 1,
          suggestedUnit: 'cup'
        })) || [],
        recipe.inferredQuantities || []
      );

      // Add extraction error fixes if original content is available
      if (originalContent) {
        const extractionFixes = generateExtractionErrorFixes(originalContent, {
          title: recipe.title,
          ingredients: recipe.ingredients,
          instructions: recipe.instructions,
          prepTime: recipe.prepTime,
          cookTime: recipe.cookTime,
          servings: recipe.servings
        });
        actions.push(...extractionFixes);
      }

      setQuickFixActions(actions);
    }
  }, [recipe, originalContent]);

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return Colors.success;
    if (confidence >= 0.6) return Colors.warning;
    return Colors.error;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return Colors.error;
      case 'medium': return Colors.warning;
      case 'low': return Colors.info;
      default: return Colors.lightText;
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high': return AlertCircle;
      case 'medium': return AlertTriangle;
      case 'low': return CheckCircle;
      default: return CheckCircle;
    }
  };

  const updateIngredient = (index: number, updates: Partial<PreviewIngredient>) => {
    const newIngredients = [...editedRecipe.ingredients];
    newIngredients[index] = { ...newIngredients[index], ...updates };
    setEditedRecipe({ ...editedRecipe, ingredients: newIngredients });
  };

  const addIngredient = () => {
    const newIngredient: PreviewIngredient = {
      name: '',
      quantity: 1,
      unit: 'cup',
      optional: false,
      confidence: 1.0,
      inferred: false
    };
    setEditedRecipe({
      ...editedRecipe,
      ingredients: [...editedRecipe.ingredients, newIngredient]
    });
    setEditingIngredient(editedRecipe.ingredients.length);
  };

  const removeIngredient = (index: number) => {
    const newIngredients = editedRecipe.ingredients.filter((_, i) => i !== index);
    setEditedRecipe({ ...editedRecipe, ingredients: newIngredients });
  };

  const updateInstruction = (index: number, text: string) => {
    const newInstructions = [...editedRecipe.instructions];
    newInstructions[index] = text;
    setEditedRecipe({ ...editedRecipe, instructions: newInstructions });
  };

  const addInstruction = () => {
    setEditedRecipe({
      ...editedRecipe,
      instructions: [...editedRecipe.instructions, '']
    });
    setEditingInstruction(editedRecipe.instructions.length);
  };

  const removeInstruction = (index: number) => {
    const newInstructions = editedRecipe.instructions.filter((_, i) => i !== index);
    setEditedRecipe({ ...editedRecipe, instructions: newInstructions });
  };

  const handleQuickFix = (actionId: string, data?: any) => {
    const action = quickFixActions.find(a => a.id === actionId);
    if (!action) return;

    let updatedRecipe = { ...editedRecipe };

    switch (action.type) {
      case 'add_ingredient':
        const newIngredient: PreviewIngredient = {
          name: data.name,
          quantity: data.quantity,
          unit: data.unit,
          optional: data.optional || false,
          confidence: data.confidence || 0.8,
          inferred: data.inferred || true
        };
        updatedRecipe.ingredients = [...updatedRecipe.ingredients, newIngredient];
        break;

      case 'fix_quantity':
        if (data.ingredientIndex !== undefined) {
          updatedRecipe.ingredients[data.ingredientIndex] = {
            ...updatedRecipe.ingredients[data.ingredientIndex],
            quantity: data.newQuantity,
            unit: data.newUnit
          };
        } else {
          // Find ingredient by name
          const ingredientIndex = updatedRecipe.ingredients.findIndex(
            ing => ing.name.toLowerCase() === data.ingredientName.toLowerCase()
          );
          if (ingredientIndex >= 0) {
            updatedRecipe.ingredients[ingredientIndex] = {
              ...updatedRecipe.ingredients[ingredientIndex],
              quantity: data.newQuantity,
              unit: data.newUnit
            };
          }
        }
        break;

      case 'mark_optional':
        const optionalIndex = updatedRecipe.ingredients.findIndex(
          ing => ing.name.toLowerCase() === data.ingredientName.toLowerCase()
        );
        if (optionalIndex >= 0) {
          updatedRecipe.ingredients[optionalIndex] = {
            ...updatedRecipe.ingredients[optionalIndex],
            optional: true
          };
        }
        break;

      case 'remove_ingredient':
        updatedRecipe.ingredients = updatedRecipe.ingredients.filter(
          ing => ing.name.toLowerCase() !== data.ingredientName.toLowerCase()
        );
        break;

      case 'add_time':
        if (data.prepTime !== undefined) updatedRecipe.prepTime = data.prepTime;
        if (data.cookTime !== undefined) updatedRecipe.cookTime = data.cookTime;
        break;

      case 'fix_servings':
        updatedRecipe.servings = data.servings;
        break;

      case 'fix_instruction':
        if (data.stepIndex !== undefined && data.newText) {
          updatedRecipe.instructions[data.stepIndex] = data.newText;
        }
        break;
    }

    setEditedRecipe(updatedRecipe);
    
    // Remove the applied action
    setQuickFixActions(prev => prev.filter(a => a.id !== actionId));
  };

  const handleApplyAllFixes = () => {
    const autoFixableActions = quickFixActions.filter(action => action.autoFix);
    
    autoFixableActions.forEach(action => {
      handleQuickFix(action.id, action.data);
    });
  };

  const handleDismissQuickFix = (actionId: string) => {
    setQuickFixActions(prev => prev.filter(a => a.id !== actionId));
  };

  const handleSave = () => {
    // Validate before saving
    const hasEmptyIngredients = editedRecipe.ingredients.some(ing => !ing.name.trim());
    const hasEmptyInstructions = editedRecipe.instructions.some(inst => !inst.trim());

    if (hasEmptyIngredients || hasEmptyInstructions) {
      Alert.alert(
        'Incomplete Recipe',
        'Please fill in all ingredient names and instructions before saving.',
        [{ text: 'OK' }]
      );
      return;
    }

    onSave(editedRecipe);
  };

  const renderValidationPanel = () => {
    if (!showValidationPanel || !recipe.validationIssues?.length) return null;

    return (
      <Card style={styles.validationPanel}>
        <View style={styles.validationHeader}>
          <AlertTriangle size={20} color={Colors.warning} />
          <Text style={styles.validationTitle}>Validation Issues</Text>
          <TouchableOpacity onPress={() => setShowValidationPanel(false)}>
            <Text style={styles.hideButton}>Hide</Text>
          </TouchableOpacity>
        </View>

        {recipe.validationIssues.map((issue, index) => {
          const IconComponent = getSeverityIcon(issue.severity);
          return (
            <View key={index} style={styles.validationIssue}>
              <IconComponent 
                size={16} 
                color={getSeverityColor(issue.severity)} 
                style={styles.issueIcon}
              />
              <View style={styles.issueContent}>
                <Text style={styles.issueDescription}>{issue.description}</Text>
                <Text style={styles.issueSuggestion}>{issue.suggestion}</Text>
              </View>
            </View>
          );
        })}
      </Card>
    );
  };

  const renderConfidenceIndicator = (confidence: number) => (
    <View style={[styles.confidenceIndicator, { backgroundColor: getConfidenceColor(confidence) }]}>
      <Text style={styles.confidenceText}>{Math.round(confidence * 100)}%</Text>
    </View>
  );

  const renderIngredientItem = (ingredient: PreviewIngredient, index: number) => {
    const isEditing = editingIngredient === index;

    return (
      <View key={index} style={[
        styles.ingredientItem,
        ingredient.hasIssues && styles.ingredientWithIssues
      ]}>
        <View style={styles.ingredientHeader}>
          <View style={styles.ingredientInfo}>
            {isEditing ? (
              <View style={styles.editingContainer}>
                <TextInput
                  style={styles.editInput}
                  value={ingredient.name}
                  onChangeText={(text) => updateIngredient(index, { name: text })}
                  placeholder="Ingredient name"
                  autoFocus
                />
                <View style={styles.quantityContainer}>
                  <TextInput
                    style={[styles.editInput, styles.quantityInput]}
                    value={ingredient.quantity?.toString() || ''}
                    onChangeText={(text) => updateIngredient(index, { quantity: parseFloat(text) || undefined })}
                    placeholder="Qty"
                    keyboardType="numeric"
                  />
                  <TextInput
                    style={[styles.editInput, styles.unitInput]}
                    value={ingredient.unit || ''}
                    onChangeText={(text) => updateIngredient(index, { unit: text })}
                    placeholder="Unit"
                  />
                </View>
              </View>
            ) : (
              <TouchableOpacity 
                style={styles.ingredientText}
                onPress={() => setEditingIngredient(index)}
              >
                <Text style={styles.ingredientName}>
                  {ingredient.quantity ? `${ingredient.quantity} ` : ''}
                  {ingredient.unit ? `${ingredient.unit} ` : ''}
                  {ingredient.name}
                  {ingredient.optional && <Text style={styles.optionalText}> (optional)</Text>}
                </Text>
                {ingredient.inferred && (
                  <Text style={styles.inferredLabel}>Inferred</Text>
                )}
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.ingredientActions}>
            {renderConfidenceIndicator(ingredient.confidence)}
            
            {isEditing ? (
              <TouchableOpacity 
                onPress={() => setEditingIngredient(null)}
                style={styles.actionButton}
              >
                <CheckCircle size={20} color={Colors.success} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                onPress={() => setEditingIngredient(index)}
                style={styles.actionButton}
              >
                <Edit3 size={16} color={Colors.primary} />
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              onPress={() => removeIngredient(index)}
              style={styles.actionButton}
            >
              <Minus size={16} color={Colors.error} />
            </TouchableOpacity>
          </View>
        </View>

        {ingredient.hasIssues && ingredient.issues && (
          <View style={styles.ingredientIssues}>
            {ingredient.issues.map((issue, issueIndex) => (
              <Text key={issueIndex} style={styles.issueText}>• {issue}</Text>
            ))}
          </View>
        )}

        {isEditing && (
          <View style={styles.ingredientOptions}>
            <View style={styles.switchContainer}>
              <Text style={styles.switchLabel}>Optional</Text>
              <Switch
                value={ingredient.optional}
                onValueChange={(value) => updateIngredient(index, { optional: value })}
                trackColor={{ false: Colors.border, true: Colors.primary }}
              />
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderInstructionItem = (instruction: string, index: number) => {
    const isEditing = editingInstruction === index;

    return (
      <View key={index} style={styles.instructionItem}>
        <Text style={styles.stepNumber}>{index + 1}.</Text>
        
        {isEditing ? (
          <TextInput
            style={styles.instructionInput}
            value={instruction}
            onChangeText={(text) => updateInstruction(index, text)}
            placeholder="Instruction step"
            multiline
            autoFocus
            onBlur={() => setEditingInstruction(null)}
          />
        ) : (
          <TouchableOpacity 
            style={styles.instructionText}
            onPress={() => setEditingInstruction(index)}
          >
            <Text style={styles.instructionContent}>{instruction}</Text>
          </TouchableOpacity>
        )}

        <View style={styles.instructionActions}>
          {isEditing ? (
            <TouchableOpacity 
              onPress={() => setEditingInstruction(null)}
              style={styles.actionButton}
            >
              <CheckCircle size={20} color={Colors.success} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              onPress={() => setEditingInstruction(index)}
              style={styles.actionButton}
            >
              <Edit3 size={16} color={Colors.primary} />
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            onPress={() => removeInstruction(index)}
            style={styles.actionButton}
          >
            <Minus size={16} color={Colors.error} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>Recipe Preview</Text>
            {renderConfidenceIndicator(recipe.confidence)}
          </View>
          <View style={styles.headerRight}>
            {onOpenOriginal && (
              <TouchableOpacity onPress={onOpenOriginal} style={styles.headerButton}>
                <ExternalLink size={20} color={Colors.primary} />
              </TouchableOpacity>
            )}
            <TouchableOpacity 
              onPress={() => setShowOriginalContent(!showOriginalContent)}
              style={styles.headerButton}
            >
              {showOriginalContent ? 
                <EyeOff size={20} color={Colors.primary} /> : 
                <Eye size={20} color={Colors.primary} />
              }
            </TouchableOpacity>
            {quickFixActions.length > 0 && (
              <TouchableOpacity 
                onPress={() => setShowQuickFixes(!showQuickFixes)}
                style={[styles.headerButton, showQuickFixes && styles.activeHeaderButton]}
              >
                <Zap size={20} color={showQuickFixes ? Colors.white : Colors.primary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {renderValidationPanel()}

          {/* Quick Fix Panel */}
          <QuickFixPanel
            actions={quickFixActions}
            onApplyFix={handleQuickFix}
            onApplyAllFixes={handleApplyAllFixes}
            onDismiss={handleDismissQuickFix}
            visible={showQuickFixes && quickFixActions.length > 0}
          />

          {showOriginalContent && originalContent && (
            <Card style={styles.originalContentCard}>
              <Text style={styles.sectionTitle}>Original Content</Text>
              <ScrollView style={styles.originalContentScroll} nestedScrollEnabled>
                <Text style={styles.originalContentText}>{originalContent}</Text>
              </ScrollView>
            </Card>
          )}

          {/* Recipe Title */}
          <Card style={styles.section}>
            <TextInput
              style={styles.titleInput}
              value={editedRecipe.title}
              onChangeText={(text) => setEditedRecipe({ ...editedRecipe, title: text })}
              placeholder="Recipe Title"
            />
            
            {editedRecipe.description && (
              <TextInput
                style={styles.descriptionInput}
                value={editedRecipe.description}
                onChangeText={(text) => setEditedRecipe({ ...editedRecipe, description: text })}
                placeholder="Recipe Description"
                multiline
              />
            )}

            {editedRecipe.imageUrl && (
              <Image source={{ uri: editedRecipe.imageUrl }} style={styles.recipeImage} />
            )}
          </Card>

          {/* Recipe Metadata */}
          <Card style={styles.section}>
            <View style={styles.metadataRow}>
              <View style={styles.metadataItem}>
                <Text style={styles.metadataLabel}>Prep Time</Text>
                <TextInput
                  style={styles.metadataInput}
                  value={editedRecipe.prepTime?.toString() || ''}
                  onChangeText={(text) => setEditedRecipe({ 
                    ...editedRecipe, 
                    prepTime: parseInt(text) || undefined 
                  })}
                  placeholder="0"
                  keyboardType="numeric"
                />
                <Text style={styles.metadataUnit}>min</Text>
              </View>

              <View style={styles.metadataItem}>
                <Text style={styles.metadataLabel}>Cook Time</Text>
                <TextInput
                  style={styles.metadataInput}
                  value={editedRecipe.cookTime?.toString() || ''}
                  onChangeText={(text) => setEditedRecipe({ 
                    ...editedRecipe, 
                    cookTime: parseInt(text) || undefined 
                  })}
                  placeholder="0"
                  keyboardType="numeric"
                />
                <Text style={styles.metadataUnit}>min</Text>
              </View>

              <View style={styles.metadataItem}>
                <Text style={styles.metadataLabel}>Servings</Text>
                <TextInput
                  style={styles.metadataInput}
                  value={editedRecipe.servings?.toString() || ''}
                  onChangeText={(text) => setEditedRecipe({ 
                    ...editedRecipe, 
                    servings: parseInt(text) || undefined 
                  })}
                  placeholder="0"
                  keyboardType="numeric"
                />
              </View>
            </View>
          </Card>

          {/* Ingredients Section */}
          <Card style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                Ingredients ({editedRecipe.ingredients.length})
              </Text>
              <TouchableOpacity onPress={addIngredient} style={styles.addButton}>
                <Plus size={20} color={Colors.primary} />
              </TouchableOpacity>
            </View>

            {editedRecipe.ingredients.map((ingredient, index) => 
              renderIngredientItem(ingredient, index)
            )}

            {recipe.missingIngredients && recipe.missingIngredients.length > 0 && (
              <View style={styles.missingIngredientsSection}>
                <Text style={styles.missingIngredientsTitle}>
                  Possibly Missing Ingredients:
                </Text>
                {recipe.missingIngredients.map((ingredient, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.missingIngredientItem}
                    onPress={() => {
                      const newIngredient: PreviewIngredient = {
                        name: ingredient,
                        quantity: 1,
                        unit: 'cup',
                        optional: false,
                        confidence: 0.6,
                        inferred: true
                      };
                      setEditedRecipe({
                        ...editedRecipe,
                        ingredients: [...editedRecipe.ingredients, newIngredient]
                      });
                    }}
                  >
                    <Plus size={16} color={Colors.primary} />
                    <Text style={styles.missingIngredientText}>{ingredient}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </Card>

          {/* Instructions Section */}
          <Card style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                Instructions ({editedRecipe.instructions.length})
              </Text>
              <TouchableOpacity onPress={addInstruction} style={styles.addButton}>
                <Plus size={20} color={Colors.primary} />
              </TouchableOpacity>
            </View>

            {editedRecipe.instructions.map((instruction, index) => 
              renderInstructionItem(instruction, index)
            )}
          </Card>

          {/* Extraction Info */}
          {recipe.extractionMethods && recipe.extractionMethods.length > 0 && (
            <Card style={styles.section}>
              <Text style={styles.sectionTitle}>Extraction Methods</Text>
              <View style={styles.extractionMethods}>
                {recipe.extractionMethods.map((method, index) => (
                  <View key={index} style={styles.extractionMethod}>
                    <Text style={styles.extractionMethodText}>{method}</Text>
                  </View>
                ))}
              </View>
            </Card>
          )}
        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <Button
            title="Cancel"
            variant="outline"
            onPress={onCancel}
            style={styles.actionButton}
          />
          <Button
            title="Save Recipe"
            onPress={handleSave}
            style={styles.actionButton}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.white
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  headerButton: {
    marginLeft: Spacing.md,
    padding: Spacing.xs
  },
  activeHeaderButton: {
    backgroundColor: Colors.primary,
    borderRadius: 6
  },
  title: {
    fontSize: Typography.sizes.xl,
    fontWeight: '600',
    color: Colors.text,
    marginRight: Spacing.md
  },
  content: {
    flex: 1,
    padding: Spacing.lg
  },
  validationPanel: {
    marginBottom: Spacing.lg,
    backgroundColor: Colors.warning + '10',
    borderColor: Colors.warning,
    borderWidth: 1
  },
  validationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md
  },
  validationTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: '600',
    color: Colors.text,
    marginLeft: Spacing.sm,
    flex: 1
  },
  hideButton: {
    color: Colors.primary,
    fontWeight: '500'
  },
  validationIssue: {
    flexDirection: 'row',
    marginBottom: Spacing.sm
  },
  issueIcon: {
    marginRight: Spacing.sm,
    marginTop: 2
  },
  issueContent: {
    flex: 1
  },
  issueDescription: {
    fontSize: Typography.sizes.md,
    color: Colors.text,
    fontWeight: '500'
  },
  issueSuggestion: {
    fontSize: Typography.sizes.sm,
    color: Colors.lightText,
    marginTop: 2
  },
  originalContentCard: {
    marginBottom: Spacing.lg,
    maxHeight: 200
  },
  originalContentScroll: {
    maxHeight: 150
  },
  originalContentText: {
    fontSize: Typography.sizes.sm,
    color: Colors.lightText,
    lineHeight: 20
  },
  section: {
    marginBottom: Spacing.lg
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md
  },
  sectionTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: '600',
    color: Colors.text
  },
  addButton: {
    padding: Spacing.xs
  },
  titleInput: {
    fontSize: Typography.sizes.xl,
    fontWeight: '600',
    color: Colors.text,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingBottom: Spacing.sm,
    marginBottom: Spacing.md
  },
  descriptionInput: {
    fontSize: Typography.sizes.md,
    color: Colors.lightText,
    marginBottom: Spacing.md,
    minHeight: 60,
    textAlignVertical: 'top'
  },
  recipeImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: Spacing.md
  },
  metadataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  metadataItem: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: Spacing.xs
  },
  metadataLabel: {
    fontSize: Typography.sizes.sm,
    color: Colors.lightText,
    marginBottom: Spacing.xs
  },
  metadataInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 6,
    padding: Spacing.sm,
    textAlign: 'center',
    minWidth: 60
  },
  metadataUnit: {
    fontSize: Typography.sizes.sm,
    color: Colors.lightText,
    marginTop: Spacing.xs
  },
  ingredientItem: {
    marginBottom: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.tabBackground,
    borderRadius: 8
  },
  ingredientWithIssues: {
    borderColor: Colors.warning,
    borderWidth: 1
  },
  ingredientHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start'
  },
  ingredientInfo: {
    flex: 1
  },
  ingredientText: {
    flex: 1
  },
  ingredientName: {
    fontSize: Typography.sizes.md,
    color: Colors.text
  },
  optionalText: {
    color: Colors.lightText,
    fontStyle: 'italic'
  },
  inferredLabel: {
    fontSize: Typography.sizes.xs,
    color: Colors.info,
    marginTop: 2
  },
  ingredientActions: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  confidenceIndicator: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: Spacing.sm
  },
  confidenceText: {
    fontSize: Typography.sizes.xs,
    color: Colors.white,
    fontWeight: '600'
  },
  actionButton: {
    marginLeft: Spacing.sm,
    padding: Spacing.xs
  },
  editingContainer: {
    flex: 1
  },
  editInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 6,
    padding: Spacing.sm,
    marginBottom: Spacing.sm
  },
  quantityContainer: {
    flexDirection: 'row'
  },
  quantityInput: {
    flex: 1,
    marginRight: Spacing.sm
  },
  unitInput: {
    flex: 1
  },
  ingredientIssues: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border
  },
  issueText: {
    fontSize: Typography.sizes.sm,
    color: Colors.warning,
    marginBottom: 2
  },
  ingredientOptions: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  switchLabel: {
    fontSize: Typography.sizes.md,
    color: Colors.text
  },
  missingIngredientsSection: {
    marginTop: Spacing.lg,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border
  },
  missingIngredientsTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.sm
  },
  missingIngredientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    backgroundColor: Colors.info + '20',
    borderRadius: 6,
    marginBottom: Spacing.xs
  },
  missingIngredientText: {
    fontSize: Typography.sizes.sm,
    color: Colors.info,
    marginLeft: Spacing.sm
  },
  instructionItem: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.tabBackground,
    borderRadius: 8
  },
  stepNumber: {
    fontSize: Typography.sizes.md,
    fontWeight: '600',
    color: Colors.primary,
    marginRight: Spacing.md,
    minWidth: 24
  },
  instructionText: {
    flex: 1
  },
  instructionContent: {
    fontSize: Typography.sizes.md,
    color: Colors.text,
    lineHeight: 22
  },
  instructionInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 6,
    padding: Spacing.sm,
    minHeight: 60,
    textAlignVertical: 'top'
  },
  instructionActions: {
    flexDirection: 'row',
    alignItems: 'flex-start'
  },
  extractionMethods: {
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  extractionMethod: {
    backgroundColor: Colors.primary + '20',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 12,
    marginRight: Spacing.sm,
    marginBottom: Spacing.xs
  },
  extractionMethodText: {
    fontSize: Typography.sizes.sm,
    color: Colors.primary
  },
  actions: {
    flexDirection: 'row',
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.white
  }
});

export default RecipePreviewModal;