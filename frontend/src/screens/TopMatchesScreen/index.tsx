import React, { useMemo } from 'react';
import {
  Image,
  RefreshControl,
  SafeAreaView,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { LoadingState } from '@components/LoadingState';
import { ErrorState } from '@components/ErrorState';
import TelegramBanner from '@components/TelegramBanner';

import { useTopMatchesQuery } from '@hooks/useTopMatchesQuery';
import type { MatchListItem, StandingsRow } from '@types/match';
import type { RootStackParamList } from '@navigation/types';

const COLORS = {
  background: '#040312',
  card: '#0b0c1f',
  text: '#f8fafc',
  muted: '#a5b4fc',
  neonViolet: '#8b5cf6',
  neonPurple: '#b06bff',
  borderSoft: '#1f1f3a',
  accentBlue: '#0ea5e9',
};

type Section = { title: string; data: MatchListItem[] };

const FLAG_OVERRIDES: Record<string, string> = {
  world: '🌍',
  europe: '🇪🇺',
  england: '🏴',
  scotland: '🏴',
  wales: '🏴',
  'united states': '🇺🇸',
  usa: '🇺🇸',
  germany: '🇩🇪',
  france: '🇫🇷',
  spain: '🇪🇸',
  italy: '🇮🇹',
  portugal: '🇵🇹',
  brazil: '🇧🇷',
  argentina: '🇦🇷',
  serbia: '🇷🇸',
  croatia: '🇭🇷',
  netherlands: '🇳🇱',
  turkey: '🇹🇷',
  greece: '🇬🇷',
};

const getFlagEmoji = (country?: string, leagueName?: string) => {
  const nameKey = leagueName?.trim().toLowerCase() ?? '';
  if (nameKey.includes('uefa')) return '🇪🇺';
  if (!country) return '🏳️';
  const key = country.trim().toLowerCase();
  return FLAG_OVERRIDES[key] ?? '🏳️';
};

const formatKickoff = (kickoff?: string) => {
  if (!kickoff) return '--:--';
  const d = new Date(kickoff);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
};

const formatOdd = (value?: number | string) => {
  if (typeof value === 'number') return value.toFixed(2);
  if (typeof value === 'string') return value;
  return '--';
};

export default function TopMatchesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const query = useTopMatchesQuery();

  const items: MatchListItem[] = useMemo(() => {
    const pages = query.data?.pages ?? [];
    return pages.flatMap((p) => p.items ?? []);
  }, [query.data]);

  const sections: Section[] = useMemo(() => {
    const map = new Map<string, MatchListItem[]>();

    for (const item of items) {
      const leagueName = item.summary?.league?.name ?? 'Unknown League';
      const country = item.summary?.league?.country ?? '';
      const flag = getFlagEmoji(country, leagueName);
      const title = country ? `${flag} ${country}: ${leagueName}` : `${flag} ${leagueName}`;
      const arr = map.get(title) ?? [];
      arr.push(item);
      map.set(title, arr);
    }

    return Array.from(map.entries())
      .map(([title, data]) => ({
        title,
        data: data.sort((a, b) => (a.summary?.kickoff ?? '').localeCompare(b.summary?.kickoff ?? '')),
      }))
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [items]);

  if (query.isLoading) return <LoadingState message="Loading top matches..." />;
  if (query.isError) return <ErrorState message="Failed to load top matches" />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <SectionList
        sections={sections}
        keyExtractor={(it, idx) => String(it?.fixture_id ?? idx)}
        ListHeaderComponent={() => (
          <View style={{ paddingHorizontal: 14, paddingTop: 10, paddingBottom: 6 }}>
            <TelegramBanner />
            <Text style={{ color: COLORS.text, fontSize: 18, fontWeight: '900' }}>Top Matches</Text>
            <Text style={{ color: COLORS.muted, marginTop: 2 }}>
              Top 5 leagues + UEFA competitions
            </Text>
          </View>
        )}
        renderSectionHeader={({ section }) => (
          <View style={{ paddingHorizontal: 14, paddingVertical: 6, backgroundColor: COLORS.background }}>
            <Text style={{ color: COLORS.muted, fontWeight: '900' }}>{section.title}</Text>
          </View>
        )}
        renderItem={({ item }) => {
          const summary = item.summary;
          const league = summary?.league;
          const teams = summary?.teams;
          const kickoffLabel = formatKickoff(summary?.kickoff);
          const standingsLeague = item?.standings?.[0]?.league;
          const standingGroups = standingsLeague?.standings || [];
          const tableRows = standingGroups.reduce<StandingsRow[]>(
            (acc, group = []) => acc.concat(group),
            [],
          );
          const homeStanding =
            item?.standings_snapshot?.home ??
            tableRows.find((row) => row.team?.id === teams?.home?.id);
          const awayStanding =
            item?.standings_snapshot?.away ??
            tableRows.find((row) => row.team?.id === teams?.away?.id);
          const homeRank = homeStanding?.rank ? `#${homeStanding.rank}` : '--';
          const awayRank = awayStanding?.rank ? `#${awayStanding.rank}` : '--';
          const homeForm = homeStanding?.form ? homeStanding.form.toUpperCase() : '--';
          const awayForm = awayStanding?.form ? awayStanding.form.toUpperCase() : '--';
          const odds = item?.odds?.flat?.match_winner;
          const btts = item?.odds?.flat?.btts;
          const oddsLabel = odds
            ? `1X2 ${formatOdd(odds.home)} • ${formatOdd(odds.draw)} • ${formatOdd(odds.away)}`
            : null;
          const bttsLabel = btts ? `BTTS ${formatOdd(btts.yes)} / ${formatOdd(btts.no)}` : null;

          return (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.9}
              onPress={() =>
                navigation.navigate('MatchDetails', {
                  fixtureId: item.fixture_id,
                  summary: item.summary,
                })
              }
            >
              <View style={styles.cardHeader}>
                <View style={styles.kickoffWrap}>
                  <Text style={styles.kickoffText}>{kickoffLabel}</Text>
                  <Text style={styles.leagueText} numberOfLines={1}>
                    {league?.name ?? 'League'}
                  </Text>
                </View>
                <View style={styles.detailsPill}>
                  <Text style={styles.detailsText}>DETAILS</Text>
                </View>
              </View>

              <View style={styles.teamsRow}>
                <View style={styles.teamBlock}>
                  {teams?.home?.logo ? (
                    <Image source={{ uri: teams.home.logo }} style={styles.teamLogo} />
                  ) : null}
                  <Text style={styles.teamName} numberOfLines={1}>
                    {teams?.home?.name ?? 'Home'}
                  </Text>
                </View>
                <Text style={styles.vsText}>vs</Text>
                <View style={[styles.teamBlock, styles.teamBlockRight]}>
                  {teams?.away?.logo ? (
                    <Image source={{ uri: teams.away.logo }} style={styles.teamLogo} />
                  ) : null}
                  <Text style={[styles.teamName, styles.teamNameRight]} numberOfLines={1}>
                    {teams?.away?.name ?? 'Away'}
                  </Text>
                </View>
              </View>

              <View style={styles.valueRow}>
                <View style={styles.valuePill}>
                  <Text style={styles.valueLabel}>Rank</Text>
                  <Text style={styles.valueText}>
                    {homeRank} - {awayRank}
                  </Text>
                </View>
                <View style={styles.valuePill}>
                  <Text style={styles.valueLabel}>Form</Text>
                  <Text style={styles.valueText}>
                    {homeForm} | {awayForm}
                  </Text>
                </View>
                {oddsLabel ? (
                  <View style={[styles.valuePill, styles.valueWide]}>
                    <Text style={styles.valueLabel}>Market</Text>
                    <Text style={styles.valueText}>{oddsLabel}</Text>
                  </View>
                ) : null}
                {bttsLabel ? (
                  <View style={[styles.valuePill, styles.valueWide]}>
                    <Text style={styles.valueLabel}>BTTS</Text>
                    <Text style={styles.valueText}>{bttsLabel}</Text>
                  </View>
                ) : null}
              </View>
            </TouchableOpacity>
          );
        }}
        onEndReached={() => {
          if (query.hasNextPage && !query.isFetchingNextPage) query.fetchNextPage();
        }}
        onEndReachedThreshold={0.6}
        refreshControl={
          <RefreshControl
            refreshing={query.isRefetching}
            onRefresh={() => query.refetch()}
            tintColor={COLORS.text}
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 12,
    marginVertical: 6,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    padding: 10,
    shadowColor: COLORS.neonPurple,
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  kickoffWrap: {
    flex: 1,
  },
  kickoffText: {
    color: COLORS.text,
    fontWeight: '800',
    fontSize: 12,
  },
  leagueText: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 2,
  },
  detailsPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.neonViolet,
  },
  detailsText: {
    color: COLORS.neonViolet,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  teamsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 8,
  },
  teamBlock: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  teamBlockRight: {
    justifyContent: 'flex-end',
  },
  teamLogo: {
    width: 18,
    height: 18,
  },
  teamName: {
    color: COLORS.text,
    fontWeight: '800',
    fontSize: 12,
    maxWidth: 120,
  },
  teamNameRight: {
    textAlign: 'right',
  },
  vsText: {
    color: COLORS.accentBlue,
    fontWeight: '700',
    fontSize: 11,
    textTransform: 'uppercase',
  },
  valueRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  valuePill: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#11182c',
  },
  valueWide: {
    flexBasis: '100%',
  },
  valueLabel: {
    color: COLORS.muted,
    fontSize: 9,
    fontWeight: '700',
  },
  valueText: {
    color: COLORS.text,
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
});
