import { apiClient } from '@api/client';
import type { MatchAnalysis } from '@naksir-types/analysis';

export interface AiAnalysisParams {
  fixtureId: number | string;
  userQuestion?: string;
  useTrialReward?: boolean;
}

export class AiAnalysisError extends Error {
  status?: number;
  code?: string;
  actions?: string[];
}

const normalizeAiAnalysisError = (error: unknown): AiAnalysisError => {
  if (error instanceof AiAnalysisError) {
    return error;
  }

  if (error instanceof Error) {
    const normalized = new AiAnalysisError(error.message);
    normalized.status = (error as any).status;
    normalized.code = (error as any).code;
    normalized.actions = (error as any).actions;

    if (normalized.status === 402 && !normalized.code) {
      normalized.code = 'UNLOCK_REQUIRED';
      normalized.actions = ['WATCH_AD', 'BUY_SUBSCRIPTION'];
    }

    return normalized;
  }

  const fallback = new AiAnalysisError('Request failed. Please try again later.');
  return fallback;
};

export async function postAiAnalysis({
  fixtureId,
  userQuestion,
  useTrialReward = false,
}: AiAnalysisParams): Promise<MatchAnalysis> {
  try {
    const res = await apiClient.post(
      `/matches/${fixtureId}/ai-analysis`,
      {
        question: userQuestion ?? null,
        trial_by_reward: useTrialReward,
      },
      {
        timeout: 30000,
      },
    );
    return res.data;
  } catch (error) {
    throw normalizeAiAnalysisError(error);
  }
}
