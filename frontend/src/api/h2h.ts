import { apiClient } from './client';
import { H2HResponse } from '@naksir-types/match';

export const fetchH2H = async (fixtureId: number | string): Promise<H2HResponse> => {
  const response = await apiClient.get('/h2h', { params: { fixture_id: fixtureId } });
  const data = response.data;
  return {
    matches: Array.isArray(data?.matches) ? data.matches : [],
    ...data,
  };
};
