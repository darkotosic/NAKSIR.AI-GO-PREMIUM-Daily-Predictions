# NAKSIR.AI GO PREMIUM — Daily Predictions

Single–match centric premium predictions UI + backend contract for the **NAKSIR.AI GO PREMIUM – Daily Predictions** project.

The goal of this repo is to provide:
- A modern single–match screen on the frontend.
- A clear backend contract for fetching *real* match data from API‑FOOTBALL cache.
- An AI analysis layer that produces **value bets** around:
  - Double Chance + Goals combos (DC + GOALS)
  - Correct Score – top 2 options (CS Top 2)
  - BTTS YES probability and value

---

## 1. Single Match Screen — Product Spec

For every fixture (`fixture_id`) the app exposes a **Single Match Screen** with:

### 1.1 Header — Core Match Info

- League (name, logo / tag)
- Date, time, timezone, status (NS, FT, LIVE, etc.)
- Venue (name, city) where available
- Teams:
  - Home / Away name
  - Logos
  - Home/Away badges

### 1.2 Key Odds Snapshot

Pulled from `odds` (pre‑match) for this `fixture_id`:

- 1X2 main odds
- Double Chance (1X, X2, 12)
- Goals markets (O1.5, O2.5, U3.5 as baseline)
- BTTS odds (Yes/No)
- A few **sample Correct Score** lines (e.g. 1‑1, 2‑1, 1‑2)

This section is used as a quick “market view” and as inputs for the AI value‑bet logic.

### 1.3 Form & Stats

Using `teams/statistics` for both teams:

- Form string (e.g. `WWLDWW`) – ideally last 10–20 matches
- Goals scored / conceded:
  - Overall, Home, Away
- Over/Under distribution:
  - % of matches Over/Under 1.5, 2.5, 3.5
- BTTS rate
- Basic advanced stats if available:
  - xG for / against
  - Shots on target
  - Clean sheets / failed to score

### 1.4 Head‑to‑Head (H2H)

Using `fixtures/headtohead?h2h=homeId-awayId&last=5..10`:

- Last 5–10 mutual matches
- Final scores, goals total
- BTTS (hit or not)
- Average goals in H2H
- Quick tags like:
  - “4/5 BTTS”
  - “Avg 3.2 goals”

### 1.5 Standings

Using `standings?league=...&season=...`:

- Table position for each team
- Points, games played
- Goal difference
- Short form (last 5 in league)

### 1.6 Injuries / Suspensions

Using `injuries`:

- For each team:
  - Player name
  - Type (Injury / Suspension / Sickness)
  - Status: `Missing` or `Questionable`
- Short summary like:
  - “Home: 2 defenders missing”
  - “Away: key striker questionable”

### 1.7 Live / Advanced Stats (optional)

If the match is **live** or recently finished:

- `fixtures/statistics?fixture=...`
- Shots, xG, possession, cards, passes, etc.
- Used to enrich AI analysis and post‑match breakdowns.

### 1.8 AI Analysis Button

A central CTA:

> **AI Match Analysis & Value Bets**

When tapped:

1. Frontend calls backend `POST /matches/{fixture_id}/ai-analysis`.
2. Backend loads all **cached** real data for that fixture.
3. AI performs deep analysis and returns:
   - Summary of match context.
   - Probabilities for DC, Goals, BTTS, CS Top 2.
   - Explicit value‑bet recommendations with edges.
   - Risk flags + disclaimer.

---

## 2. Backend Contract

The frontend assumes two core endpoints:

### 2.1 `GET /matches/{fixture_id}/full`

Returns **data‑only** JSON, ready both for UI and AI.

Example schema:

```json
{
  "fixture": {
    "id": 123456,
    "league": { "id": 39, "name": "Premier League", "round": "Regular Season - 12" },
    "date": "2025-12-07T17:30:00Z",
    "status": "NS",
    "venue": { "id": 556, "name": "Old Trafford", "city": "Manchester" }
  },
  "teams": {
    "home": { "id": 33, "name": "Man Utd", "logo": "..." },
    "away": { "id": 34, "name": "Liverpool", "logo": "..." }
  },
  "odds": {
    "1x2": { "home": 2.10, "draw": 3.60, "away": 3.30 },
    "double_chance": { "1X": 1.30, "X2": 1.60, "12": 1.40 },
    "goals": { "over_1_5": 1.25, "over_2_5": 1.70, "under_3_5": 1.40 },
    "btts": { "yes": 1.70, "no": 2.10 },
    "correct_score_sample": [
      { "score": "1-1", "odd": 7.50 },
      { "score": "2-1", "odd": 9.00 },
      { "score": "1-2", "odd": 10.00 }
    ]
  },
  "stats": {
    "home": {},
    "away": {}
  },
  "form": {
    "home": "WDWDWL",
    "away": "WWLDWW"
  },
  "standings": {
    "home": { "position": 4, "points": 24, "goal_diff": 10 },
    "away": { "position": 2, "points": 28, "goal_diff": 15 }
  },
  "h2h": [],
  "injuries": {
    "home": [],
    "away": []
  }
}
```

#### 2.1.1 Data sources (via cache layer)

The endpoint should never hit API‑FOOTBALL directly per user click. It must read from the daily cache which was prepared by cron jobs:

- `fixtures?id={fixture_id}`
- `odds?fixture={fixture_id}`
- `teams/statistics?league=...&season=...&team=...` (home + away)
- `standings?league=...&season=...`
- `fixtures/headtohead?h2h=homeId-awayId&last=5`
- `injuries?fixture={fixture_id}` or `injuries?league+season+team`

### 2.2 `POST /matches/{fixture_id}/ai-analysis`

Optional body:

```json
{
  "user_question": "Fokusiraj se na BTTS i DC+goals za value bet."
}
```

Behavior:

1. Backend loads full match data (internal call to `/matches/{fixture_id}/full` or direct cache read).
2. Pre‑computes implied and fair probabilities where needed.
3. Calls OpenAI (or other LLM) with:
   - System prompt (role: football analyst, value‑bet focus).
   - Context: JSON match data.
   - User question (if any).
4. Returns structured AI response:

```json
{
  "summary": "...",
  "key_factors": ["...", "..."],
  "probabilities": {
    "dc": { "1X": 0.68, "X2": 0.55, "12": 0.75 },
    "goals": { "over_1_5": 0.85, "over_2_5": 0.62, "under_3_5": 0.78 },
    "btts_yes": 0.64,
    "btts_no": 0.36,
    "cs_top2": [
      { "score": "2-1", "probability": 0.18 },
      { "score": "1-1", "probability": 0.16 }
    ]
  },
  "value_bets": [
    {
      "market": "DC + GOALS",
      "selection": "1X & Over 1.5",
      "bookmaker_odd": 1.95,
      "model_probability": 0.68,
      "edge": 0.17,
      "comment": "Home forma jaka, oba tima daju golove, šansa za 2+ gola visoka."
    }
  ],
  "risk_flags": [
    "Away tim ima nekoliko ključnih povreda u odbrani."
  ],
  "disclaimer": "Ovo nije finansijski savet, već AI analiza zasnovana na statistici."
}
```

The frontend renders this in a modal/bottom sheet and can optionally re‑hit this endpoint with follow‑up questions (`user_question`).

---

## 3. Value Bet Logic (Core Formulas)

### 3.1 Implied & Fair Probability

For any bookmaker odd:

```text
implied_p = 1 / odd
```

For a set of mutually exclusive outcomes (e.g. BTTS Yes/No):

```text
sum_p   = implied_yes + implied_no
margin  = sum_p - 1
fair_p  = implied_p / sum_p
edge    = model_p - fair_p
```

Where:
- `model_p` is probability estimated by the AI/model.
- `edge >= 0.05` (5 percentage points) ⇒ **potential value bet**.

### 3.2 DC + GOALS Combos

Targets:

- `1X & Over 1.5`
- `X2 & Over 1.5`
- `1X & Under 3.5`  
  etc.

Heuristic for combined probability:

```text
P(1X & O1.5) ≈ min(P(1X), P(O1.5)) * 0.9
```

Use conservative factor (0.9) because events are correlated and we want to avoid over‑confidence.

### 3.3 Correct Score (CS Top 2)

- Derive expected goals (`λ_home`, `λ_away`) from team stats, H2H and league averages.
- Use Poisson‑style reasoning or heuristics to rank 3–4 most likely scores.
- Return **top 2** scenarios with probabilities and edges.

### 3.4 BTTS YES Model

Inputs:

- BTTS % last 10–20 games per team.
- BTTS % in H2H.
- Goals for/against.
- xG for/against, shots on target.
- League‑level BTTS rate.

Output:

- `P(BTTS Yes)` and `P(BTTS No)` plus value check vs. fair book probabilities.

---

## 4. Frontend Design Notes

### 4.1 Route

- Single match route: `/match/:fixtureId`

### 4.2 Layout

Sections:

1. **Header** – league, date/time, fixture status.
2. **Teams & Main Odds** – logos + 1X2/DC/O1.5/O2.5/U3.5/BTTS.
3. **Tabs / Segments**:
   - Stats (team stats + form)
   - H2H
   - Standings
   - Injuries
   - Odds (full matrix if needed)
4. **AI Panel**
   - Big button “AI Match Analysis & Value Bets”.
   - Modal / bottom sheet with:
     - Summary + Key Factors
     - Value Bets (DC+Goals, CS Top 2, BTTS)
     - Risk Flags + Disclaimer
     - Optional free‑text Q&A box bound to `/ai-analysis`.

---

## 5. Local Development (Frontend Skeleton)

> Adjust if your actual stack differs — this is a generic Vite + React + TS flow.

```bash
# 1. Install deps
npm install

# 2. Run dev server
npm run dev

# 3. Build for production
npm run build
```

Environment variables (example):

- `VITE_API_BASE_URL` – base URL of your backend (e.g. `https://api.naksir.top`)
- `VITE_APP_TITLE` – app title override

Frontend should treat all backend responses as **read‑only** truths and never call API‑FOOTBALL directly from the browser.

---

## 6. Roadmap / TODO

- [ ] Implement `/matches/{fixture_id}/full` in backend using existing cache structure.
- [ ] Implement `/matches/{fixture_id}/ai-analysis` with OpenAI and value‑bet logic.
- [ ] Wire new frontend route `/match/:fixtureId`.
- [ ] Implement tabs for Stats/H2H/Standings/Injuries/Odds.
- [ ] Add Q&A chat mode for follow‑up questions on the same match.
- [ ] Add loading/error states and graceful fallbacks if some data blocks are missing.
