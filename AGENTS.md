# AGENTS.md — NAKSIR.AI GO PREMIUM

This document defines the **logical agents** that make the single‑match and AI analysis experience work as an autonomous pipeline.

Think of each agent as a focused responsibility with clear inputs/outputs. The implementation can be functions, services, cron jobs, or background workers — the naming here is conceptual.

---

## 1. Data Ingestion & Cache Agent

**Role:** Collect and normalize all match‑level data once, then serve it from cache to every endpoint.

**Triggers**
- Morning / midday / evening cron jobs.
- Manual re‑run for specific dates if needed.

**Sources**
- API‑FOOTBALL:
  - Fixtures, odds, teams/statistics, standings, h2h, injuries, fixtures/statistics.
- Writes to:
  - `/cache/{date}/fixtures.json`
  - `/cache/{date}/odds.json`
  - `/cache/{date}/stats/…`
  - `/cache/{date}/h2h/…`
  - `/cache/{date}/injuries.json`

**Responsibilities**
- Fetch all needed endpoints with minimal API calls (batch where possible).
- Clean data: remove nulls, duplicates, broken odds.
- Enforce odds ranges and league allow‑lists.
- Log ingestion summary (counts, errors, anomalies).

**Failure modes**
- API down or rate‑limited → agent falls back to previous day cache and raises alarm.
- Missing segment (e.g. injuries) → continue with partial dataset and set flags for downstream agents.

---

## 2. Single Match Aggregator Agent

**Role:** Build the **canonical full match JSON** used by both the frontend and the AI layer.

**Entry point**
- Backend endpoint: `GET /matches/{fixture_id}/full`.

**Inputs**
- `fixture_id`
- Cached data for:
  - fixture base record
  - odds (pre‑match)
  - team statistics (home & away)
  - standings
  - head‑to‑head
  - injuries
  - live/advanced stats (optional)

**Outputs**
- Single JSON object:

```json
{
  "fixture": {},
  "teams": {},
  "odds": {},
  "stats": {},
  "form": {},
  "standings": {},
  "h2h": [],
  "injuries": {}
}
```

**Responsibilities**
- Map raw API‑FOOTBALL response into stable, frontend‑friendly schema.
- Always return a consistent envelope, even if some sections are empty.
- Annotate data with basic derived metrics (e.g. BTTS rate, O/U %).

---

## 3. Value‑Bet Engine Agent

**Role:** Perform the **mathematical** part of value‑bet checks.

**Used by**
- AI Analysis Agent (as helper)
- Any future “model only” endpoints.

**Inputs**
- Odds and fair probabilities extracted from:
  - 1X2, DC, Goals, BTTS, Correct Score.
- Model‑estimated probabilities from AI/meta‑model.

**Core functions**
- `implied_probability(odd)`
- `fair_probability(outcomes[])`
- `edge(model_p, fair_p)`
- Simple combo approximations for DC+GOALS, e.g.:
  - `P(1X & O1.5) ~ min(P(1X), P(O1.5)) * 0.9`

**Outputs**
- Structured value‑bet candidates:

```json
{
  "market": "DC + GOALS",
  "selection": "1X & Over 1.5",
  "bookmaker_odd": 1.95,
  "model_probability": 0.68,
  "edge": 0.17
}
```

**Guardrails**
- Global edge threshold (e.g. 0.05).
- League / data‑quality filters (avoid random low‑tier leagues when stats are weak).

---

## 4. AI Match Analyst Agent

**Role:** Turn raw match data + model helpers into human‑readable insights and structured recommendations.

**Entry point**
- Backend: `POST /matches/{fixture_id}/ai-analysis`.

**Inputs**
- Full match JSON from Single Match Aggregator.
- Optional `user_question`.
- Value‑bet engine helpers.

**System prompt concept (high level)**
- You are a football betting analyst.
- Focus on:
  - DC + Goals combos
  - Correct Score (Top 2 scenarios)
  - BTTS YES probability
- Use real stats first, then intuition.
- Avoid crazy “lottery” tips.
- Always output:
  - Summary
  - Key factors
  - Probabilities
  - Value bets with edges
  - Risk flags
  - Disclaimer

**Outputs**
- Strict JSON envelope:

```json
{
  "summary": "...",
  "key_factors": [],
  "probabilities": { ... },
  "value_bets": [],
  "risk_flags": [],
  "disclaimer": "..."
}
```

**Behavior**
- If dataset is weak (few matches, low coverage), degrade gracefully:
  - Explicitly mention low confidence.
  - Lower edges and emphasize risk.

---

## 5. Match Q&A Agent

**Role:** Allow the user to ask follow‑up questions about the same match while staying in context.

**Entry point**
- Optional: `POST /matches/{fixture_id}/ai-analysis` with different `user_question`.
- Frontend: chat‑style UI below initial AI summary.

**Inputs**
- Same match JSON as initial analysis.
- Conversation history (short, limited messages).
- New `user_question`.

**Outputs**
- Short text answer:
  - Still grounded in same match data.
  - Can reuse probabilities/value bets but adapt explanations.
- Always attach a short reminder about risk/variance if user goes too “all in”.

---

## 6. Frontend Orchestrator Agent (UI Logic)

**Role:** Glue between API, UX, and user flows on the single‑match screen.

**Responsibilities**
- Parse route param `fixtureId`.
- Fetch `/matches/{fixture_id}/full` on load, manage loading & error states.
- Populate:
  - Header
  - Odds snapshot
  - Tabs (Stats, H2H, Standings, Injuries, Odds)
- Handle click on **AI Match Analysis & Value Bets**:
  - Show spinner.
  - Call `/matches/{fixture_id}/ai-analysis`.
  - Render JSON into UI sections.
- Handle Q&A input:
  - Send follow‑up `user_question`.
  - Append AI replies to chat log.

**Non‑goals**
- No direct calls to API‑FOOTBALL from browser.
- No complex state beyond match context + AI messages.

---

## 7. Guardrails & Monitoring Agent

**Role:** Keep the system honest and robust.

**Responsibilities**
- Detect when:
  - Cache for a given fixture is incomplete.
  - League or odds look suspicious (crazy movements, tiny sample size).
  - AI output is malformed JSON or missing required fields.
- Behaviors:
  - Fallback to “stats only, no bets” mode for that fixture.
  - Show user‑friendly message like:
    - “Nema dovoljno kvalitetnih podataka za ozbiljnu value bet analizu.”
  - Log anomalies for later review.

---

## 8. How Agents Work Together (Flow)

1. **Data Ingestion & Cache Agent** runs on schedule and fills `/cache/{date}`.
2. User opens `/match/:fixtureId`:
   - Frontend Orchestrator calls **Single Match Aggregator Agent** via `/matches/{fixture_id}/full`.
3. User taps **AI Match Analysis & Value Bets**:
   - Backend invokes **AI Match Analyst Agent**:
     - Reads full match JSON.
     - Uses **Value‑Bet Engine Agent**.
     - Outputs structured analysis.
4. User asks follow‑up questions:
   - **Match Q&A Agent** reuses same context to generate answers.
5. Throughout the process:
   - **Guardrails & Monitoring Agent** watches data quality and AI output.
   - On issues, it degrades gracefully and logs events.

This structure keeps the project:
- Traceable (each agent has a clear role),
- Testable (you can unit‑test each agent in isolation),
- Ready for full automation (tie agents into your existing cron + GitHub Actions flows).
