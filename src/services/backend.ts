import { API_BASE_URL } from '../constants';
import type { FullMatchResponse, AiAnalysisResponse } from '../types';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text || res.statusText}`);
  }
  return (await res.json()) as T;
}

export async function fetchFullMatch(fixtureId: string): Promise<FullMatchResponse> {
  const url = `${API_BASE_URL}/matches/${encodeURIComponent(fixtureId)}/full`;
  const res = await fetch(url);
  return handleResponse<FullMatchResponse>(res);
}

export async function fetchAiAnalysis(
  fixtureId: string,
  userQuestion?: string,
): Promise<AiAnalysisResponse> {
  const url = `${API_BASE_URL}/matches/${encodeURIComponent(fixtureId)}/ai-analysis`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userQuestion ? { user_question: userQuestion } : {}),
  });
  return handleResponse<AiAnalysisResponse>(res);
}
