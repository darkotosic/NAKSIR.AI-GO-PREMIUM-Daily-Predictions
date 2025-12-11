import React, { useEffect } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { ErrorState } from '@components/ErrorState';
import { LoadingState } from '@components/LoadingState';
import { AnalysisPreview } from '@components/AnalysisPreview';
import { useMatchDetailsQuery } from '@hooks/useMatchDetailsQuery';
import { useFavorites } from '@hooks/useFavorites';
import { useRecentlyViewed } from '@hooks/useRecentlyViewed';
import { RootDrawerParamList } from '@navigation/types';
import { trackEvent } from '@lib/tracking';

const MatchDetailsScreen: React.FC = () => {
  const navigation = useNavigation<DrawerNavigationProp<RootDrawerParamList>>();
  const route = useRoute<RouteProp<RootDrawerParamList, 'MatchDetails'>>();
  const fixtureId = route.params?.fixtureId;
  const fallbackSummary = route.params?.summary;
  const { data, isLoading, isError, refetch } = useMatchDetailsQuery(fixtureId);
  const { toggleFavorite, isFavorite } = useFavorites();
  const { addViewed, recentlyViewed } = useRecentlyViewed();

  const summary = data?.summary ?? fallbackSummary;
  const league = summary?.league;
  const teams = summary?.teams;
  const kickoffDate = summary?.kickoff ? new Date(summary.kickoff) : undefined;

  useEffect(() => {
    if (fixtureId && summary?.league) {
      trackEvent('OpenMatch', {
        fixture_id: fixtureId,
        league_id: summary.league?.id,
        league_name: summary.league?.name,
      });
    }
  }, [fixtureId, summary?.league, summary?.league?.id, summary?.league?.name]);

  useEffect(() => {
    if (summary?.fixture_id) {
      addViewed({ ...summary, fixture_id: summary.fixture_id });
    }
  }, [addViewed, summary?.fixture_id]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {!fixtureId && (
        <ErrorState message="Fixture ID is missing." onRetry={() => navigation.navigate('TodayMatches')} />
      )}

      {isLoading && <LoadingState message="Loading match details" />}

      {isError && fixtureId ? (
        <ErrorState message="Unable to load match details" onRetry={refetch} />
      ) : null}

      {summary ? (
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.leagueText}>{league?.name || 'League'}</Text>
              <Text style={styles.metaText}>{league?.country || 'Country'}</Text>
              {kickoffDate ? (
                <Text style={styles.metaText}>{kickoffDate.toLocaleString()}</Text>
              ) : null}
            </View>
            {league?.logo ? <Image source={{ uri: league.logo }} style={styles.logo} /> : null}
          </View>

          <View style={styles.teamsRow}>
            <View style={styles.teamCol}>
              {teams?.home?.logo ? (
                <Image source={{ uri: teams.home.logo }} style={styles.teamLogo} />
              ) : null}
              <Text style={styles.teamName}>{teams?.home?.name || 'Home'}</Text>
            </View>

            <View style={styles.middleCol}>
              <TouchableOpacity
                onPress={() => fixtureId && toggleFavorite(fixtureId)}
                style={styles.favoriteButton}
              >
                <Text style={styles.favoriteText}>{isFavorite(fixtureId) ? '★' : '☆'}</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.teamCol, styles.alignEnd]}>
              {teams?.away?.logo ? (
                <Image source={{ uri: teams.away.logo }} style={styles.teamLogo} />
              ) : null}
              <Text style={styles.teamName}>{teams?.away?.name || 'Away'}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Venue</Text>
            <Text style={styles.infoValue}>{summary.venue?.name || 'TBD'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Referee</Text>
            <Text style={styles.infoValue}>{summary.referee || 'TBD'}</Text>
          </View>

          <AnalysisPreview
            onPress={() =>
              navigation.navigate('AIAnalysis', {
                fixtureId,
                summary,
              })
            }
          />
        </View>
      ) : null}

      {data?.odds?.flat ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Odds snapshot</Text>
          <Text style={styles.oddsLine}>Home: {data.odds.flat.match_winner?.home ?? '-'}</Text>
          <Text style={styles.oddsLine}>Draw: {data.odds.flat.match_winner?.draw ?? '-'}</Text>
          <Text style={styles.oddsLine}>Away: {data.odds.flat.match_winner?.away ?? '-'}</Text>
          <Text style={styles.oddsLine}>BTTS Yes: {data.odds.flat.btts?.yes ?? '-'}</Text>
        </View>
      ) : null}

      {recentlyViewed.length ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Recently viewed</Text>
          {recentlyViewed.map((item) => (
            <TouchableOpacity
              key={item.fixture_id}
              style={styles.recentRow}
              onPress={() =>
                navigation.navigate('MatchDetails', {
                  fixtureId: item.fixture_id,
                  summary: item,
                })
              }
            >
              <Text style={styles.recentName} numberOfLines={1}>
                {item?.teams?.home?.name} vs {item?.teams?.away?.name}
              </Text>
              <Text style={styles.recentMeta}>{item.league?.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#040312',
  },
  card: {
    backgroundColor: '#0b0c1f',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#1f1f3a',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  leagueText: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '800',
  },
  metaText: {
    color: '#cbd5e1',
  },
  logo: {
    width: 52,
    height: 52,
  },
  teamsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  teamCol: {
    flex: 1,
  },
  alignEnd: {
    alignItems: 'flex-end',
  },
  teamLogo: {
    width: 60,
    height: 60,
    marginBottom: 8,
  },
  teamName: {
    color: '#e5e7eb',
    fontSize: 16,
    fontWeight: '700',
  },
  middleCol: {
    paddingHorizontal: 10,
  },
  favoriteButton: {
    backgroundColor: '#111827',
    padding: 10,
    borderRadius: 12,
  },
  favoriteText: {
    color: '#fbbf24',
    fontSize: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  infoLabel: {
    color: '#94a3b8',
  },
  infoValue: {
    color: '#f8fafc',
    fontWeight: '600',
  },
  sectionTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 8,
  },
  oddsLine: {
    color: '#cbd5e1',
    marginBottom: 4,
  },
  recentRow: {
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  recentName: {
    color: '#e5e7eb',
    fontWeight: '700',
  },
  recentMeta: {
    color: '#94a3b8',
  },
});

export default MatchDetailsScreen;
