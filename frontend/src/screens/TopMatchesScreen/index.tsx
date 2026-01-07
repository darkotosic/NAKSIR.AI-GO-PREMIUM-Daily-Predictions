import React, { useMemo } from 'react';
import { FlatList, RefreshControl, SafeAreaView, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { MatchCard } from '@components/MatchCard';
import { LoadingState } from '@components/LoadingState';
import { ErrorState } from '@components/ErrorState';
import TelegramBanner from '@components/TelegramBanner';

import { useTopMatchesQuery } from '@hooks/useTopMatchesQuery';
import type { MatchListItem } from '@naksir-types/match';
import type { RootStackParamList } from '@navigation/types';

const COLORS = {
  background: '#040312',
  text: '#f8fafc',
  muted: '#a5b4fc',
};

export default function TopMatchesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const query = useTopMatchesQuery();

  const items: MatchListItem[] = useMemo(() => {
    const pages = query.data?.pages ?? [];
    return pages.flatMap((p) => p.items ?? []);
  }, [query.data]);

  if (query.isLoading) return <LoadingState message="Loading top matches..." />;
  if (query.isError) return <ErrorState message="Failed to load top matches" />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <FlatList
        data={items}
        keyExtractor={(it, idx) => String(it?.fixture_id ?? idx)}
        ListHeaderComponent={
          <View style={{ paddingHorizontal: 14, paddingTop: 10, paddingBottom: 6 }}>
            <TelegramBanner />
            <Text style={{ color: COLORS.text, fontSize: 18, fontWeight: '900' }}>Top Matches</Text>
            <Text style={{ color: COLORS.muted, marginTop: 2 }}>
              Top 5 leagues + UEFA competitions
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <MatchCard
            match={item}
            onPress={() =>
              navigation.navigate('MatchDetails', {
                fixtureId: item.fixture_id,
                summary: item.summary,
              })
            }
          />
        )}
        onEndReached={() => {
          if (query.hasNextPage && !query.isFetchingNextPage) query.fetchNextPage();
        }}
        onEndReachedThreshold={0.6}
        refreshControl={
          <RefreshControl
            refreshing={query.isRefetching}
            onRefresh={() => query.refetch()}
            tintColor={COLORS.text}
          />
        }
      />
    </SafeAreaView>
  );
}
