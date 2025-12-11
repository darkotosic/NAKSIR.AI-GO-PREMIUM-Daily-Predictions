import React, { useCallback } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import { useNavigation } from '@react-navigation/native';
import { MatchCard } from '@components/MatchCard';
import { LoadingState } from '@components/LoadingState';
import { ErrorState } from '@components/ErrorState';
import { useTodayMatchesQuery } from '@hooks/useTodayMatchesQuery';
import { useFavorites } from '@hooks/useFavorites';
import { RootDrawerParamList } from '@navigation/types';
import { trackEvent } from '@lib/tracking';

const TodayMatchesScreen: React.FC = () => {
  const navigation = useNavigation<DrawerNavigationProp<RootDrawerParamList>>();
  const { data, isLoading, isError, refetch, error } = useTodayMatchesQuery();
  const { toggleFavorite, isFavorite } = useFavorites();

  const onRefresh = useCallback(() => {
    trackEvent('RefreshMatches');
    refetch();
  }, [refetch]);

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} />}
    >
      <Text style={styles.heading}>Today matches</Text>

      {isLoading && <LoadingState message="Loading today's fixtures" />}

      {isError && <ErrorState message={error?.message || 'Unable to load matches'} onRetry={onRefresh} />}

      {!isLoading && !isError && data?.length === 0 && (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>No matches available right now.</Text>
        </View>
      )}

      {!isLoading && !isError
        ? data?.map((match) => {
            const fixtureId = match.fixture_id || match.summary?.fixture_id;
            return (
              <MatchCard
                key={fixtureId ?? Math.random().toString()}
                match={match}
                isFavorite={isFavorite(fixtureId)}
                onToggleFavorite={() => fixtureId && toggleFavorite(fixtureId)}
                onPress={() =>
                  navigation.navigate('MatchDetails', {
                    fixtureId,
                    summary: match.summary,
                  })
                }
              />
            );
          })
        : null}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#040312',
  },
  heading: {
    fontSize: 22,
    fontWeight: '800',
    color: '#f8fafc',
    marginBottom: 12,
  },
  emptyBox: {
    padding: 18,
    borderRadius: 12,
    backgroundColor: '#0f172a',
  },
  emptyText: {
    color: '#cbd5e1',
  },
});

export default TodayMatchesScreen;
