import { useInfiniteQuery } from '@tanstack/react-query';
import { fetchTodayMatchesPage } from '@api/matches';
import { TodayMatchesPage } from '@/types/match';

export const useTodayMatchesQuery = () =>
  useInfiniteQuery<TodayMatchesPage>({
    queryKey: ['todayMatches'],
    queryFn: ({ pageParam = 0 }) => fetchTodayMatchesPage(pageParam as number, 100),
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
    staleTime: 45 * 1000,
    refetchInterval: 60 * 1000,
    initialPageParam: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    retry: 1,
  });
