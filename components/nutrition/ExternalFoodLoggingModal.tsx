import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  X, 
  Search, 
  Camera, 
  Plus, 
  Minus,
  Check,
  Info,
  ChevronRight,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '@/constants/colors';
import { Spacing, Typography } from '@/constants/spacing';
import { Button } from '@/components/ui/Button';
import { MealType } from '@/types';
import { searchFoodDatabase, FoodSearchResult } from '@/utils/openFoodFacts';
interface ExternalFoodLoggingModalProps {
  visible: boolean;
  onClose: () => void;
  selectedDate: string;
  selectedMealType: MealType;
  onLogFood: (foodData: LoggedFoodItem) => void;
  initialTab?: 'search' | 'scan' | 'manual';
  imageToAnalyze?: string | null;
}

interface LoggedFoodItem {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  servings: number;
  mealType: MealType;
  date: string;
  imageUri?: string;
  source: 'manual' | 'ai_scan' | 'search';
}
const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};

export const ExternalFoodLoggingModal: React.FC<ExternalFoodLoggingModalProps> = ({
  visible,
  onClose,
  selectedDate,
  selectedMealType,
  onLogFood,
  initialTab = 'search',
  imageToAnalyze,
}) => {
  const [activeTab, setActiveTab] = useState<'search' | 'scan' | 'manual'>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FoodSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedFood, setSelectedFood] = useState<FoodSearchResult | null>(null);
  const [servings, setServings] = useState(1);
  const [capturedImage, setCapturedImage] = useState<string | null>(imageToAnalyze || null);
  const [isAnalyzing, setIsAnalyzing] = useState(!!imageToAnalyze);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<LoggedFoodItem | null>(null);
  
  // Manual entry states
  const [manualFood, setManualFood] = useState({
    name: '',
    calories: '',
    protein: '',
    carbs: '',
    fats: '',
  });

  const searchTimeoutRef = useRef<number | null>(null);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      const results = await searchFoodDatabase(query);
      setSearchResults(results);
      setIsSearching(false);
    }, 500) as any;
  };

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Camera permission is required to take photos');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setCapturedImage(result.assets[0].uri);
        setActiveTab('scan');
        await analyzeImage(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const handleSelectFromGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Photo library permission is required');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setCapturedImage(result.assets[0].uri);
        setActiveTab('scan');
        await analyzeImage(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to select image');
    }
  };

  const analyzeImage = async (imageUri: string) => {
    setIsAnalyzing(true);
    
    // Mock AI analysis - in real app, this would call an AI service
    setTimeout(() => {
      const mockAnalysis: LoggedFoodItem = {
        name: 'Grilled Chicken Salad',
        calories: 320,
        protein: 28,
        carbs: 12,
        fats: 18,
        servings: 1,
        mealType: selectedMealType,
        date: selectedDate,
        imageUri,
        source: 'ai_scan',
      };
      
      setAiAnalysisResult(mockAnalysis);
      setIsAnalyzing(false);
    }, 2000);
  };

  const handleLogFood = () => {
    let foodToLog: LoggedFoodItem;

    if (activeTab === 'search' && selectedFood) {
      foodToLog = {
        name: selectedFood.name,
        calories: selectedFood.calories * servings,
        protein: selectedFood.protein * servings,
        carbs: selectedFood.carbs * servings,
        fats: selectedFood.fats * servings,
        servings,
        mealType: selectedMealType,
        date: selectedDate,
        source: 'search',
      };
    } else if (activeTab === 'scan' && aiAnalysisResult) {
      foodToLog = aiAnalysisResult;
    } else if (activeTab === 'manual') {
      const calories = parseFloat(manualFood.calories) || 0;
      const protein = parseFloat(manualFood.protein) || 0;
      const carbs = parseFloat(manualFood.carbs) || 0;
      const fats = parseFloat(manualFood.fats) || 0;

      if (!manualFood.name.trim() || calories <= 0) {
        Alert.alert('Invalid Input', 'Please enter a food name and calories');
        return;
      }

      foodToLog = {
        name: manualFood.name,
        calories,
        protein,
        carbs,
        fats,
        servings: 1,
        mealType: selectedMealType,
        date: selectedDate,
        source: 'manual',
      };
    } else {
      return;
    }

    onLogFood(foodToLog);
    handleClose();
  };

  const handleClose = () => {
    setActiveTab(initialTab);
    setSearchQuery('');
    setSearchResults([]);
    setSelectedFood(null);
    setServings(1);
    setCapturedImage(null);
    setAiAnalysisResult(null);
    setManualFood({
      name: '',
      calories: '',
      protein: '',
      carbs: '',
      fats: '',
    });
    onClose();
  };

  // Reset to initial tab when modal opens
  React.useEffect(() => {
    if (visible) {
      setActiveTab(initialTab);
      if (imageToAnalyze) {
        setCapturedImage(imageToAnalyze);
        analyzeImage(imageToAnalyze);
      }
    }
  }, [visible, initialTab, imageToAnalyze]);

  const renderSearchTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color={Colors.lightText} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for food..."
            value={searchQuery}
            onChangeText={handleSearch}
            autoCapitalize="none"
          />
        </View>
      </View>

      {isSearching && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={Colors.primary} />
          <Text style={styles.loadingText}>Searching...</Text>
        </View>
      )}

      <ScrollView style={styles.resultsContainer}>
        {searchResults.map((food) => (
          <TouchableOpacity
            key={food.id}
            style={[
              styles.foodItem,
              selectedFood?.id === food.id && styles.selectedFoodItem
            ]}
            onPress={() => setSelectedFood(food)}
          >
            {food.imageUrl ? (
              <Image source={{ uri: food.imageUrl }} style={styles.foodImage} />
            ) : (
              <View style={styles.foodImagePlaceholder} />
            )}
            <View style={styles.foodItemContent}>
              <Text style={styles.foodName}>{food.name}</Text>
              {food.brand && <Text style={styles.foodBrand}>{food.brand}</Text>}
              <Text style={styles.foodServing}>{food.servingSize}</Text>
              <View style={styles.nutritionRow}>
                <Text style={styles.nutritionText}>{food.calories} cal</Text>
                <Text style={styles.nutritionText}>P: {food.protein}g</Text>
                <Text style={styles.nutritionText}>C: {food.carbs}g</Text>
                <Text style={styles.nutritionText}>F: {food.fats}g</Text>
              </View>
            </View>
            <ChevronRight size={20} color={Colors.lightText} />
          </TouchableOpacity>
        ))}
      </ScrollView>

      {selectedFood && (
        <View style={styles.servingsContainer}>
          <Text style={styles.servingsLabel}>Quantity:</Text>
          <View style={styles.servingsControls}>
            <TouchableOpacity
              style={styles.servingButton}
              onPress={() => setServings(Math.max(0.25, servings - 0.25))}
            >
              <Minus size={16} color={Colors.primary} />
            </TouchableOpacity>
            <Text style={styles.servingsValue}>{servings}</Text>
            <TouchableOpacity
              style={styles.servingButton}
              onPress={() => setServings(servings + 0.25)}
            >
              <Plus size={16} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );

  const renderScanTab = () => (
    <View style={styles.tabContent}>
      {!capturedImage ? (
        <View style={styles.scanOptions}>
          <TouchableOpacity style={styles.scanButton} onPress={handleTakePhoto}>
            <Camera size={32} color={Colors.primary} />
            <Text style={styles.scanButtonText}>Take Photo</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.scanButton} onPress={handleSelectFromGallery}>
            <Image 
              source={{ uri: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTkgMTJMMTEgMTRMMTUgMTBNMjEgMTJDMjEgMTYuOTcwNiAxNi45NzA2IDIxIDEyIDIxQzcuMDI5NDQgMjEgMyAxNi45NzA2IDMgMTJDMyA3LjAyOTQ0IDcuMDI5NDQgMyAxMiAzQzE2Ljk3MDYgMyAyMSA3LjAyOTQ0IDIxIDEyWiIgc3Ryb2tlPSIjNjM2NkYxIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4K' }} 
              style={{ width: 32, height: 32, tintColor: Colors.primary }} 
            />
            <Text style={styles.scanButtonText}>Choose from Gallery</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.imageAnalysisContainer}>
          <Image source={{ uri: capturedImage }} style={styles.capturedImage} />
          
          {isAnalyzing ? (
            <View style={styles.analyzingContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.analyzingText}>Analyzing image...</Text>
              <Text style={styles.analyzingSubtext}>AI is identifying the food and calculating nutrition</Text>
            </View>
          ) : aiAnalysisResult ? (
            <View style={styles.analysisResult}>
              <Text style={styles.analysisTitle}>AI Analysis Result</Text>
              <Text style={styles.detectedFood}>{aiAnalysisResult.name}</Text>
              <View style={styles.nutritionGrid}>
                <View style={styles.nutritionItem}>
                  <Text style={styles.nutritionValue}>{aiAnalysisResult.calories}</Text>
                  <Text style={styles.nutritionLabel}>Calories</Text>
                </View>
                <View style={styles.nutritionItem}>
                  <Text style={styles.nutritionValue}>{aiAnalysisResult.protein}g</Text>
                  <Text style={styles.nutritionLabel}>Protein</Text>
                </View>
                <View style={styles.nutritionItem}>
                  <Text style={styles.nutritionValue}>{aiAnalysisResult.carbs}g</Text>
                  <Text style={styles.nutritionLabel}>Carbs</Text>
                </View>
                <View style={styles.nutritionItem}>
                  <Text style={styles.nutritionValue}>{aiAnalysisResult.fats}g</Text>
                  <Text style={styles.nutritionLabel}>Fats</Text>
                </View>
              </View>
              
              <TouchableOpacity 
                style={styles.retakeButton}
                onPress={() => {
                  setCapturedImage(null);
                  setAiAnalysisResult(null);
                }}
              >
                <Text style={styles.retakeButtonText}>Retake Photo</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      )}
    </View>
  );

  const renderManualTab = () => (
    <ScrollView style={styles.tabContent}>
      <View style={styles.manualForm}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Food Name *</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g., Grilled Chicken Breast"
            value={manualFood.name}
            onChangeText={(text) => setManualFood(prev => ({ ...prev, name: text }))}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Calories *</Text>
          <TextInput
            style={styles.textInput}
            placeholder="0"
            value={manualFood.calories}
            onChangeText={(text) => setManualFood(prev => ({ ...prev, calories: text }))}
            keyboardType="numeric"
          />
        </View>

        <View style={styles.macroInputs}>
          <View style={styles.macroInput}>
            <Text style={styles.inputLabel}>Protein (g)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="0"
              value={manualFood.protein}
              onChangeText={(text) => setManualFood(prev => ({ ...prev, protein: text }))}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.macroInput}>
            <Text style={styles.inputLabel}>Carbs (g)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="0"
              value={manualFood.carbs}
              onChangeText={(text) => setManualFood(prev => ({ ...prev, carbs: text }))}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.macroInput}>
            <Text style={styles.inputLabel}>Fats (g)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="0"
              value={manualFood.fats}
              onChangeText={(text) => setManualFood(prev => ({ ...prev, fats: text }))}
              keyboardType="numeric"
            />
          </View>
        </View>

        <View style={styles.infoBox}>
          <Info size={16} color={Colors.primary} />
          <Text style={styles.infoText}>
            Only food name and calories are required. Macros are optional but help with better tracking.
          </Text>
        </View>
      </View>
    </ScrollView>
  );

  const canLogFood = () => {
    if (activeTab === 'search') return selectedFood !== null;
    if (activeTab === 'scan') return aiAnalysisResult !== null;
    if (activeTab === 'manual') return manualFood.name.trim() && parseFloat(manualFood.calories) > 0;
    return false;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <X size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Log Food</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Meal Type Info */}
        <View style={styles.mealInfo}>
          <Text style={styles.mealInfoText}>
            Adding to {MEAL_TYPE_LABELS[selectedMealType]} • {new Date(selectedDate).toLocaleDateString()}
          </Text>
        </View>

        {/* Tabs */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'search' && styles.activeTab]}
            onPress={() => setActiveTab('search')}
          >
            <Search size={20} color={activeTab === 'search' ? Colors.primary : Colors.lightText} />
            <Text style={[styles.tabText, activeTab === 'search' && styles.activeTabText]}>
              Search
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'scan' && styles.activeTab]}
            onPress={() => setActiveTab('scan')}
          >
            <Camera size={20} color={activeTab === 'scan' ? Colors.primary : Colors.lightText} />
            <Text style={[styles.tabText, activeTab === 'scan' && styles.activeTabText]}>
              AI Scan
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'manual' && styles.activeTab]}
            onPress={() => setActiveTab('manual')}
          >
            <Plus size={20} color={activeTab === 'manual' ? Colors.primary : Colors.lightText} />
            <Text style={[styles.tabText, activeTab === 'manual' && styles.activeTabText]}>
              Manual
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        <View style={styles.content}>
          {activeTab === 'search' && renderSearchTab()}
          {activeTab === 'scan' && renderScanTab()}
          {activeTab === 'manual' && renderManualTab()}
        </View>

        {/* Log Button */}
        <View style={styles.footer}>
          <Button
            title="Log Food"
            onPress={handleLogFood}
            disabled={!canLogFood()}
            style={StyleSheet.flatten([styles.logButton, !canLogFood() && styles.disabledButton])}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
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
  mealInfo: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  mealInfoText: {
    fontSize: Typography.sizes.sm,
    color: Colors.lightText,
    textAlign: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.xs,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
  },
  tabText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    color: Colors.lightText,
  },
  activeTabText: {
    color: Colors.primary,
  },
  content: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
    padding: Spacing.md,
  },
  
  // Search Tab Styles
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
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.sizes.md,
    color: Colors.text,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
    gap: Spacing.sm,
  },
  loadingText: {
    fontSize: Typography.sizes.sm,
    color: Colors.lightText,
  },
  resultsContainer: {
    flex: 1,
  },
  foodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  foodImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: Colors.card,
  },
  foodImagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: Colors.border,
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
    fontWeight: Typography.weights.semibold,
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
  nutritionRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  nutritionText: {
    fontSize: Typography.sizes.xs,
    color: Colors.lightText,
    fontWeight: Typography.weights.medium,
  },
  servingsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginTop: Spacing.md,
  },
  servingsLabel: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.medium,
    color: Colors.text,
  },
  servingsControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  servingButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.tints.brandTintSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  servingsValue: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
    minWidth: 40,
    textAlign: 'center',
  },

  // Scan Tab Styles
  scanOptions: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.xl,
  },
  scanButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 200,
    gap: Spacing.md,
  },
  scanButtonText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.medium,
    color: Colors.text,
  },
  imageAnalysisContainer: {
    flex: 1,
  },
  capturedImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: Spacing.md,
  },
  analyzingContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    gap: Spacing.md,
  },
  analyzingText: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
  },
  analyzingSubtext: {
    fontSize: Typography.sizes.sm,
    color: Colors.lightText,
    textAlign: 'center',
  },
  analysisResult: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
  },
  analysisTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  detectedFood: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: Colors.primary,
    marginBottom: Spacing.md,
  },
  nutritionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: Spacing.md,
  },
  nutritionItem: {
    alignItems: 'center',
  },
  nutritionValue: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  nutritionLabel: {
    fontSize: Typography.sizes.xs,
    color: Colors.lightText,
    marginTop: 2,
  },
  retakeButton: {
    alignSelf: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  retakeButtonText: {
    fontSize: Typography.sizes.sm,
    color: Colors.lightText,
  },

  // Manual Tab Styles
  manualForm: {
    gap: Spacing.md,
  },
  inputGroup: {
    gap: Spacing.xs,
  },
  inputLabel: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    color: Colors.text,
  },
  textInput: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: Typography.sizes.md,
    color: Colors.text,
  },
  macroInputs: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  macroInput: {
    flex: 1,
    gap: Spacing.xs,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.tints.brandTintSoft,
    borderRadius: 12,
    padding: Spacing.md,
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  infoText: {
    flex: 1,
    fontSize: Typography.sizes.sm,
    color: Colors.text,
    lineHeight: 20,
  },

  // Footer
  footer: {
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  logButton: {
    width: '100%',
  },
  disabledButton: {
    opacity: 0.5,
  },
});
