import { useMutation, type UseMutationResult } from '@tanstack/react-query';
import { postAiAnalysis, type AiAnalysisParams } from '@api/analysis';
import type { MatchAnalysis } from '@naksir-types/analysis';

export function useAiAnalysisMutation(): UseMutationResult<
  MatchAnalysis,
  Error,
  AiAnalysisParams
> {
  return useMutation<MatchAnalysis, Error, AiAnalysisParams>({
    mutationFn: (vars) => postAiAnalysis(vars),
  });
}
