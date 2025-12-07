import os
from typing import Set

# Core configuration for the Naksir GO Premium backend.
# Values are pulled from environment variables so the same code
# can run locally, on Render, or in GitHub Actions without changes.
# API-Football base URL (v3)
API_FOOTBALL_BASE_URL = "https://v3.football.api-sports.io"

API_KEY: str = os.getenv("API_FOOTBALL_KEY", "")
OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")

if not API_KEY:
    raise RuntimeError("API_FOOTBALL_KEY env var is required")

# Season is configurable but defaults to 2025 as per product spec.
SEASON: int = int(os.getenv("SEASON", "2025"))

# Primary timezone for all date/time operations.
TIMEZONE: str = os.getenv("TIMEZONE", "Europe/Belgrade")

# League allow‑list. Only matches from these leagues are considered.
ALLOW_LIST: Set[int] = {
    2, 3, 913, 5, 536, 808, 960, 10, 667, 29, 30, 31, 32, 37, 33, 34,
    848, 311, 310, 342, 218, 144, 315, 71, 169, 210, 346, 233, 39, 40,
    41, 42, 703, 244, 245, 61, 62, 78, 79, 197, 271, 164, 323, 135, 136,
    389, 88, 89, 408, 103, 104, 106, 94, 283, 235, 286, 287, 322, 140,
    141, 113, 207, 208, 202, 203, 909, 268, 269, 270, 340,
}

# Fixture statuses that are considered "not available" for analysis.
SKIP_STATUS = {
    "FT", "AET", "PEN", "ABD", "AWD", "CANC", "POSTP", "PST",
    "SUSP", "INT", "WO",
}

BASE_URL = "https://v3.football.api-sports.io"
HEADERS = {"x-apisports-key": API_KEY}
