export type MatchFilter = 'all' | 'prematch' | 'live' | 'finished';
export type Top3Market = 'YES' | 'NO';

export type BttsBadge = {
  recommended?: 'YES' | 'NO';
  confidence?: number;
  reasoning_short?: string;
};

export type MatchTeamInfo = {
  name?: string;
};

export type MatchScore = {
  home?: number | null;
  away?: number | null;
};

export type MatchLeague = {
  name?: string;
  country?: string;
};

export type BttsMatch = {
  id?: number | string;
  league?: MatchLeague;
  kickoff_time?: string;
  status?: MatchFilter;
  home_team?: MatchTeamInfo;
  away_team?: MatchTeamInfo;
  score?: MatchScore;
  btts_badge?: BttsBadge;
};

export type Ticket = {
  id?: number | string;
  picks?: Array<{ match_id?: number | string; selection?: string }>;
  created_at?: string;
};
