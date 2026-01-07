#!/usr/bin/env bash
set -euo pipefail

BASE="https://naksir-go-premium-api.onrender.com"
KEY="${X_API_KEY:?Missing X_API_KEY}"

curl -sS -H "X-API-Key: $KEY" "$BASE/health" | head
curl -sS -H "X-API-Key: $KEY" "$BASE/matches/top?cursor=0&limit=5" | head
curl -sS -H "X-API-Key: $KEY" "$BASE/ai/cached-matches" | head
