import { Pressable } from 'react-native';
import type { ContextActionMenuProps } from '@/components/ui/ContextActionMenu.types';
import { presentContextActions } from '@/utils/cookbook/contextActionPresenter';

export function ContextActionMenu({
  actions,
  children,
  fallbackOnPress,
  onSelect,
  shouldOpenOnLongPress = false,
  accessibilityLabel,
  style,
  title,
  testID,
}: ContextActionMenuProps) {
  if (actions.length === 0) return children;

  function openMenu() {
    presentContextActions({ actions, onSelect, fallback: fallbackOnPress, title });
  }

  return (
    <Pressable
      onLongPress={shouldOpenOnLongPress ? openMenu : undefined}
      onPress={shouldOpenOnLongPress ? undefined : openMenu}
      style={style}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      {children}
    </Pressable>
  );
}
