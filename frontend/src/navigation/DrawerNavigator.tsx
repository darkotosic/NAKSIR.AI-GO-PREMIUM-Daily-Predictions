import React from 'react';
import { Linking } from 'react-native';
import {
  DefaultTheme,
  NavigationContainer,
} from '@react-navigation/native';
import {
  createDrawerNavigator,
  DrawerContentComponentProps,
  DrawerContentScrollView,
  DrawerItem,
  DrawerItemList,
} from '@react-navigation/drawer';
import TodayMatchesScreen from '@screens/TodayMatchesScreen';
import MatchDetailsScreen from '@screens/MatchDetailsScreen';
import AIAnalysisScreen from '@screens/AIAnalysisScreen';
import H2HScreen from '@screens/H2HScreen';
import OddsScreen from '@screens/OddsScreen';
import StatsScreen from '@screens/StatsScreen';
import TeamStatsScreen from '@screens/TeamStatsScreen';
import EventsScreen from '@screens/EventsScreen';
import LineupsScreen from '@screens/LineupsScreen';
import PlayersScreen from '@screens/PlayersScreen';
import PredictionsScreen from '@screens/PredictionsScreen';
import InjuriesScreen from '@screens/InjuriesScreen';
import SubscriptionsScreen from '@screens/SubscriptionsScreen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { RootDrawerParamList } from './types';

const COLORS = {
  background: '#040312',
  card: '#0b0c1f',
  neonPurple: '#b06bff',
  neonViolet: '#8b5cf6',
  text: '#f8fafc',
  borderSoft: '#1f1f3a',
};

const legalLinks = [
  { label: 'Terms of Use', url: 'https://naksirpredictions.top/terms-of-use' },
  {
    label: 'Privacy Policy',
    url: 'https://naksirpredictions.top/privacy-policy',
  },
  {
    label: 'Legal Disclaimer',
    url: 'https://naksirpredictions.top/legal-disclaimer',
  },
  { label: 'Naksir Website', url: 'https://naksirpredictions.top' },
  {
    label: 'Naksir Apps',
    url: 'https://play.google.com/store/apps/dev?id=6165954326742483653',
  },
  { label: 'Telegram', url: 'https://t.me/naksiranalysis' },
];

function CustomDrawerContent(props: DrawerContentComponentProps) {
  return (
    <DrawerContentScrollView {...props} style={{ backgroundColor: COLORS.background }}>
      <DrawerItemList {...props} />
      <DrawerItem
        label="Links"
        labelStyle={{ color: COLORS.text, fontWeight: '700' }}
        onPress={() => null}
        style={{ display: 'none' }}
      />
      {legalLinks.map((link) => (
        <DrawerItem
          key={link.label}
          label={link.label}
          labelStyle={{ color: COLORS.text, fontWeight: '700' }}
          onPress={() => Linking.openURL(link.url)}
        />
      ))}
    </DrawerContentScrollView>
  );
}

const Drawer = createDrawerNavigator<RootDrawerParamList>();

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: COLORS.background,
    card: COLORS.card,
    primary: COLORS.neonPurple,
    text: COLORS.text,
    border: COLORS.borderSoft,
  },
};

const DrawerNavigator = () => (
  <GestureHandlerRootView style={{ flex: 1 }}>
    <NavigationContainer theme={navigationTheme}>
      <Drawer.Navigator
        initialRouteName="TodayMatches"
        drawerContent={(props) => <CustomDrawerContent {...props} />}
        screenOptions={{
          headerStyle: { backgroundColor: COLORS.card },
          headerTintColor: COLORS.text,
          drawerActiveTintColor: COLORS.neonViolet,
          drawerInactiveTintColor: COLORS.text,
          drawerStyle: { backgroundColor: COLORS.background },
        }}
      >
        <Drawer.Screen
          name="TodayMatches"
          component={TodayMatchesScreen}
          options={{ title: "Today's Matches" }}
        />
        <Drawer.Screen
          name="Subscriptions"
          component={SubscriptionsScreen}
          options={{ title: 'Subscriptions' }}
        />
        <Drawer.Screen
          name="MatchDetails"
          component={MatchDetailsScreen}
          options={{ title: 'Match Details', drawerItemStyle: { display: 'none' } }}
        />
        <Drawer.Screen
          name="AIAnalysis"
          component={AIAnalysisScreen}
          options={{ title: 'Naksir In-depth Analysis', drawerItemStyle: { display: 'none' } }}
        />
        <Drawer.Screen
          name="H2H"
          component={H2HScreen}
          options={{ title: 'Head to Head', drawerItemStyle: { display: 'none' } }}
        />
        <Drawer.Screen
          name="Odds"
          component={OddsScreen}
          options={{ title: 'Odds Snapshot', drawerItemStyle: { display: 'none' } }}
        />
        <Drawer.Screen
          name="Stats"
          component={StatsScreen}
          options={{ title: 'Match Stats', drawerItemStyle: { display: 'none' } }}
        />
        <Drawer.Screen
          name="TeamStats"
          component={TeamStatsScreen}
          options={{ title: 'Team Stats', drawerItemStyle: { display: 'none' } }}
        />
        <Drawer.Screen
          name="Events"
          component={EventsScreen}
          options={{ title: 'Match Events', drawerItemStyle: { display: 'none' } }}
        />
        <Drawer.Screen
          name="Lineups"
          component={LineupsScreen}
          options={{ title: 'Lineups', drawerItemStyle: { display: 'none' } }}
        />
        <Drawer.Screen
          name="Players"
          component={PlayersScreen}
          options={{ title: 'Players', drawerItemStyle: { display: 'none' } }}
        />
        <Drawer.Screen
          name="Predictions"
          component={PredictionsScreen}
          options={{ title: 'Predictions', drawerItemStyle: { display: 'none' } }}
        />
        <Drawer.Screen
          name="Injuries"
          component={InjuriesScreen}
          options={{ title: 'Injuries', drawerItemStyle: { display: 'none' } }}
        />
      </Drawer.Navigator>
    </NavigationContainer>
  </GestureHandlerRootView>
);

export default DrawerNavigator;
