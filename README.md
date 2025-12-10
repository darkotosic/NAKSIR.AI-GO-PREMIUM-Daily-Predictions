# Naksir GO Premium — Backend + Expo frontend

Ovaj repo sadrži kompletan FastAPI backend i Expo (React Native) frontend koji
pričaju preko JSON feedova hostovanih na `https://naksir-go-premium-api.onrender.com`.
Backend prikuplja i normalizuje podatke iz API‑FOOTBALL-a, a frontend renderuje
kartice mečeva, detalje i AI analize.

## Backend (FastAPI)

### Rute

- `GET /` i `GET /health` – osnovni meta/health check odgovori.
- `GET /matches/today` – lista današnjih mečeva za allow‑listed lige (liga,
  timovi, kickoff u `Europe/Belgrade`, status, skor, standings snapshot i
  osnovni odds snapshot za kartice).
- `GET /matches/{fixture_id}` – isti card format kao gore, ali za konkretan
  fixture.
- `GET /matches/{fixture_id}/full` – kompletan kontekst meča: forma, standings,
  H2H, linije, statistike timova/fixture‑a, predictions, injuries i
  normalizovani odds (uključujući flat probability snapshot).
- `POST /matches/{fixture_id}/ai-analysis` – koristi pun kontekst i opcioni
  `question` da vrati strukturisan AI rezime + value bet signale.

### Podešavanje i pokretanje lokalno

```bash
python -m venv .venv
source .venv/bin/activate  # ili .venv\Scripts\activate na Windowsu
pip install -r requirements.txt

export API_FOOTBALL_KEY=your_api_key_here
export OPENAI_API_KEY=sk-...  # opciono, za AI analize
export TIMEZONE="Europe/Belgrade"

uvicorn backend.app:app --reload --port 8000
```

Swagger UI je dostupan na `http://localhost:8000/docs`.

### Deploy na Render

- Web Service sa start komandom:

  ```bash
  uvicorn backend.app:app --host 0.0.0.0 --port $PORT
  ```

- Ključni env var‑ovi: `API_FOOTBALL_KEY`, `OPENAI_API_KEY` (opciono),
  `TIMEZONE` (default `Europe/Belgrade`).

## Frontend (Expo / React Native)

- Lokacija: `frontend/` (Expo SDK 54, React Native 0.81).
- Koristi rute iznad (`/matches/today`, `/matches/{id}/full`,
  `/matches/{id}/ai-analysis`) za pun tok: lista mečeva, detalji, AI analiza i
  vrednosne opklade.
- Zadati API endpoint u kodu je `https://naksir-go-premium-api.onrender.com`.

### Pokretanje frontend-a

```bash
cd frontend
npm install
npm run start  # ili npm run android / ios / web
```

Expo CLI otvara bundler; u simulatoru ili na fizičkom uređaju videćete drawer
sa "Today's Matches" listom, detaljnim ekranom meča i sekcijom za AI analize.
