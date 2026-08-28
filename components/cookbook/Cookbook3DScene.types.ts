import type { StyleProp, ViewStyle } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import type { Cookbook, CookbookPage } from '@/types/cookbook';
import type { CookbookLeaf, CookbookSpread } from '@/utils/cookbook/reader';

export interface CookbookTurnRequest {
  id: number;
  direction: -1 | 1;
}

export interface Cookbook3DSceneProps {
  cookbook: Cookbook | null;
  pages: CookbookPage[];
  spreads: CookbookSpread[];
  spreadIndex: number;
  isOpen: boolean;
  /** Honor the system Reduce Motion preference for non-interactive transitions. */
  reduceMotion?: boolean;
  /**
   * Shared open/close progress (0 = closed, 1 = open). When provided, the
   * parent owns the animation and the scene reads this value directly instead
   * of running its own open/close effect — keeping the cover swing and reader
   * chrome on the same clock. When omitted, the scene animates its own value
   * from isOpen (backward-compatible fallback).
   */
  opening?: SharedValue<number>;
  readingView?: 'spread' | 'page';
  readingPageId?: string;
  /** Flat leaf list for one-page navigation (all leaf types, not just recipes). */
  leaves?: CookbookLeaf[];
  /** Current position in the flat leaf list for one-page mode. */
  leafIndex?: number;
  /** Native controls request a physical turn; the scene commits navigation after the curl lands. */
  turnRequest?: CookbookTurnRequest;
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
  style?: StyleProp<ViewStyle>;
}
