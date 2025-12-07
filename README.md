# Naksir GO Premium — Backend Only

This repo is a backend‑only implementation designed for deployment on Render
at `https://naksir-go-premium-api.onrender.com` (or similar). It exposes a
three‑layer contract for rich single‑match analysis.

## Layers

1. **Layer 1 — `/matches/today`**
   - Returns a scrollable list of today's fixtures from the allow‑listed leagues.
   - Each item contains: country + emoji, league, round, teams (names + logos),
     kickoff time in `Europe/Belgrade`, venue, and referee.

2. **Layer 2 — `/matches/{fixture_id}`**
   - Returns the full enriched match JSON for one fixture:
     - summary card (same as Layer 1)
     - standings rows (home/away)
     - H2H last 5
     - injuries (home/away)
     - team statistics (API‑FOOTBALL `/teams/statistics`)
     - fixture statistics (`/fixtures/statistics`)
     - API‑FOOTBALL predictions (`/predictions`)
     - normalized odds for:
       - 1X2
       - Double Chance (1X, X2, 12)
       - Goals: O0.5 HT, O1.5, O2.5, O3.5, U3.5, U4.5
       - Team goals O0.5 (home/away)
       - BTTS YES/NO

3. **Layer 3 — `POST /matches/{fixture_id}/ai-analysis`**
   - Consumes the full Layer‑2 object and produces a structured AI analysis:
     - 5–7 sentence in‑depth preview
     - winner probabilities + pick
     - goals probability map
     - BTTS YES/NO probability
     - up to 3 high‑conviction value bets (DC + goals combos)
     - top 2 correct score outcomes

## Running locally

```bash
python -m venv .venv
source .venv/bin/activate  # or .venv\Scripts\activate on Windows
pip install -r requirements.txt

export API_FOOTBALL_KEY=your_api_key_here
export OPENAI_API_KEY=sk-...
export TIMEZONE="Europe/Belgrade"
export SEASON=2025

uvicorn backend.app:app --reload --port 8000
```

Then open `http://localhost:8000/docs` for Swagger UI.
```

## Render deployment

- Create a new **Web Service** on Render.
- Use this repo as the source.
- Set the start command to:

```bash
uvicorn backend.app:app --host 0.0.0.0 --port $PORT
```

- Configure environment variables:
  - `API_FOOTBALL_KEY`
  - `OPENAI_API_KEY` (optional but recommended)
  - `TIMEZONE=Europe/Belgrade`
  - `SEASON=2025`

Once deployed, the service exposes the same routes in production.
