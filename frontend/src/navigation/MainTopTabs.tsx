import React from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import TodayMatchesScreen from '@screens/TodayMatchesScreen';
import TopMatchesScreen from '@screens/TopMatchesScreen';
import NaksirAIScreen from '@screens/NaksirAIScreen';

import { MainTopTabsParamList } from '@navigation/types';
import { COLORS } from '@navigation/theme';

const Tab = createMaterialTopTabNavigator<MainTopTabsParamList>();

export default function MainTopTabs() {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      initialRouteName="TodayMatches"
      screenOptions={{
        tabBarStyle: {
          backgroundColor: COLORS.card,
          paddingTop: insets.top + 10,
          height: 78 + insets.top,
        },
        tabBarIndicatorStyle: { backgroundColor: COLORS.neonViolet, height: 2 },
        tabBarLabelStyle: { color: COLORS.text, fontWeight: '800', fontSize: 10 },
        tabBarItemStyle: {
          borderWidth: 1,
          borderColor: '#fa00c4ff',
          borderRadius: 12,
          marginHorizontal: 8,
          marginVertical: 6,
          height: 20,
        },
        tabBarActiveTintColor: COLORS.text,
        tabBarInactiveTintColor: COLORS.text,
      }}
    >
      <Tab.Screen name="TodayMatches" component={TodayMatchesScreen} options={{ title: 'TODAY' }} />
      <Tab.Screen name="TopMatches" component={TopMatchesScreen} options={{ title: 'TOP LEAGUES' }} />
      <Tab.Screen name="NaksirAI" component={NaksirAIScreen} options={{ title: 'NAKSIR AI' }} />
    </Tab.Navigator>
  );
}
