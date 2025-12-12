import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const COLORS = {
  neonPurple: '#b06bff',
  neonViolet: '#8b5cf6',
  muted: '#a5b4fc',
};

interface Props {
  onPress: () => void;
}

export const NeonAnalysisButton: React.FC<Props> = ({ onPress }) => {
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: false,
        }),
        Animated.timing(glow, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: false,
        }),
      ]),
    );

    loop.start();
    return () => loop.stop();
  }, [glow]);

  const scale = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.03],
  });

  const shadowRadius = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [18, 28],
  });

  const glowOpacity = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 0.85],
  });

  return (
    <Animated.View
      style={[
        styles.analysisGlowWrap,
        {
          transform: [{ scale }],
          shadowRadius,
          shadowOpacity: glowOpacity,
        },
      ]}
    >
      <Animated.View pointerEvents="none" style={[styles.analysisGlowHalo, { opacity: glowOpacity }]} />

      <TouchableOpacity style={styles.analysisButton} onPress={onPress} activeOpacity={0.9}>
        <Text style={styles.analysisButtonText}>Naksir In-depth Analysis</Text>
        <Text style={styles.analysisButtonSub}>
          AI insights summary, Key factors, DC + Goals, Probabilities: Correct scores, Corners, Yellow cards, Risks
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  analysisGlowWrap: {
    position: 'relative',
    marginBottom: 16,
    shadowColor: COLORS.neonPurple,
    shadowOffset: { width: 0, height: 14 },
  },
  analysisGlowHalo: {
    position: 'absolute',
    top: -6,
    left: -6,
    right: -6,
    bottom: -6,
    borderRadius: 26,
    backgroundColor: '#fc22dfb0',
    shadowColor: COLORS.neonPurple,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 32,
    elevation: 24,
  },
  analysisButton: {
    backgroundColor: '#120a2f',
    borderRadius: 22,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderWidth: 2,
    borderColor: '#fc22dfb0',
    shadowColor: COLORS.neonPurple,
    shadowOpacity: 0.95,
    shadowRadius: 22,
    elevation: 10,
  },
  analysisButtonText: {
    color: '#f5f3ff',
    textAlign: 'center',
    fontWeight: '900',
    letterSpacing: 1.2,
    fontSize: 16,
  },
  analysisButtonSub: {
    color: COLORS.muted,
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 12,
    marginTop: 4,
    letterSpacing: 0.6,
  },
});

export default NeonAnalysisButton;
