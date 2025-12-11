import { apiClient } from './client';
import { FullMatch, MatchListItem } from '@naksir-types/match';

export const fetchTodayMatches = async (): Promise<MatchListItem[]> => {
  const response = await apiClient.get('/matches/today');
  const data = response.data;
  const list = Array.isArray(data) ? data : data?.matches || [];
  return list.filter((item: MatchListItem) => item?.summary);
};

export const fetchMatchDetails = async (fixtureId: number | string): Promise<FullMatch> => {
  const response = await apiClient.get(`/matches/${fixtureId}/full`);
  return response.data;
};
