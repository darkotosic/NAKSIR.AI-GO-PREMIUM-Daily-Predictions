import React from 'react';
import { Linking } from 'react-native';
import { DefaultTheme } from '@react-navigation/native';
import {
  createDrawerNavigator,
  DrawerContentComponentProps,
  DrawerContentScrollView,
  DrawerItem,
  DrawerItemList,
} from '@react-navigation/drawer';
import type { MatchSummary } from '@/types/match';
import TodayMatchesScreen from '@screens/TodayMatchesScreen';
import MatchDetailsScreen from '@screens/MatchDetailsScreen';
import AIAnalysisScreen from '@screens/AIAnalysisScreen';
import LiveAIAnalysisScreen from '@screens/LiveAIAnalysisScreen';
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
import InDepthAnalysisScreen from '@screens/InDepthAnalysisScreen';
import PrivacySettingsScreen from '@screens/PrivacySettingsScreen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import RateAppButton from '@components/RateAppButton';
import { openRateApp } from '@lib/rateApp';

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

type DrawerParamList = {
  TodayMatches: undefined;
  InDepthAnalysis: undefined;
  Subscriptions: undefined;
  MatchDetails: { fixtureId?: number | string; summary?: MatchSummary } | undefined;
  AIAnalysis: { fixtureId?: number | string; summary?: MatchSummary } | undefined;
  LiveAIAnalysis: { fixtureId?: number | string; summary?: MatchSummary } | undefined;
  H2H: { fixtureId?: number | string; summary?: MatchSummary } | undefined;
  Odds:
    | { fixtureId?: number | string; summary?: MatchSummary; selectedMarket?: string }
    | undefined;
  Stats: { fixtureId?: number | string; summary?: MatchSummary } | undefined;
  TeamStats: { fixtureId?: number | string; summary?: MatchSummary } | undefined;
  Events: { fixtureId?: number | string; summary?: MatchSummary } | undefined;
  Lineups: { fixtureId?: number | string; summary?: MatchSummary } | undefined;
  Players: { fixtureId?: number | string; summary?: MatchSummary } | undefined;
  Predictions: { fixtureId?: number | string; summary?: MatchSummary } | undefined;
  Injuries: { fixtureId?: number | string; summary?: MatchSummary } | undefined;
  PrivacySettings: undefined;
};

function CustomDrawerContent(props: DrawerContentComponentProps) {
  return (
    <DrawerContentScrollView {...props} style={{ backgroundColor: COLORS.background }}>
      <DrawerItemList {...props} />
      <DrawerItem
        label="Rate app"
        labelStyle={{ color: COLORS.text, fontWeight: '800' }}
        onPress={openRateApp}
      />
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

const Drawer = createDrawerNavigator<DrawerParamList>();

export const navigationTheme = {
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
    <Drawer.Navigator
      initialRouteName="TodayMatches"
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.card },
        headerTintColor: COLORS.text,
        drawerActiveTintColor: COLORS.neonViolet,
        drawerInactiveTintColor: COLORS.text,
        drawerStyle: { backgroundColor: COLORS.background },
        headerRight: () => <RateAppButton style={{ marginRight: 12 }} />,
      }}
    >
      <Drawer.Screen
        name="TodayMatches"
        component={TodayMatchesScreen}
        options={{ title: "Today's Matches" }}
      />
      <Drawer.Screen
        name="InDepthAnalysis"
        component={InDepthAnalysisScreen}
        options={{ title: 'In-Depth Analysis', drawerItemStyle: { display: 'none' } }}
      />
      <Drawer.Screen
        name="Subscriptions"
        component={SubscriptionsScreen}
        options={{ title: 'Subscriptions', drawerItemStyle: { display: 'none' } }}
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
        name="LiveAIAnalysis"
        component={LiveAIAnalysisScreen}
        options={{ title: 'Naksir Live Analysis', drawerItemStyle: { display: 'none' } }}
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
      <Drawer.Screen
        name="PrivacySettings"
        component={PrivacySettingsScreen}
        options={{ title: 'Privacy Settings' }}
      />
    </Drawer.Navigator>
  </GestureHandlerRootView>
);

export default DrawerNavigator;
