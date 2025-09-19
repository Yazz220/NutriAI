import React, { useRef, useEffect } from 'react';
import { View, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { Brain, ChatCircle } from 'phosphor-react-native';
import { Colors } from '@/constants/colors';
import { LinearGradient } from 'expo-linear-gradient';

interface EnhancedFloatingChatButtonProps {
  onPress: () => void;
  bottom: number;
  hasUnreadMessages?: boolean;
  isTyping?: boolean;
}

export const EnhancedFloatingChatButton: React.FC<EnhancedFloatingChatButtonProps> = ({
  onPress,
  bottom,
  hasUnreadMessages = false,
  isTyping = false
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  // Breathing animation for the button
  useEffect(() => {
    const breathingAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.05,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );
    breathingAnimation.start();

    return () => breathingAnimation.stop();
  }, [scaleAnim]);

  // Pulse animation for unread messages
  useEffect(() => {
    if (hasUnreadMessages) {
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulseAnimation.start();
      return () => pulseAnimation.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [hasUnreadMessages, pulseAnim]);

  // Rotation animation for typing indicator
  useEffect(() => {
    if (isTyping) {
      const rotationAnimation = Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        })
      );
      rotationAnimation.start();
      return () => rotationAnimation.stop();
    } else {
      rotateAnim.setValue(0);
    }
  }, [isTyping, rotateAnim]);

  // Glow animation for active states
  useEffect(() => {
    if (hasUnreadMessages || isTyping) {
      const glowAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: false,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: false,
          }),
        ])
      );
      glowAnimation.start();
      return () => glowAnimation.stop();
    } else {
      glowAnim.setValue(0);
    }
  }, [hasUnreadMessages, isTyping, glowAnim]);

  const handlePress = () => {
    // Press animation
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    onPress();
  };

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.3],
  });

  return (
    <View style={[styles.container, { bottom }]}>
      {/* Glow effect */}
      <Animated.View
        style={[
          styles.glowContainer,
          {
            opacity: glowOpacity,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <LinearGradient
          colors={[Colors.primary + '40', Colors.secondary + '40', Colors.primary + '40']}
          style={styles.glow}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      </Animated.View>

      {/* Main button */}
      <Animated.View
        style={[
          styles.buttonContainer,
          {
            transform: [
              { scale: Animated.multiply(scaleAnim, pulseAnim) },
              { rotate: rotateInterpolate },
            ],
          },
        ]}
      >
        <TouchableOpacity
          style={styles.button}
          onPress={handlePress}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Open NutriAI Chat Assistant"
          accessibilityHint="Tap to chat with your nutrition coach"
        >
          <LinearGradient
            colors={[Colors.primary, Colors.primaryLight]}
            style={styles.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {isTyping ? (
              <Brain size={28} color={Colors.white} weight="fill" />
            ) : (
              <ChatCircle size={28} color={Colors.white} weight="fill" />
            )}
          </LinearGradient>

          {/* Unread indicator */}
          {hasUnreadMessages && !isTyping && (
            <View style={styles.unreadIndicator}>
              <View style={styles.unreadDot} />
            </View>
          )}

          {/* Typing indicator dots */}
          {isTyping && (
            <View style={styles.typingIndicator}>
              <View style={styles.typingDots}>
                <Animated.View style={[styles.typingDot, { opacity: pulseAnim }]} />
                <Animated.View style={[styles.typingDot, { opacity: pulseAnim }]} />
                <Animated.View style={[styles.typingDot, { opacity: pulseAnim }]} />
              </View>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>

      {/* Shadow */}
      <View style={styles.shadow} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 20,
    zIndex: 1000,
    elevation: 20,
  },
  glowContainer: {
    position: 'absolute',
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    zIndex: -1,
  },
  glow: {
    flex: 1,
    borderRadius: 40,
  },
  buttonContainer: {
    width: 64,
    height: 64,
  },
  button: {
    width: '100%',
    height: '100%',
    borderRadius: 32,
    overflow: 'hidden',
    position: 'relative',
  },
  gradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 32,
  },
  shadow: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: 4,
    bottom: 4,
    borderRadius: 32,
    backgroundColor: Colors.shadow,
    zIndex: -2,
  },
  unreadIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.error,
  },
  typingIndicator: {
    position: 'absolute',
    bottom: 6,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  typingDots: {
    flexDirection: 'row',
    gap: 2,
  },
  typingDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: Colors.white,
  },
});
