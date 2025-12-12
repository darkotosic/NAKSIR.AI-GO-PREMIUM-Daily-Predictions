import React, { useCallback, useMemo } from 'react';
import {
  FlatList,
  Linking,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import { useNavigation } from '@react-navigation/native';
import { MatchCard } from '@components/MatchCard';
import { ErrorState } from '@components/ErrorState';
import { useTodayMatchesQuery } from '@hooks/useTodayMatchesQuery';
import { useFavorites } from '@hooks/useFavorites';
import { RootDrawerParamList } from '@navigation/types';
import { trackEvent } from '@lib/tracking';

const COLORS = {
  background: '#040312',
  card: '#0b0c1f',
  neonPurple: '#b06bff',
  neonViolet: '#8b5cf6',
  neonOrange: '#fb923c',
  text: '#f8fafc',
  muted: '#a5b4fc',
  accentBlue: '#0ea5e9',
  borderSoft: '#1f1f3a',
};

const TelegramBanner = () => (
  <TouchableOpacity
    style={styles.telegramButton}
    onPress={() => Linking.openURL('https://t.me/naksiranalysis')}
    activeOpacity={0.88}
  >
    <Text style={styles.telegramText}>Join Naksir Analysis on Telegram</Text>
  </TouchableOpacity>
);

const SortBar = ({
  sortOption,
  onSortChange,
}: {
  sortOption: 'time' | 'team';
  onSortChange: (value: 'time' | 'team') => void;
}) => (
  <View style={styles.sortRow}>
    <Text style={styles.filterLabel}>Sort by</Text>
    <View style={styles.sortButtons}>
      {[
        { key: 'time', label: 'Kickoff time' },
        { key: 'team', label: 'Team name' },
      ].map((option) => {
        const isActive = sortOption === option.key;
        return (
          <TouchableOpacity
            key={option.key}
            style={[styles.sortChip, isActive && styles.sortChipActive]}
            onPress={() => onSortChange(option.key as 'time' | 'team')}
            activeOpacity={0.85}
          >
            <Text style={[styles.sortChipText, isActive && styles.sortChipTextActive]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  </View>
);

const SkeletonCard = () => (
  <View style={styles.skeletonCard}>
    <View style={styles.skeletonHeader} />
    <View style={styles.skeletonRow}>
      <View style={styles.skeletonLogo} />
      <View style={styles.skeletonName} />
      <View style={styles.skeletonVs} />
      <View style={styles.skeletonName} />
      <View style={styles.skeletonLogo} />
    </View>
    <View style={styles.skeletonChipsRow}>
      <View style={styles.skeletonChip} />
      <View style={styles.skeletonChip} />
      <View style={styles.skeletonChip} />
    </View>
  </View>
);

const TodayMatchesScreen: React.FC = () => {
  const navigation = useNavigation<DrawerNavigationProp<RootDrawerParamList>>();
  const {
    data,
    isLoading,
    isError,
    refetch,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isRefetching,
  } = useTodayMatchesQuery();
  const { toggleFavorite, isFavorite } = useFavorites();
  const [sortOption, setSortOption] = React.useState<'time' | 'team'>('time');

  const onRefresh = useCallback(() => {
    trackEvent('RefreshMatches');
    refetch();
  }, [refetch]);

  const allMatches = useMemo(
    () => data?.pages.flatMap((page) => page.items ?? []) ?? [],
    [data],
  );

  const sortedMatches = useMemo(() => {
    const list = [...allMatches];
    return list.sort((a, b) => {
      if (sortOption === 'team') {
        const nameA = (a?.summary?.teams?.home?.name || '').toLowerCase();
        const nameB = (b?.summary?.teams?.home?.name || '').toLowerCase();
        return nameA.localeCompare(nameB);
      }

      const dateA = a?.summary?.kickoff ? new Date(a.summary.kickoff).getTime() : Infinity;
      const dateB = b?.summary?.kickoff ? new Date(b.summary.kickoff).getTime() : Infinity;
      return dateA - dateB;
    });
  }, [allMatches, sortOption]);

  const renderHeader = () => (
    <View>
      <TelegramBanner />
      <SortBar sortOption={sortOption} onSortChange={setSortOption} />
      <View style={styles.refreshRow}>
        <TouchableOpacity style={styles.refreshButton} onPress={onRefresh} activeOpacity={0.85}>
          <Text style={styles.refreshText}>↻ Refresh</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderItem = ({ item }: { item: any }) => {
    const fixtureId = item.fixture_id || item.summary?.fixture_id;
    return (
      <MatchCard
        match={item}
        isFavorite={isFavorite(fixtureId)}
        onToggleFavorite={() => fixtureId && toggleFavorite(fixtureId)}
        onPress={() =>
          navigation.navigate('MatchDetails', {
            fixtureId,
            summary: item.summary,
          })
        }
      />
    );
  };

  const renderFooter = () => {
    if (!isFetchingNextPage) return null;
    return (
      <View style={{ marginTop: 8 }}>
        <SkeletonCard />
      </View>
    );
  };

  const emptyComponent = () => {
    if (isLoading) {
      return (
        <View>
          {[0, 1, 2].map((item) => (
            <SkeletonCard key={`skeleton-${item}`} />
          ))}
        </View>
      );
    }

    if (isError) {
      return <ErrorState message={error?.message || 'Unable to load matches'} onRetry={onRefresh} />;
    }

    return (
      <View style={styles.emptyBox}>
        <Text style={styles.emptyText}>No matches available right now.</Text>
      </View>
    );
  };

  return (
    <FlatList
      contentContainerStyle={styles.container}
      data={sortedMatches}
      renderItem={renderItem}
      keyExtractor={(item) => `${item.fixture_id || item.summary?.fixture_id || Math.random()}`}
      ListHeaderComponent={renderHeader}
      ListFooterComponent={renderFooter}
      ListEmptyComponent={emptyComponent}
      refreshControl={
        <RefreshControl refreshing={isLoading || isRefetching} onRefresh={onRefresh} tintColor={COLORS.neonPurple} />
      }
      onEndReached={() => {
        if (hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      }}
      onEndReachedThreshold={0.5}
      initialNumToRender={8}
      maxToRenderPerBatch={8}
      windowSize={5}
      removeClippedSubviews
    />
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: COLORS.background,
    paddingBottom: 32,
  },
  filterLabel: {
    color: COLORS.muted,
    marginBottom: 6,
    fontSize: 12,
    letterSpacing: 0.5,
  },
  emptyBox: {
    padding: 18,
    borderRadius: 12,
    backgroundColor: '#0f172a',
  },
  emptyText: {
    color: '#cbd5e1',
  },
  telegramButton: {
    backgroundColor: COLORS.neonPurple,
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: COLORS.accentBlue,
    shadowColor: COLORS.accentBlue,
    shadowOpacity: 0.5,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 20,
    elevation: 6,
  },
  telegramText: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
    fontWeight: '700',
  },
  sortRow: {
    marginBottom: 12,
  },
  sortButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  sortChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    backgroundColor: '#0b1220',
  },
  sortChipActive: {
    borderColor: COLORS.neonPurple,
    backgroundColor: '#1b2132',
  },
  sortChipText: {
    color: COLORS.muted,
    fontWeight: '600',
  },
  sortChipTextActive: {
    color: COLORS.text,
  },
  refreshRow: {
    alignItems: 'flex-end',
    marginBottom: 10,
  },
  refreshButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.neonPurple,
    backgroundColor: '#020617',
  },
  refreshText: {
    color: COLORS.neonPurple,
    fontSize: 12,
    fontWeight: '600',
  },
  skeletonCard: {
    backgroundColor: '#0a0f1f',
    borderRadius: 20,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
  },
  skeletonHeader: {
    height: 14,
    width: '45%',
    backgroundColor: COLORS.borderSoft,
    borderRadius: 10,
    marginBottom: 12,
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  skeletonLogo: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.borderSoft,
  },
  skeletonName: {
    flex: 1,
    height: 14,
    marginHorizontal: 8,
    backgroundColor: COLORS.borderSoft,
    borderRadius: 10,
  },
  skeletonVs: {
    width: 36,
    height: 18,
    borderRadius: 10,
    backgroundColor: COLORS.borderSoft,
  },
  skeletonChipsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  skeletonChip: {
    flex: 1,
    height: 26,
    marginHorizontal: 3,
    borderRadius: 999,
    backgroundColor: COLORS.borderSoft,
  },
});

export default TodayMatchesScreen;
