import { MatchSummary } from '@/types/match';

export type MainTopTabsParamList = {
  TodayMatches: undefined;
  TopMatches: undefined;
  NaksirAI: undefined;
};

export type RootStackParamList = {
  MainTabs: undefined;

  // Hidden / drill-down screens:
  Subscriptions: undefined;
  MatchDetails: { fixtureId?: number | string; summary?: MatchSummary } | undefined;
  AIAnalysis: { fixtureId?: number | string; summary?: MatchSummary } | undefined;
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
