import React from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { useMatchDetailsQuery } from '@hooks/useMatchDetailsQuery';
import { RootStackParamList } from '@navigation/types';
import { ErrorState } from '@components/ErrorState';
import { MatchEvent } from '@naksir-types/match';

const COLORS = {
  background: '#040312',
  card: '#0b0c1f',
  neonPurple: '#b06bff',
  neonViolet: '#8b5cf6',
  neonOrange: '#fb923c',
  text: '#f8fafc',
  muted: '#a5b4fc',
  borderSoft: '#1f1f3a',
};

const formatMinute = (event: MatchEvent) => {
  const elapsed = event.time?.elapsed ?? '';
  const extra = event.time?.extra;
  if (!elapsed) return '-';
  return extra ? `${elapsed}+${extra}'` : `${elapsed}'`;
};

const EventsScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'Events'>>();
  const fixtureId = route.params?.fixtureId;
  const summary = route.params?.summary;

  const { data, isLoading, isError, refetch } = useMatchDetailsQuery(fixtureId);
  const heroSummary = data?.summary ?? summary;
  const events = (data?.events ?? []) as MatchEvent[];
  const hasEvents = Array.isArray(events) && events.length > 0;

  if (!fixtureId) {
    return <ErrorState message="Fixture ID is missing." onRetry={() => navigation.navigate('MainTabs')} />;
  }

  const goBackToMatch = () => navigation.navigate('MatchDetails', { fixtureId, summary: heroSummary ?? summary });

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <TouchableOpacity style={styles.backButton} onPress={goBackToMatch}>
          <Text style={styles.backIcon}>←</Text>
          <Text style={styles.backLabel}>Back to match</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Events</Text>
        <Text style={styles.subtitle}>
          {heroSummary?.teams?.home?.name || 'Home'} vs {heroSummary?.teams?.away?.name || 'Away'}
        </Text>

        {isLoading ? <ActivityIndicator color={COLORS.neonViolet} size="large" style={styles.loader} /> : null}
        {isError ? <ErrorState message="Unable to load match events" onRetry={refetch} /> : null}

        {!isLoading && !isError && !hasEvents ? (
          <View style={styles.card}>
            <Text style={styles.emptyText}>No events recorded for this match.</Text>
          </View>
        ) : null}

        {events.map((event, idx) => (
          <View style={styles.card} key={`${event.time?.elapsed}-${event.player?.id}-${idx}`}>
            <View style={styles.cardHeader}>
              <Text style={styles.minute}>{formatMinute(event)}</Text>
              <Text style={styles.eventType}>{event.type || 'Event'}</Text>
            </View>
            <Text style={styles.teamName}>{event.team?.name || 'Team'}</Text>
            <Text style={styles.playerName}>{event.player?.name || 'Player'}</Text>
            {event.detail ? <Text style={styles.detailText}>{event.detail}</Text> : null}
            {event.assist?.name ? <Text style={styles.assistText}>Assist: {event.assist.name}</Text> : null}
            {event.comments ? <Text style={styles.commentText}>{event.comments}</Text> : null}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    padding: 16,
    backgroundColor: COLORS.background,
    gap: 12,
    paddingBottom: 28,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0b1220',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.neonPurple,
    alignSelf: 'flex-start',
  },
  backIcon: {
    color: COLORS.text,
    fontSize: 16,
  },
  backLabel: {
    color: COLORS.text,
    fontWeight: '700',
  },
  title: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '800',
  },
  subtitle: {
    color: COLORS.muted,
  },
  loader: {
    marginVertical: 12,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    gap: 6,
  },
  emptyText: {
    color: COLORS.muted,
    textAlign: 'center',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  minute: {
    color: COLORS.neonOrange,
    fontWeight: '800',
  },
  eventType: {
    color: COLORS.neonViolet,
    fontWeight: '800',
  },
  teamName: {
    color: COLORS.text,
    fontWeight: '800',
  },
  playerName: {
    color: COLORS.text,
  },
  detailText: {
    color: COLORS.muted,
  },
  assistText: {
    color: COLORS.text,
    fontStyle: 'italic',
  },
  commentText: {
    color: COLORS.muted,
    fontSize: 12,
  },
});

export default EventsScreen;
