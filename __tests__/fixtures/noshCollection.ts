import type { Cookbook, CookbookPage } from '@/types/cookbook';
import type { RecipeGraph } from '@/types/recipeGraph';

const createdAt = '2026-08-21T00:00:00.000Z';

const bakedCheesecakeGraph: RecipeGraph = {
  id: 'graph-baked-cheesecake',
  title: 'Baked Cheesecake',
  description: 'A dense vanilla cheesecake baked in a water bath.',
  servings: 8,
  prepTimeMinutes: 25,
  cookTimeMinutes: 60,
  cuisine: 'American',
  category: 'desserts',
  ingredientGroups: [{
    id: 'filling',
    label: 'Filling',
    ingredients: [
      { name: 'cream cheese', quantity: '680', unit: 'g' },
      { name: 'sugar', quantity: '150', unit: 'g' },
      { name: 'eggs', quantity: '3' },
    ],
  }],
  stepGroups: [{
    id: 'bake',
    label: 'Bake',
    steps: [
      { id: 'baked-step-1', text: 'Beat the filling until smooth.' },
      { id: 'baked-step-2', text: 'Bake in a water bath until the center is just set.' },
    ],
  }],
  tags: ['cheesecake', 'baked'],
  dietaryTags: ['vegetarian'],
  provenance: { sourceType: 'url', sourceUrl: 'https://example.com/baked-cheesecake', confidence: 1 },
  createdAt,
  updatedAt: createdAt,
};

const noBakeCheesecakeGraph: RecipeGraph = {
  id: 'graph-no-bake-cheesecake',
  title: 'No-Bake Cheesecake',
  description: 'A chilled lemon cheesecake with a biscuit crust.',
  servings: 10,
  prepTimeMinutes: 30,
  cuisine: 'British',
  category: 'desserts',
  ingredientGroups: [{
    id: 'filling',
    label: 'Filling',
    ingredients: [
      { name: 'cream cheese', quantity: '500', unit: 'g' },
      { name: 'double cream', quantity: '250', unit: 'ml' },
      { name: 'lemon', quantity: '1' },
    ],
  }],
  stepGroups: [{
    id: 'chill',
    label: 'Chill',
    steps: [
      { id: 'no-bake-step-1', text: 'Whip the filling until thick.' },
      { id: 'no-bake-step-2', text: 'Chill until firm.' },
    ],
  }],
  tags: ['cheesecake', 'no-bake', 'lemon'],
  dietaryTags: ['vegetarian'],
  provenance: { sourceType: 'text', confidence: 1 },
  createdAt,
  updatedAt: createdAt,
};

export const collectionCookbooks: Cookbook[] = [
  {
    id: 'cookbook-family',
    userId: 'user-fixture',
    title: 'Family Recipes',
    theme: { name: 'Classic Kitchen', prompt: 'Classic family cookbook' },
    sectionOrder: ['desserts'],
    coverStyle: 'vintage-garden',
    coverFinishId: 'fine-cloth',
    coverColorId: 'sage',
    pageTemplateId: 'clean-cream',
    sections: [{ id: 'desserts', label: 'Desserts', order: 0 }],
    pageCount: 1,
    createdAt,
    updatedAt: createdAt,
  },
  {
    id: 'cookbook-weekend',
    userId: 'user-fixture',
    title: 'Weekend Baking',
    theme: { name: 'Sunday Suppers', prompt: 'Weekend baking cookbook' },
    sectionOrder: ['desserts'],
    coverStyle: 'editorial',
    coverFinishId: 'fine-cloth',
    coverColorId: 'sage',
    pageTemplateId: 'clean-cream',
    sections: [{ id: 'desserts', label: 'Desserts', order: 0 }],
    pageCount: 1,
    createdAt,
    updatedAt: createdAt,
  },
];

export const collectionPages: CookbookPage[] = [
  {
    id: 'page-baked-cheesecake',
    cookbookId: 'cookbook-family',
    recipeId: 'recipe-baked-cheesecake',
    title: bakedCheesecakeGraph.title,
    section: 'desserts',
    pageNumber: 1,
    sortOrder: 1,
    recipeGraph: bakedCheesecakeGraph,
    styleId: 'vintage-garden',
    templateId: 'clean-cream',
  },
  {
    id: 'page-no-bake-cheesecake',
    cookbookId: 'cookbook-weekend',
    recipeId: 'recipe-no-bake-cheesecake',
    title: noBakeCheesecakeGraph.title,
    section: 'desserts',
    pageNumber: 1,
    sortOrder: 1,
    recipeGraph: noBakeCheesecakeGraph,
    styleId: 'editorial',
    templateId: 'clean-cream',
  },
];

export const voiceTranscriptionQueries = {
  intended: 'cheesecake',
  spaced: 'cheese cake',
  ambiguous: 'my cheesecake recipe',
} as const;
