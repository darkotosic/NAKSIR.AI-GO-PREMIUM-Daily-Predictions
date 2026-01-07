import React from 'react';
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
import { TeamStatsBlock, TeamStatsSummary } from '@naksir-types/match';
import { useI18n } from '@lib/i18n';

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

const StatLine = ({ label, value }: { label: string; value?: string | number | null }) => (
  <View style={styles.statRow}>
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={styles.statValue}>{value ?? '-'}</Text>
  </View>
);

const TeamStatsCard = ({
  title,
  stats,
  badge,
}: {
  title: string;
  stats?: TeamStatsSummary | null;
  badge?: string;
}) => {
  const { t } = useI18n();

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.title}>{title}</Text>
        {badge ? <Text style={styles.badge}>{badge}</Text> : null}
      </View>
      <View style={styles.statGrid}>
        <StatLine label={t('teamStats.form')} value={stats?.form} />
        <StatLine label={t('teamStats.played')} value={stats?.fixtures?.played?.total} />
        <StatLine label={t('teamStats.wins')} value={stats?.fixtures?.wins?.total} />
        <StatLine label={t('teamStats.draws')} value={stats?.fixtures?.draws?.total} />
        <StatLine label={t('teamStats.losses')} value={stats?.fixtures?.loses?.total} />
        <StatLine label={t('teamStats.goalsFor')} value={stats?.goals?.for?.total?.total} />
        <StatLine label={t('teamStats.goalsAgainst')} value={stats?.goals?.against?.total?.total} />
        <StatLine label={t('teamStats.avgGoalsFor')} value={stats?.goals?.for?.average?.total} />
      </View>
    </View>
  );
};

const TeamStatsScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'TeamStats'>>();
  const { t } = useI18n();
  const fixtureId = route.params?.fixtureId;
  const summary = route.params?.summary;

  const { data, isLoading, isError, refetch } = useMatchDetailsQuery(fixtureId);
  const heroSummary = data?.summary ?? summary;
  const teamStats = (data?.team_stats ?? null) as TeamStatsBlock | null;
  const hasTeamStats = Boolean(teamStats?.home || teamStats?.away);

  if (!fixtureId) {
    return (
      <ErrorState
        message={t('match.fixtureMissing')}
        onRetry={() => navigation.navigate('TodayMatches')}
      />
    );
  }

  const goBackToMatch = () => navigation.navigate('MatchDetails', { fixtureId, summary: heroSummary ?? summary });

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <TouchableOpacity style={styles.backButton} onPress={goBackToMatch}>
          <Text style={styles.backIcon}>←</Text>
          <Text style={styles.backLabel}>{t('common.backToMatch')}</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>{t('teamStats.title')}</Text>
        <Text style={styles.subtitle}>
          {heroSummary?.teams?.home?.name || t('common.home')} vs {heroSummary?.teams?.away?.name || t('common.away')}
        </Text>

        {isLoading ? <ActivityIndicator color={COLORS.neonViolet} size="large" style={styles.loader} /> : null}
        {isError ? <ErrorState message={t('teamStats.loadingError')} onRetry={refetch} /> : null}

        {!isLoading && !isError && !hasTeamStats ? (
          <View style={styles.card}>
            <Text style={styles.emptyText}>{t('teamStats.empty')}</Text>
          </View>
        ) : null}

        {teamStats?.home ? (
          <TeamStatsCard
            title={heroSummary?.teams?.home?.name || t('common.home')}
            stats={teamStats.home}
            badge={t('teamStats.homeBadge')}
          />
        ) : null}
        {teamStats?.away ? (
          <TeamStatsCard
            title={heroSummary?.teams?.away?.name || t('common.away')}
            stats={teamStats.away}
            badge={t('teamStats.awayBadge')}
          />
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
  headerTitle: {
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
  title: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '800',
  },
  badge: {
    backgroundColor: '#0f162b',
    color: COLORS.neonOrange,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontWeight: '800',
    borderWidth: 1,
    borderColor: COLORS.neonPurple,
    overflow: 'hidden',
  },
  statGrid: {
    gap: 6,
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

export default TeamStatsScreen;
