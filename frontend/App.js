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

const NeonAnalysisButton = ({ onPress }) => {
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: false,
        }),
        Animated.timing(glow, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: false,
        }),
      ]),
    );

    loop.start();

    return () => loop.stop();
  }, [glow]);

  const scale = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.03],
  });

  const shadowRadius = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [18, 28],
  });

  const glowOpacity = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 0.85],
  });

  return (
    <Animated.View
      style={[
        styles.analysisGlowWrap,
        {
          transform: [{ scale }],
          shadowRadius,
          shadowOpacity: glowOpacity,
        },
      ]}
    >
      <Animated.View
        pointerEvents="none"
        style={[styles.analysisGlowHalo, { opacity: glowOpacity }]}
      />

      <TouchableOpacity
        style={styles.analysisButton}
        onPress={onPress}
        activeOpacity={0.9}
      >
        <Text style={styles.analysisButtonText}>Naksir In-depth Analysis</Text>
        <Text style={styles.analysisButtonSub}>AI insights</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

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
  const summary = match?.summary || {};
  const league = summary.league || {};
  const teams = summary.teams || {};
  const standingsLeague = match?.standings?.[0]?.league;
  const standingGroups = standingsLeague?.standings || [];
  const tableRows = standingGroups.reduce((acc, group) => acc.concat(group), []);

  const homeStanding = tableRows.find((row) => row.team?.id === teams.home?.id);
  const awayStanding = tableRows.find((row) => row.team?.id === teams.away?.id);

  const kickoffDate = summary.kickoff ? new Date(summary.kickoff) : null;
  const kickoffTimeLabel = kickoffDate
    ? kickoffDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'Kickoff TBD';

  const scale = useRef(new Animated.Value(1)).current;

  const animateTo = (value) => {
    Animated.spring(scale, {
      toValue: value,
      useNativeDriver: true,
      friction: 6,
      tension: 80,
    }).start();
  };

  return (
    <Animated.View style={[styles.detailHero, styles.todayCard, { transform: [{ scale }] }]}>
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={onPress}
        onPressIn={() => animateTo(0.97)}
        onPressOut={() => animateTo(1)}
      >
        <View style={styles.heroTopRow}>
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
              <Text style={styles.heroMetaText} numberOfLines={1}>
                {league.country || 'Country'} • {kickoffTimeLabel}
              </Text>
            </View>
          </View>

          <View style={styles.kickoffBadge}>
            <Text style={styles.kickoffBadgeText}>{kickoffTimeLabel}</Text>
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

        <TouchableOpacity style={styles.fullMatchButton} onPress={onPress} activeOpacity={0.88}>
          <Text style={styles.fullMatchButtonText}>Full Match details --&gt;</Text>
        </TouchableOpacity>
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

  const loadMatches = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(TODAY_URL);
      const data = await response.json();
      const list = Array.isArray(data) ? data : data?.matches || [];

      setMatches(list.filter((item) => item?.summary));

      if (!list.length) {
        setError('No detailed matches available right now.');
      }
    } catch (err) {
      setError('Unable to load matches.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMatches();
  }, []);

  const sortedMatches = useMemo(() => {
    const list = [...matches];
    return list.sort((a, b) => {
      if (sortOption === 'team') {
        const nameA = (a?.summary?.teams?.home?.name || '').toLowerCase();
        const nameB = (b?.summary?.teams?.home?.name || '').toLowerCase();
        return nameA.localeCompare(nameB);
      }

      const dateA = a?.summary?.kickoff ? new Date(a.summary.kickoff).getTime() : Infinity;
      const dateB = b?.summary?.kickoff ? new Date(b.summary.kickoff).getTime() : Infinity;
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
              key={match.fixture_id ?? `${match.summary?.league?.id || 'match'}-${index}`}
              match={match}
              onPress={() =>
                navigation.navigate('MatchDetails', {
                  fixtureId: match.fixture_id || match.summary?.fixture_id,
                })
              }
            />
          ))}

        {!loading && !error && sortedMatches.length === 0 && (
          <Text style={styles.errorText}>
            No matches available for today. Try refreshing or come back later.
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
                <Text style={styles.backLabel}>Back</Text>
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

        <NeonAnalysisButton
          onPress={() =>
            navigation.navigate('Naksir In-depth Analysis', {
              fixtureId,
            })
          }
        />

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
                <View style={styles.oddsGrid}>
                  <View style={styles.oddsTile}>
                    <Text style={styles.oddsTileLabel}>Match Winner</Text>
                    <View style={styles.oddsChipRow}>
                      <Text style={styles.oddsChip}>Home: {flatOdds.match_winner?.home ?? '-'}</Text>
                      <Text style={styles.oddsChip}>Draw: {flatOdds.match_winner?.draw ?? '-'}</Text>
                      <Text style={styles.oddsChip}>Away: {flatOdds.match_winner?.away ?? '-'}</Text>
                    </View>
                    <Text style={styles.oddsMeta}>Match Winner odds</Text>
                  </View>

                  <View style={styles.oddsTile}>
                    <Text style={styles.oddsTileLabel}>Double Chance</Text>
                    <View style={styles.oddsChipRow}>
                      <Text style={styles.oddsChipAlt}>1X: {flatOdds.double_chance?.['1X'] ?? '-'}</Text>
                      <Text style={styles.oddsChipAlt}>12: {flatOdds.double_chance?.['12'] ?? '-'}</Text>
                      <Text style={styles.oddsChipAlt}>X2: {flatOdds.double_chance?.['X2'] ?? '-'}</Text>
                    </View>
                    <Text style={styles.oddsMeta}>Double chance odds</Text>
                  </View>

                  <View style={styles.oddsTile}>
                    <Text style={styles.oddsTileLabel}>BTTS & Goals</Text>
                    <View style={styles.oddsChipRow}>
                      <Text style={styles.oddsChip}>BTTS YES: {flatOdds.btts?.yes ?? '-'}</Text>
                      <Text style={styles.oddsChip}>BTTS NO: {flatOdds.btts?.no ?? '-'}</Text>
                    </View>
                    <View style={styles.oddsChipRow}>
                      <Text style={styles.oddsChipAlt}>Over 1.5: {flatOdds.totals?.over_1_5 ?? '-'}</Text>
                      <Text style={styles.oddsChipAlt}>Over 2.5: {flatOdds.totals?.over_2_5 ?? '-'}</Text>
                      <Text style={styles.oddsChipAlt}>Over 3.5: {flatOdds.totals?.over_3_5 ?? '-'}</Text>
                    </View>
                    <View style={styles.oddsChipRow}>
                      <Text style={styles.oddsChipAlt}>Under 3.5: {flatOdds.totals?.under_3_5 ?? '-'}</Text>
                      <Text style={styles.oddsChipAlt}>Under 4.5: {flatOdds.totals?.under_4_5 ?? '-'}</Text>
                      <Text style={styles.oddsChipAlt}>HT Over 0.5: {flatOdds.ht_over_0_5 ?? '-'}</Text>
                    </View>
                    <Text style={styles.oddsMeta}>BTTS & Over/Under odds</Text>
                  </View>

                  <View style={styles.oddsTile}>
                    <Text style={styles.oddsTileLabel}>Team Over 0.5</Text>
                    <View style={styles.oddsChipRow}>
                      <Text style={styles.oddsChip}>Home: {flatOdds.home_goals_over_0_5 ?? '-'}</Text>
                      <Text style={styles.oddsChip}>Away: {flatOdds.away_goals_over_0_5 ?? '-'}</Text>
                    </View>
                    <Text style={styles.oddsMeta}>Home/Away Goals Over 0.5 odds</Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        )}

        <NeonAnalysisButton
          onPress={() =>
            navigation.navigate('Naksir In-depth Analysis', {
              fixtureId,
            })
          }
        />
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
  const depthWords = useMemo(
    () => 'NAKSIR GO IN DEPTH OF DATA'.split(' '),
    [],
  );
  const depthWordAnim = useMemo(
    () => depthWords.map(() => new Animated.Value(0)),
    [depthWords],
  );
  const loadingBar = useRef(new Animated.Value(0)).current;

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
    if (!loading) {
      depthWordAnim.forEach((anim) => anim.setValue(0));
      loadingBar.setValue(0);
      return undefined;
    }

    const wordLoops = depthWordAnim.map((anim, idx) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 1,
            duration: 900,
            delay: idx * 120,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0.2,
            duration: 600,
            useNativeDriver: true,
          }),
        ]),
      ),
    );

    wordLoops.forEach((loop) => loop.start());

    const barLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(loadingBar, {
          toValue: 1,
          duration: 1600,
          useNativeDriver: false,
        }),
        Animated.timing(loadingBar, {
          toValue: 0,
          duration: 400,
          useNativeDriver: false,
        }),
      ]),
    );

    barLoop.start();

    return () => {
      wordLoops.forEach((loop) => loop.stop && loop.stop());
      barLoop.stop && barLoop.stop();
    };
  }, [loading, depthWordAnim, loadingBar]);

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
            <View style={styles.depthWordRow}>
              {depthWords.map((word, idx) => {
                const animatedStyle = {
                  opacity: depthWordAnim[idx].interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.35, 1],
                  }),
                  transform: [
                    {
                      translateY: depthWordAnim[idx].interpolate({
                        inputRange: [0, 1],
                        outputRange: [10, -6],
                      }),
                    },
                    {
                      scale: depthWordAnim[idx].interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.94, 1.08],
                      }),
                    },
                  ],
                };

                return (
                  <Animated.Text
                    key={`${word}-${idx}`}
                    style={[styles.depthWord, animatedStyle]}
                  >
                    {word}
                  </Animated.Text>
                );
              })}
            </View>
            <ActivityIndicator
              color={COLORS.neonPurple}
              size="large"
              style={styles.loader}
            />
            <Text style={styles.loadingText}>
              Analyzing odds, recent team form, goals trends, and value-bet signals...
            </Text>
            <View style={styles.loadingBarTrack}>
              <Animated.View
                style={[
                  styles.loadingBarFill,
                  {
                    width: loadingBar.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['18%', '100%'],
                    }),
                  },
                ]}
              />
            </View>
            <View style={styles.timerPill}>
              <Text style={styles.timerLabel}>Time elapsed</Text>
              <Text style={styles.timerValue}>{formatTimer(elapsedSeconds)}</Text>
            </View>
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
    backgroundColor: '#ffffffff',
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
  depthWordRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    rowGap: 8,
    columnGap: 8,
  },
  depthWord: {
    color: COLORS.neonPurple,
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(176,107,255,0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  loadingText: {
    color: COLORS.muted,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 12,
  },
  loadingBarTrack: {
    marginTop: 12,
    width: '100%',
    height: 10,
    borderRadius: 999,
    backgroundColor: '#0b1024',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
  },
  loadingBarFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: COLORS.neonPurple,
    shadowColor: COLORS.neonPurple,
    shadowOpacity: 0.9,
    shadowRadius: 12,
  },
  timerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0c1028',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 12,
    borderWidth: 1,
    borderColor: COLORS.neonPurple,
  },
  timerLabel: {
    color: COLORS.muted,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  timerValue: {
    color: COLORS.neonPurple,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
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
  analysisGlowWrap: {
    position: 'relative',
    marginBottom: 16,
    shadowColor: COLORS.neonPurple,
    shadowOffset: { width: 0, height: 14 },
  },
  analysisGlowHalo: {
    position: 'absolute',
    top: -6,
    left: -6,
    right: -6,
    bottom: -6,
    borderRadius: 26,
    backgroundColor: '#fc22dfb0',
    shadowColor: COLORS.neonPurple,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 32,
    elevation: 24,
  },
  analysisButton: {
    backgroundColor: '#120a2f',
    borderRadius: 22,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderWidth: 2,
    borderColor: '#fc22dfb0',
    shadowColor: COLORS.neonPurple,
    shadowOpacity: 0.95,
    shadowRadius: 22,
    elevation: 10,
  },
  analysisButtonText: {
    color: '#f5f3ff',
    textAlign: 'center',
    fontWeight: '900',
    letterSpacing: 1.2,
    fontSize: 16,
  },
  analysisButtonSub: {
    color: COLORS.muted,
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 12,
    marginTop: 4,
    letterSpacing: 0.6,
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
  todayCard: {
    overflow: 'hidden',
    position: 'relative',
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 10,
  },
  kickoffBadge: {
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
  fullMatchButtonText: {
    color: COLORS.text,
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  heroOddsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    gap: 8,
  },
  heroOddsChip: {
    flex: 1,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '800',
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    backgroundColor: '#0f172a',
    color: COLORS.text,
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
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#141a3c',
    color: COLORS.text,
    fontWeight: '800',
    textAlign: 'center',
    borderWidth: 1,
    borderColor: COLORS.neonPurple,
  },
  oddsChipAlt: {
    flexGrow: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#0e162f',
    color: COLORS.text,
    fontWeight: '800',
    textAlign: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
  },
  oddsMeta: {
    color: COLORS.muted,
    marginTop: 2,
    fontSize: 12,
    letterSpacing: 0.4,
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
