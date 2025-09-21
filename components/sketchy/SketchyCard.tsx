import React from 'react';
import { View, ViewProps, ViewStyle, TouchableOpacity, TouchableOpacityProps } from 'react-native';
import { SketchyView } from './SketchyView';
import { SketchyComponentTokens, SketchyTokens } from '@/constants/sketchyTheme';
import { Spacing } from '@/constants/spacing';

export interface SketchyCardProps extends ViewProps {
  elevation?: 'none' | 'low' | 'medium' | 'high';
  padding?: keyof typeof Spacing;
  interactive?: boolean;
  onPress?: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}

/**
 * Card component with irregular, hand-drawn borders and organic shadows
 */
export const SketchyCard: React.FC<SketchyCardProps> = ({
  elevation = 'low',
  padding = 'lg',
  interactive = false,
  onPress,
  children,
  disabled = false,
  style,
  ...props
}) => {
  const [isPressed, setIsPressed] = React.useState(false);

  // Get elevation-specific styling
  const getElevationConfig = () => {
    switch (elevation) {
      case 'none':
        return {
          ...SketchyComponentTokens.card.base,
          borderWidth: SketchyTokens.borderWidth.thin,
          roughness: SketchyTokens.roughness.subtle,
          shadow: undefined,
        };
      case 'medium':
        return {
          ...SketchyComponentTokens.card.elevated,
          borderWidth: SketchyTokens.borderWidth.medium,
          roughness: SketchyTokens.roughness.medium,
          shadow: SketchyTokens.shadow.sketchy.md,
        };
      case 'high':
        return {
          ...SketchyComponentTokens.card.elevated,
          borderWidth: SketchyTokens.borderWidth.thick,
          roughness: SketchyTokens.roughness.strong,
          shadow: SketchyTokens.shadow.sketchy.lg,
        };
      case 'low':
      default:
        return SketchyComponentTokens.card.base;
    }
  };

  const elevationConfig = getElevationConfig();

  // Dynamic styling based on interaction state
  const getBorderWidth = () => {
    if (interactive && isPressed) {
      return elevationConfig.borderWidth + 1;
    }
    return elevationConfig.borderWidth;
  };

  const getRoughness = () => {
    if (interactive && isPressed) {
      return Math.min(elevationConfig.roughness + 0.2, 1);
    }
    return elevationConfig.roughness;
  };

  const getBackgroundColor = () => {
    if (disabled) {
      return elevationConfig.backgroundColor + '80'; // Add transparency
    }
    return elevationConfig.backgroundColor;
  };

  const containerStyle: ViewStyle = {
    backgroundColor: getBackgroundColor(),
    padding: Spacing[padding],
    opacity: disabled ? 0.6 : 1,
    ...(elevationConfig.shadow && elevationConfig.shadow),
    ...style,
  };

  const handlePressIn = () => {
    if (interactive && !disabled) {
      setIsPressed(true);
    }
  };

  const handlePressOut = () => {
    if (interactive && !disabled) {
      setIsPressed(false);
    }
  };

  const handlePress = () => {
    if (onPress && !disabled) {
      onPress();
    }
  };

  const CardContent = (
    <SketchyView
      variant="card"
      borderColor={elevationConfig.borderColor}
      borderWidth={getBorderWidth()}
      roughness={getRoughness()}
      borderRadius={elevationConfig.borderRadius}
      style={containerStyle}
      disabled={disabled}
    >
      {children}
    </SketchyView>
  );

  // Wrap in TouchableOpacity if interactive
  if (interactive || onPress) {
    return (
      <TouchableOpacity
        {...props}
        disabled={disabled}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.95}
      >
        {CardContent}
      </TouchableOpacity>
    );
  }

  // Return as regular View if not interactive
  return (
    <View {...props}>
      {CardContent}
    </View>
  );
};