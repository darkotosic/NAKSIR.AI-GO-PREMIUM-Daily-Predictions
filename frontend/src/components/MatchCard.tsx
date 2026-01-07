import React, { useRef } from 'react';
import { Animated, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MatchListItem, StandingsRow } from '@/types/match';

const COLORS = {
  background: '#040312',
  card: '#0b0c1f',
  neonPurple: '#b06bff',
  neonViolet: '#8b5cf6',
  neonOrange: '#fb923c',
  text: '#f8fafc',
  muted: '#a5b4fc',
  accentBlue: '#0ea5e9',
  borderSoft: '#1f1f3a',
};

interface Props {
  match: MatchListItem;
  onPress: () => void;
  onToggleFavorite?: () => void;
  isFavorite?: boolean;
}

export const MatchCard: React.FC<Props> = ({ match, onPress, onToggleFavorite, isFavorite }) => {
  const summary = match.summary;
  const league = summary?.league;
  const teams = summary?.teams;
  const kickoffDate = summary?.kickoff ? new Date(summary.kickoff) : undefined;
  const relativeKickoffLabel = (() => {
    if (!kickoffDate) return 'Kickoff TBD';
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const startOfDayAfter = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2);
    if (kickoffDate >= startOfToday && kickoffDate < startOfTomorrow) return 'Today';
    if (kickoffDate >= startOfTomorrow && kickoffDate < startOfDayAfter) return 'Tomorrow';
    return kickoffDate.toLocaleDateString([], { month: 'short', day: '2-digit' });
  })();

  const timeKickoffLabel = kickoffDate
    ? kickoffDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'Kickoff TBD';

  const standingsLeague = match?.standings?.[0]?.league;
  const standingGroups = standingsLeague?.standings || [];
  const tableRows = standingGroups.reduce<StandingsRow[]>((acc, group = []) => acc.concat(group), []);
  const homeStanding = match?.standings_snapshot?.home || tableRows.find((row) => row.team?.id === teams?.home?.id);
  const awayStanding = match?.standings_snapshot?.away || tableRows.find((row) => row.team?.id === teams?.away?.id);

  const formatForm = (value?: string | null) => (value ? value.toUpperCase() : undefined);
  const homeForm = formatForm(homeStanding?.form as string | undefined);
  const awayForm = formatForm(awayStanding?.form as string | undefined);
  const homeRankLabel = homeStanding?.rank ? `#${homeStanding.rank}` : '--';
  const awayRankLabel = awayStanding?.rank ? `#${awayStanding.rank}` : '--';
  const homeFormLabel = homeForm ?? '--';
  const awayFormLabel = awayForm ?? '--';
  const showHomeMeta = homeStanding || homeForm;
  const showAwayMeta = awayStanding || awayForm;

  const scale = useRef(new Animated.Value(1)).current;

  const animateTo = (value: number) => {
    Animated.spring(scale, {
      toValue: value,
      useNativeDriver: true,
      friction: 6,
      tension: 80,
    }).start();
  };

  return (
    <Animated.View style={[styles.card, { transform: [{ scale }] }]}> 
      <TouchableOpacity
        style={styles.cardInner}
        activeOpacity={0.92}
        onPressIn={() => animateTo(0.97)}
        onPressOut={() => animateTo(1)}
        onPress={onPress}
      >
        <View style={styles.headerRow}>
          <View style={styles.leagueBlock}>
            {league?.logo ? <Image source={{ uri: league.logo }} style={styles.logo} /> : null}
            <View>
              <Text style={styles.leagueText}>{league?.name || 'League'}</Text>
              <Text style={styles.metaText} numberOfLines={1}>
                {league?.country || 'Country'} • {relativeKickoffLabel}
              </Text>
            </View>
          </View>

          <View style={styles.kickoffBadge}>
            <Text style={styles.kickoffBadgeText}>{timeKickoffLabel}</Text>
          </View>
        </View>

        <View style={styles.teamsRow}>
          <View style={styles.teamColumn}> 
            {teams?.home?.logo ? (
              <Image source={{ uri: teams.home.logo }} style={styles.teamLogo} />
            ) : null}
            {showHomeMeta ? (
              <View style={styles.formSummaryRow}>
                <Text style={styles.formSummaryText}>{homeFormLabel}</Text>
                <Text style={styles.formSummaryDivider}>•</Text>
                <Text style={styles.rankSummaryText}>{homeRankLabel}</Text>
              </View>
            ) : null}
            <Text style={styles.teamName} numberOfLines={1}>
              {teams?.home?.name || 'Home'}
            </Text>
          </View>

          <View style={styles.vsPill}>
            <Text style={styles.vsText}>VS</Text>
            <Text style={styles.kickoff}>{relativeKickoffLabel}</Text>
          </View>

          <View style={[styles.teamColumn, styles.alignEnd]}>
            {teams?.away?.logo ? (
              <Image source={{ uri: teams.away.logo }} style={styles.teamLogo} />
            ) : null}
            {showAwayMeta ? (
              <View style={[styles.formSummaryRow, styles.formSummaryRowRight]}>
                <Text style={styles.formSummaryText}>{awayFormLabel}</Text>
                <Text style={styles.formSummaryDivider}>•</Text>
                <Text style={styles.rankSummaryText}>{awayRankLabel}</Text>
              </View>
            ) : null}
            <Text style={[styles.teamName, { textAlign: 'right' }]} numberOfLines={1}>
              {teams?.away?.name || 'Away'}
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.fullMatchButton} onPress={onPress} activeOpacity={0.88}>
          <Text style={styles.fullMatchText}>Full Match details →</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0c0f25',
    borderRadius: 22,
    padding: 2,
    borderWidth: 1.6,
    borderColor: COLORS.neonViolet,
    marginBottom: 16,
    shadowColor: COLORS.neonPurple,
    shadowOpacity: 0.75,
    shadowRadius: 22,
  },
  cardInner: {
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 10,
  },
  leagueBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  leagueText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '800',
    flexShrink: 1,
  },
  metaText: {
    color: COLORS.muted,
    marginTop: 2,
    flexShrink: 1,
  },
  logo: {
    width: 36,
    height: 36,
  },
  kickoffBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.neonPurple,
    backgroundColor: '#11182c',
  },
  kickoffBadgeText: {
    color: COLORS.text,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  teamsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  teamColumn: {
    flex: 1,
    alignItems: 'flex-start',
    backgroundColor: '#0f162b',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    shadowColor: COLORS.accentBlue,
    shadowOpacity: 0.35,
    shadowRadius: 12,
  },
  alignEnd: {
    alignItems: 'flex-end',
  },
  teamLogo: {
    width: 56,
    height: 56,
    marginBottom: 8,
  },
  teamName: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '800',
    maxWidth: 120,
  },
  kickoff: {
    color: '#fef3c7',
    fontSize: 12,
    marginTop: 6,
  },
  formSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  formSummaryRowRight: {
    justifyContent: 'flex-end',
  },
  formSummaryText: {
    color: COLORS.text,
    fontWeight: '800',
    letterSpacing: 0.8,
    backgroundColor: '#11182c',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
  },
  formSummaryDivider: {
    color: COLORS.muted,
    fontWeight: '700',
  },
  rankSummaryText: {
    color: COLORS.neonOrange,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  vsPill: {
    backgroundColor: COLORS.neonPurple,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
    shadowColor: COLORS.neonOrange,
    shadowOpacity: 0.7,
    shadowRadius: 14,
    minWidth: 86,
    alignItems: 'center',
  },
  vsText: {
    color: COLORS.text,
    fontWeight: '900',
    fontSize: 16,
    letterSpacing: 1,
  },
  fullMatchButton: {
    marginTop: 14,
    backgroundColor: COLORS.neonPurple,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderWidth: 1.2,
    borderColor: COLORS.accentBlue,
    shadowColor: COLORS.neonPurple,
    shadowOpacity: 0.6,
    shadowRadius: 14,
  },
  fullMatchText: {
    color: COLORS.text,
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  vsTextColor: {
    color: COLORS.neonOrange,
  },
  vsPillText: {
    color: COLORS.text,
  },
});
