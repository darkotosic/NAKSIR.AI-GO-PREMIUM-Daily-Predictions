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

export interface LiveMatchAnalysis {
  summary?: string;
  goals_remaining?: {
    at_least_1_more_pct?: number | null;
    at_least_2_more_pct?: number | null;
  };
  match_winner?: {
    home_pct?: number | null;
    draw_pct?: number | null;
    away_pct?: number | null;
  };
  yellow_cards_summary?: string;
  corners_summary?: string;
  disclaimer?: string;
}
