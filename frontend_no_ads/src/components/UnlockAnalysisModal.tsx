import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@navigation/types';
import { useRewardedAd } from '@ads/useRewardedAd';
import { useInterstitialAdGate } from '@ads/useInterstitialAdGate';

const COLORS = {
  backdrop: 'rgba(0,0,0,0.65)',
  card: '#0b0c1f',
  text: '#f8fafc',
  muted: '#a5b4fc',
  neonViolet: '#8b5cf6',
  borderSoft: '#1f1f3a',
  danger: '#fb7185',
};

type Props = {
  visible: boolean;
  onCancel: () => void;
  onUnlocked: () => void;
};

const REWARDED_FALLBACK_MS = 5000;

export default function UnlockAnalysisModal({ visible, onCancel, onUnlocked }: Props) {
  const { isAvailable, isLoaded, isLoading, load, show, reward, resetReward } = useRewardedAd();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  // Interstitial “gate” (resolve kada se ad zatvori ili timeout)
  const { showAd: showInterstitialGate, isSupported: isInterstitialSupported } = useInterstitialAdGate({
    timeoutMs: 12000,
  });

  const [ctaPressed, setCtaPressed] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  const canShowRewarded = useMemo(() => Boolean(isAvailable), [isAvailable]);

  // Refs da izbegnemo stale state u timeout callback-u
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resolvedRef = useRef(false);
  const rewardedLoadedRef = useRef(false);

  useEffect(() => {
    rewardedLoadedRef.current = Boolean(isLoaded);
  }, [isLoaded]);

  const clearFallbackTimer = useCallback(() => {
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
  }, []);

  const unlockOnce = useCallback(() => {
    if (resolvedRef.current) return;
    resolvedRef.current = true;
    clearFallbackTimer();
    setHint(null);
    onUnlocked();
  }, [onUnlocked, clearFallbackTimer, setHint]);

  // Reset state kad se modal otvori
  useEffect(() => {
    if (!visible) return;

    resolvedRef.current = false;
    setCtaPressed(false);
    setHint(null);
    clearFallbackTimer();

    // pre-load rewarded čim se modal pojavi
    if (isAvailable) load();
  }, [visible, load, isAvailable, clearFallbackTimer]);

  // Cleanup kad se modal zatvori (bitno za timers)
  useEffect(() => {
    if (visible) return;
    clearFallbackTimer();
    resolvedRef.current = false;
    setCtaPressed(false);
    setHint(null);
  }, [visible, clearFallbackTimer]);

  // Ako user klikne, a rewarded se u međuvremenu učita -> prikaži rewarded (osim ako je fallback već odradio unlock)
  useEffect(() => {
    if (!visible) return;
    if (resolvedRef.current) return;

    if (ctaPressed && isLoaded) {
      show();
    }
  }, [ctaPressed, isLoaded, show, visible]);

  // Rewarded reward event -> unlock
  useEffect(() => {
    if (!visible) return;
    if (reward) {
      unlockOnce();
      resetReward?.();
    }
  }, [reward, unlockOnce, resetReward, visible]);

  const runInterstitialFallback = useCallback(async () => {
    if (resolvedRef.current) return;

    if (!isInterstitialSupported) {
      setHint('Ad is not available right now. Please try again.');
      return;
    }

    setHint('Video ad unavailable — opening alternative ad');

    // Interstitial je “gate”: kad se zatvori, unlock
    const shown = await showInterstitialGate();
    if (shown) {
      unlockOnce();
    } else {
      setHint('Ad is not available right now. Please try again.');
    }
  }, [isInterstitialSupported, showInterstitialGate, unlockOnce, setHint]);

  const scheduleFallback = useCallback(() => {
    clearFallbackTimer();

    fallbackTimerRef.current = setTimeout(() => {
      // Ako rewarded nije loaded u roku od 5s -> automatski interstitial
      if (resolvedRef.current) return;
      if (rewardedLoadedRef.current) return;

      runInterstitialFallback();
    }, REWARDED_FALLBACK_MS);
  }, [clearFallbackTimer, runInterstitialFallback]);

  const onViewAd = () => {
    setHint(null);

    // Ako rewarded nije dostupan uopšte -> odmah fallback na interstitial (nema čekanja)
    if (!canShowRewarded) {
      runInterstitialFallback();
      return;
    }

    setCtaPressed(true);

    // Ako je već loaded, prikaži odmah
    if (isLoaded) {
      show();
      return;
    }

    // Start loading rewarded + start 5s timer
    load();
    scheduleFallback();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>UNLOCK ANALYSIS</Text>

          <Text style={styles.body}>
            To gain access to the full in-depth Naksir AI analysis, you need to watch a video ad. One match analysis will be unlocked.
          </Text>

          {hint ? <Text style={styles.hint}>{hint}</Text> : null}

          <View style={styles.row}>
            <TouchableOpacity
              onPress={onViewAd}
              activeOpacity={0.9}
              style={[styles.primaryBtn, (isLoading && canShowRewarded) && styles.primaryBtnDisabled]}
              // Ne blokiramo dugme kad rewarded “load-uje”, jer fallback ide automatski posle 5s
              disabled={false}
            >
              {(isLoading && canShowRewarded) ? (
                <View style={styles.btnInline}>
                  <ActivityIndicator />
                  <Text style={styles.primaryText}> Loading…</Text>
                </View>
              ) : (
                <Text style={styles.primaryText}>VIEW VIDEO AD</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={onCancel} activeOpacity={0.9} style={styles.secondaryBtn}>
              <Text style={styles.secondaryText}>CANCEL</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={() => {
              onCancel();
              navigation.navigate('Subscriptions');
            }}
            activeOpacity={0.9}
            style={styles.premiumBar}
          >
            <Text style={styles.premiumBarPrimary}>GO PREMIUM</Text>
            <Text style={styles.premiumBarSecondary}>NO ADS</Text>
          </TouchableOpacity>

          <Text style={styles.micro}>
            Rewarded ad required per match. After completion, this match analysis stays unlocked.
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: COLORS.backdrop,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    padding: 16,
  },
  title: {
    color: COLORS.text,
    fontWeight: '900',
    fontSize: 16,
    letterSpacing: 0.6,
  },
  body: {
    color: COLORS.muted,
    marginTop: 10,
    lineHeight: 18,
  },
  hint: {
    marginTop: 10,
    color: COLORS.danger,
    fontWeight: '800',
  },
  row: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 10,
  },
  primaryBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.neonViolet,
    backgroundColor: '#0b1220',
  },
  primaryBtnDisabled: {
    opacity: 0.7,
  },
  primaryText: {
    color: COLORS.text,
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 0.4,
  },
  secondaryBtn: {
    paddingHorizontal: 14,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
  },
  secondaryText: {
    color: COLORS.muted,
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 0.4,
  },
  micro: {
    marginTop: 10,
    color: COLORS.muted,
    fontSize: 10,
    opacity: 0.7,
  },
  btnInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  premiumBar: {
    marginTop: 10,
    width: '100%',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.neonViolet,
    backgroundColor: '#0b1220',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  premiumBarPrimary: {
    color: '#facc15',
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 0.6,
  },
  premiumBarSecondary: {
    color: COLORS.text,
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 0.6,
    opacity: 0.95,
  },
});
