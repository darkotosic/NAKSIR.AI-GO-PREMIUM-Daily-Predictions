import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { useAiAnalysisMutation } from '@hooks/useAiAnalysisMutation';
import { RootDrawerParamList } from '@navigation/types';
import { LoadingState } from '@components/LoadingState';
import { trackEvent } from '@lib/tracking';

const AIAnalysisScreen: React.FC = () => {
  const route = useRoute<RouteProp<RootDrawerParamList, 'AIAnalysis'>>();
  const fixtureId = route.params?.fixtureId;
  const [question, setQuestion] = useState('');
  const mutation = useAiAnalysisMutation();

  useEffect(() => {
    if (fixtureId) {
      trackEvent('OpenAnalysis', { fixture_id: fixtureId });
      mutation.mutate({ fixtureId });
    }
  }, [fixtureId]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Naksir In-depth Analysis</Text>
      <Text style={styles.subtitle}>
        AI generated summary, probabilities, key factors and value bets for the selected match.
      </Text>

      <View style={styles.card}>
        <Text style={styles.label}>Ask a follow-up question (optional)</Text>
        <TextInput
          placeholder="e.g. What about BTTS?"
          placeholderTextColor="#6b7280"
          value={question}
          onChangeText={setQuestion}
          style={styles.input}
          multiline
        />
        <TouchableOpacity
          onPress={() => fixtureId && mutation.mutate({ fixtureId, userQuestion: question })}
          style={styles.button}
          disabled={!fixtureId || mutation.isLoading}
        >
          <Text style={styles.buttonText}>{mutation.isLoading ? 'Asking...' : 'Run analysis'}</Text>
        </TouchableOpacity>
      </View>

      {mutation.isLoading && <LoadingState message="Generating analysis" />}

      {mutation.data ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Summary</Text>
          <Text style={styles.bodyText}>{mutation.data.summary}</Text>

          <Text style={styles.sectionTitle}>Key factors</Text>
          {mutation.data.key_factors.map((item) => (
            <Text key={item} style={styles.listItem}>
              • {item}
            </Text>
          ))}

          <Text style={styles.sectionTitle}>Value bets</Text>
          {mutation.data.value_bets.map((bet, index) => (
            <Text key={`${bet.selection}-${index}`} style={styles.listItem}>
              {bet.selection} ({bet.market}) — edge {bet.edge ?? '-'}
            </Text>
          ))}

          <Text style={styles.sectionTitle}>Risk flags</Text>
          {mutation.data.risk_flags.map((flag) => (
            <Text key={flag} style={styles.listItem}>
              ⚠️ {flag}
            </Text>
          ))}

          <Text style={styles.sectionTitle}>Disclaimer</Text>
          <Text style={styles.bodyText}>{mutation.data.disclaimer}</Text>
        </View>
      ) : null}

      {mutation.isError && (
        <View style={styles.card}>
          <Text style={styles.errorText}>Unable to generate analysis right now.</Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#040312',
  },
  title: {
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '800',
  },
  subtitle: {
    color: '#cbd5e1',
    marginBottom: 14,
  },
  card: {
    backgroundColor: '#0b0c1f',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderColor: '#1f1f3a',
    borderWidth: 1,
  },
  label: {
    color: '#e5e7eb',
    marginBottom: 8,
  },
  input: {
    minHeight: 60,
    borderWidth: 1,
    borderColor: '#1f2937',
    borderRadius: 12,
    padding: 10,
    color: '#f8fafc',
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#8b5cf6',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#f8fafc',
    fontWeight: '700',
  },
  sectionTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 12,
  },
  bodyText: {
    color: '#e5e7eb',
    marginTop: 4,
  },
  listItem: {
    color: '#cbd5e1',
    marginTop: 4,
  },
  errorText: {
    color: '#fca5a5',
    fontWeight: '700',
  },
});

export default AIAnalysisScreen;
