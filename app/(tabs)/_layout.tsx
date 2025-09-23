 import React from "react";
import { Tabs } from "expo-router";
import { View, StyleSheet } from 'react-native';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
// Use the provided SVG filenames as currently placed under assets/icons/
import DashboardIcon from '@/assets/icons/Dashboard.svg';
import InventoryIcon from '@/assets/icons/Inventory.svg';
import RecipesIcon from '@/assets/icons/Recipes .svg';
import ShoppingListIcon from '@/assets/icons/Shopping list .svg';
import PersonalInfoIcon from '@/assets/icons/Personal information.svg';
import { Colors } from "@/constants/colors";
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={({ route }) => ({
        sceneContainerStyle: {
          paddingBottom: (insets?.bottom ?? 0) + 84,
          backgroundColor: Colors.background,
        },
        tabBarShowLabel: false,
        tabBarActiveTintColor: Colors.secondary,
        tabBarInactiveTintColor: Colors.gray[400],
        headerStyle: styles.header,
        headerTitleStyle: styles.headerTitle,
        headerTintColor: Colors.text,
        headerShadowVisible: false,
        // Absolute, floating, transparent bar with safe bottom padding only
        tabBarStyle: [
          styles.clearBar,
          {
            height: (insets?.bottom ?? 0) + 84,
            paddingBottom: (insets?.bottom ?? 0) + 8,
            paddingTop: 0,
            backgroundColor: 'transparent',
            borderTopWidth: 0,
            borderTopColor: 'transparent',
            elevation: 0,
            shadowOpacity: 0,
          },
        ],
        tabBarItemStyle: styles.tabItem,
        // Branded rounded pill background and a subtle top fade
        tabBarBackground: () => (
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {/* Top fade to prevent visual overlap with content */}
            <ExpoLinearGradient
              colors={[Colors.background + '00', Colors.background + 'D0']}
              style={[styles.topFade, { top: -28 }]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
            />
            {/* Pill container */}
            <View
              style={[
                styles.pill,
                {
                  marginBottom: (insets?.bottom ?? 0) + 12,
                },
              ]}
            />
          </View>
        ),
        // Remove background so icons appear to float
        tabBarIcon: ({ focused }) => {
          const iconColor = focused ? Colors.secondary : Colors.lightText;
          // Unified icon size for consistent layout
          const size = 32;
          const wrapStyle = styles.iconWrap; // no circle background on focus
          if (route.name === 'coach') return (
            <View style={wrapStyle}>
              <DashboardIcon width={size} height={size} color={iconColor} />
            </View>
          );
          if (route.name === 'index') return (
            <View style={wrapStyle}>
              <InventoryIcon width={size} height={size} color={iconColor} />
            </View>
          );
          if (route.name === 'recipes') return (
            <View style={wrapStyle}>
              <RecipesIcon width={size} height={size} color={iconColor} />
            </View>
          );
          if (route.name === 'list') return (
            <View style={wrapStyle}>
              <ShoppingListIcon width={size} height={size} color={iconColor} />
            </View>
          );
          if (route.name === 'profile') return (
            <View style={wrapStyle}>
              <PersonalInfoIcon width={size} height={size} color={iconColor} />
            </View>
          );
          return null;
        },
      })}
    >
      <Tabs.Screen name="coach" options={{ title: 'Tracking' }} />
      <Tabs.Screen name="index" options={{ title: 'Inventory' }} />
      <Tabs.Screen name="recipes" options={{ title: 'Recipes' }} />
      <Tabs.Screen name="list" options={{ title: 'Shopping List' }} />
      <Tabs.Screen
        name="profile"
        options={{
          title: '',
          headerShown: false,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  // Non-absolute bar with reserved height; gradient background renders via tabBarBackground
  clearBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 84,
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    elevation: 0,
    shadowOpacity: 0,
  },
  tabBg: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  // lock each of the 5 items to equal width for perfect centering
  tabItem: {
    flex: 0,
    width: '20%',
    alignItems: 'center',
    justifyContent: 'center', // align icons vertically centered within pill
  },
  iconWrap: {
    // Hit target tailored to unified icon size
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 0,
    backgroundColor: 'transparent',
  },
  activeDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.secondary,
    marginTop: 4,
  },
  iconWrapActive: {
    // No background for active state per design (icon color changes instead)
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderColor: 'transparent',
  },
  // fade overlay at the top of the bar to avoid visual overlap with content
  topFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 48,
  },
  // branded pill behind the icons
  pill: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 8,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.background,
    borderWidth: 2.5,
    borderColor: '#2F4F2F',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 6,
  },
  header: {
    backgroundColor: 'rgba(255, 255, 255, 0.90)',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
  },
});
