import { apiGet } from './client';
import type { BttsMatch, MatchFilter, Ticket, Top3Market } from '../types/btts';

const buildQuery = (params: Record<string, string | number | boolean | undefined>) => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined) {
      return;
    }
    searchParams.append(key, String(value));
  });
  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
};

export const getTodayMatches = async (options: {
  filter?: MatchFilter;
  limit?: number;
  include_badge?: boolean;
}) => {
  const query = buildQuery({
    filter: options.filter ?? 'all',
    limit: options.limit,
    include_badge: options.include_badge,
  });
  const data = await apiGet<BttsMatch[]>(`/btts/matches/today${query}`);
  return (data ?? []).map((match) => {
    const odds = match.odds ?? {};
    const rawMatch = match as BttsMatch & {
      btts_yes_odds?: number | string;
      btts_no_odds?: number | string;
      btts_yes?: number | string;
      btts_no?: number | string;
    };
    const bttsYes = odds.btts_yes ?? rawMatch.btts_yes_odds ?? rawMatch.btts_yes;
    const bttsNo = odds.btts_no ?? rawMatch.btts_no_odds ?? rawMatch.btts_no;
    return {
      ...match,
      odds: {
        ...odds,
        btts_yes: bttsYes,
        btts_no: bttsNo,
      },
    };
  });
};

export const getTomorrowMatches = async (options: {
  filter?: MatchFilter;
  limit?: number;
  include_badge?: boolean;
}) => {
  const query = buildQuery({
    filter: options.filter ?? 'all',
    limit: options.limit,
    include_badge: options.include_badge,
  });
  return apiGet<BttsMatch[]>(`/btts/matches/tomorrow${query}`);
};

export const getTop3Today = async (options: { market?: Top3Market }) => {
  const query = buildQuery({
    market: options.market ?? 'YES',
  });
  return apiGet<BttsMatch[]>(`/btts/top3/today${query}`);
};

export const getTodayTickets = async () => {
  return apiGet<Ticket[]>(`/btts/tickets/today`);
};
