import { apiClient } from './client';
import { MatchAnalysis } from '@types/analysis';

interface AnalysisPayload {
  fixtureId: number | string;
  userQuestion?: string;
}

export const postAiAnalysis = async ({
  fixtureId,
  userQuestion,
}: AnalysisPayload): Promise<MatchAnalysis> => {
  const response = await apiClient.post(`/matches/${fixtureId}/ai-analysis`, {
    user_question: userQuestion,
  });
  return response.data;
};
