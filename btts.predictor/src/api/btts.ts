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

const asList = <T>(payload: unknown): T[] => {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === 'object') {
    const anyPayload = payload as { data?: T[]; matches?: T[]; items?: T[] };
    if (Array.isArray(anyPayload.data)) return anyPayload.data as T[];
    if (Array.isArray(anyPayload.matches)) return anyPayload.matches as T[];
    if (Array.isArray(anyPayload.items)) return anyPayload.items as T[];
  }
  return [];
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
  const payload = await apiGet<unknown>(`/btts/matches/today${query}`);
  const list = asList<BttsMatch>(payload);

  return list.map((match) => {
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
  const payload = await apiGet<unknown>(`/btts/matches/tomorrow${query}`);
  return asList<BttsMatch>(payload);
};

export const getTop3Today = async (options: { market?: Top3Market }) => {
  const query = buildQuery({
    market: options.market ?? 'YES',
  });
  const payload = await apiGet<unknown>(`/btts/top3/today${query}`);
  return asList<BttsMatch>(payload);
};

export const getTodayTickets = async () => {
  const payload = await apiGet<unknown>(`/btts/tickets/today`);
  return asList<Ticket>(payload);
};
