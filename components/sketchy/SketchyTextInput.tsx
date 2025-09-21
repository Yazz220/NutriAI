import React from 'react';
import { 
  TextInput, 
  TextInputProps, 
  View, 
  Text, 
  ViewStyle, 
  TextStyle 
} from 'react-native';
import { SketchyView } from './SketchyView';
import { SketchyComponentTokens, SketchyColors } from '@/constants/sketchyTheme';
import { Typography, Spacing } from '@/constants/spacing';

export interface SketchyTextInputProps extends TextInputProps {
  label?: string;
  error?: string;
  helper?: string;
  variant?: 'outlined' | 'filled';
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Text input with sketchy borders and focus states
 */
export const SketchyTextInput: React.FC<SketchyTextInputProps> = ({
  label,
  error,
  helper,
  variant = 'outlined',
  size = 'md',
  style,
  ...props
}) => {
  const [isFocused, setIsFocused] = React.useState(false);

  // Size-specific dimensions
  const sizeConfig = {
    sm: { height: 36, fontSize: 14, paddingHorizontal: 12 },
    md: { height: 44, fontSize: 16, paddingHorizontal: 16 },
    lg: { height: 52, fontSize: 18, paddingHorizontal: 20 },
  };

  const currentSize = sizeConfig[size];

  // Get input state styling
  const getInputConfig = () => {
    if (error) {
      return SketchyComponentTokens.input.error;
    }
    if (isFocused) {
      return SketchyComponentTokens.input.focused;
    }
    return SketchyComponentTokens.input.base;
  };

  const inputConfig = getInputConfig();

  const handleFocus = (e: any) => {
    setIsFocused(true);
    if (props.onFocus) {
      props.onFocus(e);
    }
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    if (props.onBlur) {
      props.onBlur(e);
    }
  };

  const containerStyle: ViewStyle = {
    marginBottom: Spacing.sm,
  };

  const inputContainerStyle: ViewStyle = {
    height: currentSize.height,
    paddingHorizontal: currentSize.paddingHorizontal,
    backgroundColor: inputConfig.backgroundColor,
    justifyContent: 'center',
  };

  const inputStyle: TextStyle = {
    fontSize: currentSize.fontSize,
    color: SketchyColors.text,
    fontWeight: '400',
    flex: 1,
    // Remove default TextInput styling
    borderWidth: 0,
    padding: 0,
    margin: 0,
    ...(Array.isArray(style) ? Object.assign({}, ...style) : style),
  };

  const labelStyle: TextStyle = {
    fontSize: 14,
    fontWeight: '500',
    color: error ? SketchyColors.error : SketchyColors.textSecondary,
    marginBottom: Spacing.xs,
  };

  const helperStyle: TextStyle = {
    fontSize: 12,
    color: error ? SketchyColors.error : SketchyColors.textMuted,
    marginTop: Spacing.xs,
    lineHeight: 16,
  };

  return (
    <View style={containerStyle}>
      {/* Label */}
      {label && (
        <Text style={labelStyle}>
          {label}
        </Text>
      )}

      {/* Input Container */}
      <SketchyView
        variant="input"
        borderColor={inputConfig.borderColor}
        borderWidth={inputConfig.borderWidth}
        roughness={inputConfig.roughness}
        borderRadius={inputConfig.borderRadius}
        style={inputContainerStyle}
        disabled={props.editable === false}
      >
        <TextInput
          {...props}
          style={inputStyle}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholderTextColor={SketchyColors.textMuted}
        />
      </SketchyView>

      {/* Helper/Error Text */}
      {(helper || error) && (
        <Text style={helperStyle}>
          {error || helper}
        </Text>
      )}
    </View>
  );
};