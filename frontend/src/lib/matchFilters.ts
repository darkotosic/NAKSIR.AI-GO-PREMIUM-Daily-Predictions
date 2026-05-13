import { MatchListItem } from '@/types/match';

export type MatchFilterOption = 'all' | 'live' | 'finished' | 'top';

export const MATCH_FILTER_OPTIONS: Array<{ key: MatchFilterOption; label: string }> = [
  { key: 'all', label: 'All matches' },
  { key: 'finished', label: 'Finished' },
  { key: 'live', label: 'Live matches' },
  { key: 'top', label: 'Top matches' },
];

export const LIVE_MATCH_STATUSES = new Set([
  '1H',
  'HT',
  '2H',
  'ET',
  'BT',
  'P',
  'SUSP',
  'INT',
  'LIVE',
]);

export const FINISHED_MATCH_STATUSES = new Set(['FT', 'AET', 'PEN']);

const TOP_LEAGUE_RULES = [
  { name: 'premier league', country: 'england' },
  { name: 'la liga', country: 'spain' },
  { name: 'serie a', country: 'italy' },
  { name: 'bundesliga', country: 'germany' },
  { name: 'ligue 1', country: 'france' },
];

export const getMatchStatus = (match?: MatchListItem | null): string =>
  (match?.summary?.status ?? '').trim().toUpperCase();

export const isLiveMatch = (match?: MatchListItem | null): boolean =>
  LIVE_MATCH_STATUSES.has(getMatchStatus(match));

export const isFinishedMatch = (match?: MatchListItem | null): boolean =>
  FINISHED_MATCH_STATUSES.has(getMatchStatus(match));

export const isTopCompetition = (match?: MatchListItem | null): boolean => {
  const leagueName = match?.summary?.league?.name?.trim().toLowerCase() ?? '';
  const leagueCountry = match?.summary?.league?.country?.trim().toLowerCase() ?? '';

  if (leagueName.includes('uefa')) {
    return true;
  }

  return TOP_LEAGUE_RULES.some(
    (rule) => leagueName.includes(rule.name) && leagueCountry === rule.country,
  );
};

export const filterMatchesByOption = (
  matches: MatchListItem[],
  filterOption: MatchFilterOption,
): MatchListItem[] => {
  switch (filterOption) {
    case 'live':
      return matches.filter(isLiveMatch);
    case 'finished':
      return matches.filter(isFinishedMatch);
    case 'top':
      return matches.filter(isTopCompetition);
    case 'all':
    default:
      return matches;
  }
};
