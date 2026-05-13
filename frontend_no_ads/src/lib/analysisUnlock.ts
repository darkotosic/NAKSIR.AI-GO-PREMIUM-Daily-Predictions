import { getJson, setJson } from './storage';

const STORAGE_KEY = 'naksir_analysis_unlock_v1';

type UnlockMap = Record<string, { unlockedAt: number }>;

export async function isAnalysisUnlocked(fixtureId?: number | string | null): Promise<boolean> {
  if (!fixtureId) return false;
  const map = await getJson<UnlockMap>(STORAGE_KEY, {});
  return Boolean(map[String(fixtureId)]);
}

export async function setAnalysisUnlocked(fixtureId?: number | string | null): Promise<void> {
  if (!fixtureId) return;
  const map = await getJson<UnlockMap>(STORAGE_KEY, {});
  map[String(fixtureId)] = { unlockedAt: Date.now() };
  await setJson(STORAGE_KEY, map);
}
