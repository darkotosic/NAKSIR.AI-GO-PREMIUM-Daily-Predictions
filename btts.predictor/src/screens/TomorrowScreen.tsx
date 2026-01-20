import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { getTomorrowMatches } from '../api/btts';
import type { BttsMatch } from '../types/btts';
import MatchCard from '../ui/MatchCard';

export default function TomorrowScreen() {
  const [matches, setMatches] = useState<BttsMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;
    setLoading(true);
    setError(null);
    getTomorrowMatches({ include_badge: true })
      .then((data) => {
        if (isActive) {
          setMatches(data ?? []);
        }
      })
      .catch((err: Error) => {
        if (isActive) {
          setError(err.message);
          setMatches([]);
        }
      })
      .finally(() => {
        if (isActive) {
          setLoading(false);
        }
      });
    return () => {
      isActive = false;
    };
  }, []);

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color="#2563eb" style={styles.loader} />
      ) : error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : (
        <FlatList
          data={matches}
          keyExtractor={(item, index) => `${item.id ?? index}`}
          renderItem={({ item }) => <MatchCard match={item} />}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f9fafb',
  },
  loader: {
    marginTop: 24,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 13,
  },
  listContent: {
    paddingBottom: 24,
  },
});
