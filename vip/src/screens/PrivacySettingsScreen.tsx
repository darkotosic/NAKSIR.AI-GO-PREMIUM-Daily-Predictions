import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const COLORS = {
  bg: '#050616',
  card: '#0b0c1f',
  text: '#f8fafc',
  muted: '#a5b4fc',
  border: '#1f1f3a',
};

export default function PrivacySettingsScreen() {
  return (
    <View style={styles.root}>
      <View style={styles.card}>
        <Text style={styles.title}>Privacy Settings</Text>
        <Text style={styles.body}>
          Naksir VIP does not include mobile advertising SDKs. App privacy controls are limited to
          subscription, analytics, and notification preferences configured by the platform.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg, padding: 16, justifyContent: 'center' },
  card: { backgroundColor: COLORS.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.border },
  title: { color: COLORS.text, fontWeight: '900', fontSize: 18, marginBottom: 8 },
  body: { color: COLORS.muted, lineHeight: 18, marginBottom: 14 },
});
