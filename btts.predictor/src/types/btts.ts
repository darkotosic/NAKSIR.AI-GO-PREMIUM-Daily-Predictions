export type MatchFilter = 'all' | 'prematch' | 'live' | 'finished';
export type Top3Market = 'YES' | 'NO';

export type BttsBadge = {
  recommended?: 'YES' | 'NO';
  confidence?: number;
  reasoning_short?: string;
};

export type MatchLeague = {
  name: string;
  country?: string;
  logo?: string;
};

export type MatchTeamInfo = {
  name?: string;
  logo?: string;
};

export type MatchTeams = {
  home: MatchTeamInfo;
  away: MatchTeamInfo;
};

export type MatchGoals = {
  home?: number | null;
  away?: number | null;
};

export type MatchStatus = {
  short?: string;
  elapsed?: number;
};

export type MatchOdds = {
  btts_yes?: number | string;
  btts_no?: number | string;
};

export type BttsMatch = {
  id?: number | string;
  league: MatchLeague;
  teams: MatchTeams;
  kickoff: string;
  status?: MatchStatus;
  goals?: MatchGoals;
  odds?: MatchOdds;
  btts_badge?: BttsBadge;
  kickoff_time?: string;
  home_team?: MatchTeamInfo;
  away_team?: MatchTeamInfo;
  score?: MatchGoals;
};

export type Ticket = {
  id?: number | string;
  picks?: Array<{ match_id?: number | string; selection?: string }>;
  created_at?: string;
};
