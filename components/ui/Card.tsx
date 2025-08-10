import React from 'react';
import { View, StyleSheet, ViewStyle, Text } from 'react-native';
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

  // Normalize children: wrap raw string nodes in <Text> to avoid RN error
  const normalizedChildren = React.Children.map(children, (child) => {
    if (typeof child === 'string') {
      if (__DEV__) {
        // Help identify source during development
        console.warn('[Card] Received raw string child; wrapping in <Text>:', JSON.stringify(child));
      }
      return <Text>{child}</Text>;
    }
    return child as React.ReactNode;
  });

  return <View style={cardStyle}>{normalizedChildren}</View>;
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    marginBottom: Spacing.lg,
  },
});