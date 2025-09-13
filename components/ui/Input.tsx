import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
  TouchableOpacity,
} from 'react-native';
import { Eye, EyeOff, AlertCircle } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { Spacing, Typography as LegacyType, Shadows } from '@/constants/spacing';
import { Typography as Type } from '@/constants/typography';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  secureTextEntry?: boolean;
  required?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  secureTextEntry,
  required,
  style,
  ...props
}) => {
  const [isSecure, setIsSecure] = useState(secureTextEntry);
  const [isFocused, setIsFocused] = useState(false);

  const inputContainerStyle = [
    styles.inputContainer,
    ...(isFocused ? [styles.inputContainerFocused] : []),
    ...(error ? [styles.inputContainerError] : []),
  ];

  const inputStyle = [
    styles.input,
    ...(leftIcon ? [styles.inputWithLeftIcon] : []),
    ...((rightIcon || secureTextEntry) ? [styles.inputWithRightIcon] : []),
    style,
  ];

  return (
    <View style={styles.container}>
      {label && (
        <Text style={styles.label}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      )}
      
      <View style={inputContainerStyle}>
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
        
        <TextInput
          style={inputStyle}
          secureTextEntry={isSecure}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholderTextColor={Colors.lightText}
          {...props}
        />
        
        {secureTextEntry && (
          <TouchableOpacity
            style={styles.rightIcon}
            onPress={() => setIsSecure(!isSecure)}
            accessibilityLabel={isSecure ? 'Show password' : 'Hide password'}
          >
            {isSecure ? (
              <Eye size={20} color={Colors.lightText} />
            ) : (
              <EyeOff size={20} color={Colors.lightText} />
            )}
          </TouchableOpacity>
        )}
        
        {rightIcon && !secureTextEntry && (
          <View style={styles.rightIcon}>{rightIcon}</View>
        )}
      </View>
      
      {error && (
        <View style={styles.errorContainer}>
          <AlertCircle size={16} color={Colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
      
      {hint && !error && (
        <Text style={styles.hintText}>{hint}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
  },
  label: {
    ...Type.caption,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  required: {
    color: Colors.error,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border, // divider
    borderRadius: 8, // shape.radius.sm from JSON (8)
    backgroundColor: Colors.background, // field default bg = surface
  },
  inputContainerFocused: {
    borderColor: Colors.primary,
  },
  inputContainerError: {
    borderColor: Colors.error,
  },
  input: {
    flex: 1,
    ...Type.body,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    color: Colors.text,
  },
  inputWithLeftIcon: {
    paddingLeft: Spacing.sm,
  },
  inputWithRightIcon: {
    paddingRight: Spacing.sm,
  },
  leftIcon: {
    paddingLeft: Spacing.lg,
  },
  rightIcon: {
    paddingRight: Spacing.lg,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  errorText: {
    ...Type.caption,
    color: Colors.error,
    marginLeft: Spacing.xs,
    flex: 1,
  },
  hintText: {
    ...Type.caption,
    color: Colors.lightText,
    marginTop: Spacing.sm,
  },
});