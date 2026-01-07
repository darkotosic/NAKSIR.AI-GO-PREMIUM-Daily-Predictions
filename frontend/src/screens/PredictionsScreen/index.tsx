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
import { PredictionEntry, PredictionsBlock } from '@naksir-types/match';
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

const PredictionsScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'Predictions'>>();
  const { t } = useI18n();
  const fixtureId = route.params?.fixtureId;
  const summary = route.params?.summary;

  const { data, isLoading, isError, refetch } = useMatchDetailsQuery(fixtureId);
  const heroSummary = data?.summary ?? summary;
  const predictionsRaw = data?.predictions as PredictionsBlock;

  const prediction: PredictionEntry | null = useMemo(() => {
    if (!predictionsRaw) return null;
    if (Array.isArray(predictionsRaw)) {
      return predictionsRaw[0] ?? null;
    }
    if ((predictionsRaw as { predictions?: PredictionEntry }).predictions) {
      return (predictionsRaw as { predictions?: PredictionEntry }).predictions ?? null;
    }
    return predictionsRaw as PredictionEntry;
  }, [predictionsRaw]);

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

        <Text style={styles.title}>{t('predictions.title')}</Text>
        <Text style={styles.subtitle}>
          {heroSummary?.teams?.home?.name || t('common.home')} vs {heroSummary?.teams?.away?.name || t('common.away')}
        </Text>

        {isLoading ? <ActivityIndicator color={COLORS.neonViolet} size="large" style={styles.loader} /> : null}
        {isError ? <ErrorState message={t('predictions.loadingError')} onRetry={refetch} /> : null}

        {!isLoading && !isError && !prediction ? (
          <View style={styles.card}>
            <Text style={styles.emptyText}>{t('predictions.empty')}</Text>
          </View>
        ) : null}

        {prediction ? (
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>{t('predictions.recommendedWinner')}</Text>
            <Text style={styles.primaryValue}>
              {prediction.winner?.name || prediction.winner?.comment || t('predictions.noPick')}
            </Text>
            {typeof prediction.win_or_draw === 'boolean' ? (
              <Text style={styles.muted}>
                {t('predictions.winOrDraw')}: {prediction.win_or_draw ? t('analysis.marketYes') : t('analysis.marketNo')}
              </Text>
            ) : null}

            {prediction.advice ? (
              <View style={styles.block}>
                <Text style={styles.sectionLabel}>{t('predictions.advice')}</Text>
                <Text style={styles.text}>{prediction.advice}</Text>
              </View>
            ) : null}

            {prediction.under_over ? (
              <View style={styles.block}>
                <Text style={styles.sectionLabel}>{t('predictions.underOver')}</Text>
                <Text style={styles.text}>{prediction.under_over}</Text>
              </View>
            ) : null}

            {prediction.goals ? (
              <View style={styles.row}>
                <Text style={styles.sectionLabel}>{t('predictions.goals')}</Text>
                <Text style={styles.text}>
                  {t('analysis.marketHome')} {prediction.goals.home ?? '-'} / {t('analysis.marketAway')} {prediction.goals.away ?? '-'}
                </Text>
              </View>
            ) : null}

            {prediction.percent ? (
              <View style={styles.block}>
                <Text style={styles.sectionLabel}>{t('predictions.winProbabilities')}</Text>
                <Text style={styles.text}>{t('analysis.marketHome')}: {prediction.percent.home ?? '-'}</Text>
                <Text style={styles.text}>{t('analysis.marketDraw')}: {prediction.percent.draw ?? '-'}</Text>
                <Text style={styles.text}>{t('analysis.marketAway')}: {prediction.percent.away ?? '-'}</Text>
              </View>
            ) : null}
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
  sectionLabel: {
    color: COLORS.neonViolet,
    fontWeight: '800',
  },
  primaryValue: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '800',
  },
  block: {
    gap: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  text: {
    color: COLORS.text,
  },
  muted: {
    color: COLORS.muted,
  },
});

export default PredictionsScreen;
