import { Pressable } from 'react-native';
import type { ContextActionMenuProps } from '@/components/ui/ContextActionMenu.types';

export function ContextActionMenu({ actions, children, fallbackOnPress, style, testID }: ContextActionMenuProps) {
  if (actions.length === 0 || !fallbackOnPress) return children;

  return (
    <Pressable style={style} onPress={fallbackOnPress} testID={testID}>
      {children}
    </Pressable>
  );
}
