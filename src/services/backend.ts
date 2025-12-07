// src/services/backend.ts

import { API_BASE_URL } from "../constants";

//
// Helper – uniformno parsiranje responsa
//
async function handleResponse<T>(res: Response): Promise<T> {
  const text = await res.text();

  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${text}`);
  }

  try {
    return JSON.parse(text) as T;
  } catch (e) {
    console.error("JSON parse error:", text);
    throw new Error("Invalid JSON response from backend");
  }
}

//
// Types – u potpunosti kompatibilni sa FastAPI backendom
//
export interface FullMatchData {
  fixture: any;
  teams: any;
  odds: any;
  stats: any;
  form: any;
  standings: any;
  h2h: any;
  injuries: any;
  live_stats: any;
}

export interface AiAnalysisResponse {
  summary: string;
  key_factors: string[];
  probabilities: {
    dc: { "1X": number | null; X2: number | null; "12": number | null };
    goals: {
      over_1_5: number | null;
      over_2_5: number | null;
      under_3_5: number | null;
    };
    btts_yes: number | null;
    btts_no: number | null;
    cs_top2: Array<{ score: string; probability: number }>;
  };
  value_bets: Array<{
    market: string;
    selection: string;
    bookmaker_odd: number | null;
    model_probability: number | null;
    edge: number | null;
    comment: string;
  }>;
  risk_flags: string[];
  disclaimer: string;
}

//
// Fetch: Full Match (GET)
//
export async function fetchFullMatch(
  fixtureId: string | number,
): Promise<FullMatchData> {
  const url = `${API_BASE_URL}/matches/${encodeURIComponent(
    String(fixtureId),
  )}/full`;

  const res = await fetch(url, {
    method: "GET",
  });

  return handleResponse<FullMatchData>(res);
}

//
// Fetch: AI Analysis (POST)
//
export async function fetchAiAnalysis(
  fixtureId: string | number,
  userQuestion?: string,
): Promise<AiAnalysisResponse> {
  const url = `${API_BASE_URL}/matches/${encodeURIComponent(
    String(fixtureId),
  )}/ai-analysis`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_question: userQuestion ?? null,
    }),
  });

  return handleResponse<AiAnalysisResponse>(res);
}
