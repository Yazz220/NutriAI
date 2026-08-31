import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';
import { Spacing, Typography } from '@/constants/spacing';
import { Fonts } from '@/utils/fonts';

interface LoadingSpinnerProps {
  size?: 'small' | 'large';
  text?: string;
  overlay?: boolean;
  color?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'large',
  text,
  overlay = false,
  color,
}) => {

  const containerStyle = [
    styles.container,
    size === 'small' && styles.smallContainer,
    overlay && styles.overlay,
  ];

  return (
    <View
      style={containerStyle}
      accessibilityRole="progressbar"
      accessibilityLabel={text ?? 'Loading'}
    >
      <ActivityIndicator size={size} color={color || Colors.primary} />
      {text && <Text style={styles.text}>{text}</Text>}
    </View>
  );

};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  smallContainer: {
    padding: 0,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.alpha.white[50],
    zIndex: 1000,
  },
  text: {
    marginTop: Spacing.md,
    fontSize: Typography.sizes.md,
    color: Colors.textMuted,
    textAlign: 'center',
    fontFamily: Fonts.ui.regular,
  },
});
