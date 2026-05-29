import React from 'react';
import {
  ActivityIndicator,
  Image,
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
import { MatchStatEntry } from '@/types/match';
import TelegramBanner from '@components/TelegramBanner';

const COLORS = {
  background: '#040312',
  card: '#0b0c1f',
  neonPurple: '#b06bff',
  neonViolet: '#8b5cf6',
  text: '#f8fafc',
  muted: '#a5b4fc',
  borderSoft: '#1f1f3a',
};

const StatsScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'Stats'>>();
  const fixtureId = route.params?.fixtureId;
  const summary = route.params?.summary;

  const { data, isLoading, isError, refetch } = useMatchDetailsQuery(fixtureId);
  const heroSummary = data?.summary ?? summary;
  const stats = (data?.stats ?? []) as MatchStatEntry[];
  const hasStats = Array.isArray(stats) && stats.length > 0;

  if (!fixtureId) {
    return <ErrorState message="Fixture ID is missing." onRetry={() => navigation.navigate('TodayMatches')} />;
  }

  const goBackToMatch = () => navigation.navigate('MatchDetails', { fixtureId, summary: heroSummary ?? summary });

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <TelegramBanner />
        <TouchableOpacity style={styles.backButton} onPress={goBackToMatch}>
          <Text style={styles.backIcon}>←</Text>
          <Text style={styles.backLabel}>Back to match</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Match stats</Text>
        <Text style={styles.subtitle}>
          {heroSummary?.teams?.home?.name || 'Home'} vs {heroSummary?.teams?.away?.name || 'Away'}
        </Text>

        {isLoading ? <ActivityIndicator color={COLORS.neonViolet} size="large" style={styles.loader} /> : null}

        {isError ? <ErrorState message="Unable to load match stats" onRetry={refetch} /> : null}

        {!isLoading && !isError && !hasStats ? (
          <View style={styles.card}>
            <Text style={styles.emptyText}>No match statistics available.</Text>
          </View>
        ) : null}

        {stats.map((teamStat, index) => (
          <View style={styles.card} key={teamStat.team?.id || index}>
            <View style={styles.cardHeader}>
              <View style={styles.teamBlock}>
                {teamStat.team?.logo ? <Image source={{ uri: teamStat.team.logo }} style={styles.teamLogo} /> : null}
                <Text style={styles.teamName}>{teamStat.team?.name || 'Team'}</Text>
              </View>
              <Text style={styles.sectionMeta}>Statistic overview</Text>
            </View>
            <View style={styles.statGrid}>
              {teamStat.statistics?.map((stat, idx) => (
                <View style={styles.statRow} key={`${stat.type}-${idx}`}>
                  <Text style={styles.statLabel}>{stat.type}</Text>
                  <Text style={styles.statValue}>{stat.value ?? '-'}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}
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
  loader: {
    marginVertical: 12,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    gap: 10,
  },
  emptyText: {
    color: COLORS.muted,
    textAlign: 'center',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  teamBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  teamLogo: {
    width: 32,
    height: 32,
  },
  teamName: {
    color: COLORS.text,
    fontWeight: '800',
  },
  sectionMeta: {
    color: COLORS.muted,
    fontSize: 12,
  },
  statGrid: {
    gap: 8,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSoft,
  },
  statLabel: {
    color: COLORS.text,
    flex: 1,
    marginRight: 12,
  },
  statValue: {
    color: COLORS.neonViolet,
    fontWeight: '800',
  },
});

export default StatsScreen;
