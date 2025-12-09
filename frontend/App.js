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
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createDrawerNavigator } from '@react-navigation/drawer';

const Drawer = createDrawerNavigator();

const COLORS = {
  background: '#050516',
  card: '#111827',
  neonPurple: '#a855f7',
  neonOrange: '#f97316',
  gold: '#eab308',
  text: '#f9fafb',
  muted: '#9ca3af',
  accentBlue: '#0d6efd',
  borderSoft: '#1f2937',
};

const API_BASE = 'https://naksir-go-premium-api.onrender.com';
const TODAY_URL = `${API_BASE}/matches/today`;
const fullUrl = (fixtureId) => `${API_BASE}/matches/${fixtureId}/full`;
const aiUrl = (fixtureId) => `${API_BASE}/matches/${fixtureId}/ai-analysis`;

const TelegramBanner = () => (
  <TouchableOpacity
    style={styles.telegramButton}
    onPress={() => Linking.openURL('https://t.me/naksiranalysis')}
    activeOpacity={0.88}
  >
    <Text style={styles.telegramText}>Join Naksir Analysis on Telegram</Text>
  </TouchableOpacity>
);

const FilterBar = ({
  countryFilter,
  timeFilter,
  onCountryChange,
  onTimeChange,
}) => (
  <View style={styles.filterRow}>
    <View style={styles.filterGroup}>
      <Text style={styles.filterLabel}>Country</Text>
      <TextInput
        value={countryFilter}
        onChangeText={onCountryChange}
        placeholder="e.g. England"
        placeholderTextColor={COLORS.muted}
        style={styles.input}
      />
    </View>
    <View style={styles.filterGroup}>
      <Text style={styles.filterLabel}>Kickoff (HH:MM)</Text>
      <TextInput
        value={timeFilter}
        onChangeText={onTimeChange}
        placeholder="e.g. 18:00"
        placeholderTextColor={COLORS.muted}
        style={styles.input}
      />
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
        <Text style={styles.teamName} numberOfLines={1}>
          {match.teams?.home?.name}
        </Text>

        <Text style={styles.kickoff}>{kickoff}</Text>

        <Text style={[styles.teamName, { textAlign: 'right' }]} numberOfLines={1}>
          {match.teams?.away?.name}
        </Text>
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

const MatchesScreen = ({ navigation }) => {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [timeFilter, setTimeFilter] = useState('');

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

  const filteredMatches = useMemo(() => {
    return matches.filter((match) => {
      const country = (match.league?.country || '').toLowerCase();
      const time = match.fixture?.date
        ? new Date(match.fixture.date).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })
        : '';

      const timeMatch = timeFilter ? time.includes(timeFilter) : true;
      const countryMatch = countryFilter
        ? country.includes(countryFilter.toLowerCase())
        : true;

      return timeMatch && countryMatch;
    });
  }, [matches, countryFilter, timeFilter]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <TelegramBanner />

        <FilterBar
          countryFilter={countryFilter}
          timeFilter={timeFilter}
          onCountryChange={setCountryFilter}
          onTimeChange={setTimeFilter}
        />

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
          filteredMatches.map((match, index) => (
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

        {!loading && !error && filteredMatches.length === 0 && (
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
        // Sačuvaj ceo raw response, ali ćemo kasnije izvući summary
        setRawDetails(data);
      })
      .catch(() => setError('Unable to load match details.'))
      .finally(() => setLoading(false));
  }, [fixtureId]);

  // Helperi koji mapiraju backend → UI format
  const summary = rawDetails?.summary || {};
  const league = summary.league || rawDetails?.league || {};
  const teams = summary.teams || rawDetails?.teams || {};
  const fixture = summary.fixture || {
    date: summary.kickoff,
    venue: summary.venue,
    referee: summary.referee,
  };

  const odds = rawDetails?.odds || null;
  const stats = rawDetails?.stats || null;

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
            color={COLORS.neonOrange}
            size="large"
            style={styles.loader}
          />
        )}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {rawDetails && (
          <View style={styles.detailCard}>
            <Text style={styles.detailTitle}>
              {(teams.home?.name || 'Home team') + ' vs ' + (teams.away?.name || 'Away team')}
            </Text>

            <Text style={styles.detailSubtitle}>
              {(league.name || 'League') + ' • ' + (league.country || 'Country')}
            </Text>

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

            {odds && (
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionLabel}>Odds snapshot</Text>
                <Text style={styles.sectionValue}>
                  1: {odds?.full_time?.home ?? '-'} | X: {odds?.full_time?.draw ?? '-'} | 2:{' '}
                  {odds?.full_time?.away ?? '-'}
                </Text>
              </View>
            )}

            {stats && Array.isArray(stats) && stats.length > 0 && (
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionLabel}>Stats (preview)</Text>
                <Text style={styles.sectionValue}>
                  {JSON.stringify(stats).slice(0, 220)}…
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
        // Backend: { fixture_id, generated_at, ..., analysis: { ... } }
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

            {analysis.disclaimer && (
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
        screenOptions={{
          headerStyle: { backgroundColor: COLORS.card },
          headerTintColor: COLORS.text,
          drawerActiveTintColor: COLORS.neonPurple,
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
  filterRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
  },
  filterGroup: {
    flex: 1,
  },
  filterLabel: {
    color: COLORS.muted,
    marginBottom: 6,
    fontSize: 12,
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.neonOrange,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: COLORS.text,
    shadowColor: COLORS.neonPurple,
    shadowOpacity: 0.45,
    shadowRadius: 10,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderColor: COLORS.neonOrange,
    borderWidth: 1,
    shadowColor: COLORS.neonPurple,
    shadowOpacity: 0.65,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 18,
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
    color: COLORS.neonOrange,
    textAlign: 'center',
    marginVertical: 12,
  },
  warningText: {
    color: COLORS.neonOrange,
    textAlign: 'center',
    marginVertical: 12,
  },
  analysisButton: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: COLORS.gold,
    marginBottom: 16,
    shadowColor: COLORS.neonPurple,
    shadowOpacity: 0.75,
    shadowRadius: 18,
    elevation: 7,
  },
  analysisButtonText: {
    color: COLORS.gold,
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
    shadowColor: COLORS.neonOrange,
    shadowOpacity: 0.6,
    shadowRadius: 16,
  },
  detailTitle: {
    color: COLORS.text,
    fontSize: 20,
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
    color: COLORS.neonOrange,
    fontWeight: '700',
    marginBottom: 6,
  },
  sectionValue: {
    color: COLORS.text,
    lineHeight: 20,
  },
  refreshRow: {
    alignItems: 'flex-end',
    marginBottom: 10,
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
});
