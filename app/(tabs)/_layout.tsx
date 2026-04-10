 import React from "react";
import { Tabs } from "expo-router";
import { View, StyleSheet } from 'react-native';
import { MessageCircle } from 'lucide-react-native';
import RecipesIcon from '@/assets/icons/Recipes .svg';
import CalendarIcon from '@/assets/icons/Calender.svg';
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
          paddingBottom: (insets?.bottom ?? 0) + 38,
          backgroundColor: Colors.background,
        },
        tabBarShowLabel: false,
        tabBarActiveTintColor: Colors.secondary,
        tabBarInactiveTintColor: Colors.gray[400],
        headerStyle: styles.header,
        headerTitleStyle: styles.headerTitle,
        headerTintColor: Colors.text,
        headerShadowVisible: false,
        tabBarStyle: [
          styles.clearBar,
          {
            height: (insets?.bottom ?? 0) + 37,
            paddingBottom: insets?.bottom ?? 0,
            paddingTop: 1,
            backgroundColor: Colors.tabBackground,
            borderTopWidth: 1,
            borderTopColor: Colors.separator,
            elevation: 0,
            shadowOpacity: 0,
          },
        ],
        tabBarItemStyle: styles.tabItem,
        tabBarIcon: ({ focused }) => {
          const iconColor = focused ? Colors.secondary : Colors.lightText;
          const baseSize = Math.round(((focused ? 52 : 48) * 1.65) * 0.7 * 0.8);
          const size = route.name === 'profile' ? Math.round(baseSize * 0.855) : baseSize;
          const translateY = route.name === 'profile' ? 6 : 9;
          const wrapStyle = [styles.iconWrap, { transform: [{ translateY }] }];

          if (route.name === 'index') return (
            <View style={wrapStyle}>
              <MessageCircle size={size * 0.5} color={iconColor} strokeWidth={focused ? 2.5 : 2} />
            </View>
          );
          if (route.name === 'recipes') return (
            <View style={wrapStyle}>
              <RecipesIcon width={size} height={size} color={iconColor} />
            </View>
          );
          if (route.name === 'plan') return (
            <View style={wrapStyle}>
              <CalendarIcon width={size} height={size} color={iconColor} />
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
      <Tabs.Screen name="index" options={{ title: 'Nosh', headerShown: false }} />
      <Tabs.Screen name="recipes" options={{ title: 'Recipes' }} />
      <Tabs.Screen name="plan" options={{ title: 'Plan' }} />
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
  clearBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 37,
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    elevation: 0,
    shadowOpacity: 0,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  header: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
  },
});
