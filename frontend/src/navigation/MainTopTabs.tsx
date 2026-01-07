import React from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';

import TodayMatchesScreen from '@screens/TodayMatchesScreen';
import TopMatchesScreen from '@screens/TopMatchesScreen';
import NaksirAIScreen from '@screens/NaksirAIScreen';

import { MainTopTabsParamList } from '@navigation/types';
import { COLORS } from '@navigation/theme';

const Tab = createMaterialTopTabNavigator<MainTopTabsParamList>();

export default function MainTopTabs() {
  return (
    <Tab.Navigator
      initialRouteName="TodayMatches"
      screenOptions={{
        tabBarStyle: { backgroundColor: COLORS.card },
        tabBarIndicatorStyle: { backgroundColor: COLORS.neonViolet, height: 3 },
        tabBarLabelStyle: { color: COLORS.text, fontWeight: '900', fontSize: 12 },
        tabBarActiveTintColor: COLORS.text,
        tabBarInactiveTintColor: COLORS.text,
      }}
    >
      <Tab.Screen name="TodayMatches" component={TodayMatchesScreen} options={{ title: 'TODAY' }} />
      <Tab.Screen name="TopMatches" component={TopMatchesScreen} options={{ title: 'TOP' }} />
      <Tab.Screen name="NaksirAI" component={NaksirAIScreen} options={{ title: 'NAKSIR AI' }} />
    </Tab.Navigator>
  );
}
