import { MatchSummary } from '@types/match';

export type RootDrawerParamList = {
  TodayMatches: undefined;
  MatchDetails: { fixtureId?: number | string; summary?: MatchSummary } | undefined;
  AIAnalysis: { fixtureId?: number | string; summary?: MatchSummary } | undefined;
  GoPremium: undefined;
  NaksirAccount: undefined;
};
