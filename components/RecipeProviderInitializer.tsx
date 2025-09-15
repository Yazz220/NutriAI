// Recipe Provider Initializer (clean slate)
// No side effects; placeholder to keep app structure intact while
// integrations are paused/removed.

import React from 'react';

interface RecipeProviderInitializerProps {
  onInitialized?: () => void;
}

export const RecipeProviderInitializer: React.FC<RecipeProviderInitializerProps> = () => {
  return null;
};
