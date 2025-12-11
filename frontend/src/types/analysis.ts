export interface ValueBet {
  market: string;
  selection: string;
  bookmaker_odd?: number;
  model_probability?: number;
  edge?: number;
  model_probability_pct?: number;
}

export interface MatchAnalysis {
  summary?: string;
  preview?: string;
  key_factors?: string[];
  probabilities?: Record<string, number | string | null>;
  value_bets?: ValueBet[];
  value_bet?: ValueBet;
  risk_flags?: string[];
  disclaimer?: string;
  correct_scores_top2?: Array<{ score?: string; probability_pct?: number }>;
  corners_probabilities?: Record<string, number>;
  cards_probabilities?: Record<string, number>;
  odds_probabilities?: Record<string, any>;
}
