import { Recipe } from '@/types';

export const mockRecipes: Recipe[] = [
  {
    id: '1',
    name: 'Classic Tomato Bruschetta',
    image: 'https://images.unsplash.com/photo-1505253716362-af78f5d115fc?q=80&w=2970&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    tags: ['Quick', 'Vegetarian', 'Appetizer'],
    prepTime: '15 mins',
    cookTime: '5 mins',
    servings: 4,
    ingredients: [
      { name: 'Tomato', quantity: 4, unit: 'large' },
      { name: 'Garlic', quantity: 2, unit: 'cloves' },
      { name: 'Basil', quantity: 0.25, unit: 'cup' },
      { name: 'Baguette', quantity: 1, unit: 'loaf' },
      { name: 'Olive Oil', quantity: 2, unit: 'tbsp' },
    ],
    instructions: [
      'Dice tomatoes and chop basil.',
      'Mince garlic.',
      'Combine tomatoes, basil, and garlic in a bowl. Drizzle with olive oil and season with salt and pepper.',
      'Slice the baguette and toast until golden brown.',
      'Top the toasted bread with the tomato mixture.',
    ],
    notes: 'For extra flavor, rub the toasted bread with a garlic clove before topping.'
  },
  {
    id: '2',
    name: 'Chicken and Broccoli Stir-fry',
    image: 'https://images.unsplash.com/photo-1605333219693-e3a3f47918c7?q=80&w=2970&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    tags: ['Healthy', 'Quick', 'Dinner'],
    prepTime: '10 mins',
    cookTime: '15 mins',
    servings: 2,
    ingredients: [
      { name: 'Chicken Breast', quantity: 1, unit: 'large' },
      { name: 'Broccoli', quantity: 1, unit: 'head' },
      { name: 'Soy Sauce', quantity: 3, unit: 'tbsp' },
      { name: 'Ginger', quantity: 1, unit: 'tbsp' },
      { name: 'Rice', quantity: 1, unit: 'cup' },
    ],
    instructions: [
      'Cook rice according to package directions.',
      'Cut chicken into bite-sized pieces.',
      'Chop broccoli into florets.',
      'In a large skillet or wok, heat oil over medium-high heat. Add chicken and cook until browned.',
      'Add broccoli and stir-fry for 3-5 minutes.',
      'Add soy sauce and grated ginger. Cook for another 2 minutes.',
      'Serve over cooked rice.',
    ],
  },
  {
    id: '3',
    name: 'Lentil Soup',
    image: 'https://images.unsplash.com/photo-1621852004184-2342de63739a?q=80&w=2970&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    tags: ['Vegan', 'Healthy', 'Soup'],
    prepTime: '15 mins',
    cookTime: '40 mins',
    servings: 6,
    ingredients: [
      { name: 'Lentils', quantity: 1, unit: 'cup' },
      { name: 'Carrot', quantity: 2, unit: 'medium' },
      { name: 'Onion', quantity: 1, unit: 'large' },
      { name: 'Celery', quantity: 2, unit: 'stalks' },
      { name: 'Vegetable Broth', quantity: 6, unit: 'cups' },
      { name: 'Cumin', quantity: 1, unit: 'tsp' },
    ],
    instructions: [
      'Rinse lentils.',
      'Chop onion, carrots, and celery.',
      'In a large pot, sauté the vegetables until softened.',
      'Add lentils, vegetable broth, and cumin.',
      'Bring to a boil, then reduce heat and simmer for 30-40 minutes, or until lentils are tender.',
      'Season with salt and pepper to taste.',
    ],
    notes: 'Serve with a dollop of yogurt or a squeeze of lemon juice.'
  },
  {
    id: '4',
    name: 'Simple Avocado Toast',
    image: 'https://images.unsplash.com/photo-1584308666744-8480404b65ae?q=80&w=3000&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    tags: ['Quick', 'Vegetarian', 'Breakfast'],
    prepTime: '5 mins',
    cookTime: '2 mins',
    servings: 1,
    ingredients: [
      { name: 'Avocado', quantity: 1, unit: 'medium' },
      { name: 'Bread', quantity: 2, unit: 'slices' },
      { name: 'Lemon', quantity: 0.5, unit: 'small' },
    ],
    instructions: [
      'Toast the bread slices to your liking.',
      'Mash the avocado in a small bowl.',
      'Squeeze lemon juice into the avocado and mix. Season with salt, pepper, and red pepper flakes if desired.',
      'Spread the avocado mixture evenly on the toast.',
    ],
    notes: 'Top with a fried egg for extra protein.'
  }
];
