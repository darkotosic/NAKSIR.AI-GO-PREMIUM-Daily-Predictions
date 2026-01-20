import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { getTodayMatches } from '../api/btts';
import type { BttsMatch, MatchFilter } from '../types/btts';
import MatchCard from '../ui/MatchCard';

const FILTERS: MatchFilter[] = ['all', 'prematch', 'live', 'finished'];

export default function TodayScreen() {
  const [filter, setFilter] = useState<MatchFilter>('all');
  const [matches, setMatches] = useState<BttsMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;
    setLoading(true);
    setError(null);
    getTodayMatches({ filter, include_badge: true })
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
  }, [filter]);

  return (
    <View style={styles.container}>
      <View style={styles.filterRow}>
        {FILTERS.map((item) => (
          <Pressable
            key={item}
            onPress={() => setFilter(item)}
            style={[styles.filterButton, filter === item && styles.filterButtonActive]}
          >
            <Text style={[styles.filterText, filter === item && styles.filterTextActive]}>
              {item.toUpperCase()}
            </Text>
          </Pressable>
        ))}
      </View>

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
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  filterButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  filterButtonActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  filterText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1f2937',
  },
  filterTextActive: {
    color: '#ffffff',
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
