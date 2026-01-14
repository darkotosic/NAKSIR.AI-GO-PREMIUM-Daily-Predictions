import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRewardedAd } from '@ads/useRewardedAd';

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

export default function UnlockAnalysisModal({ visible, onCancel, onUnlocked }: Props) {
  const { isAvailable, isLoaded, isLoading, load, show, reward, resetReward } = useRewardedAd();
  const [ctaPressed, setCtaPressed] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  const canShow = useMemo(() => Boolean(isAvailable), [isAvailable]);

  useEffect(() => {
    if (!visible) return;
    setCtaPressed(false);
    setHint(null);
    // pre-load čim se modal pojavi
    if (isAvailable) load();
  }, [visible, load, isAvailable]);

  useEffect(() => {
    if (!visible) return;
    if (ctaPressed && isLoaded) {
      show();
    }
  }, [ctaPressed, isLoaded, show, visible]);

  useEffect(() => {
    if (!visible) return;
    if (reward) {
      onUnlocked();
      resetReward?.();
    }
  }, [reward, onUnlocked, resetReward, visible]);

  const onViewAd = () => {
    setHint(null);

    if (!canShow) {
      setHint('Ad is not available right now. Please try again.');
      return;
    }

    setCtaPressed(true);

    if (isLoaded) {
      show();
      return;
    }

    load();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>UNLOCK ANALYSIS</Text>

          <Text style={styles.body}>
            To gain access to the full in-depth Naksir AI analysis, you need to watch a video ad. One
            match analysis will be unlocked.
          </Text>

          {hint ? <Text style={styles.hint}>{hint}</Text> : null}

          <View style={styles.row}>
            <TouchableOpacity
              onPress={onViewAd}
              activeOpacity={0.9}
              style={[styles.primaryBtn, (isLoading || !canShow) && styles.primaryBtnDisabled]}
              disabled={isLoading}
            >
              {isLoading ? (
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
});
