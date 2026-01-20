import { StyleSheet, Text, View } from 'react-native';
import type { BttsMatch } from '../types/btts';

const formatKickoff = (kickoff?: string) => {
  if (!kickoff) {
    return 'TBD';
  }
  const date = new Date(kickoff);
  if (Number.isNaN(date.getTime())) {
    return kickoff;
  }
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
};

const formatScore = (match: BttsMatch) => {
  const home = match.score?.home;
  const away = match.score?.away;
  if (home === undefined && away === undefined) {
    return 'vs';
  }
  const homeScore = home ?? '-';
  const awayScore = away ?? '-';
  return `${homeScore} - ${awayScore}`;
};

const renderBadge = (match: BttsMatch) => {
  const badge = match.btts_badge;
  if (!badge || !badge.recommended) {
    return null;
  }
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeTitle}>BTTS {badge.recommended}</Text>
      {badge.confidence !== undefined && (
        <Text style={styles.badgeDetail}>Confidence: {(badge.confidence * 100).toFixed(0)}%</Text>
      )}
      {badge.reasoning_short ? <Text style={styles.badgeDetail}>{badge.reasoning_short}</Text> : null}
    </View>
  );
};

const renderStatusChip = (status?: string) => {
  const label = status ?? 'prematch';
  return (
    <View style={styles.chip}>
      <Text style={styles.chipText}>{label.toUpperCase()}</Text>
    </View>
  );
};

export default function MatchCard({ match }: { match: BttsMatch }) {
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.leagueText}>
            {match.league?.name ?? 'Unknown league'}
            {match.league?.country ? ` · ${match.league.country}` : ''}
          </Text>
          <Text style={styles.kickoffText}>{formatKickoff(match.kickoff_time)}</Text>
        </View>
        {renderStatusChip(match.status)}
      </View>

      <View style={styles.teamsRow}>
        <Text style={styles.teamText}>{match.home_team?.name ?? 'Home'}</Text>
        <Text style={styles.scoreText}>{formatScore(match)}</Text>
        <Text style={styles.teamText}>{match.away_team?.name ?? 'Away'}</Text>
      </View>

      {renderBadge(match)}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    padding: 16,
    marginVertical: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  leagueText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  kickoffText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  teamsRow: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  teamText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  scoreText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    paddingHorizontal: 8,
  },
  badge: {
    marginTop: 12,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#eff6ff',
  },
  badgeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  badgeDetail: {
    marginTop: 4,
    fontSize: 12,
    color: '#1e3a8a',
  },
  chip: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  chipText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#374151',
  },
});
