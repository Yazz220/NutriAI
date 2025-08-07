import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '@/constants/colors';
import { Spacing, Shadows } from '@/constants/spacing';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: keyof typeof Spacing;
  shadow?: 'sm' | 'md' | 'lg';
  onPress?: () => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  padding = 'lg',
  shadow = 'md',
}) => {
  const cardStyle = [
    styles.card,
    { padding: Spacing[padding] },
    Shadows[shadow],
    style,
  ];

  return <View style={cardStyle}>{children}</View>;
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    marginBottom: Spacing.lg,
  },
});