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
import { Lineup } from '@types/match';
import TelegramBanner from '@components/TelegramBanner';

const COLORS = {
  background: '#040312',
  card: '#0b0c1f',
  neonPurple: '#b06bff',
  neonViolet: '#8b5cf6',
  text: '#f8fafc',
  muted: '#a5b4fc',
  borderSoft: '#1f1f3a',
};

const PlayerRow = ({ label, value }: { label: string; value?: string | number | null }) => (
  <View style={styles.playerRow}>
    <Text style={styles.playerLabel}>{label}</Text>
    <Text style={styles.playerValue}>{value ?? '-'}</Text>
  </View>
);

const LineupCard = ({ lineup }: { lineup: Lineup }) => (
  <View style={styles.card}>
    <View style={styles.cardHeader}>
      <Text style={styles.title}>{lineup.team?.name || 'Team'}</Text>
      <Text style={styles.badge}>{lineup.formation || 'Formation TBD'}</Text>
    </View>
    {lineup.coach?.name ? <Text style={styles.subtitle}>Coach: {lineup.coach.name}</Text> : null}

    {lineup.startXI?.length ? <Text style={styles.sectionLabel}>Starting XI</Text> : null}
    {lineup.startXI?.map((entry, idx) => (
      <PlayerRow
        key={`${entry.player?.id || idx}-start`}
        label={`${entry.player?.number ?? '?'} • ${entry.player?.pos || ''}`.trim()}
        value={entry.player?.name}
      />
    ))}

    {lineup.substitutes?.length ? <Text style={styles.sectionLabel}>Substitutes</Text> : null}
    {lineup.substitutes?.map((entry, idx) => (
      <PlayerRow
        key={`${entry.player?.id || idx}-sub`}
        label={`${entry.player?.number ?? '?'} • ${entry.player?.pos || ''}`.trim()}
        value={entry.player?.name}
      />
    ))}
  </View>
);

const LineupsScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'Lineups'>>();
  const fixtureId = route.params?.fixtureId;
  const summary = route.params?.summary;

  const { data, isLoading, isError, refetch } = useMatchDetailsQuery(fixtureId);
  const heroSummary = data?.summary ?? summary;
  const lineups = (data?.lineups ?? []) as Lineup[];
  const hasLineups = Array.isArray(lineups) && lineups.length > 0;

  if (!fixtureId) {
    return <ErrorState message="Fixture ID is missing." onRetry={() => navigation.navigate('MainTabs')} />;
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

        <Text style={styles.headerTitle}>Lineups</Text>
        <Text style={styles.subtitle}>
          {heroSummary?.teams?.home?.name || 'Home'} vs {heroSummary?.teams?.away?.name || 'Away'}
        </Text>

        {isLoading ? <ActivityIndicator color={COLORS.neonViolet} size="large" style={styles.loader} /> : null}
        {isError ? <ErrorState message="Unable to load lineups" onRetry={refetch} /> : null}

        {!isLoading && !isError && !hasLineups ? (
          <View style={styles.card}>
            <Text style={styles.emptyText}>No lineups available.</Text>
          </View>
        ) : null}

        {lineups.map((lineup, idx) => (
          <LineupCard lineup={lineup} key={lineup.team?.id || idx} />
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
  headerTitle: {
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
    gap: 8,
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
  title: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '800',
  },
  badge: {
    color: COLORS.neonViolet,
    borderColor: COLORS.neonPurple,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
    fontWeight: '800',
  },
  sectionLabel: {
    color: COLORS.neonViolet,
    fontWeight: '800',
    marginTop: 6,
  },
  playerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSoft,
  },
  playerLabel: {
    color: COLORS.text,
    flex: 1,
    marginRight: 12,
  },
  playerValue: {
    color: COLORS.text,
    fontWeight: '800',
  },
});

export default LineupsScreen;
