import React from 'react';
import { View, TouchableOpacity, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/colors';

interface ProgressCardContainerProps {
  children: React.ReactNode;
  onPress?: () => void;
  padding?: number; // default aligns with ProgressPhotosCard (24)
  style?: StyleProp<ViewStyle>;
  noMargins?: boolean; // when true, removes default outer margins (useful in 2-up rows)
}

export const ProgressCardContainer: React.FC<ProgressCardContainerProps> = ({
  children,
  onPress,
  padding = 24,
  style,
  noMargins = false,
}) => {
  const content = (
    <LinearGradient
      colors={[Colors.card, Colors.background]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.gradientBackground, { padding }]}
    >
      {children}
    </LinearGradient>
  );

  if (onPress) {
    return (
      <TouchableOpacity style={[styles.card, noMargins && styles.noMargins, style]} onPress={onPress} activeOpacity={0.85}>
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={[styles.card, noMargins && styles.noMargins, style]}>{content}</View>;
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  noMargins: {
    marginHorizontal: 0,
    marginVertical: 0,
  },
  gradientBackground: {
    borderRadius: 20,
  },
});

export default ProgressCardContainer;
