import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Props {
  onGoToPlans: () => void;
  onBackToMatches: () => void;
}

export default function VipRequiredCard({ onGoToPlans, onBackToMatches }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.card}>
        <Text style={styles.title}>VIP access required</Text>
        <Text style={styles.subtitle}>
          Subscribe to unlock full Naksir AI predictions and live analysis.
        </Text>
        <TouchableOpacity style={styles.primaryButton} onPress={onGoToPlans} activeOpacity={0.9}>
          <Text style={styles.primaryText}>Go to VIP plans</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={onBackToMatches} activeOpacity={0.9}>
          <Text style={styles.secondaryText}>Back to matches</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  card: {
    borderWidth: 1,
    borderColor: '#1f1f3a',
    borderRadius: 16,
    padding: 16,
    backgroundColor: '#0b0c1f',
  },
  title: {
    color: '#f8fafc',
    fontWeight: '900',
    fontSize: 16,
  },
  subtitle: {
    color: '#a5b4fc',
    marginTop: 8,
    lineHeight: 20,
  },
  primaryButton: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#facc15',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#0b1220',
  },
  primaryText: {
    color: '#facc15',
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  secondaryButton: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#8b5cf6',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#0b1220',
  },
  secondaryText: {
    color: '#f8fafc',
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 0.4,
  },
});
