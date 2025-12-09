import 'react-native-gesture-handler';
import React, { useEffect, useMemo, useState } from 'react';
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
      {[
        { key: 'time', label: 'Kickoff time' },
        { key: 'name', label: 'Team name' },
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
      })}
    </View>
  </View>
);

const MatchCard = ({ match, onPress }) => {
  const kickoff = match.fixture?.date
    ? new Date(match.fixture.date).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'TBD';

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.9}
      onPress={onPress}
    >
      <Text style={styles.leagueText}>
        {match.league?.name} • {match.league?.country}
      </Text>

      <View style={styles.teamsRow}>
        <View style={styles.teamPill}>
          {match.teams?.home?.logo ? (
            <Image
              source={{ uri: match.teams.home.logo }}
              style={styles.teamLogoSmall}
            />
          ) : (
            <View style={styles.teamLogoSmallPlaceholder} />
          )}
          <Text style={styles.teamName} numberOfLines={1}>
            {match.teams?.home?.name}
          </Text>
        </View>

        <View style={styles.kickoffPill}>
          <Text style={styles.kickoff}>{kickoff}</Text>
        </View>

        <View style={[styles.teamPill, { justifyContent: 'flex-end' }]}>
          <Text
            style={[styles.teamName, { textAlign: 'right', marginRight: 6 }]}
            numberOfLines={1}
          >
            {match.teams?.away?.name}
          </Text>
          {match.teams?.away?.logo ? (
            <Image
              source={{ uri: match.teams.away.logo }}
              style={styles.teamLogoSmall}
            />
          ) : (
            <View style={styles.teamLogoSmallPlaceholder} />
          )}
        </View>
      </View>

      {match.odds?.full_time && (
        <Text style={styles.oddsText}>
          1: {match.odds.full_time.home ?? '-'} | X:{' '}
          {match.odds.full_time.draw ?? '-'} | 2:{' '}
          {match.odds.full_time.away ?? '-'}
        </Text>
      )}
    </TouchableOpacity>
  );
};

// --- Screens -----------------------------------------------------------------

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
      if (sortOption === 'name') {
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
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <TelegramBanner />

        <SortBar sortOption={sortOption} onSortChange={setSortOption} />

        <View style={styles.refreshRow}>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={loadMatches}
            activeOpacity={0.85}
          >
            <Text style={styles.refreshText}>Refresh matches</Text>
          </TouchableOpacity>
        </View>

        {loading && (
          <ActivityIndicator
            color={COLORS.neonPurple}
            size="large"
            style={styles.loader}
          />
        )}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

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
          <Text style={styles.errorText}>No matches to display.</Text>
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <TouchableOpacity
          style={styles.analysisButton}
          onPress={() =>
            navigation.navigate('AIAnalysis', {
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
                    style={styles.teamLogo}
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
                    style={styles.teamLogo}
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
            navigation.navigate('AIAnalysis', {
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

  useEffect(() => {
    const url = aiUrl(fixtureId);

    setLoading(true);
    setError('');

    fetch(url, {
      method: 'POST',
    })
      .then((res) => res.json())
      .then((data) => {
        const core = data.analysis || data;
        setAnalysis(core);
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

  const winnerProbs = analysis?.winner_probabilities;
  const goalsProbs = analysis?.goals_probabilities;
  const valueBet = analysis?.value_bet;
  const risks =
    Array.isArray(analysis?.risk_flags) && analysis.risk_flags.length > 0
      ? analysis.risk_flags
      : null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {loading && (
          <ActivityIndicator
            color={COLORS.neonPurple}
            size="large"
            style={styles.loader}
          />
        )}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {analysis && (
          <View style={styles.detailCard}>
            <Text style={styles.detailTitle}>AI Match Analysis</Text>

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

            {winnerProbs && (
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionLabel}>Probabilities</Text>
                <Text style={styles.sectionValue}>
                  Home win: {winnerProbs.home_win_pct}%{'\n'}
                  Draw: {winnerProbs.draw_pct}%{'\n'}
                  Away win: {winnerProbs.away_win_pct}%
                </Text>
              </View>
            )}

            {goalsProbs && (
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionLabel}>Goals markets</Text>
                <Text style={styles.sectionValue}>
                  Over 1.5: {goalsProbs.over_1_5_pct}%{'\n'}
                  Over 2.5: {goalsProbs.over_2_5_pct}%{'\n'}
                  Over 3.5: {goalsProbs.over_3_5_pct}%{'\n'}
                  Under 3.5: {goalsProbs.under_3_5_pct}%
                </Text>
              </View>
            )}

            {valueBet && (
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionLabel}>Value bets</Text>
                <Text style={styles.sectionValue}>
                  Market: {valueBet.market}{'\n'}
                  Selection: {valueBet.selection}{'\n'}
                  Model edge: {valueBet.edge_pct}%
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
    label: 'Nakir Apps',
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
          name="AIAnalysis"
          component={AIAnalysisScreen}
          options={{
            drawerItemStyle: { display: 'none' },
            title: 'AI Analysis',
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
    backgroundColor: COLORS.accentBlue,
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 18,
    marginBottom: 18,
    shadowColor: COLORS.accentBlue,
    shadowOpacity: 0.6,
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
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderColor: COLORS.neonViolet,
    borderWidth: 1,
    shadowColor: COLORS.neonPurple,
    shadowOpacity: 0.65,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 22,
    elevation: 6,
  },
  leagueText: {
    color: COLORS.muted,
    marginBottom: 8,
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  teamsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    gap: 10,
  },
  teamPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  teamLogoSmall: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#0f0f2d',
    borderWidth: 1,
    borderColor: COLORS.neonViolet,
  },
  teamLogoSmallPlaceholder: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#0f0f2d',
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
  },
  kickoffPill: {
    backgroundColor: '#141334',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.neonPurple,
  },
  teamName: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  kickoff: {
    color: COLORS.neonPurple,
    fontSize: 14,
    fontWeight: '700',
    marginHorizontal: 10,
  },
  oddsText: {
    color: COLORS.muted,
    marginTop: 4,
  },
  loader: {
    marginVertical: 24,
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
  teamLogo: {
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
