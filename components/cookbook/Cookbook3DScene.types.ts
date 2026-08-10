import type { StyleProp, ViewStyle } from 'react-native';
import type { Cookbook, CookbookPage } from '@/types/cookbook';
import type { CookbookSpread } from '@/utils/cookbook/reader';

export interface Cookbook3DSceneProps {
  cookbook: Cookbook | null;
  pages: CookbookPage[];
  spreads: CookbookSpread[];
  spreadIndex: number;
  isOpen: boolean;
  readingView?: 'tilted' | 'topdown';
  readingPageId?: string;
  onOpen: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onEnterReadingView: (page?: CookbookPage) => void;
  onOpenRecipe: (page: CookbookPage) => void;
  style?: StyleProp<ViewStyle>;
}
