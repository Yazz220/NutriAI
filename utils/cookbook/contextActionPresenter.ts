import { ActionSheetIOS, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { flattenContextActions, type ContextActionGroup, type ContextActionId } from '@/utils/cookbook/contextActions';

interface PresentContextActionsOptions {
  actions: ContextActionGroup[];
  onSelect: (id: ContextActionId) => void;
  fallback?: () => void;
  title?: string;
}

export interface ContextActionSheetModel {
  cancelButtonIndex: number;
  destructiveButtonIndices: number[];
  ids: ContextActionId[];
  options: string[];
}

export function buildContextActionSheetModel(actions: ContextActionGroup[]): ContextActionSheetModel {
  const flattened = flattenContextActions(actions);
  const cancelButtonIndex = flattened.length;

  return {
    cancelButtonIndex,
    destructiveButtonIndices: flattened.flatMap((action, index) => (action.destructive ? [index] : [])),
    ids: flattened.map((action) => action.id),
    options: [...flattened.map((action) => action.title), 'Cancel'],
  };
}

export function presentContextActions({ actions, onSelect, fallback, title }: PresentContextActionsOptions) {
  const model = buildContextActionSheetModel(actions);
  if (model.ids.length === 0) return;

  void Haptics.selectionAsync();

  if (Platform.OS !== 'ios') {
    fallback?.();
    return;
  }

  ActionSheetIOS.showActionSheetWithOptions(
    {
      options: model.options,
      cancelButtonIndex: model.cancelButtonIndex,
      destructiveButtonIndex: model.destructiveButtonIndices,
      title,
    },
    (selectedIndex) => {
      const actionId = model.ids[selectedIndex];
      if (actionId) onSelect(actionId);
    },
  );
}
