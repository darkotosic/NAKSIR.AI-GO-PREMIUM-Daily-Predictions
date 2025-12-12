export interface TeamSummary {
  id?: number;
  name?: string;
  logo?: string;
}

export interface LeagueSummary {
  id?: number;
  name?: string;
  country?: string;
  logo?: string;
}

export interface VenueInfo {
  name?: string;
  city?: string;
}

export interface MatchSummary {
  fixture_id?: number;
  kickoff?: string;
  venue?: VenueInfo;
  referee?: string;
  league?: LeagueSummary;
  teams?: {
    home?: TeamSummary;
    away?: TeamSummary;
  };
}

export interface OddsSnapshot {
  match_winner?: {
    home?: number;
    draw?: number;
    away?: number;
  };
  double_chance?: Record<string, number | string>;
  btts?: {
    yes?: number;
    no?: number;
  };
  totals?: Record<string, number | string>;
  ht_over_0_5?: number;
  [key: string]: unknown;
}

export interface FullOdds {
  flat?: OddsSnapshot;
  [key: string]: unknown;
}

export interface StandingsRow {
  rank?: number;
  points?: number;
  form?: string;
  team?: TeamSummary;
}

export interface StandingsGroup {
  league?: {
    standings?: StandingsRow[][];
  };
}

export interface StandingsSnapshot {
  home?: StandingsRow;
  away?: StandingsRow;
}

export interface FullMatch {
  fixture_id?: number;
  summary?: MatchSummary;
  odds?: FullOdds;
  standings?: StandingsGroup[];
  h2h?: unknown[];
  injuries?: unknown;
  stats?: Record<string, unknown>;
  form?: Record<string, unknown>;
}

export interface MatchListItem {
  fixture_id?: number;
  summary?: MatchSummary;
  odds?: FullOdds;
  standings_snapshot?: StandingsSnapshot;
}

export interface TodayMatchesPage {
  items: MatchListItem[];
  next_cursor?: number | null;
  total?: number;
}

export interface H2HMatch {
  fixture?: { id?: number; date?: string };
  league?: LeagueSummary & { season?: number };
  teams?: { home?: TeamSummary; away?: TeamSummary };
  goals?: { home?: number; away?: number };
}

export interface H2HResponse {
  fixture_id?: number;
  h2h_param?: string;
  matches: H2HMatch[];
  home_team_id?: number;
  away_team_id?: number;
}
