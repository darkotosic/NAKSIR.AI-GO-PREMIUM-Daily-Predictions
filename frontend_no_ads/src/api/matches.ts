import { apiClient } from './client';
import { FullMatch, MatchListItem, TodayMatchesPage } from '@/types/match';

export const fetchTodayMatchesPage = async (
  cursor = 0,
  limit = 10,
): Promise<TodayMatchesPage> => {
  const response = await apiClient.get('/matches/today', {
    params: { cursor, limit, include_enrich: true },
  });
  const data = response.data || {};
  const items = Array.isArray(data.items) ? data.items : [];

  return {
    items: items.filter((item: MatchListItem) => item?.summary),
    next_cursor: data.next_cursor ?? null,
    total: data.total ?? items.length,
  };
};

export const fetchMatchDetails = async (fixtureId: number | string): Promise<FullMatch> => {
  const response = await apiClient.get(`/matches/${fixtureId}/full`);
  return response.data;
};

export const fetchTopMatchesPage = async (
  cursor = 0,
  limit = 10,
): Promise<TodayMatchesPage> => {
  const response = await apiClient.get('/matches/top', {
    params: { cursor, limit, include_enrich: true },
  });
  const data = response.data || {};
  const items = Array.isArray(data.items) ? data.items : [];

  return {
    items: items.filter((item: MatchListItem) => item?.summary),
    next_cursor: data.next_cursor ?? null,
    total: data.total ?? items.length,
  };
};
