from __future__ import annotations

import os
from typing import List

# ---------------------------------------------------------------------
# ENV
# ---------------------------------------------------------------------

API_FOOTBALL_KEY = os.getenv("API_FOOTBALL_KEY", "")
TIMEZONE = os.getenv("TIMEZONE", "Europe/Belgrade")

# Glavni endpoint
API_FOOTBALL_BASE_URL = "https://v3.football.api-sports.io"

# Headers za API-Football pozive
HEADERS = {
    "x-apisports-key": API_FOOTBALL_KEY
}

# Lige koje smeju u feed
ALLOW_LIST: List[int] = [
    2, 3, 913, 5, 536, 808, 960, 10, 667, 29, 30, 31, 32, 37, 33, 34,
    848, 311, 310, 342, 218, 144, 315, 71, 169, 210, 346, 233, 39, 40,
    41, 42, 703, 244, 245, 61, 62, 78, 79, 197, 271, 164, 323, 135, 136,
    389, 88, 89, 408, 103, 104, 106, 94, 283, 235, 286, 287, 322, 140,
    141, 113, 207, 208, 202, 203, 909, 268, 269, 270, 340,
]

# Statusi koje SKLANJAM iz feeda
SKIP_STATUS = {
    "FT", "AET", "PEN", "PST", "CANC", "ABD", "WO"
}
