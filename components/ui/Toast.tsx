import React, { useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
} from 'react-native';
import { AlertCircle, Check, Info, X } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { Fonts } from '@/utils/fonts';
import { Radii, Spacing, Typography, Shadows } from '@/constants/spacing';

interface ToastProps {
  visible: boolean;
  message: string;
  type?: 'success' | 'error' | 'info';
  duration?: number;
  onHide: () => void;
  action?: {
    label: string;
    onPress: () => void;
  };
}

export const Toast: React.FC<ToastProps> = ({
  visible,
  message,
  type = 'info',
  duration = 4000,
  onHide,
  action,
}) => {
  const translateY = useRef(new Animated.Value(100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const hideToast = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 100,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onHide();
    });
  }, [onHide, opacity, translateY]);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      const timer = setTimeout(() => {
        hideToast();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, hideToast, opacity, translateY, visible]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <Check size={18} color={Colors.text} />;
      case 'error':
        return <AlertCircle size={18} color={Colors.error} />;
      default:
        return <Info size={18} color={Colors.text} />;
    }
  };

  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return Colors.successLight;
      case 'error':
        return Colors.errorLight;
      default:
        return Colors.white;
    }
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <View style={[styles.toast, { backgroundColor: getBackgroundColor() }]}>
        <View style={styles.content}>
          {getIcon()}
          <Text style={styles.message} numberOfLines={2}>
            {message}
          </Text>
        </View>
        
        <View style={styles.actions}>
          {action && (
            <TouchableOpacity
              style={styles.actionButton}
              accessibilityRole="button"
              accessibilityLabel={action.label}
              onPress={() => {
                action.onPress();
                hideToast();
              }}
            >
              <Text style={styles.actionText}>{action.label}</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={styles.closeButton}
            onPress={hideToast}
            accessibilityRole="button"
            accessibilityLabel="Close notification"
          >
            <X size={16} color={Colors.text} />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,
    left: Spacing.lg,
    right: Spacing.lg,
    zIndex: 1000,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radii.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.ash,
    ...Shadows.sm,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  message: {
    color: Colors.text,
    fontFamily: Fonts.ui.regular,
    fontSize: Typography.sizes.md,
    marginLeft: Spacing.md,
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: Spacing.md,
  },
  actionButton: {
    minHeight: 44,
    justifyContent: 'center',
    backgroundColor: Colors.parchment,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.xs,
    marginRight: Spacing.sm,
  },
  actionText: {
    color: Colors.text,
    fontSize: Typography.sizes.sm,
    fontFamily: Fonts.ui.medium,
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
