import { MatchSummary } from '@naksir-types/match';

export type RootDrawerParamList = {
  TodayMatches: undefined;
  MatchDetails: { fixtureId?: number | string; summary?: MatchSummary } | undefined;
  AIAnalysis: { fixtureId?: number | string; summary?: MatchSummary } | undefined;
  H2H: { fixtureId?: number | string; summary?: MatchSummary } | undefined;
  Odds: { fixtureId?: number | string; summary?: MatchSummary; selectedMarket?: string } | undefined;
  GoPremium: undefined;
  NaksirAccount: undefined;
};
