import 'react-native-gesture-handler';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
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

const extractTeamStandings = (details) => {
  const rows = details?.standings?.[0]?.league?.standings?.[0] || [];
  const homeId = details?.teams?.home?.id;
  const awayId = details?.teams?.away?.id;
  return rows.filter((r) => r.team?.id === homeId || r.team?.id === awayId);
};

const mapOddsSections = (details) => {
  const flat = details?.odds?.flat || {};
  return [
    {
      title: 'Match winner',
      items: [
        { label: 'Home win', value: flat.match_winner?.home },
        { label: 'Draw', value: flat.match_winner?.draw },
        { label: 'Away win', value: flat.match_winner?.away },
      ],
    },
    {
      title: 'Double chance',
      items: [
        { label: '1X (Home or Draw)', value: flat.double_chance?.['1X'] },
        { label: '12 (Home or Away)', value: flat.double_chance?.['12'] },
        { label: 'X2 (Draw or Away)', value: flat.double_chance?.['X2'] },
      ],
    },
    {
      title: 'Goals over/under',
      items: [
        { label: 'Over 1.5 goals', value: flat.over_under?.O15 },
        { label: 'Over 2.5 goals', value: flat.over_under?.O25 },
        { label: 'Under 3.5 goals', value: flat.over_under?.U35 },
      ],
    },
    {
      title: 'Both teams to score',
      items: [
        { label: 'BTTS – Yes', value: flat.btts?.yes },
        { label: 'BTTS – No', value: flat.btts?.no },
      ],
    },
  ];
};

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

  const loadDetails = useCallback(() => {
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

  useEffect(() => {
    loadDetails();
  }, [loadDetails]);

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
  const oddsSnapshot =
    rawDetails?.odds?.match_winner || rawDetails?.odds?.full_time || null;

  const miniStandings = useMemo(
    () => extractTeamStandings(rawDetails),
    [rawDetails],
  );

  const oddsSections = useMemo(() => mapOddsSections(rawDetails), [rawDetails]);

  const formatShortName = (name) => {
    if (!name) return '—';
    const parts = name.split(' ');
    const initials = parts
      .slice(0, 2)
      .map((p) => p[0])
      .join('')
      .toUpperCase();
    return initials || name.slice(0, 2).toUpperCase();
  };

  const formatKickoff = () => {
    if (!fixture?.date) return '—';
    const dateObj = new Date(fixture.date);
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const time = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `${day}.${month} • ${time}`;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.85}
          >
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {league.name || 'Match Details'}
          </Text>
        </View>

        {loading && (
          <View style={styles.loadingState}>
            <ActivityIndicator
              color={COLORS.neonViolet}
              size="large"
              style={styles.loader}
            />
            <Text style={styles.loadingText}>Loading match details…</Text>
          </View>
        )}

        {error ? (
          <View style={styles.sectionBlock}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={loadDetails}
              activeOpacity={0.85}
            >
              <Text style={styles.retryText}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {rawDetails && (
          <View style={styles.detailCard}>
            <View style={styles.heroRow}>
              <View style={styles.teamColumn}>
                <View style={styles.teamLogoCircle}>
                  <Text style={styles.teamShortName}>
                    {formatShortName(teams.home?.name)}
                  </Text>
                </View>
                <Text style={styles.detailTitle} numberOfLines={2}>
                  {teams.home?.name || 'Home team'}
                </Text>
                <Text style={styles.teamMetaText} numberOfLines={2}>
                  {homeStanding
                    ? `#${homeStanding.rank} • ${homeStanding.points} pts • ${homeStanding.form}`
                    : 'Standings data unavailable'}
                </Text>
              </View>

              <View style={styles.vsColumn}>
                <View style={styles.vsBadge}> 
                  <Text style={styles.vsText}>VS</Text>
                </View>
              </View>

              <View style={styles.teamColumnRight}>
                <View style={styles.teamLogoCircle}>
                  <Text style={styles.teamShortName}>
                    {formatShortName(teams.away?.name)}
                  </Text>
                </View>
                <Text style={[styles.detailTitle, { textAlign: 'right' }]} numberOfLines={2}>
                  {teams.away?.name || 'Away team'}
                </Text>
                <Text style={[styles.teamMetaText, { textAlign: 'right' }]} numberOfLines={2}>
                  {awayStanding
                    ? `#${awayStanding.rank} • ${awayStanding.points} pts • ${awayStanding.form}`
                    : 'Standings data unavailable'}
                </Text>
              </View>
            </View>

            <View style={styles.statusRow}>
              <View style={styles.statusPill}>
                <Text style={[styles.sectionLabel, styles.statusText]}>
                  {summary.status_long ||
                    summary?.fixture?.status?.long ||
                    rawDetails?.fixture?.status?.long ||
                    'Not Started'}
                </Text>
              </View>
              <View style={styles.kickoffPill}>
                <Text style={[styles.sectionLabel, styles.statusText]}>
                  {formatKickoff()}
                </Text>
              </View>
            </View>

            <Text style={styles.detailSubtitle}>
              {league.name || 'League'} • {league.country || 'Country'}
            </Text>

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

            {miniStandings && miniStandings.length > 0 && (
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionLabel}>
                  Champions League standings snapshot
                </Text>
                <View style={styles.miniTableHeader}>
                  <Text style={styles.miniTableColSmall}>#</Text>
                  <Text style={styles.miniTableColTeam}>Team</Text>
                  <Text style={styles.miniTableColSmall}>Pts</Text>
                  <Text style={styles.miniTableColSmall}>GD</Text>
                  <Text style={styles.miniTableColForm}>Form</Text>
                </View>
                {miniStandings.map((row) => (
                  <View key={row.team.id} style={styles.miniTableRow}>
                    <Text style={styles.miniTableColSmall}>{row.rank}</Text>
                    <Text style={styles.miniTableColTeam}>{row.team.name}</Text>
                    <Text style={styles.miniTableColSmall}>{row.points}</Text>
                    <Text style={styles.miniTableColSmall}>{row.goalsDiff}</Text>
                    <Text style={styles.miniTableColForm}>{row.form}</Text>
                  </View>
                ))}
              </View>
            )}

            {flatOdds ? (
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionLabel}>Odds breakdown</Text>
                {oddsSections.map((section) => (
                  <View key={section.title} style={styles.oddsSection}>
                    <Text style={styles.oddsSectionTitle}>{section.title}</Text>
                    <View style={styles.oddsPillRow}>
                      {section.items.map(
                        (item) =>
                          !!item.value && (
                            <View key={item.label} style={styles.oddsPill}>
                              <Text style={styles.oddsPillLabel}>{item.label}</Text>
                              <Text style={styles.oddsPillValue}>{item.value}</Text>
                            </View>
                          ),
                      )}
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionLabel}>Odds snapshot</Text>
                {oddsSnapshot ? (
                  <Text style={styles.sectionValue}>
                    1: {oddsSnapshot.home ?? '-'} | X: {oddsSnapshot.draw ?? '-'} | 2:{' '}
                    {oddsSnapshot.away ?? '-'}
                  </Text>
                ) : (
                  <Text style={styles.sectionValue}>Odds data unavailable.</Text>
                )}
              </View>
            )}

            <View style={styles.sectionBlock}>
              <Text style={styles.sectionLabel}>Stats preview</Text>
              {rawDetails?.stats?.key_metrics ? (
                <View style={styles.statsRow}>
                  {['avg_goals_for', 'avg_goals_against', 'clean_sheets_pct'].map((key) => (
                    <View key={key} style={styles.oddsPill}>
                      <Text style={styles.oddsPillLabel}>{key.replace(/_/g, ' ')}</Text>
                      <Text style={styles.oddsPillValue}>
                        {rawDetails.stats.key_metrics[key]?.home ?? '-'} /{' '}
                        {rawDetails.stats.key_metrics[key]?.away ?? '-'}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.sectionValueMono}>
                  {JSON.stringify(rawDetails?.stats || {}, null, 2).slice(0, 220)}
                </Text>
              )}
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
          <Text style={styles.analysisButtonSub}>tap to open AI probabilities & value bets</Text>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: COLORS.neonPurple,
    backgroundColor: COLORS.card,
    shadowColor: COLORS.neonPurple,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 4,
  },
  backText: {
    color: COLORS.text,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'right',
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '800',
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
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    shadowColor: COLORS.neonPurple,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
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
  retryButton: {
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.neonPurple,
    backgroundColor: '#0a0f1f',
  },
  retryText: {
    color: COLORS.text,
    fontWeight: '700',
  },
  warningText: {
    color: COLORS.neonViolet,
    textAlign: 'center',
    marginVertical: 12,
  },
  analysisButton: {
    backgroundColor: COLORS.neonPurple,
    borderRadius: 24,
    paddingVertical: 16,
    borderWidth: 1.5,
    borderColor: COLORS.neonPurple,
    marginBottom: 16,
    shadowColor: COLORS.neonPurple,
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 8,
  },
  analysisButtonText: {
    color: '#0b0c1f',
    textAlign: 'center',
    fontWeight: '900',
    letterSpacing: 0.8,
    fontSize: 16,
  },
  analysisButtonSub: {
    color: '#0b0c1f',
    textAlign: 'center',
    marginTop: 4,
    fontSize: 12,
    opacity: 0.9,
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
  statusText: {
    marginBottom: 0,
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
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 10,
  },
  teamColumn: {
    flex: 3,
    alignItems: 'flex-start',
    gap: 4,
  },
  teamColumnRight: {
    flex: 3,
    alignItems: 'flex-end',
    gap: 4,
  },
  teamLogoCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#0f172a',
    borderWidth: 1.5,
    borderColor: COLORS.neonPurple,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.neonPurple,
    shadowOpacity: 0.55,
    shadowRadius: 12,
  },
  teamShortName: {
    color: COLORS.text,
    fontWeight: '800',
    fontSize: 16,
  },
  teamMetaText: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 2,
  },
  vsColumn: {
    flex: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vsBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: COLORS.neonOrange,
    shadowColor: COLORS.neonOrange,
    shadowOpacity: 0.7,
    shadowRadius: 12,
  },
  vsText: {
    color: '#0a0a0f',
    fontSize: 16,
    fontWeight: '800',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.neonViolet,
    backgroundColor: '#0a0f1f',
  },
  kickoffPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.neonPurple,
    backgroundColor: '#0a0f1f',
  },
  miniTableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#020617',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
  },
  miniTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.borderSoft,
    backgroundColor: '#0b1220',
  },
  miniTableColSmall: {
    width: 32,
    color: COLORS.text,
    fontWeight: '700',
  },
  miniTableColTeam: {
    flex: 1,
    color: COLORS.text,
    fontWeight: '700',
  },
  miniTableColForm: {
    width: 80,
    color: COLORS.muted,
    textAlign: 'right',
  },
  oddsSection: {
    marginBottom: 10,
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.neonPurple,
    backgroundColor: COLORS.card,
    shadowColor: COLORS.neonPurple,
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  oddsSectionTitle: {
    color: COLORS.text,
    fontWeight: '800',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  oddsPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  oddsPill: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.neonOrange,
    backgroundColor: COLORS.card,
    shadowColor: COLORS.neonPurple,
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  oddsPillLabel: {
    color: COLORS.muted,
    fontSize: 12,
    marginBottom: 4,
  },
  oddsPillValue: {
    color: COLORS.text,
    fontWeight: '800',
    fontSize: 16,
  },
  sectionValueMono: {
    color: COLORS.text,
    backgroundColor: '#0a0f1f',
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    borderRadius: 14,
    padding: 12,
    fontFamily: 'monospace',
    lineHeight: 18,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
});
