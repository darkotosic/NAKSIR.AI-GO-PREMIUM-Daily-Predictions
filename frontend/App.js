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
  background: '#0b0b1f',
  card: '#14142b',
  neonPurple: '#a855f7',
  neonOrange: '#ff8c00',
  gold: '#d4af37',
  text: '#f5f5f5',
  muted: '#9ca3af',
  accentBlue: '#0d6efd',
};

const TODAY_URL = 'https://naksir-go-premium-api.onrender.com/matches/today';
const MATCH_DETAIL_URL =
  'https://naksir-go-premium-api.onrender.com/matches/{fixture_id}/full';
const AI_ANALYSIS_URL =
  'https://naksir-go-premium-api.onrender.com/matches/{fixture_id}/ai-analysis';

const TelegramBanner = () => (
  <TouchableOpacity
    style={styles.telegramButton}
    onPress={() => Linking.openURL('https://t.me/naksiranalysis')}
    activeOpacity={0.85}
  >
    <Text style={styles.telegramText}>Pridruži se na Telegram</Text>
  </TouchableOpacity>
);

const FilterBar = ({ countryFilter, timeFilter, onCountryChange, onTimeChange }) => (
  <View style={styles.filterRow}>
    <View style={styles.filterGroup}>
      <Text style={styles.filterLabel}>Država</Text>
      <TextInput
        value={countryFilter}
        onChangeText={onCountryChange}
        placeholder="npr. England"
        placeholderTextColor={COLORS.muted}
        style={styles.input}
      />
    </View>
    <View style={styles.filterGroup}>
      <Text style={styles.filterLabel}>Vreme (HH:MM)</Text>
      <TextInput
        value={timeFilter}
        onChangeText={onTimeChange}
        placeholder="npr. 18:00"
        placeholderTextColor={COLORS.muted}
        style={styles.input}
      />
    </View>
  </View>
);

const MatchCard = ({ match, onPress }) => {
  const kickoff = match.fixture?.date
    ? new Date(match.fixture.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'TBD';

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.9} onPress={onPress}>
      <Text style={styles.leagueText}>{match.league?.name} • {match.league?.country}</Text>
      <View style={styles.teamsRow}>
        <Text style={styles.teamName}>{match.teams?.home?.name}</Text>
        <Text style={styles.kickoff}>{kickoff}</Text>
        <Text style={styles.teamName}>{match.teams?.away?.name}</Text>
      </View>
      {match.odds?.full_time?.home && (
        <Text style={styles.oddsText}>
          1: {match.odds.full_time.home} | X: {match.odds.full_time.draw} | 2: {match.odds.full_time.away}
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

  useEffect(() => {
    setLoading(true);
    fetch(TODAY_URL)
      .then((res) => res.json())
      .then((data) => {
        setMatches(Array.isArray(data) ? data : data?.matches || []);
      })
      .catch(() => {
        setError('Nije moguće učitati utakmice. Proveri konekciju.');
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredMatches = useMemo(() => {
    return matches.filter((match) => {
      const country = (match.league?.country || '').toLowerCase();
      const time = match.fixture?.date
        ? new Date(match.fixture.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : '';
      const timeMatch = timeFilter ? time.includes(timeFilter) : true;
      const countryMatch = countryFilter ? country.includes(countryFilter.toLowerCase()) : true;
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
        {loading && <ActivityIndicator color={COLORS.neonPurple} size="large" style={styles.loader} />}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {!loading && !error && filteredMatches.map((match) => (
          <MatchCard
            key={match.fixture?.id}
            match={match}
            onPress={() => navigation.navigate('MatchDetails', { fixtureId: match.fixture?.id })}
          />
        ))}
        {!loading && !error && filteredMatches.length === 0 && (
          <Text style={styles.errorText}>Nema utakmica za prikaz.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const MatchDetailsScreen = ({ route, navigation }) => {
  const { fixtureId } = route.params;
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    fetch(MATCH_DETAIL_URL.replace('{fixture_id}', fixtureId))
      .then((res) => res.json())
      .then((data) => setDetails(data))
      .catch(() => setError('Nije moguće učitati detalje utakmice.'))
      .finally(() => setLoading(false));
  }, [fixtureId]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <TouchableOpacity
          style={styles.analysisButton}
          onPress={() => navigation.navigate('Analysis', { fixtureId })}
          activeOpacity={0.88}
        >
          <Text style={styles.analysisButtonText}>Naksir In-depth Analysis</Text>
        </TouchableOpacity>

        {loading && <ActivityIndicator color={COLORS.neonOrange} size="large" style={styles.loader} />}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {details && (
          <View style={styles.detailCard}>
            <Text style={styles.detailTitle}>
              {details.teams?.home?.name} vs {details.teams?.away?.name}
            </Text>
            <Text style={styles.detailSubtitle}>{details.league?.name} • {details.league?.country}</Text>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionLabel}>Datum</Text>
              <Text style={styles.sectionValue}>
                {details.fixture?.date
                  ? new Date(details.fixture.date).toLocaleString()
                  : 'N/A'}
              </Text>
            </View>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionLabel}>Stadion</Text>
              <Text style={styles.sectionValue}>{details.fixture?.venue?.name || 'N/A'}</Text>
            </View>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionLabel}>Sudija</Text>
              <Text style={styles.sectionValue}>{details.fixture?.referee || 'N/A'}</Text>
            </View>
            {details.odds && (
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionLabel}>Kvota snapshot</Text>
                <Text style={styles.sectionValue}>
                  1: {details.odds?.full_time?.home || '-'} | X: {details.odds?.full_time?.draw || '-'} | 2: {details.odds?.full_time?.away || '-'}
                </Text>
              </View>
            )}
            {details.stats && (
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionLabel}>Statistika</Text>
                <Text style={styles.sectionValue}>{JSON.stringify(details.stats).slice(0, 160)}...</Text>
              </View>
            )}
          </View>
        )}

        <TouchableOpacity
          style={styles.analysisButton}
          onPress={() => navigation.navigate('Analysis', { fixtureId })}
          activeOpacity={0.88}
        >
          <Text style={styles.analysisButtonText}>Naksir In-depth Analysis</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const AnalysisScreen = ({ route }) => {
  const { fixtureId } = route.params;
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    fetch(AI_ANALYSIS_URL.replace('{fixture_id}', fixtureId))
      .then((res) => res.json())
      .then((data) => setAnalysis(data))
      .catch(() => setError('AI analiza trenutno nije dostupna.'))
      .finally(() => setLoading(false));
  }, [fixtureId]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {loading && <ActivityIndicator color={COLORS.neonPurple} size="large" style={styles.loader} />}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {analysis && (
          <View style={styles.detailCard}>
            <Text style={styles.detailTitle}>AI Match Analysis</Text>
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionLabel}>Sažetak</Text>
              <Text style={styles.sectionValue}>{analysis.summary || 'N/A'}</Text>
            </View>
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionLabel}>Ključni faktori</Text>
              <Text style={styles.sectionValue}>
                {(analysis.key_factors || []).join('\n• ')}
              </Text>
            </View>
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionLabel}>Probabilities</Text>
              <Text style={styles.sectionValue}>{JSON.stringify(analysis.probabilities || {}, null, 2)}</Text>
            </View>
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionLabel}>Value bets</Text>
              <Text style={styles.sectionValue}>{JSON.stringify(analysis.value_bets || [], null, 2)}</Text>
            </View>
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionLabel}>Rizici</Text>
              <Text style={styles.sectionValue}>{(analysis.risk_flags || []).join('\n• ')}</Text>
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
      border: COLORS.neonOrange,
    },
  };

  return (
    <NavigationContainer theme={navigationTheme}>
      <Drawer.Navigator
        initialRouteName="Današnje utakmice"
        screenOptions={{
          headerStyle: { backgroundColor: COLORS.card },
          headerTintColor: COLORS.text,
          drawerActiveTintColor: COLORS.neonPurple,
          drawerInactiveTintColor: COLORS.text,
          drawerStyle: { backgroundColor: COLORS.background },
        }}
      >
        <Drawer.Screen name="Današnje utakmice" component={MatchesScreen} />
        <Drawer.Screen
          name="MatchDetails"
          component={MatchDetailsScreen}
          options={{ drawerItemStyle: { display: 'none' }, title: 'Detalji meča' }}
        />
        <Drawer.Screen
          name="Analysis"
          component={AnalysisScreen}
          options={{ drawerItemStyle: { display: 'none' }, title: 'AI analiza' }}
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
  },
  telegramButton: {
    backgroundColor: COLORS.accentBlue,
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 14,
    marginBottom: 18,
    shadowColor: COLORS.accentBlue,
    shadowOpacity: 0.6,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 16,
    elevation: 5,
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
    marginBottom: 12,
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
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: COLORS.text,
    shadowColor: COLORS.neonPurple,
    shadowOpacity: 0.45,
    shadowRadius: 10,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
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
    marginBottom: 8,
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
    marginHorizontal: 12,
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
  analysisButton: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    paddingVertical: 14,
    borderColor: COLORS.gold,
    borderWidth: 1.5,
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
    borderRadius: 18,
    padding: 18,
    borderColor: COLORS.neonPurple,
    borderWidth: 1.5,
    marginBottom: 18,
    shadowColor: COLORS.neonOrange,
    shadowOpacity: 0.6,
    shadowRadius: 16,
  },
  detailTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
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
});
