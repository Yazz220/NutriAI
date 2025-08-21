import React from 'react';
import {
  ChefHat,
  Apple,
  Carrot,
  Fish,
  Egg,
  IceCream,
  Snowflake,
  Package,
  Utensils,
  Leaf,
  Wheat,
} from 'lucide-react-native';
import { Colors } from '@/constants/colors';

export type InventoryIconProps = {
  size?: number;
  color?: string;
  strokeWidth?: number;
};

// Normalize and match categories/keywords to icons
export const getInventoryIcon = (
  categoryRaw: string | undefined,
  props: InventoryIconProps = {}
) => {
  const { size = 18, color = Colors.text, strokeWidth = 2 } = props;
  const category = (categoryRaw || '').toLowerCase();

  // helpers
  const iconProps = { size, color, strokeWidth } as const;

  // Fruits
  if (/(fruit|fruits|apple|banana|orange|berries)/.test(category)) {
    return React.createElement(Apple, iconProps);
  }

  // Vegetables / Produce / Herbs / Leafy
  if (/(vegetable|vegetables|produce|greens|herb|herbs|leaf)/.test(category)) {
    return React.createElement(Leaf, iconProps);
  }
  if (/(carrot|root veg|root)/.test(category)) {
    return React.createElement(Carrot, iconProps);
  }

  // Dairy & Eggs
  if (/(egg|eggs)/.test(category)) {
    return React.createElement(Egg, iconProps);
  }
  if (/(dairy|cheese|yogurt|milk)/.test(category)) {
    return React.createElement(ChefHat, iconProps); // Minimal fallback
  }

  // Meats & Seafood
  if (/(seafood|fish|salmon|tuna|shrimp)/.test(category)) {
    return React.createElement(Fish, iconProps);
  }
  if (/(meat|beef|pork|lamb|poultry|chicken|turkey)/.test(category)) {
    return React.createElement(Utensils, iconProps); // Fallback minimal
  }

  // Grains / Bread / Rice / Pasta / Cereals
  if (/(grain|grains|wheat|cereal|oats)/.test(category)) {
    return React.createElement(Wheat, iconProps);
  }
  if (/(bread|bakery|buns|bagel|roll)/.test(category)) {
    return React.createElement(Wheat, iconProps);
  }
  if (/(rice|pasta|noodle|noodles|macaroni)/.test(category)) {
    return React.createElement(Utensils, iconProps);
  }

  // Snacks / Sweets / Desserts
  if (/(snack|snacks|sweet|sweets|dessert|candy|cookies|chocolate|ice cream)/.test(category)) {
    return React.createElement(IceCream, iconProps);
  }

  // Pantry / Canned / Packaged / Condiments / Oils / Sauces
  if (/(canned|can|jar|packaged|package|pantry|condiment|oil|sauce)/.test(category)) {
    return React.createElement(Package, iconProps);
  }

  // Beverages
  if (/(beverage|drink|juice|soda|water|coffee|tea)/.test(category)) {
    return React.createElement(Utensils, iconProps);
  }

  // Frozen
  if (/(frozen|freezer)/.test(category)) {
    return React.createElement(Snowflake, iconProps);
  }

  // Default fallback
  return React.createElement(ChefHat, iconProps);
};
