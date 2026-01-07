import React, { useMemo } from 'react';
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
import { useH2HQuery } from '@hooks/useH2HQuery';
import { RootStackParamList } from '@navigation/types';
import { ErrorState } from '@components/ErrorState';
import { H2HMatch } from '@naksir-types/match';
import { useI18n } from '@lib/i18n';

const COLORS = {
  background: '#040312',
  card: '#0b0c1f',
  neonPurple: '#b06bff',
  neonViolet: '#8b5cf6',
  text: '#f8fafc',
  muted: '#a5b4fc',
  borderSoft: '#1f1f3a',
};

const H2HRow = ({ match, formatDate }: { match: H2HMatch; formatDate: (date?: string) => string }) => {
  const { t } = useI18n();
  const home = match.teams?.home;
  const away = match.teams?.away;
  const goals = match.goals || {};

  return (
    <View style={styles.rowCard}>
      <View style={styles.rowHeader}>
        <Text style={styles.rowLeague}>{match.league?.name || t('common.league')}</Text>
        <Text style={styles.rowDate}>{formatDate(match.fixture?.date)}</Text>
      </View>
      <View style={styles.rowTeams}>
        <View style={styles.rowTeamBlock}>
          {home?.logo ? <Image source={{ uri: home.logo }} style={styles.teamLogo} /> : null}
          <Text style={styles.teamName} numberOfLines={1}>
            {home?.name || t('common.home')}
          </Text>
        </View>

        <View style={styles.scoreBlock}>
          <Text style={styles.scoreText}>{goals.home ?? '-'}</Text>
          <Text style={styles.scoreSeparator}>:</Text>
          <Text style={styles.scoreText}>{goals.away ?? '-'}</Text>
        </View>

        <View style={[styles.rowTeamBlock, { alignItems: 'flex-end' }]}>
          {away?.logo ? <Image source={{ uri: away.logo }} style={styles.teamLogo} /> : null}
          <Text style={[styles.teamName, { textAlign: 'right' }]} numberOfLines={1}>
            {away?.name || t('common.away')}
          </Text>
        </View>
      </View>
    </View>
  );
};

const H2HScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'H2H'>>();
  const { t, formatDateTime } = useI18n();
  const fixtureId = route.params?.fixtureId;
  const summary = route.params?.summary;

  const { data, isLoading, isError, refetch } = useH2HQuery(fixtureId);
  const matches = useMemo(() => data?.matches ?? [], [data?.matches]);

  const goBackToMatch = () => navigation.navigate('MatchDetails', { fixtureId, summary });

  if (!fixtureId) {
    return (
      <ErrorState
        message={t('match.fixtureMissing')}
        onRetry={() => navigation.navigate('TodayMatches')}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <TouchableOpacity style={styles.backButton} onPress={goBackToMatch}>
          <Text style={styles.backIcon}>←</Text>
          <Text style={styles.backLabel}>{t('common.backToMatch')}</Text>
        </TouchableOpacity>

        <Text style={styles.title}>{t('h2h.title')}</Text>
        <Text style={styles.subtitle}>
          {t('h2h.subtitle', {
            home: summary?.teams?.home?.name || t('common.home'),
            away: summary?.teams?.away?.name || t('common.away'),
          })}
        </Text>

        {isLoading ? <ActivityIndicator color={COLORS.neonViolet} size="large" style={styles.loader} /> : null}

        {isError ? (
          <ErrorState message={t('h2h.loadingError')} onRetry={refetch} />
        ) : null}

        {!isLoading && !isError && matches.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.emptyText}>{t('h2h.empty')}</Text>
          </View>
        ) : null}

        {matches.map((match, idx) => (
          <H2HRow
            key={match.fixture?.id || idx}
            match={match}
            formatDate={(dateString) =>
              dateString ? formatDateTime(dateString, { dateStyle: 'medium', timeStyle: 'short' }) : t('common.dateTbd')
            }
          />
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
    paddingBottom: 24,
    gap: 12,
  },
  title: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '800',
  },
  subtitle: {
    color: COLORS.muted,
    marginBottom: 8,
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
  loader: {
    marginVertical: 16,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
  },
  rowCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    gap: 10,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowLeague: {
    color: COLORS.text,
    fontWeight: '800',
  },
  rowDate: {
    color: COLORS.muted,
    fontSize: 12,
  },
  rowTeams: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  rowTeamBlock: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  teamLogo: {
    width: 32,
    height: 32,
  },
  teamName: {
    color: COLORS.text,
    fontWeight: '700',
    flexShrink: 1,
  },
  scoreBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  scoreText: {
    color: COLORS.neonViolet,
    fontSize: 20,
    fontWeight: '900',
  },
  scoreSeparator: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '800',
  },
  emptyText: {
    color: COLORS.muted,
    textAlign: 'center',
  },
});

export default H2HScreen;
