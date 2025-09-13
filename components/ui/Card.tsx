import React from 'react';
import { View, StyleSheet, ViewStyle, Text, StyleProp } from 'react-native';
import { Colors } from '@/constants/colors';
import { Spacing, Shadows, Radii } from '@/constants/spacing';
import { Tokens } from '@/constants/tokens';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padding?: keyof typeof Spacing;
  shadow?: 'none' | 'sm' | 'md' | 'lg';
  onPress?: () => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  padding = 'lg',
  shadow = 'none',
}) => {
  const cardStyle = [
    styles.card,
    { padding: Spacing[padding] },
    shadow !== 'none' ? Shadows[shadow] : Shadows.level0,
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

  return (
    <View style={cardStyle}>
      {/* Inner edge for subtle depth */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          borderRadius: Tokens.component.card.base.radius,
          borderWidth: 1,
          borderColor: `rgba(0,0,0,${Tokens.component.card.base.innerEdgeOpacity})`,
        }}
      />
      {normalizedChildren}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Tokens.component.card.base.bg,
    borderRadius: Tokens.component.card.base.radius, // shape.radius.card per token
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Tokens.component.card.base.borderColor, // divider
    position: 'relative',
  },
});