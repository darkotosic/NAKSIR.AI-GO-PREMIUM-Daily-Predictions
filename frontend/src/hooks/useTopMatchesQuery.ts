import { useInfiniteQuery } from '@tanstack/react-query';
import { fetchTopMatchesPage } from '@api/matches';
import { TodayMatchesPage } from '@naksir-types/match';

export const useTopMatchesQuery = () =>
  useInfiniteQuery<TodayMatchesPage>({
    queryKey: ['topMatches'],
    queryFn: ({ pageParam = 0 }) => fetchTopMatchesPage(pageParam as number, 10),
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
    staleTime: 5 * 60 * 1000,
    initialPageParam: 0,
  });
