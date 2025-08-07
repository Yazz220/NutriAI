import { useMemo } from 'react';
import { useInventory } from './useInventoryStore';
import { mockRecipes } from '@/data/mockData';
import { Recipe, InventoryItem, RecipeIngredient } from '@/types';

export interface RecipeStatus extends Recipe {
  missingIngredients: RecipeIngredient[];
  isReady: boolean;
  missingCount: number;
}

export function useRecipeData() {
  const { inventory } = useInventory();

  const recipesWithStatus = useMemo((): RecipeStatus[] => {
    if (!inventory) return [];

    const inventoryMap = new Map<string, InventoryItem>();
    inventory.forEach(item => inventoryMap.set(item.name.toLowerCase(), item));

    return mockRecipes.map(recipe => {
      let missingCount = 0;
      const missingIngredients: RecipeIngredient[] = [];

      recipe.ingredients.forEach(ingredient => {
        const inventoryItem = inventoryMap.get(ingredient.name.toLowerCase());
        
        if (!inventoryItem || inventoryItem.quantity < ingredient.quantity) {
          missingCount++;
          missingIngredients.push(ingredient);
        }
      });

      return {
        ...recipe,
        missingIngredients,
        isReady: missingCount === 0,
        missingCount,
      };
    });
  }, [inventory]);

  const readyToCook = useMemo(() => 
    recipesWithStatus.filter(r => r.isReady),
    [recipesWithStatus]
  );

  const almostThere = useMemo(() => 
    recipesWithStatus.filter(r => !r.isReady && r.missingCount > 0 && r.missingCount <= 3).sort((a, b) => a.missingCount - b.missingCount),
    [recipesWithStatus]
  );

  const exploreAll = useMemo(() => 
    recipesWithStatus.sort((a, b) => a.missingCount - b.missingCount),
    [recipesWithStatus]
  );

  return { readyToCook, almostThere, exploreAll, allRecipes: mockRecipes };
}
