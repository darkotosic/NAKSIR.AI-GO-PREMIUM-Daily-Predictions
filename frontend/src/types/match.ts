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

export interface MatchStatistic {
  type?: string;
  value?: string | number | null;
}

export interface MatchStatEntry {
  team?: TeamSummary;
  statistics?: MatchStatistic[];
}

export interface TeamStatsSummary {
  form?: string;
  fixtures?: {
    played?: { total?: number };
    wins?: { total?: number };
    draws?: { total?: number };
    loses?: { total?: number };
  };
  goals?: {
    for?: { total?: { total?: number }; average?: { total?: string } };
    against?: { total?: { total?: number } };
  };
}

export interface TeamStatsBlock {
  home?: TeamStatsSummary | null;
  away?: TeamStatsSummary | null;
}

export interface MatchEvent {
  time?: { elapsed?: number; extra?: number | null };
  team?: TeamSummary;
  player?: { id?: number; name?: string };
  assist?: { id?: number; name?: string };
  type?: string;
  detail?: string;
  comments?: string | null;
}

export interface LineupPlayer {
  player?: { id?: number; name?: string; number?: number; pos?: string };
}

export interface Lineup {
  team?: TeamSummary;
  coach?: { name?: string };
  formation?: string;
  startXI?: LineupPlayer[];
  substitutes?: LineupPlayer[];
}

export interface PlayerStatisticEntry {
  player?: { id?: number; name?: string; number?: number; pos?: string; grid?: string };
  statistics?: Array<{
    games?: { position?: string; minutes?: number; rating?: string };
    goals?: { total?: number };
    assists?: number;
  }>;
}

export interface PlayerStatsTeam {
  team?: TeamSummary;
  players?: PlayerStatisticEntry[];
}

export interface PredictionEntry {
  winner?: TeamSummary & { comment?: string };
  win_or_draw?: boolean;
  advice?: string;
  under_over?: string;
  goals?: { home?: string | number; away?: string | number };
  percent?: { home?: string; draw?: string; away?: string };
}

export type PredictionsBlock = PredictionEntry | PredictionEntry[] | { predictions?: PredictionEntry } | null;

export interface InjuryRecord {
  player?: { id?: number; name?: string; type?: string }; // type can be injury status
  team?: TeamSummary;
  fixture?: { date?: string };
  league?: LeagueSummary;
  information?: string;
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
  stats?: MatchStatEntry[];
  team_stats?: TeamStatsBlock | null;
  h2h?: unknown[];
  events?: MatchEvent[];
  lineups?: Lineup[];
  players?: PlayerStatsTeam[];
  predictions?: PredictionsBlock;
  injuries?: InjuryRecord[] | Record<string, unknown> | null;
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
