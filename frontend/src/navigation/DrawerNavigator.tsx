import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import TodayMatchesScreen from '@screens/TodayMatchesScreen';
import MatchDetailsScreen from '@screens/MatchDetailsScreen';
import AIAnalysisScreen from '@screens/AIAnalysisScreen';
import GoPremiumScreen from '@screens/GoPremiumScreen';
import NaksirAccountScreen from '@screens/NaksirAccountScreen';
import { RootDrawerParamList } from './types';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

const Drawer = createDrawerNavigator<RootDrawerParamList>();

const DrawerNavigator = () => (
  <GestureHandlerRootView style={{ flex: 1 }}>
    <NavigationContainer>
      <Drawer.Navigator
        initialRouteName="TodayMatches"
        screenOptions={{
          headerStyle: { backgroundColor: '#0b0c1f' },
          headerTintColor: '#f8fafc',
          drawerActiveTintColor: '#8b5cf6',
          drawerInactiveTintColor: '#e5e7eb',
          drawerStyle: { backgroundColor: '#040312' },
        }}
      >
        <Drawer.Screen
          name="TodayMatches"
          component={TodayMatchesScreen}
          options={{ title: 'Today matches' }}
        />
        <Drawer.Screen
          name="MatchDetails"
          component={MatchDetailsScreen}
          options={{ title: 'Match details', drawerItemStyle: { display: 'none' } }}
        />
        <Drawer.Screen
          name="AIAnalysis"
          component={AIAnalysisScreen}
          options={{ title: 'AI Analysis', drawerItemStyle: { display: 'none' } }}
        />
        <Drawer.Screen
          name="GoPremium"
          component={GoPremiumScreen}
          options={{ title: 'Go Premium' }}
        />
        <Drawer.Screen
          name="NaksirAccount"
          component={NaksirAccountScreen}
          options={{ title: 'Naksir Account' }}
        />
      </Drawer.Navigator>
    </NavigationContainer>
  </GestureHandlerRootView>
);

export default DrawerNavigator;
