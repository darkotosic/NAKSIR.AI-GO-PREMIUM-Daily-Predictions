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
  borderSoft: '#1f1f3a',
  accentBlue: '#0ea5e9',
  neonOrange: '#fb923c',
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

const UEFA_KEYWORDS = ['uefa', 'champions league', 'europa', 'conference league', 'super cup'];

const getFlagEmoji = (leagueName?: string, country?: string) => {
  const leagueKey = leagueName?.trim().toLowerCase() ?? '';
  if (UEFA_KEYWORDS.some((keyword) => leagueKey.includes(keyword))) return '🇪🇺';
  if (!country) return '🏳️';
  const countryKey = country.trim().toLowerCase();
  return FLAG_OVERRIDES[countryKey] ?? '🏳️';
};

const formatKickoff = (kickoff?: string) => {
  if (!kickoff) return '--:--';
  const d = new Date(kickoff);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
};

const formatOdd = (value?: number | string) => {
  if (value === null || value === undefined) return '--';
  if (typeof value === 'number') return value.toFixed(2);
  return value;
};

const getTotalOdd = (totals?: Record<string, number | string>) => {
  if (!totals) return undefined;
  const entries = Object.entries(totals);
  const overEntry = entries.find(([key]) => key.toLowerCase().includes('over') && key.includes('2.5'));
  const underEntry = entries.find(([key]) => key.toLowerCase().includes('under') && key.includes('2.5'));
  if (overEntry) return { label: 'O2.5', value: overEntry[1] };
  if (underEntry) return { label: 'U2.5', value: underEntry[1] };
  return undefined;
};

export default function TopMatchesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const query = useTopMatchesQuery();

  const sections: Section[] = useMemo(() => {
    const pages = query.data?.pages ?? [];
    const items = pages.flatMap((p) => p.items ?? []);
    const map = new Map<string, MatchListItem[]>();

    for (const item of items) {
      const leagueName = item.summary?.league?.name ?? 'Unknown League';
      const country = item.summary?.league?.country ?? '';
      const flag = getFlagEmoji(leagueName, country);
      const title =
        flag === '🇪🇺'
          ? `${flag} UEFA: ${leagueName}`
          : country
            ? `${flag} ${country}: ${leagueName}`
            : `${flag} ${leagueName}`;
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
  }, [query.data]);

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
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeaderText}>{section.title}</Text>
          </View>
        )}
        renderItem={({ item }) => {
          const home = item.summary?.teams?.home?.name ?? 'Home';
          const away = item.summary?.teams?.away?.name ?? 'Away';
          const homeLogo = item.summary?.teams?.home?.logo;
          const awayLogo = item.summary?.teams?.away?.logo;
          const time = formatKickoff(item.summary?.kickoff);

          const standingsLeague = item.standings?.[0]?.league;
          const standingGroups = standingsLeague?.standings || [];
          const tableRows = standingGroups.reduce<StandingsRow[]>(
            (acc, group = []) => acc.concat(group),
            [],
          );
          const homeStanding =
            item.standings_snapshot?.home || tableRows.find((row) => row.team?.id === item.summary?.teams?.home?.id);
          const awayStanding =
            item.standings_snapshot?.away || tableRows.find((row) => row.team?.id === item.summary?.teams?.away?.id);

          const homeRank = homeStanding?.rank ? `#${homeStanding.rank}` : '--';
          const awayRank = awayStanding?.rank ? `#${awayStanding.rank}` : '--';
          const homePoints = homeStanding?.points ? `${homeStanding.points} pts` : '-- pts';
          const awayPoints = awayStanding?.points ? `${awayStanding.points} pts` : '-- pts';
          const homeForm = homeStanding?.form ? homeStanding.form.toUpperCase() : '--';
          const awayForm = awayStanding?.form ? awayStanding.form.toUpperCase() : '--';

          const odds = item.odds?.flat?.match_winner;
          const bttsYes = item.odds?.flat?.btts?.yes;
          const totalOdd = getTotalOdd(item.odds?.flat?.totals);

          return (
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() =>
                navigation.navigate('MatchDetails', {
                  fixtureId: item.fixture_id,
                  summary: item.summary,
                })
              }
              style={styles.card}
            >
              <View style={styles.cardRow}>
                <View style={styles.timeBadge}>
                  <Text style={styles.timeText}>{time}</Text>
                </View>

                <View style={styles.teamsColumn}>
                  <View style={styles.teamRow}>
                    {homeLogo ? <Image source={{ uri: homeLogo }} style={styles.teamLogo} /> : null}
                    <View style={styles.teamInfo}>
                      <Text style={styles.teamName} numberOfLines={1}>
                        {home}
                      </Text>
                      <Text style={styles.metaText}>
                        {homeRank} • {homePoints} • {homeForm}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.teamRow}>
                    {awayLogo ? <Image source={{ uri: awayLogo }} style={styles.teamLogo} /> : null}
                    <View style={styles.teamInfo}>
                      <Text style={styles.teamName} numberOfLines={1}>
                        {away}
                      </Text>
                      <Text style={styles.metaText}>
                        {awayRank} • {awayPoints} • {awayForm}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              <View style={styles.valuesRow}>
                <View style={styles.valuePill}>
                  <Text style={styles.valueLabel}>H</Text>
                  <Text style={styles.valueText}>{formatOdd(odds?.home)}</Text>
                </View>
                <View style={styles.valuePill}>
                  <Text style={styles.valueLabel}>D</Text>
                  <Text style={styles.valueText}>{formatOdd(odds?.draw)}</Text>
                </View>
                <View style={styles.valuePill}>
                  <Text style={styles.valueLabel}>A</Text>
                  <Text style={styles.valueText}>{formatOdd(odds?.away)}</Text>
                </View>
                <View style={styles.valuePillAlt}>
                  <Text style={styles.valueLabel}>BTTS</Text>
                  <Text style={styles.valueText}>{formatOdd(bttsYes)}</Text>
                </View>
                {totalOdd ? (
                  <View style={styles.valuePillAlt}>
                    <Text style={styles.valueLabel}>{totalOdd.label}</Text>
                    <Text style={styles.valueText}>{formatOdd(totalOdd.value)}</Text>
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
  sectionHeader: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: COLORS.background,
  },
  sectionHeaderText: {
    color: COLORS.muted,
    fontWeight: '900',
  },
  card: {
    marginHorizontal: 12,
    marginVertical: 6,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    padding: 8,
  },
  cardRow: {
    flexDirection: 'row',
    gap: 10,
  },
  timeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.neonViolet,
    backgroundColor: '#11182c',
  },
  timeText: {
    color: COLORS.text,
    fontWeight: '800',
    fontSize: 12,
  },
  teamsColumn: {
    flex: 1,
    gap: 6,
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  teamLogo: {
    width: 16,
    height: 16,
  },
  teamInfo: {
    flex: 1,
  },
  teamName: {
    color: COLORS.text,
    fontWeight: '800',
    fontSize: 12,
  },
  metaText: {
    color: COLORS.muted,
    fontSize: 10,
  },
  valuesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  valuePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    backgroundColor: '#0f162b',
  },
  valuePillAlt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.accentBlue,
    backgroundColor: '#0f162b',
  },
  valueLabel: {
    color: COLORS.neonOrange,
    fontWeight: '800',
    fontSize: 10,
  },
  valueText: {
    color: COLORS.text,
    fontWeight: '700',
    fontSize: 11,
  },
});
