import { apiClient } from '@api/client';
import type { MatchAnalysis } from '@naksir-types/analysis';

export interface AiAnalysisParams {
  fixtureId: number | string;
  userQuestion?: string;
}

export async function postAiAnalysis({
  fixtureId,
  userQuestion,
}: AiAnalysisParams): Promise<MatchAnalysis> {
  const res = await apiClient.post(`/matches/${fixtureId}/ai-analysis`, {
    question: userQuestion ?? null,
  });
  return res.data;
}
