import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/spacing';
import { StyleSheet } from 'react-native';

// Reusable theme helpers for top tab navigators (e.g., react-native-tab-view or MaterialTopTabs)
// Usage example (MaterialTopTabs):
// screenOptions={{
//   tabBarLabelStyle: TopTabsTheme.label,
//   tabBarActiveTintColor: Colors.primary,
//   tabBarInactiveTintColor: Colors.lightText,
//   tabBarIndicatorStyle: TopTabsTheme.indicator,
//   tabBarStyle: TopTabsTheme.bar,
// }}

export const TopTabsTheme = {
  label: {
    fontSize: Typography.h3.fontSize, // subtitle 16
    fontWeight: Typography.h3.fontWeight, // 500
    lineHeight: Typography.h3.lineHeight, // 22
    textTransform: 'none' as const,
  },
  indicator: {
    height: 2,
    backgroundColor: Colors.primary,
  },
  bar: StyleSheet.create({
    base: {
      backgroundColor: Colors.background,
      borderBottomWidth: 1,
      borderBottomColor: Colors.border,
      elevation: 0,
      shadowColor: 'transparent',
    },
  }).base,
};
