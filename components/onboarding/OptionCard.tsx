import React, { useEffect, useRef } from 'react';
import {
  AccessibilityRole,
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Colors } from '@/constants/colors';
import { Spacing, Typography } from '@/constants/spacing';

interface OptionCardProps {
  title: string;
  description?: string;
  icon: React.ReactNode;
  selected: boolean;
  onPress: () => void;
  multiSelect?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export function OptionCard({
  title,
  description,
  icon,
  selected,
  onPress,
  multiSelect = false,
  disabled = false,
  accessibilityLabel,
  accessibilityHint,
}: OptionCardProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const borderAnim = useRef(new Animated.Value(0)).current;
  const backgroundAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(borderAnim, {
        toValue: selected ? 1 : 0,
        duration: 220,
        useNativeDriver: false,
      }),
      Animated.timing(backgroundAnim, {
        toValue: selected ? 1 : 0,
        duration: 220,
        useNativeDriver: false,
      }),
    ]).start();
  }, [selected, borderAnim, backgroundAnim]);

  const handlePressIn = () => {
    if (disabled) return;
    Animated.timing(scaleAnim, {
      toValue: 0.97,
      duration: 90,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    if (disabled) return;
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 90,
      useNativeDriver: true,
    }).start();
  };

  const animatedBorderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [Colors.border, Colors.primary],
  });

  const animatedBackground = backgroundAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [Colors.card, Colors.primary + '12'],
  });

  const role: AccessibilityRole = multiSelect ? 'checkbox' : 'radio';
  const accessibilityState = {
    selected,
    disabled,
    checked: selected,
  };

  const indicator = multiSelect ? (
    <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
      {selected && <View style={styles.checkboxInner} />}
    </View>
  ) : (
    <View style={[styles.radio, selected && styles.radioSelected]}>
      {selected && <View style={styles.radioInner} />}
    </View>
  );

  return (
    <Animated.View style={[styles.wrapper, { transform: [{ scale: scaleAnim }] }]}> 
      <TouchableOpacity
        activeOpacity={1}
        style={styles.touchable}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        accessibilityRole={role}
        accessibilityState={accessibilityState}
        accessibilityLabel={accessibilityLabel || title}
        accessibilityHint={accessibilityHint || (description ? `${title}. ${description}` : title)}
      >
        <Animated.View
          style={[
            styles.card,
            {
              borderColor: animatedBorderColor,
              backgroundColor: animatedBackground,
            },
            disabled && styles.cardDisabled,
          ]}
        >
          <View style={styles.iconContainer}>{icon}</View>

          <View style={styles.textContainer}>
            <Text style={[styles.title, disabled && styles.disabledText]}>{title}</Text>
            {!!description && (
              <Text style={[styles.description, disabled && styles.disabledText]}>{description}</Text>
            )}
          </View>

          <View style={styles.indicatorContainer}>{indicator}</View>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    alignItems: 'center',
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  touchable: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
  },
  card: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    borderRadius: 18,
    borderWidth: 2,
    backgroundColor: Colors.card,
    minHeight: 84,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardDisabled: {
    opacity: 0.55,
  },
  iconContainer: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  textContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
  },
  title: {
    fontSize: 16,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: Colors.lightText,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 4,
  },
  disabledText: {
    color: Colors.lightText,
  },
  indicatorContainer: {
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.md,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  checkboxInner: {
    width: 12,
    height: 12,
    borderRadius: 2,
    backgroundColor: Colors.white,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: Colors.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary,
  },
});
import React, { useEffect, useRef } from 'react';
import {
  AccessibilityRole,
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Colors } from '@/constants/colors';
import { Spacing, Typography } from '@/constants/spacing';

interface OptionCardProps {
  title: string;
  description?: string;
  icon: React.ReactNode;
  selected: boolean;
  onPress: () => void;
  multiSelect?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export function OptionCard({
  title,
  description,
  icon,
  selected,
  onPress,
  multiSelect = false,
  disabled = false,
  accessibilityLabel,
  accessibilityHint,
}: OptionCardProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const borderAnim = useRef(new Animated.Value(0)).current;
  const backgroundAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(borderAnim, {
        toValue: selected ? 1 : 0,
        duration: 220,
        useNativeDriver: false,
      }),
      Animated.timing(backgroundAnim, {
        toValue: selected ? 1 : 0,
        duration: 220,
        useNativeDriver: false,
      }),
    ]).start();
  }, [selected, borderAnim, backgroundAnim]);

  const handlePressIn = () => {
    if (disabled) return;
    Animated.timing(scaleAnim, {
      toValue: 0.97,
      duration: 90,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    if (disabled) return;
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 90,
      useNativeDriver: true,
    }).start();
  };

  const animatedBorderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [Colors.border, Colors.primary],
  });

  const animatedBackground = backgroundAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [Colors.card, Colors.primary + '12'],
  });

  const role: AccessibilityRole = multiSelect ? 'checkbox' : 'radio';
  const accessibilityState = {
    selected,
    disabled,
    checked: selected,
  };

  const indicator = multiSelect ? (
    <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
      {selected && <View style={styles.checkboxInner} />}
    </View>
  ) : (
    <View style={[styles.radio, selected && styles.radioSelected]}>
      {selected && <View style={styles.radioInner} />}
    </View>
  );

  return (
    <Animated.View style={[styles.wrapper, { transform: [{ scale: scaleAnim }] }]}> 
      <TouchableOpacity
        activeOpacity={1}
        style={styles.touchable}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        accessibilityRole={role}
        accessibilityState={accessibilityState}
        accessibilityLabel={accessibilityLabel || title}
        accessibilityHint={accessibilityHint || (description ? `${title}. ${description}` : title)}
      >
        <Animated.View
          style={[
            styles.card,
            {
              borderColor: animatedBorderColor,
              backgroundColor: animatedBackground,
            },
            disabled && styles.cardDisabled,
          ]}
        >
          <View style={styles.iconContainer}>{icon}</View>

          <View style={styles.textContainer}>
            <Text style={[styles.title, disabled && styles.disabledText]}>{title}</Text>
            {!!description && (
              <Text style={[styles.description, disabled && styles.disabledText]}>{description}</Text>
            )}
          </View>

          <View style={styles.indicatorContainer}>{indicator}</View>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    alignItems: 'center',
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  touchable: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
  },
  card: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    borderRadius: 18,
    borderWidth: 2,
    backgroundColor: Colors.card,
    minHeight: 84,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardDisabled: {
    opacity: 0.55,
  },
  iconContainer: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  textContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
  },
  title: {
    fontSize: 16,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: Colors.lightText,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 4,
  },
  disabledText: {
    color: Colors.lightText,
  },
  indicatorContainer: {
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.md,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  checkboxInner: {
    width: 12,
    height: 12,
    borderRadius: 2,
    backgroundColor: Colors.white,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: Colors.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary,
  },
});
}
import React, { useEffect, useRef } from 'react';
import {
  AccessibilityRole,
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Colors } from '@/constants/colors';
import { Spacing, Typography } from '@/constants/spacing';

interface OptionCardProps {
  title: string;
  description?: string;
  icon: React.ReactNode;
  selected: boolean;
  onPress: () => void;
  multiSelect?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export function OptionCard({
  title,
  description,
  icon,
  selected,
  onPress,
  multiSelect = false,
  disabled = false,
  accessibilityLabel,
  accessibilityHint,
}: OptionCardProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const borderColorAnim = useRef(new Animated.Value(0)).current;
  const backgroundAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(borderColorAnim, {
        toValue: selected ? 1 : 0,
        duration: 220,
        useNativeDriver: false,
      }),
      Animated.timing(backgroundAnim, {
        toValue: selected ? 1 : 0,
        duration: 220,
        useNativeDriver: false,
      }),
    ]).start();
  }, [selected, borderColorAnim, backgroundAnim]);

  const handlePressIn = () => {
    if (disabled) return;
    Animated.timing(scaleAnim, {
      toValue: 0.97,
      duration: 90,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    if (disabled) return;
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 90,
      useNativeDriver: true,
    }).start();
  };

  const animatedBorderColor = borderColorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [Colors.border, Colors.primary],
  });

  const animatedBackgroundColor = backgroundAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [Colors.card, Colors.primary + '12'],
  });

  const role: AccessibilityRole = multiSelect ? 'checkbox' : 'radio';
  const accessibilityState = {
    selected,
    disabled,
    checked: selected,
  };

  const indicator = multiSelect ? (
    <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
      {selected && <View style={styles.checkboxInner} />}
    </View>
  ) : (
    <View style={[styles.radio, selected && styles.radioSelected]}>
      {selected && <View style={styles.radioInner} />}
    </View>
  );

  return (
    <Animated.View style={[styles.wrapper, { transform: [{ scale: scaleAnim }] }]}> 
      <TouchableOpacity
        activeOpacity={1}
        style={styles.touchable}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        accessibilityRole={role}
        accessibilityState={accessibilityState}
        accessibilityLabel={accessibilityLabel || title}
        accessibilityHint={accessibilityHint || (description ? `${title}. ${description}` : title)}
      >
        <Animated.View
          style={[
            styles.card,
            {
              borderColor: animatedBorderColor,
              backgroundColor: animatedBackgroundColor,
            },
            disabled && styles.cardDisabled,
          ]}
        >
          <View style={styles.iconContainer}>{icon}</View>
          <View style={styles.textContainer}>
            <Text style={[styles.title, disabled && styles.disabledText]}>{title}</Text>
            {!!description && (
              <Text style={[styles.description, disabled && styles.disabledText]}>{description}</Text>
            )}
          </View>
          <View style={styles.indicatorContainer}>{indicator}</View>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    alignItems: 'center',
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  touchable: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
  },
  card: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    borderRadius: 18,
    borderWidth: 2,
    backgroundColor: Colors.card,
    minHeight: 84,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardDisabled: {
    opacity: 0.55,
  },
  iconContainer: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  textContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
  },
  title: {
    fontSize: 16,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: Colors.lightText,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 4,
  },
  disabledText: {
    color: Colors.lightText,
  },
  indicatorContainer: {
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.md,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  checkboxInner: {
    width: 12,
    height: 12,
    borderRadius: 2,
    backgroundColor: Colors.white,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: Colors.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary,
  },
});
import React, { useEffect, useRef } from 'react';
import {
  AccessibilityRole,
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Colors } from '@/constants/colors';
import { Spacing, Typography } from '@/constants/spacing';

interface OptionCardProps {
  title: string;
  description?: string;
  icon: React.ReactNode;
  selected: boolean;
  onPress: () => void;
  multiSelect?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export function OptionCard({
  title,
  description,
  icon,
  selected,
  onPress,
  multiSelect = false,
  disabled = false,
  accessibilityLabel,
  accessibilityHint,
}: OptionCardProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const borderColorAnim = useRef(new Animated.Value(0)).current;
  const backgroundAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(borderColorAnim, {
        toValue: selected ? 1 : 0,
        duration: 220,
        useNativeDriver: false,
      }),
      Animated.timing(backgroundAnim, {
        toValue: selected ? 1 : 0,
        duration: 220,
        useNativeDriver: false,
      }),
    ]).start();
  }, [selected, borderColorAnim, backgroundAnim]);

  const handlePressIn = () => {
    if (disabled) return;
    Animated.timing(scaleAnim, {
      toValue: 0.97,
      duration: 90,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    if (disabled) return;
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 90,
      useNativeDriver: true,
    }).start();
  };

  const animatedBorderColor = borderColorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [Colors.border, Colors.primary],
  });

  const animatedBackgroundColor = backgroundAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [Colors.card, Colors.primary + '12'],
  });

  const role: AccessibilityRole = multiSelect ? 'checkbox' : 'radio';
  const accessibilityState = {
    selected,
    disabled,
    checked: selected,
  };

  const indicator = multiSelect ? (
    <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
      {selected && <View style={styles.checkboxInner} />}
    </View>
  ) : (
      {selected && <View style={styles.radioInner} />}
    </View>
  );

  return (
    <Animated.View style={[styles.wrapper, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        activeOpacity={1}
        style={styles.touchable}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
{{ ... }}
const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    alignItems: 'center',
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  touchable: {
    width: '92%',
    maxWidth: 520,
    alignSelf: 'center',
  },
  card: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    borderRadius: 18,
    borderWidth: 2,
    backgroundColor: Colors.card,
    minHeight: 84,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardDisabled: {
    opacity: 0.55,
  },
  iconContainer: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  textContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
  },
  title: {
    fontSize: 16,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: Colors.lightText,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 4,
  },
  disabledText: {
    color: Colors.lightText,
  },
  indicatorContainer: {
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.md,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  checkboxInner: {
    width: 12,
    height: 12,
    borderRadius: 2,
    backgroundColor: Colors.white,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: Colors.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary,
  },
});