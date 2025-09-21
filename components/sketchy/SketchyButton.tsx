import React from 'react';
import { 
  TouchableOpacity, 
  TouchableOpacityProps, 
  Text, 
  TextStyle, 
  ViewStyle,
  ActivityIndicator,
  View
} from 'react-native';
import { SketchyView } from './SketchyView';
import { SketchyComponentTokens, SketchyColors, SketchyTokens } from '@/constants/sketchyTheme';
import { Typography } from '@/constants/spacing';

export interface SketchyButtonProps extends Omit<TouchableOpacityProps, 'style'> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  title: string;
  icon?: React.ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
}

/**
 * Button component with hand-drawn borders and organic shapes
 */
export const SketchyButton: React.FC<SketchyButtonProps> = ({
  variant = 'primary',
  size = 'md',
  title,
  icon,
  loading = false,
  fullWidth = false,
  disabled = false,
  style,
  ...props
}) => {
  const [isPressed, setIsPressed] = React.useState(false);

  // Get variant-specific styling
  const variantTokens = SketchyComponentTokens.button[variant];
  
  // Size-specific dimensions
  const sizeConfig = {
    sm: { height: 36, paddingHorizontal: 12, fontSize: 14 },
    md: { height: 44, paddingHorizontal: 16, fontSize: 16 },
    lg: { height: 52, paddingHorizontal: 20, fontSize: 18 },
  };

  const currentSize = sizeConfig[size];

  // Dynamic styling based on state
  const getBorderColor = () => {
    if (disabled) return SketchyColors.sketchy.borderDisabled;
    if (isPressed) return variantTokens.borderColor;
    return variantTokens.borderColor;
  };

  const getBackgroundColor = () => {
    if (disabled) {
      return variant === 'primary' ? SketchyColors.surfaceMuted : 'transparent';
    }
    if (isPressed) {
      return variant === 'primary' 
        ? SketchyColors.primaryDark 
        : SketchyColors.alpha.primary[10];
    }
    return variantTokens.backgroundColor;
  };

  const getTextColor = () => {
    if (disabled) return SketchyColors.textMuted;
    return variantTokens.textColor;
  };

  const getRoughness = () => {
    if (isPressed) return SketchyTokens.roughness.strong;
    return variantTokens.roughness;
  };

  const getBorderWidth = () => {
    if (isPressed) return variantTokens.borderWidth + 1;
    return variantTokens.borderWidth;
  };

  const containerStyle: ViewStyle = {
    height: currentSize.height,
    paddingHorizontal: currentSize.paddingHorizontal,
    backgroundColor: getBackgroundColor(),
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    opacity: disabled ? 0.6 : 1,
    ...(fullWidth && { width: '100%' }),
    ...style,
  };

  const textStyle: TextStyle = {
    fontSize: currentSize.fontSize,
    fontWeight: '600',
    color: getTextColor(),
    textAlign: 'center',
  };

  const handlePressIn = () => {
    setIsPressed(true);
  };

  const handlePressOut = () => {
    setIsPressed(false);
  };

  return (
    <TouchableOpacity
      {...props}
      disabled={disabled || loading}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={0.8}
    >
      <SketchyView
        variant="button"
        borderColor={getBorderColor()}
        borderWidth={getBorderWidth()}
        roughness={getRoughness()}
        borderRadius={variantTokens.borderRadius}
        style={containerStyle}
        disabled={disabled}
      >
        {loading ? (
          <ActivityIndicator 
            size="small" 
            color={getTextColor()} 
          />
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {icon && (
              <View style={{ marginRight: icon && title ? 4 : 0 }}>
                {icon}
              </View>
            )}
            {title && (
              <Text style={textStyle}>
                {title}
              </Text>
            )}
          </View>
        )}
      </SketchyView>
    </TouchableOpacity>
  );
};