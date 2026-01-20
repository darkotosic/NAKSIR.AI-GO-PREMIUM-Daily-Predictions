import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { apiGet, getBaseUrl } from '../api/client';

export default function SettingsScreen() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const baseUrl = getBaseUrl();

  const handleHealthCheck = async () => {
    setLoading(true);
    setResult(null);
    try {
      const response = await apiGet<{ status?: string }>('/health');
      setResult(response.status ? `Health: ${response.status}` : 'Health check OK');
    } catch (error) {
      setResult((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.label}>API Base URL</Text>
        <Text style={styles.value}>{baseUrl}</Text>
        <Text style={styles.helperText}>
          Health check uses the same authenticated client (X-App-Id + X-Client-Key).
        </Text>
      </View>

      <Pressable style={styles.button} onPress={handleHealthCheck} disabled={loading}>
        <Text style={styles.buttonText}>Test Health</Text>
      </Pressable>

      {loading ? <ActivityIndicator style={styles.loader} /> : null}
      {result ? <Text style={styles.resultText}>{result}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f9fafb',
  },
  card: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  value: {
    marginTop: 6,
    fontSize: 12,
    color: '#374151',
  },
  helperText: {
    marginTop: 8,
    fontSize: 11,
    color: '#6b7280',
  },
  button: {
    marginTop: 16,
    backgroundColor: '#111827',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  loader: {
    marginTop: 12,
  },
  resultText: {
    marginTop: 12,
    fontSize: 12,
    color: '#1f2937',
  },
});
