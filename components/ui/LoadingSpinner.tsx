import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';
import { Spacing, Typography } from '@/constants/spacing';

interface LoadingSpinnerProps {
  size?: 'small' | 'large';
  text?: string;
  overlay?: boolean;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'large',
  text,
  overlay = false,
}) => {
  const containerStyle = [
    styles.container,
    overlay && styles.overlay,
  ];

  return (
    <View style={containerStyle}>
      <ActivityIndicator size={size} color={Colors.primary} />
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
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    zIndex: 1000,
  },
  text: {
    marginTop: Spacing.md,
    fontSize: Typography.sizes.md,
    color: Colors.lightText,
    textAlign: 'center',
  },
});