import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Colors } from '@/constants/colors';
import { Spacing, Typography } from '@/constants/spacing';
import { Fonts } from '@/utils/fonts';

export type ScreenHeaderProps = {
  title: string;
  icon?: React.ReactNode;
  subtitle?: string;
  rightAction?: React.ReactNode; // e.g., button
  containerStyle?: ViewStyle;
  contentStyle?: ViewStyle;
  titleStyle?: TextStyle;
  showDivider?: boolean;
  includeStatusBarSpacer?: boolean;
  glassy?: boolean;
};

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  title,
  icon,
  subtitle,
  rightAction,
  containerStyle,
  contentStyle,
  titleStyle,
  showDivider = false,
  includeStatusBarSpacer = true,
  glassy = false,
}) => {
  return (
    <View style={[styles.container, glassy ? styles.containerGlassy : null, containerStyle]}>      
      {glassy && (
        <BlurView intensity={30} tint="light" style={StyleSheet.absoluteFill} />
      )}
      {glassy && <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,255,255,0.04)' }]} />}
      {includeStatusBarSpacer && <View style={styles.statusBarSpacer} />}

      <View style={[styles.row, contentStyle]}>
        <View style={styles.leftRow}>
          {icon ? <View style={styles.icon}>{icon}</View> : null}
          <View>
            <Text style={[styles.title, titleStyle]} numberOfLines={1}>{title}</Text>
            {!!subtitle && (
              <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
            )}
          </View>
        </View>
        {rightAction ? <View style={styles.action}>{rightAction}</View> : null}
      </View>

      {showDivider && <View style={styles.divider} />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.xxxl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  containerGlassy: {
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  statusBarSpacer: {
    height: Platform.OS === 'ios' ? 44 : 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  icon: {
    marginRight: Spacing.md,
  },
  title: {
    ...Typography.displayMd,
    fontFamily: Fonts.display.bold,
    color: Colors.text,
  },
  subtitle: {
    ...Typography.bodySm,
    fontFamily: Fonts.ui.regular,
    color: Colors.lightText,
    marginTop: 2,
  },
  action: {
    marginLeft: Spacing.lg,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginTop: Spacing.lg,
  },
});

export default ScreenHeader;
