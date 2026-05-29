import { useQuery } from '@tanstack/react-query';
import { fetchCachedAiMatches } from '@api/cachedAi';

export const useCachedAiMatchesQuery = () =>
  useQuery({
    queryKey: ['cachedAiMatches'],
    queryFn: fetchCachedAiMatches,
    refetchInterval: 15 * 1000,
    refetchOnWindowFocus: true,
    staleTime: 60 * 1000,
  });
