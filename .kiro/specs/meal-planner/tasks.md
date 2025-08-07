# Implementation Plan

- [x] 1. Create core data models and types for meal planning



  - Define PlannedMeal, MealType, RecipeAvailability, and MealPlanSummary interfaces in types/index.ts
  - Add meal planning related types that extend existing Recipe and InventoryItem types
  - Create utility types for meal plan filtering and sorting
  - _Requirements: 1.1, 2.1, 3.1, 4.1_

- [x] 2. Implement meal planner state management hook


  - Create hooks/useMealPlanner.ts with context provider and hook
  - Implement AsyncStorage persistence for planned meals
  - Add functions for adding, updating, and removing planned meals
  - Integrate with existing inventory and meals stores for data consistency
  - _Requirements: 3.2, 3.3, 6.2, 6.3_



- [ ] 3. Create recipe availability calculation utilities
  - Implement utility functions to calculate recipe availability based on current inventory
  - Add logic to identify missing ingredients and expiring ingredients for recipes
  - Create functions to calculate availability percentages and prioritize recipes


  - Add unit conversion logic for ingredient matching between recipes and inventory
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 4. Build the main planner tab layout and navigation
  - Create app/(tabs)/planner.tsx as the main meal planning screen


  - Implement basic tab layout with header and navigation structure
  - Add tab bar integration and ensure proper routing
  - Create placeholder sections for calendar, nutrition summary, and quick actions
  - _Requirements: 1.1, 1.2_

- [x] 5. Implement the weekly meal planner calendar component


  - Create components/MealPlannerCalendar.tsx with weekly calendar view
  - Add date navigation (previous/next week) with smooth transitions
  - Implement day cells that display planned meals with meal type indicators
  - Add touch interactions for selecting days and viewing meal details
  - Style calendar with proper spacing, colors, and meal type visual indicators
  - _Requirements: 1.1, 1.2, 1.3, 1.4_



- [ ] 6. Create meal plan modal for adding and editing meals
  - Build components/MealPlanModal.tsx for meal planning workflow
  - Implement date and meal type selection with intuitive UI controls
  - Add recipe selection interface with search and filtering capabilities
  - Include serving size adjustment and meal notes functionality


  - Add form validation and error handling for meal planning inputs
  - _Requirements: 3.1, 3.2, 3.3, 6.1, 6.3_

- [ ] 7. Enhance recipes tab with explore functionality
  - Update app/(tabs)/recipes.tsx to include recipe exploration features
  - Add search bar with debounced input for recipe filtering


  - Implement filter options (Can Make Now, Missing Few Items, All Recipes)
  - Create recipe cards that show availability status and missing ingredients
  - Add "Add to Meal Plan" quick action buttons on recipe cards
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 8. Build recipe recommendations component


  - Create components/RecipeRecommendations.tsx for smart suggestions
  - Implement algorithm to prioritize recipes based on expiring ingredients
  - Add visual indicators for ingredient availability and expiration status
  - Create recommendation cards with quick add to meal plan functionality
  - Add refresh recommendations feature and loading states
  - _Requirements: 4.1, 4.2, 4.3, 4.4_


- [ ] 9. Implement shopping list generation from meal plans
  - Add generateShoppingListFromMealPlan function to shopping list store
  - Create logic to calculate missing ingredients across multiple planned meals
  - Implement quantity aggregation for duplicate ingredients
  - Add meal plan source tracking to shopping list items
  - Create UI trigger for shopping list generation with confirmation dialog

  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ] 10. Create cooking workflow and inventory deduction
  - Build components/CookMealModal.tsx for the cooking process
  - Implement recipe display with step-by-step cooking instructions
  - Add "Cook This Meal" functionality with ingredient deduction logic
  - Create confirmation dialogs for cooking actions and inventory updates

  - Add meal completion tracking and visual feedback
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ] 11. Add basic nutrition summary functionality
  - Create components/NutritionSummary.tsx for daily and weekly nutrition overview
  - Implement basic calorie and macronutrient calculations from planned meals
  - Add daily nutrition display with progress indicators

  - Create weekly nutrition summary with balanced diet insights
  - Handle cases where nutritional data is unavailable with appropriate fallbacks
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [ ] 12. Implement meal plan management features
  - Add meal editing functionality with pre-populated form data
  - Implement meal removal with confirmation dialogs


  - Create meal rescheduling (drag and drop or modal-based)
  - Add bulk actions for managing multiple meals
  - Implement undo functionality for accidental meal deletions
  - _Requirements: 6.1, 6.2, 6.3_

- [ ] 13. Add responsive design and mobile optimization
  - Ensure calendar component works well on different screen sizes
  - Optimize touch targets for mobile interaction
  - Add swipe gestures for week navigation
  - Implement responsive layout for recipe cards and meal planning modals
  - Test and refine UI on both iOS and Android devices
  - _Requirements: 1.1, 1.2, 2.3_

- [ ] 14. Implement error handling and loading states
  - Add loading indicators for meal plan operations
  - Implement error boundaries for meal planning components
  - Add retry mechanisms for failed AsyncStorage operations
  - Create user-friendly error messages for meal planning failures
  - Add offline functionality with local data fallbacks
  - _Requirements: All requirements - error handling_

- [ ] 15. Add comprehensive testing for meal planning features
  - Write unit tests for meal planner hook and utility functions
  - Create integration tests for meal planning workflow
  - Add component tests for calendar interactions and meal modals
  - Test recipe availability calculations with various inventory scenarios
  - Verify shopping list generation accuracy with complex meal plans
  - _Requirements: All requirements - testing coverage_