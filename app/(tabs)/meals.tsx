import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  FlatList
} from 'react-native';
import { Stack } from 'expo-router';
import { Filter } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { useMeals } from '@/hooks/useMealsStore';
import { MealCard } from '@/components/MealCard';
import { MealDetailModal } from '@/components/MealDetailModal';
import { Meal } from '@/types';

export default function MealsScreen() {
  const { isLoading, getRecommendedMeals } = useMeals();
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }
  
  const recommendedMeals = getRecommendedMeals();
  
  const handleMealPress = (meal: Meal) => {
    setSelectedMeal(meal);
    setDetailModalVisible(true);
  };
  
  return (
    <>
      <Stack.Screen 
        options={{ 
          headerShown: true,
          title: 'Meal Ideas',
          headerRight: () => (
            <TouchableOpacity 
              style={styles.filterButton}
              testID="filter-meals-button"
            >
              <Filter size={20} color={Colors.primary} />
            </TouchableOpacity>
          )
        }} 
      />
      
      <View style={styles.container}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.tagsScroll}
          contentContainerStyle={styles.tagsScrollContent}
        >
          <TouchableOpacity style={[styles.tagButton, styles.activeTagButton]}>
            <Text style={[styles.tagText, styles.activeTagText]}>All</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tagButton}>
            <Text style={styles.tagText}>Quick</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tagButton}>
            <Text style={styles.tagText}>Healthy</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tagButton}>
            <Text style={styles.tagText}>Vegetarian</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tagButton}>
            <Text style={styles.tagText}>Breakfast</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tagButton}>
            <Text style={styles.tagText}>Dinner</Text>
          </TouchableOpacity>
        </ScrollView>
        
        <FlatList
          data={recommendedMeals}
          keyExtractor={(item) => item.meal.id}
          renderItem={({ item }) => (
            <MealCard 
              meal={item.meal}
              available={item.availability.available}
              missingIngredientsCount={item.availability.missingIngredients.length}
              onPress={() => handleMealPress(item.meal)}
            />
          )}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No meals available</Text>
              <Text style={styles.emptySubtext}>
                Add ingredients to your inventory to see meal suggestions
              </Text>
            </View>
          }
        />
        
        <MealDetailModal 
          visible={detailModalVisible}
          onClose={() => setDetailModalVisible(false)}
          meal={selectedMeal}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  filterButton: {
    padding: 8,
    marginRight: 8,
  },
  tagsScroll: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    flexGrow: 0, // Prevent the ScrollView from taking up too much space
  },
  tagsScrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 12, // Add vertical padding to give space around the tags
    alignItems: 'center',
  },
  tagButton: {
    height: 40, // Set a fixed height for the tags
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 18,
    backgroundColor: Colors.secondary,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  activeTagButton: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  tagText: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500',
  },
  activeTagText: {
    color: Colors.white,
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    marginTop: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.lightText,
    textAlign: 'center',
  },
});