export interface TeamInfo {
  id: number;
  name: string;
  logo?: string;
}

export interface LeagueInfo {
  id: number;
  name: string;
  round?: string | null;
}

export interface VenueInfo {
  id?: number;
  name?: string;
  city?: string;
}

export interface FixtureInfo {
  id: number;
  date: string;
  status: string;
  league: LeagueInfo;
  venue?: VenueInfo;
}

export interface Odds1x2 {
  home: number | null;
  draw: number | null;
  away: number | null;
}

export interface OddsDoubleChance {
  '1X'?: number | null;
  X2?: number | null;
  '12'?: number | null;
}

export interface OddsGoals {
  over_1_5?: number | null;
  over_2_5?: number | null;
  under_3_5?: number | null;
}

export interface OddsBTTS {
  yes?: number | null;
  no?: number | null;
}

export interface CorrectScoreSample {
  score: string;
  odd: number;
}

export interface OddsBlock {
  '1x2'?: Odds1x2;
  double_chance?: OddsDoubleChance;
  goals?: OddsGoals;
  btts?: OddsBTTS;
  correct_score_sample?: CorrectScoreSample[];
}

export interface TeamStats {
  form?: string;
  goals_for?: number;
  goals_against?: number;
  btts_rate?: number;
  over15_rate?: number;
  over25_rate?: number;
  under35_rate?: number;
}

export interface StandingsEntry {
  position: number;
  points: number;
  goal_diff: number;
}

export interface H2HMatch {
  date: string;
  score: string;
  btts: boolean;
  goals: number;
}

export interface InjuryEntry {
  player: string;
  type: string;
  status: 'Missing' | 'Questionable';
}

export interface FullMatchResponse {
  fixture: FixtureInfo;
  teams: {
    home: TeamInfo;
    away: TeamInfo;
  };
  odds: OddsBlock;
  stats: {
    home: TeamStats;
    away: TeamStats;
  };
  form: {
    home: string;
    away: string;
  };
  standings: {
    home?: StandingsEntry;
    away?: StandingsEntry;
  };
  h2h: H2HMatch[];
  injuries: {
    home: InjuryEntry[];
    away: InjuryEntry[];
  };
}

export interface AiProbabilityBlock {
  dc: { ['1X']?: number; X2?: number; ['12']?: number };
  goals: { over_1_5?: number; over_2_5?: number; under_3_5?: number };
  btts_yes?: number;
  btts_no?: number;
  cs_top2?: { score: string; probability: number }[];
}

export interface ValueBet {
  market: string;
  selection: string;
  bookmaker_odd: number;
  model_probability: number;
  edge: number;
  comment?: string;
}

export interface AiAnalysisResponse {
  summary: string;
  key_factors: string[];
  probabilities: AiProbabilityBlock;
  value_bets: ValueBet[];
  risk_flags: string[];
  disclaimer: string;
}
