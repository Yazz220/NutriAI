 import React from "react";
import { Tabs } from "expo-router";
import { View, StyleSheet } from 'react-native';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import { Refrigerator, BookOpen, ShoppingCart, LayoutDashboard, User } from "lucide-react-native";
import { Colors } from "@/constants/colors";
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={({ route }) => ({
        tabBarShowLabel: false,
        tabBarActiveTintColor: Colors.secondary,
        tabBarInactiveTintColor: Colors.gray[400],
        headerStyle: styles.header,
        headerTitleStyle: styles.headerTitle,
        headerTintColor: Colors.text,
        headerShadowVisible: false,
        tabBarStyle: [styles.clearBar],
        tabBarItemStyle: styles.tabItem,
        tabBarBackground: () => (
          <View style={styles.tabBg} />
        ),
        tabBarIcon: ({ focused }) => {
          const iconColor = focused ? Colors.secondary : Colors.lightText;
          const stroke = focused ? 2.75 : 2;
          const size = focused ? 22 : 20;
          const wrapStyle = styles.iconWrap; // no circle background on focus
          if (route.name === 'coach') return (
            <View style={wrapStyle}>
              <LayoutDashboard size={size} color={iconColor} strokeWidth={stroke} />
              {focused ? <View style={styles.activeDot} /> : null}
            </View>
          );
          if (route.name === 'index') return (
            <View style={wrapStyle}>
              <Refrigerator size={size} color={iconColor} strokeWidth={stroke} />
              {focused ? <View style={styles.activeDot} /> : null}
            </View>
          );
          if (route.name === 'recipes') return (
            <View style={wrapStyle}>
              <BookOpen size={size} color={iconColor} strokeWidth={stroke} />
              {focused ? <View style={styles.activeDot} /> : null}
            </View>
          );
          if (route.name === 'list') return (
            <View style={wrapStyle}>
              <ShoppingCart size={size} color={iconColor} strokeWidth={stroke} />
              {focused ? <View style={styles.activeDot} /> : null}
            </View>
          );
          if (route.name === 'profile') return (
            <View style={wrapStyle}>
              <User size={size} color={iconColor} strokeWidth={stroke} />
              {focused ? <View style={styles.activeDot} /> : null}
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
    position: 'relative',
    height: 64,
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
    justifyContent: 'center',
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.secondary,
    marginTop: 4,
  },
  iconWrapActive: {
    // No background for active state per design (icon color changes instead)
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderColor: 'transparent',
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
