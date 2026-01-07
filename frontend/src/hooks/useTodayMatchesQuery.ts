import { useInfiniteQuery } from '@tanstack/react-query';
import { fetchTodayMatchesPage } from '@api/matches';
import { TodayMatchesPage } from '@naksir-types/match';

export const useTodayMatchesQuery = () =>
  useInfiniteQuery<TodayMatchesPage>({
    queryKey: ['todayMatches'],
    queryFn: ({ pageParam = 0 }) => fetchTodayMatchesPage(pageParam as number, 10),
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
    staleTime: 5 * 60 * 1000,
    initialPageParam: 0,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    retry: 1,
  });
