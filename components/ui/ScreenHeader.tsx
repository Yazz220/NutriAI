import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle, Platform } from 'react-native';
import { Colors } from '@/constants/colors';
import { Spacing, Typography } from '@/constants/spacing';

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
}) => {
  return (
    <View style={[styles.container, containerStyle]}>      
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
    color: Colors.text,
  },
  subtitle: {
    ...Typography.bodySm,
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
