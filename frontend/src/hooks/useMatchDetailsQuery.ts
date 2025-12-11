import { useQuery } from '@tanstack/react-query';
import { fetchMatchDetails } from '@api/matches';
import { FullMatch } from '@naksir-types/match';

export const useMatchDetailsQuery = (fixtureId?: number | string) =>
  useQuery<FullMatch>({
    queryKey: ['matchDetails', fixtureId],
    queryFn: () => fetchMatchDetails(fixtureId as number | string),
    enabled: Boolean(fixtureId),
  });
