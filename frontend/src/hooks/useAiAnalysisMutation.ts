import { useMutation, type UseMutationResult } from '@tanstack/react-query';
import { postAiAnalysis, type AiAnalysisParams, type AiAnalysisError } from '@api/analysis';
import type { MatchAnalysis } from '@types/analysis';

export function useAiAnalysisMutation(): UseMutationResult<
  MatchAnalysis,
  AiAnalysisError,
  AiAnalysisParams
> {
  return useMutation<MatchAnalysis, AiAnalysisError, AiAnalysisParams>({
    mutationFn: (vars) => postAiAnalysis(vars),
  });
}
