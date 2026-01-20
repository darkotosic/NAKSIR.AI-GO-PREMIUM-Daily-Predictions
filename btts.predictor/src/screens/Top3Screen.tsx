import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { getTop3Today } from '../api/btts';
import type { BttsMatch, Top3Market } from '../types/btts';
import MatchCard from '../ui/MatchCard';

const MARKETS: Top3Market[] = ['YES', 'NO'];

export default function Top3Screen() {
  const [market, setMarket] = useState<Top3Market>('YES');
  const [matches, setMatches] = useState<BttsMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;
    setLoading(true);
    setError(null);
    getTop3Today({ market })
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
  }, [market]);

  return (
    <View style={styles.container}>
      <View style={styles.filterRow}>
        {MARKETS.map((item) => (
          <Pressable
            key={item}
            onPress={() => setMarket(item)}
            style={[styles.filterButton, market === item && styles.filterButtonActive]}
          >
            <Text style={[styles.filterText, market === item && styles.filterTextActive]}>{item}</Text>
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
    gap: 8,
    marginBottom: 12,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  filterButtonActive: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  filterText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#111827',
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
