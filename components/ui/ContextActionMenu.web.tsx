import { Pressable } from 'react-native';
import type { ContextActionMenuProps } from '@/components/ui/ContextActionMenu.types';

export function ContextActionMenu({ actions, children, fallbackOnPress, accessibilityLabel, style, testID }: ContextActionMenuProps) {
  if (actions.length === 0 || !fallbackOnPress) return children;

  return (
    <Pressable
      style={style}
      onPress={fallbackOnPress}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      {children}
    </Pressable>
  );
}
