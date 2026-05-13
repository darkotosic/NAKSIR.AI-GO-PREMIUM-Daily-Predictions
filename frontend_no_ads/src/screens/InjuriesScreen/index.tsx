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
import { InjuryRecord } from '@/types/match';
import TelegramBanner from '@components/TelegramBanner';

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

const formatDate = (value?: string) => {
  if (!value) return 'Date TBD';
  const date = new Date(value);
  return date.toLocaleDateString();
};

const InjuriesScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'Injuries'>>();
  const fixtureId = route.params?.fixtureId;
  const summary = route.params?.summary;

  const { data, isLoading, isError, refetch } = useMatchDetailsQuery(fixtureId);
  const heroSummary = data?.summary ?? summary;
  const injuriesRaw = data?.injuries;
  const injuries = Array.isArray(injuriesRaw)
    ? (injuriesRaw as InjuryRecord[])
    : injuriesRaw
      ? ([injuriesRaw] as InjuryRecord[])
      : [];
  const hasInjuries = injuries.length > 0;

  if (!fixtureId) {
    return <ErrorState message="Fixture ID is missing." onRetry={() => navigation.navigate('TodayMatches')} />;
  }

  const goBackToMatch = () => navigation.navigate('MatchDetails', { fixtureId, summary: heroSummary ?? summary });

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <TelegramBanner />
        <TouchableOpacity style={styles.backButton} onPress={goBackToMatch}>
          <Text style={styles.backIcon}>←</Text>
          <Text style={styles.backLabel}>Back to match</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Injuries</Text>
        <Text style={styles.subtitle}>
          {heroSummary?.teams?.home?.name || 'Home'} vs {heroSummary?.teams?.away?.name || 'Away'}
        </Text>

        {isLoading ? <ActivityIndicator color={COLORS.neonViolet} size="large" style={styles.loader} /> : null}
        {isError ? <ErrorState message="Unable to load injuries" onRetry={refetch} /> : null}

        {!isLoading && !isError && !hasInjuries ? (
          <View style={styles.card}>
            <Text style={styles.emptyText}>No injuries reported.</Text>
          </View>
        ) : null}

        {injuries.map((injury, idx) => (
          <View style={styles.card} key={injury.player?.id || idx}>
            <View style={styles.cardHeader}>
              <Text style={styles.playerName}>{injury.player?.name || 'Player'}</Text>
              <Text style={styles.dateText}>{formatDate(injury.fixture?.date)}</Text>
            </View>
            <Text style={styles.teamName}>{injury.team?.name || 'Team'}</Text>
            {injury.player?.type ? <Text style={styles.detailText}>Status: {injury.player.type}</Text> : null}
            {injury.information ? <Text style={styles.detailText}>{injury.information}</Text> : null}
            {injury.league?.name ? (
              <Text style={styles.mutedText}>
                {injury.league.country ? `${injury.league.country} • ` : ''}
                {injury.league.name}
              </Text>
            ) : null}
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
  playerName: {
    color: COLORS.text,
    fontWeight: '800',
  },
  dateText: {
    color: COLORS.neonOrange,
  },
  teamName: {
    color: COLORS.text,
  },
  detailText: {
    color: COLORS.text,
  },
  mutedText: {
    color: COLORS.muted,
    fontSize: 12,
  },
});

export default InjuriesScreen;
