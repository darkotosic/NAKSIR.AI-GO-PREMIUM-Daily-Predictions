import { useQuery } from '@tanstack/react-query';
import { fetchTodayMatches } from '@api/matches';
import { MatchListItem } from '@types/match';

export const useTodayMatchesQuery = () =>
  useQuery<MatchListItem[]>({
    queryKey: ['todayMatches'],
    queryFn: fetchTodayMatches,
    staleTime: 5 * 60 * 1000,
  });
