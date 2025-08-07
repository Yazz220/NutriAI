# Meal Planner Design Document

## Overview

The Meal Planner feature will be implemented as a comprehensive meal planning system that integrates with the existing inventory, meals, and shopping list functionality. The design focuses on creating an intuitive calendar-based interface for meal planning, intelligent recipe recommendations based on available inventory, and seamless integration with the shopping list generation.

## Architecture

### Component Structure
```
app/(tabs)/planner.tsx (New main planner tab - Weekly calendar view)
├── components/MealPlannerCalendar.tsx (Weekly calendar component)
├── components/MealPlanModal.tsx (Add/edit meals to plan)
├── components/NutritionSummary.tsx (Daily/weekly nutrition overview)
└── components/CookMealModal.tsx (Cooking workflow)

app/(tabs)/recipes.tsx (Enhanced existing recipes tab)
├── components/RecipeExplorer.tsx (Recipe search and browse - "Explore" functionality)
├── components/RecipeRecommendations.tsx (Smart recommendations based on inventory)
└── components/RecipeDetailModal.tsx (Existing component, enhanced)
```

### Tab Organization
- **Planner Tab**: Primary meal planning interface with weekly calendar, planned meals, and cooking workflow
- **Recipes Tab**: Enhanced to include "Explore" functionality with inventory-based recommendations
- **Integration**: Both tabs work together - users explore recipes in the Recipes tab and add them to their plan in the Planner tab

### State Management
- New `useMealPlanner` hook for managing planned meals
- Integration with existing `useInventory`, `useMeals`, and `useShoppingList` hooks
- Local state management for UI interactions and temporary data

### Data Flow
1. User browses recipes → Recipe recommendations based on inventory
2. User selects recipe → Add to meal plan for specific day/meal type
3. User generates shopping list → System calculates missing ingredients
4. User cooks meal → Ingredients deducted from inventory

## Components and Interfaces

### MealPlannerCalendar Component
**Purpose**: Display weekly calendar with planned meals
**Props**:
- `plannedMeals: PlannedMeal[]`
- `onDayPress: (date: string) => void`
- `onMealPress: (plannedMeal: PlannedMeal) => void`

**Features**:
- Weekly view with navigation between weeks
- Visual indicators for meal types (breakfast, lunch, dinner)
- Color coding for meal availability status
- Responsive design for different screen sizes

### RecipeExplorer Component
**Purpose**: Browse and search available recipes
**Props**:
- `recipes: Recipe[]`
- `inventory: InventoryItem[]`
- `onRecipeSelect: (recipe: Recipe) => void`
- `searchQuery: string`
- `filterOptions: RecipeFilter`

**Features**:
- Search functionality with debounced input
- Filter options (Can Make Now, Missing Few Items, All Recipes)
- Recipe cards showing availability status
- Sorting by relevance, prep time, or availability

### MealPlanModal Component
**Purpose**: Add or edit meals in the meal plan
**Props**:
- `visible: boolean`
- `selectedDate: string`
- `selectedMealType?: MealType`
- `existingMeal?: PlannedMeal`
- `onSave: (plannedMeal: PlannedMeal) => void`
- `onClose: () => void`

**Features**:
- Date and meal type selection
- Recipe selection with search
- Serving size adjustment
- Meal notes and customization

### RecipeRecommendations Component
**Purpose**: Show intelligent recipe suggestions
**Props**:
- `inventory: InventoryItem[]`
- `expiringItems: InventoryItem[]`
- `recipes: Recipe[]`
- `onRecipeSelect: (recipe: Recipe) => void`

**Features**:
- Priority ranking based on expiring ingredients
- Availability percentage display
- Quick add to meal plan functionality
- Refresh recommendations button

## Data Models

### PlannedMeal Interface
```typescript
interface PlannedMeal {
  id: string;
  recipeId: string;
  date: string; // ISO date string
  mealType: MealType;
  servings: number;
  notes?: string;
  isCompleted: boolean;
  completedAt?: string;
}
```

### MealType Enum
```typescript
type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
```

### RecipeAvailability Interface
```typescript
interface RecipeAvailability {
  recipeId: string;
  availableIngredients: number;
  totalIngredients: number;
  availabilityPercentage: number;
  missingIngredients: MealIngredient[];
  expiringIngredients: MealIngredient[];
}
```

### MealPlanSummary Interface
```typescript
interface MealPlanSummary {
  date: string;
  meals: PlannedMeal[];
  totalCalories?: number;
  totalProtein?: number;
  totalCarbs?: number;
  totalFats?: number;
  missingIngredientsCount: number;
}
```

### WeeklyMealPlan Interface
```typescript
interface WeeklyMealPlan {
  weekStartDate: string;
  days: MealPlanSummary[];
  totalMissingIngredients: MealIngredient[];
  weeklyNutritionSummary?: NutritionSummary;
}
```

## Error Handling

### Recipe Availability Calculation
- Handle cases where inventory items have different units than recipe requirements
- Gracefully handle missing nutritional data
- Provide fallback values for unavailable recipe information

### Meal Planning Conflicts
- Prevent double-booking of meal slots (optional - allow multiple meals per slot)
- Handle cases where recipes are deleted after being planned
- Manage ingredient conflicts when multiple meals require the same ingredients

### Shopping List Integration
- Handle duplicate ingredients across multiple planned meals
- Manage quantity calculations when recipes have different serving sizes
- Prevent adding items that are already in sufficient quantity

### Data Persistence
- Handle AsyncStorage failures gracefully
- Provide offline functionality with local data
- Implement data validation for corrupted meal plan data

## Testing Strategy

### Unit Tests
- Recipe availability calculation logic
- Meal plan data manipulation functions
- Shopping list generation algorithms
- Nutritional calculation utilities

### Integration Tests
- Meal planner hook integration with inventory and shopping list stores
- Recipe recommendation algorithm with real inventory data
- End-to-end meal planning workflow

### Component Tests
- Calendar navigation and meal display
- Recipe explorer search and filtering
- Meal plan modal form validation
- Cooking workflow and inventory deduction

### User Experience Tests
- Calendar performance with large numbers of planned meals
- Recipe search performance with large recipe databases
- Smooth transitions between planning and cooking workflows
- Responsive design across different screen sizes

## Performance Considerations

### Data Optimization
- Implement memoization for recipe availability calculations
- Use lazy loading for recipe images and detailed information
- Cache frequently accessed meal plan data

### UI Performance
- Virtualize recipe lists for large datasets
- Optimize calendar rendering for smooth scrolling
- Implement debounced search to reduce API calls

### Memory Management
- Clean up unused recipe data and images
- Implement efficient data structures for meal plan storage
- Monitor memory usage during extended meal planning sessions

## Accessibility

### Screen Reader Support
- Provide descriptive labels for calendar navigation
- Announce meal plan changes and updates
- Support keyboard navigation for all interactive elements

### Visual Accessibility
- Ensure sufficient color contrast for meal status indicators
- Provide alternative text for recipe images
- Support dynamic font sizing for better readability

### Motor Accessibility
- Implement large touch targets for calendar interactions
- Provide alternative input methods for meal planning
- Support voice control integration (future enhancement)