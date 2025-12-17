import { apiClient } from '@api/client';
import type { MatchAnalysis } from '@naksir-types/analysis';

export interface AiAnalysisParams {
  fixtureId: number | string;
  userQuestion?: string;
  useTrialReward?: boolean;
}

export async function postAiAnalysis({
  fixtureId,
  userQuestion,
  useTrialReward = true,
}: AiAnalysisParams): Promise<MatchAnalysis> {
  const res = await apiClient.post(`/matches/${fixtureId}/ai-analysis`, {
    question: userQuestion ?? null,
    trial_by_reward: useTrialReward,
  });
  return res.data;
}
