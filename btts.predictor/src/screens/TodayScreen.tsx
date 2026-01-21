import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import SegmentedControl from '@react-native-segmented-control/segmented-control';
import { getTodayMatches } from '../api/btts';
import type { BttsMatch, MatchFilter } from '../types/btts';
import MatchCard from '../ui/MatchCard';
import { COLORS } from '../theme/colors';

const FILTER_VALUES: MatchFilter[] = ['all', 'prematch', 'live', 'finished'];

export default function TodayScreen() {
  const [filter, setFilter] = useState<MatchFilter>('all');
  const [matches, setMatches] = useState<BttsMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const segments = useMemo(() => ['All', 'Prematch', 'Live', 'Finished'], []);
  const selectedIndex = FILTER_VALUES.indexOf(filter);

  const fetchMatches = useCallback(async (activeFilter: MatchFilter, showLoader: boolean) => {
    if (showLoader) {
      setLoading(true);
    }
    setError(null);
    try {
      const payload: unknown = await getTodayMatches({
        filter: activeFilter,
        limit: 60,
        include_badge: true,
      });

      const normalizedMatches = Array.isArray(payload)
        ? payload
        : Array.isArray((payload as { data?: unknown }).data)
        ? (payload as { data: BttsMatch[] }).data
        : Array.isArray((payload as { matches?: unknown }).matches)
        ? (payload as { matches: BttsMatch[] }).matches
        : [];

      setMatches(normalizedMatches);
    } catch (err) {
      setError((err as Error).message);
      setMatches([]);
    } finally {
      if (showLoader) {
        setLoading(false);
      }
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchMatches(filter, true);
  }, [fetchMatches, filter]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMatches(filter, false);
  };

  const safeMatches = Array.isArray(matches) ? matches : [];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Today</Text>
        <Text style={styles.subtitle}>BTTS Matches</Text>
      </View>

      <View style={styles.segmentWrapper}>
        <View style={styles.segmentContainer}>
          <SegmentedControl
            values={segments}
            selectedIndex={selectedIndex}
            onChange={(event) => setFilter(FILTER_VALUES[event.nativeEvent.selectedSegmentIndex])}
            backgroundColor={COLORS.cardDark2}
            tintColor={COLORS.neonGreen}
            fontStyle={styles.segmentText}
            activeFontStyle={styles.segmentTextActive}
          />
        </View>
      </View>

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText} numberOfLines={1}>
            {error}
          </Text>
        </View>
      ) : null}

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.neonGreen} style={styles.loader} />
      ) : (
        <FlatList
          data={safeMatches}
          keyExtractor={(item, index) => `${item.id ?? index}`}
          renderItem={({ item }) => <MatchCard match={item} />}
          contentContainerStyle={[
            styles.listContent,
            safeMatches.length === 0 && styles.listContentEmpty,
          ]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.neonGreen} />}
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No matches for selected filter.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgLight,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.cardDark,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neonPink,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.muted,
  },
  segmentWrapper: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 8,
    backgroundColor: COLORS.bgLight,
  },
  segmentContainer: {
    backgroundColor: COLORS.cardDark2,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.neonGreen,
    padding: 4,
  },
  segmentText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '600',
  },
  segmentTextActive: {
    color: COLORS.black,
    fontSize: 12,
    fontWeight: '700',
  },
  errorBanner: {
    marginHorizontal: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: COLORS.cardDark,
  },
  errorText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
  },
  loader: {
    marginTop: 24,
  },
  listContent: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 24,
  },
  listContentEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyCard: {
    backgroundColor: COLORS.cardDark,
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: '600',
  },
});
