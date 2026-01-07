import { useQuery } from '@tanstack/react-query';
import { fetchCachedAiMatches } from '@api/cachedAi';

export const useCachedAiMatchesQuery = () =>
  useQuery({
    queryKey: ['cachedAiMatches'],
    queryFn: fetchCachedAiMatches,
    staleTime: 60 * 1000,
  });
