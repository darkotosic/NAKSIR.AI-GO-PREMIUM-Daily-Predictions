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
import { PlayerStatisticEntry, PlayerStatsTeam } from '@naksir-types/match';

const COLORS = {
  background: '#040312',
  card: '#0b0c1f',
  neonPurple: '#b06bff',
  neonViolet: '#8b5cf6',
  text: '#f8fafc',
  muted: '#a5b4fc',
  borderSoft: '#1f1f3a',
};

const PlayerRow = ({ player }: { player: PlayerStatisticEntry }) => {
  const stats = player.statistics?.[0];
  return (
    <View style={styles.playerRow}>
      <View style={styles.playerMeta}>
        <Text style={styles.playerName}>{player.player?.name || 'Player'}</Text>
        <Text style={styles.playerSubtitle}>
          #{player.player?.number ?? '?'} • {stats?.games?.position || player.player?.pos || 'Pos'}
        </Text>
      </View>
      <View style={styles.playerBadges}>
        {stats?.games?.minutes ? <Text style={styles.badge}>{stats.games.minutes}m</Text> : null}
        {stats?.games?.rating ? <Text style={styles.badge}>Rating {stats.games.rating}</Text> : null}
        {typeof stats?.goals?.total === 'number' ? <Text style={styles.badge}>G {stats.goals.total}</Text> : null}
        {typeof stats?.assists === 'number' ? <Text style={styles.badge}>A {stats.assists}</Text> : null}
      </View>
    </View>
  );
};

const TeamCard = ({ block }: { block: PlayerStatsTeam }) => (
  <View style={styles.card}>
    <Text style={styles.title}>{block.team?.name || 'Team'}</Text>
    <View style={styles.playerList}>
      {block.players?.map((player, idx) => (
        <PlayerRow key={player.player?.id || idx} player={player} />
      ))}
    </View>
  </View>
);

const PlayersScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'Players'>>();
  const fixtureId = route.params?.fixtureId;
  const summary = route.params?.summary;

  const { data, isLoading, isError, refetch } = useMatchDetailsQuery(fixtureId);
  const heroSummary = data?.summary ?? summary;
  const playerBlocks = (data?.players ?? []) as PlayerStatsTeam[];
  const hasPlayers = Array.isArray(playerBlocks) && playerBlocks.length > 0;

  if (!fixtureId) {
    return <ErrorState message="Fixture ID is missing." onRetry={() => navigation.navigate('TodayMatches')} />;
  }

  const goBackToMatch = () => navigation.navigate('MatchDetails', { fixtureId, summary: heroSummary ?? summary });

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <TouchableOpacity style={styles.backButton} onPress={goBackToMatch}>
          <Text style={styles.backIcon}>←</Text>
          <Text style={styles.backLabel}>Back to match</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Players</Text>
        <Text style={styles.subtitle}>
          {heroSummary?.teams?.home?.name || 'Home'} vs {heroSummary?.teams?.away?.name || 'Away'}
        </Text>

        {isLoading ? <ActivityIndicator color={COLORS.neonViolet} size="large" style={styles.loader} /> : null}
        {isError ? <ErrorState message="Unable to load player stats" onRetry={refetch} /> : null}

        {!isLoading && !isError && !hasPlayers ? (
          <View style={styles.card}>
            <Text style={styles.emptyText}>No player statistics available.</Text>
          </View>
        ) : null}

        {playerBlocks.map((block, idx) => (
          <TeamCard key={block.team?.id || idx} block={block} />
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
    gap: 10,
  },
  emptyText: {
    color: COLORS.muted,
    textAlign: 'center',
  },
  title: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '800',
  },
  playerList: {
    gap: 8,
  },
  playerRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSoft,
    gap: 6,
  },
  playerMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  playerName: {
    color: COLORS.text,
    fontWeight: '800',
  },
  playerSubtitle: {
    color: COLORS.muted,
    fontSize: 12,
  },
  playerBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  badge: {
    backgroundColor: '#0f162b',
    color: COLORS.neonViolet,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.neonPurple,
    fontWeight: '800',
    overflow: 'hidden',
  },
});

export default PlayersScreen;
