import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { useMatchDetailsQuery } from '@hooks/useMatchDetailsQuery';
import { RootStackParamList } from '@navigation/types';
import { ErrorState } from '@components/ErrorState';
import { OddsSnapshot } from '@naksir-types/match';

const COLORS = {
  background: '#040312',
  card: '#0b0c1f',
  neonPurple: '#b06bff',
  neonViolet: '#8b5cf6',
  neonOrange: '#fb923c',
  text: '#f8fafc',
  muted: '#a5b4fc',
  borderSoft: '#1f1f3a',
};

const OddsChip = ({ label, value }: { label: string; value?: number | string }) => (
  <View style={styles.oddsChip}>
    <Text style={styles.oddsChipLabel}>{label}</Text>
    <Text style={styles.oddsChipValue}>{value ?? '-'}</Text>
  </View>
);

const OddsGroup = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <View style={styles.oddsTile}>
    <Text style={styles.oddsTileLabel}>{title}</Text>
    <View style={styles.oddsChipRow}>{children}</View>
  </View>
);

const OddsScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'Odds'>>();
  const fixtureId = route.params?.fixtureId;
  const summary = route.params?.summary;
  const selectedMarket = route.params?.selectedMarket;

  const { data, isLoading, isError, refetch } = useMatchDetailsQuery(fixtureId);
  const odds: OddsSnapshot | undefined = useMemo(
    () => data?.odds?.flat ?? undefined,
    [data?.odds?.flat],
  );
  const heroSummary = data?.summary ?? summary;
  const goBackToMatch = () => navigation.navigate('MatchDetails', { fixtureId, summary: heroSummary ?? summary });

  if (!fixtureId) {
    return <ErrorState message="Fixture ID is missing." onRetry={() => navigation.navigate('TodayMatches')} />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <TouchableOpacity style={styles.backButton} onPress={goBackToMatch}>
          <Text style={styles.backIcon}>←</Text>
          <Text style={styles.backLabel}>Back to match</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Odds snapshot</Text>
        <Text style={styles.subtitle}>
          {heroSummary?.teams?.home?.name || 'Home'} vs {heroSummary?.teams?.away?.name || 'Away'}
        </Text>
        {selectedMarket ? (
          <View style={styles.pill}>
            <Text style={styles.pillText}>Opened from: {selectedMarket}</Text>
          </View>
        ) : null}

        {isLoading ? <ActivityIndicator color={COLORS.neonViolet} size="large" style={styles.loader} /> : null}

        {isError ? (
          <ErrorState message="Unable to load odds" onRetry={refetch} />
        ) : null}

        {!isLoading && !isError && !odds ? (
          <View style={styles.card}>
            <Text style={styles.emptyText}>No odds available for this fixture.</Text>
          </View>
        ) : null}

        {odds ? (
          <View style={styles.grid}>
            <OddsGroup title="Match Winner">
              <OddsChip label="Home" value={odds.match_winner?.home} />
              <OddsChip label="Draw" value={odds.match_winner?.draw} />
              <OddsChip label="Away" value={odds.match_winner?.away} />
            </OddsGroup>

            <OddsGroup title="Double Chance">
              <OddsChip label="1X" value={odds.double_chance?.['1X']} />
              <OddsChip label="12" value={odds.double_chance?.['12']} />
              <OddsChip label="X2" value={odds.double_chance?.['X2']} />
            </OddsGroup>

            <OddsGroup title="BTTS">
              <OddsChip label="YES" value={odds.btts?.yes} />
              <OddsChip label="NO" value={odds.btts?.no} />
            </OddsGroup>

            <OddsGroup title="Totals">
              <OddsChip label="Over 1.5" value={odds.totals?.over_1_5} />
              <OddsChip label="Over 2.5" value={odds.totals?.over_2_5} />
              <OddsChip label="Over 3.5" value={odds.totals?.over_3_5} />
              <OddsChip label="Under 3.5" value={odds.totals?.under_3_5} />
              <OddsChip label="Under 4.5" value={odds.totals?.under_4_5} />
              <OddsChip label="HT Over 0.5" value={odds.ht_over_0_5} />
            </OddsGroup>

            <OddsGroup title="Team Goals">
              <OddsChip label="Home Over 0.5" value={odds.home_goals_over_0_5 as number | string} />
              <OddsChip label="Away Over 0.5" value={odds.away_goals_over_0_5 as number | string} />
            </OddsGroup>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    padding: 16,
    backgroundColor: COLORS.background,
    gap: 12,
    paddingBottom: 28,
  },
  loader: {
    marginVertical: 12,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0b1220',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.neonPurple,
    alignSelf: 'flex-start',
  },
  backIcon: {
    color: COLORS.text,
    fontSize: 16,
  },
  backLabel: {
    color: COLORS.text,
    fontWeight: '700',
  },
  title: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '800',
  },
  subtitle: {
    color: COLORS.muted,
  },
  pill: {
    backgroundColor: '#0f162b',
    borderWidth: 1,
    borderColor: COLORS.neonPurple,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  pillText: {
    color: COLORS.text,
    fontWeight: '700',
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
  },
  emptyText: {
    color: COLORS.muted,
    textAlign: 'center',
  },
  grid: {
    gap: 10,
  },
  oddsTile: {
    backgroundColor: '#0c1025',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    shadowColor: COLORS.neonPurple,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 5,
    gap: 8,
  },
  oddsTileLabel: {
    color: COLORS.text,
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  oddsChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    rowGap: 10,
  },
  oddsChip: {
    flexGrow: 1,
    flexBasis: '45%',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#192248',
    borderWidth: 1,
    borderColor: COLORS.neonPurple,
  },
  oddsChipLabel: {
    color: COLORS.muted,
    fontSize: 12,
    marginBottom: 4,
    letterSpacing: 0.6,
  },
  oddsChipValue: {
    color: COLORS.text,
    fontWeight: '800',
    fontSize: 14,
    textAlign: 'left',
  },
});

export default OddsScreen;
