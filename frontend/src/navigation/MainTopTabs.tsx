import React from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import TodayMatchesScreen from '@screens/TodayMatchesScreen';
import TopMatchesScreen from '@screens/TopMatchesScreen';
import NaksirAIScreen from '@screens/NaksirAIScreen';

import { MainTopTabsParamList } from '@navigation/types';
import { COLORS } from '@navigation/theme';
import NeonTopTabBar from '@navigation/components/NeonTopTabBar';

const Tab = createMaterialTopTabNavigator<MainTopTabsParamList>();

export default function MainTopTabs() {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      initialRouteName="TodayMatches"
      tabBar={(props) => <NeonTopTabBar {...props} topInset={insets.top} />}
      screenOptions={{
        tabBarStyle: {
          backgroundColor: COLORS.card,
          // Keep it simple; the custom tabBar handles safe-area & layout
        },
        tabBarIndicatorStyle: { height: 0 }, // disable default indicator
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
