import type { StyleProp, ViewStyle } from 'react-native';
import type { Cookbook, CookbookPage } from '@/types/cookbook';
import type { CookbookLeaf, CookbookSpread } from '@/utils/cookbook/reader';

export interface Cookbook3DSceneProps {
  cookbook: Cookbook | null;
  pages: CookbookPage[];
  spreads: CookbookSpread[];
  spreadIndex: number;
  isOpen: boolean;
  readingView?: 'spread' | 'page';
  readingPageId?: string;
  /** Flat leaf list for one-page navigation (all leaf types, not just recipes). */
  leaves?: CookbookLeaf[];
  /** Current position in the flat leaf list for one-page mode. */
  leafIndex?: number;
  onOpen: () => void;
  /** Close the book (swing the front cover back shut). */
  onClose?: () => void;
  /** Whether the back cover is closed (covering the last spread). */
  isBackClosed?: boolean;
  /** Close the back cover (swing it shut from the left). */
  onCloseBack?: () => void;
  /** Reopen the back cover (swing it back open). */
  onOpenBack?: () => void;
  onNext: () => void;
  onPrevious: () => void;
  /** Fired when the user taps the stage surface (wakes reader chrome). */
  onStageTap?: () => void;
  onEnterReadingView: (page?: CookbookPage) => void;
  onOpenRecipe: (page: CookbookPage) => void;
  /** Jump straight to a recipe (table of contents tap). Web animates the turn. */
  onJumpToPage?: (page: CookbookPage) => void;
  style?: StyleProp<ViewStyle>;
}
