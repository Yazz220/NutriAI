import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import type { ContextActionGroup, ContextActionId } from '@/utils/cookbook/contextActions';

export interface ContextActionMenuProps {
  actions: ContextActionGroup[];
  children: ReactNode;
  onSelect: (id: ContextActionId) => void;
  shouldOpenOnLongPress?: boolean;
  fallbackOnPress?: () => void;
  style?: StyleProp<ViewStyle>;
  title?: string;
  testID?: string;
}
