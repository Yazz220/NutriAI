import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { Spacing, Typography, Shadows } from '@/constants/spacing';

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

const { width } = Dimensions.get('window');

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
  }, [visible, duration]);

  const hideToast = () => {
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
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle size={20} color={Colors.fresh} />;
      case 'error':
        return <AlertCircle size={20} color={Colors.expiring} />;
      default:
        return <Info size={20} color={Colors.primary} />;
    }
  };

  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return Colors.fresh;
      case 'error':
        return Colors.expiring;
      default:
        return Colors.text;
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
            accessibilityLabel="Close notification"
          >
            <X size={16} color={Colors.white} />
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
    borderRadius: 12,
    padding: Spacing.lg,
    ...Shadows.lg,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  message: {
    color: Colors.white,
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
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: 6,
    marginRight: Spacing.sm,
  },
  actionText: {
    color: Colors.white,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
  closeButton: {
    padding: Spacing.xs,
  },
});