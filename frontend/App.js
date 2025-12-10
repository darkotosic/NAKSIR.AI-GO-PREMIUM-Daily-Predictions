import 'react-native-gesture-handler';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
  RefreshControl,
  Animated,
} from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import {
  createDrawerNavigator,
  DrawerContentScrollView,
  DrawerItem,
  DrawerItemList,
} from '@react-navigation/drawer';

const Drawer = createDrawerNavigator();

const COLORS = {
  background: '#040312',
  card: '#0b0c1f',
  neonPurple: '#b06bff',
  neonViolet: '#8b5cf6',
  deepViolet: '#6d28d9',
  neonOrange: '#fb923c',
  text: '#f8fafc',
  muted: '#a5b4fc',
  accentBlue: '#0ea5e9',
  borderSoft: '#1f1f3a',
};

const API_BASE = 'https://naksir-go-premium-api.onrender.com';
const TODAY_URL = `${API_BASE}/matches/today`;
const fullUrl = (fixtureId) => `${API_BASE}/matches/${fixtureId}/full`;
const aiUrl = (fixtureId) => `${API_BASE}/matches/${fixtureId}/ai-analysis`;

// --- Reusable UI blocks ------------------------------------------------------

const TelegramBanner = () => (
  <TouchableOpacity
    style={styles.telegramButton}
    onPress={() => Linking.openURL('https://t.me/naksiranalysis')}
    activeOpacity={0.88}
  >
    <Text style={styles.telegramText}>Join Naksir Analysis on Telegram</Text>
  </TouchableOpacity>
);

const SortBar = ({ sortOption, onSortChange }) => (
  <View style={styles.sortRow}>
    <Text style={styles.filterLabel}>Sort by</Text>
    <View style={styles.sortButtons}>
      {
        [
          { key: 'time', label: 'Kickoff time' },
          { key: 'team', label: 'Team name' },
        ].map((option) => {
          const isActive = sortOption === option.key;
          return (
            <TouchableOpacity
              key={option.key}
              style={[styles.sortChip, isActive && styles.sortChipActive]}
              onPress={() => onSortChange(option.key)}
              activeOpacity={0.85}
            >
              <Text
                style={[styles.sortChipText, isActive && styles.sortChipTextActive]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })
      }
    </View>
  </View>
);

const MatchCard = ({ match, onPress }) => {
  const home = match.teams?.home || {};
  const away = match.teams?.away || {};
  const league = match.league || {};
  const odds = match.odds?.full_time || {};

  const kickoffSource = match.fixture?.date
    ? new Date(match.fixture.date)
    : match.fixture?.timestamp
      ? new Date(match.fixture.timestamp * 1000)
      : null;

  const kickoff = kickoffSource
    ? kickoffSource.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '-';

  const scale = useRef(new Animated.Value(1)).current;
  const numericOdds = [odds.home, odds.draw, odds.away]
    .map((value) => Number(value))
    .filter((value) => !Number.isNaN(value));
  const minOdd = numericOdds.length ? Math.min(...numericOdds) : null;

  const renderLogo = (logo) => {
    if (logo) {
      return (
        <Image source={{ uri: logo }} style={styles.teamLogo} resizeMode="contain" />
      );
    }

    return <View style={[styles.teamLogo, styles.teamLogoPlaceholder]} />;
  };

  const animateTo = (value) => {
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
        activeOpacity={0.9}
        onPress={onPress}
        onPressIn={() => animateTo(0.97)}
        onPressOut={() => animateTo(1)}
      >
        {/* Header */}
        <View style={styles.cardHeaderRow}>
          <View style={styles.leaguePillsRow}>
            <Text style={styles.leaguePill} numberOfLines={1}>
              {league.name || 'League'}
            </Text>
            {!!league.country && (
              <Text style={styles.countryPill} numberOfLines={1}>
                {league.country}
              </Text>
            )}
          </View>
          <Text style={styles.kickoffPill}>{kickoff}</Text>
        </View>

        {/* Teams */}
        <View style={styles.teamsRow}>
          <View style={styles.teamCol}>
            {renderLogo(home.logo)}
            <Text style={styles.teamName} numberOfLines={1}>
              {home.name}
            </Text>
          </View>

          <View style={styles.vsCol}>
            <Text style={styles.vsBadge}>vs</Text>
          </View>

          <View style={styles.teamCol}>
            {renderLogo(away.logo)}
            <Text style={[styles.teamName, { textAlign: 'right' }]} numberOfLines={1}>
              {away.name}
            </Text>
          </View>
        </View>

        {/* Odds row */}
        {odds && (
          <View style={styles.oddsRow}>
            <Text
              style={[
                styles.oddsChip,
                minOdd !== null && Number(odds.home) === minOdd && styles.oddsChipHighlight,
              ]}
            >
              1 {odds.home ?? '-'}
            </Text>
            <Text
              style={[
                styles.oddsChip,
                minOdd !== null && Number(odds.draw) === minOdd && styles.oddsChipHighlight,
              ]}
            >
              X {odds.draw ?? '-'}
            </Text>
            <Text
              style={[
                styles.oddsChip,
                minOdd !== null && Number(odds.away) === minOdd && styles.oddsChipHighlight,
              ]}
            >
              2 {odds.away ?? '-'}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

// --- Screens -----------------------------------------------------------------

const SkeletonCard = () => (
  <View style={styles.skeletonCard}>
    <View style={styles.skeletonHeader} />
    <View style={styles.skeletonRow}>
      <View style={styles.skeletonLogo} />
      <View style={styles.skeletonName} />
      <View style={styles.skeletonVs} />
      <View style={styles.skeletonName} />
      <View style={styles.skeletonLogo} />
    </View>
    <View style={styles.skeletonChipsRow}>
      <View style={styles.skeletonChip} />
      <View style={styles.skeletonChip} />
      <View style={styles.skeletonChip} />
    </View>
  </View>
);

const MatchesScreen = ({ navigation }) => {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sortOption, setSortOption] = useState('time');

  const loadMatches = () => {
    setLoading(true);
    setError('');
    fetch(TODAY_URL)
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : data?.matches || [];
        setMatches(list);
      })
      .catch(() => setError('Unable to load matches.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadMatches();
  }, []);

  const sortedMatches = useMemo(() => {
    const list = [...matches];
    return list.sort((a, b) => {
      if (sortOption === 'team') {
        const nameA = (a.teams?.home?.name || '').toLowerCase();
        const nameB = (b.teams?.home?.name || '').toLowerCase();
        return nameA.localeCompare(nameB);
      }

      const dateA = a.fixture?.date ? new Date(a.fixture.date).getTime() : Infinity;
      const dateB = b.fixture?.date ? new Date(b.fixture.date).getTime() : Infinity;
      return dateA - dateB;
    });
  }, [matches, sortOption]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={loadMatches}
            tintColor={COLORS.neonPurple}
          />
        }
      >
        <TelegramBanner />

        <SortBar sortOption={sortOption} onSortChange={setSortOption} />

        <View style={styles.refreshRow}>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={loadMatches}
            activeOpacity={0.85}
          >
            <Text style={styles.refreshText}>↻ Refresh</Text>
          </TouchableOpacity>
        </View>

        {loading && (
          <View>
            {[0, 1, 2].map((item) => (
              <SkeletonCard key={`skeleton-${item}`} />
            ))}
          </View>
        )}

        {error ? (
          <TouchableOpacity onPress={loadMatches} activeOpacity={0.85}>
            <Text style={styles.errorText}>{error} Tap to retry.</Text>
          </TouchableOpacity>
        ) : null}

        {!loading &&
          !error &&
          sortedMatches.map((match, index) => (
            <MatchCard
              key={match.fixture_id ?? `${match.league?.id || 'match'}-${index}`}
              match={match}
              onPress={() =>
                navigation.navigate('MatchDetails', {
                  fixtureId: match.fixture_id,
                })
              }
            />
          ))}

        {!loading && !error && sortedMatches.length === 0 && (
          <Text style={styles.errorText}>
            Nema mečeva za danas u filteru. Ukloni filter ili pokušaj kasnije.
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const MatchDetailsScreen = ({ route, navigation }) => {
  const { fixtureId } = route.params || {};

  if (!fixtureId) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Text style={styles.warningText}>Fixture ID is missing for this match.</Text>
      </SafeAreaView>
    );
  }

  const [rawDetails, setRawDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const url = fullUrl(fixtureId);

    setLoading(true);
    setError('');

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        setRawDetails(data);
      })
      .catch(() => setError('Unable to load match details.'))
      .finally(() => setLoading(false));
  }, [fixtureId]);

  // --- Map backend → UI model -----------------------------------------------
  const summary = rawDetails?.summary || {};
  const league = summary.league || {};
  const teams = summary.teams || {};
  const fixture = {
    date: summary.kickoff,
    venue: summary.venue,
    referee: summary.referee,
  };

  const leagueStandingsLeague = rawDetails?.standings?.[0]?.league;
  const standingGroups = leagueStandingsLeague?.standings || [];
  const tableRows = standingGroups.reduce(
    (acc, group) => acc.concat(group),
    [],
  );

  const homeStanding = tableRows.find(
    (row) => row.team?.id === teams.home?.id,
  );
  const awayStanding = tableRows.find(
    (row) => row.team?.id === teams.away?.id,
  );

  const flatOdds = rawDetails?.odds?.flat || null;
  const kickoffDate = fixture?.date ? new Date(fixture.date) : null;
  const kickoffTimeLabel = kickoffDate
    ? kickoffDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'Kickoff TBD';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {rawDetails && (
          <View style={styles.detailHero}>
            <View style={styles.heroTopRow}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
                activeOpacity={0.9}
              >
                <Text style={styles.backIcon}>←</Text>
                <Text style={styles.backLabel}>Nazad</Text>
              </TouchableOpacity>

              <View style={styles.heroLeagueBlock}>
                {league.logo && (
                  <Image
                    source={{ uri: league.logo }}
                    style={styles.heroLeagueLogo}
                    resizeMode="contain"
                  />
                )}
                <View>
                  <Text style={styles.heroLeagueText}>{league.name || 'League'}</Text>
                  <Text style={styles.heroMetaText}>
                    {league.country || 'Country'} • {kickoffTimeLabel}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.heroTeamsRow}>
              <View style={styles.heroTeamCard}>
                {teams.home?.logo && (
                  <Image
                    source={{ uri: teams.home.logo }}
                    style={styles.heroTeamLogo}
                    resizeMode="contain"
                  />
                )}
                <Text style={styles.heroTeamName} numberOfLines={1}>
                  {teams.home?.name || 'Home'}
                </Text>
                <Text style={styles.heroTeamMeta} numberOfLines={1}>
                  {homeStanding
                    ? `#${homeStanding.rank} • ${homeStanding.points} pts`
                    : 'Loading form...'}
                </Text>
              </View>

              <View style={styles.heroVsPill}>
                <Text style={styles.heroVsText}>VS</Text>
                <Text style={styles.heroKickoff}>{kickoffTimeLabel}</Text>
              </View>

              <View style={[styles.heroTeamCard, { alignItems: 'flex-end' }]}>
                {teams.away?.logo && (
                  <Image
                    source={{ uri: teams.away.logo }}
                    style={styles.heroTeamLogo}
                    resizeMode="contain"
                  />
                )}
                <Text style={[styles.heroTeamName, { textAlign: 'right' }]} numberOfLines={1}>
                  {teams.away?.name || 'Away'}
                </Text>
                <Text style={[styles.heroTeamMeta, { textAlign: 'right' }]} numberOfLines={1}>
                  {awayStanding
                    ? `#${awayStanding.rank} • ${awayStanding.points} pts`
                    : 'Loading form...'}
                </Text>
              </View>
            </View>
          </View>
        )}

        <TouchableOpacity
          style={styles.analysisButton}
          onPress={() =>
            navigation.navigate('Naksir In-depth Analysis', {
              fixtureId,
            })
          }
          activeOpacity={0.88}
        >
          <Text style={styles.analysisButtonText}>Naksir In-depth Analysis</Text>
        </TouchableOpacity>

        {loading && (
          <ActivityIndicator
            color={COLORS.neonViolet}
            size="large"
            style={styles.loader}
          />
        )}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {rawDetails && (
          <View style={styles.detailCard}>
            {/* League & logos */}
            <View style={styles.leagueHeaderRow}>
              <View style={styles.teamColumn}>
                {teams.home?.logo && (
                  <Image
                    source={{ uri: teams.home.logo }}
                    style={styles.teamLogoLarge}
                  />
                )}
                <Text style={styles.detailTitle}>
                  {teams.home?.name || 'Home team'}
                </Text>
                {homeStanding && (
                  <Text style={styles.formText}>
                    #{homeStanding.rank} • {homeStanding.points} pts •{' '}
                    {homeStanding.form}
                  </Text>
                )}
              </View>

              <View style={styles.vsColumn}>
                {league.logo && (
                  <Image
                    source={{ uri: league.logo }}
                    style={styles.leagueLogo}
                  />
                )}
                <Text style={styles.vsText}>VS</Text>
              </View>

              <View style={styles.teamColumnRight}>
                {teams.away?.logo && (
                  <Image
                    source={{ uri: teams.away.logo }}
                    style={styles.teamLogoLarge}
                  />
                )}
                <Text style={[styles.detailTitle, { textAlign: 'right' }]}>
                  {teams.away?.name || 'Away team'}
                </Text>
                {awayStanding && (
                  <Text style={[styles.formText, { textAlign: 'right' }]}>
                    #{awayStanding.rank} • {awayStanding.points} pts •{' '}
                    {awayStanding.form}
                  </Text>
                )}
              </View>
            </View>

            <Text style={styles.detailSubtitle}>
              {league.name || 'League'} • {league.country || 'Country'}
            </Text>

            {/* Basic info */}
            <View style={styles.sectionRow}>
              <Text style={styles.sectionLabel}>Date</Text>
              <Text style={styles.sectionValue}>
                {fixture?.date ? new Date(fixture.date).toLocaleString() : 'Not available'}
              </Text>
            </View>

            <View style={styles.sectionRow}>
              <Text style={styles.sectionLabel}>Stadium</Text>
              <Text style={styles.sectionValue}>
                {fixture?.venue?.name || 'Not provided'}
              </Text>
            </View>

            <View style={styles.sectionRow}>
              <Text style={styles.sectionLabel}>Referee</Text>
              <Text style={styles.sectionValue}>
                {fixture?.referee || 'Not assigned'}
              </Text>
            </View>

            {/* Rich odds from odds.flat */}
            {flatOdds && (
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionLabel}>Odds snapshot</Text>
                <Text style={styles.sectionValue}>
                  1: {flatOdds.match_winner?.home ?? '-'} | X:{' '}
                  {flatOdds.match_winner?.draw ?? '-'} | 2:{' '}
                  {flatOdds.match_winner?.away ?? '-'}
                </Text>
                <Text style={styles.sectionValue}>
                  1X: {flatOdds.double_chance?.['1X'] ?? '-'} | 12:{' '}
                  {flatOdds.double_chance?.['12'] ?? '-'} | X2:{' '}
                  {flatOdds.double_chance?.['X2'] ?? '-'}
                </Text>
                <Text style={styles.sectionValue}>
                  BTTS Yes: {flatOdds.btts?.yes ?? '-'} | No:{' '}
                  {flatOdds.btts?.no ?? '-'}
                </Text>
                <Text style={styles.sectionValue}>
                  O1.5: {flatOdds.totals?.over_1_5 ?? '-'} | O2.5:{' '}
                  {flatOdds.totals?.over_2_5 ?? '-'} | O3.5:{' '}
                  {flatOdds.totals?.over_3_5 ?? '-'}
                </Text>
                <Text style={styles.sectionValue}>
                  U3.5: {flatOdds.totals?.under_3_5 ?? '-'} | U4.5:{' '}
                  {flatOdds.totals?.under_4_5 ?? '-'}
                </Text>
                <Text style={styles.sectionValue}>
                  HT over 0.5: {flatOdds.ht_over_0_5 ?? '-'} | Home O0.5:{' '}
                  {flatOdds.home_goals_over_0_5 ?? '-'} | Away O0.5:{' '}
                  {flatOdds.away_goals_over_0_5 ?? '-'}
                </Text>
              </View>
            )}
          </View>
        )}

        <TouchableOpacity
          style={styles.analysisButton}
          onPress={() =>
            navigation.navigate('Naksir In-depth Analysis', {
              fixtureId,
            })
          }
          activeOpacity={0.88}
        >
          <Text style={styles.analysisButtonText}>Naksir In-depth Analysis</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const AIAnalysisScreen = ({ route }) => {
  const { fixtureId } = route.params || {};

  if (!fixtureId) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Text style={styles.warningText}>Fixture ID is missing for this match.</Text>
      </SafeAreaView>
    );
  }

  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [oddsProbabilities, setOddsProbabilities] = useState(null);

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60)
      .toString()
      .padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  useEffect(() => {
    let timer;

    if (loading) {
      setElapsedSeconds(0);
      timer = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }

    return () => {
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [loading]);

  useEffect(() => {
    const url = aiUrl(fixtureId);

    setLoading(true);
    setError('');
    setOddsProbabilities(null);

    fetch(url, {
      method: 'POST',
    })
      .then((res) => res.json())
      .then((data) => {
        const core = data.analysis || data;
        setAnalysis(core);
        setOddsProbabilities(data?.odds_probabilities || null);
      })
      .catch(() =>
        setError('AI analysis is temporarily unavailable. Please try again.'),
      )
      .finally(() => setLoading(false));
  }, [fixtureId]);

  const summaryText =
    analysis?.preview ||
    analysis?.summary ||
    'AI has insufficient data for a summary.';

  const keyFactors =
    Array.isArray(analysis?.key_factors) && analysis.key_factors.length > 0
      ? analysis.key_factors
      : null;

  const valueBet = analysis?.value_bet;
  const correctScores =
    Array.isArray(analysis?.correct_scores_top2) &&
    analysis.correct_scores_top2.length > 0
      ? analysis.correct_scores_top2
      : null;
  const cornerProbabilities = analysis?.corners_probabilities;
  const cardProbabilities = analysis?.cards_probabilities;
  const formatPct = (value) =>
    value === null || value === undefined ? '-' : `${value}%`;
  const risks =
    Array.isArray(analysis?.risk_flags) && analysis.risk_flags.length > 0
      ? analysis.risk_flags
      : null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {loading && (
          <View style={styles.loadingState}>
            <ActivityIndicator
              color={COLORS.neonPurple}
              size="large"
              style={styles.loader}
            />
            <Text style={styles.loadingText}>
              Analyzing odds, recent team form, goals trends, and value-bet signals...
            </Text>
            <Text style={styles.timerText}>Time elapsed: {formatTimer(elapsedSeconds)}</Text>
          </View>
        )}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {analysis && (
          <View style={styles.detailCard}>
            <Text style={styles.detailTitle}>Naksir In-depth Analysis</Text>

            <View style={styles.sectionBlock}>
              <Text style={styles.sectionLabel}>Summary</Text>
              <Text style={styles.sectionValue}>{summaryText}</Text>
            </View>

            <View style={styles.sectionBlock}>
              <Text style={styles.sectionLabel}>Key factors</Text>
              <Text style={styles.sectionValue}>
                {keyFactors
                  ? '• ' + keyFactors.join('\n• ')
                  : 'No key factors highlighted.'}
              </Text>
            </View>

            {oddsProbabilities && (
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionLabel}>Implied odds probabilities</Text>
                <Text style={styles.sectionValue}>
                  Match winner: {'\n'}
                  Home: {formatPct(oddsProbabilities.match_winner?.home)} | Draw:{' '}
                  {formatPct(oddsProbabilities.match_winner?.draw)} | Away:{' '}
                  {formatPct(oddsProbabilities.match_winner?.away)}
                </Text>
                <Text style={styles.sectionValue}>
                  Double chance: {'\n'}
                  12: {formatPct(oddsProbabilities.double_chance?.['12'])} | 1X:{' '}
                  {formatPct(oddsProbabilities.double_chance?.['1X'])} | X2:{' '}
                  {formatPct(oddsProbabilities.double_chance?.['X2'])}
                </Text>
                <Text style={styles.sectionValue}>
                  BTTS: Yes: {formatPct(oddsProbabilities.btts?.yes)} | No:{' '}
                  {formatPct(oddsProbabilities.btts?.no)}
                </Text>
                <Text style={styles.sectionValue}>
                  HT over 0.5: {formatPct(oddsProbabilities.ht_over_0_5)}
                </Text>
                <Text style={styles.sectionValue}>
                  Team over 0.5: Home {formatPct(oddsProbabilities.home_goals_over_0_5)} | Away{' '}
                  {formatPct(oddsProbabilities.away_goals_over_0_5)}
                </Text>
                <Text style={styles.sectionValue}>
                  Totals (Over): O1.5 {formatPct(oddsProbabilities.totals?.over_1_5)} |{' '}
                  O2.5 {formatPct(oddsProbabilities.totals?.over_2_5)} | O3.5{' '}
                  {formatPct(oddsProbabilities.totals?.over_3_5)}
                </Text>
                <Text style={styles.sectionValue}>
                  Totals (Under): U3.5 {formatPct(oddsProbabilities.totals?.under_3_5)} |{' '}
                  U4.5 {formatPct(oddsProbabilities.totals?.under_4_5)}
                </Text>
              </View>
            )}

            {valueBet && (
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionLabel}>Value bets</Text>
                <Text style={styles.sectionValue}>
                  Market: {valueBet.market}{'\n'}
                  Selection: {valueBet.selection}{'\n'}
                  Success probability: {formatPct(valueBet.model_probability_pct)}
                </Text>
              </View>
            )}

            {correctScores && (
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionLabel}>Most probable correct scores</Text>
                <Text style={styles.sectionValue}>
                  {correctScores
                    .map(
                      (item, idx) =>
                        `${idx + 1}. ${item.score || 'N/A'} (${formatPct(
                          item.probability_pct,
                        )})`,
                    )
                    .join('\n')}
                </Text>
              </View>
            )}

            {cornerProbabilities && (
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionLabel}>Corners probability</Text>
                <Text style={styles.sectionValue}>
                  Over 8.5: {formatPct(cornerProbabilities.over_8_5_pct)}{'\n'}
                  Over 9.5: {formatPct(cornerProbabilities.over_9_5_pct)}{'\n'}
                  Over 10.5: {formatPct(cornerProbabilities.over_10_5_pct)}
                </Text>
              </View>
            )}

            {cardProbabilities && (
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionLabel}>Yellow cards probability</Text>
                <Text style={styles.sectionValue}>
                  Over 3.5: {formatPct(cardProbabilities.over_3_5_pct)}{'\n'}
                  Over 4.5: {formatPct(cardProbabilities.over_4_5_pct)}{'\n'}
                  Over 5.5: {formatPct(cardProbabilities.over_5_5_pct)}
                </Text>
              </View>
            )}

            <View style={styles.sectionBlock}>
              <Text style={styles.sectionLabel}>Risks</Text>
              <Text style={styles.sectionValue}>
                {risks ? '• ' + risks.join('\n• ') : 'No major risks flagged.'}
              </Text>
            </View>

            {analysis?.disclaimer && (
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionLabel}>Disclaimer</Text>
                <Text style={styles.sectionValue}>{analysis.disclaimer}</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

// --- Root App ----------------------------------------------------------------

const legalLinks = [
  { label: 'Terms of Use', url: 'https://naksirpredictions.top/terms-of-use' },
  {
    label: 'Privacy Policy',
    url: 'https://naksirpredictions.top/privacy-policy',
  },
  {
    label: 'Legal Disclaimer',
    url: 'https://naksirpredictions.top/legal-disclaimer',
  },
  { label: 'Naksir Website', url: 'https://naksirpredictions.top' },
  {
    label: 'Naksir Apps',
    url: 'https://play.google.com/store/apps/dev?id=6165954326742483653',
  },
  { label: 'Telegram', url: 'https://t.me/naksiranalysis' },
];

function CustomDrawerContent(props) {
  return (
    <DrawerContentScrollView {...props} style={styles.drawerContent}>
      <DrawerItemList {...props} />
      <View style={styles.drawerDivider} />
      {legalLinks.map((link) => (
        <DrawerItem
          key={link.label}
          label={link.label}
          labelStyle={styles.drawerLinkText}
          onPress={() => Linking.openURL(link.url)}
        />
      ))}
    </DrawerContentScrollView>
  );
}

export default function App() {
  const navigationTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: COLORS.background,
      card: COLORS.card,
      primary: COLORS.neonPurple,
      text: COLORS.text,
      border: COLORS.borderSoft,
    },
  };

  return (
    <NavigationContainer theme={navigationTheme}>
      <Drawer.Navigator
        initialRouteName="Today's Matches"
        drawerContent={(props) => <CustomDrawerContent {...props} />}
        screenOptions={{
          headerStyle: { backgroundColor: COLORS.card },
          headerTintColor: COLORS.text,
          drawerActiveTintColor: COLORS.neonViolet,
          drawerInactiveTintColor: COLORS.text,
          drawerStyle: { backgroundColor: COLORS.background },
        }}
      >
        <Drawer.Screen
          name="Today's Matches"
          component={MatchesScreen}
          options={{ title: "Today's Matches" }}
        />
        <Drawer.Screen
          name="MatchDetails"
          component={MatchDetailsScreen}
          options={{
            drawerItemStyle: { display: 'none' },
            title: 'Match Details',
          }}
        />
        <Drawer.Screen
          name="Naksir In-depth Analysis"
          component={AIAnalysisScreen}
          options={{
            drawerItemStyle: { display: 'none' },
            title: 'Naksir In-depth Analysis',
          }}
        />
      </Drawer.Navigator>
    </NavigationContainer>
  );
}

// --- Styles ------------------------------------------------------------------

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  telegramButton: {
    backgroundColor: COLORS.neonPurple,
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: COLORS.accentBlue,
    shadowColor: COLORS.accentBlue,
    shadowOpacity: 0.5,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 20,
    elevation: 6,
  },
  telegramText: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
    fontWeight: '700',
  },
  filterLabel: {
    color: COLORS.muted,
    marginBottom: 6,
    fontSize: 12,
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 14,
    borderWidth: 1.4,
    borderColor: COLORS.neonPurple,
    shadowColor: COLORS.neonPurple,
    shadowOpacity: 0.6,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  leaguePillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  leaguePill: {
    fontSize: 11,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#111827',
    color: COLORS.text,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  countryPill: {
    fontSize: 11,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#020617',
    color: COLORS.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  kickoffPill: {
    fontSize: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.neonPurple,
    color: COLORS.text,
  },
  teamsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  teamCol: {
    flex: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  teamLogo: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.neonPurple,
    backgroundColor: '#020617',
  },
  teamLogoPlaceholder: {
    borderColor: COLORS.borderSoft,
  },
  teamName: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  vsCol: {
    flex: 2,
    alignItems: 'center',
  },
  vsBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.neonOrange,
    color: COLORS.neonOrange,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  oddsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  oddsChip: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    paddingVertical: 6,
    marginHorizontal: 2,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    color: COLORS.text,
  },
  oddsChipHighlight: {
    backgroundColor: 'rgba(176, 107, 255, 0.12)',
    fontWeight: '800',
    borderColor: COLORS.neonPurple,
  },
  skeletonCard: {
    backgroundColor: '#0a0f1f',
    borderRadius: 20,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
  },
  skeletonHeader: {
    height: 14,
    width: '45%',
    backgroundColor: COLORS.borderSoft,
    borderRadius: 10,
    marginBottom: 12,
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  skeletonLogo: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.borderSoft,
  },
  skeletonName: {
    flex: 1,
    height: 14,
    marginHorizontal: 8,
    backgroundColor: COLORS.borderSoft,
    borderRadius: 10,
  },
  skeletonVs: {
    width: 36,
    height: 18,
    borderRadius: 10,
    backgroundColor: COLORS.borderSoft,
  },
  skeletonChipsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  skeletonChip: {
    flex: 1,
    height: 26,
    marginHorizontal: 3,
    borderRadius: 999,
    backgroundColor: COLORS.borderSoft,
  },
  loader: {
    marginVertical: 24,
  },
  loadingState: {
    alignItems: 'center',
    marginBottom: 16,
  },
  loadingText: {
    color: COLORS.muted,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 12,
  },
  timerText: {
    color: COLORS.neonPurple,
    fontWeight: '700',
    marginTop: 6,
  },
  errorText: {
    color: COLORS.neonViolet,
    textAlign: 'center',
    marginVertical: 12,
  },
  warningText: {
    color: COLORS.neonViolet,
    textAlign: 'center',
    marginVertical: 12,
  },
  analysisButton: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: COLORS.neonViolet,
    marginBottom: 16,
    shadowColor: COLORS.neonPurple,
    shadowOpacity: 0.75,
    shadowRadius: 18,
    elevation: 7,
  },
  analysisButtonText: {
    color: COLORS.text,
    textAlign: 'center',
    fontWeight: '800',
    letterSpacing: 0.8,
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
  },
  heroLeagueLogo: {
    width: 36,
    height: 36,
  },
  heroLeagueText: {
    color: COLORS.text,
    fontWeight: '800',
    fontSize: 16,
  },
  heroMetaText: {
    color: COLORS.muted,
    fontSize: 12,
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
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionBlock: {
    marginBottom: 12,
  },
  sectionLabel: {
    color: COLORS.neonViolet,
    fontWeight: '700',
    marginBottom: 6,
  },
  sectionValue: {
    color: COLORS.text,
    lineHeight: 20,
  },
  sortRow: {
    marginBottom: 12,
  },
  refreshRow: {
    alignItems: 'flex-end',
    marginBottom: 10,
  },
  drawerContent: {
    backgroundColor: COLORS.background,
  },
  drawerDivider: {
    height: 1,
    backgroundColor: COLORS.borderSoft,
    marginHorizontal: 12,
    marginTop: 8,
    marginBottom: 4,
  },
  drawerLinkText: {
    color: COLORS.text,
    fontWeight: '700',
  },
  refreshButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.neonPurple,
    backgroundColor: '#020617',
  },
  refreshText: {
    color: COLORS.neonPurple,
    fontSize: 12,
    fontWeight: '600',
  },
  sortButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  sortChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    backgroundColor: '#0b1220',
  },
  sortChipActive: {
    borderColor: COLORS.neonPurple,
    backgroundColor: '#1b2132',
  },
  sortChipText: {
    color: COLORS.muted,
    fontWeight: '600',
  },
  sortChipTextActive: {
    color: COLORS.text,
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
});
