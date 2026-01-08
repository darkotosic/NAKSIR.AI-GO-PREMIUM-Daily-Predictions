import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { AiAnalysisError, requestAiAnalysis } from '@api/analysis';
import type { LiveMatchAnalysis } from '@/types/analysis';
import { RootStackParamList } from '@navigation/types';
import TelegramBanner from '@components/TelegramBanner';

const COLORS = {
  background: '#040312',
  card: '#0b0c1f',
  neonPurple: '#b06bff',
  neonViolet: '#8b5cf6',
  neonBlue: '#38bdf8',
  text: '#f8fafc',
  muted: '#a5b4fc',
  borderSoft: '#1f1f3a',
};

const LiveAIAnalysisScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'LiveAIAnalysis'>>();
  const fixtureId = route.params?.fixtureId;
  const summary = route.params?.summary;
  const [analysisPayload, setAnalysisPayload] = useState<LiveMatchAnalysis | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [error, setError] = useState<AiAnalysisError | null>(null);
  const [cacheStatus, setCacheStatus] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const isGeneratingRef = useRef(false);

  const teamNames = useMemo(() => {
    const home = summary?.teams?.home?.name || 'Home';
    const away = summary?.teams?.away?.name || 'Away';
    return { home, away };
  }, [summary?.teams?.home?.name, summary?.teams?.away?.name]);

  const scoreLabel = useMemo(() => {
    const homeGoals = summary?.goals?.home ?? '-';
    const awayGoals = summary?.goals?.away ?? '-';
    return `${homeGoals} - ${awayGoals}`;
  }, [summary?.goals?.away, summary?.goals?.home]);

  const kickoffLabel = summary?.kickoff
    ? new Date(summary.kickoff).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '--:--';

  const formatPct = (value?: number | null) =>
    value === null || value === undefined ? '-' : `${value}%`;

  const goBackToMatch = () => {
    if (fixtureId) {
      navigation.navigate('MatchDetails', { fixtureId, summary });
    } else {
      navigation.navigate('MainTabs');
    }
  };

  const startLiveAnalysis = useCallback(async () => {
    if (!fixtureId || isGeneratingRef.current) return;
    const requestId = requestIdRef.current;
    isGeneratingRef.current = true;
    setStatus('loading');
    setError(null);

    try {
      const res = await requestAiAnalysis({ fixtureId, useTrialReward: false, live: true });
      if (requestId !== requestIdRef.current) {
        return;
      }
      const cacheHeader = res.headers?.['x-cache'];
      if (cacheHeader) {
        setCacheStatus(cacheHeader.toUpperCase());
      }
      if (res.status === 200) {
        setAnalysisPayload(res.data as LiveMatchAnalysis);
        setStatus('ready');
        return;
      }
      setStatus('error');
      setError(new AiAnalysisError('Live AI analysis failed. Please try again.'));
    } catch (err) {
      if (requestId !== requestIdRef.current) {
        return;
      }
      const normalized = err as AiAnalysisError;
      setStatus('error');
      setError(normalized);
    } finally {
      isGeneratingRef.current = false;
    }
  }, [fixtureId]);

  useEffect(() => {
    requestIdRef.current += 1;
    setAnalysisPayload(null);
    setCacheStatus(null);
    setError(null);
    setStatus('idle');
    if (fixtureId) {
      startLiveAnalysis();
    }
  }, [fixtureId, startLiveAnalysis]);

  const analysis = (analysisPayload as any)?.analysis ?? analysisPayload;
  const goalsRemaining = (analysis as any)?.goals_remaining ?? {};
  const matchWinner = (analysis as any)?.match_winner ?? {};
  const summaryText = analysis?.summary || 'Live AI summary is not yet available.';
  const yellowCardsSummary = analysis?.yellow_cards_summary || 'No yellow card insights yet.';
  const cornersSummary = analysis?.corners_summary || 'No corners insights yet.';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <TelegramBanner />
        <TouchableOpacity style={styles.backButton} onPress={goBackToMatch}>
          <Text style={styles.backIcon}>←</Text>
          <Text style={styles.backLabel}>Back to match</Text>
        </TouchableOpacity>

        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>Naksir Live AI Analysis</Text>
          <Text style={styles.heroSubtitle}>{summary?.league?.name || 'Live Match'}</Text>
          <View style={styles.heroScoreRow}>
            <Text style={styles.heroTeam}>{teamNames.home}</Text>
            <View style={styles.heroScorePill}>
              <Text style={styles.heroScore}>{scoreLabel}</Text>
              <Text style={styles.heroStatus}>{summary?.status_long || summary?.status || 'Live'}</Text>
            </View>
            <Text style={styles.heroTeam}>{teamNames.away}</Text>
          </View>
          <Text style={styles.heroMeta}>Kickoff {kickoffLabel}</Text>
        </View>

        {cacheStatus && __DEV__ ? (
          <Text style={styles.cacheDebug}>Cache status: {cacheStatus}</Text>
        ) : null}

        {status === 'loading' && (
          <View style={styles.loadingState}>
            <ActivityIndicator color={COLORS.neonPurple} size="large" />
            <Text style={styles.loadingText}>Analyzing live events, momentum, and stats...</Text>
          </View>
        )}

        {status === 'ready' && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Live summary</Text>
            <Text style={styles.bodyText}>{summaryText}</Text>

            <View style={styles.sectionBlock}>
              <Text style={styles.sectionTitle}>Goals outlook</Text>
              <Text style={styles.bodyText}>
                There will be at least 1 more goal: {formatPct(goalsRemaining.at_least_1_more_pct)}
                {'\n'}There will be at least 2 more goals: {formatPct(goalsRemaining.at_least_2_more_pct)}
              </Text>
            </View>

            <View style={styles.sectionBlock}>
              <Text style={styles.sectionTitle}>Match winner</Text>
              <Text style={styles.bodyText}>
                Home: {formatPct(matchWinner.home_pct)} | Draw: {formatPct(matchWinner.draw_pct)} | Away:{' '}
                {formatPct(matchWinner.away_pct)}
              </Text>
            </View>

            <View style={styles.sectionBlock}>
              <Text style={styles.sectionTitle}>Yellow cards</Text>
              <Text style={styles.bodyText}>{yellowCardsSummary}</Text>
            </View>

            <View style={styles.sectionBlock}>
              <Text style={styles.sectionTitle}>Corners</Text>
              <Text style={styles.bodyText}>{cornersSummary}</Text>
            </View>

            {analysis?.disclaimer ? (
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionTitle}>Disclaimer</Text>
                <Text style={styles.bodyText}>{analysis.disclaimer}</Text>
              </View>
            ) : null}
          </View>
        )}

        {status === 'error' && (
          <View style={styles.card}>
            <Text style={styles.errorText}>
              {error?.message || 'Live AI analysis is temporarily unavailable. Please try again.'}
            </Text>
            <TouchableOpacity style={styles.retryButton} onPress={startLiveAnalysis}>
              <Text style={styles.retryButtonLabel}>Try again</Text>
            </TouchableOpacity>
          </View>
        )}
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
    paddingBottom: 32,
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
    marginBottom: 12,
  },
  backIcon: {
    color: COLORS.text,
    fontSize: 16,
  },
  backLabel: {
    color: COLORS.text,
    fontWeight: '700',
  },
  heroCard: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.neonViolet,
    shadowColor: COLORS.neonViolet,
    shadowOpacity: 0.7,
    shadowRadius: 18,
    marginBottom: 16,
  },
  heroTitle: {
    color: COLORS.text,
    fontWeight: '900',
    fontSize: 18,
  },
  heroSubtitle: {
    color: COLORS.neonBlue,
    marginTop: 4,
    fontWeight: '700',
  },
  heroScoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  heroTeam: {
    color: COLORS.text,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  heroScorePill: {
    backgroundColor: '#0c1028',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.neonPurple,
  },
  heroScore: {
    color: COLORS.neonPurple,
    fontWeight: '900',
    fontSize: 18,
  },
  heroStatus: {
    color: COLORS.muted,
    fontWeight: '600',
    marginTop: 2,
    fontSize: 12,
  },
  heroMeta: {
    color: COLORS.muted,
    marginTop: 12,
    textAlign: 'center',
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderColor: COLORS.neonPurple,
    borderWidth: 1.2,
    shadowColor: COLORS.neonPurple,
    shadowOpacity: 0.6,
    shadowRadius: 16,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '800',
    marginTop: 12,
    marginBottom: 4,
  },
  sectionBlock: {
    marginTop: 10,
  },
  bodyText: {
    color: '#e5e7eb',
    marginTop: 4,
    lineHeight: 20,
  },
  loadingState: {
    alignItems: 'center',
    marginBottom: 16,
  },
  loadingText: {
    color: COLORS.muted,
    marginTop: 12,
    textAlign: 'center',
  },
  cacheDebug: {
    color: COLORS.muted,
    marginBottom: 10,
    fontSize: 12,
    fontWeight: '600',
  },
  errorText: {
    color: '#fca5a5',
    fontWeight: '700',
  },
  retryButton: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.neonPurple,
    alignSelf: 'flex-start',
  },
  retryButtonLabel: {
    color: COLORS.text,
    fontWeight: '700',
  },
});

export default LiveAIAnalysisScreen;
