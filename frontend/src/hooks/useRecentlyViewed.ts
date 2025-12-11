import { useEffect, useState } from 'react';
import { getJson, setJson } from '@lib/storage';
import { MatchSummary } from '@naksir-types/match';

const RECENT_KEY = 'recently-viewed-fixtures';
const MAX_RECENT = 10;

type StoredSummary = MatchSummary & { fixture_id?: number | string };

export const useRecentlyViewed = () => {
  const [recentlyViewed, setRecentlyViewed] = useState<StoredSummary[]>([]);

  useEffect(() => {
    getJson<StoredSummary[]>(RECENT_KEY, []).then(setRecentlyViewed);
  }, []);

  const addViewed = async (summary?: StoredSummary) => {
    if (!summary?.fixture_id) return;
    const withoutExisting = recentlyViewed.filter(
      (item) => item.fixture_id !== summary.fixture_id,
    );
    const next = [summary, ...withoutExisting].slice(0, MAX_RECENT);
    setRecentlyViewed(next);
    await setJson(RECENT_KEY, next);
  };

  return { recentlyViewed, addViewed };
};
