import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { BttsMatch } from '../types/btts';
import { COLORS } from '../theme/colors';
import { flagEmojiFromCountry } from '../utils/countryFlags';
import { formatKickoffBelgrade } from '../utils/time';

const LIVE_STATUS = new Set(['1H', '2H', 'HT', 'ET', 'BT', 'P', 'LIVE']);

const resolveKickoff = (match: BttsMatch) => match.kickoff ?? match.kickoff_time ?? '';

const resolveTeams = (match: BttsMatch) => {
  const home = match.teams?.home ?? match.home_team;
  const away = match.teams?.away ?? match.away_team;
  return { home, away };
};

const resolveGoals = (match: BttsMatch) => match.goals ?? match.score;

const getStatusMeta = (match: BttsMatch) => {
  const short = match.status?.short;
  const elapsed = match.status?.elapsed;

  if (short === 'FT') {
    return { state: 'finished', label: 'FT' };
  }
  if (elapsed && elapsed > 0) {
    return { state: 'live', label: short ?? 'LIVE' };
  }
  if (short && LIVE_STATUS.has(short)) {
    return { state: 'live', label: short };
  }
  return { state: 'prematch', label: 'PRE' };
};

const formatOddValue = (value?: number | string) => {
  if (value === undefined || value === null) {
    return '—';
  }
  if (typeof value === 'number') {
    return value.toFixed(2);
  }
  return String(value);
};

const formatConfidence = (confidence?: number) => {
  if (confidence === undefined || confidence === null) {
    return null;
  }
  const percent = confidence > 1 ? confidence : confidence * 100;
  return `${percent.toFixed(0)}%`;
};

export default function MatchCard({
  match,
  onPress,
}: {
  match: BttsMatch;
  onPress?: (match: BttsMatch) => void;
}) {
  const leagueName = match.league?.name ?? 'Unknown league';
  const leagueCountry = match.league?.country ?? '';
  const flagEmoji = flagEmojiFromCountry(leagueCountry);
  const kickoff = resolveKickoff(match);
  const kickoffLabel = formatKickoffBelgrade(kickoff);
  const { home, away } = resolveTeams(match);
  const goals = resolveGoals(match);
  const statusMeta = getStatusMeta(match);
  const showScore = statusMeta.state !== 'prematch';

  const badge = match.btts_badge;
  const badgeAccent = badge?.recommended === 'NO' ? COLORS.telegramBlue : COLORS.neonGreen;
  const badgeConfidence = formatConfidence(badge?.confidence);

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress ? () => onPress(match) : undefined}
      disabled={!onPress}
    >
      <View style={styles.headerRow}>
        <View style={styles.leagueInfo}>
          <Text style={styles.leagueText} numberOfLines={1}>
            {flagEmoji} {leagueName}
          </Text>
        </View>
        {match.league?.logo ? (
          <Image source={{ uri: match.league.logo }} style={styles.leagueLogo} resizeMode="contain" />
        ) : null}
        <View style={styles.headerRight}>
          <View style={styles.kickoffPill}>
            <Text style={styles.kickoffText}>
              {kickoffLabel.date} {kickoffLabel.time}
            </Text>
          </View>
          <View
            style={[
              styles.statusChip,
              statusMeta.state === 'live' && styles.statusLive,
              statusMeta.state === 'finished' && styles.statusFinished,
              statusMeta.state === 'prematch' && styles.statusPrematch,
            ]}
          >
            <Text style={styles.statusText}>{statusMeta.label}</Text>
          </View>
        </View>
      </View>

      <View style={styles.teamsBlock}>
        <View style={styles.teamRow}>
          <View style={styles.teamInfo}>
            {home?.logo ? (
              <Image source={{ uri: home.logo }} style={styles.teamLogo} resizeMode="contain" />
            ) : (
              <View style={styles.logoPlaceholder} />
            )}
            <Text style={styles.teamName} numberOfLines={1}>
              {home?.name ?? 'Home'}
            </Text>
          </View>
          {showScore ? <Text style={styles.scoreText}>{goals?.home ?? '—'}</Text> : null}
        </View>
        <View style={styles.teamRow}>
          <View style={styles.teamInfo}>
            {away?.logo ? (
              <Image source={{ uri: away.logo }} style={styles.teamLogo} resizeMode="contain" />
            ) : (
              <View style={styles.logoPlaceholder} />
            )}
            <Text style={styles.teamName} numberOfLines={1}>
              {away?.name ?? 'Away'}
            </Text>
          </View>
          {showScore ? <Text style={styles.scoreText}>{goals?.away ?? '—'}</Text> : null}
        </View>
      </View>

      <View style={styles.oddsRow}>
        <View style={[styles.oddPill, styles.oddYes]}>
          <Text style={styles.oddLabel}>BTTS YES</Text>
          <Text style={[styles.oddValue, styles.oddValueYes]}>
            {formatOddValue(match.odds?.btts_yes)}
          </Text>
        </View>
        <View style={[styles.oddPill, styles.oddNo]}>
          <Text style={styles.oddLabel}>BTTS NO</Text>
          <Text style={[styles.oddValue, styles.oddValueNo]}>{formatOddValue(match.odds?.btts_no)}</Text>
        </View>
      </View>

      {badge?.recommended ? (
        <View style={styles.badgeWrapper}>
          <View style={[styles.badgeBar, { backgroundColor: COLORS.neonPink }]} />
          <View style={styles.badgeContent}>
            <Text style={[styles.badgeTitle, { color: badgeAccent }]}>RECOMMENDED: {badge.recommended}</Text>
            {badgeConfidence ? (
              <Text style={styles.badgeDetail}>Confidence: {badgeConfidence}</Text>
            ) : null}
            {badge.reasoning_short ? (
              <Text style={styles.badgeDetail} numberOfLines={2}>
                {badge.reasoning_short}
              </Text>
            ) : null}
          </View>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.cardDark,
    padding: 12,
    marginBottom: 10,
    borderRadius: 16,
    shadowColor: COLORS.black,
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  cardPressed: {
    opacity: 0.9,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  leagueInfo: {
    flex: 1,
  },
  leagueText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
  },
  leagueLogo: {
    width: 24,
    height: 24,
  },
  headerRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  kickoffPill: {
    backgroundColor: COLORS.cardDark2,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  kickoffText: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '600',
  },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.text,
  },
  statusLive: {
    borderColor: COLORS.neonPink,
  },
  statusFinished: {
    borderColor: COLORS.muted,
  },
  statusPrematch: {
    borderColor: COLORS.neonGreen,
  },
  teamsBlock: {
    marginTop: 12,
    gap: 8,
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  teamInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  teamLogo: {
    width: 24,
    height: 24,
  },
  logoPlaceholder: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.cardDark2,
    borderWidth: 1,
    borderColor: COLORS.muted,
  },
  teamName: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  scoreText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
  },
  oddsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  oddPill: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  oddYes: {
    borderColor: COLORS.neonGreen,
  },
  oddNo: {
    borderColor: COLORS.telegramBlue,
  },
  oddLabel: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '600',
  },
  oddValue: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '700',
  },
  oddValueYes: {
    color: COLORS.neonGreen,
  },
  oddValueNo: {
    color: COLORS.telegramBlue,
  },
  badgeWrapper: {
    marginTop: 12,
    borderRadius: 12,
    backgroundColor: COLORS.cardDark2,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  badgeBar: {
    width: 3,
  },
  badgeContent: {
    flex: 1,
    padding: 10,
  },
  badgeTitle: {
    fontSize: 12,
    fontWeight: '800',
  },
  badgeDetail: {
    marginTop: 4,
    fontSize: 11,
    color: COLORS.muted,
  },
});
