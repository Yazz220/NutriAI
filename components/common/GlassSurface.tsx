import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle, Pressable } from 'react-native';
import { BlurView } from 'expo-blur';
import { Colors } from '@/constants/colors';

export interface GlassSurfaceProps {
  style?: StyleProp<ViewStyle>;
  radius?: number;
  intensity?: number; // 0-100
  tint?: 'light' | 'dark' | 'default';
  padding?: number;
  pressable?: boolean;
  onPress?: () => void;
  children?: React.ReactNode;
}

export const GlassSurface: React.FC<GlassSurfaceProps> = ({
  style,
  radius = 16,
  intensity = 40,
  tint = 'light',
  padding = 12,
  pressable = false,
  onPress,
  children,
}) => {
  const Container = pressable ? Pressable : View;

  return (
    <View
      style={[styles.wrapper, { borderRadius: radius }, style]}
      pointerEvents={pressable ? 'auto' : 'box-none'}
    >
      <BlurView
        style={[StyleSheet.absoluteFill, { borderRadius: radius }]}
        intensity={intensity}
        tint={tint}
        pointerEvents="none"
      />
      <View
        style={[StyleSheet.absoluteFill, { borderRadius: radius, backgroundColor: 'rgba(255,255,255,0.06)' }]}
        pointerEvents="none"
      />
      <Container style={[styles.content, { padding }]} onPress={onPress}>
        {children}
      </Container>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 10,
  },
  content: {
    flexDirection: 'column',
  },
});

export default GlassSurface;
