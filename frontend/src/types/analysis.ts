export interface ValueBet {
  market: string;
  selection: string;
  bookmaker_odd?: number;
  model_probability?: number;
  edge?: number;
}

export interface MatchAnalysis {
  summary: string;
  key_factors: string[];
  probabilities: Record<string, number | string | null>;
  value_bets: ValueBet[];
  risk_flags: string[];
  disclaimer: string;
}
