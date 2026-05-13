export type MatchSummary = {
  fixture_id: number;
  league: Record<string, unknown>;
  teams: Record<string, unknown>;
  kickoff?: string | null;
  status?: string | null;
};

export type MatchCard = {
  fixture_id: number;
  summary: MatchSummary;
  odds?: {
    flat?: Record<string, unknown>;
  };
  standings_snapshot?: {
    home?: Record<string, unknown> | null;
    away?: Record<string, unknown> | null;
  };
};

export type MatchListResponse = {
  items: MatchCard[];
  total: number;
  next_cursor?: number | null;
};

export type MatchFullResponse = {
  meta: Record<string, unknown>;
  summary: MatchSummary;
  odds?: Record<string, unknown> | null;
  stats?: Record<string, unknown> | null;
  team_stats?: Record<string, unknown> | null;
  standings?: Record<string, unknown> | null;
  h2h?: Record<string, unknown> | null;
  events?: Record<string, unknown> | null;
  lineups?: Record<string, unknown> | null;
  players?: Record<string, unknown> | null;
  predictions?: Record<string, unknown> | null;
  injuries?: Record<string, unknown> | null;
};

export type AIAnalysisResponse = {
  fixture_id: number;
  generated_at?: string | null;
  timezone?: string | null;
  question?: string | null;
  analysis: Record<string, unknown>;
  odds_probabilities?: Record<string, unknown> | null;
  cached: boolean;
  cache_key?: string | null;
};
