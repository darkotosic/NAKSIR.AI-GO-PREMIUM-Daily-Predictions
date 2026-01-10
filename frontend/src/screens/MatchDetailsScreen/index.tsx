import React, { useEffect } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CommonActions, RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { useMatchDetailsQuery } from '@hooks/useMatchDetailsQuery';
import { RootStackParamList } from '@navigation/types';
import { trackEvent } from '@lib/tracking';
import { ErrorState } from '@components/ErrorState';
import NeonAnalysisButton from '@components/NeonAnalysisButton';
import TelegramBanner from '@components/TelegramBanner';

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

const LIVE_STATUSES = new Set(['1H', '2H', 'HT', 'ET', 'P', 'INT', 'LIVE']);

const MatchDetailsScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'MatchDetails'>>();
  const fixtureId = route.params?.fixtureId;
  const fallbackSummary = route.params?.summary;
  const { data, isLoading, isError, refetch } = useMatchDetailsQuery(fixtureId);

  const summary = data?.summary ?? fallbackSummary;
  const originTab = route.params?.originTab ?? 'TodayMatches';
  const statusShort = summary?.status?.toUpperCase() ?? '';
  const isLiveMatch = LIVE_STATUSES.has(statusShort);
  const isFinishedMatch = new Set(['FT', 'AET', 'PEN']).has(statusShort);
  const league = summary?.league;
  const teams = summary?.teams;
  const kickoffDate = summary?.kickoff ? new Date(summary.kickoff) : undefined;
  const kickoffTimeLabel = kickoffDate
    ? kickoffDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'Kickoff TBD';

  useEffect(() => {
    if (fixtureId && summary?.league) {
      trackEvent('OpenMatch', {
        fixture_id: fixtureId,
        league_id: summary.league?.id,
        league_name: summary.league?.name,
      });
    }
  }, [fixtureId, summary?.league, summary?.league?.id, summary?.league?.name]);

  if (!fixtureId) {
    return (
      <ErrorState
        message="Fixture ID is missing."
        onRetry={() => navigation.navigate('TodayMatches')}
      />
    );
  }

  const leagueStandingsLeague = data?.standings?.[0]?.league;
  const standingGroups = Array.isArray(leagueStandingsLeague?.standings)
    ? leagueStandingsLeague.standings
    : [];
  const tableRows = standingGroups.reduce((acc, group) => acc.concat(group), [] as any[]);
  const homeStanding = tableRows.find((row) => row.team?.id === teams?.home?.id);
  const awayStanding = tableRows.find((row) => row.team?.id === teams?.away?.id);
  const flatOdds = data?.odds?.flat || null;
  const h2hBlock = (data as any)?.h2h;
  const h2hMatches = Array.isArray(h2hBlock?.matches)
    ? h2hBlock.matches
    : Array.isArray(h2hBlock)
      ? h2hBlock
      : [];
  const hasStats = Array.isArray(data?.stats) && data.stats.length > 0;
  const hasTeamStats = Boolean(data?.team_stats?.home || data?.team_stats?.away);
  const hasEvents = Array.isArray(data?.events) && data.events.length > 0;
  const hasLineups = Array.isArray(data?.lineups) && data.lineups.length > 0;
  const hasPlayers = Array.isArray(data?.players) && data.players.length > 0;
  const predictionsBlock = data?.predictions as any;
  const hasPredictions = Array.isArray(predictionsBlock)
    ? predictionsBlock.length > 0
    : predictionsBlock && typeof predictionsBlock === 'object'
      ? Object.keys(predictionsBlock).length > 0
      : Boolean(predictionsBlock);
  const injuriesBlock = data?.injuries as any;
  const hasInjuries = Array.isArray(injuriesBlock)
    ? injuriesBlock.length > 0
    : injuriesBlock && typeof injuriesBlock === 'object'
      ? Object.keys(injuriesBlock).length > 0
      : Boolean(injuriesBlock);
  const lastMeeting = h2hMatches[0];
  const lastMeetingGoals = lastMeeting?.goals || {};
  const lastMeetingDate = lastMeeting?.fixture?.date
    ? new Date(lastMeeting.fixture.date).toLocaleDateString()
    : null;

  const openH2H = () =>
    navigation.navigate('H2H', {
      fixtureId,
      summary,
    });

  const openOdds = (selectedMarket?: string) =>
    navigation.navigate('Odds', {
      fixtureId,
      summary,
      selectedMarket,
    });

  const openStats = () => navigation.navigate('Stats', { fixtureId, summary });
  const openTeamStats = () => navigation.navigate('TeamStats', { fixtureId, summary });
  const openEvents = () => navigation.navigate('Events', { fixtureId, summary });
  const openLineups = () => navigation.navigate('Lineups', { fixtureId, summary });
  const openPlayers = () => navigation.navigate('Players', { fixtureId, summary });
  const openPredictions = () => navigation.navigate('Predictions', { fixtureId, summary });
  const openInjuries = () => navigation.navigate('Injuries', { fixtureId, summary });
  const openAnalysis = () =>
    navigation.navigate(isLiveMatch ? 'LiveAIAnalysis' : 'AIAnalysis', {
      fixtureId,
      summary,
      originTab,
      fromMatchDetails: true,
    });

  const statusLabelMap: Record<string, string> = {
    '1H': 'First Half',
    '2H': 'Second Half',
    HT: 'Half Time',
    ET: 'Extra Time',
    P: 'Penalties',
    INT: 'Break',
  };
  const liveStatusLabel = statusLabelMap[statusShort] ?? summary?.status_long ?? 'Live';
  const scoreLabel = `${summary?.goals?.home ?? '-'} - ${summary?.goals?.away ?? '-'}`;
  const heroStatusLabel = isFinishedMatch ? 'Finished' : isLiveMatch ? liveStatusLabel : kickoffTimeLabel;
  const handleBackPress = () => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: originTab }],
      }),
    );
  };

  const deepDiveSections = [
    { key: 'stats', label: 'Match stats', visible: hasStats, onPress: openStats },
    { key: 'team_stats', label: 'Team stats', visible: hasTeamStats, onPress: openTeamStats },
    { key: 'events', label: 'Events', visible: hasEvents, onPress: openEvents },
    { key: 'lineups', label: 'Lineups', visible: hasLineups, onPress: openLineups },
    { key: 'players', label: 'Players', visible: hasPlayers, onPress: openPlayers },
    { key: 'predictions', label: 'Predictions', visible: hasPredictions, onPress: openPredictions },
    { key: 'injuries', label: 'Injuries', visible: hasInjuries, onPress: openInjuries },
  ].filter((section) => section.visible);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TelegramBanner />
      {summary ? (
        <>
          <View style={styles.detailHero}>
            <View style={styles.heroTopRow}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={handleBackPress}
                activeOpacity={0.9}
              >
                <Text style={styles.backIcon}>←</Text>
                <Text style={styles.backLabel}>Home</Text>
              </TouchableOpacity>

              <View style={styles.heroLeagueBlock}>
                {league?.logo ? (
                  <Image source={{ uri: league.logo }} style={styles.heroLeagueLogo} resizeMode="contain" />
                ) : null}
                <View>
                  <Text style={styles.heroLeagueText}>{league?.name || 'League'}</Text>
                  <Text style={styles.heroMetaText}>
                    {league?.country || 'Country'} • {kickoffTimeLabel}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.heroTeamsRow}>
              <View style={styles.heroTeamCard}>
                {teams?.home?.logo ? (
                  <Image source={{ uri: teams.home.logo }} style={styles.heroTeamLogo} resizeMode="contain" />
                ) : null}
                <Text style={styles.heroTeamName} numberOfLines={1}>
                  {teams?.home?.name || 'Home'}
                </Text>
                <Text style={styles.heroTeamMeta} numberOfLines={1}>
                  {homeStanding ? `#${homeStanding.rank} • ${homeStanding.points} pts` : ''}
                </Text>
              </View>

              <View style={styles.heroVsPill}>
                <Text style={styles.heroVsText}>{isLiveMatch || isFinishedMatch ? scoreLabel : 'VS'}</Text>
                <Text style={styles.heroKickoff}>{heroStatusLabel}</Text>
              </View>

              <View style={[styles.heroTeamCard, { alignItems: 'flex-end' }]}>
                {teams?.away?.logo ? (
                  <Image source={{ uri: teams.away.logo }} style={styles.heroTeamLogo} resizeMode="contain" />
                ) : null}
                <Text style={[styles.heroTeamName, { textAlign: 'right' }]} numberOfLines={1}>
                  {teams?.away?.name || 'Away'}
                </Text>
                <Text style={[styles.heroTeamMeta, { textAlign: 'right' }]} numberOfLines={1}>
                  {awayStanding ? `#${awayStanding.rank} • ${awayStanding.points} pts` : ''}
                </Text>
              </View>
            </View>
          </View>

          <NeonAnalysisButton onPress={openAnalysis} />
        </>
      ) : null}

      {isLoading && (
        <ActivityIndicator color={COLORS.neonViolet} size="large" style={styles.loader} />
      )}

      {isError && fixtureId ? (
        <ErrorState message="Unable to load match details" onRetry={refetch} />
      ) : null}

      {summary ? (
        <View style={styles.detailCard}>
          <View style={styles.leagueHeaderRow}>
            <View style={styles.teamColumn}>
              {teams?.home?.logo ? <Image source={{ uri: teams.home.logo }} style={styles.teamLogoLarge} /> : null}
              <Text style={styles.detailTitle}>{teams?.home?.name || 'Home team'}</Text>
              {homeStanding ? (
                <Text style={styles.formText}>
                  #{homeStanding.rank} • {homeStanding.points} pts • {homeStanding.form}
                </Text>
              ) : null}
            </View>

            <View style={styles.vsColumn}>
              {league?.logo ? <Image source={{ uri: league.logo }} style={styles.leagueLogo} /> : null}
              <Text style={styles.vsText}>VS</Text>
            </View>

            <View style={styles.teamColumnRight}>
              {teams?.away?.logo ? <Image source={{ uri: teams.away.logo }} style={styles.teamLogoLarge} /> : null}
              <Text style={[styles.detailTitle, { textAlign: 'right' }]}>{teams?.away?.name || 'Away team'}</Text>
              {awayStanding ? (
                <Text style={[styles.formText, { textAlign: 'right' }]}>#{awayStanding.rank} • {awayStanding.points} pts • {awayStanding.form}</Text>
              ) : null}
            </View>
          </View>

          <Text style={styles.detailSubtitle}>
            {league?.name || 'League'} • {league?.country || 'Country'}
          </Text>

          <View style={styles.sectionRow}>
            <Text style={styles.sectionLabel}>Date</Text>
            <Text style={styles.sectionValue}>
              {kickoffDate ? kickoffDate.toLocaleString() : 'Not available'}
            </Text>
          </View>

          <View style={styles.sectionRow}>
            <Text style={styles.sectionLabel}>Stadium</Text>
            <Text style={styles.sectionValue}>{summary?.venue?.name || 'Not provided'}</Text>
          </View>

          <View style={styles.sectionRow}>
            <Text style={styles.sectionLabel}>Referee</Text>
            <Text style={styles.sectionValue}>{summary?.referee || 'Not assigned'}</Text>
          </View>

          <View style={styles.sectionBlock}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionLabel}>Head-to-head</Text>
              <TouchableOpacity onPress={openH2H} style={styles.linkChip} activeOpacity={0.85}>
                <Text style={styles.linkText}>Open full H2H</Text>
              </TouchableOpacity>
            </View>
            {lastMeeting ? (
              <Text style={styles.sectionValue}>
                Last meeting{lastMeetingDate ? ` (${lastMeetingDate})` : ''}: {teams?.home?.name || 'Home'}{' '}
                {lastMeetingGoals.home ?? '-'} : {lastMeetingGoals.away ?? '-'} {teams?.away?.name || 'Away'}
              </Text>
            ) : (
              <Text style={styles.sectionValue}>No head-to-head results available.</Text>
            )}
            {h2hMatches.length > 0 ? (
              <Text style={styles.sectionMeta}>Showing last {h2hMatches.length} meetings.</Text>
            ) : null}
          </View>

          {deepDiveSections.length ? (
            <View style={styles.sectionBlock}>
              <View style={[styles.sectionHeaderRow, { marginBottom: 4 }]}>
                <Text style={styles.sectionLabel}></Text>
                <Text style={styles.sectionMeta}></Text>
              </View>
              <View style={styles.sectionChipRow}>
                {deepDiveSections.map((section) => (
                  <TouchableOpacity
                    key={section.key}
                    style={styles.sectionChip}
                    onPress={section.onPress}
                    activeOpacity={0.88}
                  >
                    <Text style={styles.sectionChipText}>{section.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : null}

          {flatOdds ? (
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionLabel}>Odds snapshot</Text>
                <View style={styles.oddsGrid}>
                  <View style={styles.oddsTile}>
                    <Text style={styles.oddsTileLabel}>Match Winner</Text>
                    <View style={styles.oddsChipRow}>
                      <TouchableOpacity
                        style={styles.oddsChip}
                        onPress={() => openOdds('Match Winner - Home')}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.oddsChipText}>Home: {flatOdds.match_winner?.home ?? '-'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.oddsChip}
                        onPress={() => openOdds('Match Winner - Draw')}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.oddsChipText}>Draw: {flatOdds.match_winner?.draw ?? '-'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.oddsChip}
                        onPress={() => openOdds('Match Winner - Away')}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.oddsChipText}>Away: {flatOdds.match_winner?.away ?? '-'}</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.oddsMeta}>Match Winner odds</Text>
                  </View>

                  <View style={styles.oddsTile}>
                    <Text style={styles.oddsTileLabel}>Double Chance</Text>
                    <View style={styles.oddsChipRow}>
                      <TouchableOpacity
                        style={styles.oddsChip}
                        onPress={() => openOdds('Double Chance - 1X')}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.oddsChipText}>1X: {flatOdds.double_chance?.['1X'] ?? '-'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.oddsChip}
                        onPress={() => openOdds('Double Chance - 12')}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.oddsChipText}>12: {flatOdds.double_chance?.['12'] ?? '-'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.oddsChip}
                        onPress={() => openOdds('Double Chance - X2')}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.oddsChipText}>X2: {flatOdds.double_chance?.['X2'] ?? '-'}</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.oddsMeta}>Double chance odds</Text>
                  </View>

                  <View style={styles.oddsTile}>
                    <Text style={styles.oddsTileLabel}>BTTS & Goals</Text>
                    <View style={styles.oddsChipRow}>
                      <TouchableOpacity
                        style={styles.oddsChip}
                        onPress={() => openOdds('BTTS YES/NO')}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.oddsChipText}>BTTS YES: {flatOdds.btts?.yes ?? '-'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.oddsChip}
                        onPress={() => openOdds('BTTS YES/NO')}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.oddsChipText}>BTTS NO: {flatOdds.btts?.no ?? '-'}</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.oddsChipRow}>
                      <TouchableOpacity
                        style={styles.oddsChip}
                        onPress={() => openOdds('Totals - Overs')}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.oddsChipText}>Over 1.5: {flatOdds.totals?.over_1_5 ?? '-'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.oddsChip}
                        onPress={() => openOdds('Totals - Overs')}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.oddsChipText}>Over 2.5: {flatOdds.totals?.over_2_5 ?? '-'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.oddsChip}
                        onPress={() => openOdds('Totals - Overs')}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.oddsChipText}>Over 3.5: {flatOdds.totals?.over_3_5 ?? '-'}</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.oddsChipRow}>
                      <TouchableOpacity
                        style={styles.oddsChip}
                        onPress={() => openOdds('Totals - Unders')}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.oddsChipText}>Under 3.5: {flatOdds.totals?.under_3_5 ?? '-'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.oddsChip}
                        onPress={() => openOdds('Totals - Unders')}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.oddsChipText}>Under 4.5: {flatOdds.totals?.under_4_5 ?? '-'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.oddsChip}
                        onPress={() => openOdds('Half Time Totals')}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.oddsChipText}>HT Over 0.5: {flatOdds.ht_over_0_5 ?? '-'}</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.oddsMeta}>BTTS & Over/Under odds</Text>
                  </View>

                  <View style={styles.oddsTile}>
                    <Text style={styles.oddsTileLabel}>Team Over 0.5</Text>
                    <View style={styles.oddsChipRow}>
                      <TouchableOpacity
                        style={styles.oddsChip}
                        onPress={() => openOdds('Team Goals - Home')}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.oddsChipText}>Home: {flatOdds.home_goals_over_0_5 ?? '-'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.oddsChip}
                        onPress={() => openOdds('Team Goals - Away')}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.oddsChipText}>Away: {flatOdds.away_goals_over_0_5 ?? '-'}</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.oddsMeta}>Home/Away Goals Over 0.5 odds</Text>
                  </View>
              </View>
            </View>
          ) : null}
        </View>
      ) : null}

      <NeonAnalysisButton
        onPress={openAnalysis}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: COLORS.background,
    paddingBottom: 32,
  },
  loader: {
    marginVertical: 24,
  },
  detailHero: {
    backgroundColor: '#0c0f25',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1.6,
    borderColor: COLORS.neonViolet,
    marginBottom: 16,
    shadowColor: COLORS.neonPurple,
    shadowOpacity: 0.75,
    shadowRadius: 22,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 10,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0b1220',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.neonPurple,
    shadowColor: COLORS.accentBlue,
    shadowOpacity: 0.6,
    shadowRadius: 12,
  },
  backIcon: {
    color: COLORS.text,
    fontSize: 16,
    marginRight: 6,
  },
  backLabel: {
    color: COLORS.text,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  heroLeagueBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  heroLeagueLogo: {
    width: 36,
    height: 36,
  },
  heroLeagueText: {
    color: COLORS.text,
    fontWeight: '800',
    fontSize: 16,
    flexShrink: 1,
    flexWrap: 'wrap',
    lineHeight: 20,
  },
  heroMetaText: {
    color: COLORS.muted,
    fontSize: 12,
    flexShrink: 1,
    flexWrap: 'wrap',
  },
  heroTeamsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  heroTeamCard: {
    flex: 1,
    backgroundColor: '#0f162b',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    shadowColor: COLORS.accentBlue,
    shadowOpacity: 0.35,
    shadowRadius: 12,
  },
  heroTeamLogo: {
    width: 56,
    height: 56,
    marginBottom: 8,
  },
  heroTeamName: {
    color: COLORS.text,
    fontWeight: '800',
    fontSize: 15,
  },
  heroTeamMeta: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 2,
  },
  heroVsPill: {
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
  heroVsText: {
    color: COLORS.text,
    fontWeight: '900',
    fontSize: 16,
    letterSpacing: 1,
  },
  heroKickoff: {
    color: '#fef3c7',
    fontSize: 12,
    marginTop: 6,
  },
  detailCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1.5,
    borderColor: COLORS.neonPurple,
    marginBottom: 18,
    shadowColor: COLORS.neonPurple,
    shadowOpacity: 0.7,
    shadowRadius: 20,
  },
  detailTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  detailSubtitle: {
    color: COLORS.muted,
    marginBottom: 12,
  },
  leagueHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  teamColumn: {
    flex: 3,
    alignItems: 'flex-start',
  },
  teamColumnRight: {
    flex: 3,
    alignItems: 'flex-end',
  },
  vsColumn: {
    flex: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vsText: {
    color: COLORS.neonViolet,
    fontSize: 16,
    fontWeight: '800',
    marginTop: 4,
  },
  teamLogoLarge: {
    width: 42,
    height: 42,
    marginBottom: 6,
    borderRadius: 21,
    backgroundColor: '#020617',
  },
  leagueLogo: {
    width: 32,
    height: 32,
    marginBottom: 4,
  },
  formText: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 2,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionBlock: {
    marginBottom: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionLabel: {
    color: COLORS.neonViolet,
    fontWeight: '700',
    marginBottom: 6,
  },
  linkChip: {
    backgroundColor: '#0b1220',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.neonPurple,
  },
  sectionMeta: {
    color: COLORS.muted,
    fontSize: 12,
  },
  sectionValue: {
    color: COLORS.text,
    lineHeight: 20,
  },
  linkText: {
    color: COLORS.neonViolet,
    fontWeight: '800',
  },
  sectionChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    rowGap: 10,
  },
  sectionChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#0f162b',
    borderWidth: 1,
    borderColor: COLORS.neonPurple,
  },
  sectionChipText: {
    color: COLORS.text,
    fontWeight: '800',
  },
  oddsGrid: {
    gap: 10,
    rowGap: 10,
  },
  oddsTile: {
    backgroundColor: '#0c1025',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    shadowColor: COLORS.neonPurple,
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 5,
  },
  oddsTileLabel: {
    color: COLORS.text,
    fontWeight: '800',
    marginBottom: 8,
    letterSpacing: 0.6,
  },
  oddsChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    columnGap: 8,
    rowGap: 6,
    marginBottom: 6,
  },
  oddsChip: {
    flexGrow: 1,
    flexBasis: '30%',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#192248',
    borderWidth: 1,
    borderColor: COLORS.neonPurple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  oddsChipText: {
    color: COLORS.text,
    fontWeight: '800',
    textAlign: 'center',
  },
  oddsMeta: {
    color: COLORS.muted,
    marginTop: 2,
    fontSize: 12,
    letterSpacing: 0.4,
  },
});

export default MatchDetailsScreen;
