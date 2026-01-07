import { apiClient } from '@api/client';
import type { MatchListItem } from '@naksir-types/match';

export type CachedAiMatchItem = MatchListItem & {
  generated_at?: string | null;
};

export interface CachedAiMatchesResponse {
  items: CachedAiMatchItem[];
  total: number;
}

export async function fetchCachedAiMatches(): Promise<CachedAiMatchesResponse> {
  const res = await apiClient.get('/ai/cached-matches');
  const data = res.data || {};
  return {
    items: Array.isArray(data.items) ? data.items : [],
    total: typeof data.total === 'number' ? data.total : (Array.isArray(data.items) ? data.items.length : 0),
  };
}
