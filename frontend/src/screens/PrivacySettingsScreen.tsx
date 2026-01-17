import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { openPrivacyOptions } from '@/ads/consent';

const COLORS = {
  bg: '#050616',
  card: '#0b0c1f',
  text: '#f8fafc',
  muted: '#a5b4fc',
  neon: '#8b5cf6',
  border: '#1f1f3a',
};

export default function PrivacySettingsScreen() {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const onManage = async () => {
    setMsg(null);
    setLoading(true);
    try {
      await openPrivacyOptions();
      setMsg('Privacy options updated.');
    } catch (e) {
      setMsg('Privacy options are not available right now.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.card}>
        <Text style={styles.title}>Privacy Settings</Text>
        <Text style={styles.body}>
          Manage your consent choices for ads and measurement. You can update your preferences at any time.
        </Text>

        <TouchableOpacity style={styles.btn} activeOpacity={0.9} onPress={onManage} disabled={loading}>
          {loading ? (
            <View style={styles.row}>
              <ActivityIndicator />
              <Text style={styles.btnText}> Opening…</Text>
            </View>
          ) : (
            <Text style={styles.btnText}>Manage privacy options</Text>
          )}
        </TouchableOpacity>

        {msg ? <Text style={styles.msg}>{msg}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg, padding: 16, justifyContent: 'center' },
  card: { backgroundColor: COLORS.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.border },
  title: { color: COLORS.text, fontWeight: '900', fontSize: 18, marginBottom: 8 },
  body: { color: COLORS.muted, lineHeight: 18, marginBottom: 14 },
  btn: { borderRadius: 12, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: COLORS.neon },
  btnText: { color: COLORS.text, fontWeight: '900' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  msg: { marginTop: 12, color: COLORS.muted, fontWeight: '700' },
});
