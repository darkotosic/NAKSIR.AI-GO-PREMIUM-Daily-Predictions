# AGENTS.md — NAKSIR.AI GO PREMIUM

Logički “agenti” ispod opisuju stvarne komponente u ovom repou. Svaki agent je
vezan za postojeće module (FastAPI rute, helper funkcije i frontend tokovi) koji
zajedno isporučuju dnevne feedove i AI analize.

---

## 1) API‑Football Fetcher & Cache Agent

**Gde:** `backend/api_football.py`, `backend/cache.py`

- Gradi URL‑ove, šalje HTTP pozive i koristi in‑memory keš sa TTL‑om po
  endpointu da smanji latency i broj request‑ova.
- Deduplicira paralelne pozive (`begin_inflight`/`wait_for_inflight`) i vraća
  poslednji važeći payload kad API‑FOOTBALL vrati 429 ili invalid JSON.
- Poštuje allow‑list liga i preskače završene statusne kodove iz
  `backend/config.py` pre nego što išta ode u agregatore.

---

## 2) Match Card Aggregator Agent

**Gde:** `backend/match_full.py` (`build_match_summary`), rute `GET /matches/today`
& `GET /matches/{fixture_id}`

- Normalizuje raw fixture u “card” format (liga, timovi, kickoff, status,
  skor/goal snapshot, venue, referee, oznake domaćin/gost) sa doslednim
  timezone‑om.
- U `/matches/today` dodaje lagani odds snapshot (`odds.flat`) ako je feed već u
  kešu kako bi kartice ostale brze i jeftine po API pozive.

---

## 3) Full Match Context Agent

**Gde:** `backend/match_full.py` (`build_full_match`), ruta
`GET /matches/{fixture_id}/full`

- Spaja više sekcija: summary, odds (sa `flat_probabilities`), standings,
  team/fixture stats, head‑to‑head, events, lineups, players, predictions i
  injuries.
- Parametar `sections` dozvoljava da se eksplicitno navedu samo željeni blokovi
  (korisno za UX koji učitava detalje na zahtev).
- Safe wrapper (`_safe_call`) sprečava da izostanak pojedinog helpera sruši
  čitav odgovor; nepostojeće sekcije se samo prate u logu.

---

## 4) Odds Normalizer & Probability Agent

**Gde:** `backend/odds_normalizer.py`, `backend/odds_summary.py`

- Čisti i transponuje odds feed u flat formate (`odds.flat`) i izračunate
  verovatnoće (`flat_probabilities`) koji su čitljiviji za frontend i AI sloj.
- Pakuje 1x2/DC/BTTS/goal linije u stabilan JSON bez oslanjanja na raspored
  ključeva iz API‑FOOTBALL odgovora.

---

## 5) AI Match Analyst Agent

**Gde:** `backend/ai_analysis.py`, ruta `POST /matches/{fixture_id}/ai-analysis`

- Uzima full kontekst meča i opciono korisničko pitanje, poziva GPT sloj i vraća
  strukturisan JSON (sažetak, key factors, value bet signali, rizici,
  disclaimer). Ako kontekst nedostaje, vraća fallback analizu umesto greške.
- Ekstrahuje `odds.flat_probabilities` iz full odgovora tako da klijent dobije i
  numeričke verovatnoće koje su bile input za AI.

---

## 6) Frontend Orchestrator Agent

**Gde:** `frontend/` (Expo), ulaz `App.tsx`

- Učitava `/matches/today` za početni spisak, zatim za kliknuti meč poziva
  `/matches/{id}/full` i puni tabove (stats, H2H, standings, injuries, odds).
- CTA za AI analize šalje `POST /matches/{id}/ai-analysis` i prikazuje GPT
  odgovor uz nastavak Q&A konverzacije.

---

## 7) Guardrails & Monitoring Agent

**Gde:** `backend/app.py`

- Globalni exception handler vraća čist JSON umesto HTML traceback‑a i loguje
  greške.
- `/_debug/routes` i startup log listing olakšavaju QA/monitoring na Render‑u.
- API pozivi se degradiraju graciozno: ako helperi ne postoje ili API‑FOOTBALL
  vrati prazan rezultat, vraćamo parcijalne blokove umesto 500 greške.
