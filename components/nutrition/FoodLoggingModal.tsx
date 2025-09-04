import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, X, Plus, Clock, Utensils } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { Spacing, Typography } from '@/constants/spacing';
import { Button } from '@/components/ui/Button';
import { MealType } from '@/types';
import { foodDatabase, FoodItem } from '@/utils/foodDatabase';

// FoodItem interface is now imported from foodDatabase

export interface LoggedFood {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  servingSize: string;
  quantity: number;
  mealType?: MealType;
  timestamp: Date;
}

interface FoodLoggingModalProps {
  visible: boolean;
  selectedDate: string;
  defaultMealType?: MealType;
  onAddFood: (food: LoggedFood) => void;
  onClose: () => void;
}

// Food database is now handled by the foodDatabase service

const MEAL_TYPE_ICONS: Record<MealType, React.ReactNode> = {
  breakfast: <Text style={styles.mealIcon}>🌅</Text>,
  lunch: <Text style={styles.mealIcon}>☀️</Text>,
  dinner: <Text style={styles.mealIcon}>🌙</Text>,
  snack: <Text style={styles.mealIcon}>🍎</Text>,
};

export const FoodLoggingModal: React.FC<FoodLoggingModalProps> = ({
  visible,
  selectedDate,
  defaultMealType = 'breakfast',
  onAddFood,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMealType, setSelectedMealType] = useState<MealType>(defaultMealType);
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [quantity, setQuantity] = useState('1');
  const [isCustomEntry, setIsCustomEntry] = useState(false);
  const [searchResults, setSearchResults] = useState<FoodItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Custom food entry fields
  const [customName, setCustomName] = useState('');
  const [customCalories, setCustomCalories] = useState('');
  const [customProtein, setCustomProtein] = useState('');
  const [customCarbs, setCustomCarbs] = useState('');
  const [customFats, setCustomFats] = useState('');
  const [customServingSize, setCustomServingSize] = useState('');

  // Reset form when modal opens/closes
  useEffect(() => {
    if (visible) {
      setSelectedMealType(defaultMealType);
      setSearchQuery('');
      setSelectedFood(null);
      setQuantity('1');
      setIsCustomEntry(false);
      resetCustomFields();
    }
  }, [visible, defaultMealType]);

  const resetCustomFields = () => {
    setCustomName('');
    setCustomCalories('');
    setCustomProtein('');
    setCustomCarbs('');
    setCustomFats('');
    setCustomServingSize('');
  };

  // Search foods using the database
  useEffect(() => {
    const searchFoods = async () => {
      setIsSearching(true);
      try {
        const results = await foodDatabase.searchFoods(searchQuery, 20);
        setSearchResults(results);
      } catch (error) {
        console.error('Food search error:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(searchFoods, 300); // Debounce search
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleFoodSelect = (food: FoodItem) => {
    setSelectedFood(food);
    setIsCustomEntry(false);
  };

  const handleCustomEntry = () => {
    setSelectedFood(null);
    setIsCustomEntry(true);
    resetCustomFields();
  };

  const validateCustomEntry = (): boolean => {
    if (!customName.trim()) {
      Alert.alert('Error', 'Please enter a food name');
      return false;
    }
    if (!customCalories || isNaN(Number(customCalories)) || Number(customCalories) < 0) {
      Alert.alert('Error', 'Please enter valid calories');
      return false;
    }
    if (!customServingSize.trim()) {
      Alert.alert('Error', 'Please enter serving size');
      return false;
    }

    // Validate nutrition data using food database
    const nutritionData = {
      calories: Number(customCalories),
      protein: Number(customProtein) || 0,
      carbs: Number(customCarbs) || 0,
      fats: Number(customFats) || 0,
    };

    const validation = foodDatabase.validateNutritionData(nutritionData);
    if (!validation.isValid) {
      Alert.alert('Validation Error', validation.errors.join('\n'));
      return false;
    }

    return true;
  };

  const handleAddFood = async () => {
    const quantityNum = Number(quantity);
    if (isNaN(quantityNum) || quantityNum <= 0) {
      Alert.alert('Error', 'Please enter a valid quantity');
      return;
    }

    if (isCustomEntry) {
      if (!validateCustomEntry()) return;

      // Save custom food to database for future use
      try {
        await foodDatabase.addUserFood({
          name: customName.trim(),
          servingSize: customServingSize.trim(),
          caloriesPerServing: Number(customCalories),
          macrosPerServing: {
            protein: Number(customProtein) || 0,
            carbs: Number(customCarbs) || 0,
            fats: Number(customFats) || 0,
          },
        });
      } catch (error) {
        console.error('Failed to save custom food:', error);
      }

      const customFood: LoggedFood = {
        name: customName.trim(),
        calories: Math.round(Number(customCalories) * quantityNum),
        protein: Math.round((Number(customProtein) || 0) * quantityNum),
        carbs: Math.round((Number(customCarbs) || 0) * quantityNum),
        fats: Math.round((Number(customFats) || 0) * quantityNum),
        servingSize: customServingSize.trim(),
        quantity: quantityNum,
        mealType: selectedMealType,
        timestamp: new Date(),
      };

      onAddFood(customFood);
    } else if (selectedFood) {
      // Add to recent foods
      try {
        await foodDatabase.addToRecent(selectedFood);
      } catch (error) {
        console.error('Failed to add to recent foods:', error);
      }

      const loggedFood: LoggedFood = {
        name: selectedFood.name,
        calories: Math.round(selectedFood.caloriesPerServing * quantityNum),
        protein: Math.round(selectedFood.macrosPerServing.protein * quantityNum),
        carbs: Math.round(selectedFood.macrosPerServing.carbs * quantityNum),
        fats: Math.round(selectedFood.macrosPerServing.fats * quantityNum),
        servingSize: selectedFood.servingSize,
        quantity: quantityNum,
        mealType: selectedMealType,
        timestamp: new Date(),
      };

      onAddFood(loggedFood);
    } else {
      Alert.alert('Error', 'Please select a food item or enter custom food details');
      return;
    }

    onClose();
  };

  const renderFoodItem = (food: FoodItem) => (
    <TouchableOpacity
      key={food.id}
      style={[
        styles.foodItem,
        selectedFood?.id === food.id && styles.selectedFoodItem,
      ]}
      onPress={() => handleFoodSelect(food)}
    >
      <View style={styles.foodItemContent}>
        <Text style={styles.foodName}>{food.name}</Text>
        {food.brand && <Text style={styles.foodBrand}>{food.brand}</Text>}
        <Text style={styles.foodServing}>{food.servingSize}</Text>
        <View style={styles.foodNutrition}>
          <Text style={styles.foodCalories}>{food.caloriesPerServing} cal</Text>
          <Text style={styles.foodMacros}>
            P: {food.macrosPerServing.protein}g • C: {food.macrosPerServing.carbs}g • F: {food.macrosPerServing.fats}g
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderMealTypeSelector = () => (
    <View style={styles.mealTypeContainer}>
      <Text style={styles.sectionTitle}>Meal Type</Text>
      <View style={styles.mealTypeButtons}>
        {(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map((mealType) => (
          <TouchableOpacity
            key={mealType}
            style={[
              styles.mealTypeButton,
              selectedMealType === mealType && styles.selectedMealTypeButton,
            ]}
            onPress={() => setSelectedMealType(mealType)}
          >
            {MEAL_TYPE_ICONS[mealType]}
            <Text
              style={[
                styles.mealTypeText,
                selectedMealType === mealType && styles.selectedMealTypeText,
              ]}
            >
              {mealType.charAt(0).toUpperCase() + mealType.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderQuantityInput = () => (
    <View style={styles.quantityContainer}>
      <Text style={styles.sectionTitle}>Quantity</Text>
      <TextInput
        style={styles.quantityInput}
        value={quantity}
        onChangeText={setQuantity}
        keyboardType="decimal-pad"
        placeholder="1.0"
        placeholderTextColor={Colors.lightText}
      />
    </View>
  );

  const renderCustomEntry = () => (
    <View style={styles.customEntryContainer}>
      <Text style={styles.sectionTitle}>Custom Food Entry</Text>
      
      <TextInput
        style={styles.input}
        value={customName}
        onChangeText={setCustomName}
        placeholder="Food name"
        placeholderTextColor={Colors.lightText}
      />
      
      <TextInput
        style={styles.input}
        value={customServingSize}
        onChangeText={setCustomServingSize}
        placeholder="Serving size (e.g., 1 cup, 100g)"
        placeholderTextColor={Colors.lightText}
      />
      
      <View style={styles.macroInputsRow}>
        <TextInput
          style={[styles.input, styles.macroInput]}
          value={customCalories}
          onChangeText={setCustomCalories}
          placeholder="Calories"
          placeholderTextColor={Colors.lightText}
          keyboardType="numeric"
        />
        <TextInput
          style={[styles.input, styles.macroInput]}
          value={customProtein}
          onChangeText={setCustomProtein}
          placeholder="Protein (g)"
          placeholderTextColor={Colors.lightText}
          keyboardType="decimal-pad"
        />
      </View>
      
      <View style={styles.macroInputsRow}>
        <TextInput
          style={[styles.input, styles.macroInput]}
          value={customCarbs}
          onChangeText={setCustomCarbs}
          placeholder="Carbs (g)"
          placeholderTextColor={Colors.lightText}
          keyboardType="decimal-pad"
        />
        <TextInput
          style={[styles.input, styles.macroInput]}
          value={customFats}
          onChangeText={setCustomFats}
          placeholder="Fats (g)"
          placeholderTextColor={Colors.lightText}
          keyboardType="decimal-pad"
        />
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          style={styles.keyboardAvoid}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.title}>Log Food</Text>
            <View style={styles.headerSpacer} />
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Meal Type Selector */}
            {renderMealTypeSelector()}

            {/* Search Section */}
            {!isCustomEntry && (
              <View style={styles.searchContainer}>
                <Text style={styles.sectionTitle}>Search Foods</Text>
                <View style={styles.searchInputContainer}>
                  <Search size={20} color={Colors.lightText} style={styles.searchIcon} />
                  <TextInput
                    style={styles.searchInput}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Search for foods..."
                    placeholderTextColor={Colors.lightText}
                  />
                </View>

                {/* Food Results */}
                <ScrollView style={styles.foodList} nestedScrollEnabled>
                  {isSearching ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="small" color={Colors.primary} />
                      <Text style={styles.loadingText}>Searching foods...</Text>
                    </View>
                  ) : (
                    searchResults.map(renderFoodItem)
                  )}
                  
                  {/* Custom Entry Button */}
                  <TouchableOpacity
                    style={styles.customEntryButton}
                    onPress={handleCustomEntry}
                  >
                    <Plus size={20} color={Colors.primary} />
                    <Text style={styles.customEntryButtonText}>Add Custom Food</Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>
            )}

            {/* Custom Entry Form */}
            {isCustomEntry && renderCustomEntry()}

            {/* Selected Food Details */}
            {selectedFood && !isCustomEntry && (
              <View style={styles.selectedFoodContainer}>
                <Text style={styles.sectionTitle}>Selected Food</Text>
                <View style={styles.selectedFoodDetails}>
                  <Text style={styles.selectedFoodName}>{selectedFood.name}</Text>
                  <Text style={styles.selectedFoodServing}>{selectedFood.servingSize}</Text>
                  <View style={styles.selectedFoodNutrition}>
                    <Text style={styles.selectedFoodCalories}>
                      {Math.round(selectedFood.caloriesPerServing * Number(quantity || 1))} calories
                    </Text>
                    <Text style={styles.selectedFoodMacros}>
                      Protein: {Math.round(selectedFood.macrosPerServing.protein * Number(quantity || 1))}g • 
                      Carbs: {Math.round(selectedFood.macrosPerServing.carbs * Number(quantity || 1))}g • 
                      Fats: {Math.round(selectedFood.macrosPerServing.fats * Number(quantity || 1))}g
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Quantity Input */}
            {(selectedFood || isCustomEntry) && renderQuantityInput()}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <Button
              title="Cancel"
              variant="outline"
              onPress={onClose}
              style={styles.cancelButton}
            />
            <Button
              title="Add Food"
              onPress={handleAddFood}
              style={styles.addButton}
              disabled={!selectedFood && !isCustomEntry}
            />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardAvoid: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  title: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
  },
  headerSpacer: {
    width: 32,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  mealTypeContainer: {
    marginBottom: Spacing.md,
  },
  mealTypeButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  mealTypeButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    marginHorizontal: Spacing.xs,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  selectedMealTypeButton: {
    borderColor: Colors.primary,
    backgroundColor: Colors.tints.brandTintSoft,
  },
  mealIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  mealTypeText: {
    fontSize: Typography.sizes.sm,
    color: Colors.text,
    textAlign: 'center',
  },
  selectedMealTypeText: {
    color: Colors.primary,
    fontWeight: Typography.weights.medium,
  },
  searchContainer: {
    marginBottom: Spacing.md,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.sm,
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: Spacing.sm,
    fontSize: Typography.sizes.md,
    color: Colors.text,
  },
  foodList: {
    maxHeight: 300,
    marginTop: Spacing.sm,
  },
  foodItem: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  selectedFoodItem: {
    borderColor: Colors.primary,
    backgroundColor: Colors.tints.brandTintSoft,
  },
  foodItemContent: {
    flex: 1,
  },
  foodName: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.medium,
    color: Colors.text,
    marginBottom: 2,
  },
  foodBrand: {
    fontSize: Typography.sizes.sm,
    color: Colors.lightText,
    marginBottom: 4,
  },
  foodServing: {
    fontSize: Typography.sizes.sm,
    color: Colors.lightText,
    marginBottom: Spacing.xs,
  },
  foodNutrition: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  foodCalories: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    color: Colors.primary,
  },
  foodMacros: {
    fontSize: Typography.sizes.xs,
    color: Colors.lightText,
  },
  customEntryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    padding: Spacing.md,
    marginTop: Spacing.sm,
  },
  customEntryButtonText: {
    fontSize: Typography.sizes.md,
    color: Colors.primary,
    marginLeft: Spacing.sm,
    fontWeight: Typography.weights.medium,
  },
  customEntryContainer: {
    marginBottom: Spacing.md,
  },
  input: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    fontSize: Typography.sizes.md,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  macroInputsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  macroInput: {
    flex: 1,
    marginHorizontal: Spacing.xs,
  },
  selectedFoodContainer: {
    marginBottom: Spacing.md,
  },
  selectedFoodDetails: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary,
    padding: Spacing.sm,
  },
  selectedFoodName: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
    marginBottom: 4,
  },
  selectedFoodServing: {
    fontSize: Typography.sizes.sm,
    color: Colors.lightText,
    marginBottom: Spacing.sm,
  },
  selectedFoodNutrition: {
    alignItems: 'center',
  },
  selectedFoodCalories: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    color: Colors.primary,
    marginBottom: 4,
  },
  selectedFoodMacros: {
    fontSize: Typography.sizes.sm,
    color: Colors.lightText,
    textAlign: 'center',
  },
  quantityContainer: {
    marginBottom: Spacing.md,
  },
  quantityInput: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    fontSize: Typography.sizes.lg,
    color: Colors.text,
    textAlign: 'center',
    fontWeight: Typography.weights.medium,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: Spacing.sm,
  },
  cancelButton: {
    flex: 1,
  },
  addButton: {
    flex: 2,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
  },
  loadingText: {
    fontSize: Typography.sizes.sm,
    color: Colors.lightText,
    marginLeft: Spacing.sm,
  },
});