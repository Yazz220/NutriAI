 import React from "react";
import { Tabs } from "expo-router";
import { View, StyleSheet } from 'react-native';
import { Refrigerator, BookOpen, ShoppingCart, LayoutDashboard, User } from "lucide-react-native";
import { Colors } from "@/constants/colors";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        tabBarShowLabel: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.lightText,
        headerStyle: styles.header,
        headerTitleStyle: styles.headerTitle,
        headerTintColor: Colors.text,
        headerShadowVisible: false,
        tabBarStyle: styles.pillBar,
        tabBarItemStyle: styles.tabItem,
        tabBarIcon: ({ focused, color, size }) => {
          const iconColor = focused ? Colors.white : Colors.lightText;
          const activeBg = Colors.primary; // use system primary accent
          if (route.name === 'coach') return (
            <View style={focused ? [styles.iconWrap, { backgroundColor: activeBg }] : styles.iconWrap}>
              <LayoutDashboard size={20} color={iconColor} />
            </View>
          );
          if (route.name === 'index') return (
            <View style={focused ? [styles.iconWrap, { backgroundColor: activeBg }] : styles.iconWrap}>
              <Refrigerator size={20} color={iconColor} />
            </View>
          );
          if (route.name === 'recipes') return (
            <View style={focused ? [styles.iconWrap, { backgroundColor: activeBg }] : styles.iconWrap}>
              <BookOpen size={20} color={iconColor} />
            </View>
          );
          if (route.name === 'list') return (
            <View style={focused ? [styles.iconWrap, { backgroundColor: activeBg }] : styles.iconWrap}>
              <ShoppingCart size={20} color={iconColor} />
            </View>
          );
          if (route.name === 'profile') return (
            <View style={focused ? [styles.iconWrap, { backgroundColor: activeBg }] : styles.iconWrap}>
              <User size={20} color={iconColor} />
            </View>
          );
          return null;
        },
      })}
    >
      <Tabs.Screen name="coach" options={{ title: 'Dashboard' }} />
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
  pillBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 12,
    height: 56,
    borderRadius: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.90)',
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingHorizontal: 0,
  },
  tabItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 0,
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
