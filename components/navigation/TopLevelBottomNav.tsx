import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { BookOpen, LayoutTemplate, Settings } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Radii, Spacing } from '@/constants/spacing';
import { Fonts } from '@/utils/fonts';

export type TopLevelNavItem = 'cookbooks' | 'templates' | 'settings';

export const TOP_LEVEL_BOTTOM_NAV_HEIGHT = 76;

const ITEMS: Array<{
  id: TopLevelNavItem;
  label: string;
  href: string;
  Icon: typeof BookOpen;
}> = [
  { id: 'cookbooks', label: 'Cookbooks', href: '/(book)', Icon: BookOpen },
  { id: 'templates', label: 'Templates', href: '/(book)/templates', Icon: LayoutTemplate },
  { id: 'settings', label: 'Settings', href: '/(book)/settings', Icon: Settings },
];

interface TopLevelBottomNavProps {
  active: TopLevelNavItem;
}

export function TopLevelBottomNav({ active }: TopLevelBottomNavProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, Spacing.sm) }]}>
      <View style={styles.rail}>
        {ITEMS.map(({ id, label, href, Icon }) => {
          const selected = active === id;
          return (
            <Pressable
              key={id}
              style={[styles.item, selected && styles.itemSelected]}
              onPress={() => {
                if (!selected) router.replace(href);
              }}
              accessibilityRole="tab"
              accessibilityLabel={label}
              accessibilityState={{ selected }}
            >
              <Icon
                size={20}
                color={selected ? Colors.onPrimary : Colors.text}
                strokeWidth={1.7}
              />
              <Text style={[styles.label, selected && styles.labelSelected]} numberOfLines={1}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    backgroundColor: Colors.alpha.white[50],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.ash,
  },
  rail: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    minHeight: 56,
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: Colors.ash,
    backgroundColor: Colors.alabaster,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 5,
    gap: Spacing.xs,
    boxShadow: Colors.book.cardShadow,
  },
  item: {
    flex: 1,
    minHeight: 44,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  itemSelected: {
    backgroundColor: Colors.primary,
  },
  label: {
    color: Colors.text,
    fontFamily: Fonts.ui.medium,
    fontSize: 12,
    lineHeight: 16,
  },
  labelSelected: {
    color: Colors.onPrimary,
  },
});
