import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { RootStackParamList } from '@navigation/types';
import { COLORS } from '@navigation/theme';

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

import RateAppButton from '@components/RateAppButton';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="TodayMatches"
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.card },
        headerTintColor: COLORS.text,
        headerTitleStyle: { fontWeight: '900' },
        headerRight: () => <RateAppButton style={{ marginRight: 12 }} />,
        contentStyle: { backgroundColor: COLORS.background },
      }}
    >
      <Stack.Screen name="TodayMatches" component={TodayMatchesScreen} options={{ title: 'Matches' }} />
      <Stack.Screen
        name="InDepthAnalysis"
        component={InDepthAnalysisScreen}
        options={{ title: 'In-Depth Analysis' }}
      />

      <Stack.Screen name="Subscriptions" component={SubscriptionsScreen} options={{ title: 'Subscriptions' }} />
      <Stack.Screen name="MatchDetails" component={MatchDetailsScreen} options={{ title: 'Match Details' }} />
      <Stack.Screen name="AIAnalysis" component={AIAnalysisScreen} options={{ title: 'Naksir In-depth Analysis' }} />
      <Stack.Screen name="LiveAIAnalysis" component={LiveAIAnalysisScreen} options={{ title: 'Naksir Live Analysis' }} />

      <Stack.Screen name="H2H" component={H2HScreen} options={{ title: 'Head to Head' }} />
      <Stack.Screen name="Odds" component={OddsScreen} options={{ title: 'Odds Snapshot' }} />
      <Stack.Screen name="Stats" component={StatsScreen} options={{ title: 'Match Stats' }} />
      <Stack.Screen name="TeamStats" component={TeamStatsScreen} options={{ title: 'Team Stats' }} />
      <Stack.Screen name="Events" component={EventsScreen} options={{ title: 'Match Events' }} />
      <Stack.Screen name="Lineups" component={LineupsScreen} options={{ title: 'Lineups' }} />
      <Stack.Screen name="Players" component={PlayersScreen} options={{ title: 'Players' }} />
      <Stack.Screen name="Predictions" component={PredictionsScreen} options={{ title: 'Predictions' }} />
      <Stack.Screen name="Injuries" component={InjuriesScreen} options={{ title: 'Injuries' }} />
    </Stack.Navigator>
  );
}
