# Naksir GO Premium — FastAPI backend + Expo frontend

Repozitorijum isporučuje kompletan FastAPI servis za nogometne feedove i Expo
(React Native) klijent. Backend u realnom vremenu poziva API‑FOOTBALL, kešira
odgovore sa TTL‑om i rate‑limit zaštitom, normalizuje podatke za kartice i AI
analize, a frontend prikazuje listu mečeva, detalje i GPT‑generisane savete.

## Backend (FastAPI)

### Ključne rute

- `GET /` i `GET /health` – brzi meta i health check odgovori za uptime (health sada ping-uje bazu).
- `GET /_debug/routes` – izlistavanje aktivnih ruta (dobrodošlo na Render
  logovima, sada zaštićeno API ključem).
- `GET /matches/today` – paginirana lista današnjih mečeva iz allow‑listed liga
  (liga, timovi, kickoff u `Europe/Belgrade`, status, skor). Ako postoji keš
  odds feed-a, vraća i lagani `odds.flat` snapshot.
- `GET /matches/{fixture_id}` – jedan match card u istom formatu kao gore.
- `GET /matches/{fixture_id}/full` – prošireni kontekst sa sekcijama summary,
  odds (uključujući `flat_probabilities`), standings, stats, team stats, h2h,
  events, lineups, players, predictions i injuries. Parametar `sections` omogućava
  selektivno učitavanje blokova.
- `GET /h2h?fixture_id=` – izolovani H2H blok za dati fixture (koristi se na
  dedicated ekranu u klijentu).
- `POST /matches/{fixture_id}/ai-analysis` – gradi full kontekst i prosleđuje ga
  GPT sloju (`backend.ai_analysis.run_ai_analysis`) sa opcionim `question` promptom;
  vraća strukturisan rezime, value bet signale i snapshot izračunatih
  verovatnoća iz odds odeljka.

### Interno ponašanje

- API‑FOOTBALL helper (`backend/api_football.py`) koristi deljeni keš (Redis ili
  fakeredis u dev/test profilu) sa TTL vrednostima po endpointu, deduplikaciju
  inflight poziva i graceful fallback ako se naiđe na 429/timeout/invalid JSON.
- Sažetak meča (`backend/match_full.py`) normalizuje osnovne podatke, dok
  `normalize_odds` i `build_odds_probabilities` spremaju odds u flat formate za
  lakše poređenje na frontu i u AI sloju.
- Allow‑lista liga i filtriranje statusa (`backend/config.py`) drže feed čist od
  otkazanih ili završenih mečeva.
- CORS je zaključan na poznate domene iz `ALLOWED_ORIGINS`, a sve produktivne
  rute (billing, matches, AI) zahtevaju `X-API-Key` iz `API_AUTH_TOKENS` liste.
- Startup log i opcioni `ALERT_WEBHOOK_URL` signaliziraju dostupnost servisa;
  HTTP middleware meri latenciju i beleži statusne kodove.

### Podešavanje i pokretanje lokalno

```bash
python -m venv .venv
source .venv/bin/activate  # ili .venv\Scripts\activate na Windowsu
pip install -r requirements.txt

cp .env.example .env  # popuni obavezne ključeve
export API_FOOTBALL_KEY=your_api_key_here
export OPENAI_API_KEY=sk-...  # obavezno za AI sloj
export API_AUTH_TOKENS=dev-token  # ili CSV lista tokena
export REDIS_URL=redis://localhost:6379/0  # obavezno za stage/prod
export TIMEZONE="Europe/Belgrade"

uvicorn backend.app:app --reload --port 8000
```

Swagger UI je dostupan na `http://localhost:8000/docs`.

### Baza i migracije (Postgres)

Backend koristi SQLAlchemy + Alembic sa Postgres bazom. `DATABASE_URL` mora biti postavljen (npr. `postgresql://user:pass@host:5432/dbname`). Dev/test profil dozvoljava SQLite (`DATABASE_URL=sqlite:///./dev.db`).

Prva migracija već postoji (`alembic/versions/0001_initial.py`). Da je primeniš bez ikakvog drop/reset pristupa bazi:

```bash
export DATABASE_URL=postgresql://user:pass@host:5432/dbname
alembic upgrade head
```

Kada menjaš modele i želiš novu migraciju:

```bash
export DATABASE_URL=postgresql://user:pass@host:5432/dbname
alembic revision --autogenerate -m "describe changes"
alembic upgrade head
```

### Deploy na Render

- Web Service sa start komandom:

  ```bash
  uvicorn backend.app:app --host 0.0.0.0 --port $PORT
  ```

- Ključni env var‑ovi: `API_FOOTBALL_KEY`, `OPENAI_API_KEY`, `DATABASE_URL`,
  `API_AUTH_TOKENS` i `REDIS_URL` (obavezno za stage/prod). Pogledaj `.env.example`.

### Docker

```bash
docker build -t naksir-api .
docker run -p 8000:8000 --env-file .env naksir-api
```

### Testovi i CI

- `pytest` pokreće smoke testove (health, auth zaštita, matches) koristeći fake
  Redis i SQLite.
- GitHub Actions workflow (`.github/workflows/ci.yml`) instalira zavisnosti i
  izvršava testove na svakom push/pr zahtevu.

## Frontend (Expo / React Native)

- Lokacija: `frontend/` (Expo SDK 54, React Native 0.81).
- Osnovni flow: lista današnjih mečeva, detaljni ekran sa tabs (stats, H2H,
  standings, injuries, odds) i call-to-action za AI Match Analysis + Q&A koji
  pogađa rute `GET /matches/{id}/full` i `POST /matches/{id}/ai-analysis`.
- API klijent sada čita `EXPO_PUBLIC_API_BASE_URL` (fallback na Render domen)
  i automatski dodaje `X-API-Key` iz `EXPO_PUBLIC_API_KEY` kako bi backend
  prošao CORS/auth zaštitu. `X-Install-Id` header i dalje prati uređaj.

### Pokretanje frontend-a

```bash
cd frontend
npm install
npm run start  # ili npm run android / ios / web
```

Expo CLI otvara bundler; u simulatoru ili na fizičkom uređaju videćete drawer sa
"Today's Matches" listom, detaljnim ekranom meča i sekcijom za AI analize i Q&A.
