import { useMutation } from '@tanstack/react-query';
import { postAiAnalysis } from '@api/analysis';
import { MatchAnalysis } from '@types/analysis';

export const useAiAnalysisMutation = () =>
  useMutation<MatchAnalysis, Error, { fixtureId: number | string; userQuestion?: string }>(
    ({ fixtureId, userQuestion }) => postAiAnalysis({ fixtureId, userQuestion }),
  );
