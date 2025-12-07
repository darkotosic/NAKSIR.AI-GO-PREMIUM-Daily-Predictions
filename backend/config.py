import os
from typing import Set

# API keys dolaze iz GitHub Secrets kroz env promenljive
API_KEY: str = os.getenv("API_FOOTBALL_KEY", "")
OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")

if not API_KEY:
    raise RuntimeError("API_FOOTBALL_KEY env var is required")

ALLOW_LIST: Set[int] = {
    2, 3, 913, 5, 536, 808, 960, 10, 667, 29, 30, 31, 32, 37, 33, 34,
    848, 311, 310, 342, 218, 144, 315, 71, 169, 210, 346, 233, 39, 40,
    41, 42, 703, 244, 245, 61, 62, 78, 79, 197, 271, 164, 323, 135, 136,
    389, 88, 89, 408, 103, 104, 106, 94, 283, 235, 286, 287, 322, 140,
    141, 113, 207, 208, 202, 203, 909, 268, 269, 270, 340,
}

SKIP_STATUS = {
    "FT", "AET", "PEN", "ABD", "AWD", "CANC", "POSTP", "PST",
    "SUSP", "INT", "WO", "LIVE",
}

BASE_URL = "https://v3.football.api-sports.io"

HEADERS = {"x-apisports-key": API_KEY}

# Folder gde ce se pisati JSON output za GitHub Pages
PUBLIC_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "public", "matches")
os.makedirs(PUBLIC_DIR, exist_ok=True)
