import { useQuery } from '@tanstack/react-query';
import { fetchH2H } from '@api/h2h';
import { H2HResponse } from '@/types/match';

export const useH2HQuery = (fixtureId?: number | string) =>
  useQuery<H2HResponse>({
    queryKey: ['h2h', fixtureId],
    queryFn: () => fetchH2H(fixtureId as number | string),
    enabled: Boolean(fixtureId),
  });
