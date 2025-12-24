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
import { DrawerNavigationProp } from '@react-navigation/drawer';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { getAiAnalysis, requestAiAnalysis, AiAnalysisError } from '@api/analysis';
import type { MatchAnalysis } from '@naksir-types/analysis';
import { RootDrawerParamList } from '@navigation/types';
import { trackEvent } from '@lib/tracking';

const COLORS = {
  background: '#040312',
  card: '#0b0c1f',
  neonPurple: '#b06bff',
  text: '#f8fafc',
  muted: '#a5b4fc',
  borderSoft: '#1f1f3a',
};

const AIAnalysisScreen: React.FC = () => {
  const navigation = useNavigation<DrawerNavigationProp<RootDrawerParamList>>();
  const route = useRoute<RouteProp<RootDrawerParamList, 'AIAnalysis'>>();
  const fixtureId = route.params?.fixtureId;
  const summary = route.params?.summary;
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [analysisPayloadState, setAnalysisPayload] = useState<MatchAnalysis | null>(null);
  const [status, setStatus] = useState<
    'idle' | 'loading' | 'generating' | 'ready' | 'missing' | 'error'
  >('idle');
  const [error, setError] = useState<AiAnalysisError | null>(null);
  const [cacheStatus, setCacheStatus] = useState<string | null>(null);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pollInFlightRef = useRef(false);
  const requestIdRef = useRef(0);

  const depthWords = useMemo(() => 'NAKSIR GO IN DEPTH OF DATA'.split(' '), []);
  const depthWordAnim = useMemo(() => depthWords.map(() => new Animated.Value(0)), [depthWords]);
  const loadingBar = useRef(new Animated.Value(0)).current;
  const isGenerating = status === 'loading' || status === 'generating';

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
      .toString()
      .padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

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
      depthWordAnim.forEach((anim) => anim.setValue(0));
      loadingBar.setValue(0);
      return;
    }

    const wordLoops = depthWordAnim.map((anim, idx) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 1,
            duration: 900,
            delay: idx * 120,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0.2,
            duration: 600,
            useNativeDriver: true,
          }),
        ]),
      ),
    );
    wordLoops.forEach((loop) => loop.start());

    const barLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(loadingBar, {
          toValue: 1,
          duration: 1600,
          useNativeDriver: false,
        }),
        Animated.timing(loadingBar, {
          toValue: 0,
          duration: 400,
          useNativeDriver: false,
        }),
      ]),
    );

    barLoop.start();

    return () => {
      wordLoops.forEach((loop) => loop.stop && loop.stop());
      barLoop.stop && barLoop.stop();
    };
  }, [depthWordAnim, loadingBar, isGenerating]);

  useEffect(() => {
    if (fixtureId) {
      trackEvent('OpenAnalysis', { fixture_id: fixtureId });
    }
  }, [fixtureId]);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    pollInFlightRef.current = false;
  }, []);

  const pollForAnalysis = useCallback((requestId: number) => {
    if (pollTimerRef.current || !fixtureId) return;
    const startedAt = Date.now();
    const activeFixtureId = fixtureId;

    pollTimerRef.current = setInterval(async () => {
      if (pollInFlightRef.current) return;
      pollInFlightRef.current = true;
      try {
        const res = await getAiAnalysis(activeFixtureId);
        if (requestId !== requestIdRef.current) {
          return;
        }
        const cacheHeader = res.headers?.['x-cache'];
        if (cacheHeader) {
          setCacheStatus(cacheHeader.toUpperCase());
        }

        if (res.status === 200) {
          setAnalysisPayload(res.data);
          setStatus('ready');
          stopPolling();
          return;
        }

        if (res.status === 202) {
          setStatus('generating');
        }
      } catch (err) {
        if (requestId !== requestIdRef.current) {
          return;
        }
        const normalized = err as AiAnalysisError;
        setStatus('error');
        setError(normalized);
        stopPolling();
      } finally {
        pollInFlightRef.current = false;
      }

      if (requestId === requestIdRef.current && Date.now() - startedAt > 60000) {
        setStatus('error');
        setError(new AiAnalysisError('AI analysis is taking longer than expected.'));
        stopPolling();
      }
    }, 2500);
  }, [fixtureId, stopPolling]);

  const startGeneration = useCallback(async () => {
    if (!fixtureId || isGenerating) return;
    const requestId = requestIdRef.current;
    setStatus('generating');
    setError(null);
    try {
      const res = await requestAiAnalysis({ fixtureId, useTrialReward: false });
      if (requestId !== requestIdRef.current) {
        return;
      }
      const cacheHeader = res.headers?.['x-cache'];
      if (cacheHeader) {
        setCacheStatus(cacheHeader.toUpperCase());
      }

      if (res.status === 200) {
        setAnalysisPayload(res.data);
        setStatus('ready');
        stopPolling();
        return;
      }

      if (res.status === 202) {
        setStatus('generating');
        pollForAnalysis(requestId);
        return;
      }

      setStatus('error');
      setError(new AiAnalysisError('AI analysis failed. Please try again.'));
    } catch (err) {
      if (requestId !== requestIdRef.current) {
        return;
      }
      const normalized = err as AiAnalysisError;
      setStatus('error');
      setError(normalized);
    }
  }, [fixtureId, isGenerating, pollForAnalysis, stopPolling]);

  const readCached = useCallback(async () => {
    if (!fixtureId) return;
    const requestId = requestIdRef.current;
    setStatus('loading');
    setError(null);
    try {
      const res = await getAiAnalysis(fixtureId);
      if (requestId !== requestIdRef.current) {
        return;
      }
      const cacheHeader = res.headers?.['x-cache'];
      if (cacheHeader) {
        setCacheStatus(cacheHeader.toUpperCase());
      }

      if (res.status === 200) {
        setAnalysisPayload(res.data);
        setStatus('ready');
        return;
      }

      if (res.status === 202) {
        setStatus('generating');
        pollForAnalysis(requestId);
      }
    } catch (err) {
      if (requestId !== requestIdRef.current) {
        return;
      }
      const normalized = err as AiAnalysisError;
      if (normalized.status === 404) {
        setCacheStatus('MISS');
        setStatus('missing');
        return;
      }
      setStatus('error');
      setError(normalized);
    }
  }, [fixtureId, pollForAnalysis]);

  useEffect(() => {
    stopPolling();
    requestIdRef.current += 1;
    setAnalysisPayload(null);
    setCacheStatus(null);
    setError(null);
    setStatus('idle');
    if (fixtureId) {
      readCached();
    }
    return () => stopPolling();
  }, [fixtureId, readCached, stopPolling]);

  const analysisPayload = analysisPayloadState;
  const analysis = (analysisPayload as any)?.analysis || analysisPayload;
  const summaryText =
    analysis?.preview || analysis?.summary || 'AI has insufficient data for a summary.';
  const keyFactors =
    Array.isArray((analysis as any)?.key_factors) && (analysis as any)?.key_factors.length > 0
      ? (analysis as any).key_factors
      : null;
  const valueBet = (analysis as any)?.value_bet;
  const correctScores =
    Array.isArray((analysis as any)?.correct_scores_top2) &&
    (analysis as any)?.correct_scores_top2.length > 0
      ? (analysis as any)?.correct_scores_top2
      : null;
  const cornerProbabilities = (analysis as any)?.corners_probabilities;
  const cardProbabilities = (analysis as any)?.cards_probabilities;
  const oddsProbabilities =
    (analysisPayload as any)?.odds_probabilities || (analysis as any)?.odds_probabilities;
  const risks =
    Array.isArray((analysis as any)?.risk_flags) && (analysis as any)?.risk_flags.length > 0
      ? (analysis as any)?.risk_flags
      : null;

  const formatPct = (value?: number | null) =>
    value === null || value === undefined ? '-' : `${value}%`;

  const goBackToMatch = () => {
    if (fixtureId) {
      navigation.navigate('MatchDetails', { fixtureId, summary });
    } else {
      navigation.navigate('TodayMatches');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <TouchableOpacity style={styles.backButton} onPress={goBackToMatch}>
          <Text style={styles.backIcon}>←</Text>
          <Text style={styles.backLabel}>Back to match</Text>
        </TouchableOpacity>

        {__DEV__ && cacheStatus ? (
          <Text style={styles.cacheDebug}>Cache status: {cacheStatus}</Text>
        ) : null}

        {isGenerating && (
          <View style={styles.loadingState}>
            <View style={styles.depthWordRow}>
              {depthWords.map((word, idx) => {
                const animatedStyle = {
                  opacity: depthWordAnim[idx].interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.35, 1],
                  }),
                  transform: [
                    {
                      translateY: depthWordAnim[idx].interpolate({
                        inputRange: [0, 1],
                        outputRange: [10, -6],
                      }),
                    },
                    {
                      scale: depthWordAnim[idx].interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.94, 1.08],
                      }),
                    },
                  ],
                };

                return (
                  <Animated.Text key={`${word}-${idx}`} style={[styles.depthWord, animatedStyle]}>
                    {word}
                  </Animated.Text>
                );
              })}
            </View>
            <ActivityIndicator color={COLORS.neonPurple} size="large" style={styles.loader} />
            <Text style={styles.loadingText}>
              Analyzing odds, recent team form, goals trends, h2h, standings...
            </Text>
            <View style={styles.loadingBarTrack}>
              <Animated.View
                style={[
                  styles.loadingBarFill,
                  {
                    width: loadingBar.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['18%', '100%'],
                    }),
                  },
                ]}
              />
            </View>
            <View style={styles.timerPill}>
              <Text style={styles.timerLabel}>Time elapsed</Text>
              <Text style={styles.timerValue}>{formatTimer(elapsedSeconds)}</Text>
            </View>
          </View>
        )}

        {analysisPayloadState ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Summary</Text>
            <Text style={styles.bodyText}>{summaryText}</Text>

            <Text style={styles.sectionTitle}>Key factors</Text>
            <Text style={styles.bodyText}>
              {keyFactors ? '• ' + keyFactors.join('\n• ') : 'No key factors highlighted.'}
            </Text>

            {oddsProbabilities && (
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionTitle}>Implied odds probabilities</Text>
                <Text style={styles.bodyText}>
                  Match winner: {'\n'}Home: {formatPct(oddsProbabilities.match_winner?.home)} | Draw:{' '}
                  {formatPct(oddsProbabilities.match_winner?.draw)} | Away: {formatPct(oddsProbabilities.match_winner?.away)}
                </Text>
                <Text style={styles.bodyText}>
                  Double chance: {'\n'}12: {formatPct(oddsProbabilities.double_chance?.['12'])} | 1X:{' '}
                  {formatPct(oddsProbabilities.double_chance?.['1X'])} | X2:{' '}
                  {formatPct(oddsProbabilities.double_chance?.['X2'])}
                </Text>
                <Text style={styles.bodyText}>
                  BTTS: Yes: {formatPct(oddsProbabilities.btts?.yes)} | No: {formatPct(oddsProbabilities.btts?.no)}
                </Text>
                <Text style={styles.bodyText}>HT over 0.5: {formatPct(oddsProbabilities.ht_over_0_5)}</Text>
                <Text style={styles.bodyText}>
                  Team over 0.5: Home {formatPct(oddsProbabilities.home_goals_over_0_5)} | Away{' '}
                  {formatPct(oddsProbabilities.away_goals_over_0_5)}
                </Text>
                <Text style={styles.bodyText}>
                  Totals (Over): O1.5 {formatPct(oddsProbabilities.totals?.over_1_5)} | O2.5{' '}
                  {formatPct(oddsProbabilities.totals?.over_2_5)} | O3.5 {formatPct(oddsProbabilities.totals?.over_3_5)}
                </Text>
                <Text style={styles.bodyText}>
                  Totals (Under): U3.5 {formatPct(oddsProbabilities.totals?.under_3_5)} | U4.5{' '}
                  {formatPct(oddsProbabilities.totals?.under_4_5)}
                </Text>
              </View>
            )}

            {valueBet ? (
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionTitle}>Value bets</Text>
                <Text style={styles.bodyText}>
                  Market: {valueBet.market}{'\n'}Selection: {valueBet.selection}{'\n'}Success probability:{' '}
                  {formatPct(valueBet.model_probability_pct)}
                </Text>
              </View>
            ) : null}

            {correctScores ? (
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionTitle}>Most probable correct scores</Text>
                <Text style={styles.bodyText}>
                  {correctScores
                    .map((item: any, idx: number) =>
                      `${idx + 1}. ${item.score || 'N/A'} (${formatPct(item.probability_pct)})`,
                    )
                    .join('\n')}
                </Text>
              </View>
            ) : null}

            {cornerProbabilities ? (
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionTitle}>Corners probability</Text>
                <Text style={styles.bodyText}>
                  Over 8.5: {formatPct(cornerProbabilities.over_8_5_pct)}{'\n'}Over 9.5:{' '}
                  {formatPct(cornerProbabilities.over_9_5_pct)}{'\n'}Over 10.5:{' '}
                  {formatPct(cornerProbabilities.over_10_5_pct)}
                </Text>
              </View>
            ) : null}

            {cardProbabilities ? (
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionTitle}>Yellow cards probability</Text>
                <Text style={styles.bodyText}>
                  Over 3.5: {formatPct(cardProbabilities.over_3_5_pct)}{'\n'}Over 4.5:{' '}
                  {formatPct(cardProbabilities.over_4_5_pct)}{'\n'}Over 5.5:{' '}
                  {formatPct(cardProbabilities.over_5_5_pct)}
                </Text>
              </View>
            ) : null}

            <View style={styles.sectionBlock}>
              <Text style={styles.sectionTitle}>Risks</Text>
              <Text style={styles.bodyText}>
                {risks ? '• ' + risks.join('\n• ') : 'No major risks flagged.'}
              </Text>
            </View>

            {analysis?.disclaimer ? (
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionTitle}>Disclaimer</Text>
                <Text style={styles.bodyText}>{analysis.disclaimer}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {status === 'missing' && (
          <View style={styles.card}>
            <Text style={styles.bodyText}>
              No cached AI analysis yet for this match. Run it once to generate the report.
            </Text>
            <TouchableOpacity
              style={[styles.retryButton, isGenerating && styles.retryButtonDisabled]}
              onPress={startGeneration}
              disabled={isGenerating}
            >
              <Text style={styles.retryButtonLabel}>Run analysis</Text>
            </TouchableOpacity>
          </View>
        )}

        {status === 'error' && (
          <View style={styles.card}>
            <Text style={styles.errorText}>
              {error?.message || 'AI analysis is temporarily unavailable. Please try again.'}
            </Text>
            <TouchableOpacity
              style={[styles.retryButton, isGenerating && styles.retryButtonDisabled]}
              onPress={startGeneration}
              disabled={isGenerating}
            >
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
  listItem: {
    color: '#cbd5e1',
    marginTop: 4,
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
  retryButtonDisabled: {
    opacity: 0.5,
  },
  retryButtonLabel: {
    color: COLORS.text,
    fontWeight: '700',
  },
  loadingState: {
    alignItems: 'center',
    marginBottom: 16,
  },
  loader: {
    marginVertical: 24,
  },
  depthWordRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    rowGap: 8,
    columnGap: 8,
  },
  depthWord: {
    color: COLORS.neonPurple,
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(176,107,255,0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  loadingText: {
    color: COLORS.muted,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 12,
  },
  loadingBarTrack: {
    marginTop: 12,
    width: '100%',
    height: 10,
    borderRadius: 999,
    backgroundColor: '#0b1024',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
  },
  loadingBarFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: COLORS.neonPurple,
    shadowColor: COLORS.neonPurple,
    shadowOpacity: 0.9,
    shadowRadius: 12,
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
});

export default AIAnalysisScreen;
