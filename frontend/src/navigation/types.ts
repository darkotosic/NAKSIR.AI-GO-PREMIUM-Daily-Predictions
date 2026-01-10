import { MatchSummary } from '@/types/match';

export type MatchOrigin = 'TodayMatches' | 'InDepthAnalysis';

export type RootStackParamList = {
  TodayMatches: undefined;
  InDepthAnalysis: undefined;

  // Hidden / drill-down screens:
  Subscriptions: undefined;
  MatchDetails:
    | { fixtureId?: number | string; summary?: MatchSummary; originTab?: MatchOrigin }
    | undefined;
  AIAnalysis:
    | {
        fixtureId?: number | string;
        summary?: MatchSummary;
        originTab?: MatchOrigin;
        fromMatchDetails?: boolean;
      }
    | undefined;
  LiveAIAnalysis:
    | {
        fixtureId?: number | string;
        summary?: MatchSummary;
        originTab?: MatchOrigin;
        fromMatchDetails?: boolean;
      }
    | undefined;
  H2H: { fixtureId?: number | string; summary?: MatchSummary } | undefined;
  Odds:
    | { fixtureId?: number | string; summary?: MatchSummary; selectedMarket?: string }
    | undefined;
  Stats: { fixtureId?: number | string; summary?: MatchSummary } | undefined;
  TeamStats: { fixtureId?: number | string; summary?: MatchSummary } | undefined;
  Events: { fixtureId?: number | string; summary?: MatchSummary } | undefined;
  Lineups: { fixtureId?: number | string; summary?: MatchSummary } | undefined;
  Players: { fixtureId?: number | string; summary?: MatchSummary } | undefined;
  Predictions: { fixtureId?: number | string; summary?: MatchSummary } | undefined;
  Injuries: { fixtureId?: number | string; summary?: MatchSummary } | undefined;
};
