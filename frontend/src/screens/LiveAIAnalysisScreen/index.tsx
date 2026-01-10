import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
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
import { LoadingState } from '@components/LoadingState';
import { padTwoDigits } from '@lib/time';

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
  const originTab = route.params?.originTab ?? 'TodayMatches';
  const fromMatchDetails = route.params?.fromMatchDetails ?? false;
  const [analysisPayload, setAnalysisPayload] = useState<LiveMatchAnalysis | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [error, setError] = useState<AiAnalysisError | null>(null);
  const [cacheStatus, setCacheStatus] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const requestIdRef = useRef(0);
  const isGeneratingRef = useRef(false);
  const isGenerating = status === 'loading';

  const teamNames = useMemo(() => {
    const home = summary?.teams?.home?.name || 'Home';
    const away = summary?.teams?.away?.name || 'Away';
    return { home, away };
  }, [summary?.teams?.home?.name, summary?.teams?.away?.name]);

  const statusShort = summary?.status?.toUpperCase() ?? '';
  const isFinishedMatch = new Set(['FT', 'AET', 'PEN']).has(statusShort);

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

  const statusLabelMap: Record<string, string> = {
    '1H': 'First Half',
    '2H': 'Second Half',
    HT: 'Half Time',
    ET: 'Extra Time',
    P: 'Penalties',
    INT: 'Break',
  };
  const liveStatusLabel = statusLabelMap[statusShort] ?? summary?.status_long ?? 'Live';
  const heroStatusLabel = isFinishedMatch ? 'Finished' : liveStatusLabel;

  const liveWords = useMemo(() => 'NAKSIR AI LIVE STATS ANALYZER'.split(' '), []);
  const liveWordAnim = useMemo(() => liveWords.map(() => new Animated.Value(0)), [liveWords]);

  const formatPct = (value?: number | null) =>
    value === null || value === undefined ? '-' : `${value}%`;

  const goBackToMatch = () => {
    if (!fixtureId) {
      navigation.navigate('TodayMatches');
      return;
    }
    if (fromMatchDetails && navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.replace('MatchDetails', { fixtureId, summary, originTab });
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

  useEffect(() => {
    let timer: NodeJS.Timeout | undefined;
    if (isGenerating) {
      setElapsedSeconds(0);
      timer = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isGenerating]);

  useEffect(() => {
    if (!isGenerating) {
      liveWordAnim.forEach((anim) => anim.setValue(0));
      return;
    }

    const loops = liveWordAnim.map((anim, idx) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 1,
            duration: 900,
            delay: idx * 140,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),
        ]),
      ),
    );

    loops.forEach((loop) => loop.start());

    return () => loops.forEach((loop) => loop.stop && loop.stop());
  }, [isGenerating, liveWordAnim]);

  const formatTimer = (seconds: number) => {
    const mins = padTwoDigits(Math.floor(seconds / 60));
    const secs = padTwoDigits(seconds % 60);
    return `${mins}:${secs}`;
  };

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

        {summary ? (
          <View style={styles.detailHero}>
            <View style={styles.heroTopRow}>
              <View style={styles.heroLeagueBlock}>
                <Text style={styles.heroLeagueText}>{summary?.league?.name || 'Live Match'}</Text>
                <Text style={styles.heroMetaText}>
                  {summary?.league?.country || 'Country'} • Kickoff {kickoffLabel}
                </Text>
              </View>
              <View style={styles.heroStatusPill}>
                <Text style={styles.heroStatusScore}>{scoreLabel}</Text>
                <Text style={styles.heroStatusText}>{heroStatusLabel}</Text>
              </View>
            </View>

            <View style={styles.heroTeamsRow}>
              <View style={styles.heroTeamCard}>
                <Text style={styles.heroTeamName} numberOfLines={1}>
                  {teamNames.home}
                </Text>
              </View>
              <View style={styles.heroTeamCard}>
                <Text style={[styles.heroTeamName, styles.heroTeamNameRight]} numberOfLines={1}>
                  {teamNames.away}
                </Text>
              </View>
            </View>
          </View>
        ) : null}

        {cacheStatus && __DEV__ ? (
          <Text style={styles.cacheDebug}>Cache status: {cacheStatus}</Text>
        ) : null}

        {status === 'loading' && (
          <View style={styles.loadingState}>
            <View style={styles.liveWordRow}>
              {liveWords.map((word, idx) => {
                const animatedStyle = {
                  opacity: liveWordAnim[idx].interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.35, 1],
                  }),
                  transform: [
                    { perspective: 800 },
                    {
                      rotateY: liveWordAnim[idx].interpolate({
                        inputRange: [0, 1],
                        outputRange: ['-15deg', '15deg'],
                      }),
                    },
                    {
                      translateY: liveWordAnim[idx].interpolate({
                        inputRange: [0, 1],
                        outputRange: [6, -6],
                      }),
                    },
                  ],
                };

                return (
                  <Animated.Text key={`${word}-${idx}`} style={[styles.liveWord, animatedStyle]}>
                    {word}
                  </Animated.Text>
                );
              })}
            </View>
            <ActivityIndicator color={COLORS.neonPurple} size="large" style={styles.loader} />
            <Text style={styles.loadingText}>Analyzing live events, momentum, and stats...</Text>
            <View style={styles.timerPill}>
              <Text style={styles.timerLabel}>Time elapsed</Text>
              <Text style={styles.timerValue}>{formatTimer(elapsedSeconds)}</Text>
            </View>
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
  detailHero: {
    backgroundColor: '#0c0f25',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1.6,
    borderColor: COLORS.neonViolet,
    marginBottom: 16,
    shadowColor: COLORS.neonPurple,
    shadowOpacity: 0.65,
    shadowRadius: 20,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  heroLeagueBlock: {
    flex: 1,
  },
  heroLeagueText: {
    color: COLORS.text,
    fontWeight: '800',
    fontSize: 16,
  },
  heroMetaText: {
    color: COLORS.muted,
    marginTop: 4,
    fontSize: 12,
  },
  heroStatusPill: {
    backgroundColor: '#0c1028',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.neonPurple,
    minWidth: 90,
  },
  heroStatusScore: {
    color: COLORS.neonPurple,
    fontWeight: '900',
    fontSize: 16,
  },
  heroStatusText: {
    color: COLORS.muted,
    marginTop: 4,
    fontSize: 12,
    textAlign: 'center',
  },
  heroTeamsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  heroTeamCard: {
    flex: 1,
    backgroundColor: '#0f162b',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
  },
  heroTeamName: {
    color: COLORS.text,
    fontWeight: '800',
    fontSize: 14,
  },
  heroTeamNameRight: {
    textAlign: 'right',
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
  liveWordRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    rowGap: 8,
    marginBottom: 16,
  },
  liveWord: {
    color: COLORS.neonBlue,
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(56,189,248,0.75)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  loader: {
    marginBottom: 12,
  },
  loadingText: {
    color: COLORS.muted,
    marginTop: 12,
    textAlign: 'center',
  },
  timerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0c1028',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 12,
    borderWidth: 1,
    borderColor: COLORS.neonPurple,
  },
  timerLabel: {
    color: COLORS.muted,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  timerValue: {
    color: COLORS.neonPurple,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
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
