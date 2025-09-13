import { ChipOption, StarterItem, ItemCategory } from '@/types';

// Onboarding version for tracking changes
export const ONBOARDING_VERSION = '1.0.0';

// Step configuration
export const ONBOARDING_STEPS = {
  WELCOME: {
    title: 'Welcome to NutriAI',
    subtitle: 'Your AI-powered kitchen companion',
    canSkip: true,
  },
  AUTH: {
    title: 'Create Your Account',
    subtitle: 'Save your preferences and sync across devices',
    canSkip: false, // Auth is required for full functionality
  },
  DIETARY_PREFERENCES: {
    title: 'Dietary Preferences',
    subtitle: 'Help us personalize your recipe recommendations',
    canSkip: true,
  },
  COOKING_HABITS: {
    title: 'Cooking Habits',
    subtitle: 'Tell us about your cooking style and preferences',
    canSkip: true,
  },
  INVENTORY_KICKSTART: {
    title: 'Quick Inventory Setup',
    subtitle: 'Add some items to get personalized recipe suggestions',
    canSkip: true,
  },
  AI_COACH_INTRO: {
    title: 'Meet Your AI Coach',
    subtitle: 'Learn how to get the most out of your AI assistant',
    canSkip: true,
  },
  COMPLETION: {
    title: "You're All Set!",
    subtitle: 'Ready to start your nutrition journey',
    canSkip: false,
  },
} as const;

// Dietary preferences options
export const DIETARY_TYPES: ChipOption[] = [
  {
    id: 'omnivore',
    label: 'Omnivore',
    value: 'omnivore',
    icon: '🍽️',
    description: 'Eats all types of food',
  },
  {
    id: 'vegetarian',
    label: 'Vegetarian',
    value: 'vegetarian',
    icon: '🥬',
    description: 'No meat, but includes dairy and eggs',
  },
  {
    id: 'vegan',
    label: 'Vegan',
    value: 'vegan',
    icon: '🌱',
    description: 'Plant-based only',
  },
  {
    id: 'pescatarian',
    label: 'Pescatarian',
    value: 'pescatarian',
    icon: '🐟',
    description: 'Vegetarian plus fish and seafood',
  },
];

export const ALLERGY_OPTIONS: ChipOption[] = [
  {
    id: 'nuts',
    label: 'Nuts',
    value: 'nuts',
    icon: '🥜',
  },
  {
    id: 'dairy',
    label: 'Dairy',
    value: 'dairy',
    icon: '🥛',
  },
  {
    id: 'gluten',
    label: 'Gluten',
    value: 'gluten',
    icon: '🌾',
  },
  {
    id: 'shellfish',
    label: 'Shellfish',
    value: 'shellfish',
    icon: '🦐',
  },
  {
    id: 'eggs',
    label: 'Eggs',
    value: 'eggs',
    icon: '🥚',
  },
  {
    id: 'soy',
    label: 'Soy',
    value: 'soy',
    icon: '🫘',
  },
  {
    id: 'fish',
    label: 'Fish',
    value: 'fish',
    icon: '🐟',
  },
  {
    id: 'sesame',
    label: 'Sesame',
    value: 'sesame',
    icon: '🌰',
  },
];

export const GOAL_OPTIONS: ChipOption[] = [
  {
    id: 'weight_loss',
    label: 'Weight Loss',
    value: 'weight_loss',
    icon: '📉',
    description: 'Reduce calorie intake and lose weight',
  },
  {
    id: 'maintenance',
    label: 'Maintenance',
    value: 'maintenance',
    icon: '⚖️',
    description: 'Maintain current weight and health',
  },
  {
    id: 'muscle_gain',
    label: 'Muscle Gain',
    value: 'muscle_gain',
    icon: '💪',
    description: 'Build muscle and increase protein intake',
  },
  {
    id: 'general_health',
    label: 'General Health',
    value: 'general_health',
    icon: '❤️',
    description: 'Focus on overall wellness and nutrition',
  },
];

// Cooking habits options
export const COOKING_SKILL_OPTIONS: ChipOption[] = [
  {
    id: 'beginner',
    label: 'Beginner',
    value: 'beginner',
    icon: '👶',
    description: 'Just starting out, prefer simple recipes',
  },
  {
    id: 'intermediate',
    label: 'Intermediate',
    value: 'intermediate',
    icon: '👨‍🍳',
    description: 'Comfortable with basic techniques',
  },
  {
    id: 'advanced',
    label: 'Advanced',
    value: 'advanced',
    icon: '🔥',
    description: 'Experienced with complex recipes',
  },
  {
    id: 'expert',
    label: 'Expert',
    value: 'expert',
    icon: '⭐',
    description: 'Professional level skills',
  },
];

export const COOKING_TIME_OPTIONS: ChipOption[] = [
  {
    id: '15min',
    label: '15 minutes or less',
    value: '15min',
    icon: '⚡',
    description: 'Quick and easy meals',
  },
  {
    id: '30min',
    label: '15-30 minutes',
    value: '30min',
    icon: '⏰',
    description: 'Moderate cooking time',
  },
  {
    id: '45min+',
    label: '30+ minutes',
    value: '45min+',
    icon: '🕐',
    description: 'Enjoy longer cooking sessions',
  },
];

export const SHOPPING_FREQUENCY_OPTIONS: ChipOption[] = [
  {
    id: 'daily',
    label: 'Daily',
    value: 'daily',
    icon: '📅',
    description: 'Shop for fresh ingredients daily',
  },
  {
    id: 'weekly',
    label: 'Weekly',
    value: 'weekly',
    icon: '📆',
    description: 'Weekly grocery shopping trips',
  },
  {
    id: 'biweekly',
    label: 'Bi-weekly',
    value: 'biweekly',
    icon: '🗓️',
    description: 'Shop every two weeks',
  },
];

// Starter inventory items
export const STARTER_ITEMS: StarterItem[] = [
  // Pantry staples
  {
    id: 'rice',
    name: 'Rice',
    category: 'Pantry' as ItemCategory,
    icon: '🍚',
    commonUnit: 'cups',
    defaultQuantity: 2,
    popularity: 95,
  },
  {
    id: 'pasta',
    name: 'Pasta',
    category: 'Pantry' as ItemCategory,
    icon: '🍝',
    commonUnit: 'boxes',
    defaultQuantity: 1,
    popularity: 90,
  },
  {
    id: 'olive_oil',
    name: 'Olive Oil',
    category: 'Pantry' as ItemCategory,
    icon: '🫒',
    commonUnit: 'bottle',
    defaultQuantity: 1,
    popularity: 88,
  },
  {
    id: 'salt',
    name: 'Salt',
    category: 'Pantry' as ItemCategory,
    icon: '🧂',
    commonUnit: 'container',
    defaultQuantity: 1,
    popularity: 98,
  },
  {
    id: 'black_pepper',
    name: 'Black Pepper',
    category: 'Pantry' as ItemCategory,
    icon: '🌶️',
    commonUnit: 'container',
    defaultQuantity: 1,
    popularity: 85,
  },
  {
    id: 'garlic',
    name: 'Garlic',
    category: 'Produce' as ItemCategory,
    icon: '🧄',
    commonUnit: 'bulbs',
    defaultQuantity: 2,
    popularity: 92,
  },
  {
    id: 'onions',
    name: 'Onions',
    category: 'Produce' as ItemCategory,
    icon: '🧅',
    commonUnit: 'pieces',
    defaultQuantity: 3,
    popularity: 89,
  },
  
  // Dairy
  {
    id: 'milk',
    name: 'Milk',
    category: 'Dairy' as ItemCategory,
    icon: '🥛',
    commonUnit: 'carton',
    defaultQuantity: 1,
    popularity: 80,
  },
  {
    id: 'eggs',
    name: 'Eggs',
    category: 'Dairy' as ItemCategory,
    icon: '🥚',
    commonUnit: 'dozen',
    defaultQuantity: 1,
    popularity: 85,
  },
  {
    id: 'butter',
    name: 'Butter',
    category: 'Dairy' as ItemCategory,
    icon: '🧈',
    commonUnit: 'stick',
    defaultQuantity: 1,
    popularity: 75,
  },
  
  // Produce
  {
    id: 'tomatoes',
    name: 'Tomatoes',
    category: 'Produce' as ItemCategory,
    icon: '🍅',
    commonUnit: 'pieces',
    defaultQuantity: 4,
    popularity: 82,
  },
  {
    id: 'carrots',
    name: 'Carrots',
    category: 'Produce' as ItemCategory,
    icon: '🥕',
    commonUnit: 'pieces',
    defaultQuantity: 5,
    popularity: 70,
  },
  {
    id: 'potatoes',
    name: 'Potatoes',
    category: 'Produce' as ItemCategory,
    icon: '🥔',
    commonUnit: 'pieces',
    defaultQuantity: 4,
    popularity: 78,
  },
  
  // Meat
  {
    id: 'chicken_breast',
    name: 'Chicken Breast',
    category: 'Meat' as ItemCategory,
    icon: '🐔',
    commonUnit: 'lbs',
    defaultQuantity: 1,
    popularity: 75,
  },
  {
    id: 'ground_beef',
    name: 'Ground Beef',
    category: 'Meat' as ItemCategory,
    icon: '🥩',
    commonUnit: 'lbs',
    defaultQuantity: 1,
    popularity: 70,
  },
];

// AI Coach demo prompts
export const AI_DEMO_PROMPTS: ChipOption[] = [
  {
    id: 'low_carb_dinner',
    label: 'Plan me a low-carb dinner',
    value: 'Plan me a low-carb dinner',
    icon: '🥗',
  },
  {
    id: 'quick_breakfast',
    label: 'Quick breakfast ideas',
    value: 'What can I make for a quick breakfast?',
    icon: '🍳',
  },
  {
    id: 'use_leftovers',
    label: 'Use my leftovers',
    value: 'What can I make with leftover chicken?',
    icon: '♻️',
  },
  {
    id: 'meal_prep',
    label: 'Meal prep suggestions',
    value: 'Help me plan meals for the week',
    icon: '📦',
  },
];

// Completion screen suggested actions
export const COMPLETION_ACTIONS = [
  {
    id: 'add_recipe',
    title: 'Add Your First Recipe',
    description: 'Import or create a recipe you love',
    icon: '📝',
    route: '/(tabs)/recipes',
  },
  {
    id: 'scan_pantry',
    title: 'Scan Your Pantry',
    description: 'Add items to get personalized suggestions',
    icon: '📱',
    route: '/(tabs)/inventory',
  },
  {
    id: 'ask_ai',
    title: 'Ask the AI Coach',
    description: 'Get instant cooking and nutrition advice',
    icon: '🤖',
    route: '/(tabs)/recipes',
  },
] as const;

// Analytics event names
export const ANALYTICS_EVENTS = {
  ONBOARDING_WELCOME_SHOWN: 'onboarding_welcome_shown',
  ONBOARDING_DIETARY_SET: 'onboarding_dietary_set',
  ONBOARDING_HABITS_SET: 'onboarding_habits_set',
  ONBOARDING_COACH_DEMO_VIEWED: 'onboarding_coach_demo_viewed',
  ONBOARDING_COMPLETED: 'onboarding_completed',
} as const;