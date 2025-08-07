import { Tabs } from "expo-router";
import React from "react";
import { StyleSheet } from "react-native";
import { Refrigerator, BookOpen, ShoppingCart, Calendar, Brain } from "lucide-react-native";
import { Colors } from "@/constants/colors";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.tabIconInactive,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        headerStyle: styles.header,
        headerTitleStyle: styles.headerTitle,
        headerShadowVisible: false,
      }}
    >
      {/* Hide the standalone planner route from the tab bar since it's embedded inside Recipes */}
      <Tabs.Screen
        key="tab-planner-hidden"
        name="planner"
        options={{
          href: null,
          title: 'Planner',
        }}
      />
      <Tabs.Screen
        key="tab-coach"
        name="coach"
        options={{
          title: 'Coach',
          tabBarIcon: ({ color }) => <Brain size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        key="tab-inventory"
        name="index"
        options={{
          title: "Inventory",
          tabBarIcon: ({ color }) => <Refrigerator size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        key="tab-recipes"
        name="recipes"
        options={{
          title: "Recipes",
          tabBarIcon: ({ color }) => <BookOpen size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        key="tab-list"
        name="list"
        options={{
          title: 'Shopping List',
          tabBarIcon: ({ color }) => <ShoppingCart size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.tabBackground,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    height: 60,
    paddingBottom: 5,
    paddingTop: 5,
  },
  tabBarLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  header: {
    backgroundColor: Colors.background,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
  },
});